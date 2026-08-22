"""Super Admin master data: GET /master-options (any user) + POST/DELETE
/admin/master-options (app/api/v1/master_options.py, migration 0012).
"""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.rbac import Role
from app.models.user import User

pytestmark = pytest.mark.asyncio(loop_scope="session")
BASE_URL = "http://testserver/api/v1"


def _unique_email(p: str) -> str:
    return f"{p}-{uuid.uuid4().hex[:8]}@example.com"


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


@pytest.fixture
async def api_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE_URL) as client:
        yield client


@pytest.fixture
async def super_admin():
    email = _unique_email("mo-super")
    user_id = await _create_user(email, "pw12345678", "super_admin")
    yield {"email": email, "password": "pw12345678"}
    await _delete_user(user_id)


@pytest.fixture
async def agent():
    email = _unique_email("mo-agent")
    user_id = await _create_user(email, "pw12345678", "agent")
    yield {"email": email, "password": "pw12345678"}
    await _delete_user(user_id)


async def _login(client, email, password) -> str:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def test_vehicle_type_and_transmission_seeded_from_old_enums(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    resp = await api_client.get("/master-options", params={"field_key": "vehicle_type"}, headers=_auth(token))
    assert resp.status_code == 200
    values = {o["value"] for o in resp.json()}
    assert {"economy", "standard_suv", "electric"} <= values

    resp2 = await api_client.get("/master-options", params={"field_key": "transmission"}, headers=_auth(token))
    assert {o["value"] for o in resp2.json()} == {"automatic", "manual"}


async def test_agent_can_read_but_not_write(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    read = await api_client.get("/master-options", headers=_auth(token))
    assert read.status_code == 200

    write = await api_client.post(
        "/admin/master-options", json={"field_key": "airline", "value": "Delta"}, headers=_auth(token)
    )
    assert write.status_code == 403


async def test_super_admin_can_create_and_delete_option(api_client, super_admin, agent):
    admin_token = await _login(api_client, super_admin["email"], super_admin["password"])
    agent_token = await _login(api_client, agent["email"], agent["password"])
    value = f"Delta-{uuid.uuid4().hex[:6]}"

    created = await api_client.post(
        "/admin/master-options", json={"field_key": "airline", "value": value}, headers=_auth(admin_token)
    )
    assert created.status_code == 201, created.text
    option_id = created.json()["id"]

    listed = await api_client.get("/master-options", params={"field_key": "airline"}, headers=_auth(agent_token))
    assert any(o["value"] == value for o in listed.json())

    dup = await api_client.post(
        "/admin/master-options", json={"field_key": "airline", "value": value}, headers=_auth(admin_token)
    )
    assert dup.status_code == 409

    deleted = await api_client.delete(f"/admin/master-options/{option_id}", headers=_auth(admin_token))
    assert deleted.status_code == 204


async def test_option_type_filtering_and_addon_support(api_client, super_admin, agent):
    admin_token = await _login(api_client, super_admin["email"], super_admin["password"])
    agent_token = await _login(api_client, agent["email"], agent["password"])

    # Verify seeded core masters
    masters = await api_client.get("/master-options", params={"option_type": "master"}, headers=_auth(agent_token))
    assert masters.status_code == 200
    master_keys = {o["field_key"] for o in masters.json()}
    assert {"booking_source", "transaction_type", "booking_status", "call_type", "room_type"} <= master_keys

    # Verify seeded addons
    addons = await api_client.get("/master-options", params={"option_type": "addon"}, headers=_auth(agent_token))
    assert addons.status_code == 200
    addon_keys = {o["field_key"] for o in addons.json()}
    assert {"add_on_services", "hk_gk", "currency"} <= addon_keys

    # Create new add-on option
    val = f"ExtraLegroom-{uuid.uuid4().hex[:6]}"
    created = await api_client.post(
        "/admin/master-options",
        json={"field_key": "add_on_services", "value": val, "option_type": "addon"},
        headers=_auth(admin_token),
    )
    assert created.status_code == 201
    assert created.json()["option_type"] == "addon"
    addon_id = created.json()["id"]

    # Read back filtered by option_type=addon
    addon_list = await api_client.get(
        "/master-options", params={"field_key": "add_on_services", "option_type": "addon"}, headers=_auth(agent_token)
    )
    assert any(o["id"] == addon_id and o["value"] == val for o in addon_list.json())

    # Cleanup
    del_resp = await api_client.delete(f"/admin/master-options/{addon_id}", headers=_auth(admin_token))
    assert del_resp.status_code == 204
