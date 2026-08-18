# CLAUDE.md — spot-ai-services

Scoped guide for this app. The repo-root `CLAUDE.md` (one level up) has
general behavioral guidelines and the cross-project map — read it too.

## Project Overview

Three planned Python/FastAPI microservices for SPOT: `recommendation`
(port 5001), `noshow-prediction` (port 5002), `nlp-assistant` (port 5003).
No nested `.git` here — tracked directly by the repo-root git repo.

**Status: `recommendation/` is implemented; `noshow-prediction/` and
`nlp-assistant/` are still empty directory scaffolds.** `recommendation/`
now has real FastAPI app code, `requirements.txt`, a `Dockerfile`, and
`tests/` — see `recommendation/README.md` and
`../specs/002-venue-recommendations/` (spec/plan/research/data-model/
contracts) for the full design. `noshow-prediction/` and `nlp-assistant/`
still have empty `app/`, `models/`, `services/` (and `data/` for
`noshow-prediction/`) — no Python source, no `requirements.txt`, no
`Dockerfile`, in either. `README.md` at this level still describes the
original all-empty status (Vietnamese, ~1.6KB) and is now stale for
`recommendation/` — don't treat it as current for that service.

`docker compose build noshow` / `nlp` still fail immediately (`failed to
read dockerfile: open Dockerfile: no such file or directory`) — nothing to
build yet for those two. `docker compose build recommendation` now has a
`Dockerfile` to build from (not verified end-to-end against a live Supabase
instance in this environment — see Known Limitations below).

## Common Commands

**`recommendation/` is runnable**; `noshow-prediction/`/`nlp-assistant/`
are not (no Python code, no `requirements.txt` in either).

```bash
cd recommendation
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env   # DB_* (same Supabase creds as spot-backend/.env) + INTERNAL_SERVICE_KEY
uvicorn app.main:app --reload --port 5001
pytest tests/unit tests/integration
```

## Architecture & Project Structure

```
recommendation/       app/{routers,schemas}, services/, models/, data/, tests/{unit,integration}
                       requirements.txt, requirements-dev.txt, pyproject.toml
                       Dockerfile, .env.example, README.md               # implemented
noshow-prediction/    {app,models,services,data}/    # all empty
nlp-assistant/         {app,models,services}/          # all empty
logs/                                                  # empty
README.md                                              # stale for recommendation/, still accurate for the other two
.gitignore
```

`recommendation/models/` and `recommendation/data/` are intentionally still
empty/reserved — v1 uses a deterministic weighted score, not a trained
model (see research.md decision 2 under `specs/002-venue-recommendations/`).

Target layout per root `CLAUDE.md`/`PROJECT_RULES.md`: FastAPI apps under
`app/`, ML models under `models/`, business logic under `services/`, training
data under `data/`.

## Code Style & Conventions

Per root `CLAUDE.md`: PEP8 via `black` (line length 88) + `isort`.
`recommendation/pyproject.toml` configures both; formatted at delivery time.
Nothing to enforce yet in `noshow-prediction/`/`nlp-assistant/` — no Python
files exist there.

## Known Limitations (`recommendation/`)

- Built and unit/integration-tested (`pytest`, 15 tests) with DB-layer
  functions monkeypatched — **not** exercised end-to-end against a live
  Supabase instance or via a running `uvicorn`+`curl` session in this
  environment (no network egress / no DB credentials available here). Follow
  `specs/002-venue-recommendations/quickstart.md` with real credentials to
  close that gap.
- Called only by `spot-backend` over an internal `X-Internal-Service-Key`
  header (see contracts/recommendations-api.md) — `spot-backend` does not
  yet call it; that integration + the homepage fallback-on-failure behavior
  (FR-010) is a separate, not-yet-done `spot-backend`-side change.
- No "favorited venues" personalization signal — no such table exists yet
  (research.md decision 4).

## Important Guidelines

- **`noshow-prediction/` and `nlp-assistant/` are still fully empty** —
  check for actual `.py` files before assuming any endpoint, model, or
  service is implemented in either.
- **No `Dockerfile` in `noshow-prediction/`/`nlp-assistant/`** —
  `docker-compose.yml`'s `noshow`/`nlp` entries point their build `context`
  here, but the build will fail at the very first step until a `Dockerfile`
  (and real app code) is added. `recommendation/` now has one.
- `spot-backend`'s `.env.example` references
  `RECOMMENDATION_SERVICE_URL`/`NOSHOW_SERVICE_URL`/`NLP_SERVICE_URL`
  pointing at these services — `spot-backend` doesn't actually call any of
  them yet (including `recommendation`, despite it now being implemented).
- This directory is tracked by the root repo (no nested `.git`), same as
  `spot-backend`.
