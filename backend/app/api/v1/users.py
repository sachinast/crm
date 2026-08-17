import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_ip_whitelisted, require_role
from app.core.security import hash_password
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import SystemSettings, User, UserWhitelistedIP
from app.schemas.system_settings import SystemSettingsRead, SystemSettingsUpdate
from app.schemas.user import UserCreate, UserRead, UserUpdate, WhitelistedIPCreate, WhitelistedIPRead

router = APIRouter(tags=["users"])

# Provisioning/administration is Admin+ only — there is no public self-registration
# (PRD §3: "all users are provisioned manually by an Admin or Super Admin").
ADMIN_ROLES = (UserRole.super_admin, UserRole.admin)


@router.get("/users/me", response_model=UserRead)
async def read_current_user(current_user: User = Depends(require_ip_whitelisted)) -> User:
    return current_user


@router.get("/users", response_model=list[UserRead])
async def list_users(
    role: UserRole | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(*ADMIN_ROLES)),
) -> list[User]:
    stmt = select(User).order_by(User.created_at)
    if role is not None:
        stmt = stmt.where(User.role == role)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
) -> User:
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "A user with this email already exists")

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        ip_whitelist_enabled=payload.ip_whitelist_enabled,
        created_by=current_user.id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserRead)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(*ADMIN_ROLES)),
) -> User:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.post(
    "/users/{user_id}/ips",
    response_model=WhitelistedIPRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_whitelisted_ip(
    user_id: uuid.UUID,
    payload: WhitelistedIPCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(*ADMIN_ROLES)),
) -> UserWhitelistedIP:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    entry = UserWhitelistedIP(user_id=user_id, ip_address=payload.ip_address, label=payload.label)
    db.add(entry)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "This IP is already whitelisted for this user")
    await db.refresh(entry)
    return entry


@router.delete("/users/{user_id}/ips/{ip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_whitelisted_ip(
    user_id: uuid.UUID,
    ip_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(*ADMIN_ROLES)),
) -> None:
    entry = await db.get(UserWhitelistedIP, ip_id)
    if entry is None or entry.user_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Whitelisted IP not found")
    await db.delete(entry)
    await db.commit()


@router.get("/system-settings", response_model=SystemSettingsRead)
async def get_system_settings(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(*ADMIN_ROLES)),
) -> SystemSettings:
    return await db.get(SystemSettings, True)


@router.patch("/system-settings", response_model=SystemSettingsRead)
async def update_system_settings(
    payload: SystemSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    # Only Super Admin owns the registration toggle — PRD §3.
    current_user: User = Depends(require_role(UserRole.super_admin)),
) -> SystemSettings:
    settings_row = await db.get(SystemSettings, True)
    settings_row.registration_enabled = payload.registration_enabled
    settings_row.updated_by = current_user.id
    await db.commit()
    await db.refresh(settings_row)
    return settings_row
