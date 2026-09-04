"""POST /predict and POST /predict/batch — see
contracts/noshow-prediction-api.md."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.request import BatchPredictionRequest, PredictionRequest
from app.schemas.response import (
    BatchPredictionResult,
    NotApplicableReason,
    PredictionResult,
)
from app.security import require_internal_service_key
from services.predictor import predict_batch, predict_single

router = APIRouter(dependencies=[Depends(require_internal_service_key)])


@router.post("/predict", response_model=PredictionResult)
def predict(request: PredictionRequest) -> PredictionResult:
    result = predict_single(request.booking_id)
    if not result.applicable and result.reason == NotApplicableReason.NOT_FOUND:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="booking not found"
        )
    return result


@router.post("/predict/batch", response_model=BatchPredictionResult)
def predict_batch_endpoint(
    request: BatchPredictionRequest,
) -> BatchPredictionResult:
    results = predict_batch(request.booking_ids)
    return BatchPredictionResult(results=results)
