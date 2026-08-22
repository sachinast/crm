"""Add payment summary fields and remarks history to booking tables.

Revision ID: 0018
Revises: 0017
Create Date: 2026-08-22 21:15:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0018"
down_revision: Union[str, None] = "0017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BOOKING_TABLES = ["car_bookings", "hotel_bookings", "flight_bookings"]

COLUMNS = [
    ("card_holder_name", sa.Column("card_holder_name", sa.Text(), nullable=True)),
    ("card_number", sa.Column("card_number", sa.Text(), nullable=True)),
    ("card_type", sa.Column("card_type", sa.Text(), nullable=True)),
    ("billing_address", sa.Column("billing_address", sa.Text(), nullable=True)),
    ("cvv", sa.Column("cvv", sa.Text(), nullable=True)),
    ("card_expiry", sa.Column("card_expiry", sa.Text(), nullable=True)),
    ("charge_name", sa.Column("charge_name", sa.Text(), nullable=True)),
    ("company_amount", sa.Column("company_amount", sa.Numeric(12, 2), nullable=True, server_default="0")),
    ("platform_amount", sa.Column("platform_amount", sa.Numeric(12, 2), nullable=True, server_default="0")),
    ("remarks_history", sa.Column("remarks_history", JSONB, nullable=True, server_default="[]")),
]


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    for table in BOOKING_TABLES:
        existing_cols = {c["name"] for c in inspector.get_columns(table)}
        for col_name, col_def in COLUMNS:
            if col_name not in existing_cols:
                op.add_column(table, col_def)


def downgrade() -> None:
    for table in BOOKING_TABLES:
        for col_name, _ in COLUMNS:
            op.drop_column(table, col_name)
