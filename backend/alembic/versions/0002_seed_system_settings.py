"""seed default system_settings row

The table has a single-row CHECK(id) constraint (TECHNICAL_SPEC.md §2.2) — the
app assumes exactly one row exists (id = TRUE) and does a plain `db.get(SystemSettings, True)`,
so that row has to exist from the first migration, not be created lazily by the app.

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-17
"""
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "INSERT INTO system_settings (id, registration_enabled) VALUES (TRUE, FALSE) "
        "ON CONFLICT (id) DO NOTHING"
    )


def downgrade() -> None:
    op.execute("DELETE FROM system_settings WHERE id = TRUE")
