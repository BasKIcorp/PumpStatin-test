from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import admin, admin_site, auth, catalog, config, selection
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
app.include_router(admin_site.router, prefix="/api/v1/admin", tags=["admin"])


@app.get("/health")
def health():
    from app.services.config_store import load_profile_yaml
    from app.db.dialect import database_mode

    profile = load_profile_yaml(settings.app_profile_id)
    rules = {}
    try:
        from app.algorithms.bps_w_v2.rules_loader import load_algorithm_rules
        from app.core.config import PROFILES_DIR

        rules = load_algorithm_rules(PROFILES_DIR / settings.app_profile_id)
    except Exception:
        pass

    return {
        "status": "ok",
        "mockDb": settings.use_mock_db,
        "database": database_mode(),
        "profileId": settings.app_profile_id,
        "algorithm": profile.get("algorithm"),
        "rulesVersion": rules.get("version"),
    }
