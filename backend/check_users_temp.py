import asyncio
import sys
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.role import Role

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(User.id, User.name, User.email, Role.name).join(Role, Role.id == User.role_id)
        )
        for r in res.all():
            print(f"User: {r[1]} | Email: {r[2]} | Role: {r[3]}")

if __name__ == "__main__":
    asyncio.run(main())
