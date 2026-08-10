# CLAUDE.md — spot-backend

Scoped guide for this app. The repo-root `CLAUDE.md` (one level up) has
general behavioral guidelines and the cross-project map — read it too.

## Project Overview

Node.js/Express REST API for SPOT, domain-driven (`controller/dto/entity/
repository/service` per domain). Unlike the three frontends, this directory
has **no nested `.git`** — it's tracked directly by the repo-root git repo.

**Status: installable and runnable** (local or Docker). `package.json` /
`package-lock.json` exist. ESM (`"type": "module"`), Node **≥ 18**.

Implemented so far:

| Area | Status |
| :--- | :--- |
| `POST /auth/register` (+ `/api/auth/register`) | Done — creates `schema_auth.users` + `otp_verifications`, queues OTP in Redis (TTL 5 min) |
| Auth schema | `schema_auth.users` (includes `gender`), `schema_auth.otp_verifications`. **No `user_profiles`** |
| Password hashing | `argon2id` via `argon2` |
| Validation | Zod (`register.dto.js`) — `fullName`, `email`, `phoneNumber` (required), `gender`, `password`, `confirmPassword` |
| DB | Hosted **Supabase Postgres** via Session pooler + SSL (`pg`) |
| Redis | Local (Docker service `redis`) or `localhost` for bare-metal dev |
| Other domains | Still empty scaffolds (`booking`, `venue`, `payment`, …) |
| OTP verify / email worker / JWT login | Not implemented yet |

Default database is **Supabase**, not the compose `postgres` service. Use
Session pooler (IPv4) — direct `db.*.supabase.co` is often IPv6-only and
times out on many networks. Region for the current project: `ap-northeast-1`.

## Common Commands

From `spot-backend/`:

```bash
npm install
cp .env.example .env   # then fill Supabase DB_* (see below)
npm run migrate        # apply pending SQL under migrations/ (tracked in public.schema_migrations)
npm run dev            # http://localhost:3000
npm test               # node:test unit tests
npm start              # production entry (no --watch)
node scripts/check-db.js      # masked config + live SELECT connectivity check
node scripts/smoke-register.js  # POST /auth/register smoke (needs server up)
```

Docker (run from **repo root** `Intro_SWE/`, not this folder):

```bash
docker compose up -d --build redis backend
docker compose run --rm backend npm run migrate
docker compose logs -f backend
docker compose down
```

- Backend image builds from this directory’s `Dockerfile` (multi-stage,
  `dumb-init` on `PATH` as `dumb-init`, healthcheck via `npm run health-check`).
- Compose loads `env_file: ./spot-backend/.env` for `DB_*` / `DB_SSL`, then
  overrides `REDIS_HOST=redis` for the Docker network.
- Local Postgres is **optional**: `docker compose --profile local-db up -d postgres`.
  Do not add `depends_on: postgres` to other services while postgres stays on
  that profile — Compose will fail with `depends on undefined service "postgres"`.

## Architecture & Project Structure

```
src/
├── server.js / app.js
├── domains/auth/                 # register flow implemented
│   ├── routes.js                 # POST /register
│   ├── controller/ dto/ entity/ repository/ service/
├── domains/{admin,booking,matchmaking,notification,payment,referee,review,venue}/
│   └── …                         # empty scaffolds
├── events/{handlers,topics}/     # empty
└── shared/
    ├── config/env.js             # loads ../../../.env with override; prefers DB_HOST over shell DATABASE_URL
    ├── constants/auth.js         # roles, statuses, genders, OTP TTL / Redis prefix
    ├── database/{config,pool,redis}.js
    ├── middleware/errorHandler.js
    └── utils/{logger,otp,password}.js
migrations/
├── 001_schema_auth.sql                      # users (w/ gender) + otp_verifications
├── 002_align_schema_auth.sql                # historical realign (already applied on shared DB)
└── 003_users_gender_drop_profiles.sql       # moved gender onto users; dropped user_profiles
scripts/
├── migrate.js          # applies pending *.sql; records in public.schema_migrations
├── check-db.js         # connectivity diagnostic
└── smoke-register.js   # register smoke client
tests/unit/register.dto.test.js
Dockerfile / .dockerignore / .env.example
```

Match domain layering when adding code. Mount auth routes at `/auth` and
`/api/auth` (see `app.js`).

### Register contract (quick)

**Body:** `{ fullName, email, phoneNumber, gender, password, confirmPassword }`  
**Success 201:** `{ message, userId, email }` (never returns OTP or password hash)  
**Errors:** 400 validation; 409 duplicate email/phone; 500 unexpected  
OTP plaintext is queued only in Redis key `otp:email:{userId}` (`EX` = `OTP_TTL_SECONDS`, default 300); DB stores hashed OTP in `otp_verifications`.

## Env / Supabase

Required for DB (see `.env.example`):

- `DB_HOST` — prefer `aws-0-<region>.pooler.supabase.com`
- `DB_PORT` — `5432` (Session pooler)
- `DB_NAME` — `postgres`
- `DB_USER` — `postgres.<project-ref>`
- `DB_PASSWORD` — database password
- `DB_SSL=true`
- `DB_POOL_MAX=5` (keep small on free tier)

Leave `DATABASE_URL` empty when using discrete `DB_*` so a leftover shell
`DATABASE_URL` pointing at localhost does not win. `env.js` prefers `DB_HOST`
when set.

Redis: `REDIS_HOST` / `REDIS_PORT` / `REDIS_DB`. Inside Compose, Redis is
forced to hostname `redis`.

OTP: `OTP_TTL_SECONDS` (default `300`).

## Code Style & Conventions

Root convention applies (2 spaces, single quotes, trailing commas, camelCase
functions, PascalCase classes). No linter config exists yet — nothing to run.

## Important Guidelines

- **Compose from repo root** — there is no compose file inside `spot-backend/`.
- **Do not commit `.env`** — it is gitignored and holds Supabase credentials.
- **`@supabase/supabase-js` is in dependencies** but register/OTP currently use
  `pg` + `ioredis` directly; don’t assume the JS client is wired up.
- **`README.md` has corrupted scaffold-script content** in the middle — ignore
  that section; trust this file and the real `Dockerfile` here.
- `.env.example` still lists aspirational keys (MoMo, SendGrid, Firebase, S3,
  Maps) that nothing reads yet.
- This directory is tracked by the root repo (no nested `.git`).
- **Do not reintroduce `schema_auth.user_profiles`** — `gender` lives on
  `schema_auth.users` (see migration `003`).
