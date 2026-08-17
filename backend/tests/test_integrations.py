"""Phase 8 exit criteria: a new lead via an external POST (API-key
authenticated, Zapier/Make/any other form or API) appears correctly —
created, duplicate-checked, and attributed to the key's assigned agent —
without touching the internal JWT-authenticated intake flow.
"""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.audit import BookingProcessLog
from app.models.enums import UserRole
from app.models.integration import ApiKey
from app.models.lead import Lead
from app.models.user import User

pytestmark = pytest.mark.asyncio(loop_scope="session")

BASE_URL = "http://testserver/api/v1"


async def _create_user(email: str, password: str, role: UserRole) -> uuid.UUID:
    async with AsyncSessionLocal() as db:
        user = User(name="Test User", email=email, password_hash=hash_password(password), role=role)
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


async def _delete_lead(lead_id: uuid.UUID) -> None:
    async with AsyncSessionLocal() as db:
        lead = await db.get(Lead, lead_id)
        if lead is not None:
            await db.delete(lead)
            await db.commit()


async def _delete_api_key(key_id: uuid.UUID) -> None:
    async with AsyncSessionLocal() as db:
        key = await db.get(ApiKey, key_id)
        if key is not None:
            await db.delete(key)
            await db.commit()


def _unique_email(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}@example.com"


def _unique_phone() -> str:
    return f"+1555{uuid.uuid4().int % 10_000_000:07d}"


@pytest.fixture
async def api_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE_URL) as client:
        yield client


@pytest.fixture
async def admin():
    email = _unique_email("admin")
    password = "admin-password-123"
    user_id = await _create_user(email, password, UserRole.admin)
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


@pytest.fixture
async def agent():
    email = _unique_email("agent")
    password = "agent-password-123"
    user_id = await _create_user(email, password, UserRole.agent)
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


async def _login(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _create_api_key(client: AsyncClient, admin_token: str, assigned_agent_id: uuid.UUID) -> dict:
    resp = await client.post(
        "/integrations/api-keys",
        json={"name": "Zapier — Test Form", "assigned_agent_id": str(assigned_agent_id)},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


# --- API key management (Admin/Super Admin only) -----------------------


async def test_agent_cannot_manage_api_keys(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    resp = await api_client.post(
        "/integrations/api-keys",
        json={"name": "Should Fail", "assigned_agent_id": str(agent["id"])},
        headers=_auth(token),
    )
    assert resp.status_code == 403


async def test_admin_can_create_and_list_api_keys(api_client, admin, agent):
    admin_token = await _login(api_client, admin["email"], admin["password"])
    created = await _create_api_key(api_client, admin_token, agent["id"])

    assert created["api_key"].startswith("crm_live_")
    assert created["key_prefix"] in created["api_key"]

    listing = await api_client.get("/integrations/api-keys", headers=_auth(admin_token))
    assert listing.status_code == 200
    rows = listing.json()
    assert any(r["id"] == created["id"] for r in rows)
    # The raw key is never included in the list view — only the prefix.
    assert all("api_key" not in r for r in rows)

    await _delete_api_key(uuid.UUID(created["id"]))


async def test_revoked_key_can_no_longer_capture_leads(api_client, admin, agent):
    admin_token = await _login(api_client, admin["email"], admin["password"])
    created = await _create_api_key(api_client, admin_token, agent["id"])
    raw_key = created["api_key"]

    revoke = await api_client.patch(
        f"/integrations/api-keys/{created['id']}", json={"is_active": False}, headers=_auth(admin_token)
    )
    assert revoke.status_code == 200
    assert revoke.json()["is_active"] is False

    resp = await api_client.post(
        "/leads/capture",
        json={"name": "Should Not Work", "phone": _unique_phone(), "email": _unique_email("revoked")},
        headers={"X-API-Key": raw_key},
    )
    assert resp.status_code == 401

    await _delete_api_key(uuid.UUID(created["id"]))


# --- External capture ---------------------------------------------------


async def test_capture_requires_api_key(api_client):
    resp = await api_client.post(
        "/leads/capture",
        json={"name": "No Key", "phone": _unique_phone(), "email": _unique_email("nokey")},
    )
    assert resp.status_code == 401


async def test_capture_with_invalid_api_key_rejected(api_client):
    resp = await api_client.post(
        "/leads/capture",
        json={"name": "Bad Key", "phone": _unique_phone(), "email": _unique_email("badkey")},
        headers={"X-API-Key": "crm_live_not-a-real-key"},
    )
    assert resp.status_code == 401


async def test_capture_creates_lead_attributed_to_assigned_agent(api_client, admin, agent):
    admin_token = await _login(api_client, admin["email"], admin["password"])
    created = await _create_api_key(api_client, admin_token, agent["id"])

    resp = await api_client.post(
        "/leads/capture",
        json={
            "name": "External Customer",
            "phone": _unique_phone(),
            "email": _unique_email("external"),
            "notes": "Submitted via website contact form",
        },
        headers={"X-API-Key": created["api_key"]},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "authorization_pending"
    assert body["is_duplicate"] is False

    agent_token = await _login(api_client, agent["email"], agent["password"])
    lead = await api_client.get(f"/leads/{body['lead_id']}", headers=_auth(agent_token))
    assert lead.status_code == 200
    lead_body = lead.json()
    assert lead_body["agent_id"] == str(agent["id"])
    assert lead_body["source"] == "Zapier — Test Form"

    async with AsyncSessionLocal() as db:
        logs = (
            await db.execute(select(BookingProcessLog).where(BookingProcessLog.lead_id == uuid.UUID(body["lead_id"])))
        ).scalars().all()
        assert any(entry.action == "external_capture" for entry in logs)

    await _delete_lead(uuid.UUID(body["lead_id"]))
    await _delete_api_key(uuid.UUID(created["id"]))


async def test_capture_respects_explicit_source_override(api_client, admin, agent):
    admin_token = await _login(api_client, admin["email"], admin["password"])
    created = await _create_api_key(api_client, admin_token, agent["id"])

    resp = await api_client.post(
        "/leads/capture",
        json={
            "name": "Sourced Customer",
            "phone": _unique_phone(),
            "email": _unique_email("sourced"),
            "source": "Make — Landing Page B",
        },
        headers={"X-API-Key": created["api_key"]},
    )
    assert resp.status_code == 201
    lead_id = resp.json()["lead_id"]

    agent_token = await _login(api_client, agent["email"], agent["password"])
    lead = await api_client.get(f"/leads/{lead_id}", headers=_auth(agent_token))
    assert lead.json()["source"] == "Make — Landing Page B"

    await _delete_lead(uuid.UUID(lead_id))
    await _delete_api_key(uuid.UUID(created["id"]))


async def test_capture_flags_duplicates_same_as_internal_intake(api_client, admin, agent):
    admin_token = await _login(api_client, admin["email"], admin["password"])
    created = await _create_api_key(api_client, admin_token, agent["id"])
    phone = _unique_phone()

    first = await api_client.post(
        "/leads/capture",
        json={"name": "Dup One", "phone": phone, "email": _unique_email("capdup1")},
        headers={"X-API-Key": created["api_key"]},
    )
    assert first.status_code == 201
    assert first.json()["is_duplicate"] is False

    second = await api_client.post(
        "/leads/capture",
        json={"name": "Dup Two", "phone": phone, "email": _unique_email("capdup2")},
        headers={"X-API-Key": created["api_key"]},
    )
    assert second.status_code == 201
    assert second.json()["is_duplicate"] is True

    await _delete_lead(uuid.UUID(second.json()["lead_id"]))
    await _delete_lead(uuid.UUID(first.json()["lead_id"]))
    await _delete_api_key(uuid.UUID(created["id"]))
