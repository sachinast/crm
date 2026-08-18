"""Dashboard summary: each role sees exactly the figures it has permission
to see (reusing apply_lead_visibility / the future-credits read list — no
parallel access model), and nothing it doesn't.
"""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.enums import BookingStatus, UserRole
from app.models.lead import Lead
from app.models.user import User

pytestmark = pytest.mark.asyncio(loop_scope="session")

BASE_URL = "http://testserver/api/v1"

CAR_PAYLOAD = {
    "booking_reference": "CR-DASH-001",
    "booking_platform": "eBookingHub",
    "car_provider": "Hertz",
    "renter_name": "Dash Renter",
    "renter_dob": "1990-01-01",
    "transmission": "automatic",
    "fuel_policy": "Full to Full",
    "vehicle_type": "standard_suv",
    "pickup_datetime": "2026-09-01T10:00:00Z",
    "pickup_location": "LAX",
    "return_datetime": "2026-09-05T10:00:00Z",
    "return_location": "LAX",
    "prepaid_amount": 150.00,
    "pay_at_counter_amount": 50.00,
}


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


async def _set_status_directly(lead_id: uuid.UUID, status_: BookingStatus) -> None:
    async with AsyncSessionLocal() as db:
        lead = await db.get(Lead, lead_id)
        lead.status = status_
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
    user_id = await _create_user(email, password, UserRole.agent)
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


@pytest.fixture
async def other_agent():
    email = _unique_email("agent2")
    password = "agent-password-456"
    user_id = await _create_user(email, password, UserRole.agent)
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


@pytest.fixture
async def billing():
    email = _unique_email("billing")
    password = "billing-password-1"
    user_id = await _create_user(email, password, UserRole.billing)
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


@pytest.fixture
async def admin():
    email = _unique_email("admin")
    password = "admin-password-123"
    user_id = await _create_user(email, password, UserRole.admin)
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


async def _login(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def test_agent_sees_only_own_leads_in_summary(api_client, agent, other_agent):
    agent_token = await _login(api_client, agent["email"], agent["password"])
    other_token = await _login(api_client, other_agent["email"], other_agent["password"])

    resp = await api_client.post(
        "/leads",
        json={"name": uuid.uuid4().hex, "phone": _unique_phone(), "email": _unique_email("dashagent")},
        headers=_auth(agent_token),
    )
    lead_id = resp.json()["id"]

    summary = await api_client.get("/dashboard/summary", headers=_auth(agent_token))
    assert summary.status_code == 200
    body = summary.json()
    assert body["total_visible_leads"] >= 1
    assert any(r["id"] == lead_id for r in body["recent_leads"])
    # Agent-role figures shouldn't leak billing/system stats.
    assert body["total_revenue"] is None
    assert body["total_users"] is None

    other_summary = await api_client.get("/dashboard/summary", headers=_auth(other_token))
    other_body = other_summary.json()
    assert all(r["id"] != lead_id for r in other_body["recent_leads"])

    await _delete_lead(uuid.UUID(lead_id))


async def test_recent_leads_are_masked(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    email = "dashmask@example.com"
    resp = await api_client.post(
        "/leads",
        json={"name": uuid.uuid4().hex, "phone": _unique_phone(), "email": email},
        headers=_auth(token),
    )
    lead_id = resp.json()["id"]

    summary = await api_client.get("/dashboard/summary", headers=_auth(token))
    row = next(r for r in summary.json()["recent_leads"] if r["id"] == lead_id)
    assert row["email"] != email
    assert "*" in row["email"]

    await _delete_lead(uuid.UUID(lead_id))


async def test_billing_sees_pending_payment_count_not_admin_stats(api_client, agent, billing):
    agent_token = await _login(api_client, agent["email"], agent["password"])
    billing_token = await _login(api_client, billing["email"], billing["password"])

    resp = await api_client.post(
        "/leads",
        json={"name": uuid.uuid4().hex, "phone": _unique_phone(), "email": _unique_email("dashbilling")},
        headers=_auth(agent_token),
    )
    lead_id = resp.json()["id"]
    await _set_status_directly(uuid.UUID(lead_id), BookingStatus.transferred_to_billing)

    summary = await api_client.get("/dashboard/summary", headers=_auth(billing_token))
    assert summary.status_code == 200
    body = summary.json()
    assert body["pending_payment_count"] >= 1
    assert body["total_users"] is None  # billing isn't an admin stat

    await _delete_lead(uuid.UUID(lead_id))


async def test_admin_sees_system_stats_and_total_revenue(api_client, admin):
    token = await _login(api_client, admin["email"], admin["password"])
    summary = await api_client.get("/dashboard/summary", headers=_auth(token))
    assert summary.status_code == 200
    body = summary.json()
    assert body["total_users"] is not None
    assert body["total_users"] >= 1
    assert body["total_revenue"] is not None
    assert body["active_integrations"] is not None
    assert body["future_credits_issued_count"] is not None


async def test_dashboard_requires_auth(api_client):
    resp = await api_client.get("/dashboard/summary")
    assert resp.status_code == 401
