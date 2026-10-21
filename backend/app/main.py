"""
Aventra FastAPI application entry point.
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db
from app.api import events, budget, tasks, vendors, replan

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Aventra API",
    description="Aventra — Every event, intelligently orchestrated. Powered by PlanForge.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS — restricted to configured origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(events.router, prefix="/api/v1")
app.include_router(budget.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")
app.include_router(vendors.router, prefix="/api/v1")
app.include_router(replan.router, prefix="/api/v1")


@app.on_event("startup")
async def startup():
    """Initialize database on startup."""
    logger.info("Starting Aventra API server...")
    init_db()
    logger.info("Database initialized.")

    # Log AI status
    from app.services.groq_service import groq_service as gemini_service
    if gemini_service.is_available:
        logger.info("Gemini AI: ENABLED")
    else:
        logger.info("Gemini AI: DISABLED (using template fallback mode)")


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    from app.services.gemini_service import gemini_service
    return {
        "status": "ok",
        "service": "Aventra API",
        "version": "1.0.0",
        "gemini_available": gemini_service.is_available,
        "planforge": "active",
    }


@app.get("/")
def root():
    return {"message": "Aventra API — Every event, intelligently orchestrated."}
