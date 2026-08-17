"""Booking Process Log — TECHNICAL_SPEC.md §9.3, PRD's admin-only master "Log
Report of Booking Process". Covers changes to the Lead/Booking_Core record
itself (creation, service-type selection, duplicate-override confirmation,
status transitions) — not every child table in the schema, matching
TECHNICAL_SPEC.md §11.1's framing of "Leads / Booking_Core" as the central
record this log is about.

Insert-only at the application layer: nothing in this codebase ever calls
db.delete()/setattr() on a BookingProcessLog row, only db.add(). A real
insert-only guarantee (REVOKE UPDATE, DELETE at the DB role level) needs a
non-owner application DB role, which is a Phase 9 hardening item — the local
dev role currently owns the schema, so a REVOKE would be a no-op (see the
migration 0001 comment where this was first flagged).
"""
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import BookingProcessLog


def log_process_event(
    db: AsyncSession,
    *,
    lead_id: uuid.UUID,
    actor_id: uuid.UUID,
    action: str,
    field_changed: str | None = None,
    old_value: Any = None,
    new_value: Any = None,
) -> None:
    db.add(
        BookingProcessLog(
            lead_id=lead_id,
            actor_id=actor_id,
            action=action,
            field_changed=field_changed,
            old_value=old_value,
            new_value=new_value,
        )
    )
