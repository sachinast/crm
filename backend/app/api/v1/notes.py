"""Notes — private per-user scratchpad (migration 0013). No sharing, no
admin oversight; every endpoint is scoped to the caller's own rows, 404 (not
403) for anything that isn't theirs, same "don't leak existence" posture as
leads.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.notes import Note
from app.models.user import User
from app.schemas.notes import NoteCreate, NoteRead, NoteUpdate

router = APIRouter(prefix="/notes", tags=["notes"])


async def _get_own_note_or_404(db: AsyncSession, note_id: uuid.UUID, user_id: uuid.UUID) -> Note:
    note = await db.get(Note, note_id)
    if note is None or note.user_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Note not found")
    return note


@router.get("", response_model=list[NoteRead])
async def list_notes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Note]:
    result = await db.execute(
        select(Note).where(Note.user_id == current_user.id).order_by(Note.updated_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
async def create_note(
    payload: NoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Note:
    note = Note(user_id=current_user.id, title=payload.title, body=payload.body)
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


@router.patch("/{note_id}", response_model=NoteRead)
async def update_note(
    note_id: uuid.UUID,
    payload: NoteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Note:
    note = await _get_own_note_or_404(db, note_id, current_user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(note, field, value)
    await db.commit()
    await db.refresh(note)
    return note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    note = await _get_own_note_or_404(db, note_id, current_user.id)
    await db.delete(note)
    await db.commit()
