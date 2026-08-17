from sqlalchemy import ARRAY, Integer, Text
from sqlalchemy.dialects.postgresql import ENUM as PGEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import BookingStatus, UserRole

booking_status_enum = PGEnum(BookingStatus, name="booking_status", create_type=False)
user_role_enum = PGEnum(UserRole, name="user_role", create_type=False)


class StatusLookup(Base):
    """Reference/config table driving the status state machine (TECHNICAL_SPEC.md §3)."""

    __tablename__ = "status_lookup"

    status: Mapped[BookingStatus] = mapped_column(booking_status_enum, primary_key=True)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    ui_color: Mapped[str] = mapped_column(Text, nullable=False)
    set_by_roles: Mapped[list[UserRole]] = mapped_column(ARRAY(user_role_enum), nullable=False)
    notifies_roles: Mapped[list[UserRole]] = mapped_column(ARRAY(user_role_enum), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)
