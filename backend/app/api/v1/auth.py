from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import create_access_token, create_refresh_token, decode_token, verify_password
from app.db.session import get_db
from app.domain.activity_log import log_activity
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])

INVALID_CREDENTIALS = HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
INVALID_REFRESH = HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token")


def _issue_tokens(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(str(user.id), {"role": user.role.name}),
        refresh_token=create_refresh_token(str(user.id)),
    )


def _client_ip(request: Request) -> str:
    return request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (
        request.client.host if request.client else "0.0.0.0"
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    result = await db.execute(
        select(User).options(selectinload(User.role)).where(User.email == payload.email)
    )
    user = result.scalar_one_or_none()
    ip_address = _client_ip(request)
    user_agent = request.headers.get("user-agent", "unknown")

    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        # No actor_id — either the email doesn't exist or the password was
        # wrong, and (same "don't leak which" posture as get_visible_lead_or_404)
        # this log entry doesn't distinguish the two either. The email itself
        # is still worth capturing in metadata: a string of failed logins
        # against one address is the signal an admin would want to see.
        log_activity(
            db,
            actor_id=None,
            action="login_failed",
            category="auth",
            metadata={"email": payload.email},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await db.commit()
        raise INVALID_CREDENTIALS

    log_activity(
        db, actor_id=user.id, action="login_success", category="auth", ip_address=ip_address, user_agent=user_agent
    )
    await db.commit()
    return _issue_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    try:
        data = decode_token(payload.refresh_token)
    except JWTError:
        raise INVALID_REFRESH
    if data.get("type") != "refresh" or not data.get("sub"):
        raise INVALID_REFRESH

    result = await db.execute(select(User).options(selectinload(User.role)).where(User.id == data["sub"]))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise INVALID_REFRESH
    return _issue_tokens(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout() -> None:
    # Stateless JWT for now — the client just discards both tokens, and this
    # endpoint takes no Bearer token, so there's no authenticated actor to
    # attribute a log entry to. Server-side revocation (refresh-token
    # rotation + reuse detection) is a Phase 9 item; see TECHNICAL_SPEC.md §10
    # — logout activity-logging becomes meaningful once that lands.
    return None
