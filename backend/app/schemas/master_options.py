import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

FieldKey = Literal[
    "booking_platform", "airline", "cabin_class", "hotel_name", "room_type",
    "car_provider", "vehicle_type", "transmission",
]


class MasterOptionRead(BaseModel):
    id: uuid.UUID
    field_key: str
    value: str
    display_order: int
    created_at: datetime


class MasterOptionCreate(BaseModel):
    field_key: FieldKey
    value: str = Field(min_length=1)
    display_order: int = 0
