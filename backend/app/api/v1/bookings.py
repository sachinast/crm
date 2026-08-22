"""Car/Hotel/Flight booking-module endpoints — TECHNICAL_SPEC.md §5, §6, PRD §5.

The three modules are structurally identical (create/get/update against a
lead_id-keyed 1:1 table, gated on the lead's service_type matching), so the
actual route handlers are generated once by _register_booking_routes rather
than copy-pasted three times.
"""
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_visible_lead_or_404, require_ip_whitelisted, require_permission
from app.db.session import get_db
from app.domain.custom_fields import validate_custom_fields
from app.models.booking import CarBooking, FlightBooking, HotelBooking
from app.models.enums import ServiceType
from app.models.lead import Lead
from app.models.user import User
from app.schemas.booking import (
    CarBookingCreate,
    CarBookingRead,
    CarBookingUpdate,
    FlightBookingCreate,
    FlightBookingRead,
    FlightBookingUpdate,
    HotelBookingCreate,
    HotelBookingRead,
    HotelBookingUpdate,
)

router = APIRouter(prefix="/leads/{lead_id}", tags=["bookings"])

# Same actors as lead intake (app/api/v1/leads.py) — a booking is filled in as
# part of the same PRD §4.1 flow the agent (or admin/super_admin on their
# behalf) is already driving.
INTAKE_PERMISSIONS = ("leads.create",)


async def _get_booking_or_404(db: AsyncSession, model: type, lead_id: uuid.UUID) -> Any:
    result = await db.execute(select(model).where(model.lead_id == lead_id))
    booking = result.scalar_one_or_none()
    if booking is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found for this lead")
    return booking


def _ensure_service_type(lead: Lead, expected: ServiceType, path: str) -> None:
    if lead.service_type != expected:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Lead's service type is {lead.service_type.value if lead.service_type else 'unset'}, "
            f"not '{expected.value}' — PATCH /leads/{{id}}/service-type first",
        )


from app.domain.process_log import log_process_event


def _register_booking_routes(
    *,
    path: str,
    model: type,
    service_type: ServiceType,
    entity_type: str,
    create_schema: type[BaseModel],
    update_schema: type[BaseModel],
    read_schema: type[BaseModel],
) -> None:
    async def create(
        lead_id: uuid.UUID,
        payload: create_schema,  # type: ignore[valid-type]
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(require_permission(*INTAKE_PERMISSIONS)),
    ) -> Any:
        lead = await get_visible_lead_or_404(db, current_user, lead_id)
        _ensure_service_type(lead, service_type, path)

        existing = await db.execute(select(model).where(model.lead_id == lead_id))
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(
                status.HTTP_409_CONFLICT, f"A {path.replace('-', ' ')} already exists for this lead — use PATCH"
            )

        data = payload.model_dump()
        data["custom_fields"] = await validate_custom_fields(db, entity_type, data["custom_fields"])
        data["created_by"] = current_user.id
        data["modified_by"] = current_user.id
        booking = model(lead_id=lead_id, **data)
        db.add(booking)
        log_process_event(
            db,
            lead_id=lead_id,
            actor_id=current_user.id,
            action="booking_created",
            field_changed="booking",
            new_value=service_type.value,
        )
        await db.commit()
        await db.refresh(booking)
        return booking

    async def get(
        lead_id: uuid.UUID,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(require_ip_whitelisted),
    ) -> Any:
        await get_visible_lead_or_404(db, current_user, lead_id)
        return await _get_booking_or_404(db, model, lead_id)

    async def update(
        lead_id: uuid.UUID,
        payload: update_schema,  # type: ignore[valid-type]
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(require_permission(*INTAKE_PERMISSIONS)),
    ) -> Any:
        await get_visible_lead_or_404(db, current_user, lead_id)
        booking = await _get_booking_or_404(db, model, lead_id)
        updates = payload.model_dump(exclude_unset=True)
        if "custom_fields" in updates and updates["custom_fields"] is not None:
            updates["custom_fields"] = await validate_custom_fields(db, entity_type, updates["custom_fields"])
        updates["modified_by"] = current_user.id
        for field, value in updates.items():
            setattr(booking, field, value)
        log_process_event(
            db,
            lead_id=lead_id,
            actor_id=current_user.id,
            action="booking_updated",
            field_changed="booking",
            new_value=",".join(updates.keys()),
        )
        await db.commit()
        await db.refresh(booking)
        return booking

    router.add_api_route(
        f"/{path}", create, methods=["POST"], response_model=read_schema,
        status_code=status.HTTP_201_CREATED, name=f"create_{path.replace('-', '_')}",
    )
    router.add_api_route(
        f"/{path}", get, methods=["GET"], response_model=read_schema, name=f"get_{path.replace('-', '_')}"
    )
    router.add_api_route(
        f"/{path}", update, methods=["PATCH"], response_model=read_schema, name=f"update_{path.replace('-', '_')}"
    )


_register_booking_routes(
    path="car-booking",
    model=CarBooking,
    service_type=ServiceType.car,
    entity_type="car_booking",
    create_schema=CarBookingCreate,
    update_schema=CarBookingUpdate,
    read_schema=CarBookingRead,
)
_register_booking_routes(
    path="hotel-booking",
    model=HotelBooking,
    service_type=ServiceType.hotel,
    entity_type="hotel_booking",
    create_schema=HotelBookingCreate,
    update_schema=HotelBookingUpdate,
    read_schema=HotelBookingRead,
)
_register_booking_routes(
    path="flight-booking",
    model=FlightBooking,
    service_type=ServiceType.flight,
    entity_type="flight_booking",
    create_schema=FlightBookingCreate,
    update_schema=FlightBookingUpdate,
    read_schema=FlightBookingRead,
)
