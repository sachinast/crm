import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

FieldKey = Literal[
    "booking_platform", "booking_source", "transaction_type", "booking_status",
    "call_type", "main_category", "room_type", "lead_tag", "leads_booking_source",
    "priority", "title", "class_of_service", "airline", "cabin_class", "hotel_name",
    "car_provider", "vehicle_type", "transmission", "fuel_policy",
    "add_on_services", "hk_gk", "currency", "mco_charges", "insurance_coverage",
    "flight_ancillaries",
] | str


class MasterOptionRead(BaseModel):
    id: uuid.UUID
    field_key: str
    value: str
    option_type: str = "master"
    display_order: int
    created_at: datetime | None = None


class MasterOptionCreate(BaseModel):
    field_key: str = Field(min_length=1)
    value: str = Field(min_length=1)
    option_type: str = "master"
    display_order: int = 0
