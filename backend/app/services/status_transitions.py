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
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import apply_lead_visibility
from app.api.v1.websocket import connection_manager
from app.domain.process_log import log_process_event
from app.domain.status_machine import can_transition
from app.domain.status_permissions import can_set, roles_to_notify
from app.models.audit import Notification, StatusHistory
from app.models.enums import BookingStatus
from app.models.lead import Lead
from app.models.payment import PaymentTransaction
from app.models.rbac import Role
from app.models.user import User


async def apply_status_transition(
    db: AsyncSession,
    *,
    lead_id: uuid.UUID,
    target: BookingStatus,
    actor: User,
    refunded_amount: float | None = None,
) -> Lead:
    """Row-locks the lead, validates the transition + the actor's role, and
    writes status_history/notifications in the caller's transaction (flush,
    not commit — the caller decides when to commit). Pushes to WebSocket
    listeners itself, after flush, since that's fire-and-forget either way.
    """
    stmt = (await apply_lead_visibility(db, select(Lead).where(Lead.id == lead_id), actor)).with_for_update()
    lead = (await db.execute(stmt)).scalar_one_or_none()
    if lead is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")

    if not can_transition(lead.status, target):
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Cannot move from '{lead.status.value}' to '{target.value}'"
        )
    if not await can_set(db, target, actor.role_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"Your role cannot set status to '{target.value}'")

    if target == BookingStatus.tag_partial_refund:
        if refunded_amount is None or refunded_amount <= 0:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Refunded amount is required and must be greater than 0 for a partial refund",
            )
        db.add(
            PaymentTransaction(
                lead_id=lead.id,
                prepaid_amount=-abs(refunded_amount),
                pay_at_counter_amount=0,
                outcome="refunded",
                processed_by=actor.id,
                processed_at=datetime.now(timezone.utc),
            )
        )

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

    actor_name = actor.name or actor.email
    if target == BookingStatus.tag_partial_refund and refunded_amount:
        message = f"{actor_name} updated lead #{lead.id} status from {previous_status.value} to {target.value} (Refunded: ${refunded_amount:.2f})"
    else:
        message = f"{actor_name} updated lead #{lead.id} status from {previous_status.value} to {target.value}"

    notify_role_ids = await roles_to_notify(db, target)
    admin_role_rows = await db.execute(
        select(Role.id).where(Role.name.in_(["admin", "super_admin", "superadmin"]))
    )
    admin_role_ids = list(admin_role_rows.scalars().all())
    all_role_ids = list(set(notify_role_ids).union(admin_role_ids))

    for role_id in all_role_ids:
        db.add(Notification(lead_id=lead.id, recipient_role_id=role_id, type="status_change", message=message))

    # Also notify assigned agent if not the actor
    if lead.agent_id and lead.agent_id != actor.id:
        db.add(Notification(lead_id=lead.id, recipient_user_id=lead.agent_id, type="status_change", message=message))

    await db.flush()

    await _push_notifications(all_role_ids, target, lead.id, message, agent_id=lead.agent_id if lead.agent_id != actor.id else None)
    return lead


async def _push_notifications(
    notify_role_ids: list[uuid.UUID],
    target: BookingStatus,
    lead_id: uuid.UUID,
    message: str,
    agent_id: uuid.UUID | None = None,
) -> None:
    payload = {"type": "status_change", "lead_id": str(lead_id), "status": target.value, "message": message}
    for role_id in notify_role_ids:
        await connection_manager.send_to_role(role_id, payload)
    if agent_id:
        await connection_manager.send_to_user(agent_id, payload)
