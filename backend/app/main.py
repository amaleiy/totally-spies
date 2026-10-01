from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.core.config import settings
from app.core.database import init_db, get_db
from app.models.db_models import Case, Target, Scan, Artifact, ScanEvent
from app.api import cases, targets, scans, artifacts, ws, exposure, breaches, reports, settings_api, clover_api

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables on startup
    await init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Totally Spies - Modular Open Source Intelligence (OSINT) Automation & Graph Suite",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(cases.router, prefix=settings.API_V1_STR)
app.include_router(targets.router, prefix=settings.API_V1_STR)
app.include_router(scans.router, prefix=settings.API_V1_STR)
app.include_router(artifacts.router, prefix=settings.API_V1_STR)
app.include_router(ws.router, prefix=settings.API_V1_STR)
app.include_router(exposure.router, prefix=f"{settings.API_V1_STR}/exposure", tags=["exposure"])
app.include_router(breaches.router, prefix=f"{settings.API_V1_STR}/breaches", tags=["breaches"])
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(settings_api.router, prefix=settings.API_V1_STR)
app.include_router(clover_api.router, prefix=settings.API_V1_STR)


@app.get("/api/health", tags=["system"])
async def health_check():
    return {
        "status": "healthy",
        "service": "totally-spies-core",
        "modules": ["clover", "exposure"]
    }

@app.get("/api/stats", tags=["system"])
async def get_system_stats(db: AsyncSession = Depends(get_db)):
    c_cases = await db.scalar(select(func.count(Case.id)))
    c_targets = await db.scalar(select(func.count(Target.id)))
    c_scans = await db.scalar(select(func.count(Scan.id)))
    c_artifacts = await db.scalar(select(func.count(Artifact.id)))

    return {
        "active_cases": c_cases or 0,
        "tracked_targets": c_targets or 0,
        "executed_scans": c_scans or 0,
        "discovered_artifacts": c_artifacts or 0,
        "active_agents": 3
    }

@app.get("/api/activity", tags=["system"])
async def get_recent_activity(db: AsyncSession = Depends(get_db)):
    events_res = await db.execute(
        select(ScanEvent)
        .order_by(ScanEvent.created_at.desc())
        .limit(10)
    )
    events = events_res.scalars().all()
    return [
        {
            "id": e.id,
            "type": e.event_type,
            "message": e.message,
            "created_at": e.created_at.isoformat()
        }
        for e in events
    ]
