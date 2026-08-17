"""Cancellations — PRD §7.2. refund_amount/final_retained_amount are DB
GENERATED columns (GREATEST/LEAST over original_prepaid_amount and
cancellation_penalty_fee — see the 0001 migration), so the backend only ever
supplies the two inputs; Postgres does the "system calculates" part.
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CancellationCreate(BaseModel):
    cancellation_penalty_fee: float = Field(ge=0)


class CancellationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lead_id: uuid.UUID
    original_prepaid_amount: float
    cancellation_penalty_fee: float
    refund_amount: float
    final_retained_amount: float
    cancelled_by: uuid.UUID
    created_at: datetime
