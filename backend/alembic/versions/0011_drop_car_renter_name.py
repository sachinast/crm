"""Drop car_bookings.renter_name — redundant with leads.name (the "Customer
Name" field collected at intake). The new single-step intake form no longer
asks for a separate renter name; the customer's own name is what's used
everywhere a renter name would have been.

Revision ID: 0011
Revises: 0010
Create Date: 2026-08-19
"""
from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE car_bookings DROP COLUMN renter_name")


def downgrade() -> None:
    # Data is not recoverable — backfilled from the parent lead's name as a
    # reasonable default rather than leaving it NULL/blocking the downgrade.
    op.execute("ALTER TABLE car_bookings ADD COLUMN renter_name TEXT")
    op.execute(
        """
        UPDATE car_bookings SET renter_name = (SELECT name FROM leads WHERE leads.id = car_bookings.lead_id)
        """
    )
    op.execute("ALTER TABLE car_bookings ALTER COLUMN renter_name SET NOT NULL")
