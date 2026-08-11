# CLAUDE.md — spot-backend

Scoped guide for this app. The repo-root `CLAUDE.md` (one level up) has
general behavioral guidelines and the cross-project map — read it too.

## Project Overview

Node.js/Express REST API for SPOT, domain-driven (`controller/dto/entity/
repository/service` per domain). Unlike the three frontends, this directory
has **no nested `.git`** — it's tracked directly by the repo-root git repo.

**Status: installable and runnable** (local or Docker). `package.json` /
`package-lock.json` exist. ESM (`"type": "module"`), Node **≥ 18**.

Implemented so far (auth domain):

| Area | Status |
| :--- | :--- |
| `POST /auth/register` | Done — creates user + hashed OTP; sends OTP via Gmail SMTP (`nodemailer`) |
| `POST /auth/role` | Done — Register Step 2; selectable `PLAYER` / `OWNER` / `REFEREE` (once) |
| `POST /auth/otp/verify` | Done — argon2 verify, sets `email_verified_at`, invalidates OTP |
| `POST /auth/otp/resend` | Done — 60s cooldown, max 5 wrong attempts, IP+email rate limit |
| `POST /auth/login` | Done — access + refresh JWT (`sub`, `role`); lockout 5 fails / 15 min |
| `POST /auth/forgot-password` | Done — email OTP (`purpose = FORGOT_PASSWORD`); anti-enumeration (always same 200 message) |
| `POST /auth/reset-password` | Done — `{ email, otp, newPassword, confirmPassword }` → update `password_hash`, clear lockout |
| Password hashing | `argon2id` via `argon2` (not bcrypt) |
| Validation | Zod DTOs under `domains/auth/dto/` |
| Email | Gmail SMTP (`SMTP_*` / `EMAIL_FROM`); `OTP_DEBUG` returns `debugOtp` in non-prod (only when OTP was issued) |
| DB | Hosted **Supabase Postgres** via Session pooler + SSL (`pg`) |
| Redis | Attempt counters + resend cooldown, keyed by `{email}:{purpose}` (soft-fail if Redis down) |
| Auth middleware (`authenticate` / `requireRole`) | **Not implemented yet** |
| Refresh-token rotate / Redis JWT blacklist | **Not implemented yet** |
| Admin approve OWNER/REFEREE `PENDING` → `ACTIVE` | **Not implemented yet** |
| Other domains | Still empty scaffolds (`booking`, `venue`, `payment`, …) |

All auth routes are also mounted under `/api/auth/*`.

Default database is **Supabase**, not the compose `postgres` service. Use
Session pooler (IPv4) — direct `db.*.supabase.co` is often IPv6-only and
times out on many networks. Region for the current project: `ap-northeast-1`.

## Common Commands

From `spot-backend/`:

```bash
npm install
cp .env.example .env   # then fill Supabase DB_* + SMTP_* + JWT_SECRET
npm run migrate        # apply pending SQL under migrations/
npm run dev            # http://localhost:3000
npm test               # node:test unit tests (DTO schemas)
npm start              # production entry (no --watch)
node scripts/check-db.js
node scripts/smoke-register.js
npm run smoke:otp      # register → verify (needs server + OTP_DEBUG=true)
npm run smoke:login    # register → role → verify → login JWT
node scripts/smoke-forgot-password.js  # register → role → verify → forgot → reset → login
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
- Compose loads `env_file: ./spot-backend/.env` for `DB_*` / `DB_SSL` / SMTP / JWT,
  then overrides `REDIS_HOST=redis` for the Docker network.
- Local Postgres is **optional**: `docker compose --profile local-db up -d postgres`.
  Do not add `depends_on: postgres` to other services while postgres stays on
  that profile — Compose will fail with `depends on undefined service "postgres"`.

## Architecture & Project Structure

```
src/
├── server.js / app.js
├── domains/auth/
│   ├── routes.js
│   ├── controller/auth.controller.js
│   ├── dto/{register,otp,login,role,forgot-password}.dto.js
│   ├── entity/user.entity.js
│   ├── repository/{user,otp}.repository.js
│   └── service/auth.service.js
├── domains/{admin,booking,matchmaking,notification,payment,referee,review,venue}/
│   └── …                         # empty scaffolds
├── events/{handlers,topics}/     # empty
└── shared/
    ├── config/env.js             # loads ../../../.env with override
    ├── constants/auth.js         # roles, statuses, OTP/login limits
    ├── database/{config,pool,redis}.js
    ├── middleware/{errorHandler,otpRateLimit}.js
    └── utils/{logger,otp,password,jwt,mailer}.js
migrations/
├── 001_schema_auth.sql
├── 002_align_schema_auth.sql
├── 003_users_gender_drop_profiles.sql
├── 004_users_email_verified_at.sql
└── 005_users_role_selected_at.sql
scripts/
├── migrate.js / check-db.js
├── smoke-register.js / smoke-otp-flow.js / smoke-login.js / smoke-forgot-password.js
tests/unit/{register,otp,login,role,forgot-password}.dto.test.js
Dockerfile / .dockerignore / .env.example
```

Match domain layering when adding code. Mount auth routes at `/auth` and
`/api/auth` (see `app.js`).

### Auth flow (happy path)

1. `POST /auth/register` → `{ nextStep: "SELECT_ROLE", userId, email }` (+ OTP email)
2. `POST /auth/role` `{ email, role }` → `PLAYER` stays `ACTIVE`; `OWNER`/`REFEREE` → `PENDING`
3. `POST /auth/otp/verify` `{ email, otp }` → sets `email_verified_at`
4. `POST /auth/login` `{ email, password }` → `{ accessToken, refreshToken, user }`

Login requires: verified email, `role_selected_at` set, status not `LOCKED`/`PENDING`,
and no active `lockout_until`. JWT access claims: `sub`, `role`, `email`, `type: "access"`.
Refresh claims: `sub`, `role`, `type: "refresh"`. Default TTLs: access `15m`, refresh `7d`.

### Forgot password flow (SPOT-119 / SPOT-121)

1. `POST /auth/forgot-password` `{ email }` → always
   `{ message: "If an account exists for this email, an OTP has been sent." }`
   (200). If the user exists: create hashed OTP with `purpose = FORGOT_PASSWORD`,
   email it, set resend cooldown. Unknown email → same message, no DB write / no mail.
   `debugOtp` is attached only when an OTP was actually issued (`OTP_DEBUG`).
2. `POST /auth/reset-password` `{ email, otp, newPassword, confirmPassword }` →
   verify OTP, mark used, `UPDATE password_hash`, `resetLoginState` (clear
   `login_attempts` / `lockout_until`), clear Redis OTP keys.

Do **not** reuse `/otp/verify` or `/otp/resend` for this flow — those are
REGISTER-specific (`email_verified_at` checks / mark verified).

Password rules match register (min 8, upper/lower/digit, confirm match).
Invalid/expired OTP or unknown email on reset → 400 generic
(`Invalid or expired OTP`); attempt lockout → 429; resend too soon on forgot → 429.

OTP is stored **hashed** in `schema_auth.otp_verifications`. Plaintext is emailed
(and optionally returned as `debugOtp` when `OTP_DEBUG=true` and not production).

Redis keys (purpose-scoped): `otp:attempts:{email}:{purpose}`,
`otp:resend:{email}:{purpose}` (`FORGOT_PASSWORD` for this flow).

### Schema notes (`schema_auth`)

**`users`:** Relevant columns beyond basics: `gender`, `password_hash`,
`login_attempts`, `lockout_until`, `email_verified_at`, `role_selected_at`.
**No `user_profiles` table.**

**`otp_verifications`:** Shared for register + forgot-password via `purpose`
(`REGISTER` | `FORGOT_PASSWORD`). No separate OTP table / no new migration for
forgot-password — filter `purpose = 'FORGOT_PASSWORD'` in Supabase Table Editor
(schema dropdown must be `schema_auth`, not `public`).

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

OTP: `OTP_TTL_SECONDS` (300), `OTP_MAX_ATTEMPTS` (5),
`OTP_RESEND_COOLDOWN_SECONDS` (60), `OTP_DEBUG` (dev only).

Email (Gmail App Password): `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`,
`SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`. Without SMTP in development, OTP is
logged instead of emailed; production requires SMTP.

JWT: `JWT_SECRET` (must not stay the placeholder), `JWT_EXPIRY`,
`JWT_REFRESH_EXPIRY`. Login also uses `LOGIN_MAX_ATTEMPTS` /
`LOGIN_LOCKOUT_MINUTES` (defaults 5 / 15).

## Code Style & Conventions

Root convention applies (2 spaces, single quotes, trailing commas, camelCase
functions, PascalCase classes). No linter config exists yet — nothing to run.

## Important Guidelines

- **Compose from repo root** — there is no compose file inside `spot-backend/`.
- **Do not commit `.env`** — it is gitignored (Supabase, SMTP App Password, JWT).
- **`@supabase/supabase-js` is in dependencies** but auth uses `pg` + `ioredis`
  directly; don’t assume the JS client is wired up.
- `.env.example` still lists aspirational keys (MoMo, Firebase, S3, Maps) that
  nothing reads yet; SMTP/JWT/OTP keys **are** read.
- This directory is tracked by the root repo (no nested `.git`).
- **Do not reintroduce `schema_auth.user_profiles`** — `gender` lives on
  `schema_auth.users` (see migration `003`).
- UI “Venue Owner” maps to DB/API role `OWNER`.
- FE role-based navigation reads `role` from login JWT / `user`; protecting
  later APIs still needs `authenticate` / `requireRole` middleware.
