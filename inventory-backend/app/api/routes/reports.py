import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.api.deps import get_sample_or_404, assert_can_access_sample
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.report import Report
from app.models.site import Site
from app.models.user import User, UserRole
from app.schemas.report import ReportOut, ReportDownloadOut
from app.services import storage

router = APIRouter(tags=["reports"])

ALLOWED_CONTENT_TYPES = {"application/pdf", "image/png", "image/jpeg", "image/tiff", "image/webp"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


@router.post("/samples/{sample_id}/reports", response_model=list[ReportOut])
async def upload_reports(
    sample_id: uuid.UUID,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sample = get_sample_or_404(db, sample_id)
    assert_can_access_sample(user, sample)

    site = db.query(Site).filter(Site.id == sample.site_id).first()

    created: list[Report] = []
    for f in files:
        if f.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {f.content_type}")
        content = await f.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"{f.filename} exceeds 25MB limit")

        key = storage.build_object_key(site.slug, sample.id, f.filename)
        storage.upload_file(key, content, f.content_type)

        report = Report(
            sample_id=sample.id,
            file_key=key,
            file_name=f.filename,
            content_type=f.content_type,
            file_size=len(content),
            uploaded_by=user.id,
        )
        db.add(report)
        created.append(report)

    db.commit()
    for r in created:
        db.refresh(r)
    return created


@router.get("/samples/{sample_id}/reports", response_model=list[ReportOut])
def list_reports(
    sample_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sample = get_sample_or_404(db, sample_id)
    assert_can_access_sample(user, sample)
    return db.query(Report).filter(Report.sample_id == sample_id).order_by(Report.uploaded_at.desc()).all()


@router.get("/reports/{report_id}/download", response_model=ReportDownloadOut)
def download_report(
    report_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    sample = get_sample_or_404(db, report.sample_id)
    assert_can_access_sample(user, sample)

    url = storage.generate_presigned_download_url(report.file_key, report.file_name)
    return ReportDownloadOut(url=url, file_name=report.file_name, expires_in=900)


@router.delete("/reports/{report_id}", status_code=204)
def delete_report(
    report_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Admin-only, per spec ('manage report(pdf files and images upload alongside with samples)')."""
    if user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Only admins can delete reports")

    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    storage.delete_file(report.file_key)
    db.delete(report)
    db.commit()
