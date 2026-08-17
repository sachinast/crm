"""Duplicate-lead detection — PRD §4.1 Step 2 / TECHNICAL_SPEC.md §4.1, §11.1.

"On submission, the system automatically searches existing Leads and Booking
records for a match on Name, Number, OR Email." Booking records hold no
contact fields of their own (car/hotel/flight bookings link back to a single
parent Lead for name/phone/email), so searching Leads covers both.

Match rule: exact match on phone OR email, fuzzy (trigram) match on name so
near-duplicates ("Jon Smith" vs "John Smith") still surface. The PRD doesn't
pin a similarity number — 0.4 is pg_trgm's own default `similarity` threshold
and a reasonable starting point; tune via SIMILARITY_THRESHOLD if it proves
too loose/tight in practice.
"""
import uuid

from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead import Lead

SIMILARITY_THRESHOLD = 0.4
MAX_CANDIDATES = 10


def _candidate_query(*, exclude_lead_id: uuid.UUID | None, name: str, phone: str, email: str) -> Select:
    stmt = select(Lead).where(
        or_(
            Lead.phone == phone,
            Lead.email == email,
            func.similarity(Lead.name, name) >= SIMILARITY_THRESHOLD,
        )
    )
    if exclude_lead_id is not None:
        stmt = stmt.where(Lead.id != exclude_lead_id)
    return stmt.order_by(func.similarity(Lead.name, name).desc()).limit(MAX_CANDIDATES)


async def find_duplicate_candidates(
    db: AsyncSession,
    *,
    name: str,
    phone: str,
    email: str,
    exclude_lead_id: uuid.UUID | None = None,
) -> list[Lead]:
    result = await db.execute(_candidate_query(exclude_lead_id=exclude_lead_id, name=name, phone=phone, email=email))
    return list(result.scalars().all())
