"""Role-aware dashboard summary — a glimpse of the data each role actually
has permission to see, not a separate "admin dashboard" bolted on top. Every
figure here is computed the same way the rest of the API already enforces
visibility (apply_lead_visibility) or role gates — this endpoint doesn't
introduce a new access model, just aggregates what the caller could already
see one record at a time.
"""
import uuid

from pydantic import BaseModel

from datetime import datetime

from app.schemas.lead import LeadSummary


class StatusLeadItem(BaseModel):
    id: uuid.UUID
    name: str
    phone: str
    email: str
    status: str
    agent_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    status_changed_at: datetime
    time_diff: str
    time_diff_seconds: int
    sla_breached: bool  # > 24 hours in current status


class StatusWidget(BaseModel):
    status: str
    label: str
    count: int
    sla_breached_count: int
    leads: list[StatusLeadItem] = []


class LeaderboardEntry(BaseModel):
    """One row of the top-5 performers leaderboard — revenue attributed to
    the agent who *owns* the lead (Lead.agent_id), not whoever processed the
    card (that's almost always Billing, a different role) — this measures
    sales performance, not payment-processing throughput."""

    agent_id: uuid.UUID
    agent_name: str
    revenue: float
    bookings_count: int


class DashboardSummary(BaseModel):
    role: str
    total_visible_leads: int
    leads_by_status: dict[str, int]
    recent_leads: list[LeadSummary]

    # Status widgets with SLA tracking (all 9 statuses for Admin, 5 core statuses for Agent)
    status_widgets: list[StatusWidget] | None = None

    # Focused single department queue for department roles (Billing, CR, Changes, Quality)
    department_queue_count: int | None = None
    department_queue_name: str | None = None
    department_queue_status: str | None = None

    # Populated only when relevant to the caller's role; null otherwise
    # rather than omitted, so the frontend can branch on a stable shape.
    pending_qc_count: int | None = None
    pending_payment_count: int | None = None
    my_processed_revenue: float | None = None
    total_revenue: float | None = None
    total_users: int | None = None
    active_integrations: int | None = None
    future_credits_issued_count: int | None = None
    future_credits_total_value: float | None = None
    leaderboard: list[LeaderboardEntry] | None = None
