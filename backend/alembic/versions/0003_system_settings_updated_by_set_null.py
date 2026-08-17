"""system_settings.updated_by: RESTRICT -> SET NULL on user delete

This is a "who last touched this config" pointer on a single mutable row, not an
audit-log entry — it shouldn't block deleting the referenced user. The real audit
tables (booking_process_log, status_history, pii_reveal_audit_log) intentionally
keep the default RESTRICT-like behavior (TECHNICAL_SPEC.md §9.3, "immutable audit
trail") and are untouched here.

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-17
"""
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE system_settings DROP CONSTRAINT system_settings_updated_by_fkey")
    op.execute(
        "ALTER TABLE system_settings "
        "ADD CONSTRAINT system_settings_updated_by_fkey "
        "FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE system_settings DROP CONSTRAINT system_settings_updated_by_fkey")
    op.execute(
        "ALTER TABLE system_settings "
        "ADD CONSTRAINT system_settings_updated_by_fkey "
        "FOREIGN KEY (updated_by) REFERENCES users(id)"
    )
