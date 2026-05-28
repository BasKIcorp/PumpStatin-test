from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import admin, auth, catalog, config, selection
from app.core.config import settings
from app.db.init_db import init_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.use_mock_db:
        await init_database()
    yield


app = FastAPI(
    title="PumpStation API",
    version="0.2.0",
    description="Подбор насосных станций — профили, аккаунты, плагины",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(config.router, prefix="/api/v1/config", tags=["config"])
app.include_router(catalog.router, prefix="/api/v1/catalog", tags=["catalog"])
app.include_router(selection.router, prefix="/api/v1/selection", tags=["selection"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])


@app.get("/health")
def health():
    return {"status": "ok", "mockDb": settings.use_mock_db}
