"""Future credits — TECHNICAL_SPEC.md §5, PRD §7.3. Not scoped by lead
visibility like every other resource in this API — the PRD frames this as a
company-wide voucher ledger with its own role list (creation: TL/CS; read:
Billing/CS/Change Dep/Chargeback Dep/Auditor), not something gated by
whether the reader can see the specific source lead.
"""
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.db.session import get_db
from app.models.booking import FutureCredit
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.future_credit import FutureCreditCreate, FutureCreditRead

router = APIRouter(prefix="/future-credits", tags=["future-credits"])

CREATE_ROLES = (UserRole.tl, UserRole.cs, UserRole.admin, UserRole.super_admin)
READ_ROLES = (
    UserRole.billing,
    UserRole.cs,
    UserRole.change_dep,
    UserRole.chargeback_dep,
    UserRole.auditor,
    UserRole.tl,
    UserRole.admin,
    UserRole.super_admin,
)


@router.post("", response_model=FutureCreditRead, status_code=201)
async def create_future_credit(
    payload: FutureCreditCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*CREATE_ROLES)),
) -> FutureCredit:
    credit = FutureCredit(
        source_lead_id=payload.source_lead_id,
        voucher_amount=payload.voucher_amount,
        number_of_vouchers=payload.number_of_vouchers,
        validity_date=payload.validity_date,
        created_by=current_user.id,
    )
    db.add(credit)
    await db.commit()
    await db.refresh(credit)
    return credit


@router.get("", response_model=list[FutureCreditRead])
async def list_future_credits(
    source_lead_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(*READ_ROLES)),
) -> list[FutureCredit]:
    stmt = select(FutureCredit)
    if source_lead_id is not None:
        stmt = stmt.where(FutureCredit.source_lead_id == source_lead_id)
    stmt = stmt.order_by(FutureCredit.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())
