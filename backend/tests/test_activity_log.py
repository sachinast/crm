"""Master Admin — Activity Log: GET /admin/activity (app/api/v1/admin_activity.py,
migration 0008), plus the specific call sites that write to it — login
success/failure, and the "tried to reveal masked PII they can't see" gap
(app/api/v1/leads.py's reveal_pii) the existing pii_reveal_audit_log never
covered.
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


def _unique_email(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}@example.com"


def _unique_phone() -> str:
    return f"+1555{uuid.uuid4().int % 10_000_000:07d}"


async def _create_user_with_role_name(email: str, password: str, role_name: str) -> uuid.UUID:
    async with AsyncSessionLocal() as db:
        role = await db.scalar(select(Role).where(Role.name == role_name))
        user = User(name="Test User", email=email, password_hash=hash_password(password), role_id=role.id)
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
async def super_admin():
    email = _unique_email("actlog-super")
    password = "correct-horse-battery-staple"
    user_id = await _create_user_with_role_name(email, password, "super_admin")
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


@pytest.fixture
async def agent():
    email = _unique_email("actlog-agent")
    password = "agent-password-123"
    user_id = await _create_user_with_role_name(email, password, "agent")
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


async def _login(client: AsyncClient, email: str, password: str, expect_status: int = 200) -> str | None:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == expect_status, resp.text
    return resp.json()["access_token"] if expect_status == 200 else None


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def test_successful_login_is_logged(api_client, super_admin, agent):
    admin_token = await _login(api_client, super_admin["email"], super_admin["password"])
    await _login(api_client, agent["email"], agent["password"])  # generates a login_success row

    resp = await api_client.get(
        "/admin/activity", params={"category": "auth", "actor_id": agent["id"]}, headers=_auth(admin_token)
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] >= 1
    assert any(item["action"] == "login_success" for item in body["items"])


async def test_failed_login_is_logged_without_an_actor(api_client, super_admin):
    admin_token = await _login(api_client, super_admin["email"], super_admin["password"])
    bad_email = _unique_email("nonexistent")

    resp = await api_client.post("/auth/login", json={"email": bad_email, "password": "whatever-wrong"})
    assert resp.status_code == 401

    activity = await api_client.get(
        "/admin/activity", params={"category": "auth"}, headers=_auth(admin_token)
    )
    match = next(
        (item for item in activity.json()["items"] if item["action"] == "login_failed" and item["metadata"]["email"] == bad_email),
        None,
    )
    assert match is not None
    assert match["actor_id"] is None


async def test_denied_pii_reveal_attempt_is_logged(api_client, super_admin, agent):
    admin_token = await _login(api_client, super_admin["email"], super_admin["password"])
    agent_token = await _login(api_client, agent["email"], agent["password"])

    # A random lead ID this agent has no visibility into (doesn't even exist).
    fake_lead_id = uuid.uuid4()
    denied = await api_client.post(
        f"/leads/{fake_lead_id}/reveal",
        json={"field": "email", "reason": "checking something"},
        headers=_auth(agent_token),
    )
    assert denied.status_code == 404

    activity = await api_client.get(
        "/admin/activity", params={"category": "pii", "actor_id": agent["id"]}, headers=_auth(admin_token)
    )
    match = next(
        (item for item in activity.json()["items"] if item["action"] == "reveal_denied" and item["target_id"] == str(fake_lead_id)),
        None,
    )
    assert match is not None
    assert match["metadata"]["field"] == "email"


async def test_agent_cannot_read_activity_log(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    resp = await api_client.get("/admin/activity", headers=_auth(token))
    assert resp.status_code == 403


async def test_pagination_respects_page_size(api_client, super_admin):
    admin_token = await _login(api_client, super_admin["email"], super_admin["password"])
    resp = await api_client.get("/admin/activity", params={"page": 1, "page_size": 2}, headers=_auth(admin_token))
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["items"]) <= 2
    assert body["page"] == 1
    assert body["page_size"] == 2
