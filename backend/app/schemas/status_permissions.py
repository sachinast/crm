import uuid

from pydantic import BaseModel

from app.models.enums import BookingStatus


class StatusPermissionRead(BaseModel):
    status: BookingStatus
    label: str
    set_by: list[uuid.UUID]
    notifies: list[uuid.UUID]
    relevant: list[uuid.UUID]


class StatusPermissionUpdate(BaseModel):
    """Full replace per kind, same "send the complete desired set" shape as
    RolePermissionsUpdate — the admin UI's matrix sends every checked role_id
    for this status each time, not a diff."""

    set_by: list[uuid.UUID] = []
    notifies: list[uuid.UUID] = []
    relevant: list[uuid.UUID] = []
