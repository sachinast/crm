import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NoteCreate(BaseModel):
    title: str = Field(min_length=1)
    body: str = ""


class NoteUpdate(BaseModel):
    title: str | None = None
    body: str | None = None


class NoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    body: str
    created_at: datetime
    updated_at: datetime
