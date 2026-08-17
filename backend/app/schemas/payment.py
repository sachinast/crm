"""Billing charge/decline — TECHNICAL_SPEC.md §5 "POST /payments", §8 security
note: never a raw PAN, only a last-4 for display and a token from whatever
PCI-compliant processor/vault this eventually integrates (Stripe, Braintree,
...) — card_token is opaque to this API either way.
"""
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.masking import mask_card


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
    # Populated straight from the ORM column, then immediately masked and
    # never serialized under this name — see _mask_card below. Kept as a
    # normal field (not excluded) so `from_attributes` can populate it; the
    # `exclude=True` is what actually keeps the raw last-4 out of the response.
    card_last_four: str | None = Field(default=None, exclude=True)
    # PRD §9.1: masked by default ("****-****-****-1234"). The raw last-4 is
    # already the least-sensitive part of what's stored (never a full PAN —
    # see the module docstring), but still goes through POST /leads/{id}/reveal
    # like email/phone, for one consistent audit trail across all three fields.
    card_display: str = ""
    outcome: str
    processed_by: uuid.UUID | None
    processed_at: datetime | None
    created_at: datetime

    @model_validator(mode="after")
    def _mask_card(self) -> "PaymentRead":
        self.card_display = mask_card(self.card_last_four)
        return self
