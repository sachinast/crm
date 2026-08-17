"""Billing charge/decline — TECHNICAL_SPEC.md §5 "POST /payments". Underneath,
charging or declining a card IS a status transition (card_charged/
card_declined), so this reuses app/services/status_transitions.py for that
half of the work and only adds the PaymentTransaction bookkeeping on top —
copying the authorized prepaid/pay_at_counter amounts off the lead's booking
at the moment of processing (TECHNICAL_SPEC.md §11.1 Payment_Transactions),
not re-collecting them from the caller.
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_visible_lead_or_404, require_ip_whitelisted, require_role
from app.db.session import get_db
from app.domain.booking_lookup import get_booking_for_lead
from app.models.enums import BookingStatus, UserRole
from app.models.payment import PaymentTransaction
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentRead
from app.services.status_transitions import apply_status_transition

router = APIRouter(tags=["payments"])

OUTCOME_TO_STATUS = {"charged": BookingStatus.card_charged, "declined": BookingStatus.card_declined}


@router.post("/payments", response_model=PaymentRead, status_code=status.HTTP_201_CREATED)
async def process_payment(
    payload: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.billing)),
) -> PaymentTransaction:
    lead = await get_visible_lead_or_404(db, current_user, payload.lead_id)
    booking = await get_booking_for_lead(db, lead)
    if booking is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "This lead has no booking to charge against")

    # Validates the transition (transferred_to_billing -> card_charged/declined)
    # and that the actor's role is allowed to set it — billing always is, but
    # this keeps a single source of truth rather than trusting the route guard alone.
    await apply_status_transition(db, lead_id=lead.id, target=OUTCOME_TO_STATUS[payload.outcome], actor=current_user)

    transaction = PaymentTransaction(
        lead_id=lead.id,
        prepaid_amount=booking.prepaid_amount,
        pay_at_counter_amount=booking.pay_at_counter_amount,
        card_last_four=payload.card_last_four,
        card_token=payload.card_token,
        outcome=payload.outcome,
        processed_by=current_user.id,
        processed_at=datetime.now(timezone.utc),
    )
    db.add(transaction)

    await db.commit()
    await db.refresh(transaction)
    return transaction


@router.get("/leads/{lead_id}/payments", response_model=list[PaymentRead])
async def list_payments(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ip_whitelisted),
) -> list[PaymentTransaction]:
    await get_visible_lead_or_404(db, current_user, lead_id)
    result = await db.execute(
        select(PaymentTransaction)
        .where(PaymentTransaction.lead_id == lead_id)
        .order_by(PaymentTransaction.created_at.desc())
    )
    return list(result.scalars().all())
