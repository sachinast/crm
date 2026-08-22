"""Super Admin master data — dynamic dropdown options for booking fields.
Routes queries to dedicated `mst_*` tables when available and falls back to
`master_field_options`.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_ip_whitelisted, require_permission
from app.db.session import get_db
from app.models.master_options import MASTER_TABLES_MAP, MasterFieldOption
from app.models.user import User
from app.schemas.master_options import MasterOptionCreate, MasterOptionRead

router = APIRouter(tags=["master-options"])

MANAGE_PERMISSIONS = ("admin.manage_custom_fields",)

ADDON_KEYS = {"add_on_services", "hk_gk", "currency", "mco_charges", "insurance_coverage", "flight_ancillaries"}


@router.get("/master-options", response_model=list[MasterOptionRead])
async def list_master_options(
    field_key: str | None = None,
    option_type: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_ip_whitelisted),
) -> list[MasterOptionRead]:
    results: list[MasterOptionRead] = []

    # Fallback/standard to master_field_options
    stmt = select(MasterFieldOption).order_by(MasterFieldOption.display_order, MasterFieldOption.value)
    if field_key is not None:
        stmt = stmt.where(MasterFieldOption.field_key == field_key)
    if option_type is not None:
        stmt = stmt.where(MasterFieldOption.option_type == option_type)
    options = (await db.execute(stmt)).scalars().all()
    for o in options:
        results.append(
            MasterOptionRead(
                id=o.id,
                field_key=o.field_key,
                value=o.value,
                option_type=o.option_type,
                display_order=o.display_order,
                created_at=o.created_at,
            )
        )
    return results


@router.post("/admin/master-options", response_model=MasterOptionRead, status_code=status.HTTP_201_CREATED)
async def create_master_option(
    payload: MasterOptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(*MANAGE_PERMISSIONS)),
) -> MasterOptionRead:
    # Check duplicate in master_field_options
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
        option_type=payload.option_type,
        display_order=payload.display_order,
        created_by=current_user.id,
    )
    db.add(option)

    # If separate mst_* table exists, insert into it too
    if payload.field_key in MASTER_TABLES_MAP:
        model = MASTER_TABLES_MAP[payload.field_key]
        try:
            mst_item = model(
                id=option.id,
                value=payload.value,
                display_order=payload.display_order,
                created_by=current_user.id,
                modified_by=current_user.id,
            )
            db.add(mst_item)
        except Exception:
            pass

    await db.commit()
    await db.refresh(option)
    return MasterOptionRead(
        id=option.id,
        field_key=option.field_key,
        value=option.value,
        option_type=option.option_type,
        display_order=option.display_order,
    )


@router.delete("/admin/master-options/{option_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_master_option(
    option_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(*MANAGE_PERMISSIONS)),
) -> None:
    option = await db.get(MasterFieldOption, option_id)
    if option is not None:
        if option.field_key in MASTER_TABLES_MAP:
            model = MASTER_TABLES_MAP[option.field_key]
            mst_item = await db.get(model, option_id)
            if mst_item is not None:
                await db.delete(mst_item)
        await db.delete(option)
        await db.commit()
        return

    # Check if exists in any mst_* table
    for model in MASTER_TABLES_MAP.values():
        mst_item = await db.get(model, option_id)
        if mst_item is not None:
            await db.delete(mst_item)
            await db.commit()
            return

    raise HTTPException(status.HTTP_404_NOT_FOUND, "Master option not found")
