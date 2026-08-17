"""Fetch whichever booking module (car/hotel/flight) belongs to a lead, keyed
off its service_type. Shared by the authorization summary (customer needs to
see what they're authorizing) and payments (Billing needs the payment
breakdown to know what's actually being charged) — both read the same 1:1
booking row, just for different purposes.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import CarBooking, FlightBooking, HotelBooking
from app.models.enums import ServiceType
from app.models.lead import Lead

_MODEL_BY_SERVICE_TYPE = {
    ServiceType.car: CarBooking,
    ServiceType.hotel: HotelBooking,
    ServiceType.flight: FlightBooking,
}


async def get_booking_for_lead(db: AsyncSession, lead: Lead):
    """Returns the CarBooking/HotelBooking/FlightBooking row for this lead, or
    None if the lead has no service_type yet or no booking has been created."""
    if lead.service_type is None:
        return None
    model = _MODEL_BY_SERVICE_TYPE[lead.service_type]
    result = await db.execute(select(model).where(model.lead_id == lead.id))
    return result.scalar_one_or_none()
