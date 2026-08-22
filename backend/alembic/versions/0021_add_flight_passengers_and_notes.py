"""Add passengers, contact details, and special notes to flight_bookings.

Revision ID: 0021
Revises: 0020
Create Date: 2026-08-22 21:38:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0021"
down_revision: Union[str, None] = "0020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_cols = {c["name"] for c in inspector.get_columns("flight_bookings")}

    if "contact_email" not in existing_cols:
        op.add_column("flight_bookings", sa.Column("contact_email", sa.Text(), nullable=True))
    if "contact_phone" not in existing_cols:
        op.add_column("flight_bookings", sa.Column("contact_phone", sa.Text(), nullable=True))
    if "passengers" not in existing_cols:
        op.add_column("flight_bookings", sa.Column("passengers", JSONB, nullable=True, server_default="[]"))
    if "special_notes" not in existing_cols:
        op.add_column("flight_bookings", sa.Column("special_notes", JSONB, nullable=True, server_default="[]"))


def downgrade() -> None:
    op.drop_column("flight_bookings", "special_notes")
    op.drop_column("flight_bookings", "passengers")
    op.drop_column("flight_bookings", "contact_phone")
    op.drop_column("flight_bookings", "contact_email")
