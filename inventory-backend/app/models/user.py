import enum
import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    site = "site"


class User(Base):
    """
    Mirrors supabase auth.users. id MUST match the Supabase auth user's UUID
    (we create the auth user via the Supabase Admin API, then insert this
    profile row with the same id).
    """
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True)  # = supabase auth.users.id
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.site)
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.id"), nullable=True)  # null for admin
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
