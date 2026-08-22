"""Ensure all tables maintain the 5 mandatory audit and soft-delete fields.

Revision ID: 0017
Revises: 0016
Create Date: 2026-08-22 20:47:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0017"
down_revision: Union[str, None] = "0016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ALL_TABLES = [
    "users",
    "roles",
    "permissions",
    "role_permissions",
    "user_roles",
    "status_permissions",
    "status_role_permissions",
    "leads",
    "lead_access_grants",
    "car_bookings",
    "hotel_bookings",
    "flight_bookings",
    "payment_transactions",
    "modification_history",
    "cancellation_records",
    "future_credits",
    "custom_field_definitions",
    "custom_field_values",
    "embed_widgets",
    "integrations",
    "api_keys",
    "activity_logs",
    "attendance_records",
    "file_items",
    "file_shares",
    "notes",
    "settings_kv",
    "conversations",
    "conversation_participants",
    "messages",
    "quick_replies",
    "master_field_options",
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


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    for table in ALL_TABLES:
        if table not in existing_tables:
            continue
        existing_cols = {c["name"] for c in inspector.get_columns(table)}

        if "is_deleted" not in existing_cols:
            op.add_column(table, sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"))
        if "created_by" not in existing_cols:
            op.add_column(table, sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
        if "created_on" not in existing_cols:
            op.add_column(table, sa.Column("created_on", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
        if "modified_by" not in existing_cols:
            op.add_column(table, sa.Column("modified_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
        if "modified_on" not in existing_cols:
            op.add_column(table, sa.Column("modified_on", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))

    # Ensure booking_process_log actor_id cascades on delete
    if "booking_process_log" in existing_tables:
        op.execute(
            """
            ALTER TABLE booking_process_log
            DROP CONSTRAINT IF EXISTS booking_process_log_actor_id_fkey,
            ADD CONSTRAINT booking_process_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE;
            """
        )


def downgrade() -> None:
    pass
