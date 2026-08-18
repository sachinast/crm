import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ActivityLogRead(BaseModel):
    # Deliberately NOT ConfigDict(from_attributes=True) + built straight off
    # the ActivityLog ORM object — every mapped class also exposes
    # Base.metadata (the table registry) as a class attribute named exactly
    # `metadata`, which from_attributes' generic getattr-based conversion
    # would silently grab instead of the actual JSON column (renamed `extra`
    # on the model precisely to avoid that collision — see app/models/activity.py).
    # app/api/v1/admin_activity.py builds these explicitly, field by field,
    # instead.
    id: uuid.UUID
    actor_id: uuid.UUID | None
    actor_name: str | None = None
    action: str
    category: str
    target_type: str | None
    target_id: uuid.UUID | None
    metadata: Any = None
    ip_address: str | None
    user_agent: str | None
    created_at: datetime


class ActivityLogPage(BaseModel):
    items: list[ActivityLogRead]
    total: int
    page: int
    page_size: int
