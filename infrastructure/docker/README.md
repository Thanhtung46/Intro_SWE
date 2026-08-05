# SPOT — Docker Infrastructure

Owned by **Đào Hoàng Phúc** (Database & Infra Lead) — see `PROJECT_RULES.md` §4.

## Status

Scaffold, matching the architecture and version-lock matrix in `PROJECT_RULES.md` §1.
`postgres` and `redis` build and run today. Every app/service already has a
`Dockerfile`, but they were written ahead of the source code — they will
**fail** until it exists:

- `apps/web-client`, `apps/admin-portal`: `pnpm fetch` needs a root
  `pnpm-lock.yaml`, and the build needs a `package.json` with `build`/`start`
  scripts (Next.js 14.2.5).
- `services/api-gateway`, `services/core-api`: same — a root `pnpm-lock.yaml`
  plus a `package.json` with `build`/`start` scripts (Express 4.19.2).
- `services/ai-services`: image builds fine (`requirements.txt` already
  exists), but the container fails at **start** — no `main.py` exposing a
  FastAPI `app` yet.

`apps/mobile-app` (Expo) is intentionally **not** containerized — run it via
the Expo CLI, not Docker.

## Usage

```bash
cp infrastructure/docker/.env.example infrastructure/docker/.env
docker compose -f infrastructure/docker/docker-compose.yml up -d --build
```

Bring up just the database layer while apps are still being built:

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d postgres redis
```

## Layout

- `docker-compose.yml` — orchestrates all containers on the `spot-network` bridge.
- `.env.example` — variables consumed by the compose file (copy to `.env`, never commit `.env`).
- Each app/service Dockerfile lives next to its source (`apps/<name>/Dockerfile`,
  `services/<name>/Dockerfile`), built with the monorepo root as context so
  `packages/*` workspace dependencies resolve correctly.
