import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_ip_whitelisted, require_permission, require_role
from app.core.security import hash_password
from app.db.session import get_db
from app.domain.activity_log import log_activity
from app.models.audit import Notification
from app.models.lead import Lead
from app.models.rbac import Role
from app.models.user import User, UserWhitelistedIP
from app.schemas.user import MeRead, UserCreate, UserRead, UserUpdate, WhitelistedIPCreate, WhitelistedIPRead

router = APIRouter(tags=["users"])

# Provisioning/administration — PRD §3: "all users are provisioned manually
# by an Admin or Super Admin". Data-driven now (app/models/rbac.py) instead
# of a hardcoded role tuple: whichever roles hold admin.manage_users.
MANAGE_USERS_PERMISSIONS = ("admin.manage_users",)


async def _resolve_role(db: AsyncSession, role_name: str) -> Role:
    role = await db.scalar(select(Role).where(Role.name == role_name))
    if role is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Unknown role: {role_name}")
    return role


@router.get("/users/me", response_model=MeRead)
async def read_current_user(current_user: User = Depends(require_ip_whitelisted)) -> dict:
    # role.permissions is already eager-loaded by get_current_user — flatten
    # to codes here rather than serializing the full Permission objects.
    return {
        **UserRead.model_validate(current_user).model_dump(),
        "permissions": sorted(p.code for p in current_user.role.permissions),
    }


@router.get("/users", response_model=list[UserRead])
async def list_users(
    role_name: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(*MANAGE_USERS_PERMISSIONS)),
) -> list[User]:
    stmt = select(User).options(selectinload(User.role)).order_by(User.created_at)
    if role_name is not None:
        stmt = stmt.join(Role, User.role_id == Role.id).where(Role.name == role_name)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(*MANAGE_USERS_PERMISSIONS)),
) -> User:
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "A user with this email already exists")

    role = await _resolve_role(db, payload.role_name)

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role_id=role.id,
        ip_whitelist_enabled=payload.ip_whitelist_enabled,
        created_by=current_user.id,
    )
    db.add(user)
    await db.flush()
    log_activity(
        db,
        actor_id=current_user.id,
        action="user_created",
        category="admin",
        target_type="user",
        target_id=user.id,
        metadata={"email": user.email, "role_name": role.name},
    )
    await db.commit()
    await db.refresh(user, attribute_names=["role"])
    return user


@router.patch("/users/{user_id}", response_model=UserRead)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(*MANAGE_USERS_PERMISSIONS)),
) -> User:
    # Explicit select, not db.get() — this request may later touch user.role
    # (the role-change branch below, or the response's eager-loaded role),
    # and db.get() silently skips loader options whenever the row is already
    # in the session's identity map (same pitfall documented in deps.py).
    result = await db.execute(select(User).options(selectinload(User.role)).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    updates = payload.model_dump(exclude_unset=True)
    role_name = updates.pop("role_name", None)
    if role_name is not None and role_name != user.role.name:
        old_role_name = user.role.name
        role = await _resolve_role(db, role_name)
        user.role_id = role.id
        log_activity(
            db,
            actor_id=current_user.id,
            action="user_role_changed",
            category="admin",
            target_type="user",
            target_id=user.id,
            metadata={"email": user.email, "old_role": old_role_name, "new_role": role.name},
        )
    for field, value in updates.items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user, attribute_names=["role"])
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
    _: User = Depends(require_permission(*MANAGE_USERS_PERMISSIONS)),
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
    _: User = Depends(require_permission(*MANAGE_USERS_PERMISSIONS)),
) -> None:
    entry = await db.get(UserWhitelistedIP, ip_id)
    if entry is None or entry.user_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Whitelisted IP not found")
    await db.delete(entry)
    await db.commit()


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: uuid.UUID,
    reassign_leads_to: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "superadmin", "Super Admin")),
) -> dict:
    """Removes a user account. Exclusively available to Super Admin.

    - Protects against self-deletion.
    - Prevents removing the last active Super Admin account.
    - Optionally reassigns leads if `reassign_leads_to` is provided.
    - Attempts permanent hard deletion.
    - If the user has immutable audit/compliance records (leads, bookings, audit logs),
      gracefully falls back to deactivating the account (`is_active = False`) to preserve
      regulatory audit trails.
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account.",
        )

    stmt = select(User).options(selectinload(User.role)).where(User.id == user_id)
    target_user = (await db.execute(stmt)).scalar_one_or_none()
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    target_role_name = (target_user.role.name if target_user.role else "").lower().replace(" ", "_")
    if target_role_name in ("super_admin", "superadmin"):
        superadmin_count = await db.scalar(
            select(func.count(User.id))
            .join(Role, User.role_id == Role.id)
            .where(
                func.lower(Role.name).in_(["super_admin", "superadmin"]),
                User.is_active.is_(True),
            )
        )
        if (superadmin_count or 0) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last active Super Admin account.",
            )

    if reassign_leads_to is not None:
        reassign_target = await db.get(User, reassign_leads_to)
        if reassign_target is None or not reassign_target.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reassignment target user not found or is inactive.",
            )
        await db.execute(
            update(Lead).where(Lead.agent_id == user_id).values(agent_id=reassign_leads_to)
        )

    target_user_email = target_user.email
    target_user_name = target_user.name
    target_role = target_user.role.name if target_user.role else "unknown"

    # Safely nullify users.created_by references pointing to this user
    await db.execute(update(User).where(User.created_by == user_id).values(created_by=None))

    # Clean up notifications recipient references
    await db.execute(delete(Notification).where(Notification.recipient_user_id == user_id))

    # Clean up whitelisted IPs
    await db.execute(delete(UserWhitelistedIP).where(UserWhitelistedIP.user_id == user_id))

    deleted_permanently = False
    try:
        async with db.begin_nested():
            await db.delete(target_user)
            await db.flush()
        deleted_permanently = True
    except IntegrityError:
        # User is referenced in immutable audit or booking tables (e.g., booking_process_log, status_history, leads)
        target_user.is_active = False

    if deleted_permanently:
        log_activity(
            db,
            actor_id=current_user.id,
            action="user_deleted",
            category="admin",
            target_type="user",
            target_id=user_id,
            metadata={
                "email": target_user_email,
                "name": target_user_name,
                "role": target_role,
                "deletion_type": "permanent",
            },
        )
        await db.commit()
        return {
            "message": f"User '{target_user_name}' ({target_user_email}) was permanently removed.",
            "deleted": True,
            "user_id": str(user_id),
        }
    else:
        log_activity(
            db,
            actor_id=current_user.id,
            action="user_deactivated",
            category="admin",
            target_type="user",
            target_id=user_id,
            metadata={
                "email": target_user_email,
                "name": target_user_name,
                "role": target_role,
                "deletion_type": "deactivated_for_compliance",
            },
        )
        await db.commit()
        return {
            "message": f"User '{target_user_name}' ({target_user_email}) has historical records and was deactivated to preserve compliance records.",
            "deleted": False,
            "deactivated": True,
            "user_id": str(user_id),
        }


# GET/PATCH /system-settings (the old single-boolean registration_enabled
# toggle) removed in migration 0009 — replaced by the generic app_settings
# store: GET/POST/PATCH/DELETE /admin/settings (app/api/v1/admin_settings.py),
# still gated on the same admin.view_settings/admin.manage_settings codes.

