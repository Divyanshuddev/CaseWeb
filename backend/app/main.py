from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.routers import auth, board, cases, evidence, suspects, timeline, users
from app.services.seed_service import seed_demo_cases

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_demo_cases(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="CaseWeb – Detective Investigation Platform API",
    version="1.0.0",
    description="Fictional mystery investigation and visual corkboard organization API.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX.strip() or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

settings.upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(settings.upload_path)), name="uploads")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(cases.router)
app.include_router(evidence.router)
app.include_router(suspects.router)
app.include_router(board.router)
app.include_router(timeline.router)


@app.get("/", tags=["Health"])
def root_status():
    return {"status": "ok", "service": settings.APP_NAME, "docs": "/docs"}


@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": settings.APP_NAME}
