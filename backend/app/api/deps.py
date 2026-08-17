"""Shared FastAPI dependencies — auth, RBAC, IP whitelisting. TECHNICAL_SPEC.md §4.2."""
import uuid
from collections.abc import Callable, Coroutine
from datetime import datetime, timezone
from typing import Any

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import Select, false, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.session import get_db
from app.domain.api_keys import hash_api_key
from app.domain.status_machine import ROLE_RELEVANT_STATUSES
from app.models.enums import UserRole
from app.models.integration import ApiKey
from app.models.lead import Lead
from app.models.user import User, UserWhitelistedIP

# tokenUrl is documentation-only here (used for the OpenAPI "Authorize" button) —
# the actual login endpoint takes a JSON body, not form-encoded credentials.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not token:
        raise CREDENTIALS_EXCEPTION
    try:
        payload = decode_token(token)
    except JWTError:
        raise CREDENTIALS_EXCEPTION
    if payload.get("type") != "access":
        raise CREDENTIALS_EXCEPTION
    user_id = payload.get("sub")
    if not user_id:
        raise CREDENTIALS_EXCEPTION

    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise CREDENTIALS_EXCEPTION
    return user


def require_role(
    *roles: UserRole,
) -> Callable[[User], Coroutine[Any, Any, User]]:
    """Coarse role check — TECHNICAL_SPEC.md §4.1 layer 1 (role -> action)."""

    async def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient role for this action")
        return user

    return dependency


def get_client_ip(request: Request) -> str:
    """Best-effort client IP. Only trust X-Forwarded-For once this sits behind a
    known reverse proxy that sets it — until then it's spoofable and should stay
    unused in production. Swap this for the proxy-verified header at deploy time.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "0.0.0.0"


async def require_ip_whitelisted(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """IP whitelist enforcement — TECHNICAL_SPEC.md §8. No-op for users who don't
    have ip_whitelist_enabled set; otherwise the request's client IP must match
    one of that user's user_whitelisted_ips rows.
    """
    if not user.ip_whitelist_enabled:
        return user

    client_ip = get_client_ip(request)
    result = await db.execute(select(UserWhitelistedIP).where(UserWhitelistedIP.user_id == user.id))
    allowed_ips = {str(row.ip_address).split("/")[0] for row in result.scalars().all()}
    if client_ip not in allowed_ips:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Request IP is not whitelisted for this account")
    return user


# Roles with unrestricted lead visibility — TECHNICAL_SPEC.md §4.1 "Global View" /
# "TL (Team Lead) | Full departmental oversight".
FULL_LEAD_VISIBILITY_ROLES = (UserRole.super_admin, UserRole.admin, UserRole.tl)


def apply_lead_visibility(stmt: Select, user: User) -> Select:
    """Row-level visibility filter — TECHNICAL_SPEC.md §4.1 layer 2. Applied to
    every leads query so "can't see" and "can't act on" collapse to the same
    filtered query, rather than a separate check that's easy to forget on one
    endpoint.
    """
    if user.role in FULL_LEAD_VISIBILITY_ROLES:
        return stmt
    if user.role == UserRole.agent:
        return stmt.where(Lead.agent_id == user.id)
    # Billing/Auditor/CS/Change Dep/Chargeback Dep/CR Booking: visibility expands
    # to whatever statuses are currently relevant to that department (PRD §3.2
    # "Status-Based Sharing" — ROLE_RELEVANT_STATUSES in status_machine.py).
    # A role with nothing mapped yet (CS, pre-Phase 6) legitimately sees nothing.
    relevant_statuses = ROLE_RELEVANT_STATUSES.get(user.role)
    if relevant_statuses:
        return stmt.where(Lead.status.in_(relevant_statuses))
    return stmt.where(false())


async def require_api_key(
    db: AsyncSession = Depends(get_db),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> ApiKey:
    """Auth for external integrations (Zapier/Make/any external form or API)
    — TECHNICAL_SPEC.md §10.3. A completely separate credential space from
    staff JWTs: a header, not a Bearer token, and it authenticates an
    integration, not a person. Rate limiting this endpoint is a Phase 9
    hardening item (TECHNICAL_SPEC.md §10), same as /auth/login.
    """
    if not x_api_key:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing X-API-Key header")

    result = await db.execute(select(ApiKey).where(ApiKey.key_hash == hash_api_key(x_api_key)))
    api_key = result.scalar_one_or_none()
    if api_key is None or not api_key.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or revoked API key")

    api_key.last_used_at = datetime.now(timezone.utc)
    await db.commit()
    return api_key


async def get_visible_lead_or_404(db: AsyncSession, user: User, lead_id: uuid.UUID) -> Lead:
    stmt = apply_lead_visibility(select(Lead).where(Lead.id == lead_id), user)
    result = await db.execute(stmt)
    lead = result.scalar_one_or_none()
    if lead is None:
        # 404, not 403, whether the lead doesn't exist or just isn't visible to
        # this user — avoids leaking record existence across the RBAC boundary.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")
    return lead
