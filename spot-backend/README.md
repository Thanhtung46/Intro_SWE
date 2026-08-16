# SPOT Backend

Node.js / Express REST API for **SPOT** (Sport Pitch Online Ticketing) —
HCMUS Software Engineering, Group 09.

Domain-driven layout under
`src/domains/<name>/{controller,dto,entity,repository,service}/`.

| | |
| :--- | :--- |
| Runtime | Node **≥ 18**, ESM (`"type": "module"`) |
| Status | Installable & runnable (local or Docker) |
| Database | Supabase Postgres (Session pooler + SSL) via `pg` |
| Cache / OTP guards | Redis 7 (`ioredis`) — attempt counters + resend cooldown |
| Email | Gmail SMTP via `nodemailer` (App Password) |
| Auth crypto | `argon2id` passwords + OTPs; JWT access/refresh (`jsonwebtoken`) |
| Validation | Zod DTOs |
| Agent notes | See [`CLAUDE.md`](./CLAUDE.md) |
| **API cho FE / Tester** | See [`docs/API.md`](./docs/API.md) — request/response, lỗi, curl, checklist |
| **Matchmaking plan** | See [`docs/MATCHMAKING_PLAN.md`](./docs/MATCHMAKING_PLAN.md) — kèo / skills / phases (chưa code) |

---

## Work completed

Auth / onboarding foundation in `src/domains/auth/` plus shared infra under
`src/shared/`, SQL migrations, smoke scripts, Docker ↔ Supabase wiring.

### Features

| Feature | What was done | Status |
| :--- | :--- | :--- |
| **Register** `POST /auth/register` | Create user on `schema_auth.users` (incl. `gender`), hash password (argon2id), create hashed OTP (`purpose=REGISTER`), send email OTP | Done |
| **Role selection** `POST /auth/role` | Register Step 2 — choose `PLAYER` / `OWNER` / `REFEREE` once (`role_selected_at`); `PLAYER` → `ACTIVE`, `OWNER`/`REFEREE` → `PENDING` | Done |
| **OTP verify** `POST /auth/otp/verify` | Verify 6-digit code, set `email_verified_at`, mark OTP used | Done |
| **OTP resend** `POST /auth/otp/resend` | New OTP; 60s cooldown; max 5 wrong attempts | Done |
| **Login** `POST /auth/login` | Access + refresh JWT (`sub`, `role`); lockout after 5 failed passwords / 15 min | Done |
| **Refresh** `POST /auth/refresh` | Exchange refresh JWT → new access + refresh | Done |
| **Me** `GET /auth/me` | Protected profile (`authenticate` + Bearer); includes `user.skills` | Done |
| **Public user** `GET /users/:id` | Host profile card (no email/phone); `matchCount` live; `rating`/`reviewCount` stub | Done |
| **Update me** `PATCH /auth/me` | Set/clear badminton + football skills | Done |
| **Forgot password** `POST /auth/forgot-password` | OTP with `purpose=FORGOT_PASSWORD`; anti-enumeration (always same 200 message) | Done |
| **Reset password** `POST /auth/reset-password` | Verify forgot OTP → update `password_hash`, clear lockout | Done |
| **Email delivery** | `nodemailer` + Gmail SMTP; HTML + text; without SMTP in dev, OTP is logged | Done |
| **Rate limiting** | IP + email limiters on OTP / login / forgot / reset (`express-rate-limit`) | Done |
| **Zod validation** | DTOs: register, role, otp, login, refresh, forgot-password, update-me | Done |
| **Migrations** | `001` auth, `002` skills, `003` matchmaking — tracked in `public.schema_migrations` | Done |
| **Docker ↔ Supabase** | Compose `env_file: spot-backend/.env`; `REDIS_HOST=redis`; Session pooler + SSL; optional local Postgres via profile `local-db` | Done |
| **Smoke / unit tests** | DTO unit tests + smoke scripts for register / otp / login / forgot-password | Done |

### Schema decisions

- `full_name` / `gender` live on **`schema_auth.user_profiles`** (login/list JOIN).
- Skill per sport lives on **`schema_auth.user_sport_skills`** (not on `users`).
- OTP rows live in **`schema_auth.otp_verifications`** (not `otp_tokens`), filtered by `purpose`.
- `email_verified_at` and `role_selected_at` on `users` (see `001_schema_auth.sql`).

### Still out of scope

- Refresh-token rotation / Redis JWT blacklist (old refresh valid until TTL)
- Admin approve `OWNER` / `REFEREE` (`PENDING` → `ACTIVE`)
- Non-auth domains (`booking`, `venue`, `payment`, …) — empty scaffolds only

---

## Auth API reference

> Chi tiết đầy đủ (body, response mẫu, bảng lỗi, checklist Postman): **[`docs/API.md`](./docs/API.md)**.

All routes are mounted at **`/auth/*`** and **`/api/auth/*`**.

| Method | Path | Body (summary) | Success |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | `fullName`, `email`, `phoneNumber`, `gender`, `password`, `confirmPassword` | `201` `{ message, userId, email, nextStep: "SELECT_ROLE" }` |
| `POST` | `/auth/role` | `email`, `role` (`PLAYER` \| `OWNER` \| `REFEREE`) | `200` `{ message, nextStep, user }` |
| `POST` | `/auth/otp/verify` | `email`, `otp` (6 digits), `purpose?` (default `REGISTER`) | `200` `{ message, email }` |
| `POST` | `/auth/otp/resend` | `email`, `purpose?` | `200` `{ message, email, resendAvailableInSeconds }` |
| `POST` | `/auth/login` | `email`, `password` | `200` `{ accessToken, refreshToken, tokenType, expiresIn, user }` |
| `POST` | `/auth/refresh` | `refreshToken` | `200` new access + refresh |
| `GET` | `/auth/me` | `Authorization: Bearer <access>` | `200` `{ user }` (kèm `skills`) |
| `GET` | `/users/:id` | Bearer | `200` `{ user }` public host card (no email/phone) |
| `PATCH` | `/auth/me` | `{ skills: { badminton?, football? } }` | `200` `{ message, user }` |
| `POST` | `/auth/forgot-password` | `email` | `200` same message whether or not email exists |
| `POST` | `/auth/reset-password` | `email`, `otp`, `newPassword`, `confirmPassword` | `200` password updated |
| `POST` | `/matches` | Bearer + host body (`PLAYER`) | `201` `{ match }` |
| `GET` | `/matches` | Bearer + query filters (`hostUserId` = kèo của host đó) | `200` `{ total, matches }` |
| `GET` | `/matches/:id` | Bearer | `200` `{ match, canJoin, yourRequest, participants }` |
| `POST` | `/matches/:id/join` | Bearer + `{ message?, guests? }` (`PLAYER`) | `201` `{ request, match }` |
| `GET` | `/matches/:id/requests` | Bearer (host) | `200` `{ requests }` |
| `POST` | `/matches/:id/requests/:requestId/accept` | Bearer (host) | `200` |
| `POST` | `/matches/:id/requests/:requestId/reject` | Bearer (host) | `200` |
| `POST` | `/matches/:id/participants/:userId/kick` | Bearer (host) | `200` |
| `GET` | `/matches/mine` | Bearer `?tab=active\|completed` | `200` `{ matches }` |
| `PATCH` | `/matches/:id` | Bearer (host), before start | `200` `{ match }` |
| `POST` | `/matches/:id/cancel` | Bearer (host) | `200` `{ match }` |

Also: `GET /health`, `GET /api`.

Typical errors: `400` validation / bad OTP, `409` duplicate email/phone,
`401`/`403` login rules, `429` rate limit / OTP attempt lockout / resend cooldown,
`500` unexpected.

With `OTP_DEBUG=true` (non-production only), responses may include `debugOtp`
when an OTP was actually issued.

### Happy path — register → login

```
1. POST /auth/register
2. POST /auth/role          ← UI “Register Step 2 / Who are you?”
3. POST /auth/otp/verify    ← 6-digit code from email (or debugOtp)
4. POST /auth/login         ← JWT for FE role-based navigation
```

| Role (API) | UI label | `status` after select |
| :--- | :--- | :--- |
| `PLAYER` | Player | `ACTIVE` |
| `OWNER` | Venue Owner | `PENDING` (cannot login until approved) |
| `REFEREE` | Referee | `PENDING` |

Role can be selected **once** (`role_selected_at`). Login requires:

- email verified (`email_verified_at`)
- role selected
- status not `LOCKED` / `PENDING`
- no active `lockout_until`

### Example — register

```bash
curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Nguyen Van A",
    "email": "player@example.com",
    "phoneNumber": "0901234567",
    "gender": "male",
    "password": "Secret123!",
    "confirmPassword": "Secret123!"
  }'
```

`gender`: `male` | `female` | `other` | `prefer_not_to_say`.

Password rules (register + reset): min 8 characters, at least one lowercase,
uppercase, digit, **and special character**; confirm must match.

Phone: Vietnamese **10 digits** starting with `02` / `03` / `05` / `07` / `08` / `09`
(e.g. `0901234567`, landline `0241234567`).

### JWT

| Token | Default TTL | Claims |
| :--- | :--- | :--- |
| Access | `JWT_EXPIRY` = `15m` | `sub`, `role`, `email`, `type: "access"` |
| Refresh | `JWT_REFRESH_EXPIRY` = `7d` | `sub`, `role`, `type: "refresh"` |

Passwords and OTP codes are hashed with **argon2id**. Plaintext OTP is only
emailed (and optionally returned as `debugOtp`).

### Forgot / reset password

1. `POST /auth/forgot-password` `{ email }` — anti-enumeration (always 200).
2. `POST /auth/reset-password` `{ email, otp, newPassword, confirmPassword }`.

Do **not** use `/otp/verify` or `/otp/resend` for reset — those are register-oriented
(`email_verified_at` checks). Forgot-password uses `purpose = FORGOT_PASSWORD`.

### Redis keys (OTP guards)

| Key pattern | Purpose |
| :--- | :--- |
| `otp:attempts:{email}:{purpose}` | Wrong-OTP counter (max 5) |
| `otp:resend:{email}:{purpose}` | Resend cooldown (60s) |

Soft-fail if Redis is down (logged; request may still succeed where safe).

---

## Quick start

```bash
cd spot-backend
npm install
cp .env.example .env
# Fill: DB_* (Supabase Session pooler), SMTP_*, JWT_SECRET, Redis

npm run migrate        # apply pending SQL under migrations/
npm run dev            # http://localhost:3000
```

| Check | Command |
| :--- | :--- |
| Health | `GET http://localhost:3000/health` |
| DB connectivity | `node scripts/check-db.js` |
| Unit tests | `npm test` |

### npm scripts

| Script | Command |
| :--- | :--- |
| `npm run dev` | `node --watch src/server.js` |
| `npm start` | `node src/server.js` |
| `npm run migrate` | Apply pending `migrations/*.sql` |
| `npm run apply:match-search` | Re-apply `004` fold + GIN (when `004` already migrated) |
| `npm run apply:match-admin` | Re-apply `005` province/city (when `005` already migrated) |
| `npm test` | `node --test tests/unit/**/*.test.js` |
| `npm run smoke:otp` | Register → verify OTP |
| `npm run smoke:login` | Register → role → verify → login |
| `npm run smoke:matches` | Two PLAYERs: host / join / approve / kick / mine / cancel |
| `npm run health-check` | Used by Docker `HEALTHCHECK` |

### Environment (see `.env.example`)

| Group | Keys |
| :--- | :--- |
| DB | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL=true`, `DB_POOL_MAX` |
| Redis | `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB` |
| OTP | `OTP_TTL_SECONDS`, `OTP_MAX_ATTEMPTS`, `OTP_RESEND_COOLDOWN_SECONDS`, `OTP_DEBUG` |
| SMTP (Gmail) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` |
| JWT | `JWT_SECRET`, `JWT_EXPIRY`, `JWT_REFRESH_EXPIRY` |
| Login | `LOGIN_MAX_ATTEMPTS`, `LOGIN_LOCKOUT_MINUTES` (optional; defaults 5 / 15) |

Leave `DATABASE_URL` empty when using discrete `DB_*`. Prefer Session pooler
(`aws-0-<region>.pooler.supabase.com`) — direct `db.*` is often IPv6-only.

**Gmail:** use an [App Password](https://myaccount.google.com/apppasswords), not
your normal account password. Without SMTP in development, OTP is logged to the
console instead of emailed.

---

## Schema (`schema_auth`)

| Migration | Purpose |
| :--- | :--- |
| `001_schema_auth.sql` | `schema_auth.users` + `user_profiles` + `otp_verifications` |
| `002_user_sport_skills.sql` | `schema_auth.user_sport_skills` (one skill per sport) |
| `003_schema_matchmaking.sql` | matches, courts, joins, guests, favorites, `fold_search_text` |
| `004_match_search_fold.sql` | Idempotent search function + GIN (if `003` already applied) |
| `005_match_admin_units.sql` | `province` + `city` on matches (pre-2025 map) |

Applied migrations are recorded in `public.schema_migrations`
(`scripts/migrate.js` skips already-applied files).

**`users` (notable columns):** `full_name`, `phone_number`, `gender`,
`password_hash`, `role`, `status`, `login_attempts`, `lockout_until`,
`email_verified_at`, `role_selected_at`.

**`otp_verifications`:** shared for register + forgot-password via `purpose`
(`REGISTER` | `FORGOT_PASSWORD`). There is no separate `otp_tokens` table.

In Supabase Table Editor, set schema dropdown to **`schema_auth`** (not `public`).

---

## Project structure

```
src/
├── server.js / app.js
├── domains/auth/                 # implemented
│   ├── routes.js
│   ├── controller/
│   ├── dto/
│   ├── entity/
│   ├── repository/
│   └── service/
├── domains/{admin,booking,matchmaking,notification,payment,referee,review,venue}/
│   └── {controller,dto,entity,repository,service}/   # empty until that domain is built
├── events/{handlers,topics}/     # empty
└── shared/
    ├── config/env.js
    ├── constants/{auth,sports}.js
    ├── database/{config,pool,redis}.js
    ├── middleware/{errorHandler,otpRateLimit,authenticate}.js
    ├── types/                    # reserved
    └── utils/{logger,otp,password,jwt,mailer}.js
migrations/
├── 001_schema_auth.sql
├── 002_user_sport_skills.sql
├── 003_schema_matchmaking.sql
├── 004_match_search_fold.sql
├── 005_match_admin_units.sql
scripts/                          # migrate, check-db, smoke-*
docs/
├── API.md                        # FE / tester contract
└── MATCHMAKING_PLAN.md
tests/unit/
├── auth/                         # DTO tests
└── shared/                       # sports ladders
```

### Main dependencies

`express`, `pg`, `ioredis`, `argon2`, `jsonwebtoken`, `nodemailer`, `zod`,
`helmet`, `cors`, `express-rate-limit`, `winston`, `dotenv`.
(`@supabase/supabase-js` is listed but auth flows use `pg` + `ioredis` directly.)

---

## Testing

```bash
npm test                              # unit tests (node:test)
node scripts/smoke-register.js        # needs server up
npm run smoke:otp                     # register → verify (OTP_DEBUG=true)
npm run smoke:login                   # register → role → verify → login
npm run smoke:matches                 # host / join / approve / kick / mine / cancel
node scripts/smoke-forgot-password.js # forgot → reset → login
```

---

## Docker

From **repo root** `Intro_SWE/` (not inside this folder):

```bash
docker compose up -d --build redis backend
docker compose run --rm backend npm run migrate
docker compose logs -f backend
docker compose down
```

How it is wired:

- Build context: `./spot-backend` + this `Dockerfile` (multi-stage, `dumb-init`, healthcheck).
- `env_file: ./spot-backend/.env` supplies Supabase `DB_*`, SMTP, JWT, OTP flags.
- Compose overrides `REDIS_HOST=redis` for the Docker network.
- Local Postgres is **optional**:
  `docker compose --profile local-db up -d postgres`.
- Do **not** add `depends_on: postgres` while postgres stays on profile `local-db`
  (Compose error: `depends on undefined service "postgres"`).

Full stack guide: [`DOCKER.md`](../DOCKER.md).

---

## Notes

- Do **not** commit `.env` (Supabase credentials, SMTP App Password, JWT secret).
- Auth uses `pg` + `ioredis` directly; `@supabase/supabase-js` is a dependency
  but is not wired into these flows yet.
- `full_name` / `gender` live on `schema_auth.user_profiles`.
- UI “Venue Owner” → API/DB role `OWNER`.
- FE role-based navigation reads `role` from the login JWT / `user` object;
  protecting later APIs still needs auth middleware.
- Run Compose commands from the **repo root**, not from `spot-backend/`.
