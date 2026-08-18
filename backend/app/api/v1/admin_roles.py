"""Master Admin — Roles & Permissions. Lets an admin create new roles and
grant them any combination of the fixed permission catalog
(app/domain/permissions.py) at runtime, no deploy required. The 10 original
roles (is_system_role=True) can't be renamed or deleted, only have their
permissions edited — same "don't let the bootstrap accounts vanish" posture
as everything else security-sensitive in this app.

Creating/editing roles is itself a privilege-escalation-sensitive action —
gated on admin.manage_roles, which only super_admin holds by default (same
posture the old code had for PATCH /system-settings, one of the few other
super_admin-only actions). Reading the role list is gated more loosely
(admin.manage_users OR admin.manage_roles) since the user-creation form needs
it to populate a role dropdown, and creating a user is a plain-admin action.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_permission
from app.db.session import get_db
from app.domain.activity_log import log_activity
from app.domain.permissions import PERMISSION_CODES
from app.models.rbac import Permission, Role
from app.models.user import User
from app.schemas.rbac import PermissionRead, RoleCreate, RolePermissionsUpdate, RoleRead

router = APIRouter(prefix="/admin", tags=["admin-roles"])

READ_PERMISSIONS = ("admin.manage_users", "admin.manage_roles")
MANAGE_PERMISSIONS = ("admin.manage_roles",)


async def _get_role_or_404(db: AsyncSession, role_id: uuid.UUID) -> Role:
    # A plain db.get() silently skips loader options whenever the row is
    # already in the session's identity map (e.g. right after this same
    # request's own db.add/commit above) and just returns the cached
    # instance — which then trips a sync lazy-load on .permissions during
    # response serialization. An explicit select() always re-applies them.
    result = await db.execute(select(Role).options(selectinload(Role.permissions)).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if role is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Role not found")
    return role


def _validate_codes(codes: list[str]) -> None:
    unknown = set(codes) - PERMISSION_CODES
    if unknown:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Unknown permission code(s): {', '.join(sorted(unknown))}")


@router.get("/permissions", response_model=list[PermissionRead])
async def list_permissions(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(*READ_PERMISSIONS)),
) -> list[Permission]:
    result = await db.execute(select(Permission).order_by(Permission.category, Permission.code))
    return list(result.scalars().all())


@router.get("/roles", response_model=list[RoleRead])
async def list_roles(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(*READ_PERMISSIONS)),
) -> list[Role]:
    result = await db.execute(
        select(Role).options(selectinload(Role.permissions)).order_by(Role.is_system_role.desc(), Role.name)
    )
    return list(result.scalars().all())


@router.post("/roles", response_model=RoleRead, status_code=status.HTTP_201_CREATED)
async def create_role(
    payload: RoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(*MANAGE_PERMISSIONS)),
) -> Role:
    existing = await db.scalar(select(Role).where(Role.name == payload.name))
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "A role with this name already exists")

    _validate_codes(payload.permission_codes)

    role = Role(name=payload.name, is_system_role=False, created_by=current_user.id)
    if payload.permission_codes:
        perms = await db.execute(select(Permission).where(Permission.code.in_(payload.permission_codes)))
        role.permissions = list(perms.scalars().all())
    db.add(role)
    await db.flush()
    log_activity(
        db,
        actor_id=current_user.id,
        action="role_created",
        category="admin",
        target_type="role",
        target_id=role.id,
        metadata={"name": role.name, "permission_codes": sorted(payload.permission_codes)},
    )
    await db.commit()
    return await _get_role_or_404(db, role.id)


@router.patch("/roles/{role_id}/permissions", response_model=RoleRead)
async def update_role_permissions(
    role_id: uuid.UUID,
    payload: RolePermissionsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(*MANAGE_PERMISSIONS)),
) -> Role:
    """Full replace, not a diff — the admin UI sends the complete desired
    permission set for this role each time (a checkbox grid), same shape as
    every other *Update schema in this API."""
    role = await _get_role_or_404(db, role_id)
    _validate_codes(payload.permission_codes)

    if payload.permission_codes:
        perms = await db.execute(select(Permission).where(Permission.code.in_(payload.permission_codes)))
        role.permissions = list(perms.scalars().all())
    else:
        role.permissions = []
    log_activity(
        db,
        actor_id=current_user.id,
        action="role_permissions_changed",
        category="admin",
        target_type="role",
        target_id=role.id,
        metadata={"name": role.name, "permission_codes": sorted(payload.permission_codes)},
    )
    await db.commit()
    return await _get_role_or_404(db, role_id)


@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(*MANAGE_PERMISSIONS)),
) -> None:
    role = await _get_role_or_404(db, role_id)
    if role.is_system_role:
        raise HTTPException(status.HTTP_409_CONFLICT, "System roles can't be deleted")

    in_use = await db.scalar(select(User.id).where(User.role_id == role_id).limit(1))
    if in_use is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Reassign every user off this role before deleting it")

    log_activity(
        db,
        actor_id=current_user.id,
        action="role_deleted",
        category="admin",
        target_type="role",
        target_id=role.id,
        metadata={"name": role.name},
    )
    await db.delete(role)
    await db.commit()
