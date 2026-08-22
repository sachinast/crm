import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import AuditFieldsMixin, UUIDPKMixin


class MasterBaseMixin(UUIDPKMixin, AuditFieldsMixin):
    """Base mixin for all 24 dedicated master dropdown tables (`mst_*`)."""

    value: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class MstBookingPlatform(MasterBaseMixin, Base):
    __tablename__ = "mst_booking_platform"


class MstLeadsBookingSource(MasterBaseMixin, Base):
    __tablename__ = "mst_leads_booking_source"


class MstTitle(MasterBaseMixin, Base):
    __tablename__ = "mst_title"


class MstLeadTag(MasterBaseMixin, Base):
    __tablename__ = "mst_lead_tag"


class MstInsuranceCoverage(MasterBaseMixin, Base):
    __tablename__ = "mst_insurance_coverage"


class MstHkGk(MasterBaseMixin, Base):
    __tablename__ = "mst_hk_gk"


class MstTransmission(MasterBaseMixin, Base):
    __tablename__ = "mst_transmission"


class MstCarProvider(MasterBaseMixin, Base):
    __tablename__ = "mst_car_provider"


class MstCallType(MasterBaseMixin, Base):
    __tablename__ = "mst_call_type"


class MstRoomType(MasterBaseMixin, Base):
    __tablename__ = "mst_room_type"


class MstMcoCharges(MasterBaseMixin, Base):
    __tablename__ = "mst_mco_charges"


class MstAddOnServices(MasterBaseMixin, Base):
    __tablename__ = "mst_add_on_services"


class MstCabinClass(MasterBaseMixin, Base):
    __tablename__ = "mst_cabin_class"


class MstMainCategory(MasterBaseMixin, Base):
    __tablename__ = "mst_main_category"


class MstBookingStatus(MasterBaseMixin, Base):
    __tablename__ = "mst_booking_status"


class MstVehicleType(MasterBaseMixin, Base):
    __tablename__ = "mst_vehicle_type"


class MstFlightAncillaries(MasterBaseMixin, Base):
    __tablename__ = "mst_flight_ancillaries"


class MstHotelName(MasterBaseMixin, Base):
    __tablename__ = "mst_hotel_name"


class MstClassOfService(MasterBaseMixin, Base):
    __tablename__ = "mst_class_of_service"


class MstTransactionType(MasterBaseMixin, Base):
    __tablename__ = "mst_transaction_type"


class MstBookingSource(MasterBaseMixin, Base):
    __tablename__ = "mst_booking_source"


class MstAirline(MasterBaseMixin, Base):
    __tablename__ = "mst_airline"


class MstPriority(MasterBaseMixin, Base):
    __tablename__ = "mst_priority"


class MstCurrency(MasterBaseMixin, Base):
    __tablename__ = "mst_currency"


MASTER_TABLES_MAP: dict[str, type[Base]] = {
    "booking_platform": MstBookingPlatform,
    "leads_booking_source": MstLeadsBookingSource,
    "title": MstTitle,
    "lead_tag": MstLeadTag,
    "insurance_coverage": MstInsuranceCoverage,
    "hk_gk": MstHkGk,
    "transmission": MstTransmission,
    "car_provider": MstCarProvider,
    "call_type": MstCallType,
    "room_type": MstRoomType,
    "mco_charges": MstMcoCharges,
    "add_on_services": MstAddOnServices,
    "cabin_class": MstCabinClass,
    "main_category": MstMainCategory,
    "booking_status": MstBookingStatus,
    "vehicle_type": MstVehicleType,
    "flight_ancillaries": MstFlightAncillaries,
    "hotel_name": MstHotelName,
    "class_of_service": MstClassOfService,
    "transaction_type": MstTransactionType,
    "booking_source": MstBookingSource,
    "airline": MstAirline,
    "priority": MstPriority,
    "currency": MstCurrency,
}


class MasterFieldOption(UUIDPKMixin, Base):
    """Legacy unified table for fallback compatibility."""

    __tablename__ = "master_field_options"

    field_key: Mapped[str] = mapped_column(Text, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    option_type: Mapped[str] = mapped_column(Text, nullable=False, default="master", server_default="master")
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("field_key", "value", name="uq_master_option_field_value"),)
