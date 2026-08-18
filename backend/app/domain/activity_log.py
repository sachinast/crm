"""Activity log write helper — mirrors app/domain/process_log.py's shape
(db.add only, caller decides when to commit) for the general-purpose,
account/admin-level activity_log table (migration 0008), as opposed to
process_log.py's lead-scoped booking_process_log.

Milestone-only by design (PRD scope decision for this feature): call sites
log "what happened", not full request/response payloads or message content
— see each call site (app/api/v1/auth.py, admin_roles.py, users.py,
messaging.py, leads.py's PII-reveal-denial path) for what specifically gets
logged and why.
"""
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import ActivityLog


def log_activity(
    db: AsyncSession,
    *,
    actor_id: uuid.UUID | None,
    action: str,
    category: str,
    target_type: str | None = None,
    target_id: uuid.UUID | None = None,
    metadata: dict[str, Any] | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> None:
    db.add(
        ActivityLog(
            actor_id=actor_id,
            action=action,
            category=category,
            target_type=target_type,
            target_id=target_id,
            extra=metadata,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )
