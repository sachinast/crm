import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PermissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    description: str
    category: str


class RoleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    permission_codes: list[str] = []


class RolePermissionsUpdate(BaseModel):
    permission_codes: list[str]


class RoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    is_system_role: bool
    created_at: datetime
    permissions: list[PermissionRead]
