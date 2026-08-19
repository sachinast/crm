"""Phase 3 exit criteria (TECHNICAL_SPEC.md §10): each booking module's fields
persist and are readable back — car, hotel, and flight, plus the
service-type-match and one-booking-per-lead guards.
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
            await db.delete(lead)  # cascades to the booking row (ON DELETE CASCADE)
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


async def _login(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _create_lead(client: AsyncClient, token: str, service_type: str | None = None) -> str:
    resp = await client.post(
        "/leads",
        json={"name": "Booking Target", "phone": _unique_phone(), "email": _unique_email("booking")},
        headers=_auth(token),
    )
    assert resp.status_code == 201, resp.text
    lead_id = resp.json()["id"]
    if service_type:
        st = await client.patch(f"/leads/{lead_id}/service-type", json={"service_type": service_type}, headers=_auth(token))
        assert st.status_code == 200, st.text
    return lead_id


CAR_PAYLOAD = {
    "booking_reference": "CR-1001",
    "booking_platform": "eBookingHub",
    "car_provider": "Hertz",
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

HOTEL_PAYLOAD = {
    "booking_reference": "HT-2001",
    "booking_platform": "Our Booking",
    "hotel_name": "Grand Plaza",
    "room_type": "King Suite",
    "location": "Las Vegas, NV",
    "check_in_date": "2026-10-01",
    "check_out_date": "2026-10-05",
    "prepaid_amount": 400.00,
    "pay_at_counter_amount": 0,
}

FLIGHT_PAYLOAD = {
    "booking_reference": "FL-3001",
    "pnr": "ABC123",
    "airline": "Delta",
    "flight_numbers": ["DL123", "DL456"],
    "origin": "JFK",
    "destination": "LAX",
    "cabin_class": "Economy",
    "prepaid_amount": 320.50,
    "pay_at_counter_amount": 0,
}


async def test_car_booking_full_lifecycle(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead(api_client, token, service_type="car")

    created = await api_client.post(f"/leads/{lead_id}/car-booking", json=CAR_PAYLOAD, headers=_auth(token))
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["lead_id"] == lead_id
    assert body["car_provider"] == "Hertz"
    assert body["vehicle_type"] == "standard_suv"
    # total_amount is DB-computed, not client-supplied.
    assert body["total_amount"] == pytest.approx(200.00)

    fetched = await api_client.get(f"/leads/{lead_id}/car-booking", headers=_auth(token))
    assert fetched.status_code == 200
    assert fetched.json()["booking_reference"] == "CR-1001"

    updated = await api_client.patch(
        f"/leads/{lead_id}/car-booking", json={"pay_at_counter_amount": 75.00}, headers=_auth(token)
    )
    assert updated.status_code == 200
    assert updated.json()["total_amount"] == pytest.approx(225.00)

    await _delete_lead(uuid.UUID(lead_id))


async def test_hotel_booking_full_lifecycle(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead(api_client, token, service_type="hotel")

    created = await api_client.post(f"/leads/{lead_id}/hotel-booking", json=HOTEL_PAYLOAD, headers=_auth(token))
    assert created.status_code == 201, created.text
    assert created.json()["hotel_name"] == "Grand Plaza"
    assert created.json()["total_amount"] == pytest.approx(400.00)

    await _delete_lead(uuid.UUID(lead_id))


async def test_hotel_checkout_before_checkin_rejected(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead(api_client, token, service_type="hotel")

    bad_payload = {**HOTEL_PAYLOAD, "check_in_date": "2026-10-05", "check_out_date": "2026-10-01"}
    resp = await api_client.post(f"/leads/{lead_id}/hotel-booking", json=bad_payload, headers=_auth(token))
    assert resp.status_code == 422

    await _delete_lead(uuid.UUID(lead_id))


async def test_flight_booking_full_lifecycle(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead(api_client, token, service_type="flight")

    created = await api_client.post(f"/leads/{lead_id}/flight-booking", json=FLIGHT_PAYLOAD, headers=_auth(token))
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["pnr"] == "ABC123"
    assert body["flight_numbers"] == ["DL123", "DL456"]
    assert body["total_amount"] == pytest.approx(320.50)

    await _delete_lead(uuid.UUID(lead_id))


async def test_car_booking_rejected_when_service_type_mismatched(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead(api_client, token, service_type="hotel")

    resp = await api_client.post(f"/leads/{lead_id}/car-booking", json=CAR_PAYLOAD, headers=_auth(token))
    assert resp.status_code == 409

    await _delete_lead(uuid.UUID(lead_id))


async def test_booking_rejected_when_service_type_unset(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead(api_client, token)  # no service_type set

    resp = await api_client.post(f"/leads/{lead_id}/car-booking", json=CAR_PAYLOAD, headers=_auth(token))
    assert resp.status_code == 409

    await _delete_lead(uuid.UUID(lead_id))


async def test_duplicate_booking_creation_rejected(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead(api_client, token, service_type="car")

    first = await api_client.post(f"/leads/{lead_id}/car-booking", json=CAR_PAYLOAD, headers=_auth(token))
    assert first.status_code == 201

    second = await api_client.post(f"/leads/{lead_id}/car-booking", json=CAR_PAYLOAD, headers=_auth(token))
    assert second.status_code == 409

    await _delete_lead(uuid.UUID(lead_id))


async def test_car_booking_return_before_pickup_rejected(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead(api_client, token, service_type="car")

    bad_payload = {**CAR_PAYLOAD, "pickup_datetime": "2026-09-05T10:00:00Z", "return_datetime": "2026-09-01T10:00:00Z"}
    resp = await api_client.post(f"/leads/{lead_id}/car-booking", json=bad_payload, headers=_auth(token))
    assert resp.status_code == 422

    await _delete_lead(uuid.UUID(lead_id))


async def test_get_booking_404_when_none_exists(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead(api_client, token, service_type="flight")

    resp = await api_client.get(f"/leads/{lead_id}/flight-booking", headers=_auth(token))
    assert resp.status_code == 404

    await _delete_lead(uuid.UUID(lead_id))


async def test_booking_endpoints_respect_lead_visibility(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead(api_client, token, service_type="car")
    await api_client.post(f"/leads/{lead_id}/car-booking", json=CAR_PAYLOAD, headers=_auth(token))

    other_email = _unique_email("otheragent")
    other_id = await _create_user(other_email, "other-password-123", "agent")
    try:
        other_token = await _login(api_client, other_email, "other-password-123")
        resp = await api_client.get(f"/leads/{lead_id}/car-booking", headers=_auth(other_token))
        assert resp.status_code == 404  # lead itself isn't visible, not just the booking
    finally:
        await _delete_user(other_id)
        await _delete_lead(uuid.UUID(lead_id))
