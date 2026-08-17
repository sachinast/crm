"""Booking modifications — PRD §7.1 "Original vs. Revised". Captured as a
paired snapshot for audit purposes; applying the revised value to the live
booking row is a separate step (staff calls the existing
PATCH /leads/{id}/{car,hotel,flight}-booking for that) — this endpoint's job
is only the audit trail + the dollar impact, matching "captured as a paired
snapshot" rather than folding change-application logic in here too.
"""
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ModificationCreate(BaseModel):
    field_name: str = Field(min_length=1, description="e.g. pickup_datetime, room_type, vehicle_type")
    original_value: Any
    revised_value: Any
    # Required for non-monetary fields (the system can't infer a $ impact from
    # e.g. a location change) — auto-computed instead when both values are
    # numeric (PRD §7.1 "the system automatically compares... to calculate
    # any Modification Amount"). Defaults to 0 when omitted and not inferable.
    modification_amount: float | None = None


class ModificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lead_id: uuid.UUID
    field_name: str
    original_value: Any
    revised_value: Any
    modification_amount: float
    modified_by: uuid.UUID
    created_at: datetime
