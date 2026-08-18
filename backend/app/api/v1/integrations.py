"""External integrations — TECHNICAL_SPEC.md §10.3. Two audiences, two routers
in one file: Admin/Super Admin manage API keys (JWT auth, like everything
else in this API); Zapier/Make/any external form or API calls the capture
endpoint (X-API-Key auth — see app/api/deps.py:require_api_key).
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_api_key, require_permission
from app.db.session import get_db
from app.domain.api_keys import generate_api_key
from app.domain.duplicate_check import find_duplicate_candidates
from app.domain.process_log import log_process_event
from app.models.integration import ApiKey
from app.models.lead import Lead
from app.models.user import User
from app.schemas.integration import (
    ApiKeyCreate,
    ApiKeyCreated,
    ApiKeyRead,
    ApiKeyUpdate,
    LeadCaptureRequest,
    LeadCaptureResponse,
)

keys_router = APIRouter(prefix="/integrations/api-keys", tags=["integrations"])
capture_router = APIRouter(prefix="/leads", tags=["integrations"])

MANAGE_KEYS_PERMISSIONS = ("integrations.manage",)


@keys_router.post("", response_model=ApiKeyCreated, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    payload: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(*MANAGE_KEYS_PERMISSIONS)),
) -> ApiKeyCreated:
    assigned_agent = await db.get(User, payload.assigned_agent_id)
    if assigned_agent is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "assigned_agent_id does not match an existing user")

    full_key, prefix, key_hash = generate_api_key()
    record = ApiKey(
        name=payload.name,
        key_prefix=prefix,
        key_hash=key_hash,
        assigned_agent_id=payload.assigned_agent_id,
        created_by=current_user.id,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return ApiKeyCreated(
        id=record.id,
        name=record.name,
        api_key=full_key,
        key_prefix=record.key_prefix,
        assigned_agent_id=record.assigned_agent_id,
        created_at=record.created_at,
    )


@keys_router.get("", response_model=list[ApiKeyRead])
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(*MANAGE_KEYS_PERMISSIONS)),
) -> list[ApiKey]:
    result = await db.execute(select(ApiKey).order_by(ApiKey.created_at.desc()))
    return list(result.scalars().all())


@keys_router.patch("/{key_id}", response_model=ApiKeyRead)
async def update_api_key(
    key_id: uuid.UUID,
    payload: ApiKeyUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(*MANAGE_KEYS_PERMISSIONS)),
) -> ApiKey:
    """Soft-revoke only (is_active=False) — never a hard delete, so the
    audit trail of what keys existed and when they were cut off survives."""
    record = await db.get(ApiKey, key_id)
    if record is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "API key not found")
    record.is_active = payload.is_active
    await db.commit()
    await db.refresh(record)
    return record


@capture_router.post("/capture", response_model=LeadCaptureResponse, status_code=status.HTTP_201_CREATED)
async def capture_external_lead(
    payload: LeadCaptureRequest,
    db: AsyncSession = Depends(get_db),
    api_key: ApiKey = Depends(require_api_key),
) -> LeadCaptureResponse:
    """The unified external capture endpoint — same lead-creation path and
    duplicate-detection as the in-app intake flow (PRD §4.1), just reached
    over an API key instead of a staff session, and attributed to whichever
    agent this key is assigned to."""
    lead = Lead(
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        agent_id=api_key.assigned_agent_id,
        source=payload.source or api_key.name,
    )
    db.add(lead)
    await db.flush()

    candidates = await find_duplicate_candidates(
        db, name=lead.name, phone=lead.phone, email=lead.email, exclude_lead_id=lead.id
    )
    if candidates:
        lead.is_duplicate = True
        lead.duplicate_of_id = candidates[0].id

    log_process_event(
        db,
        lead_id=lead.id,
        actor_id=api_key.assigned_agent_id,
        action="external_capture",
        field_changed=None,
        old_value=None,
        new_value={"api_key": api_key.name, "source": lead.source, "notes": payload.notes},
    )

    await db.commit()
    await db.refresh(lead)

    return LeadCaptureResponse(lead_id=lead.id, status=lead.status.value, is_duplicate=lead.is_duplicate)
