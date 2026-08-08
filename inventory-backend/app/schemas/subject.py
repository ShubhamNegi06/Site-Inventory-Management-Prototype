import uuid
from datetime import date
from typing import Any, Optional
from pydantic import BaseModel


class SubjectOut(BaseModel):
    subject_code: str
    site_id: uuid.UUID
    sample_count: int
    sample_types: list[str]           # distinct sample_type values across this subject's samples
    first_collection_date: Optional[date] = None
    last_collection_date: Optional[date] = None
    # Snapshot of the subject-level fields (age, gender, diagnosis, etc.) pulled
    # from the subject's most recently added sample -- these are expected to be
    # consistent across a subject's samples, per how the data is captured.
    data: dict[str, Any]


class SubjectPage(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[SubjectOut]


class SubjectSuggestion(BaseModel):
    subject_code: str
    sample_count: int


class SubjectAutofillOut(BaseModel):
    subject_code: str
    found: bool                # False if no existing sample matches this subject_code
    data: dict[str, Any]       # only the fields flagged is_autofill on the field registry