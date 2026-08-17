"""Billing charge/decline — TECHNICAL_SPEC.md §5 "POST /payments", §8 security
note: never a raw PAN, only a last-4 for display and a token from whatever
PCI-compliant processor/vault this eventually integrates (Stripe, Braintree,
...) — card_token is opaque to this API either way.
"""
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class PaymentCreate(BaseModel):
    lead_id: uuid.UUID
    outcome: Literal["charged", "declined"]
    card_last_four: str | None = Field(default=None, min_length=4, max_length=4)
    card_token: str | None = None


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lead_id: uuid.UUID
    prepaid_amount: float
    pay_at_counter_amount: float
    total_amount: float
    card_last_four: str | None
    outcome: str
    processed_by: uuid.UUID | None
    processed_at: datetime | None
    created_at: datetime
