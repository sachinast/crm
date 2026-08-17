import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import CITEXT, ENUM as PGEnum, INET, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import UserRole
from app.models.mixins import TimestampMixin, UUIDPKMixin

user_role_enum = PGEnum(UserRole, name="user_role", create_type=False)


class User(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(CITEXT, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[UserRole] = mapped_column(user_role_enum, nullable=False)
    ip_whitelist_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    whitelisted_ips: Mapped[list["UserWhitelistedIP"]] = relationship(back_populates="user")


class UserWhitelistedIP(UUIDPKMixin, Base):
    __tablename__ = "user_whitelisted_ips"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    ip_address: Mapped[str] = mapped_column(INET, nullable=False)
    label: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="whitelisted_ips")

    __table_args__ = (UniqueConstraint("user_id", "ip_address", name="uq_user_ip"),)


class SystemSettings(Base):
    """Single-row config table (Super Admin registration toggle)."""

    __tablename__ = "system_settings"

    id: Mapped[bool] = mapped_column(Boolean, primary_key=True, default=True)
    registration_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # SET NULL (not the default RESTRICT) — this is a "who last touched this config"
    # pointer on a single mutable row, not an audit-log entry, so it shouldn't block
    # deleting the referenced user. Contrast with booking_process_log/status_history/
    # pii_reveal_audit_log, which stay RESTRICT by design (§9.3 "immutable audit trail").
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
