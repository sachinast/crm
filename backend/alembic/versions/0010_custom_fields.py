"""Custom form fields — Master Admin feature. An admin can define arbitrary
extra fields on Leads and all three booking types (Car/Hotel/Flight) at
runtime, no deploy: a `custom_field_definitions` table (what fields exist,
per entity type) plus a `custom_fields` JSONB column on each of the four
entity tables (the actual submitted values).

See app/domain/custom_fields.py for the shared validator every create/update
endpoint runs submitted values through (unknown keys rejected, required
fields enforced, values loosely type-checked against field_type) — one
function, four callers, rather than four hand-rolled validators.

Revision ID: 0010
Revises: 0009
Create Date: 2026-08-19
"""
from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None

ENTITY_TABLES = ["leads", "car_bookings", "hotel_bookings", "flight_bookings"]


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE custom_field_definitions (
          id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          entity_type    TEXT NOT NULL CHECK (entity_type IN ('lead', 'car_booking', 'hotel_booking', 'flight_booking')),
          key            TEXT NOT NULL,
          label          TEXT NOT NULL,
          field_type     TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'select', 'checkbox')),
          options        JSONB,
          is_required    BOOLEAN NOT NULL DEFAULT FALSE,
          display_order  INTEGER NOT NULL DEFAULT 0,
          created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (entity_type, key)
        )
        """
    )

    for table in ENTITY_TABLES:
        op.execute(f"ALTER TABLE {table} ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '{{}}'::jsonb")


def downgrade() -> None:
    for table in ENTITY_TABLES:
        op.execute(f"ALTER TABLE {table} DROP COLUMN IF EXISTS custom_fields")
    op.execute("DROP TABLE IF EXISTS custom_field_definitions")
