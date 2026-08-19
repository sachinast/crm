from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field


class EmbedSubmitRequest(BaseModel):
    """The fixed contract app/static/embed-widget.js's fetch() posts —
    contact fields common to all three tabs, plus a service_type discriminator
    and a free-form `details` bag for whatever that tab's search-intent
    fields were (route/dates for flights, city/dates for hotels, etc.) —
    stored verbatim in leads.embed_submission for the agent to read, not
    validated field-by-field the way custom_fields is (this isn't an
    admin-defined schema, it's a fixed widget only this codebase controls).
    """

    name: str = Field(min_length=1, max_length=200)
    phone: str = Field(min_length=1, max_length=32)
    email: EmailStr
    service_type: Literal["car", "hotel", "flight"]
    landing_page_url: str | None = Field(default=None, max_length=2048)
    # Best-effort, self-reported by the widget's WebRTC probe — modern
    # browsers increasingly return an mDNS hostname instead of a real local
    # IP (see app/static/embed-widget.js), so this is stored as-is, whatever
    # the browser handed back.
    visitor_local_ip: str | None = Field(default=None, max_length=64)
    details: dict[str, Any] = Field(default_factory=dict)
