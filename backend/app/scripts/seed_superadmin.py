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
from app.db.session import AsyncSessionLocal
from app.models.enums import UserRole
from app.models.user import User


async def create_super_admin(email: str, password: str, name: str) -> None:
    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none() is not None:
            print(f"A user with email {email} already exists — nothing to do.", file=sys.stderr)
            return

        user = User(
            name=name,
            email=email,
            password_hash=hash_password(password),
            role=UserRole.super_admin,
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
