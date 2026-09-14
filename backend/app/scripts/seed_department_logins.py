"""Seed or provision department login accounts and verify permissions for:
- CR BOOKING (cr_booking)
- AUDIT (auditor)
- CUSTOMER SERVICE (cs)
- Changes (change_dep)

Usage:
    python -m app.scripts.seed_department_logins
"""
import asyncio
import sys

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.security import hash_password
from app.db.base import Base  # noqa: F401 - registers models
from app.db.session import AsyncSessionLocal
from app.models.rbac import Permission, Role, role_permissions
from app.models.user import User

DEPARTMENT_ACCOUNTS = [
    {
        "role_name": "cr_booking",
        "email": "crbooking@crm.local",
        "name": "CR Booking Specialist",
        "password": "Password@123",
        "department": "CR BOOKING",
    },
    {
        "role_name": "auditor",
        "email": "audit@crm.local",
        "name": "Audit Specialist",
        "password": "Password@123",
        "department": "AUDIT",
    },
    {
        "role_name": "cs",
        "email": "cs@crm.local",
        "name": "Customer Service Agent",
        "password": "Password@123",
        "department": "CUSTOMER SERVICE",
    },
    {
        "role_name": "change_dep",
        "email": "changes@crm.local",
        "name": "Changes Specialist",
        "password": "Password@123",
        "department": "Changes",
    },
]


async def seed_department_logins() -> None:
    async with AsyncSessionLocal() as db:
        print("=== Provisioning Department Logins & Role Permissions ===")

        # 1. Fetch leads.view_all permission
        view_all_perm = await db.scalar(
            select(Permission).where(Permission.code == "leads.view_all")
        )

        # 2. Process each department profile
        for dept in DEPARTMENT_ACCOUNTS:
            role_name = dept["role_name"]
            role = await db.scalar(
                select(Role)
                .where(Role.name == role_name)
                .options(selectinload(Role.permissions))
            )

            if role is None:
                print(f"[*] Role '{role_name}' does not exist. Creating role...", file=sys.stderr)
                role = Role(name=role_name, is_system_role=True)
                db.add(role)
                await db.commit()
                await db.refresh(role)

            # Ensure CS and CR Booking and Changes have leads.view_all permission so they can view and act on leads
            if role_name in ("cs", "cr_booking", "change_dep") and view_all_perm:
                existing_codes = {p.code for p in role.permissions}
                if "leads.view_all" not in existing_codes:
                    role.permissions.append(view_all_perm)
                    await db.commit()
                    print(f"[*] Granted 'leads.view_all' to role '{role_name}'")

            # 3. Create or update user account
            existing_user = await db.scalar(select(User).where(User.email == dept["email"]))
            if existing_user is not None:
                existing_user.password_hash = hash_password(dept["password"])
                existing_user.role_id = role.id
                existing_user.is_active = True
                existing_user.name = dept["name"]
                await db.commit()
                print(f"[✓] Updated {dept['department']}: {dept['email']} (Role: {role_name})")
            else:
                user = User(
                    name=dept["name"],
                    email=dept["email"],
                    password_hash=hash_password(dept["password"]),
                    role_id=role.id,
                    is_active=True,
                )
                db.add(user)
                await db.commit()
                await db.refresh(user)
                print(f"[✓] Created {dept['department']}: {dept['email']} (Role: {role_name}, ID: {user.id})")

        print("=== Department Logins Provisioned Successfully ===")


def main() -> None:
    asyncio.run(seed_department_logins())


if __name__ == "__main__":
    main()
