"""Unit tests for services/predictor.py — model access is stubbed via
services.model_registry.set_model_for_testing(), DB access is stubbed by
monkeypatching services.predictor.build_booking_features directly.
"""

import pytest

from app.schemas.response import NotApplicableReason, RiskTier
from services import model_registry, predictor
from services.features import BookingFeatures


class _StubModel:
    """predict_proba() returns a fixed no-show probability regardless of
    input, so tests can assert on the resulting tier without a real fit."""

    def __init__(self, no_show_proba: float):
        self._no_show_proba = no_show_proba

    def predict_proba(self, X):
        return [[1 - self._no_show_proba, self._no_show_proba] for _ in X]


@pytest.fixture(autouse=True)
def _reset_model():
    yield
    model_registry.set_model_for_testing(None)


@pytest.mark.parametrize(
    "score,expected_tier",
    [
        (0.0, RiskTier.LOW),
        (0.32, RiskTier.LOW),
        (0.33, RiskTier.MEDIUM),
        (0.5, RiskTier.MEDIUM),
        (0.66, RiskTier.HIGH),
        (1.0, RiskTier.HIGH),
    ],
)
def test_score_to_tier_boundaries(score, expected_tier):
    assert predictor.score_to_tier(score) == expected_tier


def test_predict_single_not_applicable_never_calls_the_model(monkeypatch):
    monkeypatch.setattr(
        predictor,
        "build_booking_features",
        lambda booking_id: BookingFeatures(
            booking_id=booking_id,
            applicable=False,
            reason=NotApplicableReason.ALREADY_RESOLVED,
        ),
    )
    # No model registered at all — if predict_single tried to score this,
    # it would raise RuntimeError instead of returning cleanly.
    model_registry.set_model_for_testing(None)

    result = predictor.predict_single(42)

    assert result.applicable is False
    assert result.risk_score is None
    assert result.risk_tier is None
    assert result.reason == NotApplicableReason.ALREADY_RESOLVED


def test_predict_single_applicable_returns_score_tier_and_confidence(monkeypatch):
    monkeypatch.setattr(
        predictor,
        "build_booking_features",
        lambda booking_id: BookingFeatures(
            booking_id=booking_id,
            applicable=True,
            low_confidence=True,
            prior_booking_count=0,
        ),
    )
    model_registry.set_model_for_testing(_StubModel(no_show_proba=0.8))

    result = predictor.predict_single(42)

    assert result.applicable is True
    assert result.risk_score == pytest.approx(0.8)
    assert result.risk_tier == RiskTier.HIGH
    assert result.low_confidence is True
    assert result.reason is None


def test_predict_batch_preserves_order_and_flags_invalid_without_failing(monkeypatch):
    def fake_build_features(booking_id):
        if booking_id == 999:
            return BookingFeatures(
                booking_id=booking_id,
                applicable=False,
                reason=NotApplicableReason.NOT_FOUND,
            )
        return BookingFeatures(booking_id=booking_id, applicable=True)

    monkeypatch.setattr(predictor, "build_booking_features", fake_build_features)
    model_registry.set_model_for_testing(_StubModel(no_show_proba=0.1))

    results = predictor.predict_batch([1, 999, 2])

    assert [r.booking_id for r in results] == [1, 999, 2]
    assert results[0].applicable is True
    assert results[1].applicable is False
    assert results[1].reason == NotApplicableReason.NOT_FOUND
    assert results[2].applicable is True
