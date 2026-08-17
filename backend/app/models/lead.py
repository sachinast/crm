import uuid

from sqlalchemy import Boolean, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import CITEXT, ENUM as PGEnum, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import BookingStatus, ServiceType
from app.models.mixins import TimestampMixin, UUIDPKMixin

service_type_enum = PGEnum(ServiceType, name="service_type", create_type=False)
booking_status_enum = PGEnum(BookingStatus, name="booking_status", create_type=False)


class Lead(UUIDPKMixin, TimestampMixin, Base):
    """Central CRM record (crm_id referenced elsewhere in the spec)."""

    __tablename__ = "leads"

    name: Mapped[str] = mapped_column(Text, nullable=False)
    phone: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(CITEXT, nullable=False)
    service_type: Mapped[ServiceType | None] = mapped_column(service_type_enum)
    status: Mapped[BookingStatus] = mapped_column(
        booking_status_enum, nullable=False, default=BookingStatus.authorization_pending
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_duplicate: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    duplicate_of_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("leads.id"))
    duplicate_override_reason: Mapped[str | None] = mapped_column(Text)
    # Where this lead came from — NULL for normal in-app agent intake; set to
    # the originating integration's label for leads created via POST
    # /leads/capture (TECHNICAL_SPEC.md §10.3). Phase 8.
    source: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        Index("idx_leads_agent_id", "agent_id"),
        Index("idx_leads_status", "status"),
        Index("idx_leads_email", "email"),
        Index("idx_leads_phone", "phone"),
        Index("idx_leads_name_trgm", "name", postgresql_using="gin", postgresql_ops={"name": "gin_trgm_ops"}),
    )


class LeadAccessGrant(UUIDPKMixin, Base):
    """Persisted ad-hoc access grants (Super Admin -> specific user/record), per PRD §3.2."""

    __tablename__ = "lead_access_grants"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    granted_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    __table_args__ = (Index("idx_lead_access_grants_lead", "lead_id"),)
