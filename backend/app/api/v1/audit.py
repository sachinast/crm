"""Admin-only audit views — TECHNICAL_SPEC.md §5, PRD §9.2/§9.3.

Every endpoint here is Admin/Super Admin only, matching PRD §3.1: Admin has
"access to full 'Log Report of Booking Process'" and Super Admin "views
master audit log". Unlike every lead sub-resource elsewhere in this API,
none of these are gated by apply_lead_visibility — an optional `lead_id`
filter narrows the view, but the underlying access control is purely the
role check, since these ARE the oversight tools.
"""
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.db.session import get_db
from app.models.audit import AccessNotificationLog, BookingProcessLog, PiiRevealAuditLog
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.audit import AccessLogRead, PiiRevealLogRead, ProcessLogRead

router = APIRouter(prefix="/audit", tags=["audit"])

AUDIT_ROLES = (UserRole.admin, UserRole.super_admin)


@router.get("/pii-reveals", response_model=list[PiiRevealLogRead])
async def list_pii_reveals(
    lead_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(*AUDIT_ROLES)),
) -> list[PiiRevealAuditLog]:
    stmt = select(PiiRevealAuditLog)
    if lead_id is not None:
        stmt = stmt.where(PiiRevealAuditLog.lead_id == lead_id)
    stmt = stmt.order_by(PiiRevealAuditLog.revealed_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/process-log", response_model=list[ProcessLogRead])
async def list_process_log(
    lead_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(*AUDIT_ROLES)),
) -> list[BookingProcessLog]:
    """The master "Log Report of Booking Process" — TECHNICAL_SPEC.md §9.3.
    Covers the Lead/Booking_Core record's own lifecycle (created, service
    type selected, duplicate confirmed, every status transition); see
    app/domain/process_log.py for exactly what gets logged and why."""
    stmt = select(BookingProcessLog)
    if lead_id is not None:
        stmt = stmt.where(BookingProcessLog.lead_id == lead_id)
    stmt = stmt.order_by(BookingProcessLog.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/access-log", response_model=list[AccessLogRead])
async def list_access_log(
    lead_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(*AUDIT_ROLES)),
) -> list[AccessNotificationLog]:
    stmt = select(AccessNotificationLog)
    if lead_id is not None:
        stmt = stmt.where(AccessNotificationLog.lead_id == lead_id)
    stmt = stmt.order_by(AccessNotificationLog.opened_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())
