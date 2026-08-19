"""Embeddable booking widgets (migration 0014) — admin CRUD
(app/api/v1/embed_widgets.py) and the public, unauthenticated submit
endpoint + widget.js (app/api/v1/embed_public.py) the widget script posts to
from an arbitrary third-party landing page.
"""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.embed_widget import EmbedWidget
from app.models.lead import Lead
from app.models.rbac import Role
from app.models.user import User

pytestmark = pytest.mark.asyncio(loop_scope="session")
BASE_URL = "http://testserver/api/v1"


def _unique_email(p: str) -> str:
    return f"{p}-{uuid.uuid4().hex[:8]}@example.com"


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


async def _delete_widget(widget_id: uuid.UUID) -> None:
    async with AsyncSessionLocal() as db:
        widget = await db.get(EmbedWidget, widget_id)
        if widget is not None:
            await db.delete(widget)
            await db.commit()


async def _delete_lead(lead_id: uuid.UUID) -> None:
    async with AsyncSessionLocal() as db:
        lead = await db.get(Lead, lead_id)
        if lead is not None:
            await db.delete(lead)
            await db.commit()


@pytest.fixture
async def api_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE_URL) as client:
        yield client


@pytest.fixture
async def admin():
    email = _unique_email("ew-admin")
    user_id = await _create_user(email, "pw12345678", "admin")
    yield {"id": user_id, "email": email, "password": "pw12345678"}
    await _delete_user(user_id)


@pytest.fixture
async def agent():
    email = _unique_email("ew-agent")
    user_id = await _create_user(email, "pw12345678", "agent")
    yield {"id": user_id, "email": email, "password": "pw12345678"}
    await _delete_user(user_id)


async def _login(client, email, password) -> str:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _create_widget(client, admin_token, agent_id) -> dict:
    resp = await client.post(
        "/admin/embed-widgets",
        json={"name": "Homepage Widget", "assigned_agent_id": str(agent_id)},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


# --- Admin CRUD ----------------------------------------------------------


async def test_agent_cannot_manage_widgets(api_client, agent):
    token = await _login(api_client, agent["email"], agent["password"])
    resp = await api_client.post(
        "/admin/embed-widgets", json={"name": "Should Fail", "assigned_agent_id": str(agent["id"])}, headers=_auth(token)
    )
    assert resp.status_code == 403


async def test_admin_can_create_and_list_widgets(api_client, admin, agent):
    admin_token = await _login(api_client, admin["email"], admin["password"])
    created = await _create_widget(api_client, admin_token, agent["id"])

    assert created["widget_key"].startswith("wgt_")
    assert created["submission_count"] == 0
    assert created["is_active"] is True

    listing = await api_client.get("/admin/embed-widgets", headers=_auth(admin_token))
    assert listing.status_code == 200
    assert any(w["id"] == created["id"] for w in listing.json())

    await _delete_widget(uuid.UUID(created["id"]))


async def test_admin_can_deactivate_widget(api_client, admin, agent):
    admin_token = await _login(api_client, admin["email"], admin["password"])
    created = await _create_widget(api_client, admin_token, agent["id"])

    resp = await api_client.patch(
        f"/admin/embed-widgets/{created['id']}", json={"is_active": False}, headers=_auth(admin_token)
    )
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False

    await _delete_widget(uuid.UUID(created["id"]))


# --- Public submit ---------------------------------------------------------


async def test_widget_js_is_served_publicly():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE_URL) as client:
        resp = await client.get("/embed/widget.js")
    assert resp.status_code == 200
    assert "javascript" in resp.headers["content-type"]
    assert "RTCPeerConnection" in resp.text  # sanity: the local-IP probe is in there


async def test_submit_rejects_unknown_key(api_client):
    resp = await api_client.post(
        "/embed/wgt_does-not-exist/submit",
        json={
            "name": "Nobody",
            "phone": _unique_phone(),
            "email": _unique_email("nokey"),
            "service_type": "flight",
            "details": {},
        },
    )
    assert resp.status_code == 404


async def test_submit_rejects_inactive_widget(api_client, admin, agent):
    admin_token = await _login(api_client, admin["email"], admin["password"])
    created = await _create_widget(api_client, admin_token, agent["id"])
    await api_client.patch(f"/admin/embed-widgets/{created['id']}", json={"is_active": False}, headers=_auth(admin_token))

    resp = await api_client.post(
        f"/embed/{created['widget_key']}/submit",
        json={
            "name": "Should Fail",
            "phone": _unique_phone(),
            "email": _unique_email("inactive"),
            "service_type": "hotel",
            "details": {},
        },
    )
    assert resp.status_code == 404

    await _delete_widget(uuid.UUID(created["id"]))


async def test_submit_creates_lead_with_capture_metadata(api_client, admin, agent):
    admin_token = await _login(api_client, admin["email"], admin["password"])
    created = await _create_widget(api_client, admin_token, agent["id"])

    resp = await api_client.post(
        f"/embed/{created['widget_key']}/submit",
        json={
            "name": "Website Visitor",
            "phone": _unique_phone(),
            "email": _unique_email("visitor"),
            "service_type": "flight",
            "landing_page_url": "https://example-travel-agency.com/deals",
            "visitor_local_ip": "192.168.1.42",
            "details": {"from": "DEL", "to": "BOM", "departure_date": "2026-09-01", "trip_type": "oneway"},
        },
        headers={"X-Forwarded-For": "203.0.113.7, 10.0.0.1"},
    )
    assert resp.status_code == 201, resp.text
    assert resp.json() == {"success": True}

    agent_token = await _login(api_client, agent["email"], agent["password"])
    listing = await api_client.get("/leads", headers=_auth(agent_token))
    assert listing.status_code == 200
    matches = [row for row in listing.json() if row["source"] == "Website Widget: Homepage Widget"]
    assert len(matches) == 1
    lead_id = matches[0]["id"]

    detail = await api_client.get(f"/leads/{lead_id}", headers=_auth(agent_token))
    body = detail.json()
    assert body["agent_id"] == str(agent["id"])
    assert body["service_type"] == "flight"
    assert body["landing_page_url"] == "https://example-travel-agency.com/deals"
    assert body["visitor_local_ip"] == "192.168.1.42"
    assert body["visitor_public_ip"] == "203.0.113.7"
    assert body["embed_submission"]["from"] == "DEL"
    assert body["embed_widget_id"] == created["id"]

    widgets = await api_client.get("/admin/embed-widgets", headers=_auth(admin_token))
    updated = next(w for w in widgets.json() if w["id"] == created["id"])
    assert updated["submission_count"] == 1

    await _delete_lead(uuid.UUID(lead_id))
    await _delete_widget(uuid.UUID(created["id"]))


async def test_submit_has_open_cors_headers(api_client, admin, agent):
    admin_token = await _login(api_client, admin["email"], admin["password"])
    created = await _create_widget(api_client, admin_token, agent["id"])

    preflight = await api_client.options(
        f"/embed/{created['widget_key']}/submit",
        headers={"Origin": "https://some-random-landing-page.com", "Access-Control-Request-Method": "POST"},
    )
    assert preflight.headers.get("access-control-allow-origin") == "*"

    resp = await api_client.post(
        f"/embed/{created['widget_key']}/submit",
        json={
            "name": "CORS Check",
            "phone": _unique_phone(),
            "email": _unique_email("cors"),
            "service_type": "car",
            "details": {},
        },
        headers={"Origin": "https://some-random-landing-page.com"},
    )
    assert resp.headers.get("access-control-allow-origin") == "*"

    agent_token = await _login(api_client, agent["email"], agent["password"])
    listing = await api_client.get("/leads", headers=_auth(agent_token))
    matches = [row for row in listing.json() if row["source"] == "Website Widget: Homepage Widget"]
    for row in matches:
        await _delete_lead(uuid.UUID(row["id"]))
    await _delete_widget(uuid.UUID(created["id"]))


async def test_duplicate_detection_applies_to_widget_submissions(api_client, admin, agent):
    admin_token = await _login(api_client, admin["email"], admin["password"])
    created = await _create_widget(api_client, admin_token, agent["id"])
    phone = _unique_phone()

    first = await api_client.post(
        f"/embed/{created['widget_key']}/submit",
        json={"name": "Dup One", "phone": phone, "email": _unique_email("edup1"), "service_type": "hotel", "details": {}},
    )
    assert first.status_code == 201

    second = await api_client.post(
        f"/embed/{created['widget_key']}/submit",
        json={"name": "Dup Two", "phone": phone, "email": _unique_email("edup2"), "service_type": "hotel", "details": {}},
    )
    assert second.status_code == 201

    agent_token = await _login(api_client, agent["email"], agent["password"])
    listing = await api_client.get("/leads", headers=_auth(agent_token))
    matches = [row for row in listing.json() if row["source"] == "Website Widget: Homepage Widget"]
    assert len(matches) == 2
    assert any(row["is_duplicate"] for row in matches)

    for row in matches:
        await _delete_lead(uuid.UUID(row["id"]))
    await _delete_widget(uuid.UUID(created["id"]))
