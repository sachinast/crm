"""Update booking_status and car_provider master dropdown options.

Revision ID: 0024
Revises: 0023
Create Date: 2026-09-04 19:35:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0024"
down_revision: Union[str, None] = "0023"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BOOKING_STATUS_OPTIONS = [
    "Tag to CR Booking",
    "Tag to Change",
    "Transferred to Billing",
]

CAR_PROVIDER_OPTIONS = [
    "Avis",
    "Budget",
    "Alamo",
    "Hertz",
    "Enterprise",
    "National",
    "Dollar",
    "Thrifty",
    "Sixt",
    "Europcar",
    "Payless",
    "Fox Rent A Car",
    "Ace Rent A Car",
]


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Update booking_status
    conn.execute(sa.text("DELETE FROM master_field_options WHERE field_key = 'booking_status'"))
    for i, val in enumerate(BOOKING_STATUS_OPTIONS):
        conn.execute(
            sa.text(
                "INSERT INTO master_field_options (id, field_key, value, option_type, display_order) "
                "VALUES (gen_random_uuid(), 'booking_status', :val, 'master', :order)"
            ),
            {"val": val, "order": i},
        )

    try:
        conn.execute(sa.text("DELETE FROM mst_booking_status"))
        for i, val in enumerate(BOOKING_STATUS_OPTIONS):
            conn.execute(
                sa.text(
                    "INSERT INTO mst_booking_status (id, value, display_order, is_active) "
                    "VALUES (gen_random_uuid(), :val, :order, true)"
                ),
                {"val": val, "order": i},
            )
    except Exception:
        pass

    # 2. Update car_provider
    conn.execute(sa.text("DELETE FROM master_field_options WHERE field_key = 'car_provider'"))
    for i, val in enumerate(CAR_PROVIDER_OPTIONS):
        conn.execute(
            sa.text(
                "INSERT INTO master_field_options (id, field_key, value, option_type, display_order) "
                "VALUES (gen_random_uuid(), 'car_provider', :val, 'master', :order)"
            ),
            {"val": val, "order": i},
        )

    try:
        conn.execute(sa.text("DELETE FROM mst_car_provider"))
        for i, val in enumerate(CAR_PROVIDER_OPTIONS):
            conn.execute(
                sa.text(
                    "INSERT INTO mst_car_provider (id, value, display_order, is_active) "
                    "VALUES (gen_random_uuid(), :val, :order, true)"
                ),
                {"val": val, "order": i},
            )
    except Exception:
        pass


def downgrade() -> None:
    pass
