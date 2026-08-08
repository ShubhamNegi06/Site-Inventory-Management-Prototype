import jwt
import time
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User, UserRole

bearer_scheme = HTTPBearer()

# Supabase projects now default to asymmetric (ES256) JWT signing keys rather
# than the old shared HS256 secret. The JWKS endpoint exposes whichever
# public key(s) the project actually uses -- including the legacy HS256
# secret as a symmetric JWK, if that's still what the project is on -- so
# verifying against it works regardless of which mode a given project is in.
# PyJWKClient caches the fetched keys so this isn't a network call on every
# request.
_jwks_client = PyJWKClient(
    f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json",
    cache_keys=True,
    lifespan=3600,
    # Supabase's gateway (Kong) rejects any request -- even to public
    # endpoints like JWKS -- that's missing an apikey header.
    headers={"apikey": settings.SUPABASE_ANON_KEY} if settings.SUPABASE_ANON_KEY else None,
)


def decode_supabase_jwt(token: str) -> dict:
    # Preferred path: verify via JWKS (covers ES256 and, when present, HS256).
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256", "HS256"],
            audience="authenticated",
        )
    except Exception:
        pass

    # Fallback: very old projects still on a pure legacy HS256 secret that
    # isn't published via JWKS.
    if settings.SUPABASE_JWT_SECRET:
        try:
            return jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except jwt.PyJWTError:
            pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
    )


#def get_current_user(
#    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
#    db: Session = Depends(get_db),
#) -> User:
#    payload = decode_supabase_jwt(credentials.credentials)
#    user_id = payload.get("sub")
#    if not user_id:
#        raise HTTPException(status_code=401, detail="Invalid token payload")
#
#    user = db.query(User).filter(User.id == user_id).first()
#    if not user:
#        raise HTTPException(
#            status_code=403,
#            detail="Account exists in auth but has no profile/role assigned. Contact an admin.",
#       )
#    if not user.is_active:
#       raise HTTPException(status_code=403, detail="Account is deactivated")
#    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:

    start = time.perf_counter()

    # JWT verification
    jwt_start = time.perf_counter()

    payload = decode_supabase_jwt(credentials.credentials)

    jwt_time = time.perf_counter() - jwt_start

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid token payload",
        )

    # Database user lookup
    db_start = time.perf_counter()

    user = db.query(User).filter(User.id == user_id).first()

    db_time = time.perf_counter() - db_start

    total_time = time.perf_counter() - start

    print(
        f"[AUTH TIMING] "
        f"jwt={jwt_time:.4f}s "
        f"user_db={db_time:.4f}s "
        f"total={total_time:.4f}s"
    )

    if not user:
        raise HTTPException(
            status_code=403,
            detail="Account exists in auth but has no profile/role assigned. Contact an admin.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is deactivated",
        )

    return user

def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def require_site_user(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.site:
        raise HTTPException(status_code=403, detail="Site user access required")
    if not user.site_id:
        raise HTTPException(status_code=403, detail="Site user has no site assigned")
    return user
