"""GET /recommendations query-param parsing and validation.

Field/validation rules per data-model.md "Recommendation Request" and the
400 cases documented in contracts/recommendations-api.md. Kept as manual
Query() parsing (rather than a body model) since this is a GET endpoint,
and validation errors are raised as HTTPException(400) directly so the
error shape matches the contract instead of FastAPI's default 422.
"""

from typing import Optional

from fastapi import HTTPException, Query, status
from pydantic import BaseModel

ALLOWED_SPORTS = {"FOOTBALL", "BADMINTON"}


class RecommendationRequest(BaseModel):
    user_id: int
    sport: str
    limit: int = 10
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_km: Optional[float] = None


def parse_recommendation_request(
    userId: int = Query(...),
    sport: str = Query(...),
    limit: int = Query(10),
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    radiusKm: Optional[float] = Query(None),
) -> RecommendationRequest:
    errors: list[str] = []

    if userId <= 0:
        errors.append("userId must be a positive integer")

    if sport not in ALLOWED_SPORTS:
        errors.append(f"sport must be one of {', '.join(sorted(ALLOWED_SPORTS))}")

    if not (1 <= limit <= 50):
        errors.append("limit must be between 1 and 50")

    has_lat = latitude is not None
    has_lng = longitude is not None
    if has_lat != has_lng:
        errors.append("latitude and longitude must both be present or both be absent")
    if latitude is not None and not (-90 <= latitude <= 90):
        errors.append("latitude must be between -90 and 90")
    if longitude is not None and not (-180 <= longitude <= 180):
        errors.append("longitude must be between -180 and 180")
    if radiusKm is not None and not (1 <= radiusKm <= 20):
        errors.append("radiusKm must be between 1 and 20")

    if errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="; ".join(errors)
        )

    return RecommendationRequest(
        user_id=userId,
        sport=sport,
        limit=limit,
        latitude=latitude,
        longitude=longitude,
        radius_km=radiusKm,
    )
