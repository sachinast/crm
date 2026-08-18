"""Shared custom-field validator — one function, four callers (leads.py,
bookings.py's car/hotel/flight routes), instead of a hand-rolled check per
entity type. Validates submitted `custom_fields` values against this
entity's `custom_field_definitions` rows (app/models/custom_fields.py):
unknown keys rejected, required fields enforced, values loosely
type-checked against each definition's field_type.
"""
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.custom_fields import CustomFieldDefinition

ENTITY_TYPES = ("lead", "car_booking", "hotel_booking", "flight_booking")
FIELD_TYPES = ("text", "number", "date", "select", "checkbox")


def _validate_one(key: str, value: Any, definition: CustomFieldDefinition) -> None:
    if definition.field_type == "number" and (isinstance(value, bool) or not isinstance(value, (int, float))):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Custom field '{key}' must be a number")
    if definition.field_type == "checkbox" and not isinstance(value, bool):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Custom field '{key}' must be a boolean")
    if definition.field_type in ("text", "date") and not isinstance(value, str):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Custom field '{key}' must be a string")
    if definition.field_type == "select":
        options = definition.options or []
        if value not in options:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY, f"Custom field '{key}' must be one of {options}"
            )


async def validate_custom_fields(db: AsyncSession, entity_type: str, submitted: dict[str, Any]) -> dict[str, Any]:
    result = await db.execute(
        select(CustomFieldDefinition).where(CustomFieldDefinition.entity_type == entity_type)
    )
    definitions = {d.key: d for d in result.scalars().all()}

    unknown = set(submitted) - set(definitions)
    if unknown:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, f"Unknown custom field(s): {', '.join(sorted(unknown))}"
        )

    missing_required = [d.key for d in definitions.values() if d.is_required and d.key not in submitted]
    if missing_required:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Missing required custom field(s): {', '.join(sorted(missing_required))}",
        )

    for key, value in submitted.items():
        _validate_one(key, value, definitions[key])

    return submitted
