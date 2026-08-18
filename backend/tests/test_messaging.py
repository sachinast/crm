"""In-app messaging: conversation creation (incl. 1:1 idempotency), sending
with mentions/attachments, read receipts, attachment upload validation, and
that a non-participant can't reach a conversation's messages or files.
"""
import io
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.audit import Notification
from app.models.enums import UserRole
from app.models.user import User

pytestmark = pytest.mark.asyncio(loop_scope="session")

BASE_URL = "http://testserver/api/v1"

# 1x1 transparent PNG.
TINY_PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d494844520000000100000001080600000"
    "01f15c4890000000a49444154789c6360000002000100ffff03000006"
    "0005574bad380000000049454e44ae426082"
)


def _unique_email(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}@example.com"


async def _create_user(email: str, password: str, role: UserRole = UserRole.agent) -> uuid.UUID:
    async with AsyncSessionLocal() as db:
        user = User(name="Test User", email=email, password_hash=hash_password(password), role=role)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user.id


async def _delete_messaging_traces_of(user_id: uuid.UUID) -> None:
    # created_by/sender_id/mentioned_user_id are RESTRICT (not CASCADE) by
    # design — a user being removed shouldn't silently delete chat history
    # other participants still have (see app/models/messaging.py). Test
    # cleanup has to explicitly tear this down first, same pattern
    # test_dashboard.py uses for leads/agent_id. Order matters: mentions and
    # messages this user is *not* the conversation-owner of must go before
    # conversations they *do* own, and this has to be self-contained (not
    # rely on another fixture's teardown having already run) since
    # independent fixtures don't have a guaranteed teardown order.
    from sqlalchemy import select as _select

    from app.models.audit import Notification
    from app.models.messaging import Conversation, Message, MessageMention

    async with AsyncSessionLocal() as db:
        notifications = await db.execute(_select(Notification).where(Notification.recipient_user_id == user_id))
        for n in notifications.scalars().all():
            await db.delete(n)
        await db.commit()

        mentions = await db.execute(_select(MessageMention).where(MessageMention.mentioned_user_id == user_id))
        for m in mentions.scalars().all():
            await db.delete(m)
        await db.commit()

        messages = await db.execute(_select(Message).where(Message.sender_id == user_id))
        for m in messages.scalars().all():
            await db.delete(m)
        await db.commit()

        conversations = await db.execute(_select(Conversation).where(Conversation.created_by == user_id))
        for c in conversations.scalars().all():
            await db.delete(c)
        await db.commit()


async def _delete_user(user_id: uuid.UUID) -> None:
    await _delete_messaging_traces_of(user_id)
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
async def alice():
    email = _unique_email("alice")
    password = "alice-password-1"
    user_id = await _create_user(email, password)
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


@pytest.fixture
async def bob():
    email = _unique_email("bob")
    password = "bob-password-1"
    user_id = await _create_user(email, password)
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


@pytest.fixture
async def carol():
    email = _unique_email("carol")
    password = "carol-password-1"
    user_id = await _create_user(email, password)
    yield {"id": user_id, "email": email, "password": password}
    await _delete_user(user_id)


async def _login(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def test_user_search_excludes_self_and_is_open_to_any_role(api_client, alice, bob):
    token = await _login(api_client, alice["email"], alice["password"])
    resp = await api_client.get("/messaging/users", headers=_auth(token))
    assert resp.status_code == 200
    ids = [u["id"] for u in resp.json()]
    assert str(alice["id"]) not in ids
    assert str(bob["id"]) in ids


async def test_create_1to1_conversation_is_idempotent(api_client, alice, bob):
    token = await _login(api_client, alice["email"], alice["password"])

    first = await api_client.post(
        "/messaging/conversations", json={"participant_user_ids": [str(bob["id"])]}, headers=_auth(token)
    )
    assert first.status_code == 201
    second = await api_client.post(
        "/messaging/conversations", json={"participant_user_ids": [str(bob["id"])]}, headers=_auth(token)
    )
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]


async def test_group_conversation_creates_new_each_time(api_client, alice, bob, carol):
    token = await _login(api_client, alice["email"], alice["password"])
    resp = await api_client.post(
        "/messaging/conversations",
        json={"participant_user_ids": [str(bob["id"]), str(carol["id"])], "name": "Trio"},
        headers=_auth(token),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["is_group"] is True
    assert len(body["participants"]) == 3


async def test_send_message_with_mention_notifies_and_highlights(api_client, alice, bob):
    alice_token = await _login(api_client, alice["email"], alice["password"])
    bob_token = await _login(api_client, bob["email"], bob["password"])

    conv = await api_client.post(
        "/messaging/conversations", json={"participant_user_ids": [str(bob["id"])]}, headers=_auth(alice_token)
    )
    conv_id = conv.json()["id"]

    sent = await api_client.post(
        f"/messaging/conversations/{conv_id}/messages",
        json={"body": "hey @Bob check this", "mentioned_user_ids": [str(bob["id"])]},
        headers=_auth(alice_token),
    )
    assert sent.status_code == 201
    body = sent.json()
    assert body["mentions"][0]["user_id"] == str(bob["id"])
    assert body["status"] == "sent"

    # Bob can see it from his side too.
    messages = await api_client.get(f"/messaging/conversations/{conv_id}/messages", headers=_auth(bob_token))
    assert messages.status_code == 200
    assert any(m["body"] == "hey @Bob check this" for m in messages.json())

    # A mention gets exactly one notification (the specific "mentioned you"
    # one), not also a generic "you have a message" for the same message.
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Notification).where(Notification.recipient_user_id == bob["id"]))
        notifications = list(result.scalars().all())
    assert len(notifications) == 1
    assert notifications[0].type == "mention"


async def test_every_recipient_gets_notified_not_just_mentions(api_client, alice, bob):
    alice_token = await _login(api_client, alice["email"], alice["password"])

    conv = await api_client.post(
        "/messaging/conversations", json={"participant_user_ids": [str(bob["id"])]}, headers=_auth(alice_token)
    )
    conv_id = conv.json()["id"]

    resp = await api_client.post(
        f"/messaging/conversations/{conv_id}/messages",
        json={"body": "no mention here, just a normal message"},
        headers=_auth(alice_token),
    )
    assert resp.status_code == 201

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Notification).where(Notification.recipient_user_id == bob["id"]))
        notifications = list(result.scalars().all())
    assert len(notifications) == 1
    assert notifications[0].type == "message"
    assert notifications[0].message.startswith("Test User: no mention here")

    # The sender never gets notified about their own message.
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Notification).where(Notification.recipient_user_id == alice["id"]))
        assert list(result.scalars().all()) == []


async def test_cannot_mention_a_non_participant(api_client, alice, bob, carol):
    token = await _login(api_client, alice["email"], alice["password"])
    conv = await api_client.post(
        "/messaging/conversations", json={"participant_user_ids": [str(bob["id"])]}, headers=_auth(token)
    )
    conv_id = conv.json()["id"]

    resp = await api_client.post(
        f"/messaging/conversations/{conv_id}/messages",
        json={"body": "hi", "mentioned_user_ids": [str(carol["id"])]},
        headers=_auth(token),
    )
    assert resp.status_code == 422


async def test_message_requires_body_or_attachment(api_client, alice, bob):
    token = await _login(api_client, alice["email"], alice["password"])
    conv = await api_client.post(
        "/messaging/conversations", json={"participant_user_ids": [str(bob["id"])]}, headers=_auth(token)
    )
    conv_id = conv.json()["id"]

    resp = await api_client.post(
        f"/messaging/conversations/{conv_id}/messages", json={"body": None}, headers=_auth(token)
    )
    assert resp.status_code == 422


async def test_mark_read_flips_sender_side_status_to_read(api_client, alice, bob):
    alice_token = await _login(api_client, alice["email"], alice["password"])
    bob_token = await _login(api_client, bob["email"], bob["password"])

    conv = await api_client.post(
        "/messaging/conversations", json={"participant_user_ids": [str(bob["id"])]}, headers=_auth(alice_token)
    )
    conv_id = conv.json()["id"]

    await api_client.post(
        f"/messaging/conversations/{conv_id}/messages", json={"body": "hi"}, headers=_auth(alice_token)
    )

    read = await api_client.post(f"/messaging/conversations/{conv_id}/read", headers=_auth(bob_token))
    assert read.status_code == 200

    messages = await api_client.get(f"/messaging/conversations/{conv_id}/messages", headers=_auth(alice_token))
    assert messages.json()[-1]["status"] == "read"


async def test_unread_count_reflects_unread_messages(api_client, alice, bob):
    alice_token = await _login(api_client, alice["email"], alice["password"])
    bob_token = await _login(api_client, bob["email"], bob["password"])

    conv = await api_client.post(
        "/messaging/conversations", json={"participant_user_ids": [str(bob["id"])]}, headers=_auth(alice_token)
    )
    conv_id = conv.json()["id"]

    await api_client.post(
        f"/messaging/conversations/{conv_id}/messages", json={"body": "one"}, headers=_auth(alice_token)
    )
    await api_client.post(
        f"/messaging/conversations/{conv_id}/messages", json={"body": "two"}, headers=_auth(alice_token)
    )

    unread = await api_client.get("/messaging/unread-count", headers=_auth(bob_token))
    assert unread.json()["unread_count"] == 2

    await api_client.post(f"/messaging/conversations/{conv_id}/read", headers=_auth(bob_token))
    unread_after = await api_client.get("/messaging/unread-count", headers=_auth(bob_token))
    assert unread_after.json()["unread_count"] == 0


async def test_non_participant_gets_404_not_403(api_client, alice, bob, carol):
    alice_token = await _login(api_client, alice["email"], alice["password"])
    carol_token = await _login(api_client, carol["email"], carol["password"])

    conv = await api_client.post(
        "/messaging/conversations", json={"participant_user_ids": [str(bob["id"])]}, headers=_auth(alice_token)
    )
    conv_id = conv.json()["id"]

    resp = await api_client.get(f"/messaging/conversations/{conv_id}/messages", headers=_auth(carol_token))
    assert resp.status_code == 404


async def test_attachment_upload_and_send_image(api_client, alice, bob):
    alice_token = await _login(api_client, alice["email"], alice["password"])

    upload = await api_client.post(
        "/messaging/attachments",
        files={"file": ("test.png", io.BytesIO(TINY_PNG), "image/png")},
        headers=_auth(alice_token),
    )
    assert upload.status_code == 201, upload.text
    attachment = upload.json()
    assert attachment["kind"] == "image"

    conv = await api_client.post(
        "/messaging/conversations", json={"participant_user_ids": [str(bob["id"])]}, headers=_auth(alice_token)
    )
    conv_id = conv.json()["id"]

    sent = await api_client.post(
        f"/messaging/conversations/{conv_id}/messages",
        json={"attachment_ids": [attachment["id"]]},
        headers=_auth(alice_token),
    )
    assert sent.status_code == 201
    assert sent.json()["attachments"][0]["id"] == attachment["id"]


async def test_attachment_rejects_mismatched_content_type(api_client, alice):
    token = await _login(api_client, alice["email"], alice["password"])
    # Claims to be a PNG, but the bytes are plain text — should fail the magic-byte sniff.
    resp = await api_client.post(
        "/messaging/attachments",
        files={"file": ("fake.png", io.BytesIO(b"not actually a png"), "image/png")},
        headers=_auth(token),
    )
    assert resp.status_code == 422


async def test_attachment_rejects_disallowed_type(api_client, alice):
    token = await _login(api_client, alice["email"], alice["password"])
    resp = await api_client.post(
        "/messaging/attachments",
        files={"file": ("script.exe", io.BytesIO(b"MZ\x90\x00fake exe"), "application/x-msdownload")},
        headers=_auth(token),
    )
    assert resp.status_code == 422


async def test_attachment_download_requires_conversation_participation(api_client, alice, bob, carol):
    alice_token = await _login(api_client, alice["email"], alice["password"])
    carol_token = await _login(api_client, carol["email"], carol["password"])

    upload = await api_client.post(
        "/messaging/attachments",
        files={"file": ("test.png", io.BytesIO(TINY_PNG), "image/png")},
        headers=_auth(alice_token),
    )
    attachment_id = upload.json()["id"]

    conv = await api_client.post(
        "/messaging/conversations", json={"participant_user_ids": [str(bob["id"])]}, headers=_auth(alice_token)
    )
    conv_id = conv.json()["id"]
    await api_client.post(
        f"/messaging/conversations/{conv_id}/messages",
        json={"attachment_ids": [attachment_id]},
        headers=_auth(alice_token),
    )

    ok = await api_client.get(f"/messaging/attachments/{attachment_id}", headers=_auth(alice_token))
    assert ok.status_code == 200
    assert ok.content == TINY_PNG

    forbidden = await api_client.get(f"/messaging/attachments/{attachment_id}", headers=_auth(carol_token))
    assert forbidden.status_code == 404


async def test_quick_response_flag_round_trips(api_client, alice, bob):
    token = await _login(api_client, alice["email"], alice["password"])
    conv = await api_client.post(
        "/messaging/conversations", json={"participant_user_ids": [str(bob["id"])]}, headers=_auth(token)
    )
    conv_id = conv.json()["id"]

    resp = await api_client.post(
        f"/messaging/conversations/{conv_id}/messages",
        json={"body": "need this asap", "is_quick_response": True},
        headers=_auth(token),
    )
    assert resp.json()["is_quick_response"] is True


async def test_messaging_requires_auth(api_client):
    resp = await api_client.get("/messaging/conversations")
    assert resp.status_code == 401
