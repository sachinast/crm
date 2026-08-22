"""Create 24 separate mst_* master tables, add driver info and remarks, and ensure audit fields.

Revision ID: 0016
Revises: 0015
Create Date: 2026-08-22 20:36:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = "0016"
down_revision: Union[str, None] = "0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

MASTER_TABLES = [
    "mst_booking_platform",
    "mst_leads_booking_source",
    "mst_title",
    "mst_lead_tag",
    "mst_insurance_coverage",
    "mst_hk_gk",
    "mst_transmission",
    "mst_car_provider",
    "mst_call_type",
    "mst_room_type",
    "mst_mco_charges",
    "mst_add_on_services",
    "mst_cabin_class",
    "mst_main_category",
    "mst_booking_status",
    "mst_vehicle_type",
    "mst_flight_ancillaries",
    "mst_hotel_name",
    "mst_class_of_service",
    "mst_transaction_type",
    "mst_booking_source",
    "mst_airline",
    "mst_priority",
    "mst_currency",
]

KEY_MAPPING = {table: table.replace("mst_", "") for table in MASTER_TABLES}


def upgrade() -> None:
    # 1. Create all 24 mst_* tables
    for table in MASTER_TABLES:
        op.create_table(
            table,
            sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
            sa.Column("value", sa.Text(), nullable=False, unique=True),
            sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_on", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("modified_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("modified_on", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 2. Populate each mst_* table from master_field_options
    conn = op.get_bind()
    for table, field_key in KEY_MAPPING.items():
        conn.execute(
            sa.text(
                f"""
                INSERT INTO {table} (id, value, display_order, created_by, is_active, is_deleted, created_on, modified_on)
                SELECT id, value, display_order, created_by, true, false, created_at, created_at
                FROM master_field_options
                WHERE field_key = :field_key
                ON CONFLICT (value) DO NOTHING
                """
            ),
            {"field_key": field_key},
        )

    # 3. Add Driver Info & Remarks & Audit columns to car_bookings
    op.add_column("car_bookings", sa.Column("driver_name", sa.Text(), nullable=True))
    op.add_column("car_bookings", sa.Column("driver_phone", sa.Text(), nullable=True))
    op.add_column("car_bookings", sa.Column("driver_license", sa.Text(), nullable=True))
    op.add_column("car_bookings", sa.Column("remarks", sa.Text(), nullable=True))
    op.add_column("car_bookings", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("car_bookings", sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
    op.add_column("car_bookings", sa.Column("created_on", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.add_column("car_bookings", sa.Column("modified_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
    op.add_column("car_bookings", sa.Column("modified_on", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))

    # 4. Add Remarks & Audit columns to hotel_bookings
    op.add_column("hotel_bookings", sa.Column("remarks", sa.Text(), nullable=True))
    op.add_column("hotel_bookings", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("hotel_bookings", sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
    op.add_column("hotel_bookings", sa.Column("created_on", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.add_column("hotel_bookings", sa.Column("modified_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
    op.add_column("hotel_bookings", sa.Column("modified_on", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))

    # 5. Add Remarks & Audit columns to flight_bookings
    op.add_column("flight_bookings", sa.Column("remarks", sa.Text(), nullable=True))
    op.add_column("flight_bookings", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("flight_bookings", sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
    op.add_column("flight_bookings", sa.Column("created_on", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.add_column("flight_bookings", sa.Column("modified_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
    op.add_column("flight_bookings", sa.Column("modified_on", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))


def downgrade() -> None:
    # Drop added columns from booking tables
    for col in ["driver_name", "driver_phone", "driver_license", "remarks", "is_deleted", "created_by", "created_on", "modified_by", "modified_on"]:
        op.drop_column("car_bookings", col)
    for col in ["remarks", "is_deleted", "created_by", "created_on", "modified_by", "modified_on"]:
        op.drop_column("hotel_bookings", col)
        op.drop_column("flight_bookings", col)

    # Drop 24 mst_* tables
    for table in reversed(MASTER_TABLES):
        op.drop_table(table)
