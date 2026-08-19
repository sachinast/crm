"""File Manager — upload/list/download/delete, ownership scoping vs
files.view_all, and public share links with view/click tracking
(app/api/v1/files.py, migration 0013).
"""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.files import FileShareEvent, FileShareLink, UploadedFile
from app.models.rbac import Role
from app.models.user import User

pytestmark = pytest.mark.asyncio(loop_scope="session")
BASE_URL = "http://testserver/api/v1"

# Minimal valid 1x1 PNG.
PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00"
    b"\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00\x00\x03\x01\x01\x00\x18\xdd\x8d\xb0"
    b"\x00\x00\x00\x00IEND\xaeB`\x82"
)


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
        file_ids = (
            await db.execute(select(UploadedFile.id).where(UploadedFile.uploaded_by == user_id))
        ).scalars().all()
        if file_ids:
            link_ids = (
                await db.execute(select(FileShareLink.id).where(FileShareLink.file_id.in_(file_ids)))
            ).scalars().all()
            if link_ids:
                await db.execute(FileShareEvent.__table__.delete().where(FileShareEvent.share_link_id.in_(link_ids)))
                await db.execute(FileShareLink.__table__.delete().where(FileShareLink.id.in_(link_ids)))
            await db.execute(UploadedFile.__table__.delete().where(UploadedFile.id.in_(file_ids)))
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
    email = _unique_email("files-agent")
    user_id = await _create_user(email, "pw12345678", "agent")
    yield {"email": email, "password": "pw12345678", "id": user_id}
    await _delete_user(user_id)


@pytest.fixture
async def super_admin():
    email = _unique_email("files-super")
    user_id = await _create_user(email, "pw12345678", "super_admin")
    yield {"email": email, "password": "pw12345678", "id": user_id}
    await _delete_user(user_id)


async def _login(client, email, password) -> str:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def test_upload_list_download_delete(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])

    uploaded = await api_client.post(
        "/files",
        headers=_auth(token),
        files={"file": ("photo.png", PNG_BYTES, "image/png")},
    )
    assert uploaded.status_code == 201, uploaded.text
    body = uploaded.json()
    assert body["kind"] == "image"
    file_id = body["id"]

    listed = await api_client.get("/files", headers=_auth(token))
    assert listed.status_code == 200
    assert any(f["id"] == file_id for f in listed.json())

    downloaded = await api_client.get(f"/files/{file_id}/download", params={"token": token})
    assert downloaded.status_code == 200
    assert downloaded.content == PNG_BYTES

    deleted = await api_client.delete(f"/files/{file_id}", headers=_auth(token))
    assert deleted.status_code == 204

    listed_after = await api_client.get("/files", headers=_auth(token))
    assert all(f["id"] != file_id for f in listed_after.json())


async def test_upload_rejects_mismatched_extension_and_content_type(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    resp = await api_client.post(
        "/files",
        headers=_auth(token),
        files={"file": ("photo.pdf", PNG_BYTES, "image/png")},
    )
    assert resp.status_code == 422


async def test_agent_cannot_see_other_users_files_without_view_all(api_client, agent, super_admin):
    admin_token = await _login(api_client, super_admin["email"], super_admin["password"])
    await api_client.post(
        "/files",
        headers=_auth(admin_token),
        files={"file": ("admin-photo.png", PNG_BYTES, "image/png")},
    )

    agent_token = await _login(api_client, agent["email"], agent["password"])
    own = await api_client.get("/files", headers=_auth(agent_token))
    assert own.json() == []

    forced_all = await api_client.get("/files", params={"all": True}, headers=_auth(agent_token))
    assert forced_all.json() == []  # no files.view_all permission -> silently scoped to own


async def test_super_admin_can_view_all_files(api_client, agent, super_admin):
    agent_token = await _login(api_client, agent["email"], agent["password"])
    await api_client.post(
        "/files",
        headers=_auth(agent_token),
        files={"file": ("agent-photo.png", PNG_BYTES, "image/png")},
    )

    admin_token = await _login(api_client, super_admin["email"], super_admin["password"])
    all_files = await api_client.get("/files", params={"all": True}, headers=_auth(admin_token))
    assert any(f["uploaded_by"] == str(agent["id"]) for f in all_files.json())


async def test_share_link_tracks_view_and_click(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    uploaded = await api_client.post(
        "/files",
        headers=_auth(token),
        files={"file": ("shared.png", PNG_BYTES, "image/png")},
    )
    file_id = uploaded.json()["id"]

    share = await api_client.post(f"/files/{file_id}/share", headers=_auth(token))
    assert share.status_code == 201, share.text
    share_token = share.json()["token"]
    assert share.json()["view_count"] == 0
    assert share.json()["click_count"] == 0

    viewed = await api_client.get(f"/s/{share_token}")
    assert viewed.status_code == 200

    downloaded = await api_client.get(f"/s/{share_token}/download")
    assert downloaded.status_code == 200
    assert downloaded.content == PNG_BYTES

    stats = await api_client.get(f"/files/{file_id}/shares", headers=_auth(token))
    assert stats.status_code == 200
    row = stats.json()[0]
    assert row["view_count"] == 1
    assert row["click_count"] == 1

    revoked = await api_client.delete(f"/shares/{row['id']}", headers=_auth(token))
    assert revoked.status_code == 204

    after_revoke = await api_client.get(f"/s/{share_token}")
    assert after_revoke.status_code == 404
