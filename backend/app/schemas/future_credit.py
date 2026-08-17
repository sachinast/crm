"""Future credits — PRD §7.3. Creation restricted to TL/CS; a broader set of
departments get read-only access once issued.
"""
import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class FutureCreditCreate(BaseModel):
    source_lead_id: uuid.UUID
    voucher_amount: float = Field(gt=0)
    number_of_vouchers: int = Field(default=1, ge=1)
    validity_date: date


class FutureCreditRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    source_lead_id: uuid.UUID
    voucher_amount: float
    number_of_vouchers: int
    validity_date: date
    created_by: uuid.UUID
    created_at: datetime
