"""POST /predict and POST /predict/batch response shapes — see
data-model.md and contracts/noshow-prediction-api.md for field
definitions."""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class RiskTier(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class NotApplicableReason(str, Enum):
    ALREADY_RESOLVED = "ALREADY_RESOLVED"
    NOT_YET_COMMITTED = "NOT_YET_COMMITTED"
    NOT_FOUND = "NOT_FOUND"


class PredictionResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    booking_id: int = Field(alias="bookingId")
    applicable: bool
    risk_score: Optional[float] = Field(default=None, alias="riskScore")
    risk_tier: Optional[RiskTier] = Field(default=None, alias="riskTier")
    low_confidence: bool = Field(default=False, alias="lowConfidence")
    reason: Optional[NotApplicableReason] = None


class BatchPredictionResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    results: list[PredictionResult]
