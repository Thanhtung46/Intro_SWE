# spot-backend agent notes — Setup, Layout, Env

Part of the spot-backend agent notes — see [../../CLAUDE.md](../../CLAUDE.md) for the index. Vmito dev-seed import is in [01-vmito-import.md](./01-vmito-import.md) / [02-vmito-scripts.md](./02-vmito-scripts.md).

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
- Avatar: `POST /users/me/avatar` → Supabase Storage (`avatars/<userId>-<ts><ext>`, bucket `SUPABASE_STORAGE_BUCKET`) via `shared/utils/supabaseStorage.js::uploadBufferToStorage`; multer uses `memoryStorage()`, no local disk write, old avatar deleted from Storage on replace
- Forgot/reset: do **not** reuse `/otp/verify|resend` (REGISTER-specific)
- UI “Venue Owner” → role `OWNER`

Password: min 8, upper/lower/digit/special. Phone: VN 10 digits.

## Env (see `.env.example`)

Required: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL=true`, `DB_POOL_MAX=5`. Leave `DATABASE_URL` empty when using `DB_*` (`env.js` prefers `DB_HOST`).

Also: Redis, `JWT_SECRET` / expiry, `SMTP_*` / `EMAIL_FROM`, OTP limits, `LOGIN_MAX_ATTEMPTS` / `LOGIN_LOCKOUT_MINUTES`.

**File uploads — Supabase Storage (not local disk):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` (default `spot-uploads`). All three upload paths — avatar (`users` domain), verification documents (`admin` domain), owner facility images (`owner/facility` domain) — use `multer.memoryStorage()` + `shared/utils/supabaseStorage.js` (`uploadBufferToStorage` / `deleteFromStorage` / `storagePathFromPublicUrl`), not `fs`/local `uploads/`. The old `spot-backend/uploads/` directory has been deleted; any pre-migration `.../uploads/...` URL still in the DB is dead and is explicitly excluded from venue cover-image/gallery queries (`NOT LIKE '%/uploads/%'`) rather than being backfilled.

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

