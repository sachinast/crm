"""Attendance — check-in/check-out, one record per user per calendar day
(migration 0013). Own records for everyone; attendance.view_all (Admin/
Super Admin/TL by default) can browse everyone's.
"""
import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_permission
from app.db.session import get_db
from app.models.attendance import AttendanceRecord
from app.models.user import User
from app.schemas.attendance import AttendanceRead, CheckInResult

router = APIRouter(prefix="/attendance", tags=["attendance"])

VIEW_ALL_PERMISSIONS = ("attendance.view_all",)


def _to_read(record: AttendanceRecord, user_name: str | None = None) -> AttendanceRead:
    return AttendanceRead(
        id=record.id, user_id=record.user_id, user_name=user_name, work_date=record.work_date,
        check_in_at=record.check_in_at, check_out_at=record.check_out_at, notes=record.notes,
    )


@router.get("/today", response_model=CheckInResult)
async def get_today(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CheckInResult:
    today = datetime.now(timezone.utc).date()
    record = await db.scalar(
        select(AttendanceRecord).where(AttendanceRecord.user_id == current_user.id, AttendanceRecord.work_date == today)
    )
    return CheckInResult(checked_in=record is not None, record=_to_read(record) if record else None)


@router.post("/check-in", response_model=AttendanceRead, status_code=status.HTTP_201_CREATED)
async def check_in(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AttendanceRead:
    today = datetime.now(timezone.utc).date()
    existing = await db.scalar(
        select(AttendanceRecord).where(AttendanceRecord.user_id == current_user.id, AttendanceRecord.work_date == today)
    )
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Already checked in today")

    record = AttendanceRecord(user_id=current_user.id, work_date=today, check_in_at=datetime.now(timezone.utc))
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return _to_read(record)


@router.post("/check-out", response_model=AttendanceRead)
async def check_out(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AttendanceRead:
    today = datetime.now(timezone.utc).date()
    record = await db.scalar(
        select(AttendanceRecord).where(AttendanceRecord.user_id == current_user.id, AttendanceRecord.work_date == today)
    )
    if record is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "You haven't checked in today")
    if record.check_out_at is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Already checked out today")

    record.check_out_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(record)
    return _to_read(record)


@router.get("/me", response_model=list[AttendanceRead])
async def list_my_attendance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AttendanceRead]:
    result = await db.execute(
        select(AttendanceRecord)
        .where(AttendanceRecord.user_id == current_user.id)
        .order_by(AttendanceRecord.work_date.desc())
        .limit(60)
    )
    return [_to_read(r) for r in result.scalars().all()]


@router.get("", response_model=list[AttendanceRead])
async def list_all_attendance(
    user_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(*VIEW_ALL_PERMISSIONS)),
) -> list[AttendanceRead]:
    stmt = (
        select(AttendanceRecord, User.name)
        .join(User, User.id == AttendanceRecord.user_id)
        .order_by(AttendanceRecord.work_date.desc())
    )
    if user_id is not None:
        stmt = stmt.where(AttendanceRecord.user_id == user_id)
    if date_from is not None:
        stmt = stmt.where(AttendanceRecord.work_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(AttendanceRecord.work_date <= date_to)
    rows = (await db.execute(stmt)).all()
    return [_to_read(record, name) for record, name in rows]
