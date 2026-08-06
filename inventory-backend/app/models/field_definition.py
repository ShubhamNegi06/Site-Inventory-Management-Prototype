import enum
import uuid
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class FieldType(str, enum.Enum):
    text = "text"
    number = "number"
    date = "date"
    select = "select"
    boolean = "boolean"


class FieldDefinition(Base):
    """
    Registry of dynamic fields that have been added, so the frontend can
    render consistent form inputs and the admin can see what fields exist
    across sites. site_id = NULL means the field is available/global to all
    sites (e.g. added by admin); otherwise it's scoped to one site.
    """
    __tablename__ = "field_definitions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.id"), nullable=True)
    field_key = Column(String, nullable=False)      # snake_case, used as JSONB key, e.g. "tumor_percent"
    field_label = Column(String, nullable=False)    # display label, e.g. "Tumor %"
    field_type = Column(Enum(FieldType), nullable=False, default=FieldType.text)
    section = Column(String, nullable=True)          # e.g. "Diagnosis Information"
    options = Column(String, nullable=True)          # comma-separated, only for "select" type
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
