import enum


class UserRole(str, enum.Enum):
    super_admin = "super_admin"
    admin = "admin"
    agent = "agent"
    billing = "billing"
    tl = "tl"
    auditor = "auditor"
    cs = "cs"
    change_dep = "change_dep"
    chargeback_dep = "chargeback_dep"
    cr_booking = "cr_booking"


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


class TransmissionType(str, enum.Enum):
    automatic = "automatic"
    manual = "manual"


class VehicleType(str, enum.Enum):
    economy = "economy"
    compact = "compact"
    intermediate = "intermediate"
    standard = "standard"
    full_size = "full_size"
    standard_suv = "standard_suv"
    intermediate_suv = "intermediate_suv"
    premium_suv = "premium_suv"
    full_size_suv = "full_size_suv"
    luxury = "luxury"
    passenger_van = "passenger_van"
    mini_van = "mini_van"
    fifteen_passenger_van = "fifteen_passenger_van"
    mystery_car = "mystery_car"
    premium_crossover = "premium_crossover"
    premium_elite_crossover = "premium_elite_crossover"
    pickup_truck = "pickup_truck"
    electric = "electric"
