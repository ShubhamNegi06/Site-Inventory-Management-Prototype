import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.sample import Sample
from app.models.site import Site
from app.models.user import User, UserRole


def get_sample_or_404(db: Session, sample_id: uuid.UUID) -> Sample:
    sample = db.query(Sample).filter(Sample.id == sample_id, Sample.is_deleted.is_(False)).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    return sample


def assert_can_access_sample(user: User, sample: Sample) -> None:
    """Site users may only touch samples belonging to their own site."""
    if user.role == UserRole.admin:
        return
    if sample.site_id != user.site_id:
        raise HTTPException(status_code=403, detail="You cannot access another site's inventory")


def get_site_or_404(db: Session, site_id: uuid.UUID) -> Site:
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return site
