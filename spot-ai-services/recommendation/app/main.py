"""FastAPI app entrypoint for the recommendation service.

Run with: uvicorn app.main:app --port 5001
"""

import logging

import psycopg2
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.routers.recommendations import router as recommendations_router

logger = logging.getLogger("recommendation")

app = FastAPI(title="SPOT Recommendation Service")
app.include_router(recommendations_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.exception_handler(psycopg2.Error)
def handle_db_error(request: Request, exc: psycopg2.Error) -> JSONResponse:
    """Fail fast and cleanly on any Postgres error.

    Per research.md decision 6, this service's only obligation on failure is
    to answer promptly (never hang) so spot-backend's own timeout/fallback
    (FR-010) isn't blocked waiting on a stuck request.
    """
    logger.error("Database error handling %s: %s", request.url.path, exc)
    return JSONResponse(status_code=500, content={"error": "Upstream data error"})
