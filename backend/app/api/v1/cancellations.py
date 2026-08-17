"""Cancellations — TECHNICAL_SPEC.md §5, PRD §7.2."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_visible_lead_or_404, require_ip_whitelisted, require_role
from app.db.session import get_db
from app.domain.booking_lookup import get_booking_for_lead
from app.models.booking import Cancellation
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.cancellation import CancellationCreate, CancellationRead

router = APIRouter(prefix="/leads/{lead_id}/cancellation", tags=["cancellations"])

# Same actors as modifications (app/api/v1/modifications.py) — PRD groups
# "modification/cancellation requests" together under CS/Change Dep.
CANCELLATION_ROLES = (UserRole.change_dep, UserRole.cs, UserRole.admin, UserRole.super_admin)


@router.post("", response_model=CancellationRead, status_code=status.HTTP_201_CREATED)
async def create_cancellation(
    lead_id: uuid.UUID,
    payload: CancellationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*CANCELLATION_ROLES)),
) -> Cancellation:
    lead = await get_visible_lead_or_404(db, current_user, lead_id)
    booking = await get_booking_for_lead(db, lead)
    if booking is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "This lead has no live booking to cancel")

    existing = await db.execute(select(Cancellation).where(Cancellation.lead_id == lead_id))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "This lead has already been cancelled")

    # refund_amount/final_retained_amount are DB-generated (GREATEST/LEAST over
    # these two inputs) — TECHNICAL_SPEC.md §2.5. Postgres does the math.
    cancellation = Cancellation(
        lead_id=lead.id,
        original_prepaid_amount=booking.prepaid_amount,
        cancellation_penalty_fee=payload.cancellation_penalty_fee,
        cancelled_by=current_user.id,
    )
    db.add(cancellation)
    await db.commit()
    await db.refresh(cancellation)
    return cancellation


@router.get("", response_model=CancellationRead)
async def get_cancellation(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ip_whitelisted),
) -> Cancellation:
    await get_visible_lead_or_404(db, current_user, lead_id)
    result = await db.execute(select(Cancellation).where(Cancellation.lead_id == lead_id))
    cancellation = result.scalar_one_or_none()
    if cancellation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This lead has not been cancelled")
    return cancellation
