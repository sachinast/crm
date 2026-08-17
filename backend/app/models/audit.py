import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, Text, func
from sqlalchemy.dialects.postgresql import ENUM as PGEnum, INET, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import BookingStatus, PiiField, SyncStatus, UserRole
from app.models.mixins import UUIDPKMixin

booking_status_enum = PGEnum(BookingStatus, name="booking_status", create_type=False)
pii_field_enum = PGEnum(PiiField, name="pii_field", create_type=False)
sync_status_enum = PGEnum(SyncStatus, name="sync_status", create_type=False)
user_role_enum = PGEnum(UserRole, name="user_role", create_type=False)


class StatusHistory(UUIDPKMixin, Base):
    __tablename__ = "status_history"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False
    )
    from_status: Mapped[BookingStatus | None] = mapped_column(booking_status_enum)
    to_status: Mapped[BookingStatus] = mapped_column(booking_status_enum, nullable=False)
    changed_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("idx_status_history_lead", "lead_id"),)


class Notification(UUIDPKMixin, Base):
    __tablename__ = "notifications"

    lead_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"))
    recipient_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    recipient_role: Mapped[UserRole | None] = mapped_column(user_role_enum)
    type: Mapped[str] = mapped_column(Text, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("idx_notifications_recipient", "recipient_user_id", "is_read"),)


class AccessNotificationLog(UUIDPKMixin, Base):
    __tablename__ = "access_notification_log"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False
    )
    opened_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("idx_access_log_lead", "lead_id"),)


class PiiRevealAuditLog(UUIDPKMixin, Base):
    __tablename__ = "pii_reveal_audit_log"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    field_revealed: Mapped[PiiField] = mapped_column(pii_field_enum, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    ip_address: Mapped[str] = mapped_column(INET, nullable=False)
    user_agent: Mapped[str] = mapped_column(Text, nullable=False)
    revealed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("idx_pii_log_lead", "lead_id"),)


class BookingProcessLog(UUIDPKMixin, Base):
    """Admin-only, insert-only master lifecycle log ('Log Report of Booking Process').

    The application DB role should have UPDATE/DELETE revoked on this table —
    see docs/TECHNICAL_SPEC.md §8 and the Alembic migration that grants privileges.
    """

    __tablename__ = "booking_process_log"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False
    )
    actor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    field_changed: Mapped[str | None] = mapped_column(Text)
    old_value: Mapped[dict | None] = mapped_column(JSONB)
    new_value: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("idx_process_log_lead", "lead_id"),)


class GoogleSheetsSyncStatus(UUIDPKMixin, Base):
    __tablename__ = "google_sheets_sync_status"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False
    )
    table_name: Mapped[str] = mapped_column(Text, nullable=False, default="leads")
    status: Mapped[SyncStatus] = mapped_column(sync_status_enum, nullable=False, default=SyncStatus.pending)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_error: Mapped[str | None] = mapped_column(Text)
    synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("idx_sheets_sync_status", "status"),)
