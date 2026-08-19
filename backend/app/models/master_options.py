import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import UUIDPKMixin


class MasterFieldOption(UUIDPKMixin, Base):
    """Super Admin master data — dynamic dropdown options for booking fields
    (migration 0012). One table, keyed by `field_key` ("booking_platform",
    "airline", "cabin_class", "hotel_name", "room_type", "car_provider",
    "vehicle_type", "transmission"), instead of a fixed enum or free text
    per field. See app/api/v1/master_options.py for the CRUD/read API.
    """

    __tablename__ = "master_field_options"

    field_key: Mapped[str] = mapped_column(Text, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("field_key", "value", name="uq_master_option_field_value"),)
