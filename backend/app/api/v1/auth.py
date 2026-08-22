import ipaddress
from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import create_access_token, create_refresh_token, decode_token, verify_password
from app.db.session import get_db
from app.domain.activity_log import log_activity
from app.models.settings import AppSetting
from app.models.user import User, UserWhitelistedIP
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
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "0.0.0.0"


def _is_ip_in_whitelist(client_ip_str: str, allowed_ips: list[str]) -> bool:
    if not allowed_ips:
        return False
    try:
        client_ip = ipaddress.ip_address(client_ip_str)
    except ValueError:
        return False

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


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    result = await db.execute(
        select(User).options(selectinload(User.role)).where(User.email == payload.email)
    )
    user = result.scalar_one_or_none()
    ip_address = _client_ip(request)
    user_agent = request.headers.get("user-agent", "unknown")

    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
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

    # Superadmin accounts always bypass IP restrictions to prevent lockout
    role_name = (user.role.name if user.role else "").lower()
    is_superadmin = role_name in ("super_admin", "superadmin", "super admin")

    # IP Whitelist Enforcement check at login
    global_setting_res = await db.execute(
        select(AppSetting).where(AppSetting.key == "security.ip_whitelist_enabled")
    )
    global_setting = global_setting_res.scalar_one_or_none()
    global_enabled = bool(global_setting.value) if global_setting else False

    if not is_superadmin and (global_enabled or user.ip_whitelist_enabled):
        allowed_ips: list[str] = []
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

        user_ips_res = await db.execute(
            select(UserWhitelistedIP).where(UserWhitelistedIP.user_id == user.id)
        )
        allowed_ips.extend([str(row.ip_address).split("/")[0] for row in user_ips_res.scalars().all()])

        if not _is_ip_in_whitelist(ip_address, allowed_ips):
            log_activity(
                db,
                actor_id=user.id,
                action="login_blocked_ip",
                category="auth",
                metadata={"email": payload.email, "ip": ip_address, "reason": "ip_not_whitelisted"},
                ip_address=ip_address,
                user_agent=user_agent,
            )
            await db.commit()
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Access Denied: Your IP address ({ip_address}) is not authorized by the security policy. Please contact your system administrator.",
            )

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
    return None
