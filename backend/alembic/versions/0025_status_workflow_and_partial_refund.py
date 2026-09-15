"""Add tag_partial_refund and update status permissions for chargeback, billing, and auditor.

Revision ID: 0025
Revises: 0024
Create Date: 2026-09-16 04:30:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0025"
down_revision: Union[str, None] = "0024"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Add tag_partial_refund to booking_status enum in postgres if not exists
    # In PostgreSQL, ALTER TYPE ... ADD VALUE cannot run inside a transaction block.
    # We execute it inside autocommit_block so it runs outside any active transaction.
    try:
        with op.get_context().autocommit_block():
            op.execute(sa.text("ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'tag_partial_refund'"))
    except Exception:
        pass

    # 2. Add to status_lookup
    try:
        conn.execute(
            sa.text(
                "INSERT INTO status_lookup (status, label, description) "
                "VALUES ('tag_partial_refund', 'Tag to Partial Refund', 'Partial refund initiated or recorded') "
                "ON CONFLICT (status) DO NOTHING"
            )
        )
    except Exception:
        pass

    # 3. Seed status_role_permissions for new and updated roles
    permissions_to_seed = [
        # kind, status, role_names
        ("set_by", "tag_partial_refund", ["billing", "auditor", "chargeback_dep"]),
        ("set_by", "tag_refund", ["chargeback_dep", "auditor"]),
        ("set_by", "tag_rdr", ["chargeback_dep", "auditor"]),
        ("set_by", "tag_chargeback", ["chargeback_dep", "auditor"]),
        ("set_by", "transferred_to_billing", ["change_dep", "auditor"]),
        ("relevant", "tag_partial_refund", ["billing", "chargeback_dep", "auditor"]),
        ("relevant", "tag_chargeback", ["chargeback_dep"]),
        ("relevant", "tag_rdr", ["chargeback_dep"]),
        ("relevant", "tag_refund", ["chargeback_dep"]),
        ("notifies", "tag_partial_refund", ["billing", "agent", "auditor"]),
    ]

    for kind, status_val, role_names in permissions_to_seed:
        for r_name in role_names:
            try:
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
        conn.execute(sa.text("DELETE FROM status_role_permissions WHERE status = 'tag_partial_refund'"))
        conn.execute(sa.text("DELETE FROM status_lookup WHERE status = 'tag_partial_refund'"))
    except Exception:
        pass
