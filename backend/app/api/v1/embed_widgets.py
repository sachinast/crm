"""Admin CRUD for embeddable booking widgets — the copy-paste <script>
snippet that puts a MakeMyTrip-styled lead capture form on any external
landing page. Same integrations.manage permission as the Zapier/Make API
keys (app/api/v1/integrations.py) — this is the same "external lead
capture" surface, just a different transport (an embedded form instead of
a webhook). The actual public submission endpoint is app/api/v1/embed_public.py.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_permission
from app.db.session import get_db
from app.domain.embed_widgets import generate_widget_key
from app.models.embed_widget import EmbedWidget
from app.models.user import User
from app.schemas.embed_widget import EmbedWidgetCreate, EmbedWidgetRead, EmbedWidgetUpdate

router = APIRouter(prefix="/admin/embed-widgets", tags=["embed-widgets"])

MANAGE_WIDGETS_PERMISSIONS = ("integrations.manage",)


@router.post("", response_model=EmbedWidgetRead, status_code=status.HTTP_201_CREATED)
async def create_embed_widget(
    payload: EmbedWidgetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(*MANAGE_WIDGETS_PERMISSIONS)),
) -> EmbedWidget:
    assigned_agent = await db.get(User, payload.assigned_agent_id)
    if assigned_agent is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "assigned_agent_id does not match an existing user")

    widget = EmbedWidget(
        name=payload.name,
        widget_key=generate_widget_key(),
        assigned_agent_id=payload.assigned_agent_id,
        created_by=current_user.id,
    )
    db.add(widget)
    await db.commit()
    await db.refresh(widget)
    return widget


@router.get("", response_model=list[EmbedWidgetRead])
async def list_embed_widgets(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(*MANAGE_WIDGETS_PERMISSIONS)),
) -> list[EmbedWidget]:
    result = await db.execute(select(EmbedWidget).order_by(EmbedWidget.created_at.desc()))
    return list(result.scalars().all())


@router.patch("/{widget_id}", response_model=EmbedWidgetRead)
async def update_embed_widget(
    widget_id: uuid.UUID,
    payload: EmbedWidgetUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(*MANAGE_WIDGETS_PERMISSIONS)),
) -> EmbedWidget:
    """Deactivate/reactivate only — same "never hard-delete a credential,
    just cut it off" convention as ApiKey (app/api/v1/integrations.py)."""
    widget = await db.get(EmbedWidget, widget_id)
    if widget is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Widget not found")
    widget.is_active = payload.is_active
    await db.commit()
    await db.refresh(widget)
    return widget
