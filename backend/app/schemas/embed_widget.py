import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EmbedWidgetCreate(BaseModel):
    name: str = Field(min_length=1, description='e.g. "Homepage booking widget"')
    assigned_agent_id: uuid.UUID = Field(description="Leads captured through this widget are owned by this user")


class EmbedWidgetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    widget_key: str
    assigned_agent_id: uuid.UUID
    created_by: uuid.UUID
    is_active: bool
    submission_count: int
    created_at: datetime


class EmbedWidgetUpdate(BaseModel):
    is_active: bool
