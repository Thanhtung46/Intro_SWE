# CLAUDE.md — spot-ai-services

Scoped guide for this app. The repo-root `CLAUDE.md` (one level up) has
general behavioral guidelines and the cross-project map — read it too.

## Project Overview

Three planned Python/FastAPI microservices for SPOT: `recommendation`
(port 5001), `noshow-prediction` (port 5002), `nlp-assistant` (port 5003).
No nested `.git` here — tracked directly by the repo-root git repo.

**Status: `recommendation/` and `nlp-assistant/` are implemented;
`noshow-prediction/` is still an empty directory scaffold.**
`recommendation/` and `nlp-assistant/` both have real FastAPI app code,
`requirements.txt`, a `Dockerfile`, and `tests/` — see
`recommendation/README.md` / `nlp-assistant/README.md` and
`../specs/002-venue-recommendations/` /
`../specs/003-nlp-assistant/` (spec/plan/research/data-model/contracts)
for the full design. `noshow-prediction/` still has empty `app/`,
`models/`, `services/`, `data/` — no Python source, no
`requirements.txt`, no `Dockerfile`. `README.md` at this level still
describes the original all-empty status (Vietnamese, ~1.6KB) and is now
stale for `recommendation/` and `nlp-assistant/` — don't treat it as
current for either.

`docker compose build noshow` still fails immediately (`failed to read
dockerfile: open Dockerfile: no such file or directory`) — nothing to
build yet there. `docker compose build recommendation` / `nlp` now have a
`Dockerfile` to build from, though neither compose service block is
uncommented yet (`docker-compose.yml`'s `recommendation`/`noshow`/`nlp`
entries are all still commented out — uncommenting is a separate,
not-yet-done step; not verified end-to-end against live Supabase/Gemini/
Redis in this environment — see Known Limitations below).

## Common Commands

**`recommendation/` and `nlp-assistant/` are runnable**; `noshow-prediction/`
is not (no Python code, no `requirements.txt`).

```bash
cd recommendation
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env   # DB_* (same Supabase creds as spot-backend/.env) + INTERNAL_SERVICE_KEY
uvicorn app.main:app --reload --port 5001
pytest tests/unit tests/integration
```

```bash
cd nlp-assistant
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env   # GEMINI_API_KEY, REDIS_URL, BACKEND_URL, INTERNAL_SERVICE_KEY
uvicorn app.main:app --reload --port 5003
pytest tests/unit tests/integration
```

## Architecture & Project Structure

```
recommendation/       app/{routers,schemas}, services/, models/, data/, tests/{unit,integration}
                       requirements.txt, requirements-dev.txt, pyproject.toml
                       Dockerfile, .env.example, README.md               # implemented
nlp-assistant/         app/{routers,schemas}, services/, models/, tests/{unit,integration}
                       requirements.txt, requirements-dev.txt, pyproject.toml
                       Dockerfile, .env.example, README.md               # implemented
noshow-prediction/    {app,models,services,data}/    # all empty
logs/                                                  # empty
README.md                                              # stale for recommendation/ and nlp-assistant/
.gitignore
```

`recommendation/models/` and `recommendation/data/` are intentionally still
empty/reserved — v1 uses a deterministic weighted score, not a trained
model (see research.md decision 2 under `specs/002-venue-recommendations/`).
`nlp-assistant/models/` is likewise intentionally empty/reserved — v1 uses
Gemini calls directly, no locally trained model (see research.md decision 3
under `specs/003-nlp-assistant/`).

Target layout per root `CLAUDE.md`/`PROJECT_RULES.md`: FastAPI apps under
`app/`, ML models under `models/`, business logic under `services/`, training
data under `data/`.

## Code Style & Conventions

Per root `CLAUDE.md`: PEP8 via `black` (line length 88) + `isort`.
`recommendation/pyproject.toml` and `nlp-assistant/pyproject.toml` both
configure both; formatted at delivery time. Nothing to enforce yet in
`noshow-prediction/` — no Python files exist there.

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

## Known Limitations (`nlp-assistant/`)

- Built and unit/integration-tested (`pytest`, 23 tests) with Gemini,
  Redis, and the `spot-backend` matchmaking client all mocked/faked —
  **not** exercised end-to-end against a live Gemini API key, a running
  Redis, or a live `spot-backend` in this environment (no network egress /
  no API key available here). Follow
  `specs/003-nlp-assistant/quickstart.md` with real credentials to close
  that gap.
- `spot-backend` now has a matching `assistant` domain
  (`spot-backend/src/domains/assistant/`) mounted at `/assistant` +
  `/api/assistant` that proxies to this service, forwarding both
  `X-Internal-Service-Key` and the calling player's own access token as
  `X-Player-Access-Token` (research.md decision 2) — this is a different,
  additional auth header beyond what `recommendation/` needs, since this
  service acts on a specific player's behalf (search + join/host), not
  just reads on the backend's behalf.
- No client-side (mobile/web) chat/voice UI yet — this feature's contracts
  stop at the HTTP API `spot-backend` exposes; building the actual chat
  screen is a separate, not-yet-done frontend effort (plan.md Project
  Type).
- Formal, paid venue-booking (as opposed to kèo join/host) is out of scope
  until that platform capability exists (spec.md Assumptions).

## Important Guidelines

- **`noshow-prediction/` is still fully empty** — check for actual `.py`
  files before assuming any endpoint, model, or service is implemented
  there. `recommendation/` and `nlp-assistant/` both have real code now.
- **No `Dockerfile` in `noshow-prediction/`** — `docker-compose.yml`'s
  `noshow` entry points its build `context` here, but the build will fail
  at the very first step until a `Dockerfile` (and real app code) is
  added. `recommendation/` and `nlp-assistant/` now both have one, though
  neither compose service block is uncommented yet.
- `spot-backend`'s `.env.example` references
  `RECOMMENDATION_SERVICE_URL`/`NOSHOW_SERVICE_URL`/`NLP_SERVICE_URL`
  pointing at these services — `spot-backend` calls `nlp-assistant` (via
  its new `assistant` domain) but still does not call `recommendation` or
  `noshow` yet.
- This directory is tracked by the root repo (no nested `.git`), same as
  `spot-backend`.
