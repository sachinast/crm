"""Master Admin — Status Workflow Permissions: GET/PATCH /admin/status-permissions
(app/api/v1/admin_status_permissions.py, migration 0007). Confirms the matrix
reads back the seeded, zero-behavior-change data correctly, that granting a
brand-new custom role a status permission actually changes what it can do
end-to-end (not just a DB row), and the access-control guardrails around it.
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


def _unique_email(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}@example.com"


def _unique_phone() -> str:
    return f"+1555{uuid.uuid4().int % 10_000_000:07d}"


async def _create_user_with_role_name(email: str, password: str, role_name: str) -> uuid.UUID:
    async with AsyncSessionLocal() as db:
        role = await db.scalar(select(Role).where(Role.name == role_name))
        user = User(name="Test User", email=email, password_hash=hash_password(password), role_id=role.id)
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


async def _delete_role_by_name(name: str) -> None:
    async with AsyncSessionLocal() as db:
        role = await db.scalar(select(Role).where(Role.name == name))
        if role is not None:
            await db.delete(role)
            await db.commit()


@pytest.fixture
async def api_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE_URL) as client:
        yield client


@pytest.fixture
async def super_admin():
    email = _unique_email("statusadmin-super")
    password = "correct-horse-battery-staple"
    user_id = await _create_user_with_role_name(email, password, "super_admin")
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


@pytest.fixture
async def agent():
    email = _unique_email("statusadmin-agent")
    password = "agent-password-123"
    user_id = await _create_user_with_role_name(email, password, "agent")
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


async def _login(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def test_matrix_reflects_seeded_transferred_to_billing(api_client, super_admin):
    token = await _login(api_client, super_admin["email"], super_admin["password"])
    resp = await api_client.get("/admin/status-permissions", headers=_auth(token))
    assert resp.status_code == 200
    matrix = {row["status"]: row for row in resp.json()}

    agent_id = await api_client.get("/admin/roles", headers=_auth(token))
    role_ids = {r["name"]: r["id"] for r in agent_id.json()}

    row = matrix["transferred_to_billing"]
    assert set(row["set_by"]) == {role_ids["agent"], role_ids["super_admin"], role_ids["admin"]}
    assert row["notifies"] == [role_ids["billing"]]
    assert row["relevant"] == [role_ids["billing"]]

    # authorization_pending is SYSTEM-set: no staff role can set it.
    assert matrix["authorization_pending"]["set_by"] == []


async def test_granting_set_by_lets_a_new_custom_role_transition_a_lead(api_client, super_admin, agent):
    """End-to-end: a custom role with zero status wiring can't move a lead
    past card_charged into tag_change_dep, but granting it set_by on that
    status through the admin API makes the real PATCH /leads/{id}/status
    endpoint accept the transition on the very next request."""
    admin_token = await _login(api_client, super_admin["email"], super_admin["password"])
    agent_token = await _login(api_client, agent["email"], agent["password"])

    role_name = f"triage-{uuid.uuid4().hex[:6]}"
    created = await api_client.post("/admin/roles", json={"name": role_name}, headers=_auth(admin_token))
    role_id = created.json()["id"]

    user_id = await _create_user_with_role_name(_unique_email("triageuser"), "custom-pass-123", role_name)
    custom_token = await _login(api_client, (await _get_email(user_id)), "custom-pass-123")

    lead_resp = await api_client.post(
        "/leads",
        json={"name": "Triage Target", "phone": _unique_phone(), "email": _unique_email("triage")},
        headers=_auth(agent_token),
    )
    lead_id = lead_resp.json()["id"]
    async with AsyncSessionLocal() as db:
        from app.models.enums import BookingStatus

        lead = await db.get(Lead, uuid.UUID(lead_id))
        lead.status = BookingStatus.card_charged
        await db.commit()

    # Custom role has leads.view_all/leads.view_own permission? No — it has
    # nothing yet, so it can't even see the lead: 404.
    denied = await api_client.patch(
        f"/leads/{lead_id}/status", json={"new_status": "tag_change_dep"}, headers=_auth(custom_token)
    )
    assert denied.status_code in (403, 404)

    # Grant it visibility (leads.view_all) + set_by on tag_change_dep. The
    # PATCH is a full replace across all three kinds for this status (same
    # "send the complete desired state" contract as RolePermissionsUpdate),
    # so — since this test DB isn't rolled back between tests — the existing
    # notifies/relevant rows must be carried forward here rather than wiped,
    # the same way the real admin matrix UI would resend the whole row.
    await api_client.patch(
        f"/admin/roles/{role_id}/permissions",
        json={"permission_codes": ["leads.view_all"]},
        headers=_auth(admin_token),
    )
    before = (await api_client.get("/admin/status-permissions", headers=_auth(admin_token))).json()
    before_row = next(r for r in before if r["status"] == "tag_change_dep")

    grant = await api_client.patch(
        "/admin/status-permissions/tag_change_dep",
        json={
            "set_by": [*before_row["set_by"], role_id],
            "notifies": before_row["notifies"],
            "relevant": before_row["relevant"],
        },
        headers=_auth(admin_token),
    )
    assert grant.status_code == 200
    assert role_id in grant.json()["set_by"]

    allowed = await api_client.patch(
        f"/leads/{lead_id}/status", json={"new_status": "tag_change_dep"}, headers=_auth(custom_token)
    )
    assert allowed.status_code == 200, allowed.text
    assert allowed.json()["status"] == "tag_change_dep"

    await _delete_lead(uuid.UUID(lead_id))
    await _delete_user(user_id)
    await _delete_role_by_name(role_name)


async def _get_email(user_id: uuid.UUID) -> str:
    async with AsyncSessionLocal() as db:
        user = await db.get(User, user_id)
        return user.email


async def test_unknown_role_id_rejected(api_client, super_admin):
    token = await _login(api_client, super_admin["email"], super_admin["password"])
    resp = await api_client.patch(
        "/admin/status-permissions/qc_done",
        json={"set_by": [str(uuid.uuid4())], "notifies": [], "relevant": []},
        headers=_auth(token),
    )
    assert resp.status_code == 422


async def test_agent_cannot_reach_status_permissions(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    resp = await api_client.get("/admin/status-permissions", headers=_auth(token))
    assert resp.status_code == 403
