"""DB-backed role-gating for the status state machine — the replacement for
status_machine.py's old TRANSITIONS role-gating (set_by/notifies) and the
separate ROLE_RELEVANT_STATUSES dict, all now rows in status_role_permissions
(migration 0007). status_machine.py itself keeps the transition *graph*
(which status can move to which) — only "who can act on it" moved here.
"""
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import BookingStatus
from app.models.status import StatusRolePermission


async def get_settable_statuses(db: AsyncSession, role_id: uuid.UUID) -> set[BookingStatus]:
    """Every status this role is currently allowed to transition a lead TO.
    Fetched as one set rather than a per-status can_set() query, since the
    one caller that iterates all BookingStatus values (leads.py's
    available-transitions endpoint) would otherwise issue one query per
    status.
    """
    rows = await db.execute(
        select(StatusRolePermission.status).where(
            StatusRolePermission.role_id == role_id, StatusRolePermission.kind == "set_by"
        )
    )
    return set(rows.scalars().all())


async def can_set(db: AsyncSession, target: BookingStatus, role_id: uuid.UUID) -> bool:
    settable = await get_settable_statuses(db, role_id)
    return target in settable


async def roles_to_notify(db: AsyncSession, target: BookingStatus) -> list[uuid.UUID]:
    """Role IDs to notify on transition into `target` — returned as role_ids
    directly (Notification/WebSocket role-broadcast key on roles.id, not
    role names), so callers no longer need a separate name -> id lookup."""
    rows = await db.execute(
        select(StatusRolePermission.role_id).where(
            StatusRolePermission.status == target, StatusRolePermission.kind == "notifies"
        )
    )
    return list(rows.scalars().all())


async def get_relevant_statuses(db: AsyncSession, role_id: uuid.UUID) -> set[BookingStatus]:
    """Statuses that keep a lead visible to this role for as long as it sits
    there (PRD §3.2 "Status-Based Sharing") — used by
    app/api/deps.py:apply_lead_visibility. A role with nothing granted here
    legitimately sees nothing beyond leads.view_all/leads.view_own.
    """
    rows = await db.execute(
        select(StatusRolePermission.status).where(
            StatusRolePermission.role_id == role_id, StatusRolePermission.kind == "relevant"
        )
    )
    return set(rows.scalars().all())


async def get_full_matrix(db: AsyncSession) -> dict[BookingStatus, dict[str, list[uuid.UUID]]]:
    """Every (status, kind) -> [role_id, ...] row, for the admin matrix UI
    (GET /admin/status-permissions) in one query rather than 12*3."""
    rows = await db.execute(select(StatusRolePermission))
    matrix: dict[BookingStatus, dict[str, list[uuid.UUID]]] = {
        s: {"set_by": [], "notifies": [], "relevant": []} for s in BookingStatus
    }
    for row in rows.scalars().all():
        matrix[row.status][row.kind].append(row.role_id)
    return matrix
