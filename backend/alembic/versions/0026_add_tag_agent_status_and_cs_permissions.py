"""Add tag_agent status and grant CS workflow permissions (tag to agent and tag to billing).

Revision ID: 0026
Revises: 0025
Create Date: 2026-09-25 21:40:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0026"
down_revision: Union[str, None] = "0025"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Add tag_agent to PostgreSQL booking_status enum
    try:
        with conn.begin_nested():
            conn.execute(sa.text("ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'tag_agent'"))
    except Exception:
        pass

    # 2. Add to status_lookup
    try:
        with conn.begin_nested():
            conn.execute(
                sa.text(
                    "INSERT INTO status_lookup (status, label, ui_color, sort_order) "
                    "VALUES ('tag_agent', 'Tag to Agent', 'blue', 14) "
                    "ON CONFLICT (status) DO NOTHING"
                )
            )
    except Exception:
        pass

    # 3. Seed status_role_permissions for tag_agent and CS workflow
    permissions_to_seed = [
        # kind, status, role_names
        ("set_by", "tag_agent", ["cs", "change_dep", "cr_booking", "auditor", "admin", "super_admin"]),
        ("set_by", "transferred_to_billing", ["cs", "agent", "change_dep", "auditor", "admin", "super_admin"]),
        ("relevant", "tag_agent", ["agent", "admin", "cs"]),
        ("notifies", "tag_agent", ["agent", "admin"]),
    ]

    for kind, status_val, role_names in permissions_to_seed:
        for r_name in role_names:
            try:
                with conn.begin_nested():
                    conn.execute(
                        sa.text(
                            "INSERT INTO status_role_permissions (status, role_id, kind) "
                            "SELECT :status_val::booking_status, r.id, :kind "
                            "FROM roles r WHERE r.name = :r_name "
                            "ON CONFLICT (status, role_id, kind) DO NOTHING"
                        ),
                        {"status_val": status_val, "kind": kind, "r_name": r_name},
                    )
            except Exception:
                pass


def downgrade() -> None:
    conn = op.get_bind()
    try:
        with conn.begin_nested():
            conn.execute(sa.text("DELETE FROM status_role_permissions WHERE status = 'tag_agent'"))
            conn.execute(sa.text("DELETE FROM status_lookup WHERE status = 'tag_agent'"))
    except Exception:
        pass
