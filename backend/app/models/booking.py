import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    ARRAY,
    Boolean,
    CheckConstraint,
    Computed,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import AuditFieldsMixin, TimestampMixin, UUIDPKMixin

MONEY = Numeric(12, 2)


class CarBooking(UUIDPKMixin, AuditFieldsMixin, Base):
    __tablename__ = "car_bookings"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    booking_reference: Mapped[str] = mapped_column(Text, nullable=False)
    booking_platform: Mapped[str] = mapped_column(Text, nullable=False)
    car_provider: Mapped[str] = mapped_column(Text, nullable=False)
    renter_dob: Mapped[date] = mapped_column(Date, nullable=False)
    transmission: Mapped[str] = mapped_column(Text, nullable=False)
    fuel_policy: Mapped[str | None] = mapped_column(Text)
    vehicle_type: Mapped[str] = mapped_column(Text, nullable=False)
    pickup_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    pickup_location: Mapped[str] = mapped_column(Text, nullable=False)
    return_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    return_location: Mapped[str] = mapped_column(Text, nullable=False)
    prepaid_amount: Mapped[float] = mapped_column(MONEY, nullable=False, default=0)
    pay_at_counter_amount: Mapped[float] = mapped_column(MONEY, nullable=False, default=0)
    total_amount: Mapped[float] = mapped_column(
        MONEY, Computed("prepaid_amount + pay_at_counter_amount", persisted=True)
    )
    fuel_mileage: Mapped[str | None] = mapped_column(Text)
    booking_confirmation: Mapped[str | None] = mapped_column(Text)
    car_model: Mapped[str | None] = mapped_column(Text)
    driver_name: Mapped[str | None] = mapped_column(Text)
    driver_phone: Mapped[str | None] = mapped_column(Text)
    driver_license: Mapped[str | None] = mapped_column(Text)
    other_details: Mapped[str | None] = mapped_column(Text)
    remarks: Mapped[str | None] = mapped_column(Text)
    booking_source: Mapped[str | None] = mapped_column(Text)
    transaction_type: Mapped[str | None] = mapped_column(Text)
    transaction_status: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str | None] = mapped_column(Text)
    card_holder_name: Mapped[str | None] = mapped_column(Text)
    card_number: Mapped[str | None] = mapped_column(Text)
    card_type: Mapped[str | None] = mapped_column(Text)
    billing_address: Mapped[str | None] = mapped_column(Text)
    cvv: Mapped[str | None] = mapped_column(Text)
    card_expiry: Mapped[str | None] = mapped_column(Text)
    charge_name: Mapped[str | None] = mapped_column(Text)
    company_amount: Mapped[float | None] = mapped_column(MONEY, default=0)
    platform_amount: Mapped[float | None] = mapped_column(MONEY, default=0)
    remarks_history: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, default=list)
    custom_fields: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)


class HotelBooking(UUIDPKMixin, AuditFieldsMixin, Base):
    __tablename__ = "hotel_bookings"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    booking_reference: Mapped[str] = mapped_column(Text, nullable=False)
    booking_platform: Mapped[str] = mapped_column(Text, nullable=False)
    hotel_name: Mapped[str] = mapped_column(Text, nullable=False)
    room_type: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str] = mapped_column(Text, nullable=False)
    check_in_date: Mapped[date] = mapped_column(Date, nullable=False)
    check_out_date: Mapped[date] = mapped_column(Date, nullable=False)
    prepaid_amount: Mapped[float] = mapped_column(MONEY, nullable=False, default=0)
    pay_at_counter_amount: Mapped[float] = mapped_column(MONEY, nullable=False, default=0)
    total_amount: Mapped[float] = mapped_column(
        MONEY, Computed("prepaid_amount + pay_at_counter_amount", persisted=True)
    )
    call_type: Mapped[str | None] = mapped_column(Text)
    itinerary_number: Mapped[str | None] = mapped_column(Text)
    num_guests: Mapped[int | None] = mapped_column(Integer, default=1)
    num_rooms: Mapped[int | None] = mapped_column(Integer, default=1)
    bed_type: Mapped[str | None] = mapped_column(Text)
    primary_guest_name: Mapped[str | None] = mapped_column(Text)
    guest_email: Mapped[str | None] = mapped_column(Text)
    guest_phone: Mapped[str | None] = mapped_column(Text)
    attachment_url: Mapped[str | None] = mapped_column(Text)
    other_details: Mapped[str | None] = mapped_column(Text)
    remarks: Mapped[str | None] = mapped_column(Text)
    booking_source: Mapped[str | None] = mapped_column(Text)
    transaction_type: Mapped[str | None] = mapped_column(Text)
    transaction_status: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str | None] = mapped_column(Text)
    card_holder_name: Mapped[str | None] = mapped_column(Text)
    card_number: Mapped[str | None] = mapped_column(Text)
    card_type: Mapped[str | None] = mapped_column(Text)
    billing_address: Mapped[str | None] = mapped_column(Text)
    cvv: Mapped[str | None] = mapped_column(Text)
    card_expiry: Mapped[str | None] = mapped_column(Text)
    charge_name: Mapped[str | None] = mapped_column(Text)
    company_amount: Mapped[float | None] = mapped_column(MONEY, default=0)
    platform_amount: Mapped[float | None] = mapped_column(MONEY, default=0)
    remarks_history: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, default=list)
    custom_fields: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    __table_args__ = (CheckConstraint("check_out_date > check_in_date", name="ck_hotel_dates"),)


class FlightBooking(UUIDPKMixin, AuditFieldsMixin, Base):
    __tablename__ = "flight_bookings"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    booking_reference: Mapped[str] = mapped_column(Text, nullable=False)
    booking_platform: Mapped[str] = mapped_column(Text, nullable=False)
    pnr: Mapped[str] = mapped_column(Text, nullable=False)
    airline: Mapped[str] = mapped_column(Text, nullable=False)
    flight_numbers: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False)
    origin: Mapped[str] = mapped_column(Text, nullable=False)
    destination: Mapped[str] = mapped_column(Text, nullable=False)
    cabin_class: Mapped[str] = mapped_column(Text, nullable=False)
    prepaid_amount: Mapped[float] = mapped_column(MONEY, nullable=False, default=0)
    pay_at_counter_amount: Mapped[float] = mapped_column(MONEY, nullable=False, default=0)
    total_amount: Mapped[float] = mapped_column(
        MONEY, Computed("prepaid_amount + pay_at_counter_amount", persisted=True)
    )
    main_category: Mapped[str | None] = mapped_column(Text)
    sub_category: Mapped[str | None] = mapped_column(Text)
    account_name: Mapped[str | None] = mapped_column(Text)
    booking_source_email: Mapped[str | None] = mapped_column(Text)
    source_text: Mapped[str | None] = mapped_column(Text)
    priority: Mapped[str | None] = mapped_column(Text)
    trip_type: Mapped[str | None] = mapped_column(Text, default="One Way")
    hk_gk: Mapped[str | None] = mapped_column(Text)
    currency: Mapped[str | None] = mapped_column(Text, default="$")
    ticket_cost: Mapped[float | None] = mapped_column(MONEY, default=0)
    mco_charge: Mapped[float | None] = mapped_column(MONEY, default=0)
    merchant_fee: Mapped[float] = mapped_column(MONEY, nullable=False, default=15)
    cvv_fee: Mapped[float] = mapped_column(MONEY, nullable=False, default=0)
    total_auth_amount: Mapped[float | None] = mapped_column(MONEY, default=0)
    margin: Mapped[float | None] = mapped_column(MONEY, default=0)
    attachment_url: Mapped[str | None] = mapped_column(Text)
    important: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    other_details: Mapped[str | None] = mapped_column(Text)
    remarks: Mapped[str | None] = mapped_column(Text)
    contact_email: Mapped[str | None] = mapped_column(Text)
    contact_phone: Mapped[str | None] = mapped_column(Text)
    passengers: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, default=list)
    special_notes: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, default=list)
    booking_source: Mapped[str | None] = mapped_column(Text)
    transaction_type: Mapped[str | None] = mapped_column(Text)
    transaction_status: Mapped[str | None] = mapped_column(Text)
    lead_tag: Mapped[str | None] = mapped_column(Text)
    leads_booking_source: Mapped[str | None] = mapped_column(Text)
    title: Mapped[str | None] = mapped_column(Text)
    class_of_service: Mapped[str | None] = mapped_column(Text)
    add_on_services: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str | None] = mapped_column(Text)
    card_holder_name: Mapped[str | None] = mapped_column(Text)
    card_number: Mapped[str | None] = mapped_column(Text)
    card_type: Mapped[str | None] = mapped_column(Text)
    billing_address: Mapped[str | None] = mapped_column(Text)
    cvv: Mapped[str | None] = mapped_column(Text)
    card_expiry: Mapped[str | None] = mapped_column(Text)
    charge_name: Mapped[str | None] = mapped_column(Text)
    company_amount: Mapped[float | None] = mapped_column(MONEY, default=0)
    platform_amount: Mapped[float | None] = mapped_column(MONEY, default=0)
    remarks_history: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, default=list)
    custom_fields: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)


class BookingModification(UUIDPKMixin, Base):
    __tablename__ = "booking_modifications"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False
    )
    field_name: Mapped[str] = mapped_column(Text, nullable=False)
    original_value: Mapped[dict] = mapped_column(JSONB, nullable=False)
    revised_value: Mapped[dict] = mapped_column(JSONB, nullable=False)
    modification_amount: Mapped[float] = mapped_column(MONEY, nullable=False, default=0)
    modified_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (Index("idx_booking_mods_lead", "lead_id"),)


class Cancellation(UUIDPKMixin, Base):
    __tablename__ = "cancellations"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    original_prepaid_amount: Mapped[float] = mapped_column(MONEY, nullable=False)
    cancellation_penalty_fee: Mapped[float] = mapped_column(MONEY, nullable=False, default=0)
    refund_amount: Mapped[float] = mapped_column(
        MONEY, Computed("GREATEST(original_prepaid_amount - cancellation_penalty_fee, 0)", persisted=True)
    )
    final_retained_amount: Mapped[float] = mapped_column(
        MONEY, Computed("LEAST(cancellation_penalty_fee, original_prepaid_amount)", persisted=True)
    )
    cancelled_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class FutureCredit(UUIDPKMixin, Base):
    __tablename__ = "future_credits"

    source_lead_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False)
    voucher_amount: Mapped[float] = mapped_column(MONEY, nullable=False)
    number_of_vouchers: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    validity_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (Index("idx_future_credits_source", "source_lead_id"),)
    # NOTE: enforce created_by.role IN ('tl', 'cs') in the service layer (app/services) —
    # see app/domain/status_machine.py sibling module for where role-gated writes live.


class AuthorizationRecord(UUIDPKMixin, Base):
    __tablename__ = "authorization_records"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False
    )
    cardholder_confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    prepaid_charge_ack: Mapped[bool] = mapped_column(Boolean, nullable=False)
    pay_at_counter_ack: Mapped[bool] = mapped_column(Boolean, nullable=False)
    booking_details_ack: Mapped[bool] = mapped_column(Boolean, nullable=False)
    terms_ack: Mapped[bool] = mapped_column(Boolean, nullable=False)
    non_refundable_ack: Mapped[bool] = mapped_column(Boolean, nullable=False)
    consent_status: Mapped[str] = mapped_column(Text, nullable=False, default="authorized")
    customer_ip: Mapped[str] = mapped_column(INET, nullable=False)
    user_agent: Mapped[str] = mapped_column(Text, nullable=False)
    authorized_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (Index("idx_auth_records_lead", "lead_id"),)
