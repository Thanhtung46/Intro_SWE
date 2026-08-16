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

**Auth**

| Area | Status |
| :--- | :--- |
| `POST /auth/register` | Done — creates user + hashed OTP; sends OTP via Gmail SMTP (`nodemailer`) |
| `POST /auth/role` | Done — Register Step 2; selectable `PLAYER` / `OWNER` / `REFEREE` (once) |
| `POST /auth/otp/verify` | Done — argon2 verify, sets `email_verified_at`, invalidates OTP |
| `POST /auth/otp/resend` | Done — 60s cooldown, max 5 wrong attempts, IP+email rate limit |
| `POST /auth/login` | Done — access + refresh JWT (`sub`, `role`); lockout 5 fails / 15 min |
| `POST /auth/refresh` | Done — exchange refresh JWT for new access + refresh |
| `GET /auth/me` | Done — protected; `user.skills` + `avatarUrl` |
| `GET /users/:id` | Done — public host profile (no email/phone); `matchCount` live; `rating`/`reviewCount` stub |
| `PATCH /auth/me` | Done — skills and/or `avatarUrl` (URL only, no S3) |
| `POST /auth/forgot-password` | Done — email OTP (`purpose = FORGOT_PASSWORD`); anti-enumeration (always same 200 message) |
| `POST /auth/reset-password` | Done — `{ email, otp, newPassword, confirmPassword }` → update `password_hash`, clear lockout |

**Matchmaking (kèo) — Phases 1–5 done** (Figma Matches + Join + host profile)

| Area | Status |
| :--- | :--- |
| `POST /matches` | Done — PLAYER **free listing** (no `booking_id`); required `province`+`city` (pre-2025); optional `coverUrl` |
| `GET /matches` | Done — see **List filters** below; card: `coverUrl`, `host`, `isFavorited`, `participantAvatars`, `province`/`city` + names |
| `GET /geo/vn` | Done — static 63 tỉnh + 705 quận/huyện (pre-2025). **No** 3rd-party geo API |
| `GET /matches/mine` | Done — host’s kèo; `?tab=active\|completed` (**route before** `GET /:id`) |
| `GET /matches/:id` | Done — squad, `spotsLeft`, `yourShare`, `canJoin`, `yourRequest`, `participants` |
| `POST` / `DELETE /matches/:id/favorite` | Done — heart; `isFavorited` on list/detail |
| `GET /users/:id` | Done — Check Profile / host card (no email/phone) |
| Host `rating` (Figma `4.9`) | **Deferred** — `host.rating` / profile `rating` always `null`; `reviewCount: 0`. `matchCount` is live. |
| `POST /matches/:id/join` | Done — guests (`name`, `skill`, `gender`, `phoneNumber`), skill **warning** (still joins), AUTO vs APPROVAL |
| `GET /matches/:id/requests` | Done — host waiting list, **PENDING only** |
| Accept / reject / kick | Done — `UPDATE` same `requestId`; kick cannot rejoin **that** kèo |
| `PATCH /matches/:id` | Done — host edit before `startsAt` |
| `POST /matches/:id/cancel` | Done — pending → `REJECTED`; status `CANCELLED` (frees pitch) |

**Infra / conventions**

| Area | Status |
| :--- | :--- |
| Password hashing | `argon2id` via `argon2` (not bcrypt) |
| Validation | Zod DTOs under `domains/auth/dto/` and `domains/matchmaking/dto/` |
| Email | Gmail SMTP (`SMTP_*` / `EMAIL_FROM`); `OTP_DEBUG` returns `debugOtp` in non-prod (only when OTP was issued) |
| DB | Hosted **Supabase Postgres** via Session pooler + SSL (`pg`) |
| Redis | Attempt counters + resend cooldown, keyed by `{email}:{purpose}` (soft-fail if Redis down) |
| Auth middleware (`authenticate` / `requireRole`) | Done — use on protected routes; `requireRole(...roles)` after `authenticate` |
| Refresh-token rotate / Redis JWT blacklist | **Not implemented yet** (refresh re-issues tokens; old refresh still valid until TTL) |
| Admin approve OWNER/REFEREE `PENDING` → `ACTIVE` | **Not implemented yet** |
| Other domains | Still empty scaffolds (`booking`, `venue`, `payment`, …) |

Auth also under `/api/auth/*`. Matches also under `/api/matches/*`. Geo also
under `/geo` and `/api/geo`. Public users also under `/users` and `/api/users`.
Contract: [`docs/API.md`](./docs/API.md). Product locks: [`docs/MATCHMAKING_PLAN.md`](./docs/MATCHMAKING_PLAN.md).

Default database is **Supabase**, not the compose `postgres` service. Use
Session pooler (IPv4) — direct `db.*.supabase.co` is often IPv6-only and
times out on many networks. Region for the current project: `ap-northeast-1`.

## Common Commands

From `spot-backend/`:

```bash
npm install
cp .env.example .env   # then fill Supabase DB_* + SMTP_* + JWT_SECRET
npm run migrate        # apply pending SQL under migrations/
npm run reset:matches  # TRUNCATE schema_matchmaking.matches CASCADE (keeps users)
npm run dev            # http://localhost:3000
npm test               # node:test unit tests (DTO schemas)
npm start              # production entry (no --watch)
node scripts/check-db.js
node scripts/smoke-register.js
npm run smoke:otp      # register → verify (needs server + OTP_DEBUG=true)
npm run smoke:login    # register → role → verify → login JWT
npm run smoke:matches  # 2 PLAYERs → host / join / approve / kick / mine / cancel / GET /users/:id
npm run apply:homepage-card  # live DB: avatar_url, cover_url, match_favorites
npm run apply:match-search   # live DB: re-apply 004 fold + GIN (004 already migrated)
npm run apply:match-admin    # live DB: re-apply 005 province/city (005 already migrated)
node scripts/smoke-forgot-password.js  # register → role → verify → forgot → reset → login
```

Docker (run from **repo root** `Intro_SWE/`, not this folder):

```bash
docker compose up -d --build redis backend
docker compose run --rm backend npm run migrate
docker restart spot-backend
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
│   ├── routes.js                 # /auth/*
│   ├── user.routes.js            # /users/:id public host profile
│   ├── controller/auth.controller.js
│   ├── dto/{register,otp,login,role,forgot-password,refresh,update-me,user-id}.dto.js
│   ├── entity/user.entity.js     # toPublicUser + toPublicHostProfile
│   ├── repository/{user,otp,user-sport-skill}.repository.js
│   └── service/auth.service.js
├── domains/matchmaking/
│   ├── routes.js
│   ├── geo.routes.js             # GET /geo/vn (pre-2025 admin tree)
│   ├── controller/match.controller.js
│   ├── dto/{create-match,list-matches,join-match,list-mine,update-match}.dto.js
│   ├── entity/match.entity.js
│   ├── repository/{match,match-court,join-request,match-favorite}.repository.js
│   └── service/match.service.js
├── domains/{admin,booking,notification,payment,referee,review,venue}/
├── events/{handlers,topics}/     # empty
└── shared/
    ├── config/env.js             # loads spot-backend/.env with override
    ├── constants/auth.js         # roles, statuses, OTP/login limits
    ├── constants/sports.js       # badminton / football skill ladders
    ├── constants/matchmaking.js  # formats, fee/join/status, occupancy helpers
    ├── constants/vn-admin.js     # pre-2025 63 tỉnh + 705 quận/huyện lookups
    ├── constants/vn-admin.json   # static dataset (no Geoapify)
    ├── database/{config,pool,redis}.js
    ├── middleware/{errorHandler,otpRateLimit,authenticate}.js
    ├── validation/httpUrl.js     # coverUrl / avatarUrl
    ├── types/                    # reserved
    └── utils/{logger,otp,password,jwt,mailer,foldSearchText}.js
migrations/
├── 001_schema_auth.sql           # users + user_profiles + otp
├── 002_user_sport_skills.sql     # schema_auth.user_sport_skills
├── 003_schema_matchmaking.sql    # canonical kèo + fold_search_text + GIN + province/city
├── 004_match_search_fold.sql     # live delta if 003 ran without search (idempotent)
├── 005_match_admin_units.sql     # live delta: province + city + matches_admin_pair
scripts/
├── migrate.js / check-db.js / reset-matches.js
├── apply-homepage-card.js / apply-match-search.js / apply-match-admin.js
├── smoke-register.js / smoke-otp-flow.js / smoke-login.js
├── smoke-forgot-password.js / smoke-matches.js
docs/
├── API.md
├── MATCHMAKING_PLAN.md
tests/unit/
├── auth/*.dto.test.js
├── matchmaking/*.dto.test.js
├── matchmaking/{fold-search-text,vn-admin}.test.js
└── shared/{sports,pitch,share}.test.js
Dockerfile / .dockerignore / .env.example
```

Match domain layering when adding code. Mount auth at `/auth` and `/api/auth`,
users at `/users` and `/api/users`, matches at `/matches` and `/api/matches`,
geo at `/geo` and `/api/geo` (see `app.js`). `GET /matches/mine` is registered
**before** `GET /matches/:id`.

`req.user` after `authenticate`: `{ userId, role, email }`. JWT `sub` is a
**string** — coerce with `Number` when comparing to DB ids.

### Auth flow (happy path)

1. `POST /auth/register` → `{ nextStep: "SELECT_ROLE", userId, email }` (+ OTP email)
2. `POST /auth/role` `{ email, role }` → `PLAYER` stays `ACTIVE`; `OWNER`/`REFEREE` → `PENDING`
3. `POST /auth/otp/verify` `{ email, otp }` → sets `email_verified_at`
4. `POST /auth/login` `{ email, password }` → `{ accessToken, refreshToken, user }`
5. Protected APIs: `Authorization: Bearer <accessToken>` via `authenticate`
6. `POST /auth/refresh` `{ refreshToken }` → new access + refresh when access expires
7. `GET /auth/me` — own profile (email/phone/skills)
8. `GET /users/:id` — public host card (no email/phone)

Login requires: verified email, `role_selected_at` set, status not `LOCKED`/`PENDING`,
and no active `lockout_until`. JWT access claims: `sub`, `role`, `email`, `type: "access"`.
Refresh claims: `sub`, `role`, `type: "refresh"`. Default TTLs: access `15m`, refresh `7d`.

Protect a route:

```js
import { authenticate, requireRole } from '../../shared/middleware/authenticate.js';

router.get('/something', authenticate, controller.handler);
router.get('/admin-only', authenticate, requireRole('ADMIN'), controller.handler);
```

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

Password rules match register (min 8, upper/lower/digit/**special char**, confirm match).
Phone: exactly 10 digits.
Invalid/expired OTP or unknown email on reset → 400 generic
(`Invalid or expired OTP`); attempt lockout → 429; resend too soon on forgot → 429.

OTP is stored **hashed** in `schema_auth.otp_verifications`. Plaintext is emailed
(and optionally returned as `debugOtp` when `OTP_DEBUG=true` and not production).

Redis keys (purpose-scoped): `otp:attempts:{email}:{purpose}`,
`otp:resend:{email}:{purpose}` (`FORGOT_PASSWORD` for this flow).

### Schema notes (`schema_auth`)

**`users`:** Auth columns (`password_hash`, `login_attempts`, `lockout_until`,
`email_verified_at`, `role_selected_at`). **Name/gender live on
`schema_auth.user_profiles`** — login and match queries `LEFT JOIN` that table.
Do not drop `user_profiles`.

**`user_sport_skills`:** `(user_id, sport)` PK — at most one skill per sport
(`BADMINTON` | `FOOTBALL`). Exposed on public user as
`skills: { badminton, football }` (`null` if unset). `PATCH /auth/me`
(skills and/or `avatarUrl`). Public host card also returns `skills` on
`GET /users/:id`.

**`otp_verifications`:** Shared for register + forgot-password via `purpose`
(`REGISTER` | `FORGOT_PASSWORD`). No separate OTP table / no new migration for
forgot-password — filter `purpose = 'FORGOT_PASSWORD'` in Supabase Table Editor
(schema dropdown must be `schema_auth`, not `public`).

### Matchmaking (kèo)

Pickup matches only (no Groups / Tournaments). Sports: `BADMINTON`, `FOOTBALL`.
Host is a **free listing** — no `booking_id`, no venue catalog lock.
Contract: [`docs/API.md`](./docs/API.md) §7. Product locks:
[`docs/MATCHMAKING_PLAN.md`](./docs/MATCHMAKING_PLAN.md).

**Figma Matches screens → API**

| Screen | Node | FE uses |
| :--- | :--- | :--- |
| Homepage list | `95:2417` | `GET /matches` (`location=` = unaccent + fuzzy `title` **or** `venueName`, `suggestions[]`, **not** Geoapify/NLP). Map = FE tiles + `latitude`/`longitude`. Paper-plane = **directions**, not share. |
| Filter sheet | `87:1903` | Same `GET /matches` query. Tỉnh/quận = `province`+`city` from `GET /geo/vn` (**pre-2025** map, not Geoapify). Background “Book Field” = Booking — **locked**. |
| Match detail | `100:401` | `GET /matches/:id` + favorite + `POST .../join`. Map = FE Geoapify. |
| Join Match sheet | `100:551` | Detail + `GET /auth/me` + `POST /matches/:id/join`. No enum endpoint for skill/gender. |
| Check Profile (host) | `432:1211` | `GET /users/:id` + `GET /matches?hostUserId=`. Hide Groups / verified / reviews. Phone **not** on this endpoint. |

**API map**

| Method | Path | Notes |
| :--- | :--- | :--- |
| `POST` | `/matches` | PLAYER host; required `province`+`city`; `coverUrl` URL-only |
| `GET` | `/matches` | List `OPEN`/`FULL`, `endsAt > now` |
| `GET` | `/geo/vn` | Pre-2025 63 tỉnh + 705 quận/huyện (static JSON, Bearer) |
| `GET` | `/matches/mine` | Host only; `tab=active\|completed` |
| `GET` | `/matches/:id` | Detail + join context |
| `POST` / `DELETE` | `/matches/:id/favorite` | Heart |
| `POST` | `/matches/:id/join` | PLAYER; `message?`, `phoneNumber?`, `guests?` |
| `GET` | `/matches/:id/requests` | Host; PENDING only |
| `POST` | `/matches/:id/requests/:requestId/accept\|reject` | Host |
| `POST` | `/matches/:id/participants/:userId/kick` | Host |
| `PATCH` | `/matches/:id` | Host; before `startsAt` |
| `POST` | `/matches/:id/cancel` | Host |
| `GET` | `/users/:id` | Public host profile |

**List filters (`GET /matches`)**

`sport`, `date` (`YYYY-MM-DD`, TZ `Asia/Ho_Chi_Minh`), `timeFrom`/`timeTo`
(`HH:mm`; with `date` = window overlap, without = local `startsAt` time;
`timeTo` after `timeFrom`), `skill` (needs `sport`; repeat or comma; OR —
match range contains at least one selected rank; max 10), `priceMin`/`priceMax`
(VND; both = GENDER_RANGE band overlap / SPLIT_EVENLY `ceil(price_min/maxPlayers)`
in range), `location` (unaccent + fuzzy `title` **or** `venueName`; not
`venueAddress`; `suggestions[]`; Postgres only), `province` / `city` (pre-2025
GSO codes, exact; `city` requires `province`; HCM `79`, Quận 7 `778`),
`favorited=true` (caller’s hearts), `hostUserId` (that host’s active kèo),
`latitude`+`longitude`+`radiusKm` (1–20, haversine; all three together;
matches without coords excluded), `limit` (default 20, max 50), `offset`.

**Location XOR Distance:** `location` together with lat/lng/radiusKm → `400`
(`Use location or distance, not both`). `province`/`city` **may** combine with
either. Football filter chips: Beginner→`LEARNING`, Basic Amateur→`REC_BASIC`,
Advanced Amateur→`REC_ADVANCED`, Semi-pro→`SEMI_PRO`, Professional→`PROFESSIONAL`,
Elite→`ELITE`.

**Search / admin units (no 3rd-party API)**

- Homepage search is SQL on `schema_matchmaking.fold_search_text` + `pg_trgm`.
  Unaccent (`san` = `Sân`), fuzzy if query ≥ 3 chars, or all tokens in
  title+venue. Response `suggestions` = up to 5 `{ text, kind: title\|venueName }`
  from **our** kèo, not Geoapify Autocomplete/Geocoding/Reverse.
- Filter tỉnh/quận: host and filter pick the **same codes** from `GET /geo/vn`
  (`vn-admin.json`). Map is **pre-2025** (63 tỉnh/TP + quận/huyện). Do **not**
  switch to the 2025 34-tỉnh / xã-phường list.
- `venueAddress` is the free-text street line. Occupancy still uses
  `venueName`+`venueAddress`+court, not `province`/`city`.
- Match card also returns `provinceName` / `cityName` (lookup from JSON).
  Old rows may have `province`/`city` `null` (excluded by those filters).
- Constraint `matches_admin_pair`: both NULL or both set.

**Public match card** (list + detail): `coverUrl`, `host: { userId, fullName,
avatarUrl, matchCount, rating }`, `isFavorited`, `participantAvatars` (max 3),
`province`, `provinceName`, `city`, `cityName`. `host.rating` always `null`.
`matchCount` = hosted kèo except `CANCELLED`. No `hostPhoneNumber` on list /
mine / `GET /users/:id`.

**Listing rules**

- `startsAt` in the future; duration **≥ 1 hour** (no max).
- Courts required and **named**; unique names per match.
- `province` + `city` **required** on create (codes from `GET /geo/vn`).
  `venueAddress` is street/venue line, not a substitute for those codes.
- Pitch occupancy is **global**: normalized `venueName` + `venueAddress` + court
  name + overlapping time → `409`. Adjacent 9–11 then 11–13 is OK. Different
  court names at the same venue+time are OK. Optional `latitude`/`longitude`
  are map pin only — they do **not** affect occupancy. No Geoapify key or
  routing proxy on this backend. `CANCELLED`/`COMPLETED` listings do not occupy.
- `joinMode`: `AUTO` (join → `ACCEPTED` immediately) or `APPROVAL` (`PENDING`
  until host accepts).
- Fee: `GENDER_RANGE` (female `priceMin`, male `priceMax`) or `SPLIT_EVENLY`
  (`priceMin` = total; `yourShare = ceil(priceMin / filledCount)`). No `FREE`.
  Payment is a stub: `paymentStatus: SUCCESS` + recorded `shareAmount`.
- Recurring / multi-day flags exist, default off — do not generate extra dates.

**Slots / join (Figma Join Match)**

- Host counts as **1** at create (`filledCount: 1`).
- Join adds `1 + guests.length` heads (AUTO immediately; APPROVAL on accept).
  FE “Send Request (2)” = that number.
- Guests: `name`, `skill` (that sport’s ladder), `gender` `male`/`female`,
  **`phoneNumber` required**. Requester `phoneNumber` optional on join (else
  account phone). Host sees phones on waiting list and on `participants` after
  accept; other players do not.
- Joiner You-card (name/phone/gender/skill) comes from `GET /auth/me`. Pencil:
  override **this join’s** phone via body `phoneNumber`; lasting skill change =
  `PATCH /auth/me`. No PATCH name/gender on join.
- Required-skill banner = match `skillMin`/`skillMax`/`allLevels` (FE labels).
  Skill out of range → **`skillWarning: true`**, request still created.
- Over-capacity (`heads > spotsLeft`) → `400`. No waitlist, no Zalo.

**Host phone**

On `GET /matches/:id` as `hostPhoneNumber` (and HOST `participants[].phoneNumber`)
**only** when the caller is the host or `yourRequest.status === ACCEPTED`.
Never on `GET /matches`, `GET /matches/mine`, or `GET /users/:id`. After AUTO
join the join response includes it; APPROVAL pending does not.

**Public host profile (`GET /users/:id`)**

`fullName`, `avatarUrl`, `createdAt`, `skills`, `matchCount`, `rating: null`,
`reviewCount: 0`. No `email` / `phoneNumber` / `role` / `status` / `gender`.
404 if missing, `LOCKED`, or not `ACTIVE`. Hosted Matches + View All =
`GET /matches?hostUserId=` (same list rules: OPEN/FULL, still in the future).

**Join requests — one row per `(match_id, user_id)`**

Unique index `idx_join_requests_match_user`. Host accept / reject / kick
`UPDATE` that row (same `requestId`). Do not insert a new tuple on status change.

| Status | Re-join same kèo |
| :--- | :--- |
| `PENDING` / `ACCEPTED` | `409` |
| `REJECTED` | Allowed — `UPDATE` same `requestId` (reset guests) |
| `KICKED` | `403` — blocked **that match only**, not all kèo of the host |

`GET /matches/:id/requests` is the **waiting list**: `PENDING` only.
Accepted people are on `participants` in match detail. `yourRequest` on detail
is `PENDING` / `ACCEPTED` / `KICKED` (not `REJECTED` — they may join again).

**Host manage**

- `GET /matches/mine?tab=active` — `OPEN`/`FULL` and `endsAt` still in the future.
- `tab=completed` — `CANCELLED`/`COMPLETED`, or `OPEN`/`FULL` with `endsAt <= now`.
- `PATCH` only before kick-off. If `filledCount > 1`, cannot change sport /
  format / feeType / prices. `maxPlayers >= filledCount`. Occupancy check
  excludes this match.
- `POST cancel` — pending → `REJECTED`; match `CANCELLED` (frees pitch).
  ACCEPTED rows stay as history.

**Schema (`schema_matchmaking`)** — `003` is canonical for fresh installs:
`matches` (incl. `province`/`city`, `matches_admin_pair`, `fold_search_text`,
GIN + partial `idx_matches_province_city`), `match_courts`,
`match_join_requests`, `match_guests`, `match_favorites`. `004` / `005` are
**idempotent live deltas** (`CREATE OR REPLACE` / `IF NOT EXISTS`) for DBs
that already applied an older `003`. `migrate.js` skips filenames already in
`schema_migrations` — re-apply with `npm run apply:match-search` (`004`) or
`npm run apply:match-admin` (`005`). Do **not** add `006+` ALTER-only files.
`user_profiles.avatar_url` in `001`. Live homepage-card columns:
`npm run apply:homepage-card`. Leftover `schema_migrations` rows — do not
delete. Do not `INSERT` name/gender on `users`.

**Out of scope (do not add in this domain):** waitlist, Zalo, real MoMo/VNPay,
`booking_id`, Groups/Tournaments, join-by-code, cover **file upload**/S3
(URL-only `coverUrl` / `avatarUrl` is in), user profile **hero/cover** image,
verified-host badge, recurring generation, AI chatbot, notifications (bell),
Booking/Schedule tabs, **host rating/review** (keep `rating: null`), Geoapify
**on backend** (search/filter/admin units are Postgres + `vn-admin.json` only),
2025 34-tỉnh / xã-phường map.

Reset kèo data:
`npm run reset:matches` (or `docker compose run --rm backend npm run reset:matches`).
Windows bind-mount: after changing `src/`, `docker restart spot-backend`.

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
- **Name/gender** live on `schema_auth.user_profiles`. Login and match list
  `LEFT JOIN` that table (`full_name`, `gender`). Do not drop `user_profiles`.
  Matchmaking fee gender is `male`/`female` only (auth register still allows
  `other` / `prefer_not_to_say`).
- **Matchmaking:** one join request per `(match, user)`; kick is per-kèo not
  per-host; waiting list is PENDING only; `GET /mine` before `GET /:id`.
  List: Location XOR Distance; `province`/`city` may combine with either;
  `hostUserId` for host profile kèo. Search = DB only. Admin dropdown =
  `GET /geo/vn` (pre-2025). Do not add waitlist / Zalo / real payment /
  `booking_id` / Groups / rating / Geoapify-on-backend / 2025 ward map.
- UI “Venue Owner” maps to DB/API role `OWNER`.
- FE role-based navigation reads `role` from login JWT / `user`. Protect later
  APIs with `authenticate` / `requireRole` from `shared/middleware/authenticate.js`.
  Sample: `GET /auth/me`, `GET /users/:id`. Refresh via `POST /auth/refresh` `{ refreshToken }`.
