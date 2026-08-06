from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.models.user import User
from app.schemas.user import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=UserOut)
def read_current_user(user: User = Depends(get_current_user)):
    """
    Frontend calls this right after Supabase login to find out the user's
    role (admin/site) and, if a site user, which site they belong to --
    this drives whether they land on the admin dashboard or site dashboard.
    """
    return user
