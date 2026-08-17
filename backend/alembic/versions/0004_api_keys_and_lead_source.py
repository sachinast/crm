"""api_keys table + leads.source column — Phase 8 external integrations
(Zapier/Make/any external form or API), TECHNICAL_SPEC.md §10.3.

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-18
"""
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE api_keys (
          id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name               TEXT NOT NULL,
          key_prefix         TEXT NOT NULL,
          key_hash           TEXT NOT NULL,
          assigned_agent_id  UUID NOT NULL REFERENCES users(id),
          created_by         UUID NOT NULL REFERENCES users(id),
          is_active          BOOLEAN NOT NULL DEFAULT TRUE,
          last_used_at       TIMESTAMPTZ,
          created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix)")

    op.execute("ALTER TABLE leads ADD COLUMN source TEXT")


def downgrade() -> None:
    op.execute("ALTER TABLE leads DROP COLUMN source")
    op.execute("DROP TABLE IF EXISTS api_keys")
