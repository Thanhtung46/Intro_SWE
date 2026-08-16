# CLAUDE.md — spot-backend

Scoped guide for this app. Repo-root `CLAUDE.md` has behavioral guidelines and the cross-project map.

## Overview

Node.js/Express REST API (ESM, Node ≥ 18), domain-driven `controller/dto/entity/repository/service`. Tracked by the **root** git repo (no nested `.git`). Installable and runnable.

**Stack:** `pg` → Supabase Session pooler (SSL); `ioredis` (OTP/rate-limit, soft-fail if down); `argon2id`; Zod DTOs; Gmail SMTP (`OTP_DEBUG` returns `debugOtp` in non-prod).

**Mounts:** `/auth`+`/api/auth`, `/users`+`/api/users`, `/notifications`+`/api/notifications`, `/reviews`+`/api/reviews`.

## Status (done vs not)

| Done | Notes |
| :--- | :--- |
| Auth | register → role → OTP → login/refresh; forgot/reset password |
| Profile | `GET/PATCH /users/me`, Main Profile stats, preferences, password change, avatar upload |
| Contact change | OTP email/phone under `/users/me/email|phone/...` |
| Schedule | `GET /users/me/schedule` + dev seed |
| Notifications | inbox + T-24h/T-2h reminders (`worker:reminders`) |
| Reviews | create + owner reply; venue rating cache |

**Not yet:** refresh-token rotate / JWT blacklist; admin `PENDING`→`ACTIVE` for OWNER/REFEREE; booking CRUD / matchmaking / payment.

Default DB is **Supabase** (not compose postgres). Prefer Session pooler IPv4 (`aws-0-<region>.pooler.supabase.com`).

## Commands

```bash
# from spot-backend/
npm install && cp .env.example .env   # fill DB_*, SMTP_*, JWT_SECRET
npm run migrate                      # apply pending migrations/
npm run migrate:reset                # DESTRUCTIVE: drop schemas + re-apply
npm run dev                          # http://localhost:3000
npm test
npm run smoke:otp|login|profile|schedule|notifications|reviews
node scripts/smoke-forgot-password.js
npm run worker:reminders
```

Docker from **repo root** `Intro_SWE/`:

```bash
docker compose up -d --build redis backend


```

Compose uses `env_file: ./spot-backend/.env`, forces `REDIS_HOST=redis`. Optional local Postgres: `docker compose --profile local-db up -d postgres` (do not `depends_on` it while on that profile).

## Layout

```
src/
├── server.js / app.js
├── domains/{auth,users,notification,booking,review}/   # implemented
├── domains/{admin,matchmaking,payment,referee,venue}/  # empty scaffolds
└── shared/{config,constants,database,middleware,utils}/
migrations/          # 001 auth → 002 notification → 003 venue/booking/social → 004 review
scripts/             # migrate, reset-and-migrate, smoke-*, reminder-worker
tests/unit/
```

Match domain layering. Schedule lives in booking domain; route is on users.

## Auth & profile (short)

1. `POST /auth/register` → select role → `POST /auth/otp/verify` → `POST /auth/login`
2. Protected: `Authorization: Bearer <access>` via `authenticate` / `requireRole(...)`
3. Login needs verified email, role selected, not `LOCKED`/`PENDING`, no lockout
4. JWT access: `sub`, `role`, `email`, `type: access` (15m); refresh: `sub`, `role`, `type: refresh` (7d)

**Schema `schema_auth`:** `users` = identity (email/phone/password/role/status); `user_profiles` = display + prefs (`full_name`, `gender`, `avatar_url`, language/appearance/toggles); view `user_prefs`; shared `otp_verifications` by `purpose` (`REGISTER` | `FORGOT_PASSWORD` | `CHANGE_EMAIL` | `CHANGE_PHONE`).

- Register inserts `users` + `user_profiles` in one transaction
- `PATCH /users/me` / preferences → `user_profiles`; email/phone via OTP only (not PATCH)
- Avatar: `POST /users/me/avatar` → `uploads/avatars/` (`PUBLIC_BASE_URL` for LAN)
- Forgot/reset: do **not** reuse `/otp/verify|resend` (REGISTER-specific)
- UI “Venue Owner” → role `OWNER`

Password: min 8, upper/lower/digit/special. Phone: VN 10 digits.

## Env (see `.env.example`)

Required: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL=true`, `DB_POOL_MAX=5`. Leave `DATABASE_URL` empty when using `DB_*` (`env.js` prefers `DB_HOST`).

Also: Redis, `JWT_SECRET` / expiry, `SMTP_*` / `EMAIL_FROM`, OTP limits, `LOGIN_MAX_ATTEMPTS` / `LOGIN_LOCKOUT_MINUTES`.

## Guidelines

- Compose from **repo root**; never commit `.env`
- Auth uses `pg` + `ioredis` — do not assume `@supabase/supabase-js` is wired
- Style: 2 spaces, single quotes, trailing commas; camelCase / PascalCase (no linter yet)
- Full API details: `docs/API.md` / `API.md`
