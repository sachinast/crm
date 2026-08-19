"""Master data for Super Admin — dynamic dropdown options for booking fields
that were either free text (booking_platform, airline, cabin_class,
hotel_name, room_type, car_provider) or fixed Postgres enums
(car_bookings.vehicle_type, car_bookings.transmission). One
master_field_options table, keyed by field_key, drives all of them; the two
enum columns are converted to TEXT (zero-behavior-change: seeded with the
exact same values the enums had).

Revision ID: 0012
Revises: 0011
Create Date: 2026-08-19
"""
from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None

VEHICLE_TYPES = [
    "economy", "compact", "intermediate", "standard", "full_size", "standard_suv",
    "intermediate_suv", "premium_suv", "full_size_suv", "luxury", "passenger_van",
    "mini_van", "fifteen_passenger_van", "mystery_car", "premium_crossover",
    "premium_elite_crossover", "pickup_truck", "electric",
]
TRANSMISSIONS = ["automatic", "manual"]


def _q(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE master_field_options (
          id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          field_key      TEXT NOT NULL,
          value          TEXT NOT NULL,
          display_order  INTEGER NOT NULL DEFAULT 0,
          created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (field_key, value)
        )
        """
    )

    for i, v in enumerate(VEHICLE_TYPES):
        op.execute(f"INSERT INTO master_field_options (field_key, value, display_order) VALUES ('vehicle_type', {_q(v)}, {i})")
    for i, v in enumerate(TRANSMISSIONS):
        op.execute(f"INSERT INTO master_field_options (field_key, value, display_order) VALUES ('transmission', {_q(v)}, {i})")

    op.execute("ALTER TABLE car_bookings ALTER COLUMN vehicle_type TYPE TEXT USING vehicle_type::text")
    op.execute("ALTER TABLE car_bookings ALTER COLUMN transmission TYPE TEXT USING transmission::text")
    op.execute("DROP TYPE vehicle_type")
    op.execute("DROP TYPE transmission_type")

    # flight_bookings never had booking_platform (car/hotel did) — now the
    # common field across all three booking types, per this feature's brief.
    op.execute("ALTER TABLE flight_bookings ADD COLUMN booking_platform TEXT NOT NULL DEFAULT ''")
    op.execute("ALTER TABLE flight_bookings ALTER COLUMN booking_platform DROP DEFAULT")


def downgrade() -> None:
    op.execute("ALTER TABLE flight_bookings DROP COLUMN booking_platform")
    op.execute("CREATE TYPE transmission_type AS ENUM ('automatic', 'manual')")
    op.execute(
        """
        CREATE TYPE vehicle_type AS ENUM (
          'economy', 'compact', 'intermediate', 'standard', 'full_size', 'standard_suv',
          'intermediate_suv', 'premium_suv', 'full_size_suv', 'luxury', 'passenger_van',
          'mini_van', 'fifteen_passenger_van', 'mystery_car', 'premium_crossover',
          'premium_elite_crossover', 'pickup_truck', 'electric'
        )
        """
    )
    op.execute("ALTER TABLE car_bookings ALTER COLUMN transmission TYPE transmission_type USING transmission::transmission_type")
    op.execute("ALTER TABLE car_bookings ALTER COLUMN vehicle_type TYPE vehicle_type USING vehicle_type::vehicle_type")
    op.execute("DROP TABLE IF EXISTS master_field_options")
