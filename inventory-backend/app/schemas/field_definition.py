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


class FieldDefinitionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    site_id: Optional[uuid.UUID] = None
    field_key: str
    field_label: str
    field_type: FieldType
    section: Optional[str] = None
    options: Optional[str] = None
    created_at: datetime
