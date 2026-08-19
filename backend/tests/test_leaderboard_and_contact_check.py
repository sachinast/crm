"""Two small features: the dashboard's Top 5 Performers leaderboard
(app/api/v1/dashboard.py, revenue attributed to the lead-owning agent) and
GET /leads/check-contact — the live green/red-tick duplicate hint the intake
form debounces against as an agent types (app/api/v1/leads.py).
"""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.enums import BookingStatus
from app.models.lead import Lead
from app.models.rbac import Role
from app.models.user import User

pytestmark = pytest.mark.asyncio(loop_scope="session")

BASE_URL = "http://testserver/api/v1"

CAR_PAYLOAD = {
    "booking_reference": "CR-LB-001",
    "booking_platform": "eBookingHub",
    "car_provider": "Hertz",
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


def _unique_email(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}@example.com"


def _unique_phone() -> str:
    return f"+1555{uuid.uuid4().int % 10_000_000:07d}"


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


async def _set_status_directly(lead_id: uuid.UUID, status_: BookingStatus) -> None:
    async with AsyncSessionLocal() as db:
        lead = await db.get(Lead, lead_id)
        lead.status = status_
        await db.commit()


@pytest.fixture
async def api_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE_URL) as client:
        yield client


@pytest.fixture
async def agent():
    email = _unique_email("lb-agent")
    password = "agent-password-123"
    user_id = await _create_user(email, password, "agent")
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


@pytest.fixture
async def billing():
    email = _unique_email("lb-billing")
    password = "billing-password-1"
    user_id = await _create_user(email, password, "billing")
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


@pytest.fixture
async def admin():
    email = _unique_email("lb-admin")
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


async def _create_charged_lead(client: AsyncClient, agent_token: str, billing_token: str) -> str:
    resp = await client.post(
        "/leads",
        json={"name": uuid.uuid4().hex, "phone": _unique_phone(), "email": _unique_email("lbtest")},
        headers=_auth(agent_token),
    )
    lead_id = resp.json()["id"]
    await client.patch(f"/leads/{lead_id}/service-type", json={"service_type": "car"}, headers=_auth(agent_token))
    await client.post(f"/leads/{lead_id}/car-booking", json=CAR_PAYLOAD, headers=_auth(agent_token))
    await _set_status_directly(uuid.UUID(lead_id), BookingStatus.transferred_to_billing)
    charge = await client.post(
        "/payments", json={"lead_id": lead_id, "outcome": "charged", "card_last_four": "4242"},
        headers=_auth(billing_token),
    )
    assert charge.status_code == 201, charge.text
    return lead_id


async def test_leaderboard_ranks_agent_by_lead_owned_revenue(api_client, agent, billing, admin):
    agent_token = await _login(api_client, agent["email"], agent["password"])
    billing_token = await _login(api_client, billing["email"], billing["password"])
    admin_token = await _login(api_client, admin["email"], admin["password"])

    lead_id = await _create_charged_lead(api_client, agent_token, billing_token)

    resp = await api_client.get("/dashboard/summary", headers=_auth(admin_token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["leaderboard"] is not None

    entry = next((e for e in body["leaderboard"] if e["agent_id"] == str(agent["id"])), None)
    assert entry is not None, body["leaderboard"]
    assert entry["revenue"] >= 200.00
    assert entry["bookings_count"] >= 1

    await _delete_lead(uuid.UUID(lead_id))


async def test_leaderboard_not_shown_to_agent(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    resp = await api_client.get("/dashboard/summary", headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["leaderboard"] is None


async def test_check_contact_flags_existing_email_and_phone(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    email = _unique_email("checkcontact")
    phone = _unique_phone()

    created = await api_client.post(
        "/leads", json={"name": "Contact Check Target", "phone": phone, "email": email}, headers=_auth(token)
    )
    lead_id = created.json()["id"]

    exists = await api_client.get("/leads/check-contact", params={"email": email, "phone": phone}, headers=_auth(token))
    assert exists.status_code == 200
    body = exists.json()
    assert body["email_exists"] is True
    assert body["phone_exists"] is True

    fresh = await api_client.get(
        "/leads/check-contact",
        params={"email": _unique_email("fresh"), "phone": _unique_phone()},
        headers=_auth(token),
    )
    fresh_body = fresh.json()
    assert fresh_body["email_exists"] is False
    assert fresh_body["phone_exists"] is False

    await _delete_lead(uuid.UUID(lead_id))


async def test_check_contact_only_checks_supplied_fields(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    resp = await api_client.get("/leads/check-contact", params={"email": _unique_email("onlyemail")}, headers=_auth(token))
    body = resp.json()
    assert body["email_exists"] is False
    assert body["phone_exists"] is None
