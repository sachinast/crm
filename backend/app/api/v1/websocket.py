"""Real-time notification delivery — TECHNICAL_SPEC.md §5 (`WS /ws/notifications`),
§10.1 (push notifications routed by the Status Reference Table).

ConnectionManager here is a plain in-memory registry, correct for a single
uvicorn worker (what this repo runs in dev/CI). A multi-worker or
horizontally-scaled deployment needs the Redis Pub/Sub design already called
out in TECHNICAL_SPEC.md §1 — a notification fired on worker A has to reach a
client connected to worker B, which an in-process dict can't do. Swapping the
transport is contained to this file; callers only see send_to_user/send_to_role.
"""
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from jose import JWTError

from app.core.security import decode_token
from app.db.session import AsyncSessionLocal
from app.models.enums import UserRole
from app.models.user import User

router = APIRouter()


class ConnectionManager:
    def __init__(self) -> None:
        self._by_user: dict[uuid.UUID, set[WebSocket]] = {}
        self._by_role: dict[UserRole, set[WebSocket]] = {}

    async def connect(self, ws: WebSocket, user: User) -> None:
        await ws.accept()
        self._by_user.setdefault(user.id, set()).add(ws)
        self._by_role.setdefault(user.role, set()).add(ws)

    def disconnect(self, ws: WebSocket, user: User) -> None:
        self._by_user.get(user.id, set()).discard(ws)
        self._by_role.get(user.role, set()).discard(ws)

    async def send_to_user(self, user_id: uuid.UUID, payload: dict) -> None:
        for ws in list(self._by_user.get(user_id, set())):
            await self._safe_send(ws, payload)

    async def send_to_role(self, role: UserRole, payload: dict) -> None:
        for ws in list(self._by_role.get(role, set())):
            await self._safe_send(ws, payload)

    @staticmethod
    async def _safe_send(ws: WebSocket, payload: dict) -> None:
        try:
            await ws.send_json(payload)
        except Exception:
            pass  # connection is already gone; its own receive loop will clean it up


connection_manager = ConnectionManager()


@router.websocket("/notifications")
async def notifications_ws(websocket: WebSocket, token: str) -> None:
    """Auth via `?token=` query param (not a header — browsers can't set
    custom headers on a WebSocket handshake). This is the same short-lived
    access JWT used for REST calls; the frontend fetches it once from
    GET /api/notifications/ws-token (a Next.js route handler reading the
    httpOnly session cookie) rather than ever storing it client-side. See
    frontend/lib/ws-client.ts.
    """
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise ValueError("not an access token")
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("missing sub claim")
    except (JWTError, ValueError):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    async with AsyncSessionLocal() as db:
        user = await db.get(User, user_id)

    if user is None or not user.is_active:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await connection_manager.connect(websocket, user)
    try:
        while True:
            # Nothing meaningful is ever sent client -> server on this channel;
            # this just blocks until disconnect while receive() gives Starlette
            # a way to notice the socket closing.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        connection_manager.disconnect(websocket, user)
