"""GET /header-clocks — the Super Admin-configured world clocks (app_settings
key "header_clocks"), open to any authenticated user since every user's own
header needs to read it to render their (individually toggled) clocks.
Mirrors GET /messaging/quick-replies' same "any user needs this admin-set
value" pattern.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.domain.settings import get_setting_value
from app.models.user import User

router = APIRouter(tags=["header-clocks"])

DEFAULT_CLOCKS = [
    {"timezone": "Asia/Kolkata", "label": "India", "enabled": True},
    {"timezone": "America/New_York", "label": "New York", "enabled": True},
    {"timezone": "Europe/London", "label": "London", "enabled": True},
]


@router.get("/header-clocks")
async def get_header_clocks(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[dict]:
    return await get_setting_value(db, "header_clocks", DEFAULT_CLOCKS)
