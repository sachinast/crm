"""In-app messaging — every active user can message every other active user.
Independent of the lead-visibility RBAC model used elsewhere in this API;
the only access control here is "are you a participant in this conversation"
(see app/models/messaging.py for the schema-level design notes).
"""
import uuid
from datetime import datetime, timezone

from jose import JWTError

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, oauth2_scheme
from app.api.v1.websocket import connection_manager
from app.core.config import get_settings
from app.core.security import decode_token
from app.db.session import get_db
from app.domain.file_validation import FileValidationError, validate_attachment
from app.models.audit import Notification
from app.models.messaging import Conversation, ConversationParticipant, Message, MessageAttachment, MessageMention
from app.models.user import User
from app.schemas.messaging import (
    AttachmentRead,
    ConversationCreate,
    ConversationRead,
    MentionRead,
    MessageCreate,
    MessageRead,
    ParticipantRead,
    UserSearchResult,
)

router = APIRouter(prefix="/messaging", tags=["messaging"])
settings = get_settings()


async def _get_participant(
    db: AsyncSession, conversation_id: uuid.UUID, user_id: uuid.UUID
) -> ConversationParticipant | None:
    result = await db.execute(
        select(ConversationParticipant).where(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def _require_participant(
    db: AsyncSession, conversation_id: uuid.UUID, user: User
) -> ConversationParticipant:
    participant = await _get_participant(db, conversation_id, user.id)
    if participant is None:
        # 404, not 403 — don't confirm a conversation exists to a non-member.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found")
    return participant


async def _message_status(db: AsyncSession, message: Message, viewer_id: uuid.UUID) -> str:
    if message.sender_id != viewer_id:
        # Ticks are a sent-message affordance (WhatsApp-style); status on an
        # incoming message isn't rendered by the frontend either way.
        return "read"

    others = await db.execute(
        select(ConversationParticipant).where(
            ConversationParticipant.conversation_id == message.conversation_id,
            ConversationParticipant.user_id != viewer_id,
        )
    )
    other_participants = list(others.scalars().all())
    if not other_participants:
        return "sent"
    if all(p.last_read_at is not None and p.last_read_at >= message.created_at for p in other_participants):
        return "read"
    if message.delivered_at is not None:
        return "delivered"
    return "sent"


async def _serialize_message(db: AsyncSession, message: Message, viewer_id: uuid.UUID) -> MessageRead:
    sender = await db.get(User, message.sender_id)
    mention_rows = await db.execute(select(MessageMention).where(MessageMention.message_id == message.id))
    mentions = list(mention_rows.scalars().all())
    mention_users = {m.mentioned_user_id: await db.get(User, m.mentioned_user_id) for m in mentions}

    attachment_rows = await db.execute(
        select(MessageAttachment).where(MessageAttachment.message_id == message.id)
    )
    attachments = list(attachment_rows.scalars().all())

    return MessageRead(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        sender_name=sender.name if sender else "Unknown",
        body=message.body,
        is_quick_response=message.is_quick_response,
        mentions=[
            MentionRead(user_id=uid, name=u.name if u else "Unknown") for uid, u in mention_users.items()
        ],
        attachments=[
            AttachmentRead(
                id=a.id, file_name=a.file_name, content_type=a.content_type, kind=a.kind, size_bytes=a.size_bytes
            )
            for a in attachments
        ],
        created_at=message.created_at,
        status=await _message_status(db, message, viewer_id),
    )


@router.get("/users", response_model=list[UserSearchResult])
async def search_users(
    query: str = Query("", max_length=100),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[User]:
    """Directory search for starting a conversation / @mention autocomplete —
    deliberately open to every authenticated user (not admin-gated like
    GET /users), since messaging is a peer-to-peer feature, not an admin tool.
    Only name/email/role are exposed (see UserSearchResult), same fields as
    everyone can already see about a lead's assigned agent elsewhere.
    """
    stmt = select(User).where(User.is_active.is_(True), User.id != current_user.id)
    if query:
        like = f"%{query}%"
        stmt = stmt.where(or_(User.name.ilike(like), User.email.ilike(like)))
    stmt = stmt.order_by(User.name).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("/conversations", response_model=ConversationRead, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    payload: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationRead:
    other_ids = {uid for uid in payload.participant_user_ids if uid != current_user.id}
    if not other_ids:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Pick at least one other user")

    existing_users = await db.execute(select(User).where(User.id.in_(other_ids), User.is_active.is_(True)))
    found = {u.id for u in existing_users.scalars().all()}
    missing = other_ids - found
    if missing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"User(s) not found: {', '.join(str(m) for m in missing)}")

    is_group = len(other_ids) > 1

    if not is_group:
        # Idempotent 1:1 — reuse an existing direct conversation between
        # exactly these two people instead of spawning duplicates every time
        # someone reopens a chat.
        other_id = next(iter(other_ids))
        candidate_convos = await db.execute(
            select(Conversation.id)
            .join(ConversationParticipant, ConversationParticipant.conversation_id == Conversation.id)
            .where(Conversation.is_group.is_(False))
            .group_by(Conversation.id)
            .having(func.count(ConversationParticipant.user_id) == 2)
        )
        for (conv_id,) in candidate_convos:
            members = await db.execute(
                select(ConversationParticipant.user_id).where(ConversationParticipant.conversation_id == conv_id)
            )
            member_ids = {m for (m,) in members}
            if member_ids == {current_user.id, other_id}:
                return await _load_conversation(db, conv_id, current_user.id)

    conversation = Conversation(
        is_group=is_group,
        name=payload.name if is_group else None,
        created_by=current_user.id,
    )
    db.add(conversation)
    await db.flush()

    for uid in {current_user.id, *other_ids}:
        db.add(ConversationParticipant(conversation_id=conversation.id, user_id=uid))

    await db.commit()
    return await _load_conversation(db, conversation.id, current_user.id)


async def _load_conversation(db: AsyncSession, conversation_id: uuid.UUID, viewer_id: uuid.UUID) -> ConversationRead:
    # A plain db.get() would silently skip the eager-load option whenever the
    # object is already in the session's identity map (e.g. right after
    # create_conversation's own db.add/flush) and just return the cached
    # instance — which then trips a sync lazy-load on .participants below.
    # An explicit select() always re-applies loader options.
    conversation_row = await db.execute(
        select(Conversation).options(selectinload(Conversation.participants)).where(Conversation.id == conversation_id)
    )
    conversation = conversation_row.scalar_one()

    participants: list[ParticipantRead] = []
    for p in conversation.participants:
        u = await db.get(User, p.user_id)
        if u:
            participants.append(ParticipantRead(id=u.id, name=u.name, email=u.email, role=u.role))

    last_msg_row = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(1)
    )
    last_message = last_msg_row.scalar_one_or_none()

    viewer_participant = await _get_participant(db, conversation_id, viewer_id)
    unread_count = 0
    if viewer_participant is not None:
        cutoff = viewer_participant.last_read_at or datetime.fromtimestamp(0, tz=timezone.utc)
        count_row = await db.execute(
            select(func.count(Message.id)).where(
                Message.conversation_id == conversation_id,
                Message.sender_id != viewer_id,
                Message.created_at > cutoff,
            )
        )
        unread_count = count_row.scalar_one()

    return ConversationRead(
        id=conversation.id,
        is_group=conversation.is_group,
        name=conversation.name,
        participants=participants,
        created_at=conversation.created_at,
        last_message=(await _serialize_message(db, last_message, viewer_id)) if last_message else None,
        unread_count=unread_count,
    )


@router.get("/conversations", response_model=list[ConversationRead])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ConversationRead]:
    result = await db.execute(
        select(ConversationParticipant.conversation_id).where(ConversationParticipant.user_id == current_user.id)
    )
    conversation_ids = [row[0] for row in result.all()]

    conversations = [await _load_conversation(db, cid, current_user.id) for cid in conversation_ids]
    conversations.sort(
        key=lambda c: c.last_message.created_at if c.last_message else c.created_at,
        reverse=True,
    )
    return conversations


@router.get("/unread-count")
async def unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(ConversationParticipant).where(ConversationParticipant.user_id == current_user.id)
    )
    total = 0
    for participant in result.scalars().all():
        cutoff = participant.last_read_at or datetime.fromtimestamp(0, tz=timezone.utc)
        count_row = await db.execute(
            select(func.count(Message.id)).where(
                Message.conversation_id == participant.conversation_id,
                Message.sender_id != current_user.id,
                Message.created_at > cutoff,
            )
        )
        total += count_row.scalar_one()
    return {"unread_count": total}


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageRead])
async def list_messages(
    conversation_id: uuid.UUID,
    before: datetime | None = None,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MessageRead]:
    await _require_participant(db, conversation_id, current_user)

    stmt = select(Message).where(Message.conversation_id == conversation_id)
    if before is not None:
        stmt = stmt.where(Message.created_at < before)
    stmt = stmt.order_by(Message.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    messages = list(result.scalars().all())

    # Fetching the thread marks anything sent by others as delivered — the
    # requester's client just received it, whether or not they were online
    # at send time (covers the offline-then-later-open case honestly rather
    # than leaving it stuck on "sent" forever).
    now = datetime.now(timezone.utc)
    undelivered_ids = [m.id for m in messages if m.sender_id != current_user.id and m.delivered_at is None]
    if undelivered_ids:
        await db.execute(update(Message).where(Message.id.in_(undelivered_ids)).values(delivered_at=now))
        await db.commit()
        for m in messages:
            if m.id in undelivered_ids:
                m.delivered_at = now

    serialized = [await _serialize_message(db, m, current_user.id) for m in messages]
    serialized.reverse()  # oldest -> newest, ready to render top-to-bottom
    return serialized


@router.post("/conversations/{conversation_id}/messages", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: uuid.UUID,
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageRead:
    await _require_participant(db, conversation_id, current_user)

    if not payload.body and not payload.attachment_ids:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Message needs text or at least one attachment")

    participants_result = await db.execute(
        select(ConversationParticipant).where(ConversationParticipant.conversation_id == conversation_id)
    )
    participants = list(participants_result.scalars().all())
    participant_ids = {p.user_id for p in participants}

    invalid_mentions = set(payload.mentioned_user_ids) - participant_ids
    if invalid_mentions:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Can only mention participants of this conversation: {', '.join(str(m) for m in invalid_mentions)}",
        )

    # Attachments are uploaded separately first (so the composer can show an
    # "uploading" state before send) — claim them here, checked for ownership
    # so one user can't attach another user's uploaded file to their message.
    attachments: list[MessageAttachment] = []
    for att_id in payload.attachment_ids:
        attachment = await db.get(MessageAttachment, att_id)
        if attachment is None or attachment.uploaded_by != current_user.id or attachment.message_id is not None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"Attachment not found: {att_id}")
        attachments.append(attachment)

    # "Delivered" is set immediately if any other participant currently has
    # a live WebSocket connection — see the module docstring in
    # app/models/messaging.py for what this signal does and doesn't promise.
    others_online = any(
        connection_manager.is_user_online(uid) for uid in participant_ids if uid != current_user.id
    )

    message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        body=payload.body,
        is_quick_response=payload.is_quick_response,
        delivered_at=datetime.now(timezone.utc) if others_online else None,
    )
    db.add(message)
    await db.flush()

    for attachment in attachments:
        attachment.message_id = message.id

    for uid in payload.mentioned_user_ids:
        db.add(MessageMention(message_id=message.id, mentioned_user_id=uid))

    await db.commit()

    serialized = await _serialize_message(db, message, current_user.id)

    # Push to every other participant's live connection(s), and drop a
    # durable Notification row + push for anyone explicitly @mentioned (the
    # notification bell surfaces mentions; a plain unread message is only
    # ever surfaced via the Messages page's own unread badge, to avoid the
    # bell filling up with routine chat traffic).
    ws_payload = {"type": "chat_message", "conversation_id": str(conversation_id), "message": serialized.model_dump(mode="json")}
    for uid in participant_ids:
        if uid != current_user.id:
            await connection_manager.send_to_user(uid, ws_payload)

    for uid in payload.mentioned_user_ids:
        notification = Notification(
            recipient_user_id=uid,
            type="mention",
            message=f"{current_user.name} mentioned you in a conversation",
        )
        db.add(notification)
        await connection_manager.send_to_user(
            uid,
            {
                "type": "mention",
                "conversation_id": str(conversation_id),
                "message_id": str(message.id),
                "message": f"{current_user.name} mentioned you in a conversation",
            },
        )
    await db.commit()

    return serialized


@router.post("/conversations/{conversation_id}/read")
async def mark_read(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    participant = await _require_participant(db, conversation_id, current_user)
    now = datetime.now(timezone.utc)
    participant.last_read_at = now
    await db.commit()

    others = await db.execute(
        select(ConversationParticipant.user_id).where(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id != current_user.id,
        )
    )
    for (uid,) in others:
        await connection_manager.send_to_user(
            uid,
            {
                "type": "chat_read",
                "conversation_id": str(conversation_id),
                "reader_id": str(current_user.id),
                "read_at": now.isoformat(),
            },
        )
    return {"read_at": now}


@router.post("/attachments", response_model=AttachmentRead, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageAttachment:
    data = await file.read()
    try:
        kind = validate_attachment(
            file_name=file.filename or "upload",
            content_type=file.content_type or "application/octet-stream",
            data=data,
            max_size_bytes=settings.messaging_max_file_size_bytes,
        )
    except FileValidationError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))

    attachment = MessageAttachment(
        message_id=None,
        uploaded_by=current_user.id,
        file_name=file.filename or "upload",
        content_type=file.content_type or "application/octet-stream",
        kind=kind,
        size_bytes=len(data),
        data=data,
    )
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)
    return attachment


async def _current_user_from_token_or_query(
    token_header: str | None,
    token_query: str | None,
    db: AsyncSession,
) -> User:
    """Attachment previews render via plain <img>/<a> tags, which can't set an
    Authorization header — same constraint the WS endpoint has, same fix: a
    short-lived access token accepted as a query param too. Header takes
    priority when both are present.
    """
    raw = token_header or token_query
    if not raw:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = decode_token(raw)
        if payload.get("type") != "access":
            raise ValueError
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError
    except (JWTError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    return user


@router.get("/attachments/{attachment_id}")
async def download_attachment(
    attachment_id: uuid.UUID,
    token: str | None = Query(None),
    auth_token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Response:
    current_user = await _current_user_from_token_or_query(auth_token, token, db)

    attachment = await db.get(MessageAttachment, attachment_id)
    if attachment is None or attachment.message_id is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attachment not found")

    message = await db.get(Message, attachment.message_id)
    await _require_participant(db, message.conversation_id, current_user)

    return Response(
        content=attachment.data,
        media_type=attachment.content_type,
        headers={"Content-Disposition": f'inline; filename="{attachment.file_name}"'},
    )
