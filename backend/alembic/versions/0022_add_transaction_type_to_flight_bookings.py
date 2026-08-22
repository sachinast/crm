"""Add transaction_type to flight_bookings.

Revision ID: 0022
Revises: 0021
Create Date: 2026-08-22 21:40:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0022"
down_revision: Union[str, None] = "0021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_cols = {c["name"] for c in inspector.get_columns("flight_bookings")}

    if "transaction_type" not in existing_cols:
        op.add_column("flight_bookings", sa.Column("transaction_type", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("flight_bookings", "transaction_type")
