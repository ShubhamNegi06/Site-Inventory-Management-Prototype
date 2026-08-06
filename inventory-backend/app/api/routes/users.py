import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_site_or_404
from app.core.security import require_admin
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.user import SiteUserCreate, UserOut
from app.services.supabase_admin import create_auth_user, delete_auth_user

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/site-user", response_model=UserOut, dependencies=[Depends(require_admin)])
def create_site_user(payload: SiteUserCreate, db: Session = Depends(get_db)):
    get_site_or_404(db, payload.site_id)

    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    # Step 1: create the Supabase Auth account (handles password hashing, etc).
    auth_user_id = create_auth_user(payload.email, payload.password)

    # Step 2: create our local profile row, linking role + site.
    try:
        user = User(
            id=uuid.UUID(auth_user_id),
            email=payload.email,
            full_name=payload.full_name,
            role=UserRole.site,
            site_id=payload.site_id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        delete_auth_user(auth_user_id)  # keep auth + profile tables in sync
        raise HTTPException(status_code=500, detail="Failed to create user profile")

    return user


@router.get("", response_model=list[UserOut], dependencies=[Depends(require_admin)])
def list_users(site_id: uuid.UUID | None = None, db: Session = Depends(get_db)):
    query = db.query(User)
    if site_id:
        query = query.filter(User.site_id == site_id)
    return query.order_by(User.created_at.desc()).all()


@router.patch("/{user_id}/deactivate", response_model=UserOut, dependencies=[Depends(require_admin)])
def deactivate_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user
