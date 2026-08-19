"""Notes — private per-user scratchpad, 404 (not 403) for anything that
isn't the caller's own (app/api/v1/notes.py, migration 0013).
"""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.notes import Note
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
        await db.execute(Note.__table__.delete().where(Note.user_id == user_id))
        await db.commit()
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
async def agent():
    email = _unique_email("notes-agent")
    user_id = await _create_user(email, "pw12345678", "agent")
    yield {"email": email, "password": "pw12345678", "id": user_id}
    await _delete_user(user_id)


@pytest.fixture
async def other_agent():
    email = _unique_email("notes-other")
    user_id = await _create_user(email, "pw12345678", "agent")
    yield {"email": email, "password": "pw12345678", "id": user_id}
    await _delete_user(user_id)


async def _login(client, email, password) -> str:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def test_create_list_update_delete_own_note(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])

    created = await api_client.post("/notes", json={"title": "Follow up", "body": "Call back tomorrow"}, headers=_auth(token))
    assert created.status_code == 201, created.text
    note_id = created.json()["id"]

    listed = await api_client.get("/notes", headers=_auth(token))
    assert listed.status_code == 200
    assert any(n["id"] == note_id for n in listed.json())

    updated = await api_client.patch(f"/notes/{note_id}", json={"body": "Called, rescheduled"}, headers=_auth(token))
    assert updated.status_code == 200
    assert updated.json()["body"] == "Called, rescheduled"
    assert updated.json()["title"] == "Follow up"

    deleted = await api_client.delete(f"/notes/{note_id}", headers=_auth(token))
    assert deleted.status_code == 204

    after = await api_client.get("/notes", headers=_auth(token))
    assert all(n["id"] != note_id for n in after.json())


async def test_cannot_see_or_modify_another_users_note(api_client, agent, other_agent):
    owner_token = await _login(api_client, agent["email"], agent["password"])
    created = await api_client.post("/notes", json={"title": "Private", "body": "secret"}, headers=_auth(owner_token))
    note_id = created.json()["id"]

    other_token = await _login(api_client, other_agent["email"], other_agent["password"])
    listed = await api_client.get("/notes", headers=_auth(other_token))
    assert all(n["id"] != note_id for n in listed.json())

    forbidden_update = await api_client.patch(f"/notes/{note_id}", json={"body": "hacked"}, headers=_auth(other_token))
    assert forbidden_update.status_code == 404

    forbidden_delete = await api_client.delete(f"/notes/{note_id}", headers=_auth(other_token))
    assert forbidden_delete.status_code == 404
