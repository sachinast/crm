"""Custom form fields — Master Admin feature (migration 0010). An admin
defines extra fields on Leads/Car/Hotel/Flight bookings at runtime here;
app/domain/custom_fields.py's shared validator is what leads.py/bookings.py
run submitted values through on create/update.

GET /custom-fields is deliberately open to any authenticated user (not
admin-gated) — the intake/booking forms need it to render the fields at all,
same posture as GET /admin/roles being readable by plain admins for the
user-creation dropdown.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_ip_whitelisted, require_permission
from app.db.session import get_db
from app.domain.activity_log import log_activity
from app.models.custom_fields import CustomFieldDefinition
from app.models.user import User
from app.schemas.custom_fields import CustomFieldDefinitionCreate, CustomFieldDefinitionRead, CustomFieldDefinitionUpdate

router = APIRouter(tags=["custom-fields"])

MANAGE_PERMISSIONS = ("admin.manage_custom_fields",)


async def _get_definition_or_404(db: AsyncSession, definition_id: uuid.UUID) -> CustomFieldDefinition:
    definition = await db.get(CustomFieldDefinition, definition_id)
    if definition is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Custom field definition not found")
    return definition


@router.get("/custom-fields", response_model=list[CustomFieldDefinitionRead])
async def list_custom_fields(
    entity_type: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_ip_whitelisted),
) -> list[CustomFieldDefinition]:
    stmt = select(CustomFieldDefinition).order_by(CustomFieldDefinition.display_order, CustomFieldDefinition.key)
    if entity_type is not None:
        stmt = stmt.where(CustomFieldDefinition.entity_type == entity_type)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("/admin/custom-fields", response_model=CustomFieldDefinitionRead, status_code=status.HTTP_201_CREATED)
async def create_custom_field(
    payload: CustomFieldDefinitionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(*MANAGE_PERMISSIONS)),
) -> CustomFieldDefinition:
    existing = await db.scalar(
        select(CustomFieldDefinition).where(
            CustomFieldDefinition.entity_type == payload.entity_type, CustomFieldDefinition.key == payload.key
        )
    )
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "A custom field with this key already exists for this entity type")
    if payload.field_type == "select" and not payload.options:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "select fields need at least one option")

    definition = CustomFieldDefinition(
        entity_type=payload.entity_type,
        key=payload.key,
        label=payload.label,
        field_type=payload.field_type,
        options=payload.options,
        is_required=payload.is_required,
        display_order=payload.display_order,
        created_by=current_user.id,
    )
    db.add(definition)
    await db.flush()
    log_activity(
        db,
        actor_id=current_user.id,
        action="custom_field_created",
        category="admin",
        target_type="custom_field_definition",
        target_id=definition.id,
        metadata={"entity_type": definition.entity_type, "key": definition.key},
    )
    await db.commit()
    await db.refresh(definition)
    return definition


@router.patch("/admin/custom-fields/{definition_id}", response_model=CustomFieldDefinitionRead)
async def update_custom_field(
    definition_id: uuid.UUID,
    payload: CustomFieldDefinitionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(*MANAGE_PERMISSIONS)),
) -> CustomFieldDefinition:
    definition = await _get_definition_or_404(db, definition_id)
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(definition, field, value)
    log_activity(
        db,
        actor_id=current_user.id,
        action="custom_field_changed",
        category="admin",
        target_type="custom_field_definition",
        target_id=definition.id,
        metadata={"entity_type": definition.entity_type, "key": definition.key},
    )
    await db.commit()
    await db.refresh(definition)
    return definition


@router.delete("/admin/custom-fields/{definition_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_custom_field(
    definition_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(*MANAGE_PERMISSIONS)),
) -> None:
    definition = await _get_definition_or_404(db, definition_id)
    log_activity(
        db,
        actor_id=current_user.id,
        action="custom_field_deleted",
        category="admin",
        target_type="custom_field_definition",
        target_id=definition.id,
        metadata={"entity_type": definition.entity_type, "key": definition.key},
    )
    await db.delete(definition)
    await db.commit()
