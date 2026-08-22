"""Add primary guest details to hotel_bookings.

Revision ID: 0019
Revises: 0018
Create Date: 2026-08-22 21:35:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0019"
down_revision: Union[str, None] = "0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_cols = {c["name"] for c in inspector.get_columns("hotel_bookings")}

    if "primary_guest_name" not in existing_cols:
        op.add_column("hotel_bookings", sa.Column("primary_guest_name", sa.Text(), nullable=True))
    if "guest_email" not in existing_cols:
        op.add_column("hotel_bookings", sa.Column("guest_email", sa.Text(), nullable=True))
    if "guest_phone" not in existing_cols:
        op.add_column("hotel_bookings", sa.Column("guest_phone", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("hotel_bookings", "guest_phone")
    op.drop_column("hotel_bookings", "guest_email")
    op.drop_column("hotel_bookings", "primary_guest_name")
