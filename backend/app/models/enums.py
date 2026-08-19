import enum


class ServiceType(str, enum.Enum):
    car = "car"
    hotel = "hotel"
    flight = "flight"


class BookingStatus(str, enum.Enum):
    authorization_pending = "authorization_pending"
    client_approved = "client_approved"
    transferred_to_billing = "transferred_to_billing"
    card_charged = "card_charged"
    card_declined = "card_declined"
    tag_change_dep = "tag_change_dep"
    tag_cr_booking = "tag_cr_booking"
    tag_auditor = "tag_auditor"
    qc_done = "qc_done"
    tag_refund = "tag_refund"
    tag_rdr = "tag_rdr"
    tag_chargeback = "tag_chargeback"


class PiiField(str, enum.Enum):
    email = "email"
    phone = "phone"
    card = "card"


class SyncStatus(str, enum.Enum):
    pending = "pending"
    success = "success"
    failed = "failed"


class AttachmentKind(str, enum.Enum):
    image = "image"
    pdf = "pdf"


# TransmissionType/VehicleType removed in migration 0012 — car_bookings.
# transmission/vehicle_type are now plain TEXT, values sourced from
# master_field_options (Super Admin master data) instead of a fixed enum.
