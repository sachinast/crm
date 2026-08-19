from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.api.v1.admin_activity import router as admin_activity_router
from app.api.v1.admin_roles import router as admin_roles_router
from app.api.v1.admin_settings import router as admin_settings_router
from app.api.v1.admin_status_permissions import router as admin_status_permissions_router
from app.api.v1.attendance import router as attendance_router
from app.api.v1.audit import router as audit_router
from app.api.v1.auth import router as auth_router
from app.api.v1.authorization import router as authorization_router
from app.api.v1.bookings import router as bookings_router
from app.api.v1.cancellations import router as cancellations_router
from app.api.v1.custom_fields import router as custom_fields_router
from app.api.v1.embed_public import router as embed_public_router
from app.api.v1.embed_widgets import router as embed_widgets_router
from app.api.v1.files import public_router as files_public_router, router as files_router
from app.api.v1.header_clocks import router as header_clocks_router
from app.api.v1.master_options import router as master_options_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.future_credits import router as future_credits_router
from app.api.v1.health import router as health_router
from app.api.v1.integrations import capture_router, keys_router as integration_keys_router
from app.api.v1.leads import router as leads_router
from app.api.v1.messaging import router as messaging_router
from app.api.v1.modifications import router as modifications_router
from app.api.v1.notes import router as notes_router
from app.api.v1.payments import router as payments_router
from app.api.v1.users import router as users_router
from app.api.v1.websocket import router as websocket_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="CRM PRO API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_EMBED_PATH_PREFIX = f"{settings.api_v1_prefix}/embed/"


class EmbedCorsMiddleware(BaseHTTPMiddleware):
    """The embed widget (app/api/v1/embed_public.py) is fetch()-ed from
    arbitrary third-party landing pages, not this app's own frontend — it
    needs Access-Control-Allow-Origin: * regardless of CORS_ORIGINS, unlike
    every other endpoint in this API. Added after the main CORSMiddleware so
    it wraps outermost and handles this path's preflight itself, before the
    main middleware (which only knows about CORS_ORIGINS) ever sees it.
    Every other path passes straight through, untouched."""

    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith(_EMBED_PATH_PREFIX):
            return await call_next(request)
        if request.method == "OPTIONS":
            return Response(
                status_code=204,
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            )
        response = await call_next(request)
        response.headers["Access-Control-Allow-Origin"] = "*"
        return response


app.add_middleware(EmbedCorsMiddleware)

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
app.include_router(audit_router, prefix=settings.api_v1_prefix)
app.include_router(integration_keys_router, prefix=settings.api_v1_prefix)
app.include_router(capture_router, prefix=settings.api_v1_prefix)
app.include_router(dashboard_router, prefix=settings.api_v1_prefix)
app.include_router(messaging_router, prefix=settings.api_v1_prefix)
app.include_router(admin_roles_router, prefix=settings.api_v1_prefix)
app.include_router(admin_status_permissions_router, prefix=settings.api_v1_prefix)
app.include_router(admin_activity_router, prefix=settings.api_v1_prefix)
app.include_router(admin_settings_router, prefix=settings.api_v1_prefix)
app.include_router(custom_fields_router, prefix=settings.api_v1_prefix)
app.include_router(master_options_router, prefix=settings.api_v1_prefix)
app.include_router(attendance_router, prefix=settings.api_v1_prefix)
app.include_router(files_router, prefix=settings.api_v1_prefix)
app.include_router(files_public_router, prefix=settings.api_v1_prefix)
app.include_router(notes_router, prefix=settings.api_v1_prefix)
app.include_router(header_clocks_router, prefix=settings.api_v1_prefix)
app.include_router(embed_widgets_router, prefix=settings.api_v1_prefix)
app.include_router(embed_public_router, prefix=settings.api_v1_prefix)
app.include_router(websocket_router, prefix="/ws")


@app.get("/")
async def root() -> dict:
    return {"service": "travel-crm-api", "docs": "/docs"}
