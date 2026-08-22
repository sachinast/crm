"""Separate Core Masters & Add-on Dropdowns and add new booking form fields

Revision ID: 0015
Revises: 0014
Create Date: 2026-08-22
"""
from alembic import op

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None

CORE_SEEDS = {
    "booking_source": [
        "E-Booking Desk", "Flight Ticket Desk", "eReserve Desk", "eTrip Desk",
        "ZAD CARS", "eBooking Hub", "Car Rental Hub"
    ],
    "transaction_type": ["New", "Changes", "Cancellation"],
    "booking_status": [
        "Authorization pending", "Client Approved", "Dropped", "Card charged",
        "Card declined", "Booked & shared to Client", "Tag to Change",
        "Tag to CR Booking", "Tag to Auditor", "QC Done", "Tag Refund",
        "Tag RDR", "Tag Chargeback", "Transferred to Billing"
    ],
    "call_type": [
        "Property / Room Change", "Booking Modification",
        "Stay Dates / Check-in-out Change", "Guest Details / Eligibility",
        "Pricing / Payment / Taxes", "Cancellation / No-Show",
        "Refund / Overcharge", "Property Issue (Room / Amenities / Service)",
        "Confirmation/Voucher/Policy", "Complaint / Escalation"
    ],
    "main_category": ["New", "Changes", "Cancel", "Add On Services"],
    "room_type": ["Standard room", "Delux room", "Suite"],
    "lead_tag": ["Flight", "Hotel", "Car Rental", "Flight and Hotel", "NA"],
    "leads_booking_source": ["Amadeus PNR", "Sabre PNR"],
    "priority": ["Low", "High"],
    "title": ["Mr", "Mrs", "Ms", "Master"],
    "class_of_service": [
        "Business", "Economy", "Basic Economy", "Premium Economy", "First Class"
    ],
}

ADDON_SEEDS = {
    "add_on_services": [
        "Extra Baggage", "Seat Selection", "Travel Insurance",
        "Airport Transfer", "Priority Check-in", "GPS Navigation", "Child Seat"
    ],
    "hk_gk": ["HK", "GK"],
    "currency": ["$", "Rs."],
    "mco_charges": ["Standard", "Rush", "Waived"],
    "insurance_coverage": [
        "Comprehensive", "Collision Damage Waiver", "Roadside Assistance",
        "Personal Accident", "None"
    ],
    "flight_ancillaries": [
        "Meal Selection", "Lounge Access", "Fast Track Security", "Special Assistance"
    ],
}


def _q(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def upgrade() -> None:
    # 1. Add option_type to master_field_options
    op.execute("ALTER TABLE master_field_options ADD COLUMN option_type TEXT NOT NULL DEFAULT 'master'")

    # 2. Seed Core Master dropdown options (option_type = 'master')
    for field_key, values in CORE_SEEDS.items():
        for i, val in enumerate(values):
            op.execute(
                f"INSERT INTO master_field_options (field_key, value, option_type, display_order) "
                f"VALUES ({_q(field_key)}, {_q(val)}, 'master', {i}) "
                f"ON CONFLICT (field_key, value) DO UPDATE SET option_type = 'master'"
            )

    # 3. Seed Add-on dropdown options (option_type = 'addon')
    for field_key, values in ADDON_SEEDS.items():
        for i, val in enumerate(values):
            op.execute(
                f"INSERT INTO master_field_options (field_key, value, option_type, display_order) "
                f"VALUES ({_q(field_key)}, {_q(val)}, 'addon', {i}) "
                f"ON CONFLICT (field_key, value) DO UPDATE SET option_type = 'addon'"
            )

    # 4. Add columns to car_bookings
    op.execute("ALTER TABLE car_bookings ADD COLUMN fuel_mileage TEXT")
    op.execute("ALTER TABLE car_bookings ADD COLUMN booking_confirmation TEXT")
    op.execute("ALTER TABLE car_bookings ADD COLUMN car_model TEXT")
    op.execute("ALTER TABLE car_bookings ADD COLUMN other_details TEXT")
    op.execute("ALTER TABLE car_bookings ADD COLUMN booking_source TEXT")
    op.execute("ALTER TABLE car_bookings ADD COLUMN transaction_type TEXT")
    op.execute("ALTER TABLE car_bookings ADD COLUMN status TEXT")

    # 5. Add columns to hotel_bookings
    op.execute("ALTER TABLE hotel_bookings ADD COLUMN call_type TEXT")
    op.execute("ALTER TABLE hotel_bookings ADD COLUMN itinerary_number TEXT")
    op.execute("ALTER TABLE hotel_bookings ADD COLUMN num_guests INTEGER DEFAULT 1")
    op.execute("ALTER TABLE hotel_bookings ADD COLUMN num_rooms INTEGER DEFAULT 1")
    op.execute("ALTER TABLE hotel_bookings ADD COLUMN bed_type TEXT")
    op.execute("ALTER TABLE hotel_bookings ADD COLUMN attachment_url TEXT")
    op.execute("ALTER TABLE hotel_bookings ADD COLUMN other_details TEXT")
    op.execute("ALTER TABLE hotel_bookings ADD COLUMN booking_source TEXT")
    op.execute("ALTER TABLE hotel_bookings ADD COLUMN transaction_type TEXT")
    op.execute("ALTER TABLE hotel_bookings ADD COLUMN status TEXT")

    # 6. Add columns to flight_bookings
    op.execute("ALTER TABLE flight_bookings ADD COLUMN main_category TEXT")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN sub_category TEXT")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN account_name TEXT")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN booking_source_email TEXT")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN source_text TEXT")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN priority TEXT")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN trip_type TEXT DEFAULT 'One Way'")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN hk_gk TEXT")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN currency TEXT DEFAULT '$'")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN ticket_cost NUMERIC(12, 2) DEFAULT 0")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN mco_charge NUMERIC(12, 2) DEFAULT 0")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN merchant_fee NUMERIC(12, 2) NOT NULL DEFAULT 15")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN cvv_fee NUMERIC(12, 2) NOT NULL DEFAULT 0")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN total_auth_amount NUMERIC(12, 2) DEFAULT 0")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN margin NUMERIC(12, 2) DEFAULT 0")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN attachment_url TEXT")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN important BOOLEAN NOT NULL DEFAULT false")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN other_details TEXT")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN booking_source TEXT")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN lead_tag TEXT")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN leads_booking_source TEXT")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN title TEXT")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN class_of_service TEXT")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN add_on_services TEXT")
    op.execute("ALTER TABLE flight_bookings ADD COLUMN status TEXT")


def downgrade() -> None:
    # 1. Flight bookings columns drop
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS status")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS add_on_services")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS class_of_service")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS title")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS leads_booking_source")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS lead_tag")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS booking_source")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS other_details")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS important")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS attachment_url")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS margin")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS total_auth_amount")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS cvv_fee")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS merchant_fee")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS mco_charge")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS ticket_cost")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS currency")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS hk_gk")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS trip_type")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS priority")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS source_text")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS booking_source_email")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS account_name")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS sub_category")
    op.execute("ALTER TABLE flight_bookings DROP COLUMN IF EXISTS main_category")

    # 2. Hotel bookings columns drop
    op.execute("ALTER TABLE hotel_bookings DROP COLUMN IF EXISTS status")
    op.execute("ALTER TABLE hotel_bookings DROP COLUMN IF EXISTS transaction_type")
    op.execute("ALTER TABLE hotel_bookings DROP COLUMN IF EXISTS booking_source")
    op.execute("ALTER TABLE hotel_bookings DROP COLUMN IF EXISTS other_details")
    op.execute("ALTER TABLE hotel_bookings DROP COLUMN IF EXISTS attachment_url")
    op.execute("ALTER TABLE hotel_bookings DROP COLUMN IF EXISTS bed_type")
    op.execute("ALTER TABLE hotel_bookings DROP COLUMN IF EXISTS num_rooms")
    op.execute("ALTER TABLE hotel_bookings DROP COLUMN IF EXISTS num_guests")
    op.execute("ALTER TABLE hotel_bookings DROP COLUMN IF EXISTS itinerary_number")
    op.execute("ALTER TABLE hotel_bookings DROP COLUMN IF EXISTS call_type")

    # 3. Car bookings columns drop
    op.execute("ALTER TABLE car_bookings DROP COLUMN IF EXISTS status")
    op.execute("ALTER TABLE car_bookings DROP COLUMN IF EXISTS transaction_type")
    op.execute("ALTER TABLE car_bookings DROP COLUMN IF EXISTS booking_source")
    op.execute("ALTER TABLE car_bookings DROP COLUMN IF EXISTS other_details")
    op.execute("ALTER TABLE car_bookings DROP COLUMN IF EXISTS car_model")
    op.execute("ALTER TABLE car_bookings DROP COLUMN IF EXISTS booking_confirmation")
    op.execute("ALTER TABLE car_bookings DROP COLUMN IF EXISTS fuel_mileage")

    # 4. Master options
    op.execute("DELETE FROM master_field_options WHERE option_type = 'addon'")
    op.execute("ALTER TABLE master_field_options DROP COLUMN IF EXISTS option_type")
