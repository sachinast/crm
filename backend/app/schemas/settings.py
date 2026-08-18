from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

VALUE_TYPES = ("string", "number", "boolean", "json")
ValueType = Literal["string", "number", "boolean", "json"]


def validate_value_matches_type(value: Any, value_type: str) -> None:
    """Loose type check, not a schema validator — `json` deliberately accepts
    anything (that's the escape hatch for arbitrary admin-added config)."""
    if value_type == "string" and not isinstance(value, str):
        raise ValueError("value must be a string for value_type 'string'")
    if value_type == "number" and (isinstance(value, bool) or not isinstance(value, (int, float))):
        raise ValueError("value must be a number for value_type 'number'")
    if value_type == "boolean" and not isinstance(value, bool):
        raise ValueError("value must be a boolean for value_type 'boolean'")


class AppSettingRead(BaseModel):
    key: str
    value: Any
    value_type: str
    category: str
    label: str
    description: str | None
    updated_at: datetime


class AppSettingCreate(BaseModel):
    key: str = Field(min_length=1)
    value: Any
    value_type: ValueType
    category: str = Field(min_length=1)
    label: str = Field(min_length=1)
    description: str | None = None


class AppSettingUpdate(BaseModel):
    value: Any
    label: str | None = None
    description: str | None = None
    category: str | None = None
