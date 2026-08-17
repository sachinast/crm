from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.auth import router as auth_router
from app.api.v1.authorization import router as authorization_router
from app.api.v1.bookings import router as bookings_router
from app.api.v1.cancellations import router as cancellations_router
from app.api.v1.future_credits import router as future_credits_router
from app.api.v1.health import router as health_router
from app.api.v1.leads import router as leads_router
from app.api.v1.modifications import router as modifications_router
from app.api.v1.payments import router as payments_router
from app.api.v1.users import router as users_router
from app.api.v1.websocket import router as websocket_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="Travel CRM API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix=settings.api_v1_prefix)
app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(users_router, prefix=settings.api_v1_prefix)
app.include_router(leads_router, prefix=settings.api_v1_prefix)
app.include_router(bookings_router, prefix=settings.api_v1_prefix)
app.include_router(authorization_router, prefix=settings.api_v1_prefix)
app.include_router(payments_router, prefix=settings.api_v1_prefix)
app.include_router(modifications_router, prefix=settings.api_v1_prefix)
app.include_router(cancellations_router, prefix=settings.api_v1_prefix)
app.include_router(future_credits_router, prefix=settings.api_v1_prefix)
app.include_router(websocket_router, prefix="/ws")


@app.get("/")
async def root() -> dict:
    return {"service": "travel-crm-api", "docs": "/docs"}
