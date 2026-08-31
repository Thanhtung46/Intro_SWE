"""GET /recommendations response shapes — see data-model.md and
contracts/recommendations-api.md for field definitions."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TimeSlot(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    field_id: int = Field(alias="fieldId")
    starts_at: datetime = Field(alias="startsAt")
    ends_at: datetime = Field(alias="endsAt")


class VenueSuggestion(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    venue_id: int = Field(alias="venueId")
    venue_name: str = Field(alias="venueName")
    address: str
    sport: str
    score: float
    distance_km: Optional[float] = Field(default=None, alias="distanceKm")
    suggested_slots: list[TimeSlot] = Field(
        default_factory=list, alias="suggestedSlots"
    )


class RecommendationResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    items: list[VenueSuggestion]
    generated_at: datetime = Field(alias="generatedAt")
    fallback: bool = False
