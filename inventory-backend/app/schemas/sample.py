import uuid
from datetime import date, datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict, Field


class SampleCreate(BaseModel):
    subject_code: str
    sample_code: str
    sample_type: str
    collection_date: Optional[date] = None
    data: dict[str, Any] = Field(default_factory=dict)  # all other fields, incl. new dynamic ones


class SampleUpdate(BaseModel):
    subject_code: Optional[str] = None
    sample_code: Optional[str] = None
    sample_type: Optional[str] = None
    collection_date: Optional[date] = None
    data: Optional[dict[str, Any]] = None  # merged into existing data, not replaced


class SampleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    site_id: uuid.UUID
    subject_code: Optional[str] = None
    sample_code: str
    sample_type: str
    collection_date: Optional[date] = None
    data: dict[str, Any]
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime


class SamplePage(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[SampleOut]


class BulkDeleteRequest(BaseModel):
    ids: list[uuid.UUID]


class BulkDeleteResponse(BaseModel):
    deleted: int
    requested: int