"""In-app messaging — direct/group conversations between any registered users
(not lead-scoped, not role-gated: every active user can message every other
active user, PRD-independent of the booking-management RBAC model elsewhere
in this app).

Design notes (documented tradeoffs, same spirit as the WS ConnectionManager
note in api/v1/websocket.py):

- Attachments are stored as bytes directly in Postgres (`MessageAttachment.data`),
  not an object store (S3/R2/etc). This keeps the feature self-contained across
  every environment this app runs in (local/CI/Railway) with zero extra infra
  or credentials, at the cost of DB size — bounded by
  settings.messaging_max_file_size_mb per file. A move to real object storage
  is a drop-in swap of the attachment read/write path in api/v1/messaging.py,
  not a schema change (this table would become a pointer instead of a blob).

- "Delivered" is a best-effort signal (was at least one other participant's
  WebSocket connected at send time), not a guaranteed store-and-forward
  acknowledgement — consistent with the existing single-worker, in-memory
  ConnectionManager. "Read" is authoritative: it's
  `ConversationParticipant.last_read_at >= message.created_at`, computed at
  read time, not a per-message per-user row (keeps the read-state check O(1)
  instead of O(messages)).
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ENUM as PGEnum, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import AttachmentKind
from app.models.mixins import UUIDPKMixin

attachment_kind_enum = PGEnum(AttachmentKind, name="attachment_kind", create_type=False)


class Conversation(UUIDPKMixin, Base):
    __tablename__ = "conversations"

    is_group: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    name: Mapped[str | None] = mapped_column(Text)  # group display name; null for 1:1
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    participants: Mapped[list["ConversationParticipant"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan"
    )
    messages: Mapped[list["Message"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")


class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    last_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    conversation: Mapped["Conversation"] = relationship(back_populates="participants")

    __table_args__ = (Index("idx_conv_participants_user", "user_id"),)


class Message(UUIDPKMixin, Base):
    __tablename__ = "messages"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    body: Mapped[str | None] = mapped_column(Text)  # nullable: an attachment-only message is valid
    is_quick_response: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")
    attachments: Mapped[list["MessageAttachment"]] = relationship(
        back_populates="message", cascade="all, delete-orphan"
    )
    mentions: Mapped[list["MessageMention"]] = relationship(back_populates="message", cascade="all, delete-orphan")

    __table_args__ = (Index("idx_messages_conversation_created", "conversation_id", "created_at"),)


class MessageAttachment(UUIDPKMixin, Base):
    __tablename__ = "message_attachments"

    # Nullable + set on send: an attachment is uploaded first (so the composer
    # can show an upload/preview state before the message is actually sent),
    # then attached to a message_id at send time — see api/v1/messaging.py.
    message_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE")
    )
    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    file_name: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[AttachmentKind] = mapped_column(attachment_kind_enum, nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    message: Mapped["Message"] = relationship(back_populates="attachments")

    __table_args__ = (Index("idx_message_attachments_message", "message_id"),)


class MessageMention(UUIDPKMixin, Base):
    __tablename__ = "message_mentions"

    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False
    )
    mentioned_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    message: Mapped["Message"] = relationship(back_populates="mentions")

    __table_args__ = (
        UniqueConstraint("message_id", "mentioned_user_id", name="uq_message_mention"),
        Index("idx_message_mentions_user", "mentioned_user_id"),
    )
