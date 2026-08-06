from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import auth, sites, users, samples, field_definitions, reports

app = FastAPI(title="Sample Inventory API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(sites.router)
app.include_router(users.router)
app.include_router(samples.router)
app.include_router(field_definitions.router)
app.include_router(reports.router)


@app.get("/health")
def health():
    return {"status": "ok"}
