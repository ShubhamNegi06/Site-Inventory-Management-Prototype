from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
import uuid

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.sample import Sample
from app.models.user import User, UserRole
from app.schemas.subject import SubjectOut, SubjectPage

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.get("", response_model=SubjectPage)
def list_subjects(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    site_id: uuid.UUID | None = Query(None, description="Admin-only: filter by site"),
    search: str | None = Query(None, description="Filter by subject code"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """
    Groups samples by subject_code so you can see everything collected from
    one patient in one place, instead of one row per physical sample.
    Grouping happens in Python rather than SQL -- simpler to reason about
    and plenty fast at the row counts this kind of registry deals with.
    """
    query = db.query(Sample).filter(Sample.is_deleted.is_(False), Sample.subject_code.isnot(None))

    if user.role == UserRole.site:
        query = query.filter(Sample.site_id == user.site_id)
    elif site_id:
        query = query.filter(Sample.site_id == site_id)

    if search:
        query = query.filter(Sample.subject_code.ilike(f"%{search}%"))

    samples = query.order_by(Sample.created_at.desc()).all()

    groups: dict[tuple, list[Sample]] = {}
    for s in samples:
        key = (s.site_id, s.subject_code)
        groups.setdefault(key, []).append(s)

    subjects = []
    for (site_id_key, subject_code), group in groups.items():
        # Most recently added sample stands in for the subject-level snapshot
        # (age, gender, diagnosis, etc.) -- these fields are expected to be
        # consistent across a subject's samples.
        newest = max(group, key=lambda s: s.created_at)
        dates = [s.collection_date for s in group if s.collection_date]
        subjects.append(
            SubjectOut(
                subject_code=subject_code,
                site_id=site_id_key,
                sample_count=len(group),
                sample_types=sorted({s.sample_type for s in group}),
                first_collection_date=min(dates) if dates else None,
                last_collection_date=max(dates) if dates else None,
                data=newest.data,
            )
        )

    subjects.sort(key=lambda s: s.subject_code)

    total = len(subjects)
    start = (page - 1) * page_size
    page_items = subjects[start : start + page_size]

    return SubjectPage(total=total, page=page, page_size=page_size, items=page_items)