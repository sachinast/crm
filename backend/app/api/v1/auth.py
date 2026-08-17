from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, create_refresh_token, decode_token, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])

INVALID_CREDENTIALS = HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
INVALID_REFRESH = HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token")


def _issue_tokens(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(str(user.id), {"role": user.role.value}),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise INVALID_CREDENTIALS
    return _issue_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    try:
        data = decode_token(payload.refresh_token)
    except JWTError:
        raise INVALID_REFRESH
    if data.get("type") != "refresh" or not data.get("sub"):
        raise INVALID_REFRESH

    user = await db.get(User, data["sub"])
    if user is None or not user.is_active:
        raise INVALID_REFRESH
    return _issue_tokens(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout() -> None:
    # Stateless JWT for now — the client just discards both tokens. Server-side
    # revocation (refresh-token rotation + reuse detection) is a Phase 9 item;
    # see TECHNICAL_SPEC.md §10.
    return None
