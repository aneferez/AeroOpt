import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.database import Base, engine
from app.core.rate_limit import RateLimitMiddleware
from app.providers import provider_status
from app.routers import alerts, assistant, auth, flights, health, saved, trips, users

settings = get_settings()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("aeroopt")


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.environment in {"development", "test"}:
        Base.metadata.create_all(bind=engine)
    status = provider_status(settings)
    logger.info("Flight provider: %s (mode=%s)", status["provider"], status["mode"])
    if settings.flight_provider == "amadeus" and not status["live_configured"]:
        logger.error(
            "FLIGHT_PROVIDER=amadeus but Amadeus credentials are missing; live flight search will fail"
        )
    elif settings.is_production and status["mode"] == "demo":
        logger.warning(
            "Production is serving DEMO fares. Set FLIGHT_PROVIDER=amadeus with Amadeus "
            "credentials and ALLOW_DEMO_PROVIDER=false to go live."
        )
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url=None,
    lifespan=lifespan,
)
app.add_middleware(RateLimitMiddleware, requests_per_minute=settings.rate_limit_per_minute)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

for route in (
    health.router,
    auth.router,
    flights.router,
    users.router,
    saved.router,
    alerts.router,
    trips.router,
    assistant.router,
):
    app.include_router(route, prefix=settings.api_v1_prefix)


@app.exception_handler(Exception)
async def unexpected_error(request: Request, exc: Exception):
    logger.exception("Unhandled API error", extra={"path": request.url.path})
    return JSONResponse(status_code=500, content={"detail": "An unexpected error occurred"})
