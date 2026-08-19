"""File Manager — migration 0013. Upload Image/PDF/PPT/Video/Audio; owners
see their own files, files.view_all (Super Admin by default) sees
everyone's; each file can generate one or more shareable, unauthenticated
links (GET /s/{token}) whose opens ("view") and downloads ("click") are
tracked per-link.
"""
import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import Response
from jose import JWTError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.security import decode_token
from app.db.session import get_db
from app.domain.file_kinds import FileValidationError, validate_upload
from app.domain.settings import get_setting_value
from app.models.files import FileShareEvent, FileShareLink, UploadedFile
from app.models.rbac import Role
from app.models.user import User
from app.schemas.files import FileRead, ShareLinkRead

router = APIRouter(tags=["files"])
settings = get_settings()
_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

VIEW_ALL_PERMISSIONS = ("files.view_all",)
DEFAULT_MAX_FILE_SIZE_MB = 50


def _to_read(f: UploadedFile, uploader_name: str | None = None) -> FileRead:
    return FileRead(
        id=f.id, uploaded_by=f.uploaded_by, uploader_name=uploader_name, file_name=f.file_name,
        content_type=f.content_type, kind=f.kind, size_bytes=f.size_bytes, created_at=f.created_at,
    )


async def _get_visible_file_or_404(db: AsyncSession, file_id: uuid.UUID, user: User) -> UploadedFile:
    f = await db.get(UploadedFile, file_id)
    if f is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    if f.uploaded_by != user.id and not user.role.has_permission(*VIEW_ALL_PERMISSIONS):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    return f


@router.post("/files", response_model=FileRead, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UploadedFile:
    data = await file.read()
    max_mb = await get_setting_value(db, "files.max_file_size_mb", DEFAULT_MAX_FILE_SIZE_MB)
    try:
        kind = validate_upload(
            file_name=file.filename or "upload",
            content_type=file.content_type or "application/octet-stream",
            data=data,
            max_size_bytes=int(max_mb) * 1024 * 1024,
        )
    except FileValidationError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))

    uploaded = UploadedFile(
        uploaded_by=current_user.id,
        file_name=file.filename or "upload",
        content_type=file.content_type or "application/octet-stream",
        kind=kind,
        size_bytes=len(data),
        data=data,
    )
    db.add(uploaded)
    await db.commit()
    await db.refresh(uploaded)
    return _to_read(uploaded, current_user.name)


@router.get("/files", response_model=list[FileRead])
async def list_files(
    all: bool = False,  # noqa: A002 — matches the query param name intentionally
    user_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[FileRead]:
    can_view_all = current_user.role.has_permission(*VIEW_ALL_PERMISSIONS)
    stmt = select(UploadedFile, User.name).join(User, User.id == UploadedFile.uploaded_by).order_by(UploadedFile.created_at.desc())
    if all and can_view_all:
        if user_id is not None:
            stmt = stmt.where(UploadedFile.uploaded_by == user_id)
    else:
        stmt = stmt.where(UploadedFile.uploaded_by == current_user.id)
    rows = (await db.execute(stmt)).all()
    return [_to_read(f, name) for f, name in rows]


@router.get("/files/{file_id}/download")
async def download_file(
    file_id: uuid.UUID,
    token: str | None = Query(None),
    auth_token: str | None = Depends(_oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Response:
    # Same bridge as messaging attachments (app/api/v1/messaging.py) — a
    # plain <a href> download link can't set an Authorization header.
    raw = auth_token or token
    if not raw:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = decode_token(raw)
        if payload.get("type") != "access":
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    current_user = (
        await db.execute(
            select(User).options(selectinload(User.role).selectinload(Role.permissions)).where(User.id == payload.get("sub"))
        )
    ).scalar_one_or_none()
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    f = await _get_visible_file_or_404(db, file_id, current_user)
    return Response(content=f.data, media_type=f.content_type, headers={"Content-Disposition": f'inline; filename="{f.file_name}"'})


@router.delete("/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    f = await _get_visible_file_or_404(db, file_id, current_user)
    await db.delete(f)
    await db.commit()


async def _link_stats(db: AsyncSession, link: FileShareLink) -> ShareLinkRead:
    views = await db.scalar(
        select(func.count()).select_from(FileShareEvent).where(FileShareEvent.share_link_id == link.id, FileShareEvent.event_type == "view")
    )
    clicks = await db.scalar(
        select(func.count()).select_from(FileShareEvent).where(FileShareEvent.share_link_id == link.id, FileShareEvent.event_type == "click")
    )
    return ShareLinkRead(id=link.id, file_id=link.file_id, token=link.token, is_active=link.is_active, created_at=link.created_at, view_count=views or 0, click_count=clicks or 0)


@router.post("/files/{file_id}/share", response_model=ShareLinkRead, status_code=status.HTTP_201_CREATED)
async def create_share_link(
    file_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ShareLinkRead:
    await _get_visible_file_or_404(db, file_id, current_user)
    link = FileShareLink(file_id=file_id, token=secrets.token_urlsafe(24), created_by=current_user.id)
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return await _link_stats(db, link)


@router.get("/files/{file_id}/shares", response_model=list[ShareLinkRead])
async def list_share_links(
    file_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ShareLinkRead]:
    await _get_visible_file_or_404(db, file_id, current_user)
    result = await db.execute(select(FileShareLink).where(FileShareLink.file_id == file_id).order_by(FileShareLink.created_at.desc()))
    return [await _link_stats(db, link) for link in result.scalars().all()]


@router.delete("/shares/{share_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_share_link(
    share_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    link = await db.get(FileShareLink, share_id)
    if link is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Share link not found")
    await _get_visible_file_or_404(db, link.file_id, current_user)  # ownership check
    link.is_active = False
    await db.commit()


# --- Public, unauthenticated share endpoints -------------------------------

public_router = APIRouter(prefix="/s", tags=["files-public"])


async def _get_active_link_or_404(db: AsyncSession, token: str) -> FileShareLink:
    link = await db.scalar(select(FileShareLink).where(FileShareLink.token == token, FileShareLink.is_active.is_(True)))
    if link is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This link is invalid or has been revoked")
    return link


def _client_ip(request: Request) -> str:
    return request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "0.0.0.0")


@public_router.get("/{token}", response_model=FileRead)
async def view_shared_file(token: str, request: Request, db: AsyncSession = Depends(get_db)) -> FileRead:
    link = await _get_active_link_or_404(db, token)
    db.add(FileShareEvent(share_link_id=link.id, event_type="view", ip_address=_client_ip(request), user_agent=request.headers.get("user-agent", "unknown")))
    await db.commit()
    f = await db.get(UploadedFile, link.file_id)
    if f is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    return _to_read(f)


@public_router.get("/{token}/download")
async def download_shared_file(token: str, request: Request, db: AsyncSession = Depends(get_db)) -> Response:
    link = await _get_active_link_or_404(db, token)
    db.add(FileShareEvent(share_link_id=link.id, event_type="click", ip_address=_client_ip(request), user_agent=request.headers.get("user-agent", "unknown")))
    await db.commit()
    f = await db.get(UploadedFile, link.file_id)
    if f is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    return Response(content=f.data, media_type=f.content_type, headers={"Content-Disposition": f'attachment; filename="{f.file_name}"'})
