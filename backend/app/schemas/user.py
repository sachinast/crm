import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8)
    role_name: str
    ip_whitelist_enabled: bool = False


class UserUpdate(BaseModel):
    name: str | None = None
    role_name: str | None = None
    is_active: bool | None = None
    ip_whitelist_enabled: bool | None = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: EmailStr
    role: str
    ip_whitelist_enabled: bool
    is_active: bool
    created_at: datetime

    @field_validator("role", mode="before")
    @classmethod
    def _role_name(cls, v: object) -> object:
        # `role` comes off the ORM User.role relationship (a Role object) —
        # this app-facing schema only ever needs the name. Falls through
        # unchanged for plain-string input (e.g. constructed directly in tests).
        return v.name if hasattr(v, "name") else v


class MeRead(UserRead):
    """GET /users/me only — everything UserRead has, plus the caller's own
    flattened permission codes, so the frontend can gate UI without
    hardcoding role names (see lib/permissions.ts)."""

    permissions: list[str]


class WhitelistedIPCreate(BaseModel):
    ip_address: str
    label: str | None = None


class WhitelistedIPRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ip_address: str
    label: str | None
    created_at: datetime
