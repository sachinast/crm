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
from app.models.enums import BookingStatus, ServiceType
from app.models.lead import Lead
from app.models.user import User
from app.schemas.authorization import (
    AuthorizationCreate,
    AuthorizationRecordRead,
    AuthorizationResult,
    AuthorizationSummary,
)

from app.services.email_service import (
    generate_authorization_email_html,
    generate_confirmation_email_html,
    send_customer_email,
)

router = APIRouter(prefix="/leads/{lead_id}", tags=["authorization"])


async def _load_lead_and_booking(db: AsyncSession, lead_id: uuid.UUID) -> tuple[Lead, object]:
    lead = await db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")
    booking = await get_booking_for_lead(db, lead)
    return lead, booking


@router.post("/send-auth-email")
async def send_lead_auth_email(
    lead_id: uuid.UUID,
    template_type: str = "new_booking",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ip_whitelisted),
) -> dict:
    """Dispatches the customer authorization email based on attached templates."""
    lead, booking = await _load_lead_and_booking(db, lead_id)
    if not lead.email:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Lead does not have an email address configured.")

    # Extract booking fields safely
    booking_ref = (getattr(booking, "booking_reference", "") if booking else "") or f"EC{str(lead.id)[:6].upper()}"
    car_provider = (getattr(booking, "car_provider", "Car Rental") if booking else "Car Rental") or "Car Rental"
    booking_platform = (getattr(booking, "booking_platform", "Direct") if booking else "Direct") or "Direct"
    agency_ref = (getattr(booking, "agency_reference", "done") if booking else "done") or "done"
    prepaid = float(getattr(booking, "prepaid_amount", 0.0) if booking else 0.0)
    pay_at_counter = float(getattr(booking, "pay_at_counter_amount", 0.0) if booking else 0.0)
    total = float(getattr(booking, "total_amount", 0.0) if booking else 0.0)
    card_type = (getattr(booking, "card_type", "Credit Card") if booking else "Credit Card") or "Credit Card"
    card_num = (getattr(booking, "card_number", "") if booking else "") or ""
    card_holder = (getattr(booking, "card_holder_name", "") if booking else "") or lead.name
    customer_dob = (getattr(booking, "customer_dob", "") if booking else "") or ""

    agent_name = current_user.full_name or "E-Booking Desk Specialist"

    # Generate HTML content
    html_content = generate_authorization_email_html(
        lead_id=str(lead.id),
        customer_name=lead.name,
        customer_email=lead.email,
        customer_phone=lead.phone or "",
        customer_dob=customer_dob,
        booking_reference=booking_ref,
        agency_reference=agency_ref,
        booking_platform=booking_platform,
        car_provider=car_provider,
        card_type=card_type,
        card_number=card_num,
        card_holder_name=card_holder,
        prepaid_amount=prepaid,
        pay_at_counter_amount=pay_at_counter,
        total_amount=total,
        service_type=lead.service_type.value if hasattr(lead.service_type, "value") else str(lead.service_type or "car"),
        agent_name=agent_name,
        template_type=template_type,
    )

    subject = f"Car Booking Authorisation: {booking_ref}"
    if template_type == "modification":
        subject = f"Car Rental Modification Payment Authorization: {booking_ref}"
    elif template_type == "cancellation":
        subject = f"Car Rental Cancellation Authorization: {booking_ref}"

    sent = await send_customer_email(lead.email, subject, html_content)

    # Ensure lead status reflects authorization_pending
    if lead.status != BookingStatus.authorization_pending and lead.status != BookingStatus.client_approved:
        previous_status = lead.status
        lead.status = BookingStatus.authorization_pending
        db.add(
            StatusHistory(
                lead_id=lead.id,
                from_status=previous_status,
                to_status=BookingStatus.authorization_pending,
                changed_by=current_user.id,
            )
        )

    log_process_event(
        db,
        lead_id=lead.id,
        actor_id=current_user.id,
        action="auth_email_sent",
        field_changed="authorization_email",
        old_value="",
        new_value=lead.email,
    )
    await db.commit()

    return {
        "success": True,
        "message": f"Authorization email successfully dispatched to {lead.email}",
        "auth_url": f"/authorize/{lead.id}",
        "customer_email": lead.email,
        "email_sent": sent,
    }


@router.get("/authorization-summary", response_model=AuthorizationSummary)
async def get_authorization_summary(lead_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> AuthorizationSummary:
    lead = await db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")
    booking = await get_booking_for_lead(db, lead)
    if booking is None:
        booking_dict = {
            "booking_reference": f"EC{str(lead.id)[:6].upper()}",
            "car_provider": "Car Rental",
            "booking_platform": "Direct",
            "agency_reference": "done",
            "prepaid_amount": 0.0,
            "pay_at_counter_amount": 0.0,
            "total_amount": 0.0,
            "card_type": "Credit Card",
            "card_number": "",
            "card_holder_name": lead.name,
            "customer_dob": "",
        }
    else:
        booking_dict = {
            c.name: float(v) if isinstance((v := getattr(booking, c.name)), Decimal) else v
            for c in booking.__table__.columns
            if c.name not in ("id", "lead_id")
        }
    return AuthorizationSummary(
        lead_id=lead.id,
        customer_name=lead.name,
        customer_email=lead.email or "",
        customer_phone=lead.phone or "",
        service_type=lead.service_type or ServiceType.car,
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
    lead, booking = await _load_lead_and_booking(db, lead_id)

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

    actor_user_id = lead.agent_id
    if not actor_user_id:
        system_user = (await db.execute(select(User).limit(1))).scalar_one_or_none()
        actor_user_id = system_user.id if system_user else lead.id

    previous_status = lead.status
    lead.status = BookingStatus.client_approved
    db.add(
        StatusHistory(
            lead_id=lead.id,
            from_status=previous_status,
            to_status=BookingStatus.client_approved,
            changed_by=actor_user_id,
        )
    )
    log_process_event(
        db,
        lead_id=lead.id,
        actor_id=actor_user_id,
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

    # Send confirmation email to customer
    if lead.email:
        booking_ref = (getattr(booking, "booking_reference", "") if booking else "") or f"EC{str(lead.id)[:6].upper()}"
        car_provider = (getattr(booking, "car_provider", "Car Rental") if booking else "Car Rental") or "Car Rental"
        booking_platform = (getattr(booking, "booking_platform", "Direct") if booking else "Direct") or "Direct"
        prepaid = float(getattr(booking, "prepaid_amount", 0.0) if booking else 0.0)
        pay_at_counter = float(getattr(booking, "pay_at_counter_amount", 0.0) if booking else 0.0)
        total = float(getattr(booking, "total_amount", 0.0) if booking else 0.0)

        conf_html = generate_confirmation_email_html(
            lead_id=str(lead.id),
            customer_name=lead.name,
            customer_email=lead.email,
            booking_reference=booking_ref,
            car_provider=car_provider,
            booking_platform=booking_platform,
            prepaid_amount=prepaid,
            pay_at_counter_amount=pay_at_counter,
            total_amount=total,
            client_ip=client_ip,
            user_agent=user_agent,
        )
        await send_customer_email(lead.email, f"Car Rental Payment Authorization Confirmed: {booking_ref}", conf_html)

    # Import locally to avoid a hard import-time dependency on WS
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
