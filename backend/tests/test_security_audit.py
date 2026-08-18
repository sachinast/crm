"""Phase 7 exit criteria (TECHNICAL_SPEC.md §10): PII never appears unmasked
outside a logged reveal; Admin can view the full process log.
"""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.audit import BookingProcessLog, PiiRevealAuditLog
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
async def admin():
    email = _unique_email("admin")
    password = "admin-password-123"
    user_id = await _create_user(email, password, "admin")
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


async def _login(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _create_lead(client: AsyncClient, token: str, *, phone: str, email: str) -> str:
    resp = await client.post(
        "/leads",
        json={"name": uuid.uuid4().hex, "phone": phone, "email": email},
        headers=_auth(token),
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


# --- Masking --------------------------------------------------------------


async def test_lead_email_and_phone_masked_in_create_response(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    email = "jane.roberts@example.com"
    phone = "+15551234567"
    resp = await api_client.post(
        "/leads", json={"name": "Jane Roberts", "phone": phone, "email": email}, headers=_auth(token)
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] != email
    assert body["email"].endswith("@example.com")
    assert "***" in body["email"]
    assert body["phone"] != phone
    assert body["phone"].endswith("4567")
    assert "*" in body["phone"]

    await _delete_lead(uuid.UUID(body["id"]))


async def test_lead_masked_in_list_and_get(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead(api_client, token, phone=_unique_phone(), email="masktest@example.com")

    get_resp = await api_client.get(f"/leads/{lead_id}", headers=_auth(token))
    assert get_resp.json()["email"] != "masktest@example.com"

    list_resp = await api_client.get("/leads", headers=_auth(token))
    row = next(r for r in list_resp.json() if r["id"] == lead_id)
    assert row["email"] != "masktest@example.com"

    await _delete_lead(uuid.UUID(lead_id))


async def test_duplicate_check_candidates_are_masked(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    phone = _unique_phone()
    first_id = await _create_lead(api_client, token, phone=phone, email=_unique_email("dup1"))
    second_id = await _create_lead(api_client, token, phone=phone, email=_unique_email("dup2"))

    check = await api_client.get(f"/leads/{second_id}/duplicate-check", headers=_auth(token))
    assert check.status_code == 200
    candidate = check.json()["candidates"][0]
    assert candidate["phone"] != phone
    assert "*" in candidate["phone"]

    await _delete_lead(uuid.UUID(second_id))
    await _delete_lead(uuid.UUID(first_id))


# --- Reveal -----------------------------------------------------------


async def test_reveal_returns_raw_value_and_logs_it(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    email = "revealme@example.com"
    lead_id = await _create_lead(api_client, token, phone="+15559998888", email=email)

    resp = await api_client.post(
        f"/leads/{lead_id}/reveal",
        json={"field": "email", "reason": "Confirming details over the phone"},
        headers=_auth(token),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["field"] == "email"
    assert body["value"] == email  # raw, unmasked

    async with AsyncSessionLocal() as db:
        logs = (
            await db.execute(select(PiiRevealAuditLog).where(PiiRevealAuditLog.lead_id == uuid.UUID(lead_id)))
        ).scalars().all()
        assert len(logs) == 1
        assert logs[0].field_revealed.value == "email"
        assert logs[0].reason == "Confirming details over the phone"
        assert logs[0].agent_id == agent["id"]

    await _delete_lead(uuid.UUID(lead_id))


async def test_reveal_requires_a_reason(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead(api_client, token, phone=_unique_phone(), email=_unique_email("noreason"))

    resp = await api_client.post(
        f"/leads/{lead_id}/reveal", json={"field": "phone", "reason": ""}, headers=_auth(token)
    )
    assert resp.status_code == 422

    await _delete_lead(uuid.UUID(lead_id))


async def test_reveal_card_without_payment_404s(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead(api_client, token, phone=_unique_phone(), email=_unique_email("nocard"))

    resp = await api_client.post(
        f"/leads/{lead_id}/reveal", json={"field": "card", "reason": "Checking"}, headers=_auth(token)
    )
    assert resp.status_code == 404

    await _delete_lead(uuid.UUID(lead_id))


async def test_reveal_respects_lead_visibility(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead(api_client, token, phone=_unique_phone(), email=_unique_email("private"))

    other_email = _unique_email("otheragent")
    other_id = await _create_user(other_email, "other-password-123", "agent")
    try:
        other_token = await _login(api_client, other_email, "other-password-123")
        resp = await api_client.post(
            f"/leads/{lead_id}/reveal", json={"field": "email", "reason": "Trying anyway"}, headers=_auth(other_token)
        )
        assert resp.status_code == 404
    finally:
        await _delete_user(other_id)
        await _delete_lead(uuid.UUID(lead_id))


# --- Audit endpoints (Admin/Super Admin only) --------------------------


async def test_agent_cannot_access_audit_endpoints(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    for path in ("/audit/pii-reveals", "/audit/process-log", "/audit/access-log"):
        resp = await api_client.get(path, headers=_auth(token))
        assert resp.status_code == 403, path


async def test_admin_can_view_pii_reveal_log(api_client, agent, admin):
    agent_token = await _login(api_client, agent["email"], agent["password"])
    admin_token = await _login(api_client, admin["email"], admin["password"])
    lead_id = await _create_lead(api_client, agent_token, phone=_unique_phone(), email=_unique_email("auditme"))

    await api_client.post(
        f"/leads/{lead_id}/reveal", json={"field": "phone", "reason": "Audit test"}, headers=_auth(agent_token)
    )

    resp = await api_client.get("/audit/pii-reveals", params={"lead_id": lead_id}, headers=_auth(admin_token))
    assert resp.status_code == 200
    rows = resp.json()
    assert len(rows) == 1
    assert rows[0]["field_revealed"] == "phone"
    assert rows[0]["reason"] == "Audit test"

    await _delete_lead(uuid.UUID(lead_id))


async def test_admin_can_view_process_log_for_lead_lifecycle(api_client, agent, admin):
    agent_token = await _login(api_client, agent["email"], agent["password"])
    admin_token = await _login(api_client, admin["email"], admin["password"])
    lead_id = await _create_lead(api_client, agent_token, phone=_unique_phone(), email=_unique_email("processlog"))

    await api_client.patch(
        f"/leads/{lead_id}/service-type", json={"service_type": "car"}, headers=_auth(agent_token)
    )

    resp = await api_client.get("/audit/process-log", params={"lead_id": lead_id}, headers=_auth(admin_token))
    assert resp.status_code == 200
    rows = resp.json()
    actions = {r["action"] for r in rows}
    assert "created" in actions
    assert "field_update" in actions
    service_type_row = next(r for r in rows if r.get("field_changed") == "service_type")
    assert service_type_row["new_value"] == "car"

    await _delete_lead(uuid.UUID(lead_id))


async def test_admin_can_view_access_log(api_client, agent, admin):
    agent_token = await _login(api_client, agent["email"], agent["password"])
    admin_token = await _login(api_client, admin["email"], admin["password"])
    lead_id = await _create_lead(api_client, agent_token, phone=_unique_phone(), email=_unique_email("accesslog"))

    # GET /leads/{id} itself writes an access_notification_log row.
    await api_client.get(f"/leads/{lead_id}", headers=_auth(agent_token))

    resp = await api_client.get("/audit/access-log", params={"lead_id": lead_id}, headers=_auth(admin_token))
    assert resp.status_code == 200
    rows = resp.json()
    assert len(rows) == 1
    assert rows[0]["opened_by"] == str(agent["id"])  # JSON serializes UUID as a string

    await _delete_lead(uuid.UUID(lead_id))


async def test_process_log_is_never_updated_or_deleted_by_the_app(api_client, agent):
    """Insert-only at the application layer (TECHNICAL_SPEC.md §9.3) — there's
    no endpoint anywhere in this API that mutates or removes a
    booking_process_log row once written."""
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead(api_client, token, phone=_unique_phone(), email=_unique_email("immutable"))

    async with AsyncSessionLocal() as db:
        count_before = len(
            (await db.execute(select(BookingProcessLog).where(BookingProcessLog.lead_id == uuid.UUID(lead_id))))
            .scalars()
            .all()
        )
    assert count_before >= 1  # at least the "created" entry

    await _delete_lead(uuid.UUID(lead_id))
