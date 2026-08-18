import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import UUIDPKMixin


class CustomFieldDefinition(UUIDPKMixin, Base):
    """Admin-defined extra field on a Lead or booking (migration 0010). The
    actual submitted values live in that entity's own `custom_fields` JSONB
    column (app/models/lead.py, app/models/booking.py) — this table is only
    the schema: what fields exist, for which entity type, and how to render
    + validate them (see app/domain/custom_fields.py).
    """

    __tablename__ = "custom_field_definitions"

    # 'lead' | 'car_booking' | 'hotel_booking' | 'flight_booking' —
    # CHECK-constrained at the DB level (migration 0010).
    entity_type: Mapped[str] = mapped_column(Text, nullable=False)
    key: Mapped[str] = mapped_column(Text, nullable=False)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    # 'text' | 'number' | 'date' | 'select' | 'checkbox' — CHECK-constrained
    # at the DB level (migration 0010).
    field_type: Mapped[str] = mapped_column(Text, nullable=False)
    # Only meaningful for field_type='select' — the list of choices.
    options: Mapped[Any | None] = mapped_column(JSONB)
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("entity_type", "key", name="uq_custom_field_entity_key"),)
