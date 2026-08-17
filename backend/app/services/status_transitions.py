"""Shared status-transition logic — TECHNICAL_SPEC.md §3.2.

Used by every STAFF-authenticated caller that moves a lead's status:
PATCH /leads/{id}/status (any valid transition an authenticated role can make)
and POST /payments (Billing charging/declining a card is, underneath, just
another transition — card_charged/card_declined). Centralizing this means the
row-lock, transition/role validation, status_history write, notification
fan-out, and WebSocket push only exist in one tested place.

The customer-facing "I Authorize" flow (app/api/v1/authorization.py) does NOT
go through here — there's no authenticated staff User behind it, so it can't
be visibility-filtered the same way, and it writes its own (simpler) inline
transition for the one edge it ever fires (authorization_pending -> client_approved).
"""
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import apply_lead_visibility
from app.api.v1.websocket import connection_manager
from app.domain.process_log import log_process_event
from app.domain.status_machine import can_set, can_transition, roles_to_notify
from app.models.audit import Notification, StatusHistory
from app.models.enums import BookingStatus, UserRole
from app.models.lead import Lead
from app.models.user import User


async def apply_status_transition(
    db: AsyncSession,
    *,
    lead_id: uuid.UUID,
    target: BookingStatus,
    actor: User,
) -> Lead:
    """Row-locks the lead, validates the transition + the actor's role, and
    writes status_history/notifications in the caller's transaction (flush,
    not commit — the caller decides when to commit). Pushes to WebSocket
    listeners itself, after flush, since that's fire-and-forget either way.
    """
    stmt = apply_lead_visibility(select(Lead).where(Lead.id == lead_id), actor).with_for_update()
    lead = (await db.execute(stmt)).scalar_one_or_none()
    if lead is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")

    if not can_transition(lead.status, target):
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Cannot move from '{lead.status.value}' to '{target.value}'"
        )
    if not can_set(target, actor.role):
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"Your role cannot set status to '{target.value}'")

    previous_status = lead.status
    lead.status = target
    db.add(StatusHistory(lead_id=lead.id, from_status=previous_status, to_status=target, changed_by=actor.id))
    log_process_event(
        db,
        lead_id=lead.id,
        actor_id=actor.id,
        action="status_change",
        field_changed="status",
        old_value=previous_status.value,
        new_value=target.value,
    )

    notify_roles = roles_to_notify(target)
    message = f"Lead {lead.id} moved from {previous_status.value} to {target.value}"
    for role in notify_roles:
        db.add(Notification(lead_id=lead.id, recipient_role=role, type="status_change", message=message))

    await db.flush()

    await _push_notifications(lead.id, target, notify_roles, message)
    return lead


async def _push_notifications(
    lead_id: uuid.UUID, target: BookingStatus, notify_roles: frozenset[UserRole], message: str
) -> None:
    payload = {"type": "status_change", "lead_id": str(lead_id), "status": target.value, "message": message}
    for role in notify_roles:
        await connection_manager.send_to_role(role, payload)
