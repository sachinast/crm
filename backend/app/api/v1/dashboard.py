"""Role-aware dashboard summary — one endpoint, shaped differently per caller
by reusing the same visibility/role rules enforced everywhere else in this
API (apply_lead_visibility, the future-credits read list, etc.), not a
parallel access model.
"""
from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import apply_lead_visibility, require_ip_whitelisted
from app.api.v1.future_credits import READ_PERMISSIONS as FUTURE_CREDIT_READ_PERMISSIONS
from app.db.session import get_db
from app.domain.masking import mask_email, mask_phone
from app.models.audit import StatusHistory
from app.models.booking import FutureCredit
from app.models.enums import BookingStatus
from app.models.integration import ApiKey
from app.models.lead import Lead
from app.models.payment import PaymentTransaction
from app.models.rbac import Role
from app.models.user import User
from app.schemas.dashboard import (
    AgentPerformanceItem,
    DailyChargedItem,
    DailyChargedResponse,
    DashboardSummary,
    LeaderboardEntry,
    QueueMetric,
    StatusLeadItem,
    StatusWidget,
)
from app.schemas.lead import LeadSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

ACTIVE_STATUSES = [
    ("authorization_pending", "Authorization Pending"),
    ("client_approved", "Client Approved"),
    ("transferred_to_billing", "Transferred to Billing"),
    ("card_charged", "Card Charged"),
    ("card_declined", "Card Declined"),
    ("tag_cr_booking", "In CR"),
    ("tag_change_dep", "In Changes"),
    ("tag_auditor", "In Quality/QC"),
    ("qc_done", "Closed"),
]

DEPARTMENT_QUEUE_MAP: dict[str, tuple[str, str]] = {
    "billing": ("transferred_to_billing", "Billing Queue"),
    "cr_booking": ("tag_cr_booking", "CR Queue"),
    "cs": ("tag_cr_booking", "Customer Service / CR Queue"),
    "change_dep": ("tag_change_dep", "Changes Department Queue"),
    "auditor": ("tag_auditor", "Quality / QC Queue"),
    "qc": ("tag_auditor", "Quality / QC Queue"),
    "chargeback_dep": ("tag_chargeback", "Chargeback Queue"),
}


def _format_time_diff(diff_seconds: int) -> str:
    diff_mins = diff_seconds // 60
    diff_hours = diff_seconds // 3600
    diff_days = diff_seconds // 86400

    if diff_mins < 1:
        return "just now"
    if diff_mins < 60:
        return f"{diff_mins} mins ago"
    if diff_hours < 24:
        rem_mins = diff_mins % 60
        return f"{diff_hours}h {rem_mins}m ago" if rem_mins > 0 else f"{diff_hours}h ago"
    rem_hours = diff_hours % 24
    return f"{diff_days}d {rem_hours}h ago" if rem_hours > 0 else f"{diff_days}d ago"


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(
    timeframe: str = Query("1W", description="Timeframe filter: 1D, 2D, 1W, 1M, 1Y"),
    charged_date: str | None = Query(None, description="Optional target date for daily charged statistics (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ip_whitelisted),
) -> DashboardSummary:
    visible_stmt = await apply_lead_visibility(db, select(Lead), current_user)
    visible_leads = list((await db.execute(visible_stmt)).scalars().all())

    # Timeframe filtering
    now = datetime.now(timezone.utc)
    cutoff = None
    if timeframe == "1D":
        cutoff = now - timedelta(hours=24)
    elif timeframe == "2D":
        cutoff = now - timedelta(hours=48)
    elif timeframe == "1W":
        cutoff = now - timedelta(days=7)
    elif timeframe == "1M":
        cutoff = now - timedelta(days=30)
    elif timeframe == "1Y":
        cutoff = now - timedelta(days=365)

    if cutoff is not None:
        filtered_leads = [
            l for l in visible_leads
            if (l.created_at.tzinfo and l.created_at >= cutoff) or
               (not l.created_at.tzinfo and l.created_at.replace(tzinfo=timezone.utc) >= cutoff)
        ]
        # Graceful fallback if database has older seed records
        if not filtered_leads and visible_leads:
            filtered_leads = visible_leads
    else:
        filtered_leads = visible_leads

    leads_by_status = Counter(lead.status.value for lead in filtered_leads)
    recent_leads = sorted(filtered_leads, key=lambda l: l.created_at, reverse=True)[:5]

    # Fetch status history changed_at timestamps to calculate SLA elapsed time
    lead_ids = [l.id for l in filtered_leads]
    status_changed_map: dict[str, datetime] = {}
    if lead_ids:
        history_rows = await db.execute(
            select(StatusHistory.lead_id, func.max(StatusHistory.changed_at))
            .where(StatusHistory.lead_id.in_(lead_ids))
            .group_by(StatusHistory.lead_id)
        )
        status_changed_map = {row[0]: row[1] for row in history_rows}

    # Helper to construct StatusLeadItem
    def make_status_lead_item(l: Lead) -> StatusLeadItem:
        changed_at = status_changed_map.get(l.id) or l.updated_at or l.created_at
        if not changed_at.tzinfo:
            changed_at = changed_at.replace(tzinfo=timezone.utc)
        diff_secs = max(0, int((now - changed_at).total_seconds()))
        return StatusLeadItem(
            id=l.id,
            name=l.name,
            phone=mask_phone(l.phone),
            email=mask_email(l.email),
            status=l.status.value,
            agent_id=l.agent_id,
            created_at=l.created_at,
            updated_at=l.updated_at,
            status_changed_at=changed_at,
            time_diff=_format_time_diff(diff_secs),
            time_diff_seconds=diff_secs,
            sla_breached=diff_secs > 86400,
        )

    role_name = (current_user.role.name or "").lower()
    is_admin = role_name in ("admin", "super_admin", "superadmin")
    is_agent = role_name == "agent"

    status_widgets: list[StatusWidget] = []

    if is_admin:
        # Admin gets all 9 active status widgets with SLA alerts
        for st_value, st_label in ACTIVE_STATUSES:
            matching = [l for l in filtered_leads if l.status.value == st_value]
            items = [make_status_lead_item(l) for l in matching]
            # Sort items so SLA breached (>24h) appear first, followed by largest time elapsed
            items.sort(key=lambda x: (not x.sla_breached, -x.time_diff_seconds))
            breached_count = sum(1 for it in items if it.sla_breached)
            status_widgets.append(
                StatusWidget(
                    status=st_value,
                    label=st_label,
                    count=len(matching),
                    sla_breached_count=breached_count,
                    leads=items[:15],
                )
            )
    elif is_agent:
        # Agent gets 5 core status widgets strictly for agent_id == current_user.id
        agent_leads = [l for l in filtered_leads if l.agent_id == current_user.id]
        agent_groups = [
            ("intake_pending", "Intake / Pending", ["authorization_pending", "client_approved"]),
            ("billing_pending", "Billing Pending", ["transferred_to_billing"]),
            ("card_declined", "Card Declined", ["card_declined"]),
            ("in_changes_cr", "In Changes / CR", ["tag_change_dep", "tag_cr_booking"]),
            ("closed", "Closed", ["qc_done"]),
        ]
        for key, label, st_list in agent_groups:
            matching = [l for l in agent_leads if l.status.value in st_list]
            items = [make_status_lead_item(l) for l in matching]
            items.sort(key=lambda x: (not x.sla_breached, -x.time_diff_seconds))
            breached_count = sum(1 for it in items if it.sla_breached)
            status_widgets.append(
                StatusWidget(
                    status=key,
                    label=label,
                    count=len(matching),
                    sla_breached_count=breached_count,
                    leads=items[:15],
                )
            )

    # Department Queue focus for specialized roles
    dept_info = DEPARTMENT_QUEUE_MAP.get(role_name)
    dept_queue_status, dept_queue_name = dept_info if dept_info else (None, None)
    dept_queue_count = leads_by_status.get(dept_queue_status, 0) if dept_queue_status else None

    summary = DashboardSummary(
        role=current_user.role.name,
        total_visible_leads=len(filtered_leads),
        leads_by_status=dict(leads_by_status),
        recent_leads=[LeadSummary.model_validate(lead) for lead in recent_leads],
        status_widgets=status_widgets if (is_admin or is_agent) else None,
        department_queue_count=dept_queue_count,
        department_queue_name=dept_queue_name,
        department_queue_status=dept_queue_status,
    )

    if current_user.role.has_permission("dashboard.qc_stats"):
        summary.pending_qc_count = leads_by_status.get("tag_auditor", 0)

    if current_user.role.has_permission("dashboard.billing_stats"):
        summary.pending_payment_count = leads_by_status.get("transferred_to_billing", 0)

    if current_user.role.has_permission("billing.charge_card"):
        raw = await db.scalar(
            select(func.coalesce(func.sum(PaymentTransaction.total_amount), 0)).where(
                PaymentTransaction.outcome == "charged", PaymentTransaction.processed_by == current_user.id
            )
        )
        summary.my_processed_revenue = float(raw)

    if current_user.role.has_permission("dashboard.revenue_stats"):
        raw = await db.scalar(
            select(func.coalesce(func.sum(PaymentTransaction.total_amount), 0)).where(
                PaymentTransaction.outcome == "charged"
            )
        )
        summary.total_revenue = float(raw)

        leaderboard_rows = await db.execute(
            select(
                Lead.agent_id,
                User.name,
                func.sum(PaymentTransaction.total_amount).label("revenue"),
                func.count(func.distinct(Lead.id)).label("bookings_count"),
            )
            .join(PaymentTransaction, PaymentTransaction.lead_id == Lead.id)
            .join(User, User.id == Lead.agent_id)
            .where(PaymentTransaction.outcome == "charged")
            .group_by(Lead.agent_id, User.name)
            .order_by(func.sum(PaymentTransaction.total_amount).desc())
            .limit(5)
        )
        summary.leaderboard = [
            LeaderboardEntry(agent_id=agent_id, agent_name=name, revenue=float(revenue), bookings_count=count)
            for agent_id, name, revenue, count in leaderboard_rows
        ]

    if current_user.role.has_permission("dashboard.system_stats"):
        summary.total_users = await db.scalar(select(func.count()).select_from(User))
        summary.active_integrations = await db.scalar(
            select(func.count()).select_from(ApiKey).where(ApiKey.is_active.is_(True))
        )

    if current_user.role.has_permission(*FUTURE_CREDIT_READ_PERMISSIONS):
        summary.future_credits_issued_count = await db.scalar(select(func.count()).select_from(FutureCredit))
        raw = await db.scalar(
            select(func.coalesce(func.sum(FutureCredit.voucher_amount * FutureCredit.number_of_vouchers), 0))
        )
        summary.future_credits_total_value = float(raw)

    # Daily charged booking cards (PRD Point 17)
    if is_admin or current_user.role.has_permission("dashboard.revenue_stats"):
        if charged_date:
            try:
                target_start = datetime.fromisoformat(charged_date).replace(tzinfo=timezone.utc)
            except Exception:
                target_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            target_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        target_end = target_start.replace(hour=23, minute=59, second=59, microsecond=999999)

        daily_charged_cnt = await db.scalar(
            select(func.count(PaymentTransaction.id)).where(
                PaymentTransaction.outcome == "charged",
                PaymentTransaction.created_at >= target_start,
                PaymentTransaction.created_at <= target_end,
            )
        )
        daily_charged_tot = await db.scalar(
            select(func.coalesce(func.sum(PaymentTransaction.total_amount), 0)).where(
                PaymentTransaction.outcome == "charged",
                PaymentTransaction.created_at >= target_start,
                PaymentTransaction.created_at <= target_end,
            )
        )
        summary.daily_charged_bookings_count = int(daily_charged_cnt or 0)
        summary.daily_charged_amount = float(daily_charged_tot or 0.0)

    return summary


@router.get("/queue-metrics", response_model=list[QueueMetric])
async def get_queue_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ip_whitelisted),
) -> list[QueueMetric]:
    """PRD Point 14: Check each queue pendency (active leads waiting in queue)
    and completed count (leads resolved or successfully moved forward from queue)."""
    # 1. Billing Queue
    billing_pending = await db.scalar(
        select(func.count(Lead.id)).where(Lead.status == BookingStatus.transferred_to_billing)
    ) or 0
    billing_completed = await db.scalar(
        select(func.count(func.distinct(StatusHistory.lead_id))).where(
            StatusHistory.from_status == BookingStatus.transferred_to_billing,
            StatusHistory.to_status.in_([BookingStatus.card_charged, BookingStatus.card_declined]),
        )
    ) or 0

    # 2. CR Booking Queue
    cr_pending = await db.scalar(
        select(func.count(Lead.id)).where(Lead.status == BookingStatus.tag_cr_booking)
    ) or 0
    cr_completed = await db.scalar(
        select(func.count(func.distinct(StatusHistory.lead_id))).where(
            StatusHistory.from_status == BookingStatus.tag_cr_booking,
            StatusHistory.to_status == BookingStatus.tag_auditor,
        )
    ) or 0

    # 3. Changes Queue
    changes_pending = await db.scalar(
        select(func.count(Lead.id)).where(Lead.status == BookingStatus.tag_change_dep)
    ) or 0
    changes_completed = await db.scalar(
        select(func.count(func.distinct(StatusHistory.lead_id))).where(
            StatusHistory.from_status == BookingStatus.tag_change_dep,
            StatusHistory.to_status.in_([BookingStatus.transferred_to_billing, BookingStatus.tag_auditor]),
        )
    ) or 0

    # 4. QC / Quality Queue
    qc_pending = await db.scalar(
        select(func.count(Lead.id)).where(Lead.status == BookingStatus.tag_auditor)
    ) or 0
    qc_completed = await db.scalar(
        select(func.count(func.distinct(StatusHistory.lead_id))).where(
            StatusHistory.to_status == BookingStatus.qc_done,
        )
    ) or 0

    # 5. Chargeback Queue
    cb_pending = await db.scalar(
        select(func.count(Lead.id)).where(Lead.status == BookingStatus.tag_chargeback)
    ) or 0
    cb_completed = await db.scalar(
        select(func.count(func.distinct(StatusHistory.lead_id))).where(
            StatusHistory.from_status == BookingStatus.tag_chargeback,
        )
    ) or 0

    return [
        QueueMetric(
            queue_key="billing",
            queue_name="Billing Queue",
            pending_count=int(billing_pending),
            completed_count=int(billing_completed),
            total_count=int(billing_pending + billing_completed),
        ),
        QueueMetric(
            queue_key="cr_booking",
            queue_name="CR Queue",
            pending_count=int(cr_pending),
            completed_count=int(cr_completed),
            total_count=int(cr_pending + cr_completed),
        ),
        QueueMetric(
            queue_key="change_dep",
            queue_name="Changes Queue",
            pending_count=int(changes_pending),
            completed_count=int(changes_completed),
            total_count=int(changes_pending + changes_completed),
        ),
        QueueMetric(
            queue_key="auditor",
            queue_name="QC / Audit Queue",
            pending_count=int(qc_pending),
            completed_count=int(qc_completed),
            total_count=int(qc_pending + qc_completed),
        ),
        QueueMetric(
            queue_key="chargeback_dep",
            queue_name="Chargeback Queue",
            pending_count=int(cb_pending),
            completed_count=int(cb_completed),
            total_count=int(cb_pending + cb_completed),
        ),
    ]


@router.get("/agent-performance", response_model=list[AgentPerformanceItem])
async def get_agent_performance(
    start_date: str | None = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: str | None = Query(None, description="End date in YYYY-MM-DD format"),
    only_with_bookings: bool = Query(False, description="Filter out agents who have zero bookings"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ip_whitelisted),
) -> list[AgentPerformanceItem]:
    """PRD Point 16: Agent performance report with booking counts and revenue,
    filterable by date range. Strictly queries sales/intake agents only."""
    agent_roles = await db.execute(select(Role.id).where(Role.name == "agent"))
    agent_role_ids = list(agent_roles.scalars().all())
    if not agent_role_ids:
        return []

    agents = (
        await db.execute(
            select(User).where(User.role_id.in_(agent_role_ids), User.is_active.is_(True)).order_by(User.name)
        )
    ).scalars().all()

    results: list[AgentPerformanceItem] = []

    for ag in agents:
        lead_query = select(func.count(Lead.id)).where(Lead.agent_id == ag.id)
        if start_date:
            try:
                s_dt = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
                lead_query = lead_query.where(Lead.created_at >= s_dt)
            except Exception:
                pass
        if end_date:
            try:
                e_dt = datetime.fromisoformat(end_date + "T23:59:59.999999").replace(tzinfo=timezone.utc)
                lead_query = lead_query.where(Lead.created_at <= e_dt)
            except Exception:
                pass

        total_bookings = await db.scalar(lead_query) or 0

        if only_with_bookings and total_bookings == 0:
            continue

        # Charged transactions for this agent's leads
        charged_query = (
            select(
                func.count(func.distinct(Lead.id)).label("charged_count"),
                func.coalesce(func.sum(PaymentTransaction.total_amount), 0).label("revenue"),
            )
            .join(PaymentTransaction, PaymentTransaction.lead_id == Lead.id)
            .where(Lead.agent_id == ag.id, PaymentTransaction.outcome == "charged")
        )
        if start_date:
            try:
                s_dt = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
                charged_query = charged_query.where(PaymentTransaction.created_at >= s_dt)
            except Exception:
                pass
        if end_date:
            try:
                e_dt = datetime.fromisoformat(end_date + "T23:59:59.999999").replace(tzinfo=timezone.utc)
                charged_query = charged_query.where(PaymentTransaction.created_at <= e_dt)
            except Exception:
                pass

        charged_row = (await db.execute(charged_query)).first()
        charged_count = charged_row[0] if charged_row else 0
        total_rev = charged_row[1] if charged_row else 0.0

        results.append(
            AgentPerformanceItem(
                agent_id=ag.id,
                agent_name=ag.name,
                agent_email=ag.email,
                bookings_count=int(total_bookings),
                charged_bookings_count=int(charged_count),
                total_revenue=float(total_rev),
            )
        )

    results.sort(key=lambda x: (x.bookings_count, x.total_revenue), reverse=True)
    return results


@router.get("/daily-charged", response_model=DailyChargedResponse)
async def get_daily_charged(
    date: str | None = Query(None, description="Date in YYYY-MM-DD format (defaults to current date)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ip_whitelisted),
) -> DailyChargedResponse:
    """PRD Point 17: Dashboard option to view itemized daily bookings charged and total charged amount."""
    now = datetime.now(timezone.utc)
    target_date_str = date or now.strftime("%Y-%m-%d")
    try:
        s_dt = datetime.fromisoformat(target_date_str).replace(tzinfo=timezone.utc)
    except Exception:
        s_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
        target_date_str = s_dt.strftime("%Y-%m-%d")

    e_dt = s_dt.replace(hour=23, minute=59, second=59, microsecond=999999)

    query = (
        select(
            PaymentTransaction,
            Lead.id.label("lead_id"),
            Lead.name.label("lead_name"),
            Lead.booking_reference.label("booking_reference"),
            User.name.label("agent_name"),
        )
        .join(Lead, Lead.id == PaymentTransaction.lead_id)
        .outerjoin(User, User.id == Lead.agent_id)
        .where(
            PaymentTransaction.outcome == "charged",
            PaymentTransaction.created_at >= s_dt,
            PaymentTransaction.created_at <= e_dt,
        )
        .order_by(PaymentTransaction.created_at.desc())
    )

    rows = (await db.execute(query)).all()

    items: list[DailyChargedItem] = []
    total_amount = 0.0

    for tx, l_id, l_name, b_ref, ag_name in rows:
        amount = float(tx.total_amount or 0.0)
        total_amount += amount
        items.append(
            DailyChargedItem(
                lead_id=l_id,
                lead_name=l_name or "Unknown Customer",
                booking_reference=b_ref or (tx.custom_fields.get("booking_reference") if tx.custom_fields else None),
                agent_name=ag_name or "Unassigned",
                amount=amount,
                currency=tx.currency or "USD",
                charged_at=tx.created_at,
                transaction_id=tx.gateway_transaction_id or str(tx.id),
                payment_method=tx.payment_method,
            )
        )

    return DailyChargedResponse(
        date=target_date_str,
        total_charged_count=len(items),
        total_charged_amount=float(total_amount),
        items=items,
    )

