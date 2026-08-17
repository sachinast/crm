import uuid
from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import apply_lead_visibility, get_visible_lead_or_404, require_ip_whitelisted, require_role
from app.db.session import get_db
from app.domain.duplicate_check import find_duplicate_candidates
from app.domain.process_log import log_process_event
from app.domain.status_machine import can_set, can_transition
from app.models.audit import AccessNotificationLog, Notification, PiiRevealAuditLog, StatusHistory
from app.models.enums import BookingStatus, PiiField, ServiceType, UserRole
from app.models.lead import Lead
from app.models.payment import PaymentTransaction
from app.models.status import StatusLookup
from app.models.user import User
from app.schemas.audit import RevealRequest, RevealResult
from app.schemas.lead import (
    AvailableTransition,
    DuplicateCheckResult,
    LeadConfirm,
    LeadCreate,
    LeadRead,
    LeadSummary,
    ServiceTypeUpdate,
    StatusHistoryEntry,
    StatusUpdate,
)
from app.services.status_transitions import apply_status_transition

router = APIRouter(prefix="/leads", tags=["leads"])

# Lead intake is an Agent action; Admin/Super Admin can act on an agent's behalf
# for support purposes. Everyone else only reads (subject to apply_lead_visibility).
INTAKE_ROLES = (UserRole.agent, UserRole.admin, UserRole.super_admin)


@router.post("", response_model=LeadRead, status_code=status.HTTP_201_CREATED)
async def create_lead(
    payload: LeadCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*INTAKE_ROLES)),
) -> Lead:
    """PRD §4.1 Step 1 + Step 2 — create the lead, then immediately run the
    duplicate search so is_duplicate/duplicate_of_id are already known by the
    time the response comes back (GET .../duplicate-check re-runs it to return
    the full candidate list for the UI's confirmation prompt)."""
    lead = Lead(name=payload.name, phone=payload.phone, email=payload.email, agent_id=current_user.id)
    db.add(lead)
    await db.flush()  # assigns lead.id without committing

    candidates = await find_duplicate_candidates(
        db, name=lead.name, phone=lead.phone, email=lead.email, exclude_lead_id=lead.id
    )
    if candidates:
        lead.is_duplicate = True
        lead.duplicate_of_id = candidates[0].id

    log_process_event(db, lead_id=lead.id, actor_id=current_user.id, action="created")

    await db.commit()
    await db.refresh(lead)
    return lead


@router.get("/{lead_id}/duplicate-check", response_model=DuplicateCheckResult)
async def duplicate_check(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ip_whitelisted),
) -> DuplicateCheckResult:
    """PRD §4.1 Step 2 — the candidate list backing the "Client already existed
    — do you still want to proceed?" prompt."""
    lead = await get_visible_lead_or_404(db, current_user, lead_id)
    candidates = await find_duplicate_candidates(
        db, name=lead.name, phone=lead.phone, email=lead.email, exclude_lead_id=lead.id
    )
    return DuplicateCheckResult(
        is_duplicate=bool(candidates),
        candidates=[LeadSummary.model_validate(c) for c in candidates],
    )


@router.post("/{lead_id}/confirm", response_model=LeadRead)
async def confirm_duplicate(
    lead_id: uuid.UUID,
    payload: LeadConfirm,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*INTAKE_ROLES)),
) -> Lead:
    """PRD §4.1 Step 3 — the agent's explicit override. Required before
    PATCH .../service-type will unlock a lead flagged is_duplicate."""
    lead = await get_visible_lead_or_404(db, current_user, lead_id)
    lead.duplicate_override_reason = payload.reason
    log_process_event(
        db,
        lead_id=lead.id,
        actor_id=current_user.id,
        action="field_update",
        field_changed="duplicate_override_reason",
        old_value=None,
        new_value=payload.reason,
    )
    await db.commit()
    await db.refresh(lead)
    return lead


@router.patch("/{lead_id}/service-type", response_model=LeadRead)
async def set_service_type(
    lead_id: uuid.UUID,
    payload: ServiceTypeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*INTAKE_ROLES)),
) -> Lead:
    """PRD §4.1 Step 4 — unlocks the service-specific booking form. Blocked
    until an is_duplicate lead has gone through POST .../confirm."""
    lead = await get_visible_lead_or_404(db, current_user, lead_id)
    if lead.is_duplicate and not lead.duplicate_override_reason:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This lead matched an existing record — confirm via POST /leads/{id}/confirm before continuing",
        )
    old_service_type = lead.service_type
    lead.service_type = payload.service_type
    log_process_event(
        db,
        lead_id=lead.id,
        actor_id=current_user.id,
        action="field_update",
        field_changed="service_type",
        old_value=old_service_type.value if old_service_type else None,
        new_value=payload.service_type.value,
    )
    await db.commit()
    await db.refresh(lead)
    return lead


@router.get("", response_model=list[LeadRead])
async def list_leads(
    status_: BookingStatus | None = None,
    service_type: ServiceType | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    email: str | None = None,
    mobile: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ip_whitelisted),
) -> list[Lead]:
    """TECHNICAL_SPEC.md §5 — filters: Date, Email, Mobile (+ status/service_type),
    row-filtered per apply_lead_visibility (§4.1)."""
    stmt = apply_lead_visibility(select(Lead), current_user)

    if status_ is not None:
        stmt = stmt.where(Lead.status == status_)
    if service_type is not None:
        stmt = stmt.where(Lead.service_type == service_type)
    if date_from is not None:
        stmt = stmt.where(Lead.created_at >= datetime.combine(date_from, time.min, tzinfo=timezone.utc))
    if date_to is not None:
        stmt = stmt.where(Lead.created_at <= datetime.combine(date_to, time.max, tzinfo=timezone.utc))
    if email:
        stmt = stmt.where(Lead.email.ilike(f"%{email}%"))
    if mobile:
        stmt = stmt.where(Lead.phone.ilike(f"%{mobile}%"))

    stmt = stmt.order_by(Lead.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/{lead_id}", response_model=LeadRead)
async def get_lead(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ip_whitelisted),
) -> Lead:
    """TECHNICAL_SPEC.md §5 — "fires access_notification_log insert + notify
    admin/owning agent". The audit-log write and the notification rows happen
    inline here; real-time delivery (WebSocket/Celery fan-out) is Phase 4
    alongside the rest of the status-driven notification system — these rows
    are already a working, queryable notification inbox on their own."""
    lead = await get_visible_lead_or_404(db, current_user, lead_id)

    db.add(AccessNotificationLog(lead_id=lead.id, opened_by=current_user.id))
    db.add(
        Notification(
            lead_id=lead.id,
            recipient_role=UserRole.admin,
            type="record_opened",
            message=f"{current_user.name} opened lead {lead.id}",
        )
    )
    if current_user.id != lead.agent_id:
        db.add(
            Notification(
                lead_id=lead.id,
                recipient_user_id=lead.agent_id,
                type="record_opened",
                message=f"{current_user.name} opened your lead {lead.id}",
            )
        )

    await db.commit()
    await db.refresh(lead)
    return lead


@router.get("/{lead_id}/available-transitions", response_model=list[AvailableTransition])
async def get_available_transitions(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ip_whitelisted),
) -> list[StatusLookup]:
    """Drives the status-action buttons on the frontend without duplicating
    the transition graph or role rules there — TECHNICAL_SPEC.md §3."""
    lead = await get_visible_lead_or_404(db, current_user, lead_id)

    reachable = [s for s in BookingStatus if can_transition(lead.status, s) and can_set(s, current_user.role)]
    if not reachable:
        return []

    result = await db.execute(select(StatusLookup).where(StatusLookup.status.in_(reachable)))
    lookups = {row.status: row for row in result.scalars().all()}
    # Preserve the transition-table order rather than whatever order the DB returns.
    return [lookups[s] for s in reachable if s in lookups]


@router.get("/{lead_id}/status-history", response_model=list[StatusHistoryEntry])
async def get_status_history(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ip_whitelisted),
) -> list[StatusHistory]:
    await get_visible_lead_or_404(db, current_user, lead_id)
    result = await db.execute(
        select(StatusHistory).where(StatusHistory.lead_id == lead_id).order_by(StatusHistory.changed_at.desc())
    )
    return list(result.scalars().all())


@router.patch("/{lead_id}/status", response_model=LeadRead)
async def update_status(
    lead_id: uuid.UUID,
    payload: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ip_whitelisted),
) -> Lead:
    """The state-machine endpoint — TECHNICAL_SPEC.md §3.2. `client_approved`/
    `authorization_pending` are SYSTEM/CUSTOMER-only in status_machine's
    transition table, so a staff Bearer token can never set them here — see
    PRD §6.1; the customer-facing "I Authorize" flow that does is
    app/api/v1/authorization.py. See app/services/status_transitions.py for
    the row-lock/validate/history/notify/push mechanics, shared with
    POST /payments (Billing charging/declining is the same kind of transition).
    """
    lead = await apply_status_transition(db, lead_id=lead_id, target=payload.new_status, actor=current_user)
    await db.commit()
    await db.refresh(lead)
    return lead


@router.post("/{lead_id}/reveal", response_model=RevealResult)
async def reveal_pii(
    lead_id: uuid.UUID,
    payload: RevealRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ip_whitelisted),
) -> RevealResult:
    """PRD §9.1 "Click-to-Reveal" / §9.2 reveal audit log. Anyone who can
    already see the lead can reveal its masked fields — masking is
    presentation, not an extra permission gate; the reason + logged access
    (agent, field, timestamp, IP, device, CRM ID) is the actual control an
    Admin reviews after the fact."""
    lead = await get_visible_lead_or_404(db, current_user, lead_id)

    if payload.field == PiiField.email:
        raw_value = lead.email
    elif payload.field == PiiField.phone:
        raw_value = lead.phone
    else:
        # There is no more to "reveal" beyond the last-4 on file — this system
        # never stores a full PAN (TECHNICAL_SPEC.md §8) — but the action is
        # still logged like any other reveal, for one consistent audit trail.
        result = await db.execute(
            select(PaymentTransaction)
            .where(PaymentTransaction.lead_id == lead.id)
            .order_by(PaymentTransaction.created_at.desc())
            .limit(1)
        )
        payment = result.scalar_one_or_none()
        if payment is None or not payment.card_last_four:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "No card on file for this lead")
        raw_value = payment.card_last_four

    client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (
        request.client.host if request.client else "0.0.0.0"
    )
    db.add(
        PiiRevealAuditLog(
            lead_id=lead.id,
            agent_id=current_user.id,
            field_revealed=payload.field,
            reason=payload.reason,
            ip_address=client_ip,
            user_agent=request.headers.get("user-agent", "unknown"),
        )
    )
    await db.commit()

    return RevealResult(field=payload.field, value=raw_value)
