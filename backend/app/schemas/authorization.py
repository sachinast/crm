""""I Authorize" consent capture — PRD §8. This is the one customer-facing,
unauthenticated part of the API: no Bearer token, scoped by the lead's own
UUID acting as a capability link (TECHNICAL_SPEC.md §5 calls this out as
"public-ish, token-scoped"). That's a deliberate MVP tradeoff, not an
oversight — a production hardening pass (Phase 9) would swap in a dedicated,
expiring, single-use token instead of reusing the lead's primary key, since
lead IDs can end up in logs/referrers where a purpose-built token wouldn't.
"""
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.models.enums import BookingStatus, ServiceType


class AuthorizationSummary(BaseModel):
    """What the customer sees before authorizing — PRD §8.1 "always shown to
    the customer for full transparency"."""

    lead_id: uuid.UUID
    customer_name: str
    service_type: ServiceType
    status: BookingStatus
    booking: dict[str, Any]


class AuthorizationCreate(BaseModel):
    """Every checkbox in PRD §8.2's consent package — all required True. A
    customer who hasn't agreed to everything hasn't authorized anything."""

    cardholder_confirmed: bool
    prepaid_charge_ack: bool
    pay_at_counter_ack: bool
    booking_details_ack: bool
    terms_ack: bool
    non_refundable_ack: bool

    @model_validator(mode="after")
    def _all_must_be_true(self) -> "AuthorizationCreate":
        if not all(
            [
                self.cardholder_confirmed,
                self.prepaid_charge_ack,
                self.pay_at_counter_ack,
                self.booking_details_ack,
                self.terms_ack,
                self.non_refundable_ack,
            ]
        ):
            raise ValueError("All consent items must be acknowledged to authorize this booking")
        return self


class AuthorizationResult(BaseModel):
    lead_id: uuid.UUID
    status: BookingStatus
    authorized_at: datetime


class AuthorizationRecordRead(BaseModel):
    """Field-level record of what was actually captured — TECHNICAL_SPEC.md
    §11.1 Authorization_Records, used by the staff-facing read endpoint."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lead_id: uuid.UUID
    cardholder_confirmed: bool
    prepaid_charge_ack: bool
    pay_at_counter_ack: bool
    booking_details_ack: bool
    terms_ack: bool
    non_refundable_ack: bool
    consent_status: str
    customer_ip: str
    user_agent: str
    authorized_at: datetime

    @field_validator("customer_ip", mode="before")
    @classmethod
    def _stringify_ip(cls, value: object) -> str:
        # asyncpg maps INET columns to ipaddress.IPv4Address/IPv6Address, not str.
        return str(value)
