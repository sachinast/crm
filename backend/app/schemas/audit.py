"""PII reveal, booking process log, and access log — TECHNICAL_SPEC.md §9,
PRD §9.1-§9.3.
"""
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import PiiField


class RevealRequest(BaseModel):
    """PRD §9.1 "Click-to-Reveal" / §9.2 "the agent-provided reason for
    access" — the reason is mandatory, not decorative; it's what shows up in
    the audit log an Admin reviews."""

    field: PiiField
    reason: str = Field(min_length=1)


class RevealResult(BaseModel):
    field: PiiField
    value: str


class PiiRevealLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lead_id: uuid.UUID
    agent_id: uuid.UUID
    field_revealed: PiiField
    reason: str
    ip_address: str
    user_agent: str
    revealed_at: datetime

    @field_validator("ip_address", mode="before")
    @classmethod
    def _stringify_ip(cls, value: object) -> str:
        # asyncpg maps INET columns to ipaddress.IPv4Address/IPv6Address, not
        # str — Pydantic doesn't coerce that automatically for a `str` field.
        return str(value)


class ProcessLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lead_id: uuid.UUID
    actor_id: uuid.UUID
    action: str
    field_changed: str | None
    old_value: Any
    new_value: Any
    created_at: datetime


class AccessLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lead_id: uuid.UUID
    opened_by: uuid.UUID
    opened_at: datetime
