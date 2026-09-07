# CLAUDE.md — spot-backend

Scoped guide for this app. Repo-root `CLAUDE.md` has behavioral guidelines and the cross-project map.

## Overview

Node.js/Express REST API (ESM, Node ≥ 18), domain-driven `controller/dto/entity/repository/service`. Tracked by the **root** git repo (no nested `.git`). Installable and runnable.

**Stack:** `pg` → Supabase Session pooler (SSL); `ioredis` (OTP/rate-limit, soft-fail if down); `argon2id`; Zod DTOs; Gmail SMTP (`OTP_DEBUG` returns `debugOtp` in non-prod).

Implemented so far:

**Mounts:** `/auth`+`/api/auth`, `/users`+`/api/users`, `/matches`+`/api/matches`, `/groups`+`/api/groups`, `/tournaments`+`/api/tournaments`, `/geo`+`/api/geo`, `/notifications`+`/api/notifications`, `/reviews`+`/api/reviews`, `/assistant`+`/api/assistant`, `/recommendations`+`/api/recommendations`.

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
| `GET /users/:id` | Done — Check Profile; `matchCount`, `joinedMatches`, live `rating`/`reviewCount` (pickup kèo reviews) |
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
| `GET /matches/mine` | Done — host **+ participant**; `?tab=active\|completed`; `myRole`, `pendingRequestCount`, `outcome`/`outcomeMessage` (completed); **route before** `GET /:id` |
| `GET /matches/my-join-requests` | Done — joiner Join Requests tab (`PENDING` + `REJECTED`; `?status=`); `pendingCount`; `match.hostAvatarUrl` |
| `GET /matches/:id` | Done — squad, `yourShare`, `canJoin`, `summary` (View Summary/review), `participants[]`; `outcome` when ended |
| `POST /matches/:id/review` | Done — participant rates host after reviewable kèo |
| `GET /reviews/hosts/:userId/reviews` | Done — Check Profile Reviews section |
| `POST` / `DELETE /matches/:id/favorite` | Done — heart; `isFavorited` on list/detail |
| `GET /users/:id` | Done — Check Profile; `matchCount`, `joinedMatches`, live `rating`/`reviewCount` |
| Host `rating` (Figma `4.9`) | Done — `POST /matches/:id/review` + aggregate on cards/profile |
| `POST /matches/:id/join` | Done — guests (`name`, `skill`, `gender`, `phoneNumber`), skill **warning** (still joins), AUTO vs APPROVAL |
| `DELETE /matches/:id/join` | Done — joiner hủy request **`PENDING`** (xóa row; có thể join lại) |
| `GET /matches/:id/requests` | Done — host waiting list, **PENDING only**; `avatarUrl`, `skill`, `shareAmount`, `phoneNumber` |
| Accept / reject / kick | Done — `UPDATE` same `requestId`; kick cannot rejoin **that** kèo |
| `PATCH /matches/:id` | Done — host edit before `startsAt` |
| `POST /matches/:id/cancel` | Done — pending → `REJECTED`; status `CANCELLED`; notify joiners (`MATCH_CANCELLED`, `data.reason=HOST_CANCEL`) |
| Match expiry worker | Done — `npm run worker:match-expiry`; dev `POST /matches/dev/process-expired` (non-prod). Đủ người → `COMPLETED`; thiếu người → `CANCELLED` + notify |

**Groups (hội) — G0–G5 done** (Aug 2026)

| Area | Status |
| :--- | :--- |
| `POST /groups` | Done — PLAYER create; `sport` query/body; courts + recurringSlots + joinMode |
| `GET /groups` | Done — browse; search `name`/venue/address; province/city; distance; `suggestions[]` |
| `GET /groups/:id` | Done — About + `recurringSlots[]`, `zaloUrl`, `myRole`, `memberCount` |
| `POST /groups/:id/join` | Done — skill **hard gate**; AUTO vs APPROVAL; kicked → `403` rejoin |
| `DELETE /groups/:id/join` | Done — cancel PENDING |
| `GET /groups/mine` | Done — `tab` + `section` (managed/joined) |
| `GET /groups/my-join-requests` | Done — PENDING + REJECTED; `pendingCount` |
| Accept / reject / kick / transfer-admin / leave / delete | Done |
| `POST` / `DELETE /groups/:id/favorite` | Done |
| `PATCH /groups/:id` | Done — admin partial edit; courts replace; `joinMode`→`AUTO` flushes PENDING |
| `GET /groups/:id/members` | Done — paginated + `search` (full name) |
| `GET /groups/:id/schedule` | Done — `?date=` → 30-min matrix `BOOKED`/`AVAILABLE` |
| Gallery CRUD | Done — `GET/POST/DELETE /groups/:id/gallery`; max 50 |
| Group notifications (G5) | Done — join/approve/reject/kick/transfer/flush → inbox |
| Smoke | `npm run smoke:groups` |

**Tournaments (giải đấu) — T0–T5 done** (Aug 2026)

| Area | Status |
| :--- | :--- |
| Migration `012` / `013` / `014` | Done — `schema_tournaments`, notifications, matches |
| `POST /tournaments` | Done — create gate (80 completed host + rating ≥ 4.5) |
| `GET /tournaments`, `GET /tournaments/:id` | Done — browse (hide FULL), detail + `canJoin` |
| `POST/DELETE /tournaments/:id/join` | Done — captain register / withdraw PENDING |
| Accept / reject / kick / cancel | Done |
| `GET /tournaments/mine`, `GET /tournaments/my-join-requests` | Done |
| `POST/DELETE /tournaments/:id/favorite` | Done |
| `GET /tournaments/:id/players` | Done — accepted teams + roster (sorted by rank) |
| `PATCH /tournaments/:id` | Done — organizer edit, winners, playerRanks, ACTIVE lock |
| `POST /tournaments/:id/complete` | Done — early complete when ACTIVE (+ optional winners) |
| Lifecycle worker | Done — `npm run worker:tournament-lifecycle` |
| **T2 Matches** | Done — `GET/POST/PATCH/DELETE /tournaments/:id/matches`, `PATCH .../result` |
| **T3 Standings** | Done — `GET /tournaments/:id/standings` (PTS + tie-break) |
| **T4 Completed** | Done — winners, player in-team ranks |
| **T5 Docs + smoke** | Done — `docs/api/06-tournaments.md`, `npm run smoke:tournaments` |

**AI-service proxies — thin pass-through domains, own no table**

| Area | Status |
| :--- | :--- |
| `POST/GET/DELETE /assistant/conversations/:id(/messages)` | Done — proxies to `spot-ai-services/nlp-assistant` (`:5003`), forwarding both `X-Internal-Service-Key` and the calling player's own access token as `X-Player-Access-Token` so the AI service can act on the matchmaking API as that player. See `specs/003-nlp-assistant/`. |
| `GET /recommendations` | Done — proxies to `spot-ai-services/recommendation` (`:5001`) with `X-Internal-Service-Key`; `userId` is always derived from the authenticated JWT, never accepted from the client. See `specs/004-ai-features-frontend-integration/`. |

**Infra / conventions**

| Area | Status |
| :--- | :--- |
| Password hashing | `argon2id` via `argon2` (not bcrypt) |
| Validation | Zod DTOs under `domains/{auth,matchmaking,groups}/dto/` |
| Email | Gmail SMTP (`SMTP_*` / `EMAIL_FROM`); `OTP_DEBUG` returns `debugOtp` in non-prod (only when OTP was issued) |
| DB | Hosted **Supabase Postgres** via Session pooler + SSL (`pg`) |
| Redis | Attempt counters + resend cooldown, keyed by `{email}:{purpose}` (soft-fail if Redis down) |
| Auth middleware (`authenticate` / `requireRole`) | Done — use on protected routes; `requireRole(...roles)` after `authenticate` |
| Refresh-token rotate / Redis JWT blacklist | **Not implemented yet** (refresh re-issues tokens; old refresh still valid until TTL) |
| Admin approve OWNER/REFEREE `PENDING` → `ACTIVE` | **Not implemented yet** |
| Other domains | `venue`/`booking` done (browse, availability, booking, bulk booking, referee-hire addon — see `docs/api/14-venues-booking.md`); `groups` G0–G5 done; `tournaments` T0–T5 done; `referee` done (see **Referee** section below). `payment` still has no live gateway — non-prod `POST /bookings/:id/dev/mark-paid` stands in. |

Auth also under `/api/auth/*`. Matches also under `/api/matches/*`. Geo also
under `/geo` and `/api/geo`. Public users also under `/users` and `/api/users`.
Contract: [`docs/API.md`](./docs/API.md). Product locks: [`docs/MATCHMAKING_PLAN.md`](./docs/MATCHMAKING_PLAN.md) (kèo), [`docs/GROUP_PLAN.md`](./docs/GROUP_PLAN.md) (groups — **G0–G5 implemented**), [`docs/TOURNAMENT_PLAN.md`](./docs/TOURNAMENT_PLAN.md) (tournaments — **T0–T5 implemented** Aug 2026).


## Migration map & product locks (agent / dev sau này)

Migrations by domain: matchmaking `001`–`009` (`009` = host reviews); Groups `010`–`011`; Tournaments `012`–`014`; Admin/Referee `015`–`022`; owner schedule/booking `010`; owner facility pricing `009`; venue football variant `028`. Run `npm run migrate` after pulling. Vmito dev-seed import (fetch/sync/reset) is documented in full further down under **Vmito import (dev seed kèo)**.

**Manage Matches "Completed" tab rule (đừng revert):** chỉ `ends_at <= now` + `filled_count >= max_players` + `status <> CANCELLED` + participant `ACCEPTED`. Không gồm host cancel, thiếu người, kicked (xem lại qua `GET /matches/:id` + notify).

**Tournaments product locks (đừng revert):** tách biệt kèo + Groups; **1 giải = 1 hạng mục**; join **APPROVAL-only** (captain); create gate **80 COMPLETED host + rating ≥ 4.5**; **`hostedByLabel = SPOT`**; cancel **before startsAt only**; sau **ACTIVE** lock venue/schedule; winners + in-team ranks **manual** on PATCH; format **immutable after create**.

**Groups product locks (đừng revert):** skill **hard gate** on join (unlike kèo warn); `memberCount` = admin + accepted members only (**PENDING không tính** — xem bảng dưới); kicked = terminal `403`; `REJECTED` may rejoin; schedule matrix = visualization of recurring slots only, not venue booking.

**`memberCount` — khi nào tăng/giảm:**

| Sự kiện | `memberCount` | Ghi chú |
| :--- | :--- | :--- |
| `POST /groups` | `1` | Admin = member duy nhất lúc tạo |
| Join `AUTO` thành công | `+1` ngay | Thêm `group_members` + `adjustMemberCount(+1)` |
| Join `APPROVAL` (PENDING) | **không đổi** | Chờ admin accept |
| Accept request | `+1` | Nếu chưa có row member |
| Reject / hủy PENDING | không đổi | |
| `PATCH joinMode`→`AUTO` flush | `+N` | Mỗi pending chưa là member |
| Kick / member leave | `-1` | |
| Transfer admin | không đổi | Chỉ đổi role + `admin_user_id` |

<<<<<<< HEAD
**Files touched (Groups):**

| Layer | Path |
| :--- | :--- |
| Domain | `src/domains/groups/{routes,controller,service,entity,dto,repository}/` |
| Notifications | `src/domains/groups/service/group-notification.service.js` |
| Constants | `src/shared/constants/groups.js` |
| Migrations | `migrations/010_schema_groups.sql`, `011_notification_group_types.sql` |
| Tests | `tests/unit/groups/*.test.js`, `tests/unit/notification/notification-types.test.js` |
| Smoke | `scripts/smoke-groups.js` (`npm run smoke:groups`) |
| Docs | `docs/GROUP_PLAN.md`, `docs/API.md` §8, `API.md` (root copy), `CLAUDE.md` |

**Aug 2026 — Tournaments T0–T5 (implemented):**

Full contract: [`docs/TOURNAMENT_PLAN.md`](./docs/TOURNAMENT_PLAN.md) + **Tournaments (giải đấu)** below + root [`CLAUDE.md`](../CLAUDE.md). Key locks: 1 giải = 1 format (**immutable after create**); join captain + team name/logo + roster; APPROVAL-only; auto-cancel at `registrationDeadline` if not FULL; create gate 80 completed host kèo + rating ≥ 4.5; football single-leg goals; badminton BO3×15; VND display-only; no Groups link.

**Other implemented (non-group):**

| Area | Notes |
| :--- | :--- |
| Auth | register → role → OTP → login/refresh; forgot/reset password |
| Profile | `GET/PATCH /users/me`, Main Profile stats, preferences, password change, avatar upload |
| Contact change | OTP email/phone under `/users/me/email\|phone/...` |
| Schedule | `GET /users/me/schedule` + dev seed |
| Notifications | inbox + T-24h/T-2h reminders (`worker:reminders`); match cancel/expiry; **group join types (G5)** |
| Reviews | venue booking reviews + pickup kèo host reviews |
| Notifications | inbox + T-24h/T-2h reminders (`worker:reminders`) |
| Reviews | create + owner reply; venue rating cache |
| Owner console | `/owner/dashboard/summary` + `/owner/facilities/*`, `/owner/revenue/*`, `/owner/reviews/*` (OWNER + ACTIVE) — Figma 224-6044/2414/2648/2893/4521 |

**Not yet:** refresh-token rotate / JWT blacklist; real VNPay/MoMo sandbox keys; player cancel unpaid booking API. **Payment (BE):** `/payments/*` stub gateway + PDF invoice (migration `029`, Figma 102-5/102-121) — `PAYMENT_DEBUG=true` for dev confirm.

=======
>>>>>>> e96bd898ba8e4cf14f33ad0b4c1a509dcb24e1b7
Default DB is **Supabase** (not compose postgres). Prefer Session pooler IPv4 (`aws-0-<region>.pooler.supabase.com`).

**Admin console (BE):** `/admin` + `/api/admin` — dashboard, approvals, users, settings, audit log. Applicant docs: `POST /users/me/verification-requests`. OTP verify issues JWT for pending Owner/Referee (`nextStep: SUBMIT_VERIFICATION`).

**Owner console (BE):** `/owner` + `/api/owner` — dashboard KPI, facility CRUD, revenue report/export, customer reviews inbox (migration `009`), booking schedule timeline + owner-created walk-in bookings (migration `010`, spec `006-owner-booking-web`). Frontend lives in `spot-admin-console` (`src/pages/Owner*Page.tsx`).


<<<<<<< HEAD
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
npm run smoke:groups   # create / join / PATCH flush / members / schedule / gallery / kick / transfer / delete
npm run smoke:tournaments  # eligibility seed / create / join / match / standings / PATCH / complete
npm run seed:admin     # upsert System Administrator (ADMIN_SEED_* env)
npm run smoke:admin-approvals  # owner pending → verify → submit doc → admin approve → suspend
npm run smoke:owner-ops        # owner facility + revenue + reviews (needs 009)
npm run smoke:owner-schedule   # owner schedule GET + manual booking + 409/422 (needs 010)
npm run smoke:payment          # booking → payment create → dev confirm → invoice (PAYMENT_DEBUG)
npm run apply:homepage-card  # live DB: avatar_url, cover_url, match_favorites
npm run apply:match-search   # re-apply fold + GIN (scripts/sql, 006 already migrated)
npm run apply:match-admin    # re-apply province/city (scripts/sql, 006 already migrated)
node scripts/smoke-forgot-password.js  # register → role → verify → forgot → reset → login
npm run smoke:schedule|notifications|reviews
npm run worker:reminders
npm run worker:match-expiry   # auto COMPLETED (full) / CANCELLED (underfilled) + notify
npm run worker:payment-expiry # expire PENDING payment + cancel unpaid bookings
npm run migrate:reset                # DESTRUCTIVE: drop schemas + re-apply
```
=======
## Agent notes index
>>>>>>> e96bd898ba8e4cf14f33ad0b4c1a509dcb24e1b7

Detailed, per-domain agent notes live under [`docs/agent/`](./docs/agent/) (kept ≤300 lines/file):

| Topic | File |
| :--- | :--- |
| Commands, project layout, auth/profile summary, schema notes | [`docs/agent/00-setup-layout-env.md`](./docs/agent/00-setup-layout-env.md) |
| Vmito dev-seed import — concepts | [`docs/agent/01-vmito-import.md`](./docs/agent/01-vmito-import.md) |
| Vmito dev-seed import — commands \& scripts | [`docs/agent/02-vmito-scripts.md`](./docs/agent/02-vmito-scripts.md) |
| Matchmaking (kèo) — Figma, Manage Matches | [`docs/agent/03-matchmaking-overview.md`](./docs/agent/03-matchmaking-overview.md) |
| Matchmaking (kèo) — search, filters, rejoin rules | [`docs/agent/04-matchmaking-search.md`](./docs/agent/04-matchmaking-search.md) |
| Groups (hội) \& Tournaments (giải đấu) | [`docs/agent/05-groups-tournaments.md`](./docs/agent/05-groups-tournaments.md) |
| Referee (trọng tài) | [`docs/agent/06-referee.md`](./docs/agent/06-referee.md) |

API request/response contracts (not agent notes) live under [`docs/api/`](./docs/api/) — see [`docs/API.md`](./docs/API.md) for that index.

## Guidelines

Password rules match register (min 8, upper/lower/digit/**special char**, confirm match).
Phone: exactly 10 digits.
Invalid/expired OTP or unknown email on reset → 400 generic
(`Invalid or expired OTP`); attempt lockout → 429; resend too soon on forgot → 429.

OTP is stored **hashed** in `schema_auth.otp_verifications`. Plaintext is emailed
(and optionally returned as `debugOtp` when `OTP_DEBUG=true` and not production).

Redis keys (purpose-scoped): `otp:attempts:{email}:{purpose}`,
`otp:resend:{email}:{purpose}` (`FORGOT_PASSWORD` for this flow).


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

**Supabase Storage (file uploads — separate from the DB connection above):**
`SUPABASE_URL` (`https://<project-ref>.supabase.co`), `SUPABASE_SERVICE_ROLE_KEY`
(new-format `sb_secret_...` key works fine — just used as the client API
key, not a JWT), `SUPABASE_STORAGE_BUCKET` (`spot-uploads`). Client built in
`shared/utils/supabaseStorage.js` via `@supabase/supabase-js`'s
`createClient(url, serviceRoleKey, { auth: { persistSession: false } })`.
Three upload paths all use `multer.memoryStorage()` + `uploadBufferToStorage(path, buffer, contentType)`
(no local disk write): avatar (`avatars/<userId>-<ts><ext>`), verification
documents (`verification/<userId>-<ts><ext>`), owner facility images
(`facilities/<userId>-<ts>-<rand><ext>`). Old files are removed on replace
via `deleteFromStorage` + `storagePathFromPublicUrl`. The local
`spot-backend/uploads/` directory has been deleted; any legacy
`.../uploads/...` URL still in the DB is dead and is excluded
(`NOT LIKE '%/uploads/%'`) from venue cover-image/gallery queries rather
than migrated.

## Code Style & Conventions

Root convention applies (2 spaces, single quotes, trailing commas, camelCase
functions, PascalCase classes). No linter config exists yet — nothing to run.

## Important Guidelines

- **Compose from repo root** — there is no compose file inside `spot-backend/`. Never commit `.env` (gitignored — Supabase, SMTP App Password, JWT).
- Auth/DB uses `pg` + `ioredis` directly; file uploads use `@supabase/supabase-js` (Storage only, separate from the DB connection — see `shared/utils/supabaseStorage.js`).
- `.env.example` still lists aspirational keys (MoMo, Firebase, Maps) that nothing reads yet; SMTP/JWT/OTP/Supabase Storage keys **are** read.
- This directory is tracked by the root repo (no nested `.git`).
- **Name/gender** live on `schema_auth.user_profiles`. Login and match list `LEFT JOIN` that table (`full_name`, `gender`). Do not drop `user_profiles`. Matchmaking fee gender is `male`/`female` only (auth register still allows).
- **Matchmaking:** one join request per `(match, user)`; kick is per-kèo not per-host; waiting list is PENDING only; `GET /mine` before `GET /:id`. List: Location XOR Distance; `province`/`city` may combine with either; `hostUserId` for host profile kèo (includes FULL). Homepage browse hides FULL, caller's hosted kèo, and kèo with join request `PENDING`/`ACCEPTED`/`KICKED` (`REJECTED` reappears for re-join). Search = DB on `title`/`venueName`/`venueAddress` + `suggestions[]`. Admin dropdown = `GET /geo/vn` (pre-2025). Prices VND. Do not add waitlist / Zalo / real payment / `booking_id` / Geoapify-on-backend / 2025 ward map / NLP search / football position on squad. **Groups** = separate domain, not matchmaking.
- UI "Venue Owner" maps to DB/API role `OWNER`.
- FE role-based navigation reads `role` from login JWT / `user`. Protect APIs with `authenticate` / `requireRole` from `shared/middleware/authenticate.js`. Sample: `GET /auth/me`, `GET /users/:id`. Refresh via `POST /auth/refresh` `{ refreshToken }`.
- Style: 2 spaces, single quotes, trailing commas; camelCase / PascalCase (no linter yet)
- Full API details: [`docs/API.md`](./docs/API.md)

