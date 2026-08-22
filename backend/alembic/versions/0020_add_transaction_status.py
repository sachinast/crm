"""Add transaction_status to booking tables.

Revision ID: 0020
Revises: 0019
Create Date: 2026-08-22 21:36:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0020"
down_revision: Union[str, None] = "0019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BOOKING_TABLES = ["car_bookings", "hotel_bookings", "flight_bookings"]


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    for table in BOOKING_TABLES:
        existing_cols = {c["name"] for c in inspector.get_columns(table)}
        if "transaction_status" not in existing_cols:
            op.add_column(table, sa.Column("transaction_status", sa.Text(), nullable=True))


def downgrade() -> None:
    for table in BOOKING_TABLES:
        op.drop_column(table, "transaction_status")
