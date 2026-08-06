import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class Report(Base):
    """A file (PDF/image) attached to a sample, stored in Cloudflare R2."""
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sample_id = Column(UUID(as_uuid=True), ForeignKey("samples.id", ondelete="CASCADE"), nullable=False, index=True)

    file_key = Column(String, nullable=False)     # object key/path in R2 bucket
    file_name = Column(String, nullable=False)    # original filename
    content_type = Column(String, nullable=False) # e.g. application/pdf, image/png
    file_size = Column(Integer, nullable=True)     # bytes

    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
