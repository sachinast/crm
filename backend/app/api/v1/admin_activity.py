"""Master Admin — Activity Log. Paginated read API over the general-purpose
activity_log table (migration 0008, app/domain/activity_log.py) — logins,
admin config changes, conversations started, and denied PII-reveal attempts.
Separate from the existing lead-scoped GET /audit/process-log.

Gated on admin.view_activity_log (admin + super_admin hold it by default —
see migration 0006's seed) rather than the broader audit.view, since this
surfaces account-level activity (every login attempt, every admin action)
that's a level more sensitive than the booking-lifecycle logs audit.view
already gates.
"""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_permission
from app.db.session import get_db
from app.models.activity import ActivityLog
from app.models.user import User
from app.schemas.activity import ActivityLogPage, ActivityLogRead

router = APIRouter(prefix="/admin", tags=["admin-activity"])

READ_PERMISSIONS = ("admin.view_activity_log",)


@router.get("/activity", response_model=ActivityLogPage)
async def list_activity(
    actor_id: uuid.UUID | None = None,
    category: str | None = None,
    since: datetime | None = None,
    until: datetime | None = None,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(*READ_PERMISSIONS)),
) -> ActivityLogPage:
    page = max(page, 1)
    page_size = min(max(page_size, 1), 200)

    filters = []
    if actor_id is not None:
        filters.append(ActivityLog.actor_id == actor_id)
    if category is not None:
        filters.append(ActivityLog.category == category)
    if since is not None:
        filters.append(ActivityLog.created_at >= since)
    if until is not None:
        filters.append(ActivityLog.created_at <= until)

    count_stmt = select(func.count()).select_from(ActivityLog)
    for f in filters:
        count_stmt = count_stmt.where(f)
    total = await db.scalar(count_stmt) or 0

    stmt = (
        select(ActivityLog, User.name)
        .outerjoin(User, ActivityLog.actor_id == User.id)
        .order_by(ActivityLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    for f in filters:
        stmt = stmt.where(f)

    rows = (await db.execute(stmt)).all()
    items = [
        ActivityLogRead(
            id=row.id,
            actor_id=row.actor_id,
            actor_name=actor_name,
            action=row.action,
            category=row.category,
            target_type=row.target_type,
            target_id=row.target_id,
            metadata=row.extra,
            ip_address=None if row.ip_address is None else str(row.ip_address),
            user_agent=row.user_agent,
            created_at=row.created_at,
        )
        for row, actor_name in rows
    ]
    return ActivityLogPage(items=items, total=total, page=page, page_size=page_size)
