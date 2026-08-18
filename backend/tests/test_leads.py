"""Phase 2 exit criteria (TECHNICAL_SPEC.md §10): Steps 1-4 of PRD §4.1 work
end-to-end — lead creation, duplicate detection, the confirm-override flow,
and the service-type unlock — plus RBAC-filtered listing.
"""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.lead import Lead
from app.models.rbac import Role
from app.models.user import User

pytestmark = pytest.mark.asyncio(loop_scope="session")

BASE_URL = "http://testserver/api/v1"


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


async def _delete_lead(lead_id: uuid.UUID) -> None:
    async with AsyncSessionLocal() as db:
        lead = await db.get(Lead, lead_id)
        if lead is not None:
            await db.delete(lead)
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
async def agent():
    email = _unique_email("agent")
    password = "agent-password-123"
    user_id = await _create_user(email, password, "agent")
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


@pytest.fixture
async def other_agent():
    email = _unique_email("agent2")
    password = "agent-password-456"
    user_id = await _create_user(email, password, "agent")
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


@pytest.fixture
async def admin():
    email = _unique_email("admin")
    password = "admin-password-123"
    user_id = await _create_user(email, password, "admin")
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


@pytest.fixture
async def auditor():
    email = _unique_email("auditor")
    password = "auditor-password-1"
    user_id = await _create_user(email, password, "auditor")
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


async def _login(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def test_agent_can_create_lead(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    resp = await api_client.post(
        "/leads",
        json={"name": "Alice Example", "phone": _unique_phone(), "email": _unique_email("alice")},
        headers=_auth(token),
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["agent_id"] == str(agent["id"])
    assert body["status"] == "authorization_pending"
    assert body["service_type"] is None
    assert body["is_duplicate"] is False
    await _delete_lead(uuid.UUID(body["id"]))


async def test_auditor_cannot_create_lead(api_client, auditor):
    token = await _login(api_client, auditor["email"], auditor["password"])
    resp = await api_client.post(
        "/leads",
        json={"name": "Blocked", "phone": _unique_phone(), "email": _unique_email("blocked")},
        headers=_auth(token),
    )
    assert resp.status_code == 403


async def test_duplicate_detected_on_exact_phone_match(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    phone = _unique_phone()

    first = await api_client.post(
        "/leads",
        json={"name": "Bob First", "phone": phone, "email": _unique_email("bob1")},
        headers=_auth(token),
    )
    assert first.status_code == 201
    first_id = first.json()["id"]

    second = await api_client.post(
        "/leads",
        # Same phone, different name/email — PRD §4.1: match on Name, Number, OR Email.
        json={"name": "Robert Second", "phone": phone, "email": _unique_email("bob2")},
        headers=_auth(token),
    )
    assert second.status_code == 201
    second_body = second.json()
    assert second_body["is_duplicate"] is True
    assert second_body["duplicate_of_id"] == first_id

    await _delete_lead(uuid.UUID(second_body["id"]))
    await _delete_lead(uuid.UUID(first_id))


async def test_duplicate_check_returns_candidates(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    email = _unique_email("carol")

    first = await api_client.post(
        "/leads", json={"name": "Carol One", "phone": _unique_phone(), "email": email}, headers=_auth(token)
    )
    second = await api_client.post(
        "/leads",
        json={"name": "Carol Two", "phone": _unique_phone(), "email": email},
        headers=_auth(token),
    )
    assert second.status_code == 201
    second_id = second.json()["id"]

    check = await api_client.get(f"/leads/{second_id}/duplicate-check", headers=_auth(token))
    assert check.status_code == 200
    body = check.json()
    assert body["is_duplicate"] is True
    assert any(c["id"] == first.json()["id"] for c in body["candidates"])

    await _delete_lead(uuid.UUID(second_id))
    await _delete_lead(uuid.UUID(first.json()["id"]))


async def test_service_type_blocked_until_duplicate_confirmed(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    phone = _unique_phone()

    first = await api_client.post(
        "/leads", json={"name": "Dana One", "phone": phone, "email": _unique_email("dana1")}, headers=_auth(token)
    )
    second = await api_client.post(
        "/leads", json={"name": "Dana Two", "phone": phone, "email": _unique_email("dana2")}, headers=_auth(token)
    )
    second_id = second.json()["id"]
    assert second.json()["is_duplicate"] is True

    blocked = await api_client.patch(
        f"/leads/{second_id}/service-type", json={"service_type": "car"}, headers=_auth(token)
    )
    assert blocked.status_code == 409

    confirm = await api_client.post(
        f"/leads/{second_id}/confirm",
        json={"reason": "Different customer, same shared office phone line"},
        headers=_auth(token),
    )
    assert confirm.status_code == 200
    assert confirm.json()["duplicate_override_reason"]

    unlocked = await api_client.patch(
        f"/leads/{second_id}/service-type", json={"service_type": "car"}, headers=_auth(token)
    )
    assert unlocked.status_code == 200
    assert unlocked.json()["service_type"] == "car"

    await _delete_lead(uuid.UUID(second_id))
    await _delete_lead(uuid.UUID(first.json()["id"]))


async def test_non_duplicate_lead_unlocks_without_confirm(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    created = await api_client.post(
        "/leads",
        json={"name": "Erin Unique", "phone": _unique_phone(), "email": _unique_email("erin")},
        headers=_auth(token),
    )
    lead_id = created.json()["id"]

    resp = await api_client.patch(f"/leads/{lead_id}/service-type", json={"service_type": "hotel"}, headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["service_type"] == "hotel"

    await _delete_lead(uuid.UUID(lead_id))


async def test_agent_only_sees_own_leads(api_client, agent, other_agent):
    token_a = await _login(api_client, agent["email"], agent["password"])
    token_b = await _login(api_client, other_agent["email"], other_agent["password"])

    created = await api_client.post(
        "/leads",
        json={"name": "Owned By A", "phone": _unique_phone(), "email": _unique_email("owned")},
        headers=_auth(token_a),
    )
    lead_id = created.json()["id"]

    # Agent A sees it in their list and can fetch it directly.
    list_a = await api_client.get("/leads", headers=_auth(token_a))
    assert any(row["id"] == lead_id for row in list_a.json())
    get_a = await api_client.get(f"/leads/{lead_id}", headers=_auth(token_a))
    assert get_a.status_code == 200

    # Agent B doesn't see it, and a direct fetch 404s rather than 403 (no
    # existence leak across the RBAC boundary).
    list_b = await api_client.get("/leads", headers=_auth(token_b))
    assert all(row["id"] != lead_id for row in list_b.json())
    get_b = await api_client.get(f"/leads/{lead_id}", headers=_auth(token_b))
    assert get_b.status_code == 404

    await _delete_lead(uuid.UUID(lead_id))


async def test_admin_sees_all_leads_auditor_sees_none_yet(api_client, agent, admin, auditor):
    token_agent = await _login(api_client, agent["email"], agent["password"])
    token_admin = await _login(api_client, admin["email"], admin["password"])
    token_auditor = await _login(api_client, auditor["email"], auditor["password"])

    created = await api_client.post(
        "/leads",
        json={"name": "Visible To Admin", "phone": _unique_phone(), "email": _unique_email("visadmin")},
        headers=_auth(token_agent),
    )
    lead_id = created.json()["id"]

    admin_list = await api_client.get("/leads", headers=_auth(token_admin))
    assert any(row["id"] == lead_id for row in admin_list.json())

    # No status-based sharing yet (that's Phase 4) — Auditor's queue is
    # legitimately empty of leads nothing has been transferred to them for.
    auditor_list = await api_client.get("/leads", headers=_auth(token_auditor))
    assert all(row["id"] != lead_id for row in auditor_list.json())
    auditor_get = await api_client.get(f"/leads/{lead_id}", headers=_auth(token_auditor))
    assert auditor_get.status_code == 404

    await _delete_lead(uuid.UUID(lead_id))


async def test_get_lead_writes_access_log_and_notifications(api_client, agent, admin):
    token_agent = await _login(api_client, agent["email"], agent["password"])
    token_admin = await _login(api_client, admin["email"], admin["password"])

    created = await api_client.post(
        "/leads",
        json={"name": "Audited Lead", "phone": _unique_phone(), "email": _unique_email("audited")},
        headers=_auth(token_agent),
    )
    lead_id = uuid.UUID(created.json()["id"])

    # Admin opens the agent's lead -> should log the access and notify the agent.
    opened = await api_client.get(f"/leads/{lead_id}", headers=_auth(token_admin))
    assert opened.status_code == 200

    from sqlalchemy import select

    from app.models.audit import AccessNotificationLog, Notification

    async with AsyncSessionLocal() as db:
        log_rows = (
            await db.execute(select(AccessNotificationLog).where(AccessNotificationLog.lead_id == lead_id))
        ).scalars().all()
        assert len(log_rows) == 1
        assert log_rows[0].opened_by == admin["id"]

        notif_rows = (
            await db.execute(select(Notification).where(Notification.lead_id == lead_id))
        ).scalars().all()
        # one for the admin role (record_opened broadcast) + one addressed to the owning agent
        assert len(notif_rows) == 2
        assert {n.recipient_user_id for n in notif_rows if n.recipient_user_id} == {agent["id"]}

    await _delete_lead(lead_id)


async def test_email_and_mobile_filters(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    distinctive_phone = f"+19995550{uuid.uuid4().int % 100:02d}"
    created = await api_client.post(
        "/leads",
        json={"name": "Filter Target", "phone": distinctive_phone, "email": "filter-target@example.com"},
        headers=_auth(token),
    )
    lead_id = created.json()["id"]

    by_mobile = await api_client.get("/leads", params={"mobile": distinctive_phone[-6:]}, headers=_auth(token))
    assert any(row["id"] == lead_id for row in by_mobile.json())

    by_email = await api_client.get("/leads", params={"email": "filter-target"}, headers=_auth(token))
    assert any(row["id"] == lead_id for row in by_email.json())

    by_unrelated_email = await api_client.get("/leads", params={"email": "no-such-match"}, headers=_auth(token))
    assert all(row["id"] != lead_id for row in by_unrelated_email.json())

    await _delete_lead(uuid.UUID(lead_id))
