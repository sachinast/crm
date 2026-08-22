"""Seed all 24 mst_* master tables and master_field_options.

Revision ID: 0023
Revises: 0022
Create Date: 2026-08-23 03:38:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from pathlib import Path

revision: str = "0023"
down_revision: Union[str, None] = "0022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Read masters_dump.sql located alongside or relative to backend directory
    dump_path = Path(__file__).resolve().parent.parent.parent / "masters_dump.sql"
    if not dump_path.exists():
        return

    with open(dump_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    conn = op.get_bind()
    # Execute each SQL statement from the dump
    for statement in sql_content.split(";"):
        stmt = statement.strip()
        if stmt and not stmt.startswith("--") and stmt not in ("BEGIN", "COMMIT"):
            conn.execute(sa.text(stmt))


def downgrade() -> None:
    pass
