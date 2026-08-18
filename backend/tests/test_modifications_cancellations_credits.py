"""Phase 6 exit criteria (TECHNICAL_SPEC.md §10): Original-vs-revised diff
captured correctly; refund math verified against PRD §7.2 formulas; future
credits restricted to TL/CS on write, broader read access.
"""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.booking import FutureCredit
from app.models.enums import BookingStatus
from app.models.lead import Lead
from app.models.rbac import Role
from app.models.user import User

pytestmark = pytest.mark.asyncio(loop_scope="session")

BASE_URL = "http://testserver/api/v1"

CAR_PAYLOAD = {
    "booking_reference": "CR-6001",
    "booking_platform": "eBookingHub",
    "car_provider": "Hertz",
    "renter_name": "Mod Test Renter",
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
        # future_credits.source_lead_id has no ON DELETE CASCADE (it's a
        # reference for provenance, not an owned child row) — clear those first.
        await db.execute(delete(FutureCredit).where(FutureCredit.source_lead_id == lead_id))
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
async def change_dep():
    email = _unique_email("changedep")
    password = "changedep-password-1"
    user_id = await _create_user(email, password, "change_dep")
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


@pytest.fixture
async def tl():
    email = _unique_email("tl")
    password = "tl-password-12345"
    user_id = await _create_user(email, password, "tl")
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


@pytest.fixture
async def cs():
    email = _unique_email("cs")
    password = "cs-password-12345"
    user_id = await _create_user(email, password, "cs")
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


@pytest.fixture
async def billing():
    email = _unique_email("billing")
    password = "billing-password-1"
    user_id = await _create_user(email, password, "billing")
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
        json={"name": uuid.uuid4().hex, "phone": _unique_phone(), "email": _unique_email("modtest")},
        headers=_auth(token),
    )
    lead_id = resp.json()["id"]
    st = await client.patch(f"/leads/{lead_id}/service-type", json={"service_type": "car"}, headers=_auth(token))
    assert st.status_code == 200
    booking = await client.post(f"/leads/{lead_id}/car-booking", json=CAR_PAYLOAD, headers=_auth(token))
    assert booking.status_code == 201, booking.text
    return lead_id


async def _set_status_directly(lead_id: str, status_: BookingStatus) -> None:
    """Stand-in for the rest of the status chain (client_approved -> ... ->
    tag_change_dep) that other test modules already exercise in full — here
    we only care that Change Dep can act once a lead is actually tagged to
    them, matching PRD §3.2 "Status-Based Sharing"."""
    async with AsyncSessionLocal() as db:
        lead = await db.get(Lead, uuid.UUID(lead_id))
        lead.status = status_
        await db.commit()


async def _create_lead_ready_for_change_dep(client: AsyncClient, token: str) -> str:
    lead_id = await _create_lead_with_car_booking(client, token)
    await _set_status_directly(lead_id, BookingStatus.tag_change_dep)
    return lead_id


# --- Modifications --------------------------------------------------------


async def test_agent_cannot_create_modification(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead_with_car_booking(api_client, token)

    resp = await api_client.post(
        f"/leads/{lead_id}/modifications",
        json={"field_name": "pickup_location", "original_value": "LAX Airport", "revised_value": "SFO Airport"},
        headers=_auth(token),
    )
    assert resp.status_code == 403

    await _delete_lead(uuid.UUID(lead_id))


async def test_modification_requires_booking(api_client, agent, change_dep):
    token = await _login(api_client, agent["email"], agent["password"])
    change_dep_token = await _login(api_client, change_dep["email"], change_dep["password"])

    resp = await api_client.post(
        "/leads",
        json={"name": uuid.uuid4().hex, "phone": _unique_phone(), "email": _unique_email("nobooking")},
        headers=_auth(token),
    )
    lead_id = resp.json()["id"]

    mod = await api_client.post(
        f"/leads/{lead_id}/modifications",
        json={"field_name": "pickup_location", "original_value": "A", "revised_value": "B"},
        headers=_auth(change_dep_token),
    )
    assert mod.status_code == 404  # change_dep has no visibility yet either (no relevant status)

    await _delete_lead(uuid.UUID(lead_id))


async def test_modification_amount_auto_computed_for_numeric_fields(api_client, agent, change_dep):
    agent_token = await _login(api_client, agent["email"], agent["password"])
    change_dep_token = await _login(api_client, change_dep["email"], change_dep["password"])
    lead_id = await _create_lead_ready_for_change_dep(api_client, agent_token)

    resp = await api_client.post(
        f"/leads/{lead_id}/modifications",
        json={"field_name": "prepaid_amount", "original_value": 150.00, "revised_value": 190.00},
        headers=_auth(change_dep_token),
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["modification_amount"] == pytest.approx(40.00)
    assert body["field_name"] == "prepaid_amount"

    await _delete_lead(uuid.UUID(lead_id))


async def test_modification_amount_defaults_to_zero_for_non_numeric_fields(api_client, agent, change_dep):
    agent_token = await _login(api_client, agent["email"], agent["password"])
    change_dep_token = await _login(api_client, change_dep["email"], change_dep["password"])
    lead_id = await _create_lead_ready_for_change_dep(api_client, agent_token)

    resp = await api_client.post(
        f"/leads/{lead_id}/modifications",
        json={"field_name": "pickup_location", "original_value": "LAX Airport", "revised_value": "SFO Airport"},
        headers=_auth(change_dep_token),
    )
    assert resp.status_code == 201
    assert resp.json()["modification_amount"] == pytest.approx(0.0)

    await _delete_lead(uuid.UUID(lead_id))


async def test_modification_explicit_amount_overrides_default(api_client, agent, change_dep):
    agent_token = await _login(api_client, agent["email"], agent["password"])
    change_dep_token = await _login(api_client, change_dep["email"], change_dep["password"])
    lead_id = await _create_lead_ready_for_change_dep(api_client, agent_token)

    resp = await api_client.post(
        f"/leads/{lead_id}/modifications",
        json={
            "field_name": "vehicle_type",
            "original_value": "standard_suv",
            "revised_value": "luxury",
            "modification_amount": 75.00,
        },
        headers=_auth(change_dep_token),
    )
    assert resp.status_code == 201
    assert resp.json()["modification_amount"] == pytest.approx(75.00)

    await _delete_lead(uuid.UUID(lead_id))


async def test_modification_history_lists_most_recent_first(api_client, agent, change_dep):
    agent_token = await _login(api_client, agent["email"], agent["password"])
    change_dep_token = await _login(api_client, change_dep["email"], change_dep["password"])
    lead_id = await _create_lead_ready_for_change_dep(api_client, agent_token)

    await api_client.post(
        f"/leads/{lead_id}/modifications",
        json={"field_name": "pickup_location", "original_value": "LAX Airport", "revised_value": "SFO Airport"},
        headers=_auth(change_dep_token),
    )
    await api_client.post(
        f"/leads/{lead_id}/modifications",
        json={"field_name": "return_location", "original_value": "LAX Airport", "revised_value": "SFO Airport"},
        headers=_auth(change_dep_token),
    )

    # Agent (owner) can read the history too — read access follows lead
    # visibility, not the modification-role allowlist.
    history = await api_client.get(f"/leads/{lead_id}/modifications", headers=_auth(agent_token))
    assert history.status_code == 200
    rows = history.json()
    assert len(rows) == 2
    assert rows[0]["field_name"] == "return_location"
    assert rows[1]["field_name"] == "pickup_location"

    await _delete_lead(uuid.UUID(lead_id))


# --- Cancellations ----------------------------------------------------


async def test_cancellation_refund_math(api_client, agent, change_dep):
    """PRD §7.2: Refund = max(prepaid - penalty, 0); Retained = min(penalty, prepaid)."""
    agent_token = await _login(api_client, agent["email"], agent["password"])
    change_dep_token = await _login(api_client, change_dep["email"], change_dep["password"])
    lead_id = await _create_lead_ready_for_change_dep(api_client, agent_token)  # prepaid_amount = 150.00

    resp = await api_client.post(
        f"/leads/{lead_id}/cancellation", json={"cancellation_penalty_fee": 40.00}, headers=_auth(change_dep_token)
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["original_prepaid_amount"] == pytest.approx(150.00)
    assert body["cancellation_penalty_fee"] == pytest.approx(40.00)
    assert body["refund_amount"] == pytest.approx(110.00)
    assert body["final_retained_amount"] == pytest.approx(40.00)

    await _delete_lead(uuid.UUID(lead_id))


async def test_cancellation_penalty_exceeding_prepaid_clamps_correctly(api_client, agent, change_dep):
    """Penalty larger than what was ever paid: refund floors at 0, retained
    caps at what was actually collected — the agency can't keep more than the
    customer paid."""
    agent_token = await _login(api_client, agent["email"], agent["password"])
    change_dep_token = await _login(api_client, change_dep["email"], change_dep["password"])
    lead_id = await _create_lead_ready_for_change_dep(api_client, agent_token)  # prepaid_amount = 150.00

    resp = await api_client.post(
        f"/leads/{lead_id}/cancellation", json={"cancellation_penalty_fee": 500.00}, headers=_auth(change_dep_token)
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["refund_amount"] == pytest.approx(0.0)
    assert body["final_retained_amount"] == pytest.approx(150.00)

    await _delete_lead(uuid.UUID(lead_id))


async def test_cannot_cancel_twice(api_client, agent, change_dep):
    agent_token = await _login(api_client, agent["email"], agent["password"])
    change_dep_token = await _login(api_client, change_dep["email"], change_dep["password"])
    lead_id = await _create_lead_ready_for_change_dep(api_client, agent_token)

    first = await api_client.post(
        f"/leads/{lead_id}/cancellation", json={"cancellation_penalty_fee": 20.00}, headers=_auth(change_dep_token)
    )
    assert first.status_code == 201

    second = await api_client.post(
        f"/leads/{lead_id}/cancellation", json={"cancellation_penalty_fee": 20.00}, headers=_auth(change_dep_token)
    )
    assert second.status_code == 409

    get_resp = await api_client.get(f"/leads/{lead_id}/cancellation", headers=_auth(agent_token))
    assert get_resp.status_code == 200

    await _delete_lead(uuid.UUID(lead_id))


async def test_get_cancellation_404_when_none_exists(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead_with_car_booking(api_client, token)

    resp = await api_client.get(f"/leads/{lead_id}/cancellation", headers=_auth(token))
    assert resp.status_code == 404

    await _delete_lead(uuid.UUID(lead_id))


# --- Future credits -----------------------------------------------------


async def test_only_tl_and_cs_can_create_future_credit(api_client, agent, tl, cs):
    agent_token = await _login(api_client, agent["email"], agent["password"])
    tl_token = await _login(api_client, tl["email"], tl["password"])
    cs_token = await _login(api_client, cs["email"], cs["password"])
    lead_id = await _create_lead_with_car_booking(api_client, agent_token)

    blocked = await api_client.post(
        "/future-credits",
        json={"source_lead_id": lead_id, "voucher_amount": 50.00, "validity_date": "2027-01-01"},
        headers=_auth(agent_token),
    )
    assert blocked.status_code == 403

    by_tl = await api_client.post(
        "/future-credits",
        json={"source_lead_id": lead_id, "voucher_amount": 50.00, "validity_date": "2027-01-01"},
        headers=_auth(tl_token),
    )
    assert by_tl.status_code == 201, by_tl.text

    by_cs = await api_client.post(
        "/future-credits",
        json={"source_lead_id": lead_id, "voucher_amount": 25.00, "number_of_vouchers": 2, "validity_date": "2027-06-01"},
        headers=_auth(cs_token),
    )
    assert by_cs.status_code == 201
    assert by_cs.json()["number_of_vouchers"] == 2

    await _delete_lead(uuid.UUID(lead_id))


async def test_future_credit_read_access_matches_prd_role_list(api_client, agent, tl, billing):
    agent_token = await _login(api_client, agent["email"], agent["password"])
    tl_token = await _login(api_client, tl["email"], tl["password"])
    billing_token = await _login(api_client, billing["email"], billing["password"])
    lead_id = await _create_lead_with_car_booking(api_client, agent_token)

    await api_client.post(
        "/future-credits",
        json={"source_lead_id": lead_id, "voucher_amount": 30.00, "validity_date": "2027-01-01"},
        headers=_auth(tl_token),
    )

    # Billing has read access per PRD §7.3.
    billing_list = await api_client.get("/future-credits", params={"source_lead_id": lead_id}, headers=_auth(billing_token))
    assert billing_list.status_code == 200
    assert len(billing_list.json()) == 1

    # Agent is not in the PRD's read list for future credits.
    agent_list = await api_client.get("/future-credits", headers=_auth(agent_token))
    assert agent_list.status_code == 403

    await _delete_lead(uuid.UUID(lead_id))
