"""In-app messaging — conversations, participants, messages, attachments,
mentions. Every registered user can message every other registered user;
this is intentionally independent of the lead-visibility RBAC model used
everywhere else in this schema.

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-18
"""
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE TYPE attachment_kind AS ENUM ('image', 'pdf')")

    op.execute(
        """
        CREATE TABLE conversations (
          id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          is_group    BOOLEAN NOT NULL DEFAULT FALSE,
          name        TEXT,
          created_by  UUID NOT NULL REFERENCES users(id),
          created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )

    op.execute(
        """
        CREATE TABLE conversation_participants (
          conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          last_read_at     TIMESTAMPTZ,
          created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (conversation_id, user_id)
        )
        """
    )
    op.execute("CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id)")

    op.execute(
        """
        CREATE TABLE messages (
          id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id    UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          sender_id          UUID NOT NULL REFERENCES users(id),
          body               TEXT,
          is_quick_response  BOOLEAN NOT NULL DEFAULT FALSE,
          delivered_at       TIMESTAMPTZ,
          created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at)")

    op.execute(
        """
        CREATE TABLE message_attachments (
          id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          message_id     UUID REFERENCES messages(id) ON DELETE CASCADE,
          uploaded_by    UUID NOT NULL REFERENCES users(id),
          file_name      TEXT NOT NULL,
          content_type   TEXT NOT NULL,
          kind           attachment_kind NOT NULL,
          size_bytes     INTEGER NOT NULL,
          data           BYTEA NOT NULL,
          created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX idx_message_attachments_message ON message_attachments(message_id)")

    op.execute(
        """
        CREATE TABLE message_mentions (
          id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          message_id         UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
          mentioned_user_id  UUID NOT NULL REFERENCES users(id),
          created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (message_id, mentioned_user_id)
        )
        """
    )
    op.execute("CREATE INDEX idx_message_mentions_user ON message_mentions(mentioned_user_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS message_mentions")
    op.execute("DROP TABLE IF EXISTS message_attachments")
    op.execute("DROP TABLE IF EXISTS messages")
    op.execute("DROP TABLE IF EXISTS conversation_participants")
    op.execute("DROP TABLE IF EXISTS conversations")
    op.execute("DROP TYPE IF EXISTS attachment_kind")
