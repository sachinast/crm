"""Read-side helper for the app_settings key-value store (migration 0009,
app/models/settings.py) — used by application code that consumes a setting's
current value, as opposed to app/api/v1/admin_settings.py which is the
admin-facing CRUD surface.

Every call site takes a `default`: a key an admin deletes (or that's missing
because a migration/seed hasn't run) degrades to that default rather than
crashing the feature that reads it.
"""
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.settings import AppSetting


async def get_setting_value(db: AsyncSession, key: str, default: Any) -> Any:
    setting = await db.get(AppSetting, key)
    return setting.value if setting is not None else default
