# spot-ai-services / noshow-prediction

No-show risk prediction microservice for SPOT. FastAPI, Python 3.11.
Called internally by `spot-backend` only — see
`../../specs/005-noshow-prediction/` for spec, plan, research, data model,
and the full API contract.

## Run locally

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt   # or requirements.txt for prod-only
cp .env.example .env                  # fill DB_* (same as spot-backend/.env) + INTERNAL_SERVICE_KEY
python -m models.train                # trains models/noshow_model.joblib from live booking history
uvicorn app.main:app --reload --port 5002
```

## Test

```bash
pytest tests/unit tests/integration
```

## Endpoints

### `GET /health`

No auth. `{ "status": "ok", "modelLoaded": true|false }`.

### `POST /predict`

Requires header `X-Internal-Service-Key: <INTERNAL_SERVICE_KEY>`.

```json
{ "bookingId": 123 }
```

Returns `{ bookingId, applicable, riskScore, riskTier, lowConfidence, reason }`.
`applicable: false` (with a `reason` of `ALREADY_RESOLVED` or
`NOT_YET_COMMITTED`) means the booking's status makes a future outcome
meaningless — not an error. `404` for a booking that doesn't exist. `503`
when no trained model is currently loaded.

### `POST /predict/batch`

Same auth. `{ "bookingIds": [123, 456] }` (1–100 ids) →
`{ "results": [ {...}, {...} ] }`, one entry per id, same order, invalid/
not-found ids flagged individually rather than failing the batch.

Full shapes: `../../specs/005-noshow-prediction/contracts/noshow-prediction-api.md`.

## Training

`models/train.py` is an offline script, not an HTTP endpoint — run it
manually or on a schedule outside the request path:

```bash
python -m models.train
```

It reads resolved bookings (`COMPLETED`/`NO_SHOW`) read-only, fits a
`scikit-learn` `HistGradientBoostingClassifier` with
`class_weight="balanced"` (no-shows are expected to be a small minority),
prints a holdout ROC-AUC when enough data exists, and writes
`models/noshow_model.joblib`. The running service picks up a newly trained
artifact on its next (re)start.

## What this service does NOT do

- No writes to any database — read-only against the same Supabase Postgres
  `spot-backend`/`recommendation` use.
- No automatic action on a prediction — no reminders, penalties, or
  cancellations. Read-only risk reporting only; see
  `../../specs/005-noshow-prediction/spec.md` Assumptions.
- No matchmaking (kèo) support — scoped to venue bookings
  (`schema_booking.bookings`) only.
- Not reachable by any frontend directly — only `spot-backend` should call
  it. The `spot-backend` consuming endpoint and any host/admin-facing UI
  are a separate, later feature.
