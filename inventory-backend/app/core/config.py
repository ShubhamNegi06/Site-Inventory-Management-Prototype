from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DATABASE_URL: str

    # Supabase Auth
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str = ""  # anon (legacy) or publishable (new) key -- required by Supabase's
                                 # gateway on every request, including the public JWKS endpoint
    SUPABASE_JWT_SECRET: str = ""  # optional now -- only used as a fallback; see core/security.py
    SUPABASE_SERVICE_ROLE_KEY: str

    # Cloudflare R2
    R2_ACCOUNT_ID: str
    R2_ACCESS_KEY_ID: str
    R2_SECRET_ACCESS_KEY: str
    R2_BUCKET_NAME: str
    R2_ENDPOINT_URL: str
    R2_PUBLIC_URL: str = ""

    # App
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
