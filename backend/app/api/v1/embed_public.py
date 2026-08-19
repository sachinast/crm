"""Public, unauthenticated endpoints for embeddable booking widgets
(migration 0014) — reached from arbitrary third-party landing pages, not
this app's own frontend. CORS for this router is handled by
app.main.EmbedCorsMiddleware (Access-Control-Allow-Origin: *, unlike every
other endpoint in this API), not the global CORSMiddleware.

GET /embed/widget.js serves the actual injected form (app/static/embed-widget.js).
POST /embed/{key}/submit is what that form's fetch() posts to.
"""
from pathlib import Path

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.domain.duplicate_check import find_duplicate_candidates
from app.domain.process_log import log_process_event
from app.models.embed_widget import EmbedWidget
from app.models.enums import ServiceType
from app.models.lead import Lead
from app.schemas.embed_submit import EmbedSubmitRequest

router = APIRouter(prefix="/embed", tags=["embed"])

_WIDGET_JS_PATH = Path(__file__).resolve().parent.parent.parent / "static" / "embed-widget.js"


def _client_ip(request: Request) -> str | None:
    # Same precedence as messaging's/files' download-link IP capture and
    # every reverse-proxied deployment (Railway/Vercel sit in front of this
    # API) — X-Forwarded-For's first hop is the actual visitor.
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.get("/widget.js")
async def widget_script() -> PlainTextResponse:
    js = _WIDGET_JS_PATH.read_text()
    return PlainTextResponse(
        content=js,
        media_type="application/javascript; charset=utf-8",
        headers={"Cache-Control": "public, max-age=300"},
    )


@router.get("/{key}/preview")
async def widget_preview(key: str, request: Request) -> HTMLResponse:
    """A bare page embedding the widget with its own snippet, exactly as a
    real landing page would — lets an admin see the widget before pasting it
    anywhere (linked from the "Preview" button on Admin → Integrations)."""
    api_base = str(request.base_url).rstrip("/") + "/api/v1"
    html = (
        "<!doctype html><html><head><meta charset=\"utf-8\">"
        "<title>Widget preview</title>"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
        "<style>body{background:#eef2f6;margin:0;padding:40px 16px;font-family:-apple-system,sans-serif;}"
        "p.hint{max-width:900px;margin:0 auto 16px;color:#5b6b7f;font-size:13px;text-align:center;}</style>"
        "</head><body>"
        "<p class=\"hint\">This is a live preview — exactly what visitors see on a page carrying this one script tag.</p>"
        f'<script src="{api_base}/embed/widget.js" data-key="{key}" async></script>'
        "</body></html>"
    )
    return HTMLResponse(content=html)


@router.post("/{key}/submit", status_code=201)
async def submit_embed_lead(
    key: str,
    payload: EmbedSubmitRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    widget = await db.scalar(
        select(EmbedWidget).where(EmbedWidget.widget_key == key, EmbedWidget.is_active.is_(True))
    )
    if widget is None:
        # Deliberately generic + always 404, not "invalid key" vs "inactive
        # key" — no reason to help a scanner distinguish the two from the
        # public internet.
        return JSONResponse({"detail": "This form is no longer accepting submissions."}, status_code=404)

    lead = Lead(
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        service_type=ServiceType(payload.service_type),
        agent_id=widget.assigned_agent_id,
        source=f"Website Widget: {widget.name}",
        embed_widget_id=widget.id,
        landing_page_url=payload.landing_page_url,
        visitor_public_ip=_client_ip(request),
        visitor_local_ip=payload.visitor_local_ip,
        embed_submission=payload.details,
    )
    db.add(lead)
    await db.flush()

    candidates = await find_duplicate_candidates(
        db, name=lead.name, phone=lead.phone, email=lead.email, exclude_lead_id=lead.id
    )
    if candidates:
        lead.is_duplicate = True
        lead.duplicate_of_id = candidates[0].id

    log_process_event(
        db,
        lead_id=lead.id,
        actor_id=widget.assigned_agent_id,
        action="embed_widget_capture",
        new_value={
            "widget": widget.name,
            "service_type": payload.service_type,
            "landing_page_url": payload.landing_page_url,
        },
    )

    widget.submission_count += 1
    await db.commit()

    return {"success": True}
