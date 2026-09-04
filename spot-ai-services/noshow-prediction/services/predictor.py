"""Applies the loaded model to a booking's features -> PredictionResult.

Score-to-tier mapping and orchestration for both single (User Story 1) and
batch (User Story 2) prediction. Cold-start players still get a real score
(User Story 3) — build_booking_features() already imputes their missing
history to population averages and flags low_confidence.
"""

from app.schemas.response import PredictionResult, RiskTier
from services import model_registry
from services.features import BookingFeatures, build_booking_features

# Tertile thresholds for mapping a [0,1] risk score to a display tier
# (research.md decision 4). Simple, explainable default — not tuned
# against real host feedback yet.
LOW_HIGH_BOUNDARY = 0.33
MEDIUM_HIGH_BOUNDARY = 0.66


def score_to_tier(risk_score: float) -> RiskTier:
    if risk_score < LOW_HIGH_BOUNDARY:
        return RiskTier.LOW
    if risk_score < MEDIUM_HIGH_BOUNDARY:
        return RiskTier.MEDIUM
    return RiskTier.HIGH


def _not_applicable_result(features: BookingFeatures) -> PredictionResult:
    return PredictionResult(
        booking_id=features.booking_id,
        applicable=False,
        risk_score=None,
        risk_tier=None,
        low_confidence=False,
        reason=features.reason,
    )


def _score_features(features: BookingFeatures) -> float:
    model = model_registry.get_model()  # raises RuntimeError if not loaded
    proba = model.predict_proba([features.as_vector()])[0]
    # Class 1 = NO_SHOW, per models/train.py's label encoding.
    return float(proba[1])


def predict_single(booking_id: int) -> PredictionResult:
    features = build_booking_features(booking_id)

    if not features.applicable:
        return _not_applicable_result(features)

    risk_score = _score_features(features)
    return PredictionResult(
        booking_id=booking_id,
        applicable=True,
        risk_score=round(risk_score, 4),
        risk_tier=score_to_tier(risk_score),
        low_confidence=features.low_confidence,
        reason=None,
    )


def predict_batch(booking_ids: list[int]) -> list[PredictionResult]:
    """One result per requested id, same order — invalid/not-found ids get
    a flagged result instead of failing the whole batch (User Story 2)."""
    return [predict_single(booking_id) for booking_id in booking_ids]
