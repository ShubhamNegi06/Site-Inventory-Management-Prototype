from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import require_admin
from app.db.session import get_db
from app.models.site import Site
from app.schemas.site import SiteCreate, SiteOut

router = APIRouter(prefix="/sites", tags=["sites"])


@router.post("", response_model=SiteOut, dependencies=[Depends(require_admin)])
def create_site(payload: SiteCreate, db: Session = Depends(get_db)):
    if db.query(Site).filter(Site.slug == payload.slug).first():
        raise HTTPException(status_code=400, detail="A site with this slug already exists")
    site = Site(name=payload.name, slug=payload.slug)
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


@router.get("", response_model=list[SiteOut], dependencies=[Depends(require_admin)])
def list_sites(db: Session = Depends(get_db)):
    return db.query(Site).order_by(Site.created_at.desc()).all()


@router.patch("/{site_id}/deactivate", response_model=SiteOut, dependencies=[Depends(require_admin)])
def deactivate_site(site_id: str, db: Session = Depends(get_db)):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    site.is_active = False
    db.commit()
    db.refresh(site)
    return site
