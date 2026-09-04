import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text

BOOKING_STATUS_OPTIONS = [
    "Tag to CR Booking",
    "Tag to Change",
    "Transferred to Billing",
]

CAR_PROVIDER_OPTIONS = [
    "Avis",
    "Budget",
    "Alamo",
    "Hertz",
    "Enterprise",
    "National",
    "Dollar",
    "Thrifty",
    "Sixt",
    "Europcar",
    "Payless",
    "Fox Rent A Car",
    "Ace Rent A Car",
]

async def update_masters():
    async with AsyncSessionLocal() as session:
        # 1. Update booking_status in master_field_options
        await session.execute(text("DELETE FROM master_field_options WHERE field_key = 'booking_status'"))
        for i, val in enumerate(BOOKING_STATUS_OPTIONS):
            await session.execute(
                text("INSERT INTO master_field_options (id, field_key, value, option_type, display_order) "
                     "VALUES (gen_random_uuid(), 'booking_status', :val, 'master', :order)"),
                {"val": val, "order": i}
            )

        # 2. Update mst_booking_status if table exists
        try:
            await session.execute(text("DELETE FROM mst_booking_status"))
            for i, val in enumerate(BOOKING_STATUS_OPTIONS):
                await session.execute(
                    text("INSERT INTO mst_booking_status (id, value, display_order, is_active) "
                         "VALUES (gen_random_uuid(), :val, :order, true)"),
                    {"val": val, "order": i}
                )
        except Exception as e:
            print("mst_booking_status update note:", e)

        # 3. Update car_provider in master_field_options
        await session.execute(text("DELETE FROM master_field_options WHERE field_key = 'car_provider'"))
        for i, val in enumerate(CAR_PROVIDER_OPTIONS):
            await session.execute(
                text("INSERT INTO master_field_options (id, field_key, value, option_type, display_order) "
                     "VALUES (gen_random_uuid(), 'car_provider', :val, 'master', :order)"),
                {"val": val, "order": i}
            )

        # 4. Update mst_car_provider if table exists
        try:
            await session.execute(text("DELETE FROM mst_car_provider"))
            for i, val in enumerate(CAR_PROVIDER_OPTIONS):
                await session.execute(
                    text("INSERT INTO mst_car_provider (id, value, display_order, is_active) "
                         "VALUES (gen_random_uuid(), :val, :order, true)"),
                    {"val": val, "order": i}
                )
        except Exception as e:
            print("mst_car_provider update note:", e)

        await session.commit()
        print("Master options updated successfully!")

if __name__ == "__main__":
    asyncio.run(update_masters())
