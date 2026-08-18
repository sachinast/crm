import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

EntityType = Literal["lead", "car_booking", "hotel_booking", "flight_booking"]
FieldType = Literal["text", "number", "date", "select", "checkbox"]


class CustomFieldDefinitionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    entity_type: str
    key: str
    label: str
    field_type: str
    options: list[str] | None
    is_required: bool
    display_order: int
    created_at: datetime


class CustomFieldDefinitionCreate(BaseModel):
    entity_type: EntityType
    key: str = Field(min_length=1, pattern=r"^[a-z][a-z0-9_]*$")
    label: str = Field(min_length=1)
    field_type: FieldType
    options: list[str] | None = None
    is_required: bool = False
    display_order: int = 0


class CustomFieldDefinitionUpdate(BaseModel):
    label: str | None = None
    options: list[str] | None = None
    is_required: bool | None = None
    display_order: int | None = None
