import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, LargeBinary, Text, func
from sqlalchemy.dialects.postgresql import INET, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import UUIDPKMixin


class UploadedFile(UUIDPKMixin, Base):
    """File Manager — migration 0013. Bytes stored directly in Postgres
    (same tradeoff as messaging attachments, app/models/messaging.py), capped
    by the app_settings key "files.max_file_size_mb". Visibility: the
    uploader always sees their own; files.view_all (Super Admin by default)
    sees everyone's — enforced in app/api/v1/files.py, not here.
    """

    __tablename__ = "files"

    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    file_name: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str] = mapped_column(Text, nullable=False)
    # 'image' | 'pdf' | 'ppt' | 'video' | 'audio' — see app/domain/file_kinds.py
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FileShareLink(UUIDPKMixin, Base):
    """A shareable, unauthenticated link to one file — GET /s/{token} (view,
    logs a 'view' FileShareEvent) and GET /s/{token}/download (logs 'click').
    """

    __tablename__ = "file_share_links"

    file_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("files.id", ondelete="CASCADE"), nullable=False
    )
    token: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FileShareEvent(UUIDPKMixin, Base):
    """One row per open ('view') or download ('click') of a share link — how
    "how many people opened and clicked on it" is tracked."""

    __tablename__ = "file_share_events"

    share_link_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("file_share_links.id", ondelete="CASCADE"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    ip_address: Mapped[str | None] = mapped_column(INET)
    user_agent: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
