"""Master Admin — Settings. Generic key-value config store (migration 0009,
app/models/settings.py) replacing the old single-boolean system_settings
table: an admin can add, edit, or remove arbitrary typed config values here
at runtime, no deploy — not just the handful of built-in keys this ships
with (registration_enabled, messaging.max_file_size_mb,
messaging.quick_replies — see app/domain/settings.py for how those are read
back by the code that uses them, with a fallback default if a key's been
deleted).

Same read/write permission split as the old system-settings endpoints:
admin.view_settings to read, admin.manage_settings to write.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_permission
from app.db.session import get_db
from app.domain.activity_log import log_activity
from app.models.settings import AppSetting
from app.models.user import User
from app.schemas.settings import AppSettingCreate, AppSettingRead, AppSettingUpdate, validate_value_matches_type

router = APIRouter(prefix="/admin", tags=["admin-settings"])

READ_PERMISSIONS = ("admin.view_settings",)
MANAGE_PERMISSIONS = ("admin.manage_settings",)


async def _get_setting_or_404(db: AsyncSession, key: str) -> AppSetting:
    setting = await db.get(AppSetting, key)
    if setting is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Setting not found")
    return setting


def _validate(value: object, value_type: str) -> None:
    try:
        validate_value_matches_type(value, value_type)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))


@router.get("/settings", response_model=list[AppSettingRead])
async def list_settings(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(*READ_PERMISSIONS)),
) -> list[AppSetting]:
    result = await db.execute(select(AppSetting).order_by(AppSetting.category, AppSetting.key))
    return list(result.scalars().all())


@router.post("/settings", response_model=AppSettingRead, status_code=status.HTTP_201_CREATED)
async def create_setting(
    payload: AppSettingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(*MANAGE_PERMISSIONS)),
) -> AppSetting:
    existing = await db.get(AppSetting, payload.key)
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "A setting with this key already exists")
    _validate(payload.value, payload.value_type)

    setting = AppSetting(
        key=payload.key,
        value=payload.value,
        value_type=payload.value_type,
        category=payload.category,
        label=payload.label,
        description=payload.description,
        updated_by=current_user.id,
    )
    db.add(setting)
    log_activity(
        db,
        actor_id=current_user.id,
        action="setting_created",
        category="admin",
        target_type="app_setting",
        metadata={"key": setting.key, "value_type": setting.value_type},
    )
    await db.commit()
    return setting


@router.patch("/settings/{key}", response_model=AppSettingRead)
async def update_setting(
    key: str,
    payload: AppSettingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(*MANAGE_PERMISSIONS)),
) -> AppSetting:
    setting = await _get_setting_or_404(db, key)
    _validate(payload.value, setting.value_type)

    setting.value = payload.value
    if payload.label is not None:
        setting.label = payload.label
    if payload.description is not None:
        setting.description = payload.description
    if payload.category is not None:
        setting.category = payload.category
    setting.updated_by = current_user.id
    log_activity(
        db,
        actor_id=current_user.id,
        action="setting_changed",
        category="admin",
        target_type="app_setting",
        metadata={"key": setting.key},
    )
    await db.commit()
    await db.refresh(setting)
    return setting


@router.delete("/settings/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_setting(
    key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(*MANAGE_PERMISSIONS)),
) -> None:
    setting = await _get_setting_or_404(db, key)
    log_activity(
        db,
        actor_id=current_user.id,
        action="setting_deleted",
        category="admin",
        target_type="app_setting",
        metadata={"key": setting.key},
    )
    await db.delete(setting)
    await db.commit()
