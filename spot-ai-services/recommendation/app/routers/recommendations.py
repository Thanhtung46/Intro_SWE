"""GET /recommendations — see contracts/recommendations-api.md."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.schemas.request import RecommendationRequest, parse_recommendation_request
from app.schemas.response import RecommendationResult, TimeSlot, VenueSuggestion
from app.security import require_internal_service_key
from services.candidates import fetch_candidate_venues, populate_available_slots
from services.scoring import compute_popularity_scores, score_candidates
from services.signals import build_user_signal_profile

router = APIRouter(dependencies=[Depends(require_internal_service_key)])


@router.get("/recommendations", response_model=RecommendationResult)
def get_recommendations(
    request: RecommendationRequest = Depends(parse_recommendation_request),
) -> RecommendationResult:
    profile = build_user_signal_profile(request.user_id)

    candidates = fetch_candidate_venues(request.sport)
    candidates = populate_available_slots(
        candidates
    )  # FR-004/005 exclusion (User Story 3)
    popularity = compute_popularity_scores(request.sport)

    ranked, fallback = score_candidates(profile, candidates, popularity, request)
    top = ranked[: request.limit]  # FR-007: never padded, may be shorter than limit

    items = [
        VenueSuggestion(
            venue_id=scored.candidate.venue_id,
            venue_name=scored.candidate.venue_name,
            address=scored.candidate.address,
            sport=request.sport,
            score=round(scored.score, 4),
            distance_km=(
                round(scored.distance_km, 2) if scored.distance_km is not None else None
            ),
            suggested_slots=[
                TimeSlot(
                    field_id=slot.field_id,
                    starts_at=slot.starts_at,
                    ends_at=slot.ends_at,
                )
                for slot in scored.candidate.slots
            ],
        )
        for scored in top
    ]

    return RecommendationResult(
        items=items,
        generated_at=datetime.now(timezone.utc),
        fallback=fallback,
    )
