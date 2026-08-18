# spot-ai-services / recommendation

Venue & time-slot recommendation microservice for SPOT. FastAPI, Python
3.11. Called internally by `spot-backend` only — see
`../../specs/002-venue-recommendations/` for spec, plan, research, data
model, and the full API contract.

## Run locally

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt   # or requirements.txt for prod-only
cp .env.example .env                  # fill DB_* (same as spot-backend/.env) + INTERNAL_SERVICE_KEY
uvicorn app.main:app --reload --port 5001
```

## Test

```bash
pytest tests/unit tests/integration
```

## Endpoints

### `GET /health`

No auth. `{ "status": "ok" }`.

### `GET /recommendations`

Requires header `X-Internal-Service-Key: <INTERNAL_SERVICE_KEY>`.

| Query param | Required | Notes |
| :--- | :--- | :--- |
| `userId` | yes | positive integer, the caller's own id |
| `sport` | yes | `FOOTBALL` \| `BADMINTON` |
| `limit` | no | 1–50, default 10 |
| `latitude` / `longitude` | no | both or neither |
| `radiusKm` | no | 1–20, only meaningful with lat/lng |

Returns a ranked `items[]` of venues (with `suggestedSlots[]`), a
`generatedAt` timestamp, and a `fallback` flag (true when personalization
had no usable history and the ranking is popularity/proximity-only). Full
shapes: `../../specs/002-venue-recommendations/contracts/recommendations-api.md`.

## What this service does NOT do

- No writes to any database — read-only against the same Supabase Postgres
  `spot-backend` uses.
- No caching/pre-computation — every request is scored fresh (so it always
  reflects the user's latest activity).
- No "favorited venues" signal — no such table exists yet; see
  `../../specs/002-venue-recommendations/research.md` decision 4.
- Not reachable by any frontend directly — only `spot-backend` should call it.
