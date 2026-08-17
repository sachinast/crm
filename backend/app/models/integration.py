"""External integration credentials — TECHNICAL_SPEC.md §10.3's "standardized
mapping layer" for external booking engines, website forms, or third-party
provider APIs. In practice, tools like Zapier/Make are the mapping layer —
they translate an arbitrary external form/API into this endpoint's fixed
contract; this table just holds the credentials that let them call it.
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import UUIDPKMixin


class ApiKey(UUIDPKMixin, Base):
    __tablename__ = "api_keys"

    name: Mapped[str] = mapped_column(Text, nullable=False)  # e.g. "Zapier — Website Contact Form"
    # Enough of the key to show/identify it in the UI without ever storing or
    # re-displaying the full secret (same convention as GitHub/Stripe tokens).
    key_prefix: Mapped[str] = mapped_column(Text, nullable=False)
    key_hash: Mapped[str] = mapped_column(Text, nullable=False)
    # Leads captured through this key are attributed to this user, the same
    # way every other lead has an owning agent — see app/api/v1/integrations.py.
    assigned_agent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("idx_api_keys_prefix", "key_prefix"),)
