import uuid
from datetime import datetime

from pydantic import BaseModel


class FileRead(BaseModel):
    id: uuid.UUID
    uploaded_by: uuid.UUID
    uploader_name: str | None = None
    file_name: str
    content_type: str
    kind: str
    size_bytes: int
    created_at: datetime


class ShareLinkRead(BaseModel):
    id: uuid.UUID
    file_id: uuid.UUID
    token: str
    is_active: bool
    created_at: datetime
    view_count: int
    click_count: int
