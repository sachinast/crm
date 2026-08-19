"""GET /header-clocks — Super Admin-configured world clocks, open to any
authenticated user (app/api/v1/header_clocks.py, migration 0013 seeds the
default value into app_settings; changing it goes through the existing
generic /admin/settings endpoints, not a dedicated one).
"""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.rbac import Role
from app.models.user import User

pytestmark = pytest.mark.asyncio(loop_scope="session")
BASE_URL = "http://testserver/api/v1"


def _unique_email(p: str) -> str:
    return f"{p}-{uuid.uuid4().hex[:8]}@example.com"


async def _create_user(email: str, password: str, role: str) -> uuid.UUID:
    async with AsyncSessionLocal() as db:
        role_row = await db.scalar(select(Role).where(Role.name == role))
        user = User(name="Test User", email=email, password_hash=hash_password(password), role_id=role_row.id)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user.id


async def _delete_user(user_id: uuid.UUID) -> None:
    async with AsyncSessionLocal() as db:
        user = await db.get(User, user_id)
        if user is not None:
            await db.delete(user)
            await db.commit()


@pytest.fixture
async def api_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE_URL) as client:
        yield client


@pytest.fixture
async def agent():
    email = _unique_email("clocks-agent")
    user_id = await _create_user(email, "pw12345678", "agent")
    yield {"email": email, "password": "pw12345678"}
    await _delete_user(user_id)


async def _login(client, email, password) -> str:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def test_any_authenticated_user_can_read_header_clocks(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    resp = await api_client.get("/header-clocks", headers=_auth(token))
    assert resp.status_code == 200
    clocks = resp.json()
    assert len(clocks) == 3
    labels = {c["label"] for c in clocks}
    assert labels == {"India", "New York", "London"}


async def test_requires_authentication(api_client):
    resp = await api_client.get("/header-clocks")
    assert resp.status_code == 401
