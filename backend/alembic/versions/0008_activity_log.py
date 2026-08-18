"""Activity log — Master Admin feature. A general-purpose, milestone-level
record of user/admin activity (logins, role/permission changes, user
provisioning, conversations started, denied PII-reveal attempts), separate
from the existing lead-scoped booking_process_log (which stays exactly as
is, NOT NULL lead_id and all).

Deliberately milestone-only, not full-content logging (e.g. "started a
conversation with 2 people", not message bodies) — see the plan this
migration implements for that scope decision.

Revision ID: 0008
Revises: 0007
Create Date: 2026-08-19
"""
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE activity_log (
          id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          actor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
          action       TEXT NOT NULL,
          category     TEXT NOT NULL,
          target_type  TEXT,
          target_id    UUID,
          metadata     JSONB,
          ip_address   INET,
          user_agent   TEXT,
          created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX ix_activity_log_actor ON activity_log(actor_id, created_at DESC)")
    op.execute("CREATE INDEX ix_activity_log_category ON activity_log(category, created_at DESC)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS activity_log")
