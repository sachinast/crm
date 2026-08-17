import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import BookingStatus, ServiceType


class LeadCreate(BaseModel):
    """PRD §4.1 Step 1 — the single entry point into the CRM."""

    name: str = Field(min_length=1)
    phone: str = Field(min_length=1)
    email: EmailStr


class LeadRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    phone: str
    email: EmailStr
    service_type: ServiceType | None
    status: BookingStatus
    agent_id: uuid.UUID
    is_duplicate: bool
    duplicate_of_id: uuid.UUID | None
    duplicate_override_reason: str | None
    created_at: datetime
    updated_at: datetime

    # NOTE: email/phone are NOT masked yet — click-to-reveal masking is Phase 7
    # (TECHNICAL_SPEC.md §10). Raw values are intentionally still visible here.


class LeadSummary(BaseModel):
    """Slim shape used for duplicate-check candidates — enough for an agent to
    recognize a match without pulling the full lead record."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    phone: str
    email: EmailStr
    status: BookingStatus
    created_at: datetime


class DuplicateCheckResult(BaseModel):
    is_duplicate: bool
    candidates: list[LeadSummary]


class LeadConfirm(BaseModel):
    """PRD §4.1 Step 3 — the agent's explicit "yes, proceed anyway"."""

    reason: str = Field(min_length=1, description="Why the agent is proceeding despite the match")


class ServiceTypeUpdate(BaseModel):
    """PRD §4.1 Step 4 — unlocks the service-specific booking form."""

    service_type: ServiceType


class LeadListFilters(BaseModel):
    """Query params for GET /leads — TECHNICAL_SPEC.md §5 "Date, Email, Mobile"."""

    status: BookingStatus | None = None
    service_type: ServiceType | None = None
    date_from: date | None = None
    date_to: date | None = None
    email: str | None = None
    mobile: str | None = None
