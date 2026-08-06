import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sample_id: uuid.UUID
    file_name: str
    content_type: str
    file_size: Optional[int] = None
    uploaded_by: Optional[uuid.UUID] = None
    uploaded_at: datetime


class ReportDownloadOut(BaseModel):
    url: str
    file_name: str
    expires_in: int
