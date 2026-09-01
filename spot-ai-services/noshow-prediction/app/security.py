"""Internal service-to-service auth.

This service is only ever called by spot-backend over an internal network
path (never directly by a frontend or an end-user's browser/app) — see
research.md decision 8. It trusts a static shared-secret header instead of
validating a per-user SPOT JWT, since it has no user database of its own.
Checked before any DB read happens (FR-006).
"""

from fastapi import Header, HTTPException, status

from app.config import settings


def require_internal_service_key(
    x_internal_service_key: str = Header(default=""),
) -> None:
    if not settings.internal_service_key or (
        x_internal_service_key != settings.internal_service_key
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid X-Internal-Service-Key",
        )
