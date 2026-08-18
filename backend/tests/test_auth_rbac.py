"""Phase 1 exit criteria (TECHNICAL_SPEC.md §10): login works, Admin can create
users with roles, and protected routes 403/401 correctly.

Runs against a real Postgres (DATABASE_URL from .env / CI's postgres service) —
the enum/UUID/JSONB/computed-column schema isn't SQLite-compatible, so this
suite creates and tears down its own throwaway users per test rather than
mocking the DB.

Uses httpx.AsyncClient (ASGI transport) + pytest-asyncio, all awaited on the
same event loop as the DB setup/teardown helpers below — mixing that with a
synchronous TestClient here caused asyncpg "attached to a different loop"
errors, since TestClient drives the app from its own internal loop.
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

# All async tests/fixtures in this module share ONE event loop (session-scoped —
# see pytest.ini) matching the single `engine` created once at import time in
# app/db/session.py. asyncpg connections are bound to the loop that opened them;
# a fresh per-test loop would try to reuse pooled connections from a closed loop
# and blow up with "attached to a different loop".
pytestmark = pytest.mark.asyncio(loop_scope="session")

BASE_URL = "http://testserver/api/v1"


async def _create_user(email: str, password: str, role: str, ip_whitelist_enabled: bool = False) -> uuid.UUID:
    async with AsyncSessionLocal() as db:
        role_row = await db.scalar(select(Role).where(Role.name == role))
        user = User(
            name="Test User",
            email=email,
            password_hash=hash_password(password),
            role_id=role_row.id,
            ip_whitelist_enabled=ip_whitelist_enabled,
        )
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


def _unique_email(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}@example.com"


@pytest.fixture
async def api_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE_URL) as client:
        yield client


@pytest.fixture
async def super_admin():
    email = _unique_email("super")
    password = "correct-horse-battery-staple"
    user_id = await _create_user(email, password, "super_admin")
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


@pytest.fixture
async def agent_user():
    email = _unique_email("agent")
    password = "agent-password-123"
    user_id = await _create_user(email, password, "agent")
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


async def _login(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


async def test_login_success_returns_tokens(api_client, super_admin):
    resp = await api_client.post(
        "/auth/login", json={"email": super_admin["email"], "password": super_admin["password"]}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["token_type"] == "bearer"


async def test_login_wrong_password_rejected(api_client, super_admin):
    resp = await api_client.post(
        "/auth/login", json={"email": super_admin["email"], "password": "wrong-password"}
    )
    assert resp.status_code == 401


async def test_login_unknown_email_rejected(api_client):
    resp = await api_client.post(
        "/auth/login", json={"email": "nobody-here@example.com", "password": "whatever123"}
    )
    assert resp.status_code == 401


async def test_refresh_issues_new_access_token(api_client, super_admin):
    login_resp = await api_client.post(
        "/auth/login", json={"email": super_admin["email"], "password": super_admin["password"]}
    )
    refresh_token = login_resp.json()["refresh_token"]
    resp = await api_client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert resp.json()["access_token"]


async def test_refresh_rejects_garbage_token(api_client):
    resp = await api_client.post("/auth/refresh", json={"refresh_token": "not-a-real-token"})
    assert resp.status_code == 401


async def test_users_list_requires_auth(api_client):
    resp = await api_client.get("/users")
    assert resp.status_code == 401


async def test_users_me_rejects_bogus_bearer_token(api_client):
    resp = await api_client.get("/users/me", headers={"Authorization": "Bearer garbage.token.value"})
    assert resp.status_code == 401


async def test_agent_cannot_list_or_create_users(api_client, agent_user):
    token = await _login(api_client, agent_user["email"], agent_user["password"])
    headers = {"Authorization": f"Bearer {token}"}

    list_resp = await api_client.get("/users", headers=headers)
    assert list_resp.status_code == 403

    create_resp = await api_client.post(
        "/users",
        json={
            "name": "Should Not Be Created",
            "email": _unique_email("blocked"),
            "password": "whatever123",
            "role_name": "agent",
        },
        headers=headers,
    )
    assert create_resp.status_code == 403


async def test_agent_can_read_own_profile(api_client, agent_user):
    token = await _login(api_client, agent_user["email"], agent_user["password"])
    resp = await api_client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "agent"


async def test_super_admin_can_create_user_with_role(api_client, super_admin):
    token = await _login(api_client, super_admin["email"], super_admin["password"])
    email = _unique_email("newagent")
    resp = await api_client.post(
        "/users",
        json={"name": "New Agent", "email": email, "password": "abc123456", "role_name": "agent"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["email"] == email
    assert body["role"] == "agent"
    await _delete_user(uuid.UUID(body["id"]))


async def test_duplicate_email_rejected(api_client, super_admin):
    token = await _login(api_client, super_admin["email"], super_admin["password"])
    resp = await api_client.post(
        "/users",
        json={
            "name": "Duplicate",
            "email": super_admin["email"],
            "password": "abc123456",
            "role_name": "agent",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 409


async def test_only_super_admin_can_change_registration_toggle(api_client, super_admin, agent_user):
    admin_token = await _login(api_client, super_admin["email"], super_admin["password"])
    agent_token = await _login(api_client, agent_user["email"], agent_user["password"])

    forbidden = await api_client.patch(
        "/admin/settings/registration_enabled",
        json={"value": True},
        headers={"Authorization": f"Bearer {agent_token}"},
    )
    assert forbidden.status_code == 403

    allowed = await api_client.patch(
        "/admin/settings/registration_enabled",
        json={"value": True},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert allowed.status_code == 200
    assert allowed.json()["value"] is True

    # restore the safe default so this test is order-independent / repeatable
    await api_client.patch(
        "/admin/settings/registration_enabled",
        json={"value": False},
        headers={"Authorization": f"Bearer {admin_token}"},
    )


async def test_ip_whitelist_blocks_request_when_no_ip_matches(api_client):
    user_id = await _create_user(_unique_email("ipwl"), "pw12345678", "admin", ip_whitelist_enabled=True)
    try:
        async with AsyncSessionLocal() as db:
            user = await db.get(User, user_id)
            email = user.email
        token = await _login(api_client, email, "pw12345678")
        resp = await api_client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
        # The ASGI test transport's synthetic client IP will never be in this
        # user's (empty) whitelist, so the request must be blocked.
        assert resp.status_code == 403
    finally:
        await _delete_user(user_id)
