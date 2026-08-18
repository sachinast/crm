import uuid

from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import ENUM as PGEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import BookingStatus

booking_status_enum = PGEnum(BookingStatus, name="booking_status", create_type=False)


class StatusLookup(Base):
    """Reference/config table driving the status state machine (TECHNICAL_SPEC.md §3).

    set_by_roles/notifies_roles (ARRAY(user_role) columns) lived here from
    Phase 0 but were unused scaffolding — status_machine.py's TRANSITIONS
    dict was what's actually live. Migration 0006 dropped them along with the
    user_role enum; migration 0007 replaced them properly with the
    StatusRolePermission join table below.
    """

    __tablename__ = "status_lookup"

    status: Mapped[BookingStatus] = mapped_column(booking_status_enum, primary_key=True)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    ui_color: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)


class StatusRolePermission(Base):
    """Which roles may SET a status, get NOTIFIED on it, or find it currently
    RELEVANT to their visibility — the DB-backed replacement for
    status_machine.py's old TRANSITIONS role-gating + the ROLE_RELEVANT_STATUSES
    dict (migration 0007). See app/domain/status_permissions.py for the
    query helpers built on this table, and that migration's docstring for the
    zero-behavior-change seed this table started with.
    """

    __tablename__ = "status_role_permissions"

    status: Mapped[BookingStatus] = mapped_column(
        booking_status_enum, ForeignKey("status_lookup.status", ondelete="CASCADE"), primary_key=True
    )
    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True
    )
    # 'set_by' | 'notifies' | 'relevant' — CHECK-constrained at the DB level
    # (migration 0007), not repeated here as a Python enum since it's an
    # internal storage discriminator, not a user-facing concept.
    kind: Mapped[str] = mapped_column(Text, primary_key=True)
