"""Booking-module schemas — PRD §5 (Car Rental / Hotel / Flight field lists).

total_amount is never accepted from the client — it's a DB-generated column
(prepaid_amount + pay_at_counter_amount, TECHNICAL_SPEC.md §2.4) and only ever
appears on the *Read schemas.
"""
import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import TransmissionType, VehicleType

# --- Car ---------------------------------------------------------------


class CarBookingCreate(BaseModel):
    booking_reference: str = Field(min_length=1)
    booking_platform: str = Field(min_length=1)
    car_provider: str = Field(min_length=1)
    renter_name: str = Field(min_length=1)
    renter_dob: date
    transmission: TransmissionType
    fuel_policy: str | None = None
    vehicle_type: VehicleType
    pickup_datetime: datetime
    pickup_location: str = Field(min_length=1)
    return_datetime: datetime
    return_location: str = Field(min_length=1)
    prepaid_amount: float = Field(default=0, ge=0)
    pay_at_counter_amount: float = Field(default=0, ge=0)
    # Admin-defined extra fields (migration 0010) — validated against
    # custom_field_definitions by app/domain/custom_fields.py.
    custom_fields: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _return_after_pickup(self) -> "CarBookingCreate":
        if self.return_datetime <= self.pickup_datetime:
            raise ValueError("return_datetime must be after pickup_datetime")
        return self


class CarBookingUpdate(BaseModel):
    booking_reference: str | None = None
    booking_platform: str | None = None
    car_provider: str | None = None
    renter_name: str | None = None
    renter_dob: date | None = None
    transmission: TransmissionType | None = None
    fuel_policy: str | None = None
    vehicle_type: VehicleType | None = None
    pickup_datetime: datetime | None = None
    pickup_location: str | None = None
    return_datetime: datetime | None = None
    return_location: str | None = None
    prepaid_amount: float | None = Field(default=None, ge=0)
    pay_at_counter_amount: float | None = Field(default=None, ge=0)
    custom_fields: dict[str, Any] | None = None


class CarBookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lead_id: uuid.UUID
    booking_reference: str
    booking_platform: str
    car_provider: str
    renter_name: str
    renter_dob: date
    transmission: TransmissionType
    fuel_policy: str | None
    vehicle_type: VehicleType
    pickup_datetime: datetime
    pickup_location: str
    return_datetime: datetime
    return_location: str
    prepaid_amount: float
    pay_at_counter_amount: float
    total_amount: float
    custom_fields: dict[str, Any]
    created_at: datetime
    updated_at: datetime


# --- Hotel ---------------------------------------------------------------


class HotelBookingCreate(BaseModel):
    booking_reference: str = Field(min_length=1)
    booking_platform: str = Field(min_length=1)
    hotel_name: str = Field(min_length=1)
    room_type: str = Field(min_length=1)
    location: str = Field(min_length=1)
    check_in_date: date
    check_out_date: date
    prepaid_amount: float = Field(default=0, ge=0)
    pay_at_counter_amount: float = Field(default=0, ge=0)
    custom_fields: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _checkout_after_checkin(self) -> "HotelBookingCreate":
        # Also enforced at the DB layer (ck_hotel_dates) — checked here too so
        # the client gets a clean 422 instead of a raw IntegrityError.
        if self.check_out_date <= self.check_in_date:
            raise ValueError("check_out_date must be after check_in_date")
        return self


class HotelBookingUpdate(BaseModel):
    booking_reference: str | None = None
    booking_platform: str | None = None
    hotel_name: str | None = None
    room_type: str | None = None
    location: str | None = None
    check_in_date: date | None = None
    check_out_date: date | None = None
    prepaid_amount: float | None = Field(default=None, ge=0)
    pay_at_counter_amount: float | None = Field(default=None, ge=0)
    custom_fields: dict[str, Any] | None = None


class HotelBookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lead_id: uuid.UUID
    booking_reference: str
    booking_platform: str
    hotel_name: str
    room_type: str
    location: str
    check_in_date: date
    check_out_date: date
    prepaid_amount: float
    pay_at_counter_amount: float
    total_amount: float
    custom_fields: dict[str, Any]
    created_at: datetime
    updated_at: datetime


# --- Flight ---------------------------------------------------------------


class FlightBookingCreate(BaseModel):
    booking_reference: str = Field(min_length=1)
    pnr: str = Field(min_length=1)
    airline: str = Field(min_length=1)
    flight_numbers: list[str] = Field(min_length=1)
    origin: str = Field(min_length=1)
    destination: str = Field(min_length=1)
    cabin_class: str = Field(min_length=1)
    prepaid_amount: float = Field(default=0, ge=0)
    pay_at_counter_amount: float = Field(default=0, ge=0)
    custom_fields: dict[str, Any] = Field(default_factory=dict)


class FlightBookingUpdate(BaseModel):
    booking_reference: str | None = None
    pnr: str | None = None
    airline: str | None = None
    flight_numbers: list[str] | None = Field(default=None, min_length=1)
    origin: str | None = None
    destination: str | None = None
    cabin_class: str | None = None
    prepaid_amount: float | None = Field(default=None, ge=0)
    pay_at_counter_amount: float | None = Field(default=None, ge=0)
    custom_fields: dict[str, Any] | None = None


class FlightBookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lead_id: uuid.UUID
    booking_reference: str
    pnr: str
    airline: str
    flight_numbers: list[str]
    origin: str
    destination: str
    cabin_class: str
    prepaid_amount: float
    pay_at_counter_amount: float
    total_amount: float
    custom_fields: dict[str, Any]
    created_at: datetime
    updated_at: datetime
