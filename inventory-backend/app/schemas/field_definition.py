import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

from app.models.field_definition import FieldType


class FieldDefinitionCreate(BaseModel):
    field_key: str
    field_label: str
    field_type: FieldType = FieldType.text
    section: Optional[str] = None
    options: Optional[str] = None  # comma-separated values, for "select" type
    is_autofill: bool = False      # pre-fill this field when Subject ID matches a known subject


class FieldDefinitionUpdate(BaseModel):
    is_autofill: Optional[bool] = None


class FieldDefinitionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    site_id: Optional[uuid.UUID] = None
    field_key: str
    field_label: str
    field_type: FieldType
    section: Optional[str] = None
    options: Optional[str] = None
    is_autofill: bool
    created_at: datetime

class SearchFieldSuggestion(BaseModel):
    key: str
    label: str
    type: str