"""Role-aware dashboard summary — one endpoint, shaped differently per caller
by reusing the same visibility/role rules enforced everywhere else in this
API (apply_lead_visibility, the future-credits read list, etc.), not a
parallel access model.
"""
from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import apply_lead_visibility, require_ip_whitelisted
from app.api.v1.future_credits import READ_ROLES as FUTURE_CREDIT_READ_ROLES
from app.db.session import get_db
from app.models.booking import FutureCredit
from app.models.enums import UserRole
from app.models.integration import ApiKey
from app.models.lead import Lead
from app.models.payment import PaymentTransaction
from app.models.user import User
from app.schemas.dashboard import DashboardSummary
from app.schemas.lead import LeadSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# Roles with a meaningful stake in the QC queue / billing queue / company-wide
# revenue figures, beyond just "whatever leads I can already see" — full
# visibility roles plus the department the figure specifically belongs to.
QC_VISIBILITY_ROLES = (UserRole.auditor, UserRole.admin, UserRole.super_admin, UserRole.tl)
BILLING_VISIBILITY_ROLES = (UserRole.billing, UserRole.admin, UserRole.super_admin, UserRole.tl)
REVENUE_VISIBILITY_ROLES = (UserRole.admin, UserRole.super_admin, UserRole.tl)
SYSTEM_STATS_ROLES = (UserRole.admin, UserRole.super_admin)


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ip_whitelisted),
) -> DashboardSummary:
    # One query, aggregated in Python — simplest-correct at this data volume;
    # move to SQL-side GROUP BY if the leads table gets large enough for that
    # to matter (Phase 9 hardening territory, same as the rest of this API's
    # not-yet-needed optimizations).
    visible_leads = list((await db.execute(apply_lead_visibility(select(Lead), current_user))).scalars().all())
    leads_by_status = Counter(lead.status.value for lead in visible_leads)
    recent_leads = sorted(visible_leads, key=lambda l: l.created_at, reverse=True)[:5]

    summary = DashboardSummary(
        role=current_user.role,
        total_visible_leads=len(visible_leads),
        leads_by_status=dict(leads_by_status),
        recent_leads=[LeadSummary.model_validate(lead) for lead in recent_leads],
    )

    if current_user.role in QC_VISIBILITY_ROLES:
        summary.pending_qc_count = leads_by_status.get("tag_auditor", 0)

    if current_user.role in BILLING_VISIBILITY_ROLES:
        summary.pending_payment_count = leads_by_status.get("transferred_to_billing", 0)

    if current_user.role == UserRole.billing:
        raw = await db.scalar(
            select(func.coalesce(func.sum(PaymentTransaction.total_amount), 0)).where(
                PaymentTransaction.outcome == "charged", PaymentTransaction.processed_by == current_user.id
            )
        )
        summary.my_processed_revenue = float(raw)

    if current_user.role in REVENUE_VISIBILITY_ROLES:
        raw = await db.scalar(
            select(func.coalesce(func.sum(PaymentTransaction.total_amount), 0)).where(
                PaymentTransaction.outcome == "charged"
            )
        )
        summary.total_revenue = float(raw)

    if current_user.role in SYSTEM_STATS_ROLES:
        summary.total_users = await db.scalar(select(func.count()).select_from(User))
        summary.active_integrations = await db.scalar(
            select(func.count()).select_from(ApiKey).where(ApiKey.is_active.is_(True))
        )

    if current_user.role in FUTURE_CREDIT_READ_ROLES:
        summary.future_credits_issued_count = await db.scalar(select(func.count()).select_from(FutureCredit))
        raw = await db.scalar(
            select(func.coalesce(func.sum(FutureCredit.voucher_amount * FutureCredit.number_of_vouchers), 0))
        )
        summary.future_credits_total_value = float(raw)

    return summary
