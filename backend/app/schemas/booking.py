"""Booking-module schemas — PRD §5 (Car Rental / Hotel / Flight field lists).

total_amount is never accepted from the client — it's a DB-generated column
(prepaid_amount + pay_at_counter_amount, TECHNICAL_SPEC.md §2.4) and only ever
appears on the *Read schemas.
"""
import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

# --- Car ---------------------------------------------------------------


class CarBookingCreate(BaseModel):
    booking_reference: str = Field(min_length=1)
    booking_platform: str = Field(min_length=1)
    car_provider: str = Field(min_length=1)
    renter_dob: date
    transmission: str = Field(min_length=1)
    fuel_policy: str | None = None
    vehicle_type: str = Field(min_length=1)
    pickup_datetime: datetime
    pickup_location: str = Field(min_length=1)
    return_datetime: datetime
    return_location: str = Field(min_length=1)
    prepaid_amount: float = Field(default=0, ge=0)
    pay_at_counter_amount: float = Field(default=0, ge=0)
    fuel_mileage: str | None = None
    booking_confirmation: str | None = None
    car_model: str | None = None
    driver_name: str | None = None
    driver_phone: str | None = None
    driver_license: str | None = None
    other_details: str | None = None
    remarks: str | None = None
    booking_source: str | None = None
    transaction_type: str | None = None
    transaction_status: str | None = None
    status: str | None = None
    card_holder_name: str | None = None
    card_number: str | None = None
    card_type: str | None = None
    billing_address: str | None = None
    cvv: str | None = None
    card_expiry: str | None = None
    charge_name: str | None = None
    company_amount: float | None = 0
    platform_amount: float | None = 0
    remarks_history: list[dict[str, Any]] | None = Field(default_factory=list)
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
    renter_dob: date | None = None
    transmission: str | None = None
    fuel_policy: str | None = None
    vehicle_type: str | None = None
    pickup_datetime: datetime | None = None
    pickup_location: str | None = None
    return_datetime: datetime | None = None
    return_location: str | None = None
    prepaid_amount: float | None = Field(default=None, ge=0)
    pay_at_counter_amount: float | None = Field(default=None, ge=0)
    fuel_mileage: str | None = None
    booking_confirmation: str | None = None
    car_model: str | None = None
    driver_name: str | None = None
    driver_phone: str | None = None
    driver_license: str | None = None
    other_details: str | None = None
    remarks: str | None = None
    booking_source: str | None = None
    transaction_type: str | None = None
    transaction_status: str | None = None
    status: str | None = None
    card_holder_name: str | None = None
    card_number: str | None = None
    card_type: str | None = None
    billing_address: str | None = None
    cvv: str | None = None
    card_expiry: str | None = None
    charge_name: str | None = None
    company_amount: float | None = None
    platform_amount: float | None = None
    remarks_history: list[dict[str, Any]] | None = None
    custom_fields: dict[str, Any] | None = None


class CarBookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lead_id: uuid.UUID
    booking_reference: str
    booking_platform: str
    car_provider: str
    renter_dob: date
    transmission: str
    fuel_policy: str | None
    vehicle_type: str
    pickup_datetime: datetime
    pickup_location: str
    return_datetime: datetime
    return_location: str
    prepaid_amount: float
    pay_at_counter_amount: float
    total_amount: float
    fuel_mileage: str | None = None
    booking_confirmation: str | None = None
    car_model: str | None = None
    driver_name: str | None = None
    driver_phone: str | None = None
    driver_license: str | None = None
    other_details: str | None = None
    remarks: str | None = None
    booking_source: str | None = None
    transaction_type: str | None = None
    transaction_status: str | None = None
    status: str | None = None
    card_holder_name: str | None = None
    card_number: str | None = None
    card_type: str | None = None
    billing_address: str | None = None
    cvv: str | None = None
    card_expiry: str | None = None
    charge_name: str | None = None
    company_amount: float | None = 0
    platform_amount: float | None = 0
    remarks_history: list[dict[str, Any]] | None = None
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
    call_type: str | None = None
    itinerary_number: str | None = None
    num_guests: int | None = 1
    num_rooms: int | None = 1
    bed_type: str | None = None
    primary_guest_name: str | None = None
    guest_email: str | None = None
    guest_phone: str | None = None
    attachment_url: str | None = None
    other_details: str | None = None
    remarks: str | None = None
    booking_source: str | None = None
    transaction_type: str | None = None
    transaction_status: str | None = None
    status: str | None = None
    card_holder_name: str | None = None
    card_number: str | None = None
    card_type: str | None = None
    billing_address: str | None = None
    cvv: str | None = None
    card_expiry: str | None = None
    charge_name: str | None = None
    company_amount: float | None = 0
    platform_amount: float | None = 0
    remarks_history: list[dict[str, Any]] | None = Field(default_factory=list)
    custom_fields: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _checkout_after_checkin(self) -> "HotelBookingCreate":
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
    call_type: str | None = None
    itinerary_number: str | None = None
    num_guests: int | None = None
    num_rooms: int | None = None
    bed_type: str | None = None
    primary_guest_name: str | None = None
    guest_email: str | None = None
    guest_phone: str | None = None
    attachment_url: str | None = None
    other_details: str | None = None
    remarks: str | None = None
    booking_source: str | None = None
    transaction_type: str | None = None
    transaction_status: str | None = None
    status: str | None = None
    card_holder_name: str | None = None
    card_number: str | None = None
    card_type: str | None = None
    billing_address: str | None = None
    cvv: str | None = None
    card_expiry: str | None = None
    charge_name: str | None = None
    company_amount: float | None = None
    platform_amount: float | None = None
    remarks_history: list[dict[str, Any]] | None = None
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
    call_type: str | None = None
    itinerary_number: str | None = None
    num_guests: int | None = 1
    num_rooms: int | None = 1
    bed_type: str | None = None
    primary_guest_name: str | None = None
    guest_email: str | None = None
    guest_phone: str | None = None
    attachment_url: str | None = None
    other_details: str | None = None
    remarks: str | None = None
    booking_source: str | None = None
    transaction_type: str | None = None
    transaction_status: str | None = None
    status: str | None = None
    card_holder_name: str | None = None
    card_number: str | None = None
    card_type: str | None = None
    billing_address: str | None = None
    cvv: str | None = None
    card_expiry: str | None = None
    charge_name: str | None = None
    company_amount: float | None = 0
    platform_amount: float | None = 0
    remarks_history: list[dict[str, Any]] | None = None
    custom_fields: dict[str, Any]
    created_at: datetime
    updated_at: datetime


# --- Flight ---------------------------------------------------------------


class FlightBookingCreate(BaseModel):
    booking_reference: str = Field(min_length=1)
    booking_platform: str = Field(min_length=1)
    pnr: str = Field(min_length=1)
    airline: str = Field(min_length=1)
    flight_numbers: list[str] = Field(min_length=1)
    origin: str = Field(min_length=1)
    destination: str = Field(min_length=1)
    cabin_class: str = Field(min_length=1)
    prepaid_amount: float = Field(default=0, ge=0)
    pay_at_counter_amount: float = Field(default=0, ge=0)
    main_category: str | None = None
    sub_category: str | None = None
    account_name: str | None = None
    booking_source_email: str | None = None
    source_text: str | None = None
    priority: str | None = None
    trip_type: str | None = "One Way"
    hk_gk: str | None = None
    currency: str | None = "$"
    ticket_cost: float | None = 0
    mco_charge: float | None = 0
    merchant_fee: float = Field(default=15, ge=0)
    cvv_fee: float = Field(default=0, ge=0)
    total_auth_amount: float | None = 0
    margin: float | None = 0
    attachment_url: str | None = None
    important: bool = False
    other_details: str | None = None
    remarks: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    passengers: list[dict[str, Any]] | None = Field(default_factory=list)
    special_notes: list[dict[str, Any]] | None = Field(default_factory=list)
    booking_source: str | None = None
    transaction_type: str | None = None
    transaction_status: str | None = None
    lead_tag: str | None = None
    leads_booking_source: str | None = None
    title: str | None = None
    class_of_service: str | None = None
    add_on_services: str | None = None
    status: str | None = None
    card_holder_name: str | None = None
    card_number: str | None = None
    card_type: str | None = None
    billing_address: str | None = None
    cvv: str | None = None
    card_expiry: str | None = None
    charge_name: str | None = None
    company_amount: float | None = 0
    platform_amount: float | None = 0
    remarks_history: list[dict[str, Any]] | None = Field(default_factory=list)
    custom_fields: dict[str, Any] = Field(default_factory=dict)


class FlightBookingUpdate(BaseModel):
    booking_reference: str | None = None
    booking_platform: str | None = None
    pnr: str | None = None
    airline: str | None = None
    flight_numbers: list[str] | None = Field(default=None, min_length=1)
    origin: str | None = None
    destination: str | None = None
    cabin_class: str | None = None
    prepaid_amount: float | None = Field(default=None, ge=0)
    pay_at_counter_amount: float | None = Field(default=None, ge=0)
    main_category: str | None = None
    sub_category: str | None = None
    account_name: str | None = None
    booking_source_email: str | None = None
    source_text: str | None = None
    priority: str | None = None
    trip_type: str | None = None
    hk_gk: str | None = None
    currency: str | None = None
    ticket_cost: float | None = None
    mco_charge: float | None = None
    merchant_fee: float | None = Field(default=None, ge=0)
    cvv_fee: float | None = Field(default=None, ge=0)
    total_auth_amount: float | None = None
    margin: float | None = None
    attachment_url: str | None = None
    important: bool | None = None
    other_details: str | None = None
    remarks: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    passengers: list[dict[str, Any]] | None = None
    special_notes: list[dict[str, Any]] | None = None
    booking_source: str | None = None
    transaction_type: str | None = None
    transaction_status: str | None = None
    lead_tag: str | None = None
    leads_booking_source: str | None = None
    title: str | None = None
    class_of_service: str | None = None
    add_on_services: str | None = None
    status: str | None = None
    card_holder_name: str | None = None
    card_number: str | None = None
    card_type: str | None = None
    billing_address: str | None = None
    cvv: str | None = None
    card_expiry: str | None = None
    charge_name: str | None = None
    company_amount: float | None = None
    platform_amount: float | None = None
    remarks_history: list[dict[str, Any]] | None = None
    custom_fields: dict[str, Any] | None = None


class FlightBookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lead_id: uuid.UUID
    booking_reference: str
    booking_platform: str
    pnr: str
    airline: str
    flight_numbers: list[str]
    origin: str
    destination: str
    cabin_class: str
    prepaid_amount: float
    pay_at_counter_amount: float
    total_amount: float
    main_category: str | None = None
    sub_category: str | None = None
    account_name: str | None = None
    booking_source_email: str | None = None
    source_text: str | None = None
    priority: str | None = None
    trip_type: str | None = "One Way"
    hk_gk: str | None = None
    currency: str | None = "$"
    ticket_cost: float | None = 0
    mco_charge: float | None = 0
    merchant_fee: float = 15
    cvv_fee: float = 0
    total_auth_amount: float | None = 0
    margin: float | None = 0
    attachment_url: str | None = None
    important: bool = False
    other_details: str | None = None
    remarks: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    passengers: list[dict[str, Any]] | None = None
    special_notes: list[dict[str, Any]] | None = None
    booking_source: str | None = None
    transaction_type: str | None = None
    transaction_status: str | None = None
    lead_tag: str | None = None
    leads_booking_source: str | None = None
    title: str | None = None
    class_of_service: str | None = None
    add_on_services: str | None = None
    status: str | None = None
    card_holder_name: str | None = None
    card_number: str | None = None
    card_type: str | None = None
    billing_address: str | None = None
    cvv: str | None = None
    card_expiry: str | None = None
    charge_name: str | None = None
    company_amount: float | None = 0
    platform_amount: float | None = 0
    remarks_history: list[dict[str, Any]] | None = None
    custom_fields: dict[str, Any]
    created_at: datetime
    updated_at: datetime
