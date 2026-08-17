from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SystemSettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    registration_enabled: bool
    updated_at: datetime


class SystemSettingsUpdate(BaseModel):
    registration_enabled: bool
