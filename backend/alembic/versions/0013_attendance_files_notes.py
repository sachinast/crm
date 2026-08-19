"""Three new modules: Attendance, Files (file manager with shareable links +
view/click tracking), and Notes. Plus two new permissions
(attendance.view_all, files.view_all — see app/domain/permissions.py) and
two new app_settings entries (files.max_file_size_mb, header_clocks — the
Super Admin-configured header world clocks).

Revision ID: 0013
Revises: 0012
Create Date: 2026-08-20
"""
from alembic import op

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def _q(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def upgrade() -> None:
    # --- Attendance ---------------------------------------------------
    op.execute(
        """
        CREATE TABLE attendance_records (
          id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          work_date     DATE NOT NULL,
          check_in_at   TIMESTAMPTZ NOT NULL,
          check_out_at  TIMESTAMPTZ,
          notes         TEXT,
          created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (user_id, work_date)
        )
        """
    )
    op.execute("CREATE INDEX ix_attendance_user_date ON attendance_records(user_id, work_date DESC)")

    # --- Files ----------------------------------------------------------
    op.execute(
        """
        CREATE TABLE files (
          id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          uploaded_by    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          file_name      TEXT NOT NULL,
          content_type   TEXT NOT NULL,
          kind           TEXT NOT NULL,
          size_bytes     INTEGER NOT NULL,
          data           BYTEA NOT NULL,
          created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX ix_files_uploaded_by ON files(uploaded_by, created_at DESC)")

    op.execute(
        """
        CREATE TABLE file_share_links (
          id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          file_id      UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
          token        TEXT UNIQUE NOT NULL,
          created_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          is_active    BOOLEAN NOT NULL DEFAULT TRUE,
          created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX ix_file_share_links_file ON file_share_links(file_id)")

    op.execute(
        """
        CREATE TABLE file_share_events (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          share_link_id   UUID NOT NULL REFERENCES file_share_links(id) ON DELETE CASCADE,
          event_type      TEXT NOT NULL CHECK (event_type IN ('view', 'click')),
          ip_address      INET,
          user_agent      TEXT,
          created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX ix_file_share_events_link ON file_share_events(share_link_id, event_type)")

    # --- Notes ------------------------------------------------------------
    op.execute(
        """
        CREATE TABLE notes (
          id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title        TEXT NOT NULL,
          body         TEXT NOT NULL DEFAULT '',
          created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX ix_notes_user ON notes(user_id, updated_at DESC)")

    # --- New permissions ----------------------------------------------
    op.execute(
        "INSERT INTO permissions (code, description, category) VALUES "
        "('attendance.view_all', 'View every user''s attendance, not just your own', 'Attendance')"
    )
    op.execute(
        "INSERT INTO permissions (code, description, category) VALUES "
        "('files.view_all', 'Browse every user''s uploaded files, not just your own', 'Files')"
    )
    for role_name in ("super_admin", "admin", "tl"):
        op.execute(
            f"""
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id FROM roles r, permissions p
            WHERE r.name = {_q(role_name)} AND p.code = 'attendance.view_all'
            """
        )
    op.execute(
        """
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM roles r, permissions p
        WHERE r.name = 'super_admin' AND p.code = 'files.view_all'
        """
    )

    # --- New app_settings ------------------------------------------------
    op.execute(
        """
        INSERT INTO app_settings (key, value, value_type, category, label, description)
        VALUES (
          'files.max_file_size_mb', '50'::jsonb, 'number', 'Files',
          'Max file upload size (MB)',
          'Caps uploads in the Files module. Files are stored as bytes in Postgres, so this also bounds row/TOAST size.'
        )
        """
    )
    op.execute(
        """
        INSERT INTO app_settings (key, value, value_type, category, label, description)
        VALUES (
          'header_clocks',
          '[{"timezone": "Asia/Kolkata", "label": "India", "enabled": true}, {"timezone": "America/New_York", "label": "New York", "enabled": true}, {"timezone": "Europe/London", "label": "London", "enabled": true}]'::jsonb,
          'json', 'General', 'Header world clocks',
          'Up to 3 clocks shown in the top header (next to the notification bell) — each user chooses individually whether to show them.'
        )
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM app_settings WHERE key IN ('files.max_file_size_mb', 'header_clocks')")
    op.execute("DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE code IN ('attendance.view_all', 'files.view_all'))")
    op.execute("DELETE FROM permissions WHERE code IN ('attendance.view_all', 'files.view_all')")
    op.execute("DROP TABLE IF EXISTS notes")
    op.execute("DROP TABLE IF EXISTS file_share_events")
    op.execute("DROP TABLE IF EXISTS file_share_links")
    op.execute("DROP TABLE IF EXISTS files")
    op.execute("DROP TABLE IF EXISTS attendance_records")
