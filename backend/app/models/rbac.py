"""Roles & permissions — data-driven replacement for the old `user_role`
Postgres enum, so an admin can create new roles and grant them permission
combinations at runtime (Master Admin feature). See migration 0006 and
app/domain/permissions.py for the canonical permission catalog.
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Table, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDPKMixin

# Pure many-to-many join table, no extra columns — a plain Table (not a
# mapped class) is the standard SQLAlchemy shape for relationship(secondary=...).
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", UUID(as_uuid=True), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)


class Permission(UUIDPKMixin, Base):
    __tablename__ = "permissions"

    code: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Role(UUIDPKMixin, Base):
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    # The 10 original roles — protected from deletion/rename in the admin UI
    # (app/api/v1/admin_roles.py). Only custom roles created via that UI can
    # be freely edited/deleted.
    is_system_role: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    permissions: Mapped[list["Permission"]] = relationship(secondary=role_permissions)

    def has_permission(self, *codes: str) -> bool:
        """True if this role has ANY of the given permission codes — same
        "any of these" semantics require_role(*roles) had. Requires
        `permissions` to already be eager-loaded (see deps.get_current_user);
        touching this on a lazy-loaded role in an async context would raise,
        by design (a silent implicit lazy-load here is exactly the kind of
        bug that MissingGreenlet-in-production looks like).
        """
        code_set = {p.code for p in self.permissions}
        return any(c in code_set for c in codes)
