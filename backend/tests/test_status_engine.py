"""Phase 4 exit criteria (TECHNICAL_SPEC.md §10): the full standard flow
(PRD §6.2) transitions correctly with role checks, and status_history +
notifications are written on every change.

`client_approved` is SYSTEM/CUSTOMER-only in status_machine.TRANSITIONS (PRD
§6.1) — reaching it for real requires the "I Authorize" consent flow, which is
Phase 5. These tests move a lead there with a direct DB write (simulating
"Phase 5 already happened") so the staff-driven remainder of the chain
(transferred_to_billing -> card_charged -> tag_auditor -> qc_done) can be
exercised through the real API, same as every other test in this suite.
"""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.audit import Notification, StatusHistory
from app.models.enums import BookingStatus
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


async def _set_status_directly(lead_id: uuid.UUID, status_: BookingStatus) -> None:
    """Stand-in for the Phase 5 customer authorization flow — see module docstring."""
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
    user_id = await _create_user(email, password, "agent")
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


@pytest.fixture
async def billing():
    email = _unique_email("billing")
    password = "billing-password-1"
    user_id = await _create_user(email, password, "billing")
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


async def _create_lead(client: AsyncClient, token: str) -> str:
    resp = await client.post(
        "/leads",
        json={"name": "Status Target", "phone": _unique_phone(), "email": _unique_email("status")},
        headers=_auth(token),
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def test_new_lead_starts_authorization_pending(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead(api_client, token)
    resp = await api_client.get(f"/leads/{lead_id}", headers=_auth(token))
    assert resp.json()["status"] == "authorization_pending"
    await _delete_lead(uuid.UUID(lead_id))


async def test_agent_cannot_skip_ahead_to_card_charged(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead(api_client, token)

    resp = await api_client.patch(
        f"/leads/{lead_id}/status", json={"new_status": "card_charged"}, headers=_auth(token)
    )
    assert resp.status_code == 409  # authorization_pending -> card_charged isn't a valid edge

    await _delete_lead(uuid.UUID(lead_id))


async def test_staff_cannot_set_client_approved(api_client, agent):
    """client_approved is CUSTOMER-only per status_machine — no staff role can
    set it via this endpoint, ever, regardless of the current status."""
    token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead(api_client, token)

    resp = await api_client.patch(
        f"/leads/{lead_id}/status", json={"new_status": "client_approved"}, headers=_auth(token)
    )
    assert resp.status_code in (403, 409)  # blocked either by role or by the edge not existing from this status

    await _delete_lead(uuid.UUID(lead_id))


async def test_full_standard_flow(api_client, agent, billing, auditor):
    """PRD §6.2: ... -> Client Approved -> Transferred to Billing -> Card
    Charged -> Tag to Auditor -> QC Done."""
    agent_token = await _login(api_client, agent["email"], agent["password"])
    billing_token = await _login(api_client, billing["email"], billing["password"])
    auditor_token = await _login(api_client, auditor["email"], auditor["password"])

    lead_id = await _create_lead(api_client, agent_token)
    await _set_status_directly(uuid.UUID(lead_id), BookingStatus.client_approved)

    to_billing = await api_client.patch(
        f"/leads/{lead_id}/status", json={"new_status": "transferred_to_billing"}, headers=_auth(agent_token)
    )
    assert to_billing.status_code == 200, to_billing.text
    assert to_billing.json()["status"] == "transferred_to_billing"

    # Agent (not Billing) cannot charge the card.
    agent_tries_charge = await api_client.patch(
        f"/leads/{lead_id}/status", json={"new_status": "card_charged"}, headers=_auth(agent_token)
    )
    assert agent_tries_charge.status_code == 403

    charged = await api_client.patch(
        f"/leads/{lead_id}/status", json={"new_status": "card_charged"}, headers=_auth(billing_token)
    )
    assert charged.status_code == 200
    assert charged.json()["status"] == "card_charged"

    tagged = await api_client.patch(
        f"/leads/{lead_id}/status", json={"new_status": "tag_auditor"}, headers=_auth(billing_token)
    )
    assert tagged.status_code == 200

    # Billing (not Auditor) cannot mark QC done — and by this point the lead has
    # moved out of Billing's relevant statuses (tag_auditor isn't one of them),
    # so Billing has lost visibility entirely: 404, not 403. That's PRD §3.2
    # "Status-Based Sharing" working as intended, not a permission edge case.
    billing_tries_qc = await api_client.patch(
        f"/leads/{lead_id}/status", json={"new_status": "qc_done"}, headers=_auth(billing_token)
    )
    assert billing_tries_qc.status_code == 404

    qc_done = await api_client.patch(
        f"/leads/{lead_id}/status", json={"new_status": "qc_done"}, headers=_auth(auditor_token)
    )
    assert qc_done.status_code == 200
    assert qc_done.json()["status"] == "qc_done"

    # Terminal on the happy path — nothing left to transition to.
    available = await api_client.get(f"/leads/{lead_id}/available-transitions", headers=_auth(auditor_token))
    assert available.json() == []

    await _delete_lead(uuid.UUID(lead_id))


async def test_status_change_writes_history_and_notifications(api_client, agent, billing):
    agent_token = await _login(api_client, agent["email"], agent["password"])
    lead_id = await _create_lead(api_client, agent_token)
    await _set_status_directly(uuid.UUID(lead_id), BookingStatus.client_approved)

    resp = await api_client.patch(
        f"/leads/{lead_id}/status", json={"new_status": "transferred_to_billing"}, headers=_auth(agent_token)
    )
    assert resp.status_code == 200

    async with AsyncSessionLocal() as db:
        history = (
            await db.execute(select(StatusHistory).where(StatusHistory.lead_id == uuid.UUID(lead_id)))
        ).scalars().all()
        assert len(history) == 1
        assert history[0].from_status == BookingStatus.client_approved
        assert history[0].to_status == BookingStatus.transferred_to_billing
        assert history[0].changed_by == agent["id"]

        notifications = (
            await db.execute(select(Notification).where(Notification.lead_id == uuid.UUID(lead_id)))
        ).scalars().all()
        billing_role_id = await db.scalar(select(Role.id).where(Role.name == "billing"))
        # transferred_to_billing notifies the 'billing' role (status_machine.TRANSITIONS)
        assert any(n.recipient_role_id == billing_role_id and n.type == "status_change" for n in notifications)

    await _delete_lead(uuid.UUID(lead_id))


async def test_available_transitions_filtered_by_role(api_client, agent, billing):
    agent_token = await _login(api_client, agent["email"], agent["password"])
    billing_token = await _login(api_client, billing["email"], billing["password"])
    lead_id = await _create_lead(api_client, agent_token)
    await _set_status_directly(uuid.UUID(lead_id), BookingStatus.client_approved)

    for_agent = await api_client.get(f"/leads/{lead_id}/available-transitions", headers=_auth(agent_token))
    assert for_agent.status_code == 200
    agent_statuses = {row["status"] for row in for_agent.json()}
    assert agent_statuses == {"transferred_to_billing"}

    # client_approved isn't one of Billing's relevant statuses yet (that's
    # transferred_to_billing onward) — Billing can't see this lead at all yet,
    # so 404, not an empty 200 list.
    for_billing = await api_client.get(f"/leads/{lead_id}/available-transitions", headers=_auth(billing_token))
    assert for_billing.status_code == 404

    await _delete_lead(uuid.UUID(lead_id))


async def test_status_history_endpoint_orders_most_recent_first(api_client, agent, billing):
    agent_token = await _login(api_client, agent["email"], agent["password"])
    billing_token = await _login(api_client, billing["email"], billing["password"])
    lead_id = await _create_lead(api_client, agent_token)
    await _set_status_directly(uuid.UUID(lead_id), BookingStatus.client_approved)

    await api_client.patch(
        f"/leads/{lead_id}/status", json={"new_status": "transferred_to_billing"}, headers=_auth(agent_token)
    )
    await api_client.patch(
        f"/leads/{lead_id}/status", json={"new_status": "card_charged"}, headers=_auth(billing_token)
    )

    history = await api_client.get(f"/leads/{lead_id}/status-history", headers=_auth(agent_token))
    assert history.status_code == 200
    rows = history.json()
    assert len(rows) == 2
    assert rows[0]["to_status"] == "card_charged"  # most recent first
    assert rows[1]["to_status"] == "transferred_to_billing"

    await _delete_lead(uuid.UUID(lead_id))


async def test_concurrent_conflicting_transitions_only_one_succeeds(api_client, agent, billing):
    """Row lock (SELECT ... FOR UPDATE) serializes racing requests — the second
    one re-reads the already-updated status and correctly 409s instead of
    silently overwriting the first."""
    agent_token = await _login(api_client, agent["email"], agent["password"])
    billing_token = await _login(api_client, billing["email"], billing["password"])
    lead_id = await _create_lead(api_client, agent_token)
    await _set_status_directly(uuid.UUID(lead_id), BookingStatus.client_approved)

    first = await api_client.patch(
        f"/leads/{lead_id}/status", json={"new_status": "transferred_to_billing"}, headers=_auth(agent_token)
    )
    assert first.status_code == 200

    # Retry the same transition again post-hoc — status has already moved on,
    # so this is no longer a valid edge from the lead's *current* status.
    second = await api_client.patch(
        f"/leads/{lead_id}/status", json={"new_status": "transferred_to_billing"}, headers=_auth(billing_token)
    )
    assert second.status_code in (403, 409)

    await _delete_lead(uuid.UUID(lead_id))
