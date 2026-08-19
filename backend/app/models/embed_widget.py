"""Embeddable booking widgets (migration 0014) — the <script> snippet an
admin generates to drop a MakeMyTrip-styled lead capture form onto any
external landing page. See app/api/v1/embed_public.py for the public
submit endpoint this key authorizes, and app/static/embed-widget.js for the
actual injected form.
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import UUIDPKMixin


class EmbedWidget(UUIDPKMixin, Base):
    __tablename__ = "embed_widgets"

    name: Mapped[str] = mapped_column(Text, nullable=False)  # e.g. "Homepage booking widget"
    # Unlike ApiKey's hashed secret, this is meant to sit in plaintext HTML on
    # a public website (view-source shows it to anyone) — it authorizes lead
    # *submission* only, nothing readable, so no hashing is needed.
    widget_key: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    assigned_agent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    submission_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
