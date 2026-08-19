"""Role-aware dashboard summary — a glimpse of the data each role actually
has permission to see, not a separate "admin dashboard" bolted on top. Every
figure here is computed the same way the rest of the API already enforces
visibility (apply_lead_visibility) or role gates — this endpoint doesn't
introduce a new access model, just aggregates what the caller could already
see one record at a time.
"""
import uuid

from pydantic import BaseModel

from app.schemas.lead import LeadSummary


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
