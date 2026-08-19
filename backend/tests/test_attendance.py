"""Attendance — check-in/check-out, own history, admin all-users view
gated on attendance.view_all (app/api/v1/attendance.py, migration 0013).
"""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.attendance import AttendanceRecord
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
        await db.execute(
            AttendanceRecord.__table__.delete().where(AttendanceRecord.user_id == user_id)
        )
        await db.commit()
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
    email = _unique_email("att-agent")
    user_id = await _create_user(email, "pw12345678", "agent")
    yield {"email": email, "password": "pw12345678", "id": user_id}
    await _delete_user(user_id)


@pytest.fixture
async def tl():
    email = _unique_email("att-tl")
    user_id = await _create_user(email, "pw12345678", "tl")
    yield {"email": email, "password": "pw12345678", "id": user_id}
    await _delete_user(user_id)


async def _login(client, email, password) -> str:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def test_check_in_then_check_out(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])

    today = await api_client.get("/attendance/today", headers=_auth(token))
    assert today.status_code == 200
    assert today.json()["checked_in"] is False

    checked_in = await api_client.post("/attendance/check-in", headers=_auth(token))
    assert checked_in.status_code == 201, checked_in.text
    assert checked_in.json()["check_out_at"] is None

    dup = await api_client.post("/attendance/check-in", headers=_auth(token))
    assert dup.status_code == 409

    checked_out = await api_client.post("/attendance/check-out", headers=_auth(token))
    assert checked_out.status_code == 200
    assert checked_out.json()["check_out_at"] is not None

    dup_out = await api_client.post("/attendance/check-out", headers=_auth(token))
    assert dup_out.status_code == 409

    mine = await api_client.get("/attendance/me", headers=_auth(token))
    assert mine.status_code == 200
    assert len(mine.json()) == 1


async def test_check_out_without_check_in_rejected(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    resp = await api_client.post("/attendance/check-out", headers=_auth(token))
    assert resp.status_code == 409


async def test_agent_cannot_list_all_attendance(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    resp = await api_client.get("/attendance", headers=_auth(token))
    assert resp.status_code == 403


async def test_tl_can_list_all_attendance(api_client, agent, tl):
    agent_token = await _login(api_client, agent["email"], agent["password"])
    await api_client.post("/attendance/check-in", headers=_auth(agent_token))

    tl_token = await _login(api_client, tl["email"], tl["password"])
    resp = await api_client.get("/attendance", params={"user_id": str(agent["id"])}, headers=_auth(tl_token))
    assert resp.status_code == 200
    rows = resp.json()
    assert len(rows) == 1
    assert rows[0]["user_id"] == str(agent["id"])
    assert rows[0]["user_name"] == "Test User"
