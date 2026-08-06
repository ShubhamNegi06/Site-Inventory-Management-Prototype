from supabase import create_client, Client

from app.core.config import settings

# Uses the SERVICE ROLE key -- server-side only, never expose to frontend.
# This lets the backend create auth users on behalf of the admin (Admin
# creates a site login -> we create the Supabase auth user here, then
# insert a matching row in our own `users` profile table).
_admin_client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def create_auth_user(email: str, password: str) -> str:
    """Creates a confirmed Supabase auth user and returns its UUID."""
    result = _admin_client.auth.admin.create_user(
        {
            "email": email,
            "password": password,
            "email_confirm": True,
        }
    )
    return result.user.id


def delete_auth_user(user_id: str) -> None:
    _admin_client.auth.admin.delete_user(user_id)
