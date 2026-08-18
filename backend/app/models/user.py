import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import CITEXT, INET, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPKMixin
from app.models.rbac import Role


class User(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(CITEXT, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("roles.id"), nullable=False)
    ip_whitelist_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    # Always eager-load this (see deps.get_current_user) — every permission
    # check reads role.permissions, which would otherwise be a sync lazy-load
    # in an async context. foreign_keys is explicit because users<->roles has
    # a second FK path the other direction (roles.created_by -> users.id,
    # "who created this custom role"), which SQLAlchemy can't disambiguate
    # for this relationship on its own.
    role: Mapped[Role] = relationship(foreign_keys=[role_id])
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


# SystemSettings (single-row registration_enabled toggle) removed in migration
# 0009 — replaced by the generic app_settings key-value store
# (app/models/settings.py), which migrated its one real value forward.
