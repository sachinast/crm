import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import AttachmentKind

MessageStatus = Literal["sent", "delivered", "read"]


class UserSearchResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    role: str

    @field_validator("role", mode="before")
    @classmethod
    def _role_name(cls, v: object) -> object:
        return v.name if hasattr(v, "name") else v


class ParticipantRead(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: str


class AttachmentRead(BaseModel):
    id: uuid.UUID
    file_name: str
    content_type: str
    kind: AttachmentKind
    size_bytes: int


class MentionRead(BaseModel):
    user_id: uuid.UUID
    name: str


class ConversationCreate(BaseModel):
    # 1 id -> 1:1 conversation (idempotent: returns the existing one if it's
    # already there); 2+ -> always creates a new group conversation.
    participant_user_ids: list[uuid.UUID] = Field(min_length=1)
    name: str | None = None


class ConversationRead(BaseModel):
    id: uuid.UUID
    is_group: bool
    name: str | None
    participants: list[ParticipantRead]
    created_at: datetime
    last_message: "MessageRead | None" = None
    unread_count: int = 0


class MessageCreate(BaseModel):
    body: str | None = None
    mentioned_user_ids: list[uuid.UUID] = []
    attachment_ids: list[uuid.UUID] = []
    is_quick_response: bool = False


class MessageRead(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: str
    body: str | None
    is_quick_response: bool
    mentions: list[MentionRead]
    attachments: list[AttachmentRead]
    created_at: datetime
    status: MessageStatus


ConversationRead.model_rebuild()
