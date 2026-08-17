"""External integrations — TECHNICAL_SPEC.md §10.3 (Zapier/Make/any other
API or form that can send a webhook)."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, description='e.g. "Zapier — Website Contact Form"')
    assigned_agent_id: uuid.UUID = Field(description="Leads captured with this key are owned by this user")


class ApiKeyCreated(BaseModel):
    """Returned exactly once, at creation — the raw key is never retrievable
    again (same convention as GitHub/Stripe API tokens)."""

    id: uuid.UUID
    name: str
    api_key: str
    key_prefix: str
    assigned_agent_id: uuid.UUID
    created_at: datetime


class ApiKeyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    key_prefix: str
    assigned_agent_id: uuid.UUID
    created_by: uuid.UUID
    is_active: bool
    last_used_at: datetime | None
    created_at: datetime


class ApiKeyUpdate(BaseModel):
    is_active: bool


class LeadCaptureRequest(BaseModel):
    """The fixed contract external tools map their own fields onto —
    TECHNICAL_SPEC.md §10.3: "a standardized mapping layer exposes a unified
    capture endpoint... new integrations can be added without a rewrite"
    because they're the ones doing the mapping (in Zapier's/Make's own field-
    mapping UI), not this API."""

    name: str = Field(min_length=1)
    phone: str = Field(min_length=1)
    email: EmailStr
    source: str | None = Field(default=None, description='Overrides the key\'s name as the lead\'s "source" label')
    notes: str | None = Field(default=None, description="Freeform context from the originating form, if any")


class LeadCaptureResponse(BaseModel):
    """Deliberately slimmer than LeadRead — external callers get a stable
    confirmation shape decoupled from however the internal lead schema
    evolves, not the full masked record."""

    lead_id: uuid.UUID
    status: str
    is_duplicate: bool
