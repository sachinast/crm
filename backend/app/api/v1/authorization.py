"""Customer-facing "I Authorize" flow — PRD §8. Deliberately the one
unauthenticated part of this API: no staff Bearer token, no RBAC visibility
filter — the lead's own UUID in the URL is the capability link (see
app/schemas/authorization.py for the security tradeoff this implies).
"""
import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_visible_lead_or_404, require_ip_whitelisted
from app.db.session import get_db
from app.domain.booking_lookup import get_booking_for_lead
from app.domain.process_log import log_process_event
from app.domain.status_machine import can_transition
from app.domain.status_permissions import roles_to_notify
from app.models.audit import Notification, StatusHistory
from app.models.booking import AuthorizationRecord
from app.models.enums import BookingStatus
from app.models.lead import Lead
from app.models.user import User
from app.schemas.authorization import (
    AuthorizationCreate,
    AuthorizationRecordRead,
    AuthorizationResult,
    AuthorizationSummary,
)

router = APIRouter(prefix="/leads/{lead_id}", tags=["authorization"])


async def _load_lead_and_booking(db: AsyncSession, lead_id: uuid.UUID) -> tuple[Lead, object]:
    lead = await db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")
    booking = await get_booking_for_lead(db, lead)
    if booking is None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Booking details must be completed before requesting authorization"
        )
    return lead, booking


@router.get("/authorization-summary", response_model=AuthorizationSummary)
async def get_authorization_summary(lead_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> AuthorizationSummary:
    lead, booking = await _load_lead_and_booking(db, lead_id)
    # NUMERIC columns (prepaid/pay_at_counter/total) come back from asyncpg as
    # Decimal; FastAPI's encoder stringifies those inside a plain dict[str, Any]
    # to avoid silent precision loss, which is inconsistent with every typed
    # *Read schema in this codebase (CarBookingRead etc.) declaring amounts as
    # float. Coerce here so the API represents money the same way everywhere.
    booking_dict = {
        c.name: float(v) if isinstance((v := getattr(booking, c.name)), Decimal) else v
        for c in booking.__table__.columns
        if c.name not in ("id", "lead_id")
    }
    return AuthorizationSummary(
        lead_id=lead.id,
        customer_name=lead.name,
        service_type=lead.service_type,
        status=lead.status,
        booking=booking_dict,
    )


@router.post("/authorization", response_model=AuthorizationResult)
async def submit_authorization(
    lead_id: uuid.UUID,
    payload: AuthorizationCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AuthorizationResult:
    lead, _booking = await _load_lead_and_booking(db, lead_id)

    if not can_transition(lead.status, BookingStatus.client_approved):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"This booking is at '{lead.status.value}' and can no longer be authorized "
            "(already authorized, or moved on)",
        )

    client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (
        request.client.host if request.client else "0.0.0.0"
    )
    user_agent = request.headers.get("user-agent", "unknown")

    record = AuthorizationRecord(
        lead_id=lead.id,
        cardholder_confirmed=payload.cardholder_confirmed,
        prepaid_charge_ack=payload.prepaid_charge_ack,
        pay_at_counter_ack=payload.pay_at_counter_ack,
        booking_details_ack=payload.booking_details_ack,
        terms_ack=payload.terms_ack,
        non_refundable_ack=payload.non_refundable_ack,
        consent_status="authorized",
        customer_ip=client_ip,
        user_agent=user_agent,
    )
    db.add(record)

    # Inline transition rather than app/services/status_transitions.py — that
    # helper is built around an authenticated staff User (role checks, RBAC
    # visibility). There's no such actor here, and status_machine.TRANSITIONS
    # already restricts client_approved to the CUSTOMER pseudo-actor, so this
    # is the one legitimate caller. status_history.changed_by has no concept
    # of an unauthenticated customer, so the transition is recorded against
    # the lead's own agent — the person actually accountable for this lead.
    previous_status = lead.status
    lead.status = BookingStatus.client_approved
    db.add(
        StatusHistory(
            lead_id=lead.id,
            from_status=previous_status,
            to_status=BookingStatus.client_approved,
            changed_by=lead.agent_id,
        )
    )
    log_process_event(
        db,
        lead_id=lead.id,
        actor_id=lead.agent_id,
        action="status_change",
        field_changed="status",
        old_value=previous_status.value,
        new_value=BookingStatus.client_approved.value,
    )

    notify_role_ids = await roles_to_notify(db, BookingStatus.client_approved)
    message = f"Lead {lead.id} moved from {previous_status.value} to client_approved (customer authorized)"
    for role_id in notify_role_ids:
        db.add(Notification(lead_id=lead.id, recipient_role_id=role_id, type="status_change", message=message))

    await db.commit()
    await db.refresh(lead)
    await db.refresh(record)

    # Import locally to avoid a hard import-time dependency on the WS module
    # for what is otherwise a fully standalone, unauthenticated router.
    from app.api.v1.websocket import connection_manager

    payload_out = {
        "type": "status_change",
        "lead_id": str(lead.id),
        "status": BookingStatus.client_approved.value,
        "message": message,
    }
    for role_id in notify_role_ids:
        await connection_manager.send_to_role(role_id, payload_out)

    return AuthorizationResult(lead_id=lead.id, status=lead.status, authorized_at=record.authorized_at)


@router.get("/authorization-record", response_model=AuthorizationRecordRead)
async def get_authorization_record(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ip_whitelisted),
) -> AuthorizationRecord:
    """Staff-facing view of the captured consent — the evidence trail PRD §8
    exists to build against chargebacks/disputes. Same visibility rules as
    every other lead sub-resource (unlike the two endpoints above, which are
    the public customer-facing side of this same flow)."""
    await get_visible_lead_or_404(db, current_user, lead_id)
    result = await db.execute(
        select(AuthorizationRecord)
        .where(AuthorizationRecord.lead_id == lead_id)
        .order_by(AuthorizationRecord.authorized_at.desc())
        .limit(1)
    )
    record = result.scalar_one_or_none()
    if record is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No authorization record for this lead")
    return record
