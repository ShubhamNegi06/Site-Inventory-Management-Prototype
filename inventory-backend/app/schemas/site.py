import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SiteCreate(BaseModel):
    name: str
    slug: str


class SiteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    is_active: bool
    created_at: datetime
