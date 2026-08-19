"""Embeddable booking widgets — Super Admin creates a copy-paste <script>
snippet (per TECHNICAL_SPEC.md §10.3's same "external capture" family as
API keys/Zapier, but for a landing-page-embedded form instead of a webhook)
covering all three modules (Flights/Hotels/Cars) in one MakeMyTrip-styled
tabbed widget. Reuses integrations.manage — no new permission needed, this
is the same "external lead capture" surface, just a different transport.

Adds capture metadata columns to leads: which widget it came from, the
landing page URL, the visitor's server-observed public IP, their
self-reported local/network IP (best-effort, client-side), and the raw
search-intent fields the widget collected (flight route/dates, hotel
dates, etc.) for the agent to see when they pick up the lead.

Revision ID: 0014
Revises: 0013
Create Date: 2026-08-20
"""
from alembic import op

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE embed_widgets (
          id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name               TEXT NOT NULL,
          widget_key         TEXT UNIQUE NOT NULL,
          assigned_agent_id  UUID NOT NULL REFERENCES users(id),
          created_by         UUID NOT NULL REFERENCES users(id),
          is_active          BOOLEAN NOT NULL DEFAULT true,
          submission_count   INTEGER NOT NULL DEFAULT 0,
          created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX ix_embed_widgets_key ON embed_widgets(widget_key)")

    op.execute("ALTER TABLE leads ADD COLUMN embed_widget_id UUID REFERENCES embed_widgets(id) ON DELETE SET NULL")
    op.execute("ALTER TABLE leads ADD COLUMN landing_page_url TEXT")
    op.execute("ALTER TABLE leads ADD COLUMN visitor_public_ip TEXT")
    op.execute("ALTER TABLE leads ADD COLUMN visitor_local_ip TEXT")
    op.execute("ALTER TABLE leads ADD COLUMN embed_submission JSONB")


def downgrade() -> None:
    op.execute("ALTER TABLE leads DROP COLUMN embed_submission")
    op.execute("ALTER TABLE leads DROP COLUMN visitor_local_ip")
    op.execute("ALTER TABLE leads DROP COLUMN visitor_public_ip")
    op.execute("ALTER TABLE leads DROP COLUMN landing_page_url")
    op.execute("ALTER TABLE leads DROP COLUMN embed_widget_id")
    op.execute("DROP TABLE embed_widgets")
