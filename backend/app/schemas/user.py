import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import UserRole


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8)
    role: UserRole
    ip_whitelist_enabled: bool = False


class UserUpdate(BaseModel):
    name: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    ip_whitelist_enabled: bool | None = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: EmailStr
    role: UserRole
    ip_whitelist_enabled: bool
    is_active: bool
    created_at: datetime


class WhitelistedIPCreate(BaseModel):
    ip_address: str
    label: str | None = None


class WhitelistedIPRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ip_address: str
    label: str | None
    created_at: datetime
