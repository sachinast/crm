"""Master Admin — Status Workflow Permissions. Lets an admin wire any role
(including a brand-new custom one) into the booking status machine at
runtime: which roles may set a status, get notified on it, or keep seeing a
lead parked there — see app/domain/status_permissions.py and migration 0007
for the status_role_permissions table this reads/writes. The transition
*graph* itself (which status can follow which) stays a code-level concern
(app/domain/status_machine.py) — explicitly out of scope for this feature.

Same privilege-escalation posture as admin_roles.py: gated on
admin.manage_roles, which only super_admin holds by default.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_permission
from app.db.session import get_db
from app.domain.status_permissions import get_full_matrix
from app.models.enums import BookingStatus
from app.models.rbac import Role
from app.models.status import StatusLookup, StatusRolePermission
from app.models.user import User
from app.schemas.status_permissions import StatusPermissionRead, StatusPermissionUpdate

router = APIRouter(prefix="/admin", tags=["admin-status-permissions"])

MANAGE_PERMISSIONS = ("admin.manage_roles",)


async def _validate_role_ids(db: AsyncSession, role_ids: list[uuid.UUID]) -> None:
    if not role_ids:
        return
    found = await db.execute(select(Role.id).where(Role.id.in_(role_ids)))
    unknown = set(role_ids) - set(found.scalars().all())
    if unknown:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Unknown role id(s): {', '.join(str(r) for r in unknown)}")


@router.get("/status-permissions", response_model=list[StatusPermissionRead])
async def list_status_permissions(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(*MANAGE_PERMISSIONS)),
) -> list[StatusPermissionRead]:
    labels = {row.status: row.label for row in (await db.execute(select(StatusLookup))).scalars().all()}
    matrix = await get_full_matrix(db)
    return [
        StatusPermissionRead(
            status=s,
            label=labels.get(s, s.value),
            set_by=matrix[s]["set_by"],
            notifies=matrix[s]["notifies"],
            relevant=matrix[s]["relevant"],
        )
        for s in BookingStatus
    ]


@router.patch("/status-permissions/{status_value}", response_model=StatusPermissionRead)
async def update_status_permissions(
    status_value: BookingStatus,
    payload: StatusPermissionUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(*MANAGE_PERMISSIONS)),
) -> StatusPermissionRead:
    await _validate_role_ids(db, payload.set_by)
    await _validate_role_ids(db, payload.notifies)
    await _validate_role_ids(db, payload.relevant)

    await db.execute(
        StatusRolePermission.__table__.delete().where(StatusRolePermission.status == status_value)
    )
    for kind, role_ids in (("set_by", payload.set_by), ("notifies", payload.notifies), ("relevant", payload.relevant)):
        for role_id in role_ids:
            db.add(StatusRolePermission(status=status_value, role_id=role_id, kind=kind))
    await db.commit()

    label = await db.scalar(select(StatusLookup.label).where(StatusLookup.status == status_value))
    matrix = await get_full_matrix(db)
    return StatusPermissionRead(
        status=status_value,
        label=label or status_value.value,
        set_by=matrix[status_value]["set_by"],
        notifies=matrix[status_value]["notifies"],
        relevant=matrix[status_value]["relevant"],
    )
