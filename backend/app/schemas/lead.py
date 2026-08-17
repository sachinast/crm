import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.domain.masking import mask_email, mask_phone
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
    email: str
    service_type: ServiceType | None
    status: BookingStatus
    agent_id: uuid.UUID
    is_duplicate: bool
    duplicate_of_id: uuid.UUID | None
    duplicate_override_reason: str | None
    created_at: datetime
    updated_at: datetime

    # PRD §9.1 "masked by default in every view" — raw values only ever leave
    # the API via POST /leads/{id}/reveal, which logs the access (§9.2).
    # `email`/`phone` are plain `str` here (not EmailStr) since the masked
    # form ("exa***@mail.com") isn't guaranteed to validate as a real address.
    @model_validator(mode="after")
    def _mask_pii(self) -> "LeadRead":
        self.email = mask_email(self.email)
        self.phone = mask_phone(self.phone)
        return self


class LeadSummary(BaseModel):
    """Slim shape used for duplicate-check candidates — enough for an agent to
    recognize a match without pulling the full lead record. Masked for the
    same reason as LeadRead; an agent unsure whether it's a real match can
    open the candidate and reveal there."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    phone: str
    email: str
    status: BookingStatus
    created_at: datetime

    @model_validator(mode="after")
    def _mask_pii(self) -> "LeadSummary":
        self.email = mask_email(self.email)
        self.phone = mask_phone(self.phone)
        return self


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


class StatusUpdate(BaseModel):
    """PATCH /leads/{id}/status — TECHNICAL_SPEC.md §3.2. Validated against the
    status_machine transition table, not just any enum value."""

    new_status: BookingStatus


class AvailableTransition(BaseModel):
    """One row of GET /leads/{id}/available-transitions — drives the status
    action buttons on the frontend without duplicating the transition graph
    or the role rules there."""

    model_config = ConfigDict(from_attributes=True)

    status: BookingStatus
    label: str
    ui_color: str


class StatusHistoryEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    from_status: BookingStatus | None
    to_status: BookingStatus
    changed_by: uuid.UUID
    changed_at: datetime
