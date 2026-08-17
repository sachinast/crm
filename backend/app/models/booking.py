import uuid
from datetime import date, datetime

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
from sqlalchemy.dialects.postgresql import ENUM as PGEnum, INET, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import TransmissionType, VehicleType
from app.models.mixins import TimestampMixin, UUIDPKMixin

transmission_enum = PGEnum(TransmissionType, name="transmission_type", create_type=False)
vehicle_type_enum = PGEnum(VehicleType, name="vehicle_type", create_type=False)

MONEY = Numeric(12, 2)


class CarBooking(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "car_bookings"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    booking_reference: Mapped[str] = mapped_column(Text, nullable=False)
    booking_platform: Mapped[str] = mapped_column(Text, nullable=False)
    car_provider: Mapped[str] = mapped_column(Text, nullable=False)
    renter_name: Mapped[str] = mapped_column(Text, nullable=False)
    renter_dob: Mapped[date] = mapped_column(Date, nullable=False)
    transmission: Mapped[TransmissionType] = mapped_column(transmission_enum, nullable=False)
    fuel_policy: Mapped[str | None] = mapped_column(Text)
    vehicle_type: Mapped[VehicleType] = mapped_column(vehicle_type_enum, nullable=False)
    pickup_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    pickup_location: Mapped[str] = mapped_column(Text, nullable=False)
    return_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    return_location: Mapped[str] = mapped_column(Text, nullable=False)
    prepaid_amount: Mapped[float] = mapped_column(MONEY, nullable=False, default=0)
    pay_at_counter_amount: Mapped[float] = mapped_column(MONEY, nullable=False, default=0)
    total_amount: Mapped[float] = mapped_column(
        MONEY, Computed("prepaid_amount + pay_at_counter_amount", persisted=True)
    )


class HotelBooking(UUIDPKMixin, TimestampMixin, Base):
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

    __table_args__ = (CheckConstraint("check_out_date > check_in_date", name="ck_hotel_dates"),)


class FlightBooking(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "flight_bookings"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    booking_reference: Mapped[str] = mapped_column(Text, nullable=False)
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
