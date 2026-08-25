import logging
import uuid
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_visible_lead_or_404, require_ip_whitelisted
from app.core.config import get_settings
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

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/leads/{lead_id}", tags=["authorization"])


def _safe_float(val: Any) -> float:
    if val is None:
        return 0.0
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0


async def _load_lead_and_booking(db: AsyncSession, lead_id: uuid.UUID) -> tuple[Lead, object]:
    lead = await db.get(Lead, lead_id)
    if lead is None:
        logger.error(f"[Auth Email] Lead {lead_id} not found in database.")
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Lead {lead_id} not found.")
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
    try:
        lead, booking = await _load_lead_and_booking(db, lead_id)

        # 1. Validate Lead Email
        if not lead.email or not lead.email.strip():
            logger.error(f"[Auth Email] Lead {lead_id} is missing a customer email address.")
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Customer email is missing for this lead. Please set an email address before sending authorization.",
            )

        # 2. Validate Server Environment Keys
        settings = get_settings()
        if settings.resend_api_key and not settings.resend_from_email:
            logger.error("[Auth Email] RESEND_FROM_EMAIL environment variable is missing on the server.")
            raise HTTPException(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                "Server configuration error: RESEND_FROM_EMAIL is missing in environment variables.",
            )

        # 3. Extract booking fields safely
        booking_ref = (getattr(booking, "booking_reference", "") if booking else "") or f"EC{str(lead.id)[:6].upper()}"
        car_provider = (getattr(booking, "car_provider", "Car Rental") if booking else "Car Rental") or "Car Rental"
        booking_platform = (getattr(booking, "booking_platform", "Direct") if booking else "Direct") or "Direct"
        agency_ref = (getattr(booking, "agency_reference", "done") if booking else "done") or "done"
        
        prepaid = _safe_float(getattr(booking, "prepaid_amount", 0.0) if booking else 0.0)
        pay_at_counter = _safe_float(getattr(booking, "pay_at_counter_amount", 0.0) if booking else 0.0)
        total = _safe_float(getattr(booking, "total_amount", 0.0) if booking else 0.0)
        
        card_type = (getattr(booking, "card_type", "Credit Card") if booking else "Credit Card") or "Credit Card"
        card_num = (getattr(booking, "card_number", "") if booking else "") or ""
        card_holder = (getattr(booking, "card_holder_name", "") if booking else "") or lead.name
        customer_dob = (getattr(booking, "customer_dob", "") if booking else "") or ""

        agent_name = current_user.full_name or "E-Booking Desk Specialist"
        service_type_str = lead.service_type.value if hasattr(lead.service_type, "value") else str(lead.service_type or "car")

        # 4. Generate HTML content
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
            service_type=service_type_str,
            agent_name=agent_name,
            template_type=template_type,
        )

        subject = f"Car Booking Authorisation: {booking_ref}"
        if template_type == "modification":
            subject = f"Car Rental Modification Payment Authorization: {booking_ref}"
        elif template_type == "cancellation":
            subject = f"Car Rental Cancellation Authorization: {booking_ref}"

        # 5. Dispatch email
        sent, email_msg = await send_customer_email(lead.email, subject, html_content)
        if not sent:
            logger.error(f"[Auth Email] Email dispatch failed for lead {lead.id}: {email_msg}")
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY,
                f"Email delivery failed: {email_msg}",
            )

        # 6. Ensure lead status reflects authorization_pending
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
            old_value={"status": lead.status.value if hasattr(lead.status, "value") else str(lead.status)},
            new_value={"recipient_email": lead.email, "template_type": template_type},
        )
        await db.commit()

        logger.info(f"[Auth Email] Authorization email successfully dispatched to {lead.email} for lead {lead.id}")
        return {
            "success": True,
            "message": f"Authorization email successfully dispatched to {lead.email}",
            "auth_url": f"/authorize/{lead.id}",
            "customer_email": lead.email,
            "email_sent": True,
            "detail": f"Authorization email sent to {lead.email}",
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(f"[Auth Email] Unexpected server error sending email for lead {lead_id}: {exc}")
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Server error while processing authorization email: {str(exc)}",
        )


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

    raw_ip = payload.client_ip or request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (
        request.client.host if request.client else "0.0.0.0"
    )
    client_ip = raw_ip.strip() if raw_ip else "0.0.0.0"
    # Basic sanitize for INET column
    if ":" not in client_ip and "." not in client_ip:
        client_ip = "0.0.0.0"

    system_info = (payload.system_name or "").strip()
    raw_ua = request.headers.get("user-agent", "unknown")
    user_agent = f"{system_info} - {raw_ua}" if system_info and system_info not in raw_ua else raw_ua

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

    if not lead.visitor_public_ip:
        lead.visitor_public_ip = client_ip


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
        prepaid = _safe_float(getattr(booking, "prepaid_amount", 0.0) if booking else 0.0)
        pay_at_counter = _safe_float(getattr(booking, "pay_at_counter_amount", 0.0) if booking else 0.0)
        total = _safe_float(getattr(booking, "total_amount", 0.0) if booking else 0.0)

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
