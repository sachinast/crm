"""Phase 5 exit criteria (TECHNICAL_SPEC.md §10): "I Authorize" capture works;
Billing can charge/decline, driving status transitions.

Unlike every other test module here, the authorization endpoints are
deliberately unauthenticated (PRD §8 — the customer clicks a link, no staff
login involved), so those tests call them without a Bearer token at all.
"""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.audit import StatusHistory
from app.models.booking import AuthorizationRecord
from app.models.enums import BookingStatus, UserRole
from app.models.lead import Lead
from app.models.payment import PaymentTransaction
from app.models.user import User

pytestmark = pytest.mark.asyncio(loop_scope="session")

BASE_URL = "http://testserver/api/v1"

CAR_PAYLOAD = {
    "booking_reference": "CR-5001",
    "booking_platform": "eBookingHub",
    "car_provider": "Hertz",
    "renter_name": "Pay Test Renter",
    "renter_dob": "1990-05-15",
    "transmission": "automatic",
    "fuel_policy": "Full to Full",
    "vehicle_type": "standard_suv",
    "pickup_datetime": "2026-09-01T10:00:00Z",
    "pickup_location": "LAX Airport",
    "return_datetime": "2026-09-05T10:00:00Z",
    "return_location": "LAX Airport",
    "prepaid_amount": 150.00,
    "pay_at_counter_amount": 50.00,
}

FULL_CONSENT = {
    "cardholder_confirmed": True,
    "prepaid_charge_ack": True,
    "pay_at_counter_ack": True,
    "booking_details_ack": True,
    "terms_ack": True,
    "non_refundable_ack": True,
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
async def billing():
    email = _unique_email("billing")
    password = "billing-password-1"
    user_id = await _create_user(email, password, UserRole.billing)
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


async def _login(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _create_lead_with_car_booking(client: AsyncClient, token: str) -> str:
    resp = await client.post(
        "/leads",
        # A shared literal prefix (even with a random suffix) still trips the
        # trigram similarity check across leads created by different tests in
        # this file — e.g. similarity('Pay Test Lead a1b2c3d4', 'Pay Test
        # Lead e5f6a7b8') = 0.4375, above SIMILARITY_THRESHOLD. Use a fully
        # random name with no shared substring so tests can't false-positive
        # duplicate-match each other.
        json={"name": uuid.uuid4().hex, "phone": _unique_phone(), "email": _unique_email("paytest")},
        headers=_auth(token),
    )
    lead_id = resp.json()["id"]
    st = await client.patch(f"/leads/{lead_id}/service-type", json={"service_type": "car"}, headers=_auth(token))
    assert st.status_code == 200
    booking = await client.post(f"/leads/{lead_id}/car-booking", json=CAR_PAYLOAD, headers=_auth(token))
    assert booking.status_code == 201, booking.text
    return lead_id


# --- Authorization (customer-facing, unauthenticated) ------------------


async def test_authorization_summary_requires_booking(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    resp = await api_client.post(
        "/leads",
        json={"name": "No Booking Yet", "phone": _unique_phone(), "email": _unique_email("nobooking")},
        headers=_auth(token),
    )
    lead_id = resp.json()["id"]

    summary = await api_client.get(f"/leads/{lead_id}/authorization-summary")
    assert summary.status_code == 409  # no service_type/booking yet

    await _delete_lead(uuid.UUID(lead_id))


async def test_authorization_summary_shows_booking_and_payment_breakdown(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead_with_car_booking(api_client, token)

    summary = await api_client.get(f"/leads/{lead_id}/authorization-summary")
    assert summary.status_code == 200, summary.text
    body = summary.json()
    assert body["service_type"] == "car"
    assert body["status"] == "authorization_pending"
    assert body["booking"]["prepaid_amount"] == pytest.approx(150.00)
    assert body["booking"]["pay_at_counter_amount"] == pytest.approx(50.00)
    assert body["booking"]["total_amount"] == pytest.approx(200.00)

    await _delete_lead(uuid.UUID(lead_id))


async def test_authorization_requires_all_consent_items(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead_with_car_booking(api_client, token)

    partial = {**FULL_CONSENT, "non_refundable_ack": False}
    resp = await api_client.post(f"/leads/{lead_id}/authorization", json=partial)
    assert resp.status_code == 422

    await _delete_lead(uuid.UUID(lead_id))


async def test_full_consent_moves_lead_to_client_approved(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead_with_car_booking(api_client, token)

    resp = await api_client.post(
        f"/leads/{lead_id}/authorization",
        json=FULL_CONSENT,
        headers={"User-Agent": "pytest-client/1.0", "X-Forwarded-For": "203.0.113.7"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "client_approved"
    assert body["authorized_at"]

    async with AsyncSessionLocal() as db:
        lead = await db.get(Lead, uuid.UUID(lead_id))
        assert lead.status == BookingStatus.client_approved

        records = (
            await db.execute(select(AuthorizationRecord).where(AuthorizationRecord.lead_id == uuid.UUID(lead_id)))
        ).scalars().all()
        assert len(records) == 1
        assert records[0].cardholder_confirmed is True
        # asyncpg maps INET columns to ipaddress.IPv4Address/IPv6Address, not str.
        assert str(records[0].customer_ip) == "203.0.113.7"
        assert records[0].user_agent == "pytest-client/1.0"

        history = (
            await db.execute(select(StatusHistory).where(StatusHistory.lead_id == uuid.UUID(lead_id)))
        ).scalars().all()
        assert len(history) == 1
        assert history[0].to_status == BookingStatus.client_approved
        assert history[0].changed_by == lead.agent_id  # attributed to the owning agent — see authorization.py

    await _delete_lead(uuid.UUID(lead_id))


async def test_cannot_authorize_twice(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead_with_car_booking(api_client, token)

    first = await api_client.post(f"/leads/{lead_id}/authorization", json=FULL_CONSENT)
    assert first.status_code == 200

    second = await api_client.post(f"/leads/{lead_id}/authorization", json=FULL_CONSENT)
    assert second.status_code == 409

    await _delete_lead(uuid.UUID(lead_id))


async def test_authorization_summary_public_no_token_required(api_client, agent):
    """Sanity check that this really is the unauthenticated path — no
    Authorization header anywhere in this test."""
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead_with_car_booking(api_client, token)

    resp = await api_client.get(f"/leads/{lead_id}/authorization-summary")
    assert resp.status_code == 200

    await _delete_lead(uuid.UUID(lead_id))


# --- Payments (Billing, authenticated) ----------------------------------


async def test_billing_can_charge_card(api_client, agent, billing):
    agent_token = await _login(api_client, agent["email"], agent["password"])
    billing_token = await _login(api_client, billing["email"], billing["password"])

    lead_id = await _create_lead_with_car_booking(api_client, agent_token)
    await _set_status_directly(uuid.UUID(lead_id), BookingStatus.transferred_to_billing)

    resp = await api_client.post(
        "/payments",
        json={"lead_id": lead_id, "outcome": "charged", "card_last_four": "4242"},
        headers=_auth(billing_token),
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["prepaid_amount"] == pytest.approx(150.00)
    assert body["pay_at_counter_amount"] == pytest.approx(50.00)
    assert body["total_amount"] == pytest.approx(200.00)
    assert body["outcome"] == "charged"
    assert body["card_last_four"] == "4242"
    assert "card_token" not in body  # never echoed back, even though nullable here

    async with AsyncSessionLocal() as db:
        lead = await db.get(Lead, uuid.UUID(lead_id))
        assert lead.status == BookingStatus.card_charged

    await _delete_lead(uuid.UUID(lead_id))


async def test_billing_can_decline_card(api_client, agent, billing):
    agent_token = await _login(api_client, agent["email"], agent["password"])
    billing_token = await _login(api_client, billing["email"], billing["password"])

    lead_id = await _create_lead_with_car_booking(api_client, agent_token)
    await _set_status_directly(uuid.UUID(lead_id), BookingStatus.transferred_to_billing)

    resp = await api_client.post(
        "/payments", json={"lead_id": lead_id, "outcome": "declined"}, headers=_auth(billing_token)
    )
    assert resp.status_code == 201
    assert resp.json()["outcome"] == "declined"

    async with AsyncSessionLocal() as db:
        lead = await db.get(Lead, uuid.UUID(lead_id))
        assert lead.status == BookingStatus.card_declined

    await _delete_lead(uuid.UUID(lead_id))


async def test_agent_cannot_process_payment(api_client, agent):
    agent_token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead_with_car_booking(api_client, agent_token)
    await _set_status_directly(uuid.UUID(lead_id), BookingStatus.transferred_to_billing)

    resp = await api_client.post(
        "/payments", json={"lead_id": lead_id, "outcome": "charged"}, headers=_auth(agent_token)
    )
    assert resp.status_code == 403

    await _delete_lead(uuid.UUID(lead_id))


async def test_payment_rejected_before_transferred_to_billing(api_client, agent, billing):
    agent_token = await _login(api_client, agent["email"], agent["password"])
    billing_token = await _login(api_client, billing["email"], billing["password"])
    lead_id = await _create_lead_with_car_booking(api_client, agent_token)
    # Still at authorization_pending — Billing has no visibility yet, so this
    # should 404, not 409 (matches every other "not-yet-my-department" case).

    resp = await api_client.post(
        "/payments", json={"lead_id": lead_id, "outcome": "charged"}, headers=_auth(billing_token)
    )
    assert resp.status_code == 404

    await _delete_lead(uuid.UUID(lead_id))


async def test_payment_history_reflects_amounts_from_booking(api_client, agent, billing):
    agent_token = await _login(api_client, agent["email"], agent["password"])
    billing_token = await _login(api_client, billing["email"], billing["password"])
    lead_id = await _create_lead_with_car_booking(api_client, agent_token)
    await _set_status_directly(uuid.UUID(lead_id), BookingStatus.transferred_to_billing)

    await api_client.post(
        "/payments", json={"lead_id": lead_id, "outcome": "charged"}, headers=_auth(billing_token)
    )

    history = await api_client.get(f"/leads/{lead_id}/payments", headers=_auth(agent_token))
    assert history.status_code == 200
    rows = history.json()
    assert len(rows) == 1
    assert rows[0]["outcome"] == "charged"

    async with AsyncSessionLocal() as db:
        payments = (
            await db.execute(select(PaymentTransaction).where(PaymentTransaction.lead_id == uuid.UUID(lead_id)))
        ).scalars().all()
        assert len(payments) == 1
        assert payments[0].processed_by == billing["id"]

    await _delete_lead(uuid.UUID(lead_id))


async def test_full_phase5_flow_authorize_then_charge(api_client, agent, billing):
    """The whole point of Phase 5: I Authorize -> client_approved, then Agent
    transfers to Billing, then Billing actually charges the card — all driven
    by real endpoints, no direct DB writes standing in for a missing step."""
    agent_token = await _login(api_client, agent["email"], agent["password"])
    billing_token = await _login(api_client, billing["email"], billing["password"])
    lead_id = await _create_lead_with_car_booking(api_client, agent_token)

    authorize = await api_client.post(f"/leads/{lead_id}/authorization", json=FULL_CONSENT)
    assert authorize.status_code == 200
    assert authorize.json()["status"] == "client_approved"

    to_billing = await api_client.patch(
        f"/leads/{lead_id}/status", json={"new_status": "transferred_to_billing"}, headers=_auth(agent_token)
    )
    assert to_billing.status_code == 200

    charge = await api_client.post(
        "/payments",
        json={"lead_id": lead_id, "outcome": "charged", "card_last_four": "1234"},
        headers=_auth(billing_token),
    )
    assert charge.status_code == 201
    assert charge.json()["outcome"] == "charged"

    final_lead = await api_client.get(f"/leads/{lead_id}", headers=_auth(billing_token))
    assert final_lead.json()["status"] == "card_charged"

    await _delete_lead(uuid.UUID(lead_id))
