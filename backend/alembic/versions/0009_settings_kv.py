"""Generic settings key-value store — Master Admin feature. Replaces the old
single-row, single-boolean `system_settings` table with a real `app_settings`
table an admin can add arbitrary typed entries to at runtime, no deploy.

Seeds three rows to prove the store is real, not just scaffolding:
  - `registration_enabled` — migrated 1:1 from the old system_settings row
    (same value, same updated_by/updated_at, not reset). Not currently
    enforced anywhere (no public registration endpoint exists — PRD §3: all
    accounts are provisioned by an Admin/Super Admin) — kept for
    forward-compatibility, same as it was before this migration.
  - `messaging.max_file_size_mb` — was a Settings env var
    (core/config.py's messaging_max_file_size_mb); now admin-editable.
  - `messaging.quick_replies` — was hardcoded in frontend/lib/emoji-data.ts;
    now admin-editable.

Revision ID: 0009
Revises: 0008
Create Date: 2026-08-19
"""
from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE app_settings (
          key          TEXT PRIMARY KEY,
          value        JSONB NOT NULL,
          value_type   TEXT NOT NULL CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
          category     TEXT NOT NULL,
          label        TEXT NOT NULL,
          description  TEXT,
          updated_by   UUID REFERENCES users(id) ON DELETE SET NULL,
          updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )

    op.execute(
        """
        INSERT INTO app_settings (key, value, value_type, category, label, description, updated_by, updated_at)
        SELECT
          'registration_enabled',
          to_jsonb(registration_enabled),
          'boolean',
          'General',
          'Self-registration enabled',
          'Not currently enforced anywhere — no public registration endpoint exists (PRD §3: all accounts are provisioned by an Admin/Super Admin). Kept for forward-compatibility.',
          updated_by,
          updated_at
        FROM system_settings WHERE id = TRUE
        """
    )
    op.execute(
        """
        INSERT INTO app_settings (key, value, value_type, category, label, description)
        VALUES (
          'messaging.max_file_size_mb',
          '8'::jsonb,
          'number',
          'Messaging',
          'Max attachment size (MB)',
          'Caps message attachment uploads. Attachments are stored as bytes in Postgres, so this also bounds row/TOAST size — raise it only alongside a move to real object storage.'
        )
        """
    )
    op.execute(
        """
        INSERT INTO app_settings (key, value, value_type, category, label, description)
        VALUES (
          'messaging.quick_replies',
          '["👍 Got it", "✅ On it", "🙏 Thanks!", "⏳ One sec"]'::jsonb,
          'json',
          'Messaging',
          'Quick reply presets',
          'Chips shown above the message composer.'
        )
        """
    )

    op.execute("DROP TABLE system_settings")


def downgrade() -> None:
    op.execute(
        """
        CREATE TABLE system_settings (
          id                       BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
          registration_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
          updated_by               UUID REFERENCES users(id) ON DELETE SET NULL,
          updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        INSERT INTO system_settings (id, registration_enabled, updated_by, updated_at)
        SELECT TRUE, (value)::boolean, updated_by, updated_at
        FROM app_settings WHERE key = 'registration_enabled'
        """
    )
    op.execute("DROP TABLE IF EXISTS app_settings")
