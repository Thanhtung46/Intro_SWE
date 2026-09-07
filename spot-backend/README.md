# SPOT Backend

Node.js / Express REST API for **SPOT** (Sport Pitch Online Ticketing) — HCMUS Software Engineering, Group 09.

Domain-driven layout under `src/domains/<name>/{controller,dto,entity,repository,service}/`.

| | |
| :--- | :--- |
| Runtime | Node **≥ 18**, ESM (`"type": "module"`) |
| Status | Runnable (local or Docker) — auth, matchmaking, groups, tournaments, venue/booking, referee, admin/owner console all implemented |
| Database | Supabase Postgres (Session pooler + SSL) via `pg` |
| File uploads | Supabase Storage (avatar / verification docs / facility images) via `@supabase/supabase-js` |
| Cache / OTP guards | Redis 7 (`ioredis`) — attempt counters + resend cooldown |
| Email | Gmail SMTP via `nodemailer` (App Password) |
| Auth crypto | `argon2id` passwords + OTPs; JWT access/refresh (`jsonwebtoken`) |
| Validation | Zod DTOs |
| Agent notes | [`CLAUDE.md`](./CLAUDE.md) (+ [`docs/agent/`](./docs/agent/) for per-domain detail) |
| **API reference (FE / Tester)** | [`docs/API.md`](./docs/API.md) — index into [`docs/api/`](./docs/api/) (request/response, errors, curl, per domain) |
| Product plans | [`docs/MATCHMAKING_PLAN.md`](./docs/MATCHMAKING_PLAN.md), [`docs/GROUP_PLAN.md`](./docs/GROUP_PLAN.md), [`docs/TOURNAMENT_PLAN.md`](./docs/TOURNAMENT_PLAN.md), [`docs/REFEREE_PLAN.md`](./docs/REFEREE_PLAN.md) |

This file only covers running the service locally. For what's implemented, schema decisions, and endpoint contracts, see the links above — they're kept up to date and are not duplicated here.

## Quick start

```bash
cd spot-backend
npm install
cp .env.example .env
# Fill in: DB_* (Supabase Session pooler), SMTP_*, JWT_SECRET, SUPABASE_* (Storage), Redis

npm run migrate        # apply pending SQL under migrations/
npm run dev             # http://localhost:3000
```

| Check | Command |
| :--- | :--- |
| Health | `GET http://localhost:3000/health` |
| DB connectivity | `node scripts/check-db.js` |
| Unit tests | `npm test` |

## npm scripts

| Script | Purpose |
| :--- | :--- |
| `npm run dev` | `node --watch src/server.js` |
| `npm start` | `node src/server.js` |
| `npm run migrate` | Apply pending `migrations/*.sql` |
| `npm run migrate:reset` | **Destructive** — drop app schemas + re-apply squashed chain |
| `npm test` | `node --test tests/unit/**/*.test.js` |
| `npm run smoke:login` / `:profile` / `:matches` / `:groups` / `:tournaments` / `:referee` | End-to-end smoke flows per domain (need server up, usually `OTP_DEBUG=true`) |
| `npm run worker:reminders` | Rating prompt + booking reminder jobs (prod-like) |
| `npm run worker:match-expiry` | Process ended kèo (full → `COMPLETED`; underfilled → `CANCELLED` + notify) |
| `npm run health-check` | Used by Docker `HEALTHCHECK` |

Full script list and per-domain smoke scripts: [`CLAUDE.md`](./CLAUDE.md) → [`docs/agent/00-setup-layout-env.md`](./docs/agent/00-setup-layout-env.md).

### Environment (see `.env.example`)

| Group | Keys |
| :--- | :--- |
| DB | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL=true`, `DB_POOL_MAX` |
| Supabase Storage | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` |
| Redis | `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB` |
| OTP | `OTP_TTL_SECONDS`, `OTP_MAX_ATTEMPTS`, `OTP_RESEND_COOLDOWN_SECONDS`, `OTP_DEBUG` |
| SMTP (Gmail) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` |
| JWT | `JWT_SECRET`, `JWT_EXPIRY`, `JWT_REFRESH_EXPIRY` |
| Login | `LOGIN_MAX_ATTEMPTS`, `LOGIN_LOCKOUT_MINUTES` (optional; defaults 5 / 15) |

Leave `DATABASE_URL` empty when using discrete `DB_*`. Prefer Session pooler (`aws-0-<region>.pooler.supabase.com`) — direct `db.*` is often IPv6-only.

**Gmail:** use an [App Password](https://myaccount.google.com/apppasswords), not your normal account password. Without SMTP in development, OTP is logged to the console instead of emailed.

## Schema

Migrations `001`–`028` (see [`migrations/README.md`](./migrations/README.md) for the full list); applied migrations are recorded in `public.schema_migrations` (`scripts/migrate.js` skips already-applied files). In Supabase Table Editor, switch the schema dropdown away from `public` to see app tables (`schema_auth`, `schema_matchmaking`, `schema_groups`, `schema_tournaments`, `schema_venue`, `schema_booking`, `schema_notification`, `schema_review`, `schema_admin`, `schema_referee`).

Schema decisions and domain-by-domain notes: [`CLAUDE.md`](./CLAUDE.md).

## Project structure

```
src/
├── server.js / app.js
├── domains/{auth,users,matchmaking,groups,tournaments,venue,booking,notification,review,referee,admin,owner,assistant,recommendation}/
│   └── {routes.js, controller/, dto/, entity/, repository/, service/}
├── events/{handlers,topics}/     # empty
└── shared/
    ├── config/env.js
    ├── constants/
    ├── database/{config,pool,redis}.js
    ├── middleware/{errorHandler,otpRateLimit,authenticate,avatarUpload,facilityImageUpload,verificationUpload}.js
    └── utils/{logger,otp,password,jwt,mailer,supabaseStorage}.js
migrations/          # 001–028, see migrations/README.md
scripts/              # migrate, check-db, smoke-*, workers
docs/
├── API.md            # index → docs/api/*.md (FE / tester contract)
├── agent/             # per-domain agent notes → CLAUDE.md index
└── *_PLAN.md          # product locks per domain
tests/unit/
Dockerfile / .dockerignore / .env.example
```

### Main dependencies

`express`, `pg`, `ioredis`, `argon2`, `jsonwebtoken`, `nodemailer`, `zod`, `@supabase/supabase-js` (Storage), `helmet`, `cors`, `express-rate-limit`, `winston`, `dotenv`.

## Testing

```bash
npm test                              # unit tests (node:test)
npm run smoke:login                   # register → role → verify → login
npm run smoke:profile                 # GET/PATCH me + email/phone OTP change
npm run smoke:matches                 # host / join / approve / kick / mine / cancel
npm run smoke:groups                  # create / join / members / schedule / gallery
npm run smoke:tournaments
npm run smoke:referee                 # needs OTP_DEBUG=true + seed:admin + migrations 015–022
```

## Docker

From **repo root** `Intro_SWE/` (not inside this folder):

```bash
docker compose up -d --build redis backend
docker compose run --rm backend npm run migrate
docker compose logs -f backend
docker compose down
```

- Build context: `./spot-backend` + this `Dockerfile` (multi-stage, `dumb-init`, healthcheck).
- `env_file: ./spot-backend/.env` supplies Supabase `DB_*`, Storage, SMTP, JWT, OTP flags.
- Compose overrides `REDIS_HOST=redis` for the Docker network.
- Local Postgres is **optional**: `docker compose --profile local-db up -d postgres`.

Full stack guide: [`DOCKER.md`](../DOCKER.md).

## Notes

- Do **not** commit `.env` (Supabase credentials, SMTP App Password, JWT secret).
- Run Compose commands from the **repo root**, not from `spot-backend/`.
- `full_name` / `gender` live on `schema_auth.user_profiles`, not `users`.
- UI "Venue Owner" → API/DB role `OWNER`.
