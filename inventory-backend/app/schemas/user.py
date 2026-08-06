import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict

from app.models.user import UserRole


class SiteUserCreate(BaseModel):
    """Admin uses this to create a new site login."""
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    site_id: uuid.UUID


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: Optional[str] = None
    role: UserRole
    site_id: Optional[uuid.UUID] = None
    is_active: bool
    created_at: datetime
