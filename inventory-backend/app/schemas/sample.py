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


# --- Bulk import (Excel) -----------------------------------------------
#
# Two-step flow: POST an .xlsx to /bulk-import/preview, which parses and
# validates it but writes nothing -- the frontend shows the result as a
# review table. The user then POSTs the (possibly user-edited) rows to
# /bulk-import/commit, which is the only step that actually creates
# samples. Row/sheet numbers round-trip through both calls so the frontend
# can keep matching rows back to their place in the original file.


class BulkImportRow(BaseModel):
    """One row from the uploaded sheet, after mapping its columns to
    known fields and validating it. `errors` is empty for a row that's
    ready to import as-is."""
    row_number: int
    sheet: str
    subject_code: Optional[str] = None
    sample_code: Optional[str] = None
    sample_type: Optional[str] = None
    collection_date: Optional[date] = None
    data: dict[str, Any] = Field(default_factory=dict)
    errors: list[str] = Field(default_factory=list)


class BulkImportPreviewResponse(BaseModel):
    rows: list[BulkImportRow]
    unmapped_columns: list[str]  # header text with no matching field -- that column's data was ignored
    valid_count: int
    error_count: int


class BulkImportRowInput(BaseModel):
    """What /bulk-import/commit expects per row -- the same shape a
    preview row returns, minus `errors` (the frontend only sends rows it
    considers ready) and with the required fields no longer optional."""
    row_number: int
    sheet: str
    subject_code: str
    sample_code: str
    sample_type: str
    collection_date: Optional[date] = None
    data: dict[str, Any] = Field(default_factory=dict)


class BulkImportCommitRequest(BaseModel):
    rows: list[BulkImportRowInput]


class BulkImportRowResult(BaseModel):
    row_number: int
    sheet: str
    sample_code: str
    status: str  # "created" | "failed"
    error: Optional[str] = None


class BulkImportCommitResponse(BaseModel):
    created: int
    failed: int
    results: list[BulkImportRowResult]