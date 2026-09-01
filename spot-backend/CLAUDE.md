# CLAUDE.md — spot-backend

Scoped guide for this app. Repo-root `CLAUDE.md` has behavioral guidelines and the cross-project map.

## Overview

Node.js/Express REST API (ESM, Node ≥ 18), domain-driven `controller/dto/entity/repository/service`. Tracked by the **root** git repo (no nested `.git`). Installable and runnable.

**Stack:** `pg` → Supabase Session pooler (SSL); `ioredis` (OTP/rate-limit, soft-fail if down); `argon2id`; Zod DTOs; Gmail SMTP (`OTP_DEBUG` returns `debugOtp` in non-prod).

Implemented so far:

**Mounts:** `/auth`+`/api/auth`, `/users`+`/api/users`, `/matches`+`/api/matches`, `/geo`+`/api/geo`, `/notifications`+`/api/notifications`, `/reviews`+`/api/reviews`, `/assistant`+`/api/assistant`, `/recommendations`+`/api/recommendations`.

## Status (done vs not)

| Done | Notes |
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
| `POST /matches/bulk` | Done — Vmito-style multi-publish; `template` + `schedules[]` (1–100) |
| `GET /matches/venue-suggestions` | Done — Host form location picker (pool `status <> CANCELLED`) |
| `GET /matches` | Done — see **List filters** + **Homepage browse exclusion** below |
| `GET /geo/vn` | Done — static 63 tỉnh + 705 quận/huyện (pre-2025). **No** 3rd-party geo API |
| `GET /matches/mine` | Done — host **+ participant**; `?tab=active\|completed`; `myRole`, `pendingRequestCount` (host chips); **route before** `GET /:id` |
| `GET /matches/my-join-requests` | Done — joiner Join Requests tab (`PENDING` + `REJECTED`) |
| `GET /matches/:id` | Done — squad, `spotsLeft`, `yourShare`, `canJoin`, `yourRequest`, `participants` |
| `POST` / `DELETE /matches/:id/favorite` | Done — heart; `isFavorited` on list/detail |
| `GET /users/:id` | Done — Check Profile / host card (no email/phone) |
| Host `rating` (Figma `4.9`) | **Deferred** — `host.rating` / profile `rating` always `null`; `reviewCount: 0`. `matchCount` is live. |
| `POST /matches/:id/join` | Done — guests (`name`, `skill`, `gender`, `phoneNumber`), skill **warning** (still joins), AUTO vs APPROVAL |
| `GET /matches/:id/requests` | Done — host waiting list, **PENDING only** |
| Accept / reject / kick | Done — `UPDATE` same `requestId`; kick cannot rejoin **that** kèo |
| `PATCH /matches/:id` | Done — host edit before `startsAt` |
| `POST /matches/:id/cancel` | Done — pending → `REJECTED`; status `CANCELLED` (frees pitch) |

**AI-service proxies — thin pass-through domains, own no table**

| Area | Status |
| :--- | :--- |
| `POST/GET/DELETE /assistant/conversations/:id(/messages)` | Done — proxies to `spot-ai-services/nlp-assistant` (`:5003`), forwarding both `X-Internal-Service-Key` and the calling player's own access token as `X-Player-Access-Token` so the AI service can act on the matchmaking API as that player. See `specs/003-nlp-assistant/`. |
| `GET /recommendations` | Done — proxies to `spot-ai-services/recommendation` (`:5001`) with `X-Internal-Service-Key`; `userId` is always derived from the authenticated JWT, never accepted from the client. See `specs/004-ai-features-frontend-integration/`. |

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
| Admin approve OWNER/REFEREE `PENDING` → `ACTIVE` | **Done** — `/admin/*`, migration `008`, `npm run seed:admin`, `npm run smoke:admin-approvals` |
| Other domains | `payment` still empty; `admin` implemented |

Auth also under `/api/auth/*`. Matches also under `/api/matches/*`. Geo also
under `/geo` and `/api/geo`. Public users also under `/users` and `/api/users`.
Contract: [`docs/API.md`](./docs/API.md). Product locks: [`docs/MATCHMAKING_PLAN.md`](./docs/MATCHMAKING_PLAN.md).
| Auth | register → role → OTP → login/refresh; forgot/reset password |
| Profile | `GET/PATCH /users/me`, Main Profile stats, preferences, password change, avatar upload |
| Account security notify | Sau đổi email/phone/password (Settings) hoặc reset-password → inbox `SYSTEM` + email (`data.action`: `ACCOUNT_*`) |
| Contact change | OTP email/phone under `/users/me/email|phone/...` |
| Schedule | `GET /users/me/schedule` + dev seed |
| Notifications | inbox + T-24h/T-2h reminders (`worker:reminders`) |
| Reviews | create + owner reply; venue rating cache |
| Owner console | `/owner/dashboard/summary` + `/owner/facilities/*`, `/owner/revenue/*`, `/owner/reviews/*` (OWNER + ACTIVE) — Figma 224-6044/2414/2648/2893/4521 |

**Not yet:** refresh-token rotate / JWT blacklist; booking payment gateway.

Default DB is **Supabase** (not compose postgres). Prefer Session pooler IPv4 (`aws-0-<region>.pooler.supabase.com`).

**Admin console (BE):** `/admin` + `/api/admin` — dashboard, approvals, users, settings, audit log. Applicant docs: `POST /users/me/verification-requests`. OTP verify issues JWT for pending Owner/Referee (`nextStep: SUBMIT_VERIFICATION`).

**Owner console (BE):** `/owner` + `/api/owner` — dashboard KPI, facility CRUD, revenue report/export, customer reviews inbox (migration `009`), booking schedule timeline + owner-created walk-in bookings (migration `010`, spec `006-owner-booking-web`). Frontend lives in `spot-admin-console` (`src/pages/Owner*Page.tsx`).

## Commands

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
npm run smoke:profile  # GET/PATCH /users/me + preferences
npm run smoke:matches  # 2 PLAYERs → host / join / approve / kick / mine / cancel / GET /users/:id
npm run seed:admin     # upsert System Administrator (ADMIN_SEED_* env)
npm run smoke:admin-approvals  # owner pending → verify → submit doc → admin approve → suspend
npm run smoke:owner-ops        # owner facility + revenue + reviews (needs 009)
npm run smoke:owner-schedule   # owner schedule GET + manual booking + 409/422 (needs 010)
npm run apply:homepage-card  # live DB: avatar_url, cover_url, match_favorites
npm run apply:match-search   # re-apply fold + GIN (scripts/sql, 006 already migrated)
npm run apply:match-admin    # re-apply province/city (scripts/sql, 006 already migrated)
node scripts/smoke-forgot-password.js  # register → role → verify → forgot → reset → login
npm run smoke:account-notify   # change password + reset → SYSTEM inbox (ACCOUNT_*)
npm run smoke:schedule|notifications|reviews
npm run worker:reminders
npm run migrate:reset                # DESTRUCTIVE: drop schemas + re-apply
```

Docker from **repo root** `Intro_SWE/`:

```bash
docker compose up -d --build redis backend
docker compose run --rm backend npm run migrate
docker restart spot-backend
docker compose logs -f backend
docker compose down

```

Compose uses `env_file: ./spot-backend/.env`, forces `REDIS_HOST=redis`. Optional local Postgres: `docker compose --profile local-db up -d postgres` (do not `depends_on` it while on that profile).

## Layout

```
src/
├── server.js / app.js
├── domains/admin/
│   ├── routes.js                 # /admin/* (ADMIN only)
│   ├── controller/admin.controller.js
│   ├── dto/, entity/, repository/, service/
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
│   ├── dto/{create-match,create-match-bulk,list-matches,join-match,list-mine,my-join-requests,update-match,venue-suggestions}.dto.js
│   ├── entity/match.entity.js
│   ├── repository/{match,match-court,join-request,match-favorite}.repository.js
│   └── service/match.service.js
├── domains/assistant/             # POST/GET/DELETE /assistant/conversations/:id(/messages) — proxies nlp-assistant
│   ├── routes.js
│   ├── controller/assistant.controller.js
│   ├── dto/assistant.dto.js
│   └── service/assistant.service.js   # no entity/repository — owns no table
├── domains/recommendation/        # GET /recommendations — proxies spot-ai-services/recommendation
│   ├── routes.js
│   ├── controller/recommendation.controller.js
│   └── service/recommendation.service.js   # no dto/entity/repository — owns no table
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
├── 001_schema_auth.sql           # users + user_profiles + prefs + otp
├── 002_user_sport_skills.sql     # badminton / football ladders
├── 003_schema_notification.sql   # inbox + reminder_jobs
├── 004_schema_venue_booking_social.sql  # venues, bookings, schema_social.matches
├── 005_schema_review.sql         # reviews + owner replies
├── 006_schema_matchmaking.sql    # pickup kèo + fold + province/city
├── 007_schema_venue_images.sql   # venue gallery URLs
├── 008_schema_admin.sql          # admin verification + settings
├── 009_schema_owner_ops.sql      # owner field pricing + revenue indexes
├── 010_schema_owner_schedule.sql # guest_name/guest_phone on bookings (owner walk-ins)
├── README.md
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
geo at `/geo` and `/api/geo` (see `app.js`). Register **before** `GET /:id`:
`GET /matches/mine`, `GET /matches/my-join-requests`, `GET /matches/venue-suggestions`,
`POST /matches/bulk`.

`req.user` after `authenticate`: `{ userId, role, email }`. JWT `sub` is a
**string** — coerce with `Number` when comparing to DB ids.

Schedule lives in the booking domain; the HTTP route is on `/users/me/schedule`.
`GET /users/me*` is mounted **before** `GET /users/:id` so Profile Hub is not
captured as a numeric id.

## Auth & profile (short)

1. `POST /auth/register` → `{ nextStep: "SELECT_ROLE", userId, email }` (+ OTP email)
2. `POST /auth/role` `{ email, role }` → `PLAYER` stays `ACTIVE`; `OWNER`/`REFEREE` → `PENDING`
3. `POST /auth/otp/verify` `{ email, otp }` → sets `email_verified_at`
4. `POST /auth/login` `{ email, password }` → `{ accessToken, refreshToken, user }`
5. Protected APIs: `Authorization: Bearer <accessToken>` via `authenticate`
6. `POST /auth/refresh` `{ refreshToken }` → new access + refresh when access expires
7. `GET /auth/me` / `GET /users/me` — own profile (email/phone/skills + prefs)
8. `GET /users/:id` — public host card (no email/phone)
9. `GET /users/me/profile` — Main Profile stats; `GET/PATCH /users/me/preferences` — Settings
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

| Screen | Node | BE status | FE uses |
| :--- | :--- | :--- | :--- |
| Homepage list | `95:2417` | **Done** — see **Homepage 1** below | `GET /matches` + search/filter below. Map = FE tiles + `latitude`/`longitude`. Paper-plane = **directions** (Geoapify), not share. |
| Filter sheet | `87:1903` | **Done** — same list API + `GET /geo/vn` | Figma “Ward/Commune” → BE `city` (quận/huyện). “Province/City” → `province` + `city`. Price chips → `priceMin`/`priceMax` **VND**. Skill chips → codes from `shared/constants/sports.js`. “Book Field” bg = Booking — **locked**. |
| Match detail | `100:401` | Done | `GET /matches/:id` + favorite + `POST .../join`. Map = FE Geoapify. |
| Join Match sheet | `100:551` | Done | Detail + `GET /auth/me` + `POST /matches/:id/join`. Skill/gender labels from FE + sports constants. |
| Host a Match form | `99:2` | **Done** — see **Host form 99:2** below | `POST /matches` / `POST /matches/bulk`; `GET /matches/venue-suggestions`; sport from Homepage tab `95:2675`. Advanced: `format`, `maxPlayers`, `coverUrl`, `joinMode` default `AUTO`. |
| Check Profile (host) | `432:1211` | Done | `GET /users/:id` + `GET /matches?hostUserId=`. Hide Groups / verified / reviews. Phone **not** on this endpoint. |
| Manage Matches | `101:98` | **Done** — see **Manage Matches 101:98** below | `GET /matches/mine` + `GET /matches/my-join-requests`; cards reuse Homepage; host approve on detail `100:401`. |

**Host form (`99:2`) — product locked**

Decisions from Figma + [Vmito sessions/new](https://vmito.com/vi/sessions/new). Do **not** re-open without FE gap.

| Topic | Contract |
| :--- | :--- |
| **Sport** | From Homepage tab `95:2675`. Body field `sport`. |
| **Location** | `GET /matches/venue-suggestions?location=&sport=` — pool `status <> CANCELLED`. Returns distinct venues (+ province/city/lat/lng). Map miss → Geoapify on FE; admin → `GET /geo/vn` codes. |
| **Host name / phone** | Not in create body; read-only from `GET /auth/me`. |
| **Multi-day** | Always `isMultiDay: false` (Figma toggle removed). |
| **Skill** | Multi-chip → `skillMin`/`skillMax`; `allLevels` = full ladder. Per-sport labels in `sports.js`. |
| **Fee** | Always on. `SPLIT_EVENLY` **or** `GENDER_RANGE` — **either sport** (VND). |
| **Recurring** | Off → `POST /matches` (1 schedule). On → FE expand dates/weekdays → `POST /matches/bulk` (max 100 schedules). Partial 409 OK. |
| **Advanced (FE required)** | `format`, `maxPlayers`, `coverUrl` (URL). `joinMode` default `AUTO`. |
| **Cover** | Supabase Storage on FE → `coverUrl`. No BE upload. |

**Do not confuse:** `GET /matches?location=` = browse joinable kèo. `GET /matches/venue-suggestions` = Host venue reuse (wider pool).

**Manage Matches (`101:98`) — product locked**

Decisions from Figma + product review ([`101:98`](https://www.figma.com/design/ZTpFWfkdcEpHH4xJaKaBxT/Spot?node-id=101-98)). Do **not** re-open without FE gap. **Do not** confuse with Manage Group (`101:2`) — out of scope.

**Navigation (FE)**

| From | Goes to |
| :--- | :--- |
| Homepage FAB menu | Manage Matches `101:98` |
| Bottom nav tab **Matches** | Homepage browse `95:2675` (not Manage unless IA changes) |
| Empty state **Host a Match** | Host form `99:2` (sport from Homepage tab) |
| Empty state **Find Matches** | Homepage list |

**Three tabs → two APIs**

| UI tab | Who | API | Pool |
| :--- | :--- | :--- | :--- |
| **Active** | Host + participant | `GET /matches/mine?tab=active` | Host: own `OPEN`/`FULL`, `endsAt > now`. Participant: request **`ACCEPTED`**, kèo not cancelled, not ended. **No `PENDING`.** |
| **Completed** | Host + participant | `GET /matches/mine?tab=completed` | Host: `CANCELLED`/`COMPLETED` or past `endsAt`. Participant: **`KICKED`**, or **`ACCEPTED`** + ended/cancelled/completed. |
| **Join Requests** | Joiner only | `GET /matches/my-join-requests` | Caller’s **`PENDING`** + **`REJECTED`**. Sort: PENDING first. **`ACCEPTED`** → Active tab; **`KICKED`** → Completed. |

**Host duyệt request — không có tab gộp**

Host **does not** use Join Requests tab. Flow:

1. `GET /matches/mine?tab=active` → card with `myRole: HOST`
2. Tap card → Match detail (`100:401` — **host variant**: waiting list + Edit/Cancel; Figma joiner frame exists, host frame TBD)
3. `GET /matches/:id/requests` → PENDING only
4. `POST .../accept` \| `POST .../reject`

**List item shape (`GET /matches/mine`)**

Same public match card as Homepage **plus**:

| Field | Notes |
| :--- | :--- |
| `myRole` | `HOST` \| `PARTICIPANT` |
| `myRequestStatus` | Participant: usually `ACCEPTED` (active) or `KICKED` (completed). Host: `null` |
| `pendingRequestCount` | Host only — count of **`PENDING`** join requests on that kèo |

**FE chips on Active (host cards)**

| Chip | Condition |
| :--- | :--- |
| **N chờ duyệt** | `myRole=HOST` && `pendingRequestCount > 0` && `joinMode=APPROVAL` |
| **Đủ người** | `status === FULL` |
| **HOST** / **JOINED** | From `myRole` |

Participant Active cards: badge **JOINED**; no `pendingRequestCount`.

**Join Requests tab item (`GET /matches/my-join-requests`)**

```json
{ "requestId", "status", "heads", "message", "match": { "matchId", "title", "startsAt", "venueName", "hostFullName", ... } }
```

Tap → `GET /matches/:id`. **`REJECTED`** rows stay here for tracking; same kèo **reappears on Homepage** browse (caller may join again).

**Homepage browse exclusion (`GET /matches` — default, not `hostUserId=`)**

Hide from feed (avoid duplicate with Manage):

| Reason | Hidden? |
| :--- | :--- |
| Caller is **host** | Yes |
| Join request **`PENDING`** | Yes → only Join Requests tab |
| Join request **`ACCEPTED`** | Yes → Active tab |
| Join request **`KICKED`** | Yes |
| Join request **`REJECTED`** | **No** — show again for re-join |

Same rule when `favorited=true`. **`GET /matches/:id`** and Manage routes unchanged.

**Empty state**

Figma `101:98` ships empty Active only. Filled states = reuse Homepage card + chips above. Pro Tip card = static FE copy (`rating` still null on BE).

**Homepage 1 (Figma `95:2675` / list `95:2417`) — BE complete**

Product review locked. Do **not** re-open unless FE finds a gap.

| Topic | BE | Notes |
| :--- | :--- | :--- |
| **Search (`location=`)** | **Done** | Full spec in **Homepage search** below. Postgres only — **not** Geoapify, **not** NLP/AI. |
| **Suggestions while typing** | **Done** | Same `GET /matches?location=` returns `suggestions[]` (max 5). FE debounces per keystroke. |
| **Public browse list** | **Done** | `OPEN` + spots left + `endsAt > now`; **`FULL` hidden**. Also hides caller’s hosted kèo + join `PENDING`/`ACCEPTED`/`KICKED`; **`REJECTED` reappears** — see **Manage Matches** browse exclusion. |
| **Hosted Matches on profile** | **Done** | `GET /matches?hostUserId=` still returns `OPEN` **and** `FULL` (future `endsAt`). |
| **Filter tỉnh/quận** | **Done** | `province` + `city` exact codes from `GET /geo/vn` (pre-2025 63 tỉnh + quận/huyện). |
| **Filter sport / date / time / skill / price** | **Done** | `skill` needs `sport`; prices in **VND**; skill chip labels map to codes in `sports.js`. |
| **Distance filter** | **Done** | `latitude` + `longitude` + `radiusKm` (1–20 km). **XOR** with `location` → `400`. |
| **Favorites filter** | **Done** | `favorited=true`. Same browse-exclusion rule as default list. |
| **Card fields** | **Done** | `coverUrl`, `host`, `isFavorited`, `participantAvatars`, `province`/`city` + names, `spotsLeft`, `yourShare` (VND). |
| **Card location display** | FE | Show `{venueName}, {cityName}`; distance from user GPS = FE (Haversine or map). |
| **Logo → Home / Avatar → Profile** | FE | Nav only — no BE endpoint. |
| **Sparkles (AI search)** | **Out of scope** | Search is text SQL only. |
| **Notification bell** | **Out of scope** | No notification domain. |
| **Groups / Tournaments tabs** | **Out of scope** | Pickup kèo only. |
| **Booking / Schedule** | **Out of scope** | Free listing, no `booking_id`. |
| **Host rating on card** | **Deferred** | `host.rating` always `null`; `matchCount` live. |
| **FAB Host / Manage** | **Done (BE)** | Create = `POST /matches` / bulk. Manage = **Manage Matches 101:98** section. |

**API map**

| Method | Path | Notes |
| :--- | :--- | :--- |
| `POST` | `/matches` | PLAYER host; single kèo |
| `POST` | `/matches/bulk` | Same template + `schedules[]` (Vmito multi-publish) |
| `GET` | `/matches/venue-suggestions` | Host location picker (wide venue pool) |
| `GET` | `/matches` | Browse: excludes FULL, hosted, joined/pending/kicked; **`REJECTED` visible**. `hostUserId` → also `FULL` |
| `GET` | `/geo/vn` | Pre-2025 63 tỉnh + 705 quận/huyện (static JSON, Bearer) |
| `GET` | `/matches/mine` | Manage Active/Completed — **host + participant**; `myRole`, `pendingRequestCount` |
| `GET` | `/matches/my-join-requests` | Manage Join Requests tab — joiner **`PENDING` + `REJECTED`** |
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
in range), `location` (unaccent + fuzzy `title` / `venueName` / `venueAddress`;
`suggestions[]` while typing; Postgres only), `province` / `city` (pre-2025
GSO codes, exact; `city` requires `province`; HCM `79`, Quận 7 `778`),
`favorited=true` (caller’s hearts), `hostUserId` (that host’s active kèo),
`latitude`+`longitude`+`radiusKm` (1–20, haversine; all three together;
matches without coords excluded), `limit` (default 20, max 50), `offset`.

**Location XOR Distance:** `location` together with lat/lng/radiusKm → `400`
(`Use location or distance, not both`). `province`/`city` **may** combine with
either. Football filter chips: Beginner→`LEARNING`, Basic Amateur→`REC_BASIC`,
Advanced Amateur→`REC_ADVANCED`, Semi-pro→`SEMI_PRO`, Professional→`PROFESSIONAL`,
Elite→`ELITE`.

**Homepage search (`GET /matches?location=`) — BE contract**

Text search on **our kèo in DB only**. No Geoapify Autocomplete, no NLP, no
external geocoding. Implementation: `fold_search_text()` + `pg_trgm` in
`match.repository.js` (`locationPredicate`, `listSearchSuggestions`).

**What is searched (3 fields)**

| Field | DB column | Example |
| :--- | :--- | :--- |
| Match title | `title` | `Saturday 7v7 AUTO` |
| Venue name | `venue_name` | `San ABC` |
| Street address | `venue_address` | `123 Nguyen Van Linh, Q7, TP.HCM` |

**Not searched:** host name, `notes`, `province`/`city` codes or names, GPS
coords. For admin area use `province` + `city` filters. For radius use
Distance trio (XOR with `location`).

**Normalization (`fold_search_text`)**

Lowercase, strip Vietnamese diacritics and `đ`, collapse whitespace. So
`location=san abc` matches `Sân ABC`.

**Match modes (any one is enough)**

1. **Substring** — folded query appears inside folded `title`, `venue_name`,
   or `venue_address`.
2. **Fuzzy** — query length ≥ `MATCH_SEARCH.FUZZY_MIN_CHARS` (3); max
   `similarity()` across the three fields ≥ `LIST_SIMILARITY` (0.28). Handles
   typos / near matches.
3. **Multi-word AND** — query contains spaces → every non-empty token must
   appear somewhere in the combined haystack
   `title + venue_name + venue_address`.

**Suggestions (`suggestions[]`) — while user types**

Returned on the **same** `GET /matches` when `location` is present (FE should
debounce, e.g. 300 ms). Built from listable kèo only (same pool as browse:
`OPEN`, spots left, `endsAt > now`).

| Property | Value |
| :--- | :--- |
| Max items | 5 (`MATCH_SEARCH.SUGGEST_LIMIT`) |
| Shape | `{ text, kind }` |
| `kind` | `title` \| `venueName` \| `venueAddress` |
| Source | Distinct values from existing kèo (not Geoapify) |
| Dedup | By folded `text`; best score wins |
| Excludes | Suggestion text identical to folded query (no “search for what you typed”) |
| Score threshold | `similarity` ≥ `SUGGEST_SIMILARITY` (0.2) per field |
| Sort | Score DESC, then text ASC |

Example response fragment:

```json
"suggestions": [
  { "text": "San ABC", "kind": "venueName" },
  { "text": "Saturday 7v7 AUTO", "kind": "title" },
  { "text": "123 Nguyen Van Linh, Q7, TP.HCM", "kind": "venueAddress" }
]
```

**Sort when searching**

With `location`: order by best similarity across title / venue / address, then
`startsAt` ASC. Without `location`: `startsAt` ASC only.

**Public browse vs profile list (do not confuse)**

| Query | Status filter | Spots filter | Caller exclusion |
| :--- | :--- | :--- | :--- |
| `GET /matches` (homepage) | `OPEN` only | `filledCount < maxPlayers` | Hide hosted + join `PENDING`/`ACCEPTED`/`KICKED`; show **`REJECTED`** again |
| `GET /matches?hostUserId=` | `OPEN` + `FULL` | none | No caller exclusion (public profile) |

Constants: `LISTABLE_MATCH_STATUSES` = browse; `PITCH_OCCUPIED_STATUSES` =
`OPEN`+`FULL` for pitch overlap / 409 and host profile list.

**Search / admin units (no 3rd-party API)**

- Filter tỉnh/quận: host and filter pick the **same codes** from `GET /geo/vn`
  (`vn-admin.json`). Map is **pre-2025** (63 tỉnh/TP + quận/huyện). Do **not**
  switch to the 2025 34-tỉnh / xã-phường list. Figma filter “Ward/Commune” →
  BE `city`; “Province/City” → BE `province` + `city`.
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
`GET /matches?hostUserId=` (profile: OPEN/FULL still in the future; browse hides FULL).

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

**Host manage (PATCH / cancel — see also Manage Matches 101:98)**

- `PATCH /matches/:id` only before kick-off. If `filledCount > 1`, cannot change sport /
  format / feeType / prices. `maxPlayers >= filledCount`. Occupancy check
  excludes this match.
- `POST /matches/:id/cancel` — pending join requests → `REJECTED`; match `CANCELLED` (frees pitch).
  ACCEPTED rows stay as history.

**Schema (`schema_matchmaking`)** — `006_schema_matchmaking.sql` is canonical:
`matches` (incl. `province`/`city`, `matches_admin_pair`, `fold_search_text`,
GIN + partial `idx_matches_province_city`), `match_courts`,
`match_join_requests`, `match_guests`, `match_favorites`. Chain: `001` auth →
`002` skills → `003` notification → `004` venue/booking/social → `005` review →
`006` kèo. `migrate.js` skips filenames already in `schema_migrations`.
Re-apply search/admin with `npm run apply:match-search` or
`npm run apply:match-admin` (`scripts/sql/`). Do **not** add `007+` ALTER-only
matchmaking files; use `apply-*.js`. Leftover old filenames in
`schema_migrations` — do not delete.
`user_profiles.avatar_url` in `001`. Live homepage-card columns:
`npm run apply:homepage-card`. Leftover `schema_migrations` rows — do not
delete. Do not `INSERT` name/gender on `users`.

**Out of scope (do not add in this domain):** waitlist, Zalo, real MoMo/VNPay,
`booking_id`, Groups/Tournaments, join-by-code, cover **file upload**/S3
(URL-only `coverUrl` / `avatarUrl` is in), user profile **hero/cover** image,
verified-host badge, cron recurring (auto future weeks), AI chatbot, notifications (bell),
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
  Matchmaking fee gender is `male`/`female` only (auth register still allows).
- **Matchmaking:** one join request per `(match, user)`; kick is per-kèo not
  per-host; waiting list is PENDING only; `GET /mine` before `GET /:id`.
  List: Location XOR Distance; `province`/`city` may combine with either;
  `hostUserId` for host profile kèo (includes FULL). Homepage browse hides FULL,
  caller's hosted kèo, and kèo with join request `PENDING`/`ACCEPTED`/`KICKED`
  (`REJECTED` reappears for re-join).
  Search = DB on `title`/`venueName`/`venueAddress` + `suggestions[]` (see
  **Homepage search**). Admin dropdown = `GET /geo/vn` (pre-2025). Prices VND.
  Do not add waitlist / Zalo / real payment / `booking_id` / Groups / rating /
  Geoapify-on-backend / 2025 ward map / NLP search.
- UI “Venue Owner” maps to DB/API role `OWNER`.
- FE role-based navigation reads `role` from login JWT / `user`. Protect later
  APIs with `authenticate` / `requireRole` from `shared/middleware/authenticate.js`.
  Sample: `GET /auth/me`, `GET /users/:id`. Refresh via `POST /auth/refresh` `{ refreshToken }`.
- Compose from **repo root**; never commit `.env`
- Auth uses `pg` + `ioredis` — do not assume `@supabase/supabase-js` is wired
- Style: 2 spaces, single quotes, trailing commas; camelCase / PascalCase (no linter yet)
- Full API details: `docs/API.md` / `API.md`
