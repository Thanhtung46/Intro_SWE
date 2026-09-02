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
| **T5 Docs + smoke** | Done — `docs/API.md` §9, `npm run smoke:tournaments` |

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
| Other domains | Empty scaffolds: `booking`, `venue`, `payment` (schedule read + reviews partial). **`groups` G0–G5 done.** **`tournaments` T0–T5 done.** |

Auth also under `/api/auth/*`. Matches also under `/api/matches/*`. Geo also
under `/geo` and `/api/geo`. Public users also under `/users` and `/api/users`.
Contract: [`docs/API.md`](./docs/API.md) (bản đồng bộ với [`API.md`](./API.md) ở repo root). Product locks: [`docs/MATCHMAKING_PLAN.md`](./docs/MATCHMAKING_PLAN.md) (kèo), [`docs/GROUP_PLAN.md`](./docs/GROUP_PLAN.md) (groups — **G0–G5 implemented**), [`docs/TOURNAMENT_PLAN.md`](./docs/TOURNAMENT_PLAN.md) (tournaments — **T0–T5 implemented** Aug 2026).

## Changelog bảo trì (agent / dev sau này)

Cập nhật khi ship matchmaking lớn. **Aug 2026** — Manage Matches Figma `101:98` + lifecycle kèo + review host:

| Batch | Nội dung | Migration / worker |
| :--- | :--- | :--- |
| **Lifecycle** | Browse ẩn kèo đã bắt đầu (`startsAt`); join/`canJoin` chặn sau `startsAt`; worker đủ người → `COMPLETED`, thiếu người → `CANCELLED` + notify; tab **Completed** chỉ kèo đủ người + hết giờ; `outcome`/`outcomeMessage` | `008` (notification types), `npm run worker:match-expiry`, dev `POST /matches/dev/process-expired` |
| **Manage Squad** | Pending: `avatarUrl`, `skill`, `phoneNumber`, `shareAmount`. Squad: `shareAmount`, `paymentStatus`, `skill` (HOST + player). Requests tab: `hostAvatarUrl`, `pendingCount`, `?status=PENDING\|REJECTED` | — |
| **Joiner** | `DELETE /matches/:id/join` hủy PENDING | — |
| **Review host (P3)** | `POST /matches/:id/review`; `GET /matches/:id` → `summary`; `GET /reviews/hosts/:userId/reviews`; `host.rating` live trên cards + profile; `joinedMatches` trên `GET /users/:id` | `009_schema_match_host_reviews.sql` |

**Quy tắc tab Completed (đã chốt — đừng revert):** chỉ `ends_at <= now` + `filled_count >= max_players` + `status <> CANCELLED` + participant `ACCEPTED`. **Không** gồm: host cancel, thiếu người, kicked (xem lại qua `GET /matches/:id` + notify).

**Files then touched:** `match.service.js`, `match.repository.js`, `join-request.repository.js`, `match-outcome.js`, `match-host-review.service.js`, `auth.service.js`, `notification.service.js`, tests under `tests/unit/matchmaking/` + `tests/unit/review/`.

**Aug 2026 — Groups G0–G5** (Figma Manage Groups `101:2`, detail tabs `810:*`):

| Batch | Nội dung | Migration |
| :--- | :--- | :--- |
| **G0** | Create / browse / detail; courts + recurring schedule | `010_schema_groups.sql` |
| **G1** | Join AUTO/APPROVAL; mine; favorites; kick/transfer/leave/delete | — |
| **G2** | `PATCH /groups/:id`; courts replace; joinMode→AUTO flush pending | — |
| **G3** | Members tab + search; schedule matrix; gallery CRUD (max 50) | — |
| **G4** | `API.md` §8, `CLAUDE.md`, `npm run smoke:groups` | — |
| **G5** | Inbox notifications on join/manage; migration `011` | `011_notification_group_types.sql` |

**Aug 2026 — Tournaments T0–T5** (Figma browse `880:404`, detail `880:282`, tabs Matches/Standings/Players):

| Batch | Nội dung | Migration / worker |
| :--- | :--- | :--- |
| **T0** | Create gate; browse/detail/join/mine/favorites | `012_schema_tournaments.sql` |
| **T1** | Approve/reject/kick/cancel; notifications; lifecycle worker | `013_notification_tournament_types.sql` |
| **T2** | Matches CRUD + manual results (football/badminton) | `014_schema_tournament_matches.sql` |
| **T3** | Standings PTS + tie-break | — |
| **T4** | PATCH tournament; winners; in-team player ranks; early complete | — |
| **T5** | `docs/API.md` §9; `npm run smoke:tournaments` | — |

**Aug 2026 — Vmito import (dev seed kèo):**

| Batch | Nội dung | Scripts / output |
| :--- | :--- | :--- |
| **Fetch** | Cào API Vmito → snapshot JSON (**không** ghi DB) | `fetch:vmito:50` → `data/vmito-sessions.json` |
| **Sync** | Đọc snapshot → shadow hosts + INSERT kèo Postgres | `sync:vmito` → `data/vmito-sync-report.json` |
| **Live** | Fetch + sync một lệnh | `sync:vmito:live:50` → **cả hai** file JSON |
| **Reset** | Xóa **chỉ** kèo/host Vmito trên DB (giữ kèo/user cũ) | `reset:vmito` — xem section **Vmito import → Reset dữ liệu test** |
| **Football demo seed** | ~50 kèo bóng đá HCM (synthetic — Vmito không có FOOTBALL feed) | `seed:football` / `reset:football` |
| **Scope** | Chỉ **TP.HCM (`79`) + Hà Nội (`01`)** | Chi tiết: section **Vmito import** |

**Tournaments product locks (do not revert):** tách biệt kèo + Groups; **1 giải = 1 hạng mục**; join **APPROVAL-only** (captain); create gate **80 COMPLETED host + rating ≥ 4.5**; **`hostedByLabel = SPOT`**; cancel **before startsAt only**; sau **ACTIVE** lock venue/schedule; winners + in-team ranks **manual** on PATCH.

**Groups product locks (do not revert):** skill **hard gate** on join (unlike kèo warn); `memberCount` = admin + accepted members only (**PENDING không tính** — xem bảng dưới); kicked = terminal `403`; `REJECTED` may rejoin; schedule matrix = visualization of recurring slots only (not venue booking).

**`memberCount` — khi nào tăng/giảm (đã chốt Aug 2026):**

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

**Not yet:** refresh-token rotate / JWT blacklist; admin `PENDING`→`ACTIVE` for OWNER/REFEREE; booking CRUD UI / payment. Empty scaffolds: `booking`, `venue`, `payment` (partial schedule read only).

Default DB is **Supabase** (not compose postgres). Prefer Session pooler IPv4 (`aws-0-<region>.pooler.supabase.com`).

**Admin console (BE):** `/admin` + `/api/admin` — dashboard, approvals, users, settings, audit log. Applicant docs: `POST /users/me/verification-requests`. OTP verify issues JWT for pending Owner/Referee (`nextStep: SUBMIT_VERIFICATION`).

**Owner console (BE):** `/owner` + `/api/owner` — dashboard KPI, facility CRUD, revenue report/export, customer reviews inbox (migration `009`), booking schedule timeline + owner-created walk-in bookings (migration `010`, spec `006-owner-booking-web`). Frontend lives in `spot-admin-console` (`src/pages/Owner*Page.tsx`).

## Commands

```bash
npm install
cp .env.example .env   # then fill Supabase DB_* + SMTP_* + JWT_SECRET
npm run migrate        # apply pending SQL under migrations/

# Reset kèo trên DB — chọn đúng lệnh (xem section Vmito import → Reset dữ liệu test)
npm run reset:vmito -- --dry-run     # xem trước: chỉ kèo/host Vmito import sẽ xóa
npm run reset:vmito                  # xóa kèo/host Vmito import — GIỮ kèo smoke/tay + user thật
npm run reset:matches                # TRUNCATE **toàn bộ** kèo — dùng cẩn thận (xóa cả smoke/manual)

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
npm run apply:homepage-card  # live DB: avatar_url, cover_url, match_favorites
npm run apply:match-search   # re-apply fold + GIN (scripts/sql, 006 already migrated)
npm run apply:match-admin    # re-apply province/city (scripts/sql, 006 already migrated)
node scripts/smoke-forgot-password.js  # register → role → verify → forgot → reset → login
npm run smoke:schedule|notifications|reviews
npm run worker:reminders
npm run worker:match-expiry   # auto COMPLETED (full) / CANCELLED (underfilled) + notify
npm run migrate:reset                # DESTRUCTIVE: drop schemas + re-apply

# Vmito — cào kèo công khai (dev/demo seed; xem section **Vmito import** below)
npm run fetch:vmito                  # mặc định --limit 12
npm run fetch:vmito:50               # lấy 50 kèo eligible (HCM+Hà Nội)
npm run fetch:vmito:100
npm run fetch:vmito:500              # cào tối đa 500 kèo eligible (lâu hơn)
npm run fetch:vmito:1000             # cào tối đa 1000 kèo eligible (rất lâu)
npm run fetch:vmito -- --limit 25    # tùy chỉnh
npm run sync:vmito                     # ghi DB từ file JSON (users + matches)
npm run sync:vmito:live                # fetch Vmito rồi sync DB (1 lệnh)
npm run sync:vmito:live:50             # fetch 50 kèo rồi sync
npm run sync:vmito:live:500            # fetch 500 kèo rồi sync
npm run sync:vmito:live:1000           # fetch 1000 kèo rồi sync
npm run sync:vmito -- --dry-run        # mô phỏng sync, không ghi DB

# Football demo seed (synthetic HCM kèo — không cào Vmito)
npm run seed:football                  # mặc định 50 kèo
npm run seed:football -- --count 30
npm run seed:football -- --dry-run
npm run reset:football -- --dry-run
npm run reset:football                 # xóa chỉ kèo/host football.*@import.spot.local

# Host groups + tournaments seed (default: thaicuongpk@gmail.com)
npm run seed:host-gt:10                # 10 groups + 10 tournaments (full fields)
npm run seed:host-gt -- --groups 5 --tournaments 1
npm run seed:host-gt:badminton         # chỉ BADMINTON
npm run seed:host-gt -- --dry-run      # xem plan, không ghi DB
# HOST_EMAIL=... HOST_PASSWORD=... npm run seed:host-gt:10

# Reset chỉ dữ liệu Vmito (sau khi đã sync) — không xóa kèo/user cũ trên DB
npm run reset:vmito -- --dry-run       # đếm kèo + shadow host sẽ xóa
npm run reset:vmito                    # xóa thật → có thể sync:vmito lại
```

Docker from **repo root** `Intro_SWE/`:

```bash
docker compose up -d --build redis backend
docker compose run --rm backend npm run migrate
docker compose run --rm backend npm run seed:football              # đẩy 50 kèo bóng đá demo vào DB
docker compose run --rm backend npm run reset:football -- --dry-run
docker compose run --rm backend npm run reset:football             # xóa chỉ seed bóng đá
docker compose run --rm backend npm run reset:vmito -- --dry-run   # preview (Vmito only)
docker compose run --rm backend npm run reset:vmito                # delete Vmito import only
docker compose run --rm backend npm run reset:matches              # TRUNCATE all kèo — destructive
docker restart spot-backend
docker compose logs -f backend
docker compose down

```

Compose uses `env_file: ./spot-backend/.env`, forces `REDIS_HOST=redis`. Optional local Postgres: `docker compose --profile local-db up -d postgres` (do not `depends_on` it while on that profile).

## Vmito import (dev seed kèo)

**Mục đích:** Lấy kèo cầu lông/bóng đá thật từ [Vmito](https://vmito.com/vi) để **seed DB SPOT** cho dev/demo/QA — thay vì crawl Facebook (unstructured, ToS rủi ro). **Dev/demo only** — tôn trọng ToS Vmito; không hammer server.

**Aug 2026 — đã implement:** `scripts/fetch-vmito-listings.js`, `scripts/sync-vmito-to-spot.js`, `scripts/reset-vmito-import.js`, `scripts/lib/vmito-parser.js`, `scripts/lib/vmito-sync.js`, `scripts/lib/vmito-venue-dedupe.js`.

**Đọc section này trước khi chạy fetch/sync** — không cần context chat; mọi quyết định thiết kế (phạm vi tỉnh, 2 file JSON, free listing, shadow host) đều ghi ở đây.

### Tóm tắt cho team mới

| Câu hỏi | Trả lời ngắn |
| :--- | :--- |
| Fetch có ghi DB không? | **Không** — chỉ ghi `data/vmito-sessions.json` |
| Sync ghi gì? | **Postgres** (users + matches) + `data/vmito-sync-report.json` |
| Chỉ lấy kèo tỉnh nào? | **TP.HCM (`79`) + Hà Nội (`01`)** — Bình Dương, Bắc Ninh, … bị bỏ |
| Kèo import có gắn catalog sân SPOT/Vmito không? | **Không** — **free listing** (text + mã tỉnh/quận + lat/lng), giống user host tay |
| Host Vmito có login được app không? | **Không** (account thật) — sync tạo **shadow user** `@import.spot.local` cho dev |
| Sync lại có ghi đè kèo cũ không? | **Không** — skip nếu slug đã import; muốn import lại từ đầu: **`npm run reset:vmito`** rồi `sync:vmito` (giữ kèo/user khác) |
| Xóa dữ liệu Vmito test mà không đụng DB cũ? | **`npm run reset:vmito`** — xóa kèo có link Vmito trong `notes` + shadow host `@import.spot.local`; **không** xóa kèo smoke/tay hay user đăng ký OTP |
| Khác gì báo cáo PA (PA0–PA2)? | PA mô tả kèo gắn **booking**; triển khai hiện tại là **free listing** (matchmaking đã ship) |

### Pipeline 2 bước

```
Vmito public API                    Postgres (Supabase)
GET /api/sessions/public                    │
        │                                   │
        ▼  npm run fetch:vmito*             │
 data/vmito-sessions.json  ────────────────►│  npm run sync:vmito*
 (snapshot — xem/sửa/sync lại)              │       │
                                            ▼       ▼
                                    matches + shadow users
                                            │
                                            └──► data/vmito-sync-report.json
                                                 (biên bản lần sync)
```

- **Bước 1 — Fetch:** cào + map sang body `POST /matches`, lưu JSON. **An toàn** — chạy thoải mái, không đụng DB.
- **Bước 2 — Sync:** đọc `spotDrafts[]` từ JSON, tạo host + kèo. **Cần** `DB_*` trong `.env`.

### Hai file JSON — khác nhau, đừng nhầm

| File | Sinh ra khi | Ghi DB? | Dùng để |
| :--- | :--- | :--- | :--- |
| **`data/vmito-sessions.json`** | `fetch:vmito*` hoặc `sync:vmito:live*` (bước fetch) | **Không** | Snapshot nguồn: raw `sessions[]` Vmito + `spotDrafts[]` (body SPOT đã map). Xem trước khi sync; sync lại nhiều lần từ cùng file. **Ghi đè** mỗi lần fetch. |
| **`data/vmito-sync-report.json`** | `sync:vmito*` (kể cả `--dry-run`) | Sync mới ghi DB | **Biên bản** lần sync: `created` / `skipped` / `failed` từng slug, `matchId`, `hostEmail`, lý do skip. **Ghi đè** mỗi lần sync. |

**Hay nhầm:** chạy `npm run sync:vmito` (không `--fetch`) → **chỉ** cập nhật report + DB, **không** refresh `vmito-sessions.json`. Muốn cả hai file mới: `npm run sync:vmito:live:50`.

**Cấu trúc `vmito-sessions.json` (metadata đầu file):**

| Field | Ý nghĩa |
| :--- | :--- |
| `fetchedAt` | Thời điểm fetch |
| `provinceScope` | `["79","01"]` — phạm vi import |
| `requestedLimit` / `count` | Số kèo yêu cầu / số kèo lưu (sau lọc tỉnh) |
| `eligibleCount` | Số kèo `syncEligible: true` (đủ SĐT host + địa chỉ + lat/lng + province/city + body hợp lệ) |
| `unsupportedSkipped` | Số kèo Vmito bị bỏ vì ngoài HCM/Hà Nội (trong lần paginate) |
| `venueTimeDuplicatesSkipped` | Số kèo bỏ vì **trùng tên sân + trùng giờ** với kèo khác trong cùng fetch |
| `inactiveStatusSkipped` | Số kèo bỏ vì **FINISHED / CANCELLED** (đã qua hoặc hủy — không import) |
| `sessions[]` | Raw từ Vmito API |
| `spotDrafts[]` | Bản map SPOT + flags `supportedProvince`, `syncEligible`, `spotCreateBody` |

**Cấu trúc `vmito-sync-report.json`:**

| Field | Ý nghĩa |
| :--- | :--- |
| `dryRun` | `true` nếu `--dry-run` (không INSERT) |
| `created` / `skipped` / `failed` | Tổng hợp |
| `hostsCreated` | Shadow user mới |
| `hostSkillsApplied[]` | Skill upsert sau sync |
| `results[]` | Chi tiết từng kèo: `status`, `reason`, `matchId`, `hostEmail`, … |

### Cách lấy data

**Primary:** Vmito public API (không cần auth):

```
GET https://vmito.com/api/sessions/public?page=1&limit=50
→ { data: { data: Session[], total, page, limit, totalPages } }
```

Script paginate tới `--limit` (hoặc `VMITO_FETCH_LIMIT`). **~1789+ kèo** trên Vmito **toàn quốc**; pipeline **chỉ giữ TP.HCM + Hà Nội** khi build snapshot và khi sync.

**Phạm vi địa lý (Aug 2026 — đã chốt):**

| Tỉnh | Mã SPOT (`GET /geo/vn`) | Fallback quận nếu map thất bại |
| :--- | :--- | :--- |
| TP.HCM | `79` | `778` (Quận 7) |
| Hà Nội | `01` | `001` (Quận Ba Đình) |

**Nhận diện tỉnh** (trong `vmito-parser.js`):

1. `venue.city` / `customLocationCity` / địa chỉ / `externalSource` / mô tả (text “Hồ Chí Minh”, “Hà Nội”, …)
2. Tọa độ trong bounding box HCM hoặc Hà Nội (khi thiếu tên tỉnh)
3. Không xác định được → **bỏ qua** (không vào JSON khi fetch; skip khi sync file cũ)

**Map quận/huyện:** tên quận Vmito → mã `city` trong `vn-admin.json` (pre-2025). HCM: alias Quận 9 → Thủ Đức (`769`); normalize `đ`→`d`. Flag `cityResolved: false` nếu dùng fallback quận.

**Ưu tiên sync-eligible** (`syncEligible: true` trên `spotDrafts[]`):

- Thuộc **HCM hoặc Hà Nội**
- Có `hostPhone` VN hợp lệ
- Có `venueName`, **`venueAddress`**, **`latitude` + `longitude`**, `province`, `city`
- Status **`PREPARING` hoặc `IN_PROGRESS`** — **bỏ** `FINISHED` / `CANCELLED`
- Có title, venue, startsAt, courts

Fetch **chỉ lấy eligible** (không pad bằng kèo thiếu địa chỉ/tọa độ). Sync **skip** draft `syncEligible: false`.

Nếu không đủ `N` kèo eligible trong phạm vi 2 tỉnh → **bổ sung fallback** (vẫn phải thuộc HCM/Hà Nội) cho đủ `N` hoặc hết trang Vmito.

**Legacy (deprecated):** homepage RSC `initialSessions` (~12 rows) — `fetchVmitoListingsFromHomepage()`.

| Nguồn | Ghi chú |
| :--- | :--- |
| `/api/sessions/public` | Dùng mặc định; pagination `page` + `limit` (max ~100/page) |
| Homepage HTML | Chỉ ~12 session; không paginate |

### Lệnh — fetch vs ghi DB vs file output

| Lệnh | Ghi DB? | `vmito-sessions.json` | `vmito-sync-report.json` |
| :--- | :--- | :--- | :--- |
| `npm run fetch:vmito` | **Không** | ✅ ghi đè (default 12) | ❌ |
| `npm run fetch:vmito:50` | **Không** | ✅ ghi đè | ❌ |
| `npm run fetch:vmito:100` | **Không** | ✅ ghi đè | ❌ |
| `npm run fetch:vmito:500` | **Không** | ✅ ghi đè | ❌ |
| `npm run fetch:vmito:1000` | **Không** | ✅ ghi đè | ❌ |
| `npm run sync:vmito` | **Có** | ❌ chỉ đọc | ✅ ghi đè |
| `npm run sync:vmito:live` | **Có** | ✅ fetch + ghi | ✅ ghi đè |
| `npm run sync:vmito:live:50` | **Có** | ✅ fetch + ghi | ✅ ghi đè |
| `npm run sync:vmito:live:500` | **Có** | ✅ fetch + ghi | ✅ ghi đè |
| `npm run sync:vmito:live:1000` | **Có** | ✅ fetch + ghi | ✅ ghi đè |
| `npm run sync:vmito -- --dry-run` | **Không** | ❌ chỉ đọc | ✅ (mô phỏng) |
| `npm run sync:vmito -- --file path.json` | **Có** | ❌ đọc file chỉ định | ✅ ghi đè |
| `npm run reset:vmito -- --dry-run` | **Không** | ❌ | ❌ |
| `npm run reset:vmito` | **Có** (xóa Vmito) | ❌ | ❌ |

**Script reset Vmito:** `scripts/reset-vmito-import.js` (`npm run reset:vmito`).

**Yêu cầu sync:** `.env` có `DB_*` (Supabase pooler). **Không cần** server API chạy — sync gọi trực tiếp `createMatch` + `userRepository`.

**Legacy (tránh dùng):** `npm run fetch:vmito -- --import --email ... --password ...` — ghi DB qua HTTP `POST /matches`, cần server + JWT; **mọi kèo gán 1 account login**, không tạo host theo SĐT Vmito. Prefer **`sync:vmito`**.

### Đồng bộ với model kèo SPOT (app)

Import map sang **cùng schema** user host kèo qua `POST /matches` (**free listing**):

| SPOT field | Nguồn import |
| :--- | :--- |
| `venueName`, `venueAddress` | Text từ Vmito |
| `province`, `city` | Mã pre-2025 từ `GET /geo/vn` — **không** copy `venueId` Vmito |
| `latitude`, `longitude` | Vmito `lat`/`lng` nếu có |
| `courts[]` | Tên sân con Vmito |

**Không đồng bộ:** catalog sân Vmito, `schema_venue`, booking, roster player Vmito, club Vmito. Filter `GET /matches?province=&city=` và card `provinceName`/`cityName` hoạt động như kèo user tạo tay.

**Không import:** Vmito `venueId`, players đã join, club, cover (thường null).

### Mapping Vmito → SPOT (`POST /matches` body)

| Vmito | SPOT |
| :--- | :--- |
| `sportType` BADMINTON/FOOTBALL | `sport` |
| `defaultMatchType` SINGLES/DOUBLES | `format` |
| `feeConfig.femaleFee` / `maleFee` (×1000 VND) | `GENDER_RANGE` `priceMin`/`priceMax` |
| `feeConfig.splitTotal` | `SPLIT_EVENLY` `priceMin` |
| `requiredLevels[]` (rank 1–10) | `skillMin`/`skillMax` hoặc `allLevels` |
| `venue`, lat/lng, district, city | `venueName`, `venueAddress`, `province` (`79` / `01`), `city` (quận/huyện) |
| Quận 9 (Vmito cũ) | alias → **Thành phố Thủ Đức** (`769`); normalize `đ` → `d` |
| Tỉnh ngoài HCM/Hà Nội | **Bỏ qua** khi fetch/sync |
| `hostName`, `hostPhone` | **Không** map vào create body — host = user SPOT (below) |
| Mô tả + SĐT host | `notes` (mô tả Vmito + liên hệ; tag nội bộ `[vmito-import:{slug}]` cho sync/reset — **không** hiện link Vmito) |

Thiếu quận → fallback `city`: HCM **`778`**, Hà Nội **`001`**; flag `cityResolved: false`.

### Host / tài khoản — quan trọng

Host trên Vmito **không tồn tại sẵn** trong SPOT (user system riêng: `hostId` CUID Vmito vs `user_id` serial SPOT). Sync **tạo shadow PLAYER**:

| Field | Giá trị import |
| :--- | :--- |
| Email | `vmito.{hostIdSuffix}@import.spot.local` |
| Phone | SĐT Vmito nếu hợp lệ; không có → synthetic `09xxxxxxxx` (hash `hostId`) |
| Password | `Password1!` (hoặc `VMITO_IMPORT_PASSWORD`) |
| Role | `PLAYER`, `email_verified_at` + `role_selected_at` set ngay (không OTP) |
| Skill | `user_sport_skills`: **skillMax cao nhất** trên các kèo host set (bỏ qua `allLevels`); upsert sau sync |

Nhiều kèo cùng host Vmito → **1 user SPOT** (cache theo `hostId`). SĐT host vẫn nằm trong `notes` kèo cho liên hệ; **không** phải account thật của họ trên app.

### Đăng nhập host import (dev / QA)

Sau `npm run sync:vmito`, email host nằm trong `data/vmito-sync-report.json` (`hostEmail` từng dòng `created`) hoặc suy ra từ `hostId` Vmito.

| | |
| :--- | :--- |
| **API** | `POST /auth/login` `{ "email", "password" }` |
| **Email** | `vmito.{hostIdSuffix}@import.spot.local` — suffix = 24 ký tự cuối `hostId` (chữ/số), vd. `cmrtks1bg00nonu01ccl0vw6j` → `vmito.mrtks1bg00nonu01ccl0vw6j@import.spot.local` |
| **Password** | `Password1!` hoặc env `VMITO_IMPORT_PASSWORD` |
| **Tra cứu nhanh** | `vmito-sync-report.json` → `results[].hostEmail` + `hostUserId`; hoặc Supabase `schema_auth.users` `WHERE email LIKE 'vmito.%@import.spot.local'` |

Ví dụ (server đang chạy):

```bash
curl -s -X POST http://127.0.0.1:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"vmito.msh3lgct0086o7015n9adac4@import.spot.local","password":"Password1!"}'
```

→ `{ accessToken, refreshToken, user }` — host quản lý kèo qua `GET /matches/mine`, `PATCH /matches/:id`, v.v.

**Lưu ý:** Account import **không** phải user Vmito thật; không dùng email/password Vmito gốc. User đăng ký tay trên app (`POST /auth/register` + OTP) **không** liên quan các email `@import.spot.local`.

### Chính sách ghi DB — thêm mới, không ghi đè

| Thành phần | Hành vi |
| :--- | :--- |
| Kèo đã import (cùng slug Vmito) | **Skip** — giữ row cũ |
| Kèo mới | **INSERT** |
| Kèo/user tạo tay trên app | **Không đụng** |
| File `vmito-sessions.json` | **Ghi đè** mỗi lần fetch |
| Skill host import | **Upsert** (`user_sport_skills`) |

**Không** tự `UPDATE`/`DELETE` kèo cũ khi sync lại.

### Reset dữ liệu test Vmito (không ảnh hưởng dữ liệu cũ trên DB)

Dùng khi đã **`sync:vmito`** lên DB và muốn **gỡ chỉ phần import Vmito** để fetch/sync lại — **không** xóa kèo smoke, kèo tạo tay, user đăng ký OTP, groups, tournaments.

| Lệnh | Tác dụng |
| :--- | :--- |
| `npm run reset:vmito -- --dry-run` | Đếm trước: số kèo + shadow host sẽ xóa (không đụng DB) |
| `npm run reset:vmito` | Xóa kèo Vmito + shadow host orphan (transaction) |
| `npm run reset:matches` | **Xóa toàn bộ kèo** mọi nguồn — **không dùng** nếu chỉ muốn gỡ Vmito |

**Quy trình import lại (khuyến nghị):**

```bash
npm run reset:vmito -- --dry-run   # 1. xem số dòng sẽ xóa
npm run reset:vmito                # 2. xóa Vmito trên DB
npm run sync:vmito                 # 3. đẩy lại từ data/vmito-sessions.json
# hoặc fetch mới rồi sync:
npm run sync:vmito:live:50         # fetch + sync một lệnh
```

**Cách nhận diện trên DB (script dùng điều kiện này):**

| Entity | Điều kiện xóa |
| :--- | :--- |
| Kèo | `notes` chứa `[vmito-import:` hoặc (legacy) `vmito.com/vi/sessions/` |
| Shadow host | `schema_auth.users.email LIKE 'vmito.%@import.spot.local'` **và** sau khi xóa kèo không còn host kèo nào |

**Cascade:** xóa kèo → courts, join requests, favorites liên quan (FK). **Không xóa:** user đăng ký app (`@gmail`, …), kèo không có link Vmito trong `notes`, groups/tournaments.

**Không đụng file JSON:** `data/vmito-sessions.json` và `vmito-sync-report.json` vẫn trên disk — chỉ DB được reset phần Vmito.

**Docker (từ `Intro_SWE/`):**

```bash
docker compose run --rm backend npm run reset:vmito -- --dry-run
docker compose run --rm backend npm run reset:vmito
```

**So sánh nhanh:**

| | `reset:vmito` | `reset:matches` |
| :--- | :--- | :--- |
| Kèo Vmito import | ✅ xóa | ✅ xóa |
| Kèo smoke / tạo tay | ❌ giữ | ❌ xóa hết |
| User đăng ký OTP | ❌ giữ | ❌ giữ (chỉ TRUNCATE matches) |
| Shadow host Vmito | ✅ xóa (nếu không còn kèo) | ❌ giữ (user row còn) |

Sau `reset:vmito`, `sync:vmito` coi mọi slug là mới → **INSERT** lại (không skip `already synced`).

### Sync — skip / sanitize (thiếu sót OK)

| Trường hợp | Hành vi |
| :--- | :--- |
| **Cùng tên sân + trùng/overlap giờ** (trong file hoặc DB) | **Skip** — giữ kèo đầu tiên; **không** đổi tên/slug |
| Tỉnh ngoài HCM/Hà Nội | **Skip** — không fetch vào JSON / không sync |
| Đã sync (notes chứa slug Vmito) | **Skip** — idempotent |
| **Trùng tên sân + trùng giờ** (DB hoặc cùng batch import) | **Skip** — không đẩy 2 kèo cùng venue + overlapping time |
| Trùng pitch + giờ + sân con (409 occupancy SPOT) | **Skip** — fallback nếu lọc trên chưa bắt |
| `startsAt` quá khứ | Bump +7 ngày/lần tối đa 52 tuần |
| `coverUrl` | Giữ ảnh thật từ Vmito (`session`/`venue`/`images`) nếu có. **Không** dùng avatar host. Badminton thiếu cover → ảnh sân bundled trên mobile; Football thiếu → stock photo |
| Skill thiếu khi `allLevels=false` | → `allLevels: true` |
| Tên sân trùng trên 1 kèo | Suffix `(2)`, `(3)`… |
| Validation Zod fail | **Skip** + ghi reason trong report |

### Kết quả mẫu (Aug 2026)

| Lần chạy | Kết quả |
| :--- | :--- |
| Fetch 12 → sync lần đầu | **11 created**, **1 skipped** (overlap sân cùng giờ), **9 hosts**, matchId ~1000–1010 |
| Sync lại cùng file | **0 created**, **12 skipped** (`already synced`) — report ghi `matchId` cũ |
| Fetch 50 (scope HCM+Hà Nội) | **50** trong JSON, `unsupportedSkipped: 2` (Bắc Ninh, …), ~48 HCM + ~10 Hà Nội trong mẫu |

### Scripts / layout

```
scripts/
├── fetch-vmito-listings.js       # fetch only → vmito-sessions.json
├── sync-vmito-to-spot.js         # read JSON → DB + vmito-sync-report.json
└── lib/
    ├── vmito-parser.js           # API fetch, province filter, map draft
    └── vmito-sync.js             # shadow host, sanitize, createMatch, skip rules
data/
├── vmito-sessions.json           # INPUT snapshot (fetch / live fetch)
└── vmito-sync-report.json        # OUTPUT biên bản sync
```

**Env tùy chọn:** `VMITO_FETCH_URL`, `VMITO_FETCH_LIMIT`, `VMITO_IMPORT_PASSWORD`.

**Export constants (parser):** `SUPPORTED_PROVINCE_CODES` = `['79','01']`, `HCM_PROVINCE_CODE`, `HANOI_PROVINCE_CODE`.

**Không implement:** import toàn quốc, claim listing cho host Vmito thật, import player roster, sync 2 chiều, liên kết `venueId` Vmito ↔ SPOT catalog.

## Layout

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
├── domains/groups/
│   ├── routes.js
│   ├── controller/group.controller.js
│   ├── dto/{create,list,update,join,list-mine,my-join-requests,list-members,schedule-query,gallery}.dto.js
│   ├── entity/group.entity.js
│   ├── repository/{group,group-court,group-schedule,group-member,group-join-request,group-favorite,group-gallery}.repository.js
│   └── service/group.service.js
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
├── 008_notification_match_types.sql  # MATCH_CANCELLED + MATCH_EXPIRED_UNDERFILLED on inbox.type
├── 009_schema_match_host_reviews.sql   # pickup kèo participant → host rating
├── 010_schema_groups.sql               # sport groups (hội)
├── 011_notification_group_types.sql    # GROUP_* inbox types
├── 007_schema_venue_images.sql   # venue gallery URLs
├── 008_schema_admin.sql          # admin verification + settings
├── 009_schema_owner_ops.sql      # owner field pricing + revenue indexes
├── 010_schema_owner_schedule.sql # guest_name/guest_phone on bookings (owner walk-ins)
├── README.md
scripts/
├── migrate.js / check-db.js / reset-matches.js
├── apply-homepage-card.js / apply-match-search.js / apply-match-admin.js
├── fetch-vmito-listings.js / sync-vmito-to-spot.js
├── lib/vmito-parser.js / lib/vmito-sync.js
├── smoke-register.js / smoke-otp-flow.js / smoke-login.js
├── smoke-forgot-password.js / smoke-matches.js / smoke-groups.js
data/
├── vmito-sessions.json           # Vmito fetch snapshot (git-tracked optional)
├── vmito-sync-report.json        # last sync report
docs/
├── API.md
├── MATCHMAKING_PLAN.md
├── GROUP_PLAN.md
├── TOURNAMENT_PLAN.md
tests/unit/
├── auth/*.dto.test.js
├── matchmaking/*.dto.test.js
├── groups/*.test.js
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

Pickup **kèo** matches only in `schema_matchmaking` (Groups live in separate `schema_groups`). Sports: `BADMINTON`, `FOOTBALL`.
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
| **Advanced (FE required)** | `format`, `maxPlayers`, `coverUrl` (URL). `joinMode` default `AUTO`. `maxPlayers` min by format (incl. host): Singles 2, Doubles 4, 5v5 10, 7v7 14, 11v11 22; max 40. |
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
| **Completed** | Host + participant | `GET /matches/mine?tab=completed` | **Chỉ** kèo đã hết giờ (`endsAt <= now`), **đủ người** (`filledCount >= maxPlayers`), `status <> CANCELLED`, participant **`ACCEPTED`**. **Không** gồm: host cancel, hết giờ thiếu người, kicked. Card có `outcome` / `outcomeMessage`. |
| **Join Requests** | Joiner only | `GET /matches/my-join-requests` | Caller’s **`PENDING`** + **`REJECTED`**. Sort: PENDING first. **`ACCEPTED`** → Active tab. **`KICKED`** **không** vào Completed — xem lại qua detail nếu cần. |

**Host duyệt request — không có tab gộp**

Host **does not** use Join Requests tab. Flow:

1. `GET /matches/mine?tab=active` → card with `myRole: HOST`
2. Tap card → Match detail (`100:401` — **host variant**: waiting list + Edit/Cancel; Figma joiner frame exists, host frame TBD)
3. `GET /matches/:id/requests` → PENDING only (`avatarUrl`, `skill`, `shareAmount`, `phoneNumber`)
4. `POST .../accept` \| `POST .../reject` \| joiner `DELETE .../join` (hủy PENDING)

**List item shape (`GET /matches/mine`)**

Same public match card as Homepage **plus**:

| Field | Notes |
| :--- | :--- |
| `myRole` | `HOST` \| `PARTICIPANT` |
| `myRequestStatus` | Participant: `ACCEPTED` (active) hoặc `KICKED` (không còn Active; **không** lên Completed tab). Host: `null` |
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
{ "total", "pendingCount", "requestId", "status", "heads", "message", "shareAmount", "paymentStatus", "match": { "matchId", "title", "startsAt", "venueName", "hostFullName", "hostAvatarUrl", ... } }
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

Figma `101:98` ships empty Active only. Filled states = reuse Homepage card + chips above. Pro Tip card = static FE copy.

**Homepage 1 (Figma `95:2675` / list `95:2417`) — BE complete**

Product review locked. Do **not** re-open unless FE finds a gap.

| Topic | BE | Notes |
| :--- | :--- | :--- |
| **Search (`location=`)** | **Done** | Full spec in **Homepage search** below. Postgres only — **not** Geoapify, **not** NLP/AI. |
| **Suggestions while typing** | **Done** | Same `GET /matches?location=` returns `suggestions[]` (max 5). FE debounces per keystroke. |
| **Public browse list** | **Done** | `OPEN` + spots left + `startsAt > now` (chưa bắt đầu); **`FULL` hidden**. Also hides caller’s hosted kèo + join `PENDING`/`ACCEPTED`/`KICKED`; **`REJECTED` reappears** — see **Manage Matches** browse exclusion. |
| **Hosted Matches on profile** | **Done** | `GET /matches?hostUserId=` still returns `OPEN` **and** `FULL` (future `endsAt`). |
| **Filter tỉnh/quận** | **Done** | `province` + `city` exact codes from `GET /geo/vn` (pre-2025 63 tỉnh + quận/huyện). |
| **Filter sport / date / time / skill / price** | **Done** | `skill` needs `sport`; prices in **VND**; skill chip labels map to codes in `sports.js`. |
| **Distance filter** | **Done** | `latitude` + `longitude` + `radiusKm` (0–50 km). **XOR** with `location` → `400`. |
| **Favorites filter** | **Done** | `favorited=true`. Same browse-exclusion rule as default list. |
| **Card fields** | **Done** | `coverUrl`, `host`, `isFavorited`, `participantAvatars`, `province`/`city` + names, `spotsLeft`, `yourShare` (VND). |
| **Card location display** | FE | Show `{venueName}, {cityName}`; distance from user GPS = FE (Haversine or map). |
| **Logo → Home / Avatar → Profile** | FE | Nav only — no BE endpoint. |
| **Sparkles (AI search)** | **Out of scope** | Search is text SQL only. |
| **Notification bell** | **Done (BE)** | `GET /notifications`, `/unread-count`, mark read; match cancel types `MATCH_CANCELLED` |
| **Groups tab** | **Out of scope (kèo)** | Implemented under `/groups` — see **Groups (hội)**. |
| **Tournaments tab** | **Out of scope (kèo)** | Product locked — separate `/tournaments` domain; see **Tournaments (giải đấu)**. |
| **Booking / Schedule** | **Out of scope** | Free listing, no `booking_id`. |
| **Host rating on card** | **Done** | `host.rating` + `host.reviewCount` from `match_host_reviews`; `null` until có review |
| **FAB Host / Manage** | **Done (BE)** | Create = `POST /matches` / bulk. Manage = **Manage Matches 101:98** section. |

**API map**

| Method | Path | Notes |
| :--- | :--- | :--- |
| `POST` | `/matches` | PLAYER host; single kèo |
| `POST` | `/matches/bulk` | Same template + `schedules[]` (Vmito multi-publish) |
| `GET` | `/matches/venue-suggestions` | Host location picker (wide venue pool) |
| `GET` | `/matches` | Browse: excludes FULL, hosted, joined/pending/kicked; **`REJECTED` visible**. `hostUserId` → also `FULL` |
| `GET` | `/geo/vn` | Pre-2025 63 tỉnh + 705 quận/huyện (static JSON, Bearer) |
| `GET` | `/matches/mine` | Manage Active/Completed — `myRole`, `pendingRequestCount`, `outcome` |
| `GET` | `/matches/my-join-requests` | Joiner tab — `pendingCount`, `?status=`, `match.hostAvatarUrl` |
| `GET` | `/matches/:id` | Detail + `summary` (View Summary / review) + `participants[]` |
| `DELETE` | `/matches/:id/join` | Joiner hủy PENDING |
| `POST` | `/matches/:id/review` | Participant đánh giá host (kèo reviewable) |
| `POST` / `DELETE` | `/matches/:id/favorite` | Heart |
| `POST` | `/matches/:id/join` | PLAYER; `message?`, `phoneNumber?`, `guests?` |
| `GET` | `/matches/:id/requests` | Host; PENDING — `avatarUrl`, `skill`, `shareAmount`, phones |
| `POST` | `/matches/:id/requests/:requestId/accept\|reject` | Host |
| `POST` | `/matches/:id/participants/:userId/kick` | Host |
| `PATCH` | `/matches/:id` | Host; before `startsAt` |
| `POST` | `/matches/:id/cancel` | Host; notify joiners |
| `GET` | `/reviews/hosts/:userId/reviews` | Check Profile — reviews host nhận |
| `GET` | `/users/:id` | Public profile — `matchCount`, `joinedMatches`, `rating`, `reviewCount` |

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
`latitude`+`longitude`+`radiusKm` (0–50, haversine; all three together;
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
2. **Fuzzy** — **single-token only** (no spaces), length ≥ `FUZZY_MIN_CHARS`
   (4), max `similarity()` ≥ `LIST_SIMILARITY` (0.4). Multi-word queries like
   `san t12` **do not** fuzzy-match neighbors (`san t19`).
3. **Multi-word AND** — query contains spaces → every non-empty token must
   appear in the **same** field (`title` **or** `venue_name` **or**
   `venue_address`). Tokens are **not** allowed to be split across fields
   (avoids picking a venue suggestion then flooding the feed with unrelated
   kèo that only share common words like "cầu" / "lông").

**Suggestions (`suggestions[]`) — while user types**

Returned on the **same** `GET /matches` when `location` is present (FE should
debounce, e.g. 300 ms). Built from listable kèo only (same pool as browse:
`OPEN`, spots left, `startsAt > now`).

| Property | Value |
| :--- | :--- |
| Max items | 5 (`MATCH_SEARCH.SUGGEST_LIMIT`) |
| Shape | `{ text, kind }` |
| `kind` | `title` \| `venueName` \| `venueAddress` |
| Source | Distinct values from existing kèo (not Geoapify) |
| Dedup | By folded `text`; best score wins |
| Excludes | — |
| Score threshold | exact / substring / same-field tokens; fuzzy only for single-token queries (length ≥ 4, ≥ `SUGGEST_SIMILARITY` 0.3) |
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
`province`, `provinceName`, `city`, `cityName`. `host.rating` / `host.reviewCount` live (pickup kèo reviews).
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
  (`priceMin` = total; `yourShare = ceil(priceMin / maxPlayers)`). No `FREE`.
  Payment is a stub: `paymentStatus: SUCCESS` + recorded `shareAmount`.
- Recurring / multi-day flags exist, default off — do not generate extra dates.

**Slots / join (Figma Join Match)**

- Host counts as **1** at create (`filledCount: 1`).
- Join adds `1 + guests.length` heads (AUTO immediately; APPROVAL on accept).
  FE “Send Request (2)” = that number.
- **`yourShare`** (runtime on match card): `ceil(priceMin / maxPlayers)` preview for viewer.
- **`shareAmount`** (on join request / accepted participant): locked at join/accept for joiner + guests; Figma “Paid: 50k”.
- Join / accept / `POST` blocked when `startsAt <= now` (`assertJoinable`, `canJoin: false`).
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

`fullName`, `avatarUrl`, `createdAt`, `skills`, `matchCount`, `joinedMatches`,
`rating`, `reviewCount` (live từ `match_host_reviews`; `null`/`0` nếu chưa có review).
No `email` / `phoneNumber` / `role` / `status` / `gender`.
Reviews section = `GET /reviews/hosts/:userId/reviews`.
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
| Joiner cancel PENDING | `DELETE /matches/:id/join` — **DELETE** row (not `REJECTED`); may join again |

`GET /matches/:id/requests` is the **waiting list**: `PENDING` only.
Accepted people are on `participants` in match detail (`shareAmount`, `paymentStatus`, `skill` — cả HOST). `yourRequest` on detail
is `PENDING` / `ACCEPTED` / `KICKED` (not `REJECTED` — they may join again).

**Match expiry / Completed lifecycle**

- Browse (`GET /matches`): chỉ `OPEN`, còn slot, **`startsAt > now`**.
- Hết giờ **đủ người**: worker `processExpiredFullMatches` → `status = COMPLETED` (nhả sân); vào tab Completed.
- Hết giờ **thiếu người**: `processExpiredUnderfilledMatches` → `CANCELLED` (không COMPLETED); reject `PENDING`; notify host + joiners (`MATCH_CANCELLED`, `data.reason = EXPIRED_UNDERFILLED`).
- Host cancel: `POST /matches/:id/cancel` → notify joiners (`data.reason = HOST_CANCEL`); **không** vào Completed.
- `listMine` gọi expiry processors trước query. Dev: `POST /matches/dev/process-expired`. Prod: `npm run worker:match-expiry`.
- `outcome` / `outcomeMessage` trên `GET /matches/:id` và completed cards (`COMPLETED` \| `CANCELLED`).

**Host manage (PATCH / cancel — see also Manage Matches 101:98)**

- `PATCH /matches/:id` only before kick-off. If `filledCount > 1`, cannot change sport /
  format / feeType / prices. `maxPlayers >= filledCount`. Occupancy check
  excludes this match.
- `POST /matches/:id/cancel` — pending join requests → `REJECTED`; match `CANCELLED` (frees pitch); inbox notify joiners.
  ACCEPTED rows stay as history. Cancelled kèo **không** xuất hiện tab Completed.

**Schema (`schema_matchmaking`)** — `006_schema_matchmaking.sql` is canonical:
`matches` (incl. `province`/`city`, `matches_admin_pair`, `fold_search_text`,
GIN + partial `idx_matches_province_city`), `match_courts`,
`match_join_requests`, `match_guests`, `match_favorites`. Chain: `001` auth →
`002` skills → `003` notification → `004` venue/booking/social → `005` review →
`006` kèo → `007` venue images → `008` notification match types → `009` match host reviews. `migrate.js` skips filenames already in `schema_migrations`.
Re-apply search/admin with `npm run apply:match-search` or
`npm run apply:match-admin` (`scripts/sql/`). Prefer numbered migrations for schema_notification CHECK updates.
Leftover rows in `schema_migrations` — do not delete. Do not `INSERT` name/gender on `users`.
`user_profiles.avatar_url` in `001`. Live homepage-card columns:
`npm run apply:homepage-card`.

**Out of scope (do not add in this domain):** waitlist, Zalo, real MoMo/VNPay,
`booking_id`, **Tournaments** (separate domain — see **Tournaments (giải đấu)**), join-by-code, cover **file upload**/S3
(URL-only `coverUrl` / `avatarUrl` is in), user profile **hero/cover** image,
verified-host badge, cron recurring (auto future weeks), AI chatbot,
Booking/Schedule tabs, Geoapify **on backend** (search/filter/admin units are Postgres + `vn-admin.json` only),
2025 34-tỉnh / xã-phường map, football **position** field on squad.

Reset kèo data — **chọn đúng lệnh:**

- **`npm run reset:vmito`** — xóa **chỉ** kèo/host import Vmito (giữ kèo smoke/tay + user thật). Preview: `--dry-run`.
- **`npm run reset:matches`** — TRUNCATE **toàn bộ** `schema_matchmaking.matches` (mọi nguồn). Docker: `docker compose run --rm backend npm run reset:matches`.

Chi tiết Vmito: section **Vmito import → Reset dữ liệu test Vmito**.
Windows bind-mount: after changing `src/`, `docker restart spot-backend`.

### Groups (hội)

Sport **clubs** separate from pickup kèo. Contract: [`docs/API.md`](./docs/API.md) §8. Product lock: [`docs/GROUP_PLAN.md`](./docs/GROUP_PLAN.md).

**Figma → API**

| Screen | Node | API |
| :--- | :--- | :--- |
| Browse Groups | `810:612` | `GET /groups` + filters/search |
| Detail About | `810:156` | `GET /groups/:id` |
| Detail Schedule | `810:772` | `GET /groups/:id/schedule?date=` |
| Detail Members | `810:924` | `GET /groups/:id/members?search=` |
| Detail Gallery | `810:308` | `GET/POST/DELETE /groups/:id/gallery` |
| Manage Groups | `101:2` | `GET /groups/mine` |

**Key rules (locked)**

- `name` = GROUP NAME; `title` = tagline; sport from Homepage tab (`?sport=` on create).
- Join skill = **hard gate** (`400`) — unlike kèo `skillWarning`.
- `memberCount` = admin + **accepted** members; PENDING not counted. **AUTO join** → +1 immediately; **APPROVAL** → +1 only on accept (or flush).
- Roles: `ADMIN` \| `MEMBER` only; one admin; transfer before admin leave.
- Kicked → terminal `KICKED`, rejoin same group → `403`. `REJECTED` may rejoin.
- `PATCH` courts = **replace** (clears slots unless `recurringSlots` resent).
- `joinMode` → `AUTO` in PATCH auto-accepts all `PENDING`.
- Schedule matrix: 30-min steps; `BOOKED` = overlaps recurring slot (not real booking).
- Gallery: admin only; Supabase URL on FE; max 50 images.

**Browse exclusion (`GET /groups`)** — hide groups where caller is member or join request `PENDING`/`KICKED`; **`REJECTED` visible again**.

**Static routes before `GET /:id`:** `/mine`, `/my-join-requests`, then `/:id/members`, `/:id/schedule`, `/:id/gallery`, `/:id/requests`, …

**Schema (`schema_groups`)** — `010_schema_groups.sql`: `groups`, `group_courts`, `group_schedule_slots`, `group_members`, `group_join_requests`, `group_favorites`, `group_gallery_images`. Reuses `schema_matchmaking.fold_search_text` for browse search.

**Smoke:** `npm run smoke:groups` (`scripts/smoke-groups.js`) — needs server + `OTP_DEBUG=true`; includes inbox type checks.

**Notifications (G5):** `group-notification.service.js` → `createNotification` after successful group actions. Types in `shared/constants/notification.js`; migration `011`. In-app only (`sendEmail: false`).

| Event | Recipient | Type |
| :--- | :--- | :--- |
| Join (`APPROVAL`) | Admin | `GROUP_JOIN_REQUEST` |
| Join (`AUTO`) | Joiner | `GROUP_APPROVED` |
| Accept request | Joiner | `GROUP_APPROVED` |
| Reject request | Joiner | `GROUP_REJECTED` |
| Kick member | Kicked user | `GROUP_KICKED` |
| Transfer admin | New admin | `GROUP_ADMIN_TRANSFERRED` |
| PATCH `joinMode`→`AUTO` flush | Each flushed joiner | `GROUP_APPROVED` |

**Out of scope:** group ↔ kèo link; **tournaments** (separate domain — see **Tournaments (giải đấu)**); real venue booking on schedule tab; group chat; max members cap (unless product adds).

### Tournaments (giải đấu)

Sport **tournaments** separate from pickup kèo **and** groups (no `group_id`, no `match_id`). Locked with Nguyễn **Aug 2026** — **BE T0–T5 implemented**. Domain: `src/domains/tournaments/`, schema `schema_tournaments`. **FE contract:** [`docs/API.md`](./docs/API.md) §9.

**Figma → screens (reviewed nodes)**

| Screen | Node | Notes |
| :--- | :--- | :--- |
| Homepage tab Tournaments | `880:404` | Browse cards + FAB Create/Manage; format badge beside title |
| Detail Upcoming (Football) | `880:282` | Tabs: **Overview \| Matches \| Standings \| Players**; CTA **Join Tournament** |
| Overview Complete (Badminton) | `107:249` | Same tab set; no Sponsors (MVP) |
| Standings | `107:380` | PTS table; category implicit (1 giải = 1 hạng mục) |
| Matches schedule | `107:533` | Round + team pair + datetime |
| Players | `107:2` | Roster / in-team rank when completed |
| **Missing Figma** | — | Create Tournament, Manage Tournaments, Join registration form — FE may proceed from locks below |

**Sports & format (1 tournament = exactly 1 category)**

| Sport | `format` | `genderDivision` |
| :--- | :--- | :--- |
| `FOOTBALL` | `FIVE_A_SIDE` (5v5), `SEVEN_A_SIDE` (7v7), `ELEVEN_A_SIDE` (11v11) | `MEN` \| `WOMEN` — badge e.g. `"11v11"` / `"11v11 Women's"` |
| `BADMINTON` | `MS`, `WS`, `MD`, `WD`, `MIXED` | `null` (gender encoded in format; Mixed = `MIXED`) |

**FE — format / sport / gender:** set **only** on `POST /tournaments`. **`PATCH /tournaments/:id` does not accept `sport`, `format`, or `genderDivision`** — đổi thể thức = tạo giải mới.

Browse card: **`title`** + format badge (e.g. `Saigon Champions Cup` · `"11v11"`). Currency **VND only** (`registrationFeeVnd`, `prizePoolVnd` display-only — **no payment gateway**).

**Create tournament — eligibility gate**

Only users who pass **both**:

- `hostedCompletedCount >= 80` — kèo where caller is host and `status = COMPLETED`
- `hostRating.avgRating >= 4.5` — from pickup kèo host reviews (`match_host_reviews`); no minimum review-count floor (80 completed hosts is enough sample)

Fail → **`403`** on `POST /tournaments`.

**Create tournament — required fields**

| Field | Required | Notes |
| :--- | :--- | :--- |
| `sport` | ✅ | `FOOTBALL` \| `BADMINTON` (Homepage tab or explicit picker) |
| `format` | ✅ | See table above |
| `genderDivision` | ✅ football only | `MEN` \| `WOMEN` |
| `title`, `coverUrl`, `description` | ✅ | Rules / About live in `description` only (no Rules tab) |
| `venueName`, `venueAddress`, `province`, `city`, `latitude`, `longitude` | ✅ | Fixed venue for whole giải — match rows only add **date/time** |
| `startsAt`, `endsAt` | ✅ | `endsAt >= startsAt` |
| `registrationDeadline` | ✅ | After deadline: **no new joins**; if still not FULL → **auto `CANCELLED`** + notify organizer + accepted captains |
| `maxTeams` | ✅ | Cap accepted teams; reaching cap → **`FULL`** |
| `registrationFeeVnd`, `prizePoolVnd` | ✅ | Display-only |
| `registrationOpensAt` | ❌ | Registration opens immediately on publish |
| `hostedByLabel` | BE constant | Always **`"SPOT"`** (fixed text — user cannot override) |

Cover / team logo: FE **Supabase Storage** → public URL → BE stores URL (same pattern as kèo `coverUrl` / group gallery).

**Lifecycle & status**

```
OPEN_REGISTRATION → FULL → ACTIVE → COMPLETED
        ↓              ↓
    CANCELLED      CANCELLED (organizer; notify captains)
```

| Status | Rules |
| :--- | :--- |
| `OPEN_REGISTRATION` | Join allowed until `registrationDeadline` and not at `maxTeams` |
| `FULL` | `acceptedTeamCount = maxTeams`; **hide Join** + **hide from browse**; organizer **may cancel** (notify all captains) |
| `ACTIVE` | Auto when `startsAt` reached **and** status was `FULL` |
| `COMPLETED` | Auto when **`endsAt`** reached **or** organizer **`POST /tournaments/:id/complete`** early |
| `CANCELLED` | Organizer cancel **before `startsAt` only** (`OPEN_REGISTRATION` or `FULL`); **auto** at `registrationDeadline` if not FULL; notify organizer + participants. **No cancel after `ACTIVE`.** |

**After `ACTIVE`:** organizer **cannot PATCH** `venue*`, `startsAt`, `endsAt`, or fixed location fields (locked).

**Join registration (always captain + APPROVAL only)**

- **`POST /tournaments/:id/join`** → **`PENDING`** until organizer approve/reject.
- **One user = one join request per tournament** (single category per giải).
- **Required:** `teamName`, `teamLogoUrl`, `roster[]`.
- Captain = authenticated joiner → organizer views captain **profile + phone** on request (no separate contact field on form).

| Sport | Roster rules |
| :--- | :--- |
| **Football** | Each player: **`name`** + **`jerseyNumber`** (required, **unique within team**). Max squad = **format size + 5** → 5v5→**10**, 7v7→**12**, 11v11→**16** |
| **Badminton singles** (`MS`/`WS`) | **1** player |
| **Badminton doubles / mixed** | **2** players |

| Edge case | Rule |
| :--- | :--- |
| `REJECTED` | Captain **may submit again** (new request) |
| Captain **withdraw** | Only while `OPEN_REGISTRATION`, **not FULL**, and **before `registrationDeadline`** |
| Organizer **kick team** | Only **before `startsAt`** (before giải becomes `ACTIVE`) |
| Kicked captain | Terminal for that giải (mirror group kick — **`403`** rejoin) |

**Browse (`GET /tournaments`)**

- Reuse **Groups filter** pattern: location, province/city, distance — **omit skill level**.
- Hide tournaments the caller **organizes** (manage via Mine / Manage Tournaments).
- Hide tournaments where caller has join request **`PENDING`** or **`ACCEPTED`** or **`KICKED`** (**`REJECTED`** visible again).
- Hide **`FULL`** from public browse (same spirit as kèo hiding FULL).
- **Favorites:** `POST/DELETE /tournaments/:id/favorite` + `isFavorited` on list/detail (Figma heart not drawn yet — still in scope).

**Detail tabs**

| Tab | Upcoming / Active | Completed |
| :--- | :--- | :--- |
| **Overview** | About, fee, prize, venue, dates, registered teams preview | + winners (manual), final summary |
| **Matches** | Schedule list (may be empty until organizer adds) | Results |
| **Standings** | From entered results (PTS calc) | Final table |
| **Players** | Players of all **accepted** teams | **In-team member ranking** (manual — organizer sets on tournament update) |

**Matches — organizer manual entry (T2 implemented)**

| Method | Path | Notes |
| :--- | :--- | :--- |
| `GET` | `/tournaments/:id/matches` | List schedule + results |
| `POST` | `/tournaments/:id/matches` | Organizer; `{ round, teamAId, teamBId, scheduledAt }` |
| `PATCH` | `/tournaments/:id/matches/:matchId` | Reschedule / change teams (clears result if teams change) |
| `PATCH` | `/tournaments/:id/matches/:matchId/result` | Football: `{ teamAGoals, teamBGoals }` · Badminton: `{ sets[] }` |
| `DELETE` | `/tournaments/:id/matches/:matchId` | Organizer |

- **Football:** single leg, draw allowed → `result.outcome` `DRAW` \| `WIN`, `winnerTeamId` null on draw.
- **Badminton:** BO3 sets, 15 pts, win-by-2, deuce; 1 set allowed (in progress), 2-0 or 2-1 complete.
- **Rounds:** `GROUP_STAGE`, `ROUND_OF_32`, `ROUND_OF_16`, `QUARTER_FINAL`, `SEMI_FINAL`, `THIRD_PLACE`, `FINAL`.
- `scheduledAt` must fall between tournament `startsAt` and `endsAt`.

Venue fixed on tournament detail; per match: **`round`**, **`teamA`**, **`teamB`**, **`scheduledAt`**.

**FE — “giải đang ở vòng nào?”:** BE **không có** field `currentRound` trên tournament. Vòng đấu gắn **từng trận** (`match.round`). FE: `GET /tournaments/:id/matches` → group/filter theo `round`; tab Standings dùng `?round=GROUP_STAGE` (optional). Chuyển vòng knock-out = organizer **tạo trận mới** (`POST .../matches`) hoặc **PATCH** `round` trên trận có sẵn — không PATCH giải.

**Round labels (BE enum — fixed set)**

`GROUP_STAGE` · `ROUND_OF_32` · `ROUND_OF_16` · `QUARTER_FINAL` · `SEMI_FINAL` · `THIRD_PLACE` · `FINAL`

**Standings (T3 implemented)**

| Method | Path | Notes |
| :--- | :--- | :--- |
| `GET` | `/tournaments/:id/standings` | Optional `?round=GROUP_STAGE` filters which match results count |

- All **accepted teams** listed (0 `played` if no results).
- **Football:** W=3, D=1, L=0 · tie-break: **goalDifference** → **goalsFor** → team name.
- **Badminton:** W=3, L=0 · only **completed** BO3 matches count · tie-break: **setDifference** → **pointDifference** → **pointsFor**.
- Response: `{ tournamentId, sport, round, standings: [{ rank, teamId, teamName, teamLogoUrl, played, won, lost, pts, ... }] }`.

**Update & completed (T4 implemented)**

| Method | Path | Notes |
| :--- | :--- | :--- |
| `PATCH` | `/tournaments/:id` | Organizer; partial update |
| `POST` | `/tournaments/:id/complete` | Early complete when `ACTIVE`; optional `winners[]` |
| `GET` | `/tournaments/:id/players` | Accepted teams + roster; sorted by in-team `rank` |

- **ACTIVE lock:** cannot PATCH `venue*`, geo, `startsAt`, `endsAt`, `registrationDeadline` after `ACTIVE`.
- **`winners`:** `[{ place, teamId }]` → stored in `winners_json`; shown on completed Overview.
- **`playerRanks`:** `[{ rosterPlayerId, rank \| null }]` — manual in-team order on Players tab.
- Non-locked info changes notify accepted captains (`TOURNAMENT_UPDATED`).

**Manage Tournaments (FAB — mirror Manage Groups `101:2`)**

| Tab | Section | Content |
| :--- | :--- | :--- |
| **Hosted by Me** | My Tournaments | Giải user created (organizer) |
| | Pending Requests | Inbound join requests to approve/reject |
| **Joined** | Tournaments | Giải user joined (captain / accepted) |
| | Join Requests | Outbound `PENDING` / `REJECTED` |

Organizer manage: approve/reject join, **manual** match create + result entry, PATCH info (except locked fields after `ACTIVE`), cancel giải **before `startsAt` only** (with notifications).

**Notifications (inbox only, `sendEmail: false`)**

| Event | Recipient | Type |
| :--- | :--- | :--- |
| Join submitted | Organizer | `TOURNAMENT_JOIN_REQUEST` |
| Approved / rejected | Captain | `TOURNAMENT_JOIN_APPROVED` / `TOURNAMENT_JOIN_REJECTED` |
| Giải cancelled (manual or auto deadline) | Organizer + captains | `TOURNAMENT_CANCELLED` |
| Team kicked | Captain | `TOURNAMENT_KICKED` |
| Info updated (non-locked fields) | Participants | `TOURNAMENT_UPDATED` |

**Smoke / dev test create gate:** `npm run smoke:tournaments` (`scripts/smoke-tournaments.js`) — needs server + `OTP_DEBUG=true` + DB; script **tự seed** 80 kèo COMPLETED + host review cho account smoke. Test bằng account riêng: seed DB thủ công (xem `seedOrganizerEligibility` trong script) — **không có** dev bypass API / env skip eligibility.

**Implementation phases**

| Phase | Status |
| :--- | :--- |
| **T0** | Done — browse, detail, join, mine, favorites |
| **T1** | Done — approve/reject, cancel, kick, notifications, lifecycle worker |
| **T2** | Done — matches CRUD + manual result (football goals / badminton sets) |
| **T3** | Done — `GET /tournaments/:id/standings` (PTS, GD / set diff tie-break) |
| **T4** | Done — PATCH tournament, winners, player ranks, early complete |
| **T5** | Done — `docs/API.md` §9, `npm run smoke:tournaments` |

**Out of scope (tournaments MVP):** link to **Groups**; sponsors; payment gateway; skill gate on join; real bracket auto-generation; card penalty / referee tooling; `registrationOpensAt` scheduling.

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
  **Homepage search**).   Admin dropdown = `GET /geo/vn` (pre-2025). Prices VND.
  Do not add waitlist / Zalo / real payment / `booking_id` / Geoapify-on-backend /
  2025 ward map / NLP search / football position on squad. **Groups** = separate domain — see **Groups (hội)** section, not matchmaking.
- UI “Venue Owner” maps to DB/API role `OWNER`.
- FE role-based navigation reads `role` from login JWT / `user`. Protect later
  APIs with `authenticate` / `requireRole` from `shared/middleware/authenticate.js`.
  Sample: `GET /auth/me`, `GET /users/:id`. Refresh via `POST /auth/refresh` `{ refreshToken }`.
- Compose from **repo root**; never commit `.env`
- Auth uses `pg` + `ioredis` — do not assume `@supabase/supabase-js` is wired
- Style: 2 spaces, single quotes, trailing commas; camelCase / PascalCase (no linter yet)
- Full API details: `docs/API.md` / `API.md`

## Referee (trọng tài)

Product spec + **báo cáo BE/FE:** [`docs/REFEREE_PLAN.md`](./docs/REFEREE_PLAN.md) **§0**.  
**FE contract chi tiết (từng endpoint, query, JSON, curl):** [`docs/API.md`](./docs/API.md) **§19** — format giống §6 Auth / §7 Matchmaking.

### Trạng thái triển khai (Aug 2026)

| | BE | FE mobile |
| :--- | :---: | :---: |
| Core domain `/referee/*` | ✅ | ❌ |
| Board filter + favourite H22–H23 | ✅ | ❌ |
| Plan A pending (`myVenues` + Queue) | ✅ | ❌ |
| Hire-referee fan-out + rating notify | ✅ | ❌ (player booking UI) |
| Payment IPN / FCM / Admin UI | ❌ | ❌ |

Migrations **`015`–`022`**. Smoke: `npm run smoke:referee` (`OTP_DEBUG`, `seed:admin`).

### Hai tầng nghiệp vụ

1. **Job Board (venue pool)** — `GET /referee/board?sport=` + filter; `POST/DELETE .../register`; favourite `POST/DELETE .../favorite`. Sân đã apply ẩn khỏi board.
2. **Invitations (booking)** — player `hireReferee: true` + PAID → fan-out PENDING; **first accept wins** (`409 ASSIGNMENT_ALREADY_TAKEN`).

### Plan A — Pending tab

`GET /referee/invitations?tab=pending` → `{ matchInvitations[], myVenues[] }`. FE **một màn scroll:** Pending Queue (`224:3113`) + **My venues** dưới. Cancel pool = `DELETE /referee/venues/:venueId/register` + `{ sportType }`.

### Endpoint map (tóm tắt — chi tiết §19 API.md)

| Method | Path |
| :--- | :--- |
| `GET` | `/referee/me`, `/referee/me/certifications` |
| `GET` | `/referee/board?sport=&province=&city=&lat=&lng=&radiusKm=&favorited=&q=&page=&limit=` |
| `POST` / `DELETE` | `/referee/venues/:venueId/favorite` |
| `POST` / `DELETE` | `/referee/venues/:venueId/register` (DELETE body `{ sportType }`) |
| `GET` | `/referee/invitations?tab=pending\|confirmed\|completed&since=&filter=` |
| `GET` | `/referee/assignments/:id` |
| `POST` | `/referee/assignments/:id/accept`, `.../decline` |
| `GET` | `/referee/schedule?month=`, `/referee/earnings`, `/referee/earnings/history` |
| `POST` | `/referee/assignments/:id/dev/complete` (non-prod) |

**Onboarding (không prefix `/referee`):** batch `POST /users/me/verification-requests/batch`; admin `POST /admin/approvals/:id/approve` `{ certifiedSportTypes }`.

**Player-side:** `POST /bookings` `{ hireReferee?, refereeFeeVnd? }`; test fan-out `POST /bookings/:id/dev/mark-paid`. Rating: `POST /reviews/referee` + inbox `REFEREE_RATING_REQUEST`.

**Geo reuse:** `GET /geo/vn` — filter sheet Tỉnh/Phường (Figma Ward = BE `city`).

**Assignment detail FE (`224:5703`):** Zalo/Call/breakdown UI — BE trả assignment fields; contact/directions reuse `GET /venues/:id`.

**Schema:** `schema_referee.referee_profiles`, `referee_venue_registrations`, `referee_assignments`, `referee_venue_favorites`; `bookings.hire_referee`, `referee_fee_vnd`; `venues.province`, `venues.city` (`021`).

**Chưa có:** Payment IPN → PAID tự fan-out; FCM push; Admin console UI duyệt docs.
