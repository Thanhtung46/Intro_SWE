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
| **API cho FE / Tester** | See [`API.md`](./API.md) — request/response, lỗi, curl, checklist |

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
| **Me** `GET /auth/me` | Protected; alias of `GET /users/me` | Done |
| **Profile** `GET/PATCH /users/me` | View/update profile + prefs (`fullName`, `gender`, `avatarUrl`, `language`, `appearance`, push/location) | Done |
| **Main Profile** `GET /users/me/profile` | `{ user, stats }` — hosted/joined matches, completed bookings, joinedAt | Done |
| **Change password** `POST /users/me/password` | Logged-in change (`currentPassword` + new) | Done |
| **Avatar upload** `POST /users/me/avatar` | Multipart local file → `/uploads/avatars` + `avatar_url` | Done |
| **Settings prefs** `GET/PATCH /users/me/preferences` | language, appearance, push/location (sync via DB) | Done |
| **Change email/phone** | OTP-gated (`CHANGE_EMAIL` / `CHANGE_PHONE`); request + confirm under `/users/me/...` | Done |
| **Forgot password** `POST /auth/forgot-password` | OTP with `purpose=FORGOT_PASSWORD`; anti-enumeration (always same 200 message) | Done |
| **Reset password** `POST /auth/reset-password` | Verify forgot OTP → update `password_hash`, clear lockout | Done |
| **Email delivery** | `nodemailer` + Gmail SMTP; HTML + text; without SMTP in dev, OTP is logged | Done |
| **Rate limiting** | IP + email limiters on OTP / login / forgot / reset / profile change | Done |
| **Zod validation** | DTOs: register, role, otp, login, forgot-password, update-profile, change-email/phone | Done |
| **Migrations** | `001` auth, `002` prefs, `003`–`004` notifications | Done |
| **Notifications** | Inbox list/read/unread-count + T-24h/T-2h reminder jobs + email helper | Done |
| **Docker ↔ Supabase** | Compose `env_file: spot-backend/.env`; `REDIS_HOST=redis`; Session pooler + SSL; optional local Postgres via profile `local-db` | Done |
| **Smoke / unit tests** | DTO unit tests + smoke scripts (auth / profile / notifications) | Done |

### Schema decisions

- Display profile + prefs live on **`schema_auth.user_profiles`** (`full_name`,
  `gender`, `avatar_url`, language/appearance/toggles); email/phone stay on `users`.
- Prefs columns (`002_user_prefs.sql`): `avatar_url`, `language`, `appearance`,
  `push_notifications_enabled`, `location_services_enabled`.
- Inbox + reminders: **`schema_notification.notifications`** /
  **`reminder_jobs`** (`003_schema_notification.sql`).
- OTP rows live in **`schema_auth.otp_verifications`**, filtered by `purpose`
  (`REGISTER` \| `FORGOT_PASSWORD` \| `CHANGE_EMAIL` \| `CHANGE_PHONE`).
- `email_verified_at` and `role_selected_at` on `users`.

### Still out of scope

- Refresh-token rotation / Redis JWT blacklist (old refresh valid until TTL)
- Admin approve `OWNER` / `REFEREE` (`PENDING` → `ACTIVE`)
- S3/CDN avatar hosting / FCM device tokens
- Non-auth domains (`booking`, `venue`, `payment`, …) — empty scaffolds only
  (booking will call `notificationService` later)

---

## Auth API reference

> Chi tiết đầy đủ (body, response mẫu, bảng lỗi, checklist Postman): **[`API.md`](./API.md)**.

All auth routes are mounted at **`/auth/*`** and **`/api/auth/*`**.  
Profile routes: **`/users/*`** and **`/api/users/*`**.

| Method | Path | Body (summary) | Success |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | `fullName`, `email`, `phoneNumber`, `gender`, `password`, `confirmPassword` | `201` `{ message, userId, email, nextStep: "SELECT_ROLE" }` |
| `POST` | `/auth/role` | `email`, `role` (`PLAYER` \| `OWNER` \| `REFEREE`) | `200` `{ message, nextStep, user }` |
| `POST` | `/auth/otp/verify` | `email`, `otp` (6 digits), `purpose?` (default `REGISTER`) | `200` `{ message, email }` |
| `POST` | `/auth/otp/resend` | `email`, `purpose?` | `200` `{ message, email, resendAvailableInSeconds }` |
| `POST` | `/auth/login` | `email`, `password` | `200` `{ accessToken, refreshToken, tokenType, expiresIn, user }` |
| `POST` | `/auth/refresh` | `refreshToken` | `200` new access + refresh |
| `GET` | `/auth/me` | `Authorization: Bearer <access>` | `200` `{ user }` |
| `GET` | `/users/me` | Bearer access | `200` `{ user }` (same as `/auth/me`) |
| `GET` | `/users/me/profile` | Bearer access | `200` `{ user, stats }` Main Profile |
| `PATCH` | `/users/me` | `fullName?`, `gender?`, `avatarUrl?`, `language?`, `appearance?`, push/location toggles | `200` `{ message, user }` |
| `POST` | `/users/me/password` | `currentPassword`, `newPassword`, `confirmPassword` | `200` `{ message }` |
| `POST` | `/users/me/avatar` | multipart field `avatar` | `200` `{ message, user }` |
| `GET` | `/users/me/preferences` | Bearer access | `200` `{ preferences }` |
| `PATCH` | `/users/me/preferences` | language?, appearance?, push/location toggles | `200` `{ message, preferences }` |
| `POST` | `/users/me/email/request` | `newEmail` | `200` OTP to new email |
| `POST` | `/users/me/email/confirm` | `newEmail`, `otp` | `200` email updated |
| `POST` | `/users/me/phone/request` | `newPhone` | `200` OTP to current email |
| `POST` | `/users/me/phone/confirm` | `newPhone`, `otp` | `200` phone updated |
| `POST` | `/auth/forgot-password` | `email` | `200` same message whether or not email exists |
| `POST` | `/auth/reset-password` | `email`, `otp`, `newPassword`, `confirmPassword` | `200` password updated |
| `GET` | `/notifications` | Bearer + query `limit`/`beforeId`/`unreadOnly` | `200` `{ items, nextCursor }` |
| `GET` | `/notifications/unread-count` | Bearer | `200` `{ count }` |
| `PATCH` | `/notifications/:id/read` | Bearer | `200` `{ notification }` |
| `POST` | `/notifications/read-all` | Bearer | `200` `{ updated }` |

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
| `npm run migrate:reset` | **Destructive** drop app schemas + re-apply squashed chain |
| `npm test` | `node --test tests/unit/*.test.js` |
| `npm run smoke:otp` | Register → verify OTP |
| `npm run smoke:login` | Register → role → verify → login |
| `npm run smoke:profile` | Login → GET/PATCH me → email/phone OTP change |
| `npm run smoke:notifications` | Inbox seed → list/read → process due reminder |
| `npm run worker:reminders` | Background processor for T-24h / T-2h jobs |
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
| File | Purpose |
| :--- | :--- |
| `001_schema_auth.sql` | `schema_auth.users` + `otp_verifications` (full auth schema) |
| `002_user_prefs.sql` | prefs + `avatar_url` on `users` |
| `003_schema_notification.sql` | `schema_notification.notifications` + `reminder_jobs` |
| `004_notification_timestamptz.sql` | `fire_at` / timestamps → `TIMESTAMPTZ` |

Applied migrations are recorded in `public.schema_migrations`
(`scripts/migrate.js` skips already-applied files).

**`users` (notable columns):** `full_name`, `phone_number`, `gender`,
`avatar_url`, `language`, `appearance`, `push_notifications_enabled`,
`location_services_enabled`, `password_hash`, `role`, `status`,
`login_attempts`, `lockout_until`, `email_verified_at`, `role_selected_at`.

**`otp_verifications`:** shared for register + forgot-password + profile contact
change via `purpose` (`REGISTER` | `FORGOT_PASSWORD` | `CHANGE_EMAIL` |
`CHANGE_PHONE`). There is no separate `otp_tokens` table.

In Supabase Table Editor, set schema dropdown to **`schema_auth`** (not `public`).

---

## Project structure

```
src/
├── server.js / app.js
├── domains/auth/                 # implemented
│   ├── routes.js
│   ├── controller/auth.controller.js
│   ├── dto/{register,otp,login,role,forgot-password,refresh}.dto.js
│   ├── entity/user.entity.js
│   ├── repository/{user,otp}.repository.js
│   └── service/auth.service.js
├── domains/users/                # Profile Hub (core + prefs)
│   ├── routes.js
│   ├── controller/users.controller.js
│   ├── dto/{update-profile,change-email,change-phone}.dto.js
│   └── service/users.service.js
├── domains/notification/         # Inbox + reminders
│   ├── routes.js
│   ├── controller/notification.controller.js
│   ├── dto/{list,mark-read,seed}.dto.js
│   ├── entity/notification.entity.js
│   ├── repository/{notification,reminder}.repository.js
│   └── service/notification.service.js
├── domains/{admin,booking,matchmaking,payment,referee,review,venue}/
│   └── …                         # empty scaffolds
└── shared/
    ├── config/env.js
    ├── constants/{auth,notification}.js
    ├── database/{config,pool,redis}.js
    ├── middleware/{errorHandler,otpRateLimit,authenticate}.js
    └── utils/{logger,otp,password,jwt,mailer}.js
migrations/                       # 001–003
scripts/
├── migrate.js / check-db.js
├── smoke-register.js
├── smoke-otp-flow.js
├── smoke-login.js
├── smoke-forgot-password.js
├── smoke-profile.js
├── smoke-notifications.js
└── reminder-worker.js
tests/unit/                       # auth + profile + notification DTO tests
Dockerfile / .dockerignore / .env.example
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
npm run smoke:profile                 # GET/PATCH me + email/phone OTP change
npm run smoke:notifications           # inbox + reminder tick
npm run worker:reminders              # T-24h/T-2h worker loop
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
- Profile/prefs on `schema_auth.user_profiles` (`001_schema_auth.sql`).
- UI “Venue Owner” → API/DB role `OWNER`.
- FE role-based navigation reads `role` from the login JWT / `user` object;
  protecting later APIs still needs auth middleware.
- Run Compose commands from the **repo root**, not from `spot-backend/`.
