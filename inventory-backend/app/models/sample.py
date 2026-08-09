import uuid
from sqlalchemy import Column, String, DateTime, Date, Boolean, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.db.session import Base


class Sample(Base):
    """
    A single block/tissue sample. Multiple samples can belong to the same
    subject (e.g. a tumor block and a matched normal-adjacent-tissue block
    from the same patient) -- `subject_code` is what ties them together.

    Fixed columns cover fields that are (a) present for basically every
    sample and (b) commonly filtered/sorted/searched on, so they get a real
    indexed column. Everything else -- including every site-specific /
    dynamically-added field -- lives in `data` (JSONB), so sites are never
    blocked from capturing a field we didn't anticipate.
    """
    __tablename__ = "samples"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.id"), nullable=False, index=True)

    subject_code = Column(String, nullable=True, index=True)   # e.g. "GB-01" -- shared across a subject's samples
    sample_code = Column(String, nullable=False, unique=True, index=True)   # e.g. "GB-01FFPE1" -- unique per physical sample
    sample_type = Column(String, nullable=False, index=True)   # e.g. "FFPE Block", "Frozen Tumor"
    collection_date = Column(Date, nullable=True, index=True)

    # Everything else: demographics, diagnosis info, extra dynamic fields, etc.
    # Keys correspond to FieldDefinition.field_key entries for that site.
    data = Column(JSONB, nullable=False, server_default="{}")

    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)