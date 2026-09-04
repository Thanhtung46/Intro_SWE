"""FastAPI app entrypoint for the no-show prediction service.

Run with: uvicorn app.main:app --port 5002
"""

import logging
from contextlib import asynccontextmanager

import psycopg2
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.routers.predictions import router as predictions_router
from services import model_registry

logger = logging.getLogger("noshow-prediction")


@asynccontextmanager
async def _lifespan(app: FastAPI):
    model_registry.load_model()
    yield


app = FastAPI(title="SPOT No-Show Prediction Service", lifespan=_lifespan)
app.include_router(predictions_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "modelLoaded": model_registry.is_loaded()}


@app.exception_handler(RequestValidationError)
def handle_validation_error(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Return 400 (per contracts/noshow-prediction-api.md) instead of
    FastAPI's default 422 for malformed request bodies."""
    return JSONResponse(status_code=400, content={"error": str(exc)})


@app.exception_handler(psycopg2.Error)
def handle_db_error(request: Request, exc: psycopg2.Error) -> JSONResponse:
    """Fail fast and cleanly on any Postgres error — never hang the caller."""
    logger.error("Database error handling %s: %s", request.url.path, exc)
    return JSONResponse(status_code=500, content={"error": "Upstream data error"})


@app.exception_handler(RuntimeError)
def handle_model_unavailable(request: Request, exc: RuntimeError) -> JSONResponse:
    """Model artifact not loaded — 503, per spec.md Edge Cases, not a crash."""
    logger.warning("Model unavailable handling %s: %s", request.url.path, exc)
    return JSONResponse(status_code=503, content={"error": "model not available"})
