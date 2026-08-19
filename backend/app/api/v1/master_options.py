"""Super Admin master data — dynamic dropdown options for booking fields
(migration 0012): Booking Platform (shared), Airline/Cabin Class (flight),
Hotel Name/Room Type (hotel), Car Provider/Vehicle Type/Transmission (car).
GET is open to any authenticated user (forms need it to render); write is
gated on admin.manage_custom_fields — same "admin defines form structure"
permission the custom-fields feature already uses.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_ip_whitelisted, require_permission
from app.db.session import get_db
from app.models.master_options import MasterFieldOption
from app.models.user import User
from app.schemas.master_options import MasterOptionCreate, MasterOptionRead

router = APIRouter(tags=["master-options"])

MANAGE_PERMISSIONS = ("admin.manage_custom_fields",)


@router.get("/master-options", response_model=list[MasterOptionRead])
async def list_master_options(
    field_key: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_ip_whitelisted),
) -> list[MasterFieldOption]:
    stmt = select(MasterFieldOption).order_by(MasterFieldOption.display_order, MasterFieldOption.value)
    if field_key is not None:
        stmt = stmt.where(MasterFieldOption.field_key == field_key)
    return list((await db.execute(stmt)).scalars().all())


@router.post("/admin/master-options", response_model=MasterOptionRead, status_code=status.HTTP_201_CREATED)
async def create_master_option(
    payload: MasterOptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(*MANAGE_PERMISSIONS)),
) -> MasterFieldOption:
    existing = await db.scalar(
        select(MasterFieldOption).where(
            MasterFieldOption.field_key == payload.field_key, MasterFieldOption.value == payload.value
        )
    )
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "This value already exists for this field")

    option = MasterFieldOption(
        field_key=payload.field_key,
        value=payload.value,
        display_order=payload.display_order,
        created_by=current_user.id,
    )
    db.add(option)
    await db.commit()
    await db.refresh(option)
    return option


@router.delete("/admin/master-options/{option_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_master_option(
    option_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(*MANAGE_PERMISSIONS)),
) -> None:
    option = await db.get(MasterFieldOption, option_id)
    if option is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Master option not found")
    await db.delete(option)
    await db.commit()
