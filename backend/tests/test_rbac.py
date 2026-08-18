"""Master Admin — Roles & Permissions engine: creating a custom role, granting
it permissions at runtime (and confirming that actually changes what its
holders can do), and the guardrails around it (system roles are protected,
a role in use can't be deleted, only admin.manage_roles can manage roles at
all).
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


def _unique_email(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}@example.com"


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
    email = _unique_email("rbac-super")
    password = "correct-horse-battery-staple"
    user_id = await _create_user_with_role_name(email, password, "super_admin")
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


@pytest.fixture
async def admin():
    email = _unique_email("rbac-admin")
    password = "admin-password-123"
    user_id = await _create_user_with_role_name(email, password, "admin")
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


@pytest.fixture
async def agent():
    email = _unique_email("rbac-agent")
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


async def test_list_permissions_returns_full_catalog(api_client, admin):
    token = await _login(api_client, admin["email"], admin["password"])
    resp = await api_client.get("/admin/permissions", headers=_auth(token))
    assert resp.status_code == 200
    codes = {p["code"] for p in resp.json()}
    assert "leads.view_all" in codes
    assert "admin.manage_roles" in codes


async def test_new_custom_role_starts_with_no_permissions(api_client, super_admin):
    token = await _login(api_client, super_admin["email"], super_admin["password"])
    role_name = f"regional-manager-{uuid.uuid4().hex[:6]}"
    resp = await api_client.post("/admin/roles", json={"name": role_name}, headers=_auth(token))
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["permissions"] == []
    assert body["is_system_role"] is False

    await _delete_role_by_name(role_name)


async def test_granting_a_permission_actually_changes_what_the_role_can_do(api_client, super_admin):
    admin_token = await _login(api_client, super_admin["email"], super_admin["password"])
    role_name = f"custom-auditor-{uuid.uuid4().hex[:6]}"

    created = await api_client.post("/admin/roles", json={"name": role_name}, headers=_auth(admin_token))
    role_id = created.json()["id"]

    user_id = await _create_user_with_role_name(_unique_email("customrole"), "custom-pass-123", role_name)
    custom_token = await _login(api_client, (await _get_email(user_id)), "custom-pass-123")

    # No audit.view permission yet -> 403.
    denied = await api_client.get("/audit/process-log", headers=_auth(custom_token))
    assert denied.status_code == 403

    grant = await api_client.patch(
        f"/admin/roles/{role_id}/permissions",
        json={"permission_codes": ["audit.view"]},
        headers=_auth(admin_token),
    )
    assert grant.status_code == 200
    assert {p["code"] for p in grant.json()["permissions"]} == {"audit.view"}

    # Re-login: get_current_user re-reads permissions fresh from the DB on
    # every request (not cached in the JWT), so a brand new login isn't even
    # required for this to take effect — but re-login exercises the same
    # code path a real re-auth would.
    custom_token_2 = await _login(api_client, (await _get_email(user_id)), "custom-pass-123")
    allowed = await api_client.get("/audit/process-log", headers=_auth(custom_token_2))
    assert allowed.status_code == 200

    await _delete_user(user_id)
    await _delete_role_by_name(role_name)


async def _get_email(user_id: uuid.UUID) -> str:
    async with AsyncSessionLocal() as db:
        user = await db.get(User, user_id)
        return user.email


async def test_permission_takes_effect_without_reissuing_token(api_client, super_admin):
    """Permissions are re-checked from the DB on every request (deps.get_current_user
    eager-loads role.permissions fresh each time) — revoking mid-session takes
    effect on the very next request, no stale-JWT window."""
    admin_token = await _login(api_client, super_admin["email"], super_admin["password"])
    role_name = f"live-toggle-{uuid.uuid4().hex[:6]}"
    created = await api_client.post("/admin/roles", json={"name": role_name}, headers=_auth(admin_token))
    role_id = created.json()["id"]

    user_id = await _create_user_with_role_name(_unique_email("livetoggle"), "custom-pass-123", role_name)
    token = await _login(api_client, (await _get_email(user_id)), "custom-pass-123")

    before = await api_client.get("/audit/process-log", headers=_auth(token))
    assert before.status_code == 403

    await api_client.patch(
        f"/admin/roles/{role_id}/permissions",
        json={"permission_codes": ["audit.view"]},
        headers=_auth(admin_token),
    )

    after = await api_client.get("/audit/process-log", headers=_auth(token))  # same token, no re-login
    assert after.status_code == 200

    await _delete_user(user_id)
    await _delete_role_by_name(role_name)


async def test_system_role_cannot_be_deleted(api_client, super_admin):
    token = await _login(api_client, super_admin["email"], super_admin["password"])
    roles = await api_client.get("/admin/roles", headers=_auth(token))
    agent_role_id = next(r["id"] for r in roles.json() if r["name"] == "agent")

    resp = await api_client.delete(f"/admin/roles/{agent_role_id}", headers=_auth(token))
    assert resp.status_code == 409


async def test_role_in_use_cannot_be_deleted(api_client, super_admin, agent):
    token = await _login(api_client, super_admin["email"], super_admin["password"])
    roles = await api_client.get("/admin/roles", headers=_auth(token))
    agent_role_id = next(r["id"] for r in roles.json() if r["name"] == "agent")

    # agent fixture's user holds this role -> still in use even ignoring the
    # is_system_role guard above.
    resp = await api_client.delete(f"/admin/roles/{agent_role_id}", headers=_auth(token))
    assert resp.status_code == 409


async def test_unused_custom_role_can_be_deleted(api_client, super_admin):
    token = await _login(api_client, super_admin["email"], super_admin["password"])
    role_name = f"throwaway-{uuid.uuid4().hex[:6]}"
    created = await api_client.post("/admin/roles", json={"name": role_name}, headers=_auth(token))
    role_id = created.json()["id"]

    resp = await api_client.delete(f"/admin/roles/{role_id}", headers=_auth(token))
    assert resp.status_code == 204


async def test_unknown_permission_code_rejected(api_client, super_admin):
    token = await _login(api_client, super_admin["email"], super_admin["password"])
    resp = await api_client.post(
        "/admin/roles",
        json={"name": f"bad-{uuid.uuid4().hex[:6]}", "permission_codes": ["not.a.real.permission"]},
        headers=_auth(token),
    )
    assert resp.status_code == 422


async def test_plain_admin_cannot_manage_roles_but_can_read_them(api_client, admin):
    """admin.manage_users holders (plain admin) can read the role list — the
    user-creation form needs it — but only admin.manage_roles (super_admin by
    default) can create/edit/delete roles."""
    token = await _login(api_client, admin["email"], admin["password"])

    readable = await api_client.get("/admin/roles", headers=_auth(token))
    assert readable.status_code == 200

    forbidden = await api_client.post(
        "/admin/roles", json={"name": f"nope-{uuid.uuid4().hex[:6]}"}, headers=_auth(token)
    )
    assert forbidden.status_code == 403


async def test_agent_cannot_reach_any_admin_role_endpoint(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    resp = await api_client.get("/admin/roles", headers=_auth(token))
    assert resp.status_code == 403
