"""Bootstrap the first Super Admin account.

There is no self-registration (PRD §3: all users are provisioned manually by an
Admin or Super Admin) — which means the very first account has to come from
somewhere outside the API. This script is that somewhere; every account after
it gets created through POST /api/v1/users by an Admin/Super Admin instead.

Usage:
    .venv/bin/python -m app.scripts.seed_superadmin --email you@example.com --password '...' --name "Your Name"
"""
import argparse
import asyncio
import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.db.base import Base  # noqa: F401 — import first: registers every model module
# (in the order app/db/base.py declares) before this script imports any of them
# directly. Importing app.models.rbac first, on its own, is a circular import —
# rbac.py's `from app.db.base import Base` re-enters this module and then tries
# to import app.models.user, which imports app.models.rbac.Role before that name
# exists yet. Importing app.db.base up front sidesteps the ordering issue entirely.
from app.db.session import AsyncSessionLocal
from app.models.rbac import Role
from app.models.user import User


async def create_super_admin(email: str, password: str, name: str) -> None:
    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none() is not None:
            print(f"A user with email {email} already exists — nothing to do.", file=sys.stderr)
            return

        super_admin_role = await db.scalar(select(Role).where(Role.name == "super_admin"))
        if super_admin_role is None:
            print("No 'super_admin' role found — run migrations first.", file=sys.stderr)
            return

        user = User(
            name=name,
            email=email,
            password_hash=hash_password(password),
            role_id=super_admin_role.id,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        print(f"Created super_admin '{email}' (id={user.id})")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--name", default="Super Admin")
    args = parser.parse_args()

    if len(args.password) < 8:
        parser.error("--password must be at least 8 characters")

    asyncio.run(create_super_admin(args.email, args.password, args.name))


if __name__ == "__main__":
    main()
