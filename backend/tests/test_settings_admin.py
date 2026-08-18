"""Master Admin — Settings: GET/POST/PATCH/DELETE /admin/settings
(app/api/v1/admin_settings.py, migration 0009), plus the read side other
features consume it through (GET /messaging/quick-replies).
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
    email = _unique_email("settings-super")
    password = "correct-horse-battery-staple"
    user_id = await _create_user_with_role_name(email, password, "super_admin")
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


@pytest.fixture
async def agent():
    email = _unique_email("settings-agent")
    password = "agent-password-123"
    user_id = await _create_user_with_role_name(email, password, "agent")
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


async def _login(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def test_seeded_settings_are_listed(api_client, super_admin):
    token = await _login(api_client, super_admin["email"], super_admin["password"])
    resp = await api_client.get("/admin/settings", headers=_auth(token))
    assert resp.status_code == 200
    keys = {s["key"] for s in resp.json()}
    assert {"registration_enabled", "messaging.max_file_size_mb", "messaging.quick_replies"} <= keys


async def test_create_update_delete_a_custom_setting(api_client, super_admin):
    token = await _login(api_client, super_admin["email"], super_admin["password"])
    key = f"custom.test-{uuid.uuid4().hex[:6]}"

    created = await api_client.post(
        "/admin/settings",
        json={"key": key, "value": "hello", "value_type": "string", "category": "Custom", "label": "Test"},
        headers=_auth(token),
    )
    assert created.status_code == 201, created.text
    assert created.json()["value"] == "hello"

    updated = await api_client.patch(f"/admin/settings/{key}", json={"value": "goodbye"}, headers=_auth(token))
    assert updated.status_code == 200
    assert updated.json()["value"] == "goodbye"

    deleted = await api_client.delete(f"/admin/settings/{key}", headers=_auth(token))
    assert deleted.status_code == 204

    gone = await api_client.patch(f"/admin/settings/{key}", json={"value": "x"}, headers=_auth(token))
    assert gone.status_code == 404


async def test_value_type_mismatch_rejected(api_client, super_admin):
    token = await _login(api_client, super_admin["email"], super_admin["password"])
    resp = await api_client.post(
        "/admin/settings",
        json={
            "key": f"custom.badtype-{uuid.uuid4().hex[:6]}",
            "value": "not-a-number",
            "value_type": "number",
            "category": "Custom",
            "label": "Bad",
        },
        headers=_auth(token),
    )
    assert resp.status_code == 422


async def test_duplicate_key_rejected(api_client, super_admin):
    token = await _login(api_client, super_admin["email"], super_admin["password"])
    resp = await api_client.post(
        "/admin/settings",
        json={"key": "registration_enabled", "value": True, "value_type": "boolean", "category": "General", "label": "dup"},
        headers=_auth(token),
    )
    assert resp.status_code == 409


async def test_agent_cannot_manage_settings(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    resp = await api_client.get("/admin/settings", headers=_auth(token))
    assert resp.status_code == 403


async def test_quick_replies_endpoint_reflects_admin_edits(api_client, super_admin, agent):
    admin_token = await _login(api_client, super_admin["email"], super_admin["password"])
    agent_token = await _login(api_client, agent["email"], agent["password"])

    default = await api_client.get("/messaging/quick-replies", headers=_auth(agent_token))
    assert default.status_code == 200
    assert "👍 Got it" in default.json()

    await api_client.patch(
        "/admin/settings/messaging.quick_replies",
        json={"value": ["Only this one"]},
        headers=_auth(admin_token),
    )
    updated = await api_client.get("/messaging/quick-replies", headers=_auth(agent_token))
    assert updated.json() == ["Only this one"]

    # restore, so this test is order-independent / repeatable
    await api_client.patch(
        "/admin/settings/messaging.quick_replies",
        json={"value": ["👍 Got it", "✅ On it", "🙏 Thanks!", "⏳ One sec"]},
        headers=_auth(admin_token),
    )
