"""Shared FastAPI dependencies — auth, RBAC, IP whitelisting. TECHNICAL_SPEC.md §4.2."""
import ipaddress
import uuid
from collections.abc import Callable, Coroutine
from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import Select, false, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import decode_token
from app.db.session import get_db
from app.domain.api_keys import hash_api_key
from app.domain.status_permissions import get_relevant_statuses
from app.models.integration import ApiKey
from app.models.lead import Lead
from app.models.rbac import Role
from app.models.settings import AppSetting
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

    result = await db.execute(
        select(User)
        .options(selectinload(User.role).selectinload(Role.permissions))
        .where(User.id == uuid.UUID(user_id))
    )
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise CREDENTIALS_EXCEPTION
    return user


def require_permission(*required_perms: str) -> Callable[[User], Coroutine[Any, Any, User]]:
    """Enforces fine-grained permissions per TECHNICAL_SPEC.md §4.2."""

    async def _dependency(user: User = Depends(get_current_user)) -> User:
        missing = [p for p in required_perms if not user.role.has_permission(p)]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission(s): {', '.join(missing)}",
            )
        return user

    return _dependency


def require_role(*role_names: str) -> Callable[[User], Coroutine[Any, Any, User]]:
    """Enforces specific role membership. `require_permission` should be preferred
    for almost everything per TECHNICAL_SPEC.md §4.2.
    """

    async def _dependency(user: User = Depends(get_current_user)) -> User:
        if user.role.name not in role_names:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role.name}' is not authorized for this operation",
            )
        return user

    return _dependency


def get_client_ip(request: Request) -> str:
    """Best-effort client IP."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "0.0.0.0"


def is_ip_in_whitelist(client_ip_str: str, allowed_ips: list[str]) -> bool:
    if not allowed_ips:
        return False
    try:
        client_ip = ipaddress.ip_address(client_ip_str)
    except ValueError:
        return client_ip_str in allowed_ips

    for item in allowed_ips:
        item = str(item).strip()
        if not item:
            continue
        try:
            if "/" in item:
                network = ipaddress.ip_network(item, strict=False)
                if client_ip in network:
                    return True
            else:
                if client_ip == ipaddress.ip_address(item):
                    return True
        except ValueError:
            if client_ip_str == item:
                return True
    return False


async def require_ip_whitelisted(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """IP whitelist enforcement — TECHNICAL_SPEC.md §8 & System Security Policy.
    Superadmin accounts always bypass IP restrictions to prevent lockout.
    """
    # 1. Superadmin bypass
    role_name = (user.role.name if user.role else "").lower()
    if role_name in ("super_admin", "superadmin", "super admin"):
        return user

    # 2. Check global system setting
    global_setting_res = await db.execute(
        select(AppSetting).where(AppSetting.key == "security.ip_whitelist_enabled")
    )
    global_setting = global_setting_res.scalar_one_or_none()
    global_enabled = bool(global_setting.value) if global_setting else False

    # 3. Check if enforcement applies to this user
    if not global_enabled and not user.ip_whitelist_enabled:
        return user

    client_ip_str = get_client_ip(request)
    allowed_ips: list[str] = []

    # Fetch global allowed IPs
    if global_enabled:
        ips_setting_res = await db.execute(
            select(AppSetting).where(AppSetting.key == "security.allowed_ips")
        )
        ips_setting = ips_setting_res.scalar_one_or_none()
        if ips_setting:
            if isinstance(ips_setting.value, list):
                allowed_ips.extend([str(ip).strip() for ip in ips_setting.value if ip])
            elif isinstance(ips_setting.value, str):
                allowed_ips.extend([ip.strip() for ip in ips_setting.value.split(",") if ip.strip()])

    # Fetch per-user allowed IPs
    user_ips_res = await db.execute(
        select(UserWhitelistedIP).where(UserWhitelistedIP.user_id == user.id)
    )
    allowed_ips.extend([str(row.ip_address).split("/")[0] for row in user_ips_res.scalars().all()])

    # Verify authorization
    if not is_ip_in_whitelist(client_ip_str, allowed_ips):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Request IP is not whitelisted for this account",
        )

    return user


async def apply_lead_visibility(db: AsyncSession, stmt: Select, user: User) -> Select:
    """Row-level visibility filter — TECHNICAL_SPEC.md §4.1 layer 2."""
    if user.role.has_permission("leads.view_all"):
        return stmt
    if user.role.has_permission("leads.view_own"):
        return stmt.where(Lead.agent_id == user.id)

    relevant_statuses = await get_relevant_statuses(db, user.role_id)
    if relevant_statuses:
        return stmt.where(Lead.status.in_(relevant_statuses))
    return stmt.where(false())


async def require_api_key(
    db: AsyncSession = Depends(get_db),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> ApiKey:
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
    stmt = await apply_lead_visibility(db, select(Lead).where(Lead.id == lead_id), user)
    result = await db.execute(stmt)
    lead = result.scalar_one_or_none()
    if lead is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")
    return lead
