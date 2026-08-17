"""Booking modifications — TECHNICAL_SPEC.md §5, PRD §7.1."""
import numbers
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_visible_lead_or_404, require_ip_whitelisted, require_role
from app.db.session import get_db
from app.domain.booking_lookup import get_booking_for_lead
from app.models.booking import BookingModification
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.modification import ModificationCreate, ModificationRead

router = APIRouter(prefix="/leads/{lead_id}/modifications", tags=["modifications"])

# Change Dep "handles the Original vs. Revised modification workflow" (PRD
# §3.1); CS "supports modification/cancellation requests". Admin/Super Admin
# retain oversight, matching every other domain action in this API.
MODIFICATION_ROLES = (UserRole.change_dep, UserRole.cs, UserRole.admin, UserRole.super_admin)


def _is_number(value: object) -> bool:
    return isinstance(value, numbers.Real) and not isinstance(value, bool)


@router.post("", response_model=ModificationRead, status_code=status.HTTP_201_CREATED)
async def create_modification(
    lead_id: uuid.UUID,
    payload: ModificationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*MODIFICATION_ROLES)),
) -> BookingModification:
    lead = await get_visible_lead_or_404(db, current_user, lead_id)
    booking = await get_booking_for_lead(db, lead)
    if booking is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "This lead has no live booking to modify")

    modification_amount = payload.modification_amount
    if modification_amount is None:
        # PRD §7.1: "the system automatically compares Original vs. Revised
        # values to calculate any Modification Amount" — only meaningful when
        # both sides are numbers; otherwise there's no $ impact to infer, and
        # 0 is the honest default (e.g. correcting a typo'd pickup location).
        if _is_number(payload.original_value) and _is_number(payload.revised_value):
            modification_amount = float(payload.revised_value) - float(payload.original_value)
        else:
            modification_amount = 0.0

    modification = BookingModification(
        lead_id=lead.id,
        field_name=payload.field_name,
        original_value=payload.original_value,
        revised_value=payload.revised_value,
        modification_amount=modification_amount,
        modified_by=current_user.id,
    )
    db.add(modification)
    await db.commit()
    await db.refresh(modification)
    return modification


@router.get("", response_model=list[ModificationRead])
async def list_modifications(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    # Read access follows lead visibility, not a role allowlist — same pattern
    # as status-history/payments (anyone who can see the lead can see its history).
    current_user: User = Depends(require_ip_whitelisted),
) -> list[BookingModification]:
    await get_visible_lead_or_404(db, current_user, lead_id)
    result = await db.execute(
        select(BookingModification)
        .where(BookingModification.lead_id == lead_id)
        .order_by(BookingModification.created_at.desc())
    )
    return list(result.scalars().all())
