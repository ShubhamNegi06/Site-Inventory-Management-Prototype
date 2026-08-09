import re
import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import or_, cast, String
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.api.deps import get_sample_or_404, assert_can_access_sample, get_site_or_404
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.sample import Sample
from app.models.user import User, UserRole
from app.services import bulk_import as bulk_import_service
from app.schemas.sample import (
    SampleCreate,
    SampleUpdate,
    SampleOut,
    SamplePage,
    BulkDeleteRequest,
    BulkDeleteResponse,
    BulkImportPreviewResponse,
    BulkImportCommitRequest,
    BulkImportCommitResponse,
    BulkImportRowResult,
)

router = APIRouter(prefix="/samples", tags=["samples"])


def _duplicate_sample_code_error(sample_code: str) -> HTTPException:
    """
    A single, consistent 409 shape for a sample_code uniqueness violation --
    `detail` is an object (not a plain string) so the frontend can tell
    *which* field to flag instead of just showing raw text somewhere.
    """
    return HTTPException(
        status_code=409,
        detail={
            "field": "sample_code",
            "message": f'Sample ID "{sample_code}" is already in use. Each sample must have a unique ID.',
        },
    )


def _is_sample_code_violation(err: IntegrityError) -> bool:
    # psycopg populates .diag.constraint_name on unique-violation errors --
    # that's the reliable signal. Fall back to matching the constraint/index
    # name in the raw driver message in case .diag isn't populated for some
    # reason (e.g. a different driver).
    constraint = getattr(getattr(err.orig, "diag", None), "constraint_name", "") or ""
    orig_msg = str(err.orig).lower()
    return "sample_code" in constraint or "sample_code" in orig_msg


FIELD_SEARCH_RE = re.compile(
    r"^(?P<field>[a-zA-Z0-9_\-]+):(.*)$"
)

def parse_search(search: str):
    m = FIELD_SEARCH_RE.match(search)

    if not m:
        return None, search

    return m.group("field"), m.group(2)

@router.post("", response_model=SampleOut)
def create_sample(
    payload: SampleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Site users add samples to their own inventory. Admins can also add
    directly to a site's inventory (or to a virtual "master" bucket if you
    later want one) by passing site_id as a query param -- kept simple here:
    admins must go through /samples?site_id=... on read; for writes we
    require a site user, since "master inventory" is a consolidated VIEW
    of all sites' data, not a separate place data is entered.
    """
    if user.role != UserRole.site:
        raise HTTPException(status_code=403, detail="Only site users can add samples")

    sample = Sample(
        site_id=user.site_id,
        subject_code=payload.subject_code,
        sample_code=payload.sample_code,
        sample_type=payload.sample_type,
        collection_date=payload.collection_date,
        data=payload.data,
        created_by=user.id,
    )
    db.add(sample)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        if _is_sample_code_violation(e):
            raise _duplicate_sample_code_error(payload.sample_code)
        raise HTTPException(status_code=409, detail={"field": None, "message": "This sample conflicts with an existing record."})
    db.refresh(sample)
    return sample


@router.get("", response_model=SamplePage)
def list_samples(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    site_id: uuid.UUID | None = Query(None, description="Admin-only: filter master inventory by site"),
    subject_code: str | None = Query(None, description="Exact match -- all samples belonging to one subject"),
    sample_type: str | None = None,
    search: str | None = Query(None, description="Free-text search across subject_code, sample_code and JSONB data"),
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """
    - Site users: always scoped to their own site (site_id is forced,
      regardless of what's passed in) -- this is what enforces
      "can't access other site inventories".
    - Admins: no site_id => master inventory (all sites, consolidated).
      Passing site_id => that one site's inventory.
    """
    query = db.query(Sample).filter(Sample.is_deleted.is_(False))

    if user.role == UserRole.site:
        query = query.filter(Sample.site_id == user.site_id)
    else:
        if site_id:
            get_site_or_404(db, site_id)
            query = query.filter(Sample.site_id == site_id)

    if subject_code:
        query = query.filter(Sample.subject_code == subject_code)
    if sample_type:
        query = query.filter(Sample.sample_type == sample_type)
    if date_from:
        query = query.filter(Sample.collection_date >= date_from)
    if date_to:
        query = query.filter(Sample.collection_date <= date_to)
    if search:
        field, value = parse_search(search)
    
        if field is None:
            like = f"%{value}%"
    
            query = query.filter(
                or_(
                    Sample.sample_code.ilike(like),
                    Sample.subject_code.ilike(like),
                    cast(Sample.data, String).ilike(like),
                )
            )
    
        elif field == "sample_code":
            query = query.filter(
                Sample.sample_code.ilike(f"%{value}%")
            )
    
        elif field == "subject_code":
            query = query.filter(
                Sample.subject_code.ilike(f"%{value}%")
            )
    
        else:
            query = query.filter(
                Sample.data[field].astext.ilike(f"%{value}%")
            )

    total = query.count()
    items = (
        query.order_by(Sample.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return SamplePage(total=total, page=page, page_size=page_size, items=items)


@router.get("/{sample_id}", response_model=SampleOut)
def get_sample(
    sample_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sample = get_sample_or_404(db, sample_id)
    assert_can_access_sample(user, sample)
    return sample


@router.patch("/{sample_id}", response_model=SampleOut)
def update_sample(
    sample_id: uuid.UUID,
    payload: SampleUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sample = get_sample_or_404(db, sample_id)
    assert_can_access_sample(user, sample)

    if payload.subject_code is not None:
        sample.subject_code = payload.subject_code
    if payload.sample_code is not None:
        sample.sample_code = payload.sample_code
    if payload.sample_type is not None:
        sample.sample_type = payload.sample_type
    if payload.collection_date is not None:
        sample.collection_date = payload.collection_date
    if payload.data is not None:
        sample.data = {**sample.data, **payload.data}  # merge, don't overwrite whole blob

    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        if _is_sample_code_violation(e):
            raise _duplicate_sample_code_error(payload.sample_code or sample.sample_code)
        raise HTTPException(status_code=409, detail={"field": None, "message": "This sample conflicts with an existing record."})
    db.refresh(sample)
    return sample


@router.delete("/{sample_id}", status_code=204)
def delete_sample(
    sample_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Admins can delete any sample. Site users can delete samples from their
    own inventory only -- assert_can_access_sample already enforces that
    scoping the same way it does for reads/edits.
    """
    sample = get_sample_or_404(db, sample_id)
    assert_can_access_sample(user, sample)

    sample.is_deleted = True
    from datetime import datetime, timezone
    sample.deleted_at = datetime.now(timezone.utc)
    db.commit()


@router.post("/bulk-delete", response_model=BulkDeleteResponse)
def bulk_delete_samples(
    payload: BulkDeleteRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Same access rule as single delete, applied to a batch: admins can delete
    any of the requested samples; site users only the ones in their own
    site. IDs outside a site user's reach are silently skipped rather than
    erroring the whole batch, so one stray/invalid id doesn't block the rest
    -- the response tells the caller how many of what was requested actually
    got deleted.
    """
    if not payload.ids:
        return BulkDeleteResponse(deleted=0, requested=0)

    query = db.query(Sample).filter(Sample.id.in_(payload.ids), Sample.is_deleted.is_(False))
    if user.role == UserRole.site:
        query = query.filter(Sample.site_id == user.site_id)

    samples = query.all()
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    for sample in samples:
        sample.is_deleted = True
        sample.deleted_at = now
    db.commit()

    return BulkDeleteResponse(deleted=len(samples), requested=len(payload.ids))


MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
IMPORT_CONTENT_TYPES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
    "application/vnd.ms-excel",  # some browsers send this for .xlsx too
}


@router.post("/bulk-import/preview", response_model=BulkImportPreviewResponse)
async def preview_bulk_import(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Parses an uploaded .xlsx against the sample template's column headers
    (matched to known field definitions -- global + this site's own) and
    validates every row, WITHOUT writing anything to the database. Lets the
    frontend show a review table -- including duplicate/missing IDs and any
    columns it couldn't map to a known field -- before the user commits.
    """
    if user.role != UserRole.site:
        raise HTTPException(status_code=403, detail="Only site users can import samples")

    filename = (file.filename or "").lower()
    if file.content_type not in IMPORT_CONTENT_TYPES and not filename.endswith((".xlsx", ".xlsm")):
        raise HTTPException(status_code=400, detail="Please upload an .xlsx file")

    content = await file.read()
    if len(content) > MAX_IMPORT_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 10MB limit")

    try:
        return bulk_import_service.parse_workbook(content, db, user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bulk-import/commit", response_model=BulkImportCommitResponse)
def commit_bulk_import(
    payload: BulkImportCommitRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Inserts rows the frontend already validated via /bulk-import/preview.
    Each row is its own commit, so one failure (e.g. a sample_code that got
    claimed by someone else between preview and commit) doesn't roll back
    the rest of the batch -- the response reports each row's outcome.
    """
    if user.role != UserRole.site:
        raise HTTPException(status_code=403, detail="Only site users can import samples")

    results: list[BulkImportRowResult] = []
    created = 0

    for row in payload.rows:
        sample = Sample(
            site_id=user.site_id,
            subject_code=row.subject_code,
            sample_code=row.sample_code,
            sample_type=row.sample_type,
            collection_date=row.collection_date,
            data=row.data,
            created_by=user.id,
        )
        db.add(sample)
        try:
            db.commit()
        except IntegrityError as e:
            db.rollback()
            message = (
                f'Sample ID "{row.sample_code}" is already in use.'
                if _is_sample_code_violation(e)
                else "This sample conflicts with an existing record."
            )
            results.append(
                BulkImportRowResult(row_number=row.row_number, sheet=row.sheet, sample_code=row.sample_code, status="failed", error=message)
            )
            continue
        created += 1
        results.append(
            BulkImportRowResult(row_number=row.row_number, sheet=row.sheet, sample_code=row.sample_code, status="created")
        )

    return BulkImportCommitResponse(created=created, failed=len(payload.rows) - created, results=results)