"""POST /predict and POST /predict/batch request bodies.

Field/validation rules per data-model.md "Prediction Request" / "Batch
Prediction Request" and the 400 cases documented in
contracts/noshow-prediction-api.md.
"""

from pydantic import BaseModel, ConfigDict, Field, field_validator

MAX_BATCH_SIZE = 100


class PredictionRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    booking_id: int = Field(alias="bookingId", gt=0)


class BatchPredictionRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    booking_ids: list[int] = Field(
        alias="bookingIds", min_length=1, max_length=MAX_BATCH_SIZE
    )

    @field_validator("booking_ids")
    @classmethod
    def _all_positive(cls, value: list[int]) -> list[int]:
        if any(v <= 0 for v in value):
            raise ValueError("bookingIds must all be positive integers")
        return value
