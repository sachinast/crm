"""Master Admin — Custom Form Fields: GET /custom-fields (any authenticated
user) + POST/PATCH/DELETE /admin/custom-fields (app/api/v1/custom_fields.py,
migration 0010), and the shared validator (app/domain/custom_fields.py) that
leads.py + bookings.py's create/update endpoints run submitted values
through — proven against both a Lead and a Car booking, since one function
backs all four entity types.
"""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.custom_fields import CustomFieldDefinition
from app.models.lead import Lead
from app.models.rbac import Role
from app.models.user import User

pytestmark = pytest.mark.asyncio(loop_scope="session")

BASE_URL = "http://testserver/api/v1"

CAR_PAYLOAD = {
    "booking_reference": "CR-9001",
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


async def _delete_definition(definition_id: uuid.UUID) -> None:
    async with AsyncSessionLocal() as db:
        definition = await db.get(CustomFieldDefinition, definition_id)
        if definition is not None:
            await db.delete(definition)
            await db.commit()


@pytest.fixture
async def api_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE_URL) as client:
        yield client


@pytest.fixture
async def super_admin():
    email = _unique_email("cf-super")
    password = "correct-horse-battery-staple"
    user_id = await _create_user(email, password, "super_admin")
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


@pytest.fixture
async def agent():
    email = _unique_email("cf-agent")
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


async def test_agent_cannot_manage_custom_fields_but_can_read_them(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    readable = await api_client.get("/custom-fields", headers=_auth(token))
    assert readable.status_code == 200

    forbidden = await api_client.post(
        "/admin/custom-fields",
        json={"entity_type": "lead", "key": "nope", "label": "Nope", "field_type": "text"},
        headers=_auth(token),
    )
    assert forbidden.status_code == 403


async def test_lead_create_with_valid_and_invalid_custom_fields(api_client, super_admin, agent):
    admin_token = await _login(api_client, super_admin["email"], super_admin["password"])
    agent_token = await _login(api_client, agent["email"], agent["password"])

    key = f"referral_code_{uuid.uuid4().hex[:6]}"
    created = await api_client.post(
        "/admin/custom-fields",
        json={"entity_type": "lead", "key": key, "label": "Referral Code", "field_type": "text", "is_required": False},
        headers=_auth(admin_token),
    )
    assert created.status_code == 201, created.text
    definition_id = created.json()["id"]

    # Any authenticated user (not just admin) can read the field defs — the
    # intake form needs this.
    listed = await api_client.get("/custom-fields", params={"entity_type": "lead"}, headers=_auth(agent_token))
    assert any(d["key"] == key for d in listed.json())

    ok = await api_client.post(
        "/leads",
        json={
            "name": "CF Target",
            "phone": _unique_phone(),
            "email": _unique_email("cf"),
            "custom_fields": {key: "ABC123"},
        },
        headers=_auth(agent_token),
    )
    assert ok.status_code == 201, ok.text
    assert ok.json()["custom_fields"] == {key: "ABC123"}
    lead_id = ok.json()["id"]

    unknown = await api_client.post(
        "/leads",
        json={
            "name": "Bad CF",
            "phone": _unique_phone(),
            "email": _unique_email("badcf"),
            "custom_fields": {"not_a_real_field": "x"},
        },
        headers=_auth(agent_token),
    )
    assert unknown.status_code == 422

    # PATCH /leads/{id}/custom-fields — full replace.
    updated = await api_client.patch(
        f"/leads/{lead_id}/custom-fields", json={"custom_fields": {key: "XYZ789"}}, headers=_auth(agent_token)
    )
    assert updated.status_code == 200
    assert updated.json()["custom_fields"] == {key: "XYZ789"}

    await _delete_lead(uuid.UUID(lead_id))
    await _delete_definition(uuid.UUID(definition_id))


async def test_required_custom_field_enforced(api_client, super_admin, agent):
    admin_token = await _login(api_client, super_admin["email"], super_admin["password"])
    agent_token = await _login(api_client, agent["email"], agent["password"])

    key = f"required_note_{uuid.uuid4().hex[:6]}"
    created = await api_client.post(
        "/admin/custom-fields",
        json={"entity_type": "lead", "key": key, "label": "Required Note", "field_type": "text", "is_required": True},
        headers=_auth(admin_token),
    )
    definition_id = created.json()["id"]

    missing = await api_client.post(
        "/leads",
        json={"name": "No Note", "phone": _unique_phone(), "email": _unique_email("nonote")},
        headers=_auth(agent_token),
    )
    assert missing.status_code == 422

    provided = await api_client.post(
        "/leads",
        json={
            "name": "Has Note",
            "phone": _unique_phone(),
            "email": _unique_email("hasnote"),
            "custom_fields": {key: "here it is"},
        },
        headers=_auth(agent_token),
    )
    assert provided.status_code == 201

    await _delete_lead(uuid.UUID(provided.json()["id"]))
    await _delete_definition(uuid.UUID(definition_id))


async def test_select_field_rejects_value_outside_options(api_client, super_admin, agent):
    admin_token = await _login(api_client, super_admin["email"], super_admin["password"])
    agent_token = await _login(api_client, agent["email"], agent["password"])

    key = f"priority_{uuid.uuid4().hex[:6]}"
    created = await api_client.post(
        "/admin/custom-fields",
        json={
            "entity_type": "lead",
            "key": key,
            "label": "Priority",
            "field_type": "select",
            "options": ["low", "medium", "high"],
        },
        headers=_auth(admin_token),
    )
    definition_id = created.json()["id"]

    bad = await api_client.post(
        "/leads",
        json={
            "name": "Bad Priority",
            "phone": _unique_phone(),
            "email": _unique_email("badpriority"),
            "custom_fields": {key: "urgent"},
        },
        headers=_auth(agent_token),
    )
    assert bad.status_code == 422

    good = await api_client.post(
        "/leads",
        json={
            "name": "Good Priority",
            "phone": _unique_phone(),
            "email": _unique_email("goodpriority"),
            "custom_fields": {key: "high"},
        },
        headers=_auth(agent_token),
    )
    assert good.status_code == 201

    await _delete_lead(uuid.UUID(good.json()["id"]))
    await _delete_definition(uuid.UUID(definition_id))


async def test_custom_fields_validated_on_car_booking_too(api_client, super_admin, agent):
    """Same shared validator, a different entity_type — proves it's not
    special-cased to leads."""
    admin_token = await _login(api_client, super_admin["email"], super_admin["password"])
    agent_token = await _login(api_client, agent["email"], agent["password"])

    key = f"insurance_waiver_{uuid.uuid4().hex[:6]}"
    created = await api_client.post(
        "/admin/custom-fields",
        json={"entity_type": "car_booking", "key": key, "label": "Insurance Waiver", "field_type": "checkbox"},
        headers=_auth(admin_token),
    )
    definition_id = created.json()["id"]

    lead_resp = await api_client.post(
        "/leads",
        json={"name": f"Car_CF_{uuid.uuid4().hex[:8]}", "phone": _unique_phone(), "email": _unique_email("carcf")},
        headers=_auth(agent_token),
    )
    lead_id = lead_resp.json()["id"]
    if lead_resp.json().get("is_duplicate"):
        await api_client.post(
            f"/leads/{lead_id}/confirm",
            json={"reason": "Test duplicate override"},
            headers=_auth(agent_token),
        )
    await api_client.patch(f"/leads/{lead_id}/service-type", json={"service_type": "car"}, headers=_auth(agent_token))

    bad_type = await api_client.post(
        f"/leads/{lead_id}/car-booking",
        json={**CAR_PAYLOAD, "custom_fields": {key: "not-a-bool"}},
        headers=_auth(agent_token),
    )
    assert bad_type.status_code == 422

    good = await api_client.post(
        f"/leads/{lead_id}/car-booking",
        json={**CAR_PAYLOAD, "custom_fields": {key: True}},
        headers=_auth(agent_token),
    )
    assert good.status_code == 201, good.text
    assert good.json()["custom_fields"] == {key: True}

    await _delete_lead(uuid.UUID(lead_id))
    await _delete_definition(uuid.UUID(definition_id))
