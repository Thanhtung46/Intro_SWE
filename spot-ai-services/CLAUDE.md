# CLAUDE.md — spot-ai-services

Scoped guide for this app. The repo-root `CLAUDE.md` (one level up) has
general behavioral guidelines and the cross-project map — read it too.

## Project Overview

Three planned Python/FastAPI microservices for SPOT: `recommendation`
(port 5001), `noshow-prediction` (port 5002), `nlp-assistant` (port 5003).
No nested `.git` here — tracked directly by the repo-root git repo.

**Status: empty directory scaffolds only, for all three services.** Each of
`recommendation/`, `noshow-prediction/`, `nlp-assistant/` has `app/`,
`models/`, `services/` (and `data/` for the first two) — every one of these
is an **empty directory**. There is no Python source code, no
`requirements.txt`, no `Dockerfile`, in any of the three. `README.md` at
this level has real content (Vietnamese, ~1.6KB) describing this same
empty-scaffold status — it is not empty itself.

`docker compose build recommendation` / `noshow` / `nlp` all fail
immediately (`failed to read dockerfile: open Dockerfile: no such file or
directory`) — confirmed by real build runs. This isn't a config problem;
there's genuinely nothing to build yet.

## Common Commands

**Not runnable yet.** No Python code, no `requirements.txt`, no virtualenv
tooling exists. Don't assume `pip install`/`uvicorn`/`pytest` work here.

## Architecture & Project Structure

```
recommendation/       {app,models,services,data}/    # all empty
noshow-prediction/    {app,models,services,data}/    # all empty
nlp-assistant/        {app,models,services}/          # all empty
logs/                                                  # empty
README.md                                              # has content, describes the same empty status
.gitignore
```

Target layout per root `CLAUDE.md`/`PROJECT_RULES.md`: FastAPI apps under
`app/`, ML models under `models/`, business logic under `services/`, training
data under `data/`.

## Code Style & Conventions

Target (once code exists), per root `CLAUDE.md`: PEP8 via `black` (line
length 88) + `isort`. Nothing to enforce yet — no Python files exist.

## Important Guidelines

- **Every subfolder in every service is empty** — check for actual `.py`
  files before assuming any endpoint, model, or service is implemented.
- **No `Dockerfile` in any of the three services** — `docker-compose.yml`'s
  `recommendation`/`noshow`/`nlp` entries point their build `context` here,
  but the build will fail at the very first step until a `Dockerfile` (and
  real app code) is added.
- `spot-backend`'s `.env.example` references
  `RECOMMENDATION_SERVICE_URL`/`NOSHOW_SERVICE_URL`/`NLP_SERVICE_URL`
  pointing at these services — those integrations don't exist yet either.
- This directory is tracked by the root repo (no nested `.git`), same as
  `spot-backend`.
