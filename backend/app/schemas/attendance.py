import uuid
from datetime import date, datetime

from pydantic import BaseModel


class AttendanceRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user_name: str | None = None
    work_date: date
    check_in_at: datetime
    check_out_at: datetime | None
    notes: str | None


class CheckInResult(BaseModel):
    checked_in: bool
    record: AttendanceRead | None
