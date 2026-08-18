import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Text, func
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import UUIDPKMixin


class ActivityLog(UUIDPKMixin, Base):
    """General-purpose, milestone-level activity log — Master Admin feature.
    See app/domain/activity_log.py for the write helper and the call sites
    that use it, and app/api/v1/admin_activity.py for the paginated read API.

    Deliberately separate from booking_process_log (lead-scoped, NOT NULL
    lead_id) rather than forcing account/admin-level events into that shape.
    """

    __tablename__ = "activity_log"

    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False)
    target_type: Mapped[str | None] = mapped_column(Text)
    target_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    # Named `extra` on the Python side — `metadata` is reserved on every
    # Declarative model (Base.metadata is the table registry); the DB column
    # itself is still named `metadata` (see migration 0008).
    extra: Mapped[dict | None] = mapped_column("metadata", JSONB)
    ip_address: Mapped[str | None] = mapped_column(INET)
    user_agent: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_activity_log_actor", "actor_id", "created_at"),
        Index("ix_activity_log_category", "category", "created_at"),
    )
