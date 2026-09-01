# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# SPOT Project Reference

## Project Overview

SPOT (Sport Pitch Online Ticketing) is a sports-pitch booking platform (HCMUS
Software Engineering coursework, Group 09). It is currently a **polyrepo**
— the root `package.json`/`pnpm-workspace.yaml`/`infrastructure/` scaffold
from an earlier pnpm-monorepo attempt has been removed from the working
tree. `PROJECT_RULES.md` was rewritten (v2.0.0) to match this polyrepo and
its actual version locks (npm not pnpm, `postgres:15-alpine`, `node:18-alpine`,
etc.) — read it for the binding rules (version locks, DB/locking/security
rules, code style, DRI table). Auth + matchmaking on `spot-backend` **are**
built — don’t treat those as empty scaffolds. Sections there marked "not yet
implemented" (Redis slot-locking, AI services, booking/payment) still apply
to those empty domains only.
Software Engineering coursework, Group 09). It is now a **monorepo**: as of
commit `a2dff26` ("merge polyrepo apps into monorepo"), `spot-frontend-web`,
`spot-frontend-mobile`, and `spot-admin-console` — previously separate git
repos — were merged into this repo and no longer have a nested `.git`; the
whole tree (including `spot-backend`/`spot-ai-services`) is tracked by this
repo's git history. `PROJECT_RULES.md` (v2.0.0, titled "Polyrepo
Realignment") still describes the pre-merge polyrepo boundaries and hasn't
been retitled — treat its version-lock matrix and DRI table as current, but
its "separate git repositories" framing as historical. Sections there marked
"not yet implemented" (DB schema rules, Redis slot-locking, auth security
rules, AI-service dependency lists) describe domains that are still empty
scaffolds — don't assume they're built.

Tech stack per component:

| Component | Stack | Status |
| :--- | :--- | :--- |
| `spot-frontend-web/` | Next.js 14 (App Router), React 18, TypeScript, Tailwind, Zustand, Axios | Scaffolded but **`docker build`/`next build` fail today** — missing `src/app/globals.css`, `tsconfig.json`, `next.config.js`, `tailwind.config.js`, `postcss.config.js`. `npm run dev` may still work despite this. |
| `spot-frontend-mobile/` | Expo 49, React Native 0.72, expo-router, Zustand, Axios | Scaffolded. `npm install` **fails** on a peer-dependency conflict (`react-test-renderer@19.x` vs `@testing-library/react-native` wanting React ^16–18) unless run with `--legacy-peer-deps`. |
| `spot-admin-console/` | Vite, React 18, TypeScript, React Router, Recharts, ESLint | Scaffolded, runnable — `docker build` verified working end-to-end. `npm run lint` fails today (no `.eslintrc*` committed, despite `eslint`/`@typescript-eslint/*` in `devDependencies`; there is **no oxlint** here despite older docs claiming so). Now also hosts the **Venue Owner console** (`/owner`, `/owner/schedule`, `/owner/facilities`, `/owner/revenue`, `/owner/reviews`) consuming `spot-backend`'s `/owner/*` API — spec `006-owner-booking-web`. |
| `spot-backend/` | Node.js/Express, domain-driven (controller/dto/entity/repository/service), ESM, Node ≥ 18 | **Runnable** (local or Docker). Auth + **matchmaking (kèo) Phases 1–5 done** (list/filter/detail/join/host-profile). Default DB is **Supabase Postgres** (Session pooler), not the optional compose `postgres` profile. See `spot-backend/CLAUDE.md`. |
| `spot-ai-services/{recommendation,nlp-assistant}/` | Python/FastAPI | **Implemented** — real app code, `requirements.txt`, `Dockerfile`, tests. `noshow-prediction/` is still an **empty folder scaffold** (`app/`, `models/`, `services/`, `data/` — no code). See `spot-ai-services/CLAUDE.md`. |
| Infra | PostgreSQL 15-alpine (optional profile), Redis 7-alpine, Docker Compose | Default backend uses **Supabase** + Redis. `admin-console` docker build verified. AI images still missing Dockerfiles. |
| `spot-frontend-mobile/` | Expo, React Native, expo-router, Zustand, Axios — `package.json` currently pins Expo `^57`/React Native `^0.86`/React `19.2.8` (not Expo 49/RN 0.72 as this line used to say; version drifts fast here, so check `package.json` directly). See `spot-frontend-mobile/CLAUDE.md` for current status — it has a real, mostly-wired auth/onboarding/home flow, not an empty scaffold, and plain `npm install` works (no `--legacy-peer-deps` needed anymore). |
| `spot-admin-console/` | Vite, React 18, TypeScript, React Router, Recharts, ESLint | Scaffolded, runnable — `docker build` verified working end-to-end. `npm run lint` fails today (no `.eslintrc*` committed, despite `eslint`/`@typescript-eslint/*` in `devDependencies`; there is **no oxlint** here despite older docs claiming so — a leftover `.oxlintrc.json` file exists but isn't wired to anything). Now also hosts the **Venue Owner console** — spec `006-owner-booking-web`. |
| `spot-backend/` | Node.js/Express, domain-driven (controller/dto/entity/repository/service) | **Has a `package.json` and is installable/runnable** — the `auth` domain (register/role/OTP/login/refresh/forgot-password/reset-password) is fully implemented; other domains are still empty scaffolds. See `spot-backend/CLAUDE.md`/`README.md` for the full API. |
| `spot-ai-services/{recommendation,nlp-assistant}/` | Python/FastAPI | **Implemented** — real app code, `requirements.txt`, `Dockerfile`, tests. `noshow-prediction/` is still an **empty folder scaffold** (`app/`, `models/`, `services/`, `data/` — no code). See `spot-ai-services/CLAUDE.md`. |
| Infra | PostgreSQL 15-alpine, Redis 7-alpine, Docker Compose | `postgres`/`redis`/`admin-console` verified; **backend** builds with `env_file: spot-backend/.env` + `REDIS_HOST=redis`. Default backend DB is **Supabase**, not compose postgres. |

### Backend snapshot (auth + profile + matchmaking)

Implemented under `spot-backend/` (do not re-document full API here):

- **Auth:** register → role → OTP → login/refresh; forgot/reset password
- **Profile Hub:** `user_profiles` (display + prefs); `GET/PATCH /users/me`; Main Profile `GET /users/me/profile`; Settings `GET/PATCH /users/me/preferences`; password change; local avatar upload
- **Contact change:** OTP-gated email/phone (FR-1.4) — not via plain PATCH
- **Schedule / notifications / reviews:** personal schedule + seed; inbox + T-24h/T-2h reminders; venue reviews + reply
- **Matchmaking (kèo):** Phases 1–5 — `POST/GET /matches`, join AUTO/APPROVAL, mine, my-join-requests, host profile `GET /users/:id`
- **Migrations:** `001` auth → `002` skills → `003` notification → `004` venue/booking → `005` review → `006` kèo. Prefer `npm run migrate` after pull. `npm run migrate:reset` is destructive.
- **Not yet:** JWT refresh rotate/blacklist; admin approve OWNER/REFEREE; booking CRUD UI / payment / S3 CDN

## Common Commands

There is no root-level build tool — each app manages its own dependencies.
Run commands from inside the relevant directory.

**Web (`spot-frontend-web/`):**
```bash
npm install
npm run dev      # start dev server
npm run build && npm run start
npm run lint
npm test
```

**Admin console (`spot-admin-console/`):**
```bash
npm install
npm run dev
npm run build     # tsc && vite build
npm run lint      # eslint — fails today, no .eslintrc* committed yet
npm run lint:fix
```

**Mobile (`spot-frontend-mobile/`):**
```bash
npm install
npm start          # expo start
npm run android / ios / web
npm test
```

**Backend (`spot-backend/`):** runnable. From `spot-backend/`:
```bash
npm install
npm run migrate
npm run dev              # http://localhost:3000
npm test
npm run smoke:login      # OTP_DEBUG=true
npm run smoke:profile
npm run smoke:matches    # host / join / approve / kick / mine / cancel
```
Compose (from this repo root `Intro_SWE/`):
```bash
docker compose up -d redis backend
docker compose run --rm backend npm run migrate
docker restart spot-backend   # Windows: after changing bind-mounted src/
```
Do not run `docker compose` from inside `spot-backend/` (no compose file there).

**AI services (`spot-ai-services/*/`):** `recommendation/` and
`nlp-assistant/` are runnable (`cd` into either, `pip install -r
requirements-dev.txt`, `uvicorn app.main:app --reload --port 5001` /
`5003`). `noshow-prediction/` is not — no application code or
`requirements.txt` exists yet.

**Docker (repo root `Intro_SWE/`):**
```bash
docker compose up -d redis backend          # default stack (Supabase DB + Redis)
docker compose --profile local-db up -d postgres   # optional local Postgres only
docker compose up -d --build admin-console
docker compose logs -f <service>
docker compose down [-v]
docker compose -f docker-compose.production.yml --env-file .env.production up -d
docker compose up -d postgres redis          # always works (local postgres optional for backend)
docker compose up -d --build admin-console   # verified end-to-end
docker compose up -d --build redis backend   # uses spot-backend/.env; REDIS_HOST=redis
docker compose run --rm backend npm run migrate
docker compose build frontend-web recommendation noshow  # still fail — see below
docker compose up -d --build redis nlp        # nlp-assistant now wired into docker-compose.yml
docker compose logs -f <service>
docker compose down [-v]
docker compose -f docker-compose.production.yml --env-file .env.production up -d   # --env-file required
```
`build.context` for `backend`/`frontend-web`/`admin-console` points at each
app directory. Status:
- `admin-console` — **builds successfully end-to-end.**
- `backend` — **builds and runs**; `env_file: ./spot-backend/.env` (Supabase
  `DB_*`, SMTP, JWT). Redis hostname overridden to `redis`. Matchmaking is
  live on `/matches` and `/api/matches`; public host profile on `/users/:id`.
  Optional local Postgres:
  `docker compose --profile local-db up -d postgres` (not the default DB).
- `frontend-web` — gets past `npm ci` now (lockfile added) but fails at
  `next build`: `src/app/globals.css` doesn't exist, and `tsconfig.json`/
  `next.config.js`/`tailwind.config.js`/`postcss.config.js` are all missing
  too. This is an app-scaffold gap, not a Docker problem.
- `nlp` — has a `Dockerfile`, real app code, and its `docker-compose.yml`
  service block is now uncommented/live (`docker compose up -d --build redis nlp`
  builds); not yet verified end-to-end against live Redis/Gemini in this
  environment.
- `recommendation` — has a `Dockerfile` and real app code, but there is
  still no `recommendation` service block in `docker-compose.yml` at all
  (not commented out — just never added; adding one plus verifying against
  live Supabase is a separate, not-yet-done step).
- `noshow` still fails immediately: no `Dockerfile` exists under
  `spot-ai-services/noshow-prediction/` at all (empty scaffold), and there
  is no `noshow` service block in `docker-compose.yml` either.
- `backend` — **builds** when `package.json`/`package-lock.json` present; runtime DB defaults to Supabase via `spot-backend/.env`.
- `frontend-web` — gets past `npm ci` but fails at `next build` (missing `globals.css` + Next/Tailwind configs).

`docker-compose.production.yml` uses `${DB_USER}`/`${DB_PASSWORD}`/
`${JWT_SECRET}`/etc. with **no defaults**. Compose only auto-loads a file
literally named `.env` — `.env.production` is a different name, so those
vars come back blank unless you pass `--env-file .env.production` explicitly
(reproduced via `docker compose -f docker-compose.production.yml config`).
`docker-compose.yml` (dev) doesn't have this specific problem — most values
(`NODE_ENV`, `PORT`, `REDIS_*`, AI-service URLs) are hard-coded inline, but
the `backend` service still reads DB/SMTP/JWT credentials from
`env_file: ./spot-backend/.env` (a different, gitignored file from
`.env.development`) — so it's not *fully* hard-coded, just not gated behind
the `--env-file` flag the way prod is.
See `DOCKER.md` for the full guide (ports, health checks, backup/restore).

## Architecture & Project Structure

```
.
├── spot-frontend-web/       # Next.js web app
├── spot-frontend-mobile/    # Expo mobile app
├── spot-admin-console/      # Vite admin dashboard
├── spot-backend/            # Express API — domain-driven src/domains/{auth,booking,venue,payment,matchmaking,referee,review,notification,admin}/
├── spot-ai-services/        # 3 FastAPI microservices — recommendation/ and nlp-assistant/ implemented; noshow-prediction/ still an empty scaffold
├── docker-compose.yml               # dev stack — each service builds from its own app's Dockerfile
├── docker-compose.production.yml    # prod stack
├── .env.development / .env.production   # compose env files (gitignored, contain placeholders)
├── PROJECT_RULES.md         # target architecture & version-lock matrix (aspirational, see caveat above)
├── Docs/ , PA/               # HCMUS course assignment materials — reference only, not app code
```

**Data flow (current):**
`spot-frontend-web` / `spot-frontend-mobile` / `spot-admin-console` →
`spot-backend` REST (`:3000`) → Supabase Postgres + Redis (`:6379`).
Auth + matchmaking (kèo) are implemented. `spot-backend` also proxies to
`nlp-assistant` (`:5003`) via its `assistant` domain (`/assistant` +
`/api/assistant`) for the conversational search/join assistant — see
`specs/003-nlp-assistant/`. `spot-backend` also proxies to `recommendation`
(`:5001`) via its `recommendation` domain (`/recommendations` +
`/api/recommendations`), and `spot-frontend-mobile` now consumes both (a
"Suggested for you" Home section + an AI assistant chat screen) — see
`specs/004-ai-features-frontend-integration/`. `noshow-prediction` (`:5002`)
is still an empty scaffold — do not call it from matchmaking.

### Matchmaking (kèo) — implemented

Pickup matches only. Agent rules + Figma map:
[`spot-backend/CLAUDE.md`](./spot-backend/CLAUDE.md) (section Matchmaking).
FE/tester contract: [`spot-backend/docs/API.md`](./spot-backend/docs/API.md).
Product locks: [`spot-backend/docs/MATCHMAKING_PLAN.md`](./spot-backend/docs/MATCHMAKING_PLAN.md).

| | |
| :--- | :--- |
| Prefix | `/matches` + `/api/matches`; public host `/users/:id`; admin dropdown `/geo/vn` + `/api/geo/vn` (JWT Bearer) |
| Sports | `BADMINTON`, `FOOTBALL` |
| Host | Free listing, no `booking_id`. Duration ≥ 1h. Named courts. Optional `coverUrl`. Required `province` + `city` (pre-2025 GSO codes, e.g. HCM `79` / Quận 7 `778`). `venueAddress` = street line only. **`POST /matches/bulk`** for Vmito-style multi-publish. **`GET /matches/venue-suggestions`** for Host location picker (wider pool than browse). |
| Occupancy | Global: `venueName` + `venueAddress` + court + overlapping time → `409` |
| List | `GET /matches`: browse = `OPEN` + spots left + `endsAt > now` (**FULL hidden**); also hides caller's hosted kèo and kèo with join request `PENDING`/`ACCEPTED`/`KICKED` (**`REJECTED` shows again**). `hostUserId` = that host’s `OPEN`/`FULL`. Filters: `sport`, `date`, `timeFrom`/`timeTo`, `skill` (multi OR, needs `sport`), `priceMin`/`priceMax` (**VND**), `favorited`, `province`/`city` (exact; `city` needs `province`); **Location XOR Distance** (`location` vs `lat`+`lng`+`radiusKm` 1–20). Card: `coverUrl`, `host`, `isFavorited`, `participantAvatars`, `province`/`city` + names. |
| Join | `AUTO` or `APPROVAL`; guests (`name`, `skill`, `gender`, `phoneNumber`); skill mismatch **warns** but still joins |
| Fee | `GENDER_RANGE` or `SPLIT_EVENLY` — **either allowed per sport** (VND); always required on Host form |
| Requests | One row per `(match_id, user_id)`. Kick = cannot rejoin **that kèo**. Reject = may rejoin. Waiting list = `PENDING` only. |
| **Manage Matches** | [`101:98`](https://www.figma.com/design/ZTpFWfkdcEpHH4xJaKaBxT/Spot?node-id=101-98) — **`GET /mine`** + **`GET /my-join-requests`**; host approve on detail; chips on Active — see section below |
| Host edit / cancel | `PATCH /matches/:id` before start; `POST /matches/:id/cancel` |
| Host profile | `GET /users/:id` (`fullName`, `avatarUrl`, `createdAt`, `skills`, `matchCount`; no email/phone). Hosted kèo = `GET /matches?hostUserId=`. `rating`/`reviewCount` stub. |
| Host phone | Only `GET /matches/:id` when caller is host or `yourRequest.status === ACCEPTED`. Never on list / mine / `/users/:id`. |
| Rating | `host.rating` always `null` until review domain exists. `matchCount` is live. |
| Search / map | Homepage **`location=`** = SQL on **`title` + `venueName` + `venueAddress`** (unaccent, fuzzy ≥3 chars, multi-word AND). Same request returns **`suggestions[]`** (max 5, kinds `title` \| `venueName` \| `venueAddress`) while user types — Postgres only, **not** Geoapify/NLP. **Does not** search province/city names or GPS — use `province`/`city` or Distance filters. Filter tỉnh/quận = `province`+`city` from `GET /geo/vn` (**pre-2025**). Map / directions = **FE Geoapify**; no key on backend. |
| Out of scope | Waitlist, Zalo, MoMo/VNPay, Groups, Tournaments, join-by-code, verified-host, user hero cover, AI chatbot, notifications, Booking/Schedule |

`GET /matches/mine` must stay **before** `GET /matches/:id` in routes.
`full_name` / `gender` / `avatar_url` are on `schema_auth.user_profiles`, not `users`.
Migrations: `001`–`006` (`spot-backend/migrations/README.md`). Kèo is `006`. Re-apply search/admin via `apply-match-search.js` / `apply-match-admin.js`. Do not delete leftover `schema_migrations` rows from the old duplicate-number files.

**Figma Homepage 1 (`95:2675` / list `95:2417`) — BE done**

Locked after product review. Detail: [`spot-backend/CLAUDE.md`](./spot-backend/CLAUDE.md)
section **Homepage 1** and **Homepage search**.

| Done on BE | FE-only / out of scope |
| :--- | :--- |
| Text search + suggestions (`location=`) | Logo → Home, Avatar → Profile (nav) |
| Browse hides `FULL`; profile `hostUserId` shows FULL | Card distance from user GPS |
| Filter sheet: sport, date, time, skill, price **VND**, tỉnh/quận | Sparkles / AI search icon |
| `GET /geo/vn`, favorites, distance XOR location | Notification bell |
| List card fields (`coverUrl`, host, hearts, avatars, admin names) | Groups / Tournaments tabs |
| | Booking / Schedule, host `rating` (null until reviews) |

Other Matches screens (detail `100:401`, Join `100:551`, host profile `432:1211`,
filter `87:1903`) — BE endpoints exist; see spot-backend CLAUDE **Figma** table.

**Figma Manage Matches (`101:98`) — product locked (BE done)**

Full detail: [`spot-backend/CLAUDE.md`](./spot-backend/CLAUDE.md) section **Manage Matches 101:98**.

| # | Decision | BE | FE |
| :--- | :--- | :--- | :--- |
| 1 | **Entry** | — | Homepage FAB → “Manage Matches”; bottom nav **Matches** = Homepage browse (`95:2675`), **not** this screen unless product changes IA |
| 2 | **Tabs** | `active` \| `completed` on **`GET /matches/mine`**; joiner tracking on **`GET /matches/my-join-requests`** | 3 segmented tabs: **Active**, **Completed**, **Join Requests** |
| 3 | **Active** | Host: own kèo `OPEN`/`FULL` future. Participant: join **`ACCEPTED`** only — **`PENDING` never here** | Reuse Homepage card (`95:2417`); badge `HOST` / `JOINED` from `myRole` |
| 4 | **Completed** | Host: cancelled/ended. Participant: **`KICKED`** or **ACCEPTED** + kèo ended/cancelled | Same card reuse |
| 5 | **Join Requests tab** | **`GET /matches/my-join-requests`** — caller’s **`PENDING`** + **`REJECTED`** only | Joiner **theo dõi** đơn; tap → `GET /matches/:id`. **Not for host approve** |
| 6 | **Host approve** | Per kèo: **`GET /matches/:id/requests`** → accept/reject on **Match detail** (`100:401` host view — **no dedicated Figma frame yet**) | Active → tap host card → detail → waiting list |
| 7 | **Host chips (Active)** | `pendingRequestCount` (PENDING waiting), `status=FULL` | Chip **“N chờ duyệt”** when `myRole=HOST` + `pendingRequestCount>0` + `joinMode=APPROVAL`; chip **“Đủ người”** when `FULL` |
| 8 | **Homepage dedupe** | **`GET /matches`** hides kèo caller hosts + `PENDING`/`ACCEPTED`/`KICKED` requests; **`REJECTED` shows again** (re-join) | Avoid same kèo on feed + Manage; detail still via Manage / deep link |
| 9 | **Empty state** | — | Figma `101:98` only empty Active; filled list = reuse cards + chips (no separate frame) |

Do **not** mix with **Manage Group** (`101:2`) — Groups out of scope.

Hide Groups / reviews / verified on profile; hide Booking chrome on filter sheet.

**Figma Host form (`99:2`) — product locked (BE + FE contract)**

Full detail: [`spot-backend/CLAUDE.md`](./spot-backend/CLAUDE.md) section **Host form 99:2**.
Reference UX: [Vmito create session](https://vmito.com/vi/sessions/new) (recurring / fee toggles — not Zalo).

| # | Decision | BE | FE |
| :--- | :--- | :--- | :--- |
| 1 | **Sport** | `sport` in body | From Homepage tab [`95:2675`](https://www.figma.com/design/ZTpFWfkdcEpHH4xJaKaBxT/Spot?node-id=95-2675) — Badminton / Football **before** Host form |
| 2 | **Location** | `venueName`, `venueAddress`, `province`, `city`, optional `latitude`/`longitude` | User types → **`GET /matches/venue-suggestions`** (pool = any non-`CANCELLED` kèo). No hit → **map icon → Geoapify** (autocomplete/geocode). Map fills address + lat/lng; FE maps admin → GSO codes (`GET /geo/vn`) or dropdown fallback |
| 3 | **Host name / phone** | **Not** in create body | Read-only from `GET /auth/me`; edit via profile — do not send on `POST /matches` |
| 4 | **Multi-day** | Always `isMultiDay: false` | **Remove** toggle (Figma drew extra) |
| 5 | **Schedule** | `startsAt`, `endsAt` (ISO `+07`, ≥1h, future) | Date + start/end time pickers |
| 6 | **Courts** | `courtCount` + `courts[{ name }]` | No. of courts + names + Add Court |
| 7 | **Skill** | `allLevels` or `skillMin`+`skillMax` | Multi-select chips → FE derives min/max rank; labels from `sports.js` **per sport** |
| 8 | **Entry fee** | Always on — **`feeType`** required | Toggle always ON (Figma mistake). **Both** `SPLIT_EVENLY` and `GENDER_RANGE` allowed **for each sport** (VND) |
| 9 | **Recurring / N kèo** | Toggle OFF → `POST /matches` (1 slot). Toggle ON → FE expands dates/weekdays → **`POST /matches/bulk`** | Vmito-style: clone specific dates **or** weekdays + week count (max 52); show total N; partial 409 per slot |
| 10 | **Advanced (required on FE)** | `format`, `maxPlayers`, `coverUrl` (URL) | Badminton `SINGLES`/`DOUBLES`; Football `FIVE_A_SIDE`/`SEVEN_A_SIDE`/`ELEVEN_A_SIDE`; **`joinMode` default `AUTO`** |
| 11 | **Cover image** | `coverUrl` http(s) only — **no** BE upload | **Supabase Storage** upload on FE → public URL → `coverUrl` (recommended). Paste URL or sport placeholder OK for dev |
| 12 | **Publish** | `POST /matches` or `POST /matches/bulk` | PLAYER + Bearer |

**Do not confuse with Homepage search:** `GET /matches?location=` = find **joinable kèo** (browse pool). `GET /matches/venue-suggestions` = reuse **venues** for Host (wider DB pool).

Smoke (server up, `OTP_DEBUG=true`): `cd spot-backend && npm run smoke:matches`.
**Data flow:** frontends → `spot-backend` (REST `:3000`) → Supabase Postgres + Redis. `spot-backend` → `nlp-assistant` (5003) is implemented (`assistant` domain, forwards the player's own access token). `spot-backend` → `recommendation` (5001) is implemented (`recommendation` domain, `userId` derived server-side from the JWT, never client-supplied). `spot-frontend-mobile` consumes both (see `specs/004-ai-features-frontend-integration/`). `noshow-prediction` (5002) is still an empty scaffold.

## Code Style & Conventions

Per `PROJECT_RULES.md` §3 (target convention; only `spot-admin-console` has a
linter declared today — ESLint via `npm run lint`, though no `.eslintrc*` is
committed yet so it currently fails to run):

- **TS/JS**: ESLint + Prettier, 2 spaces, single quotes, trailing commas.
- **Python** (once written): PEP8 via `black` (line length 88) + `isort`.
- **Naming**: `camelCase` functions/variables, `PascalCase` classes/interfaces/components, `UPPER_SNAKE_CASE` constants, `snake_case` DB tables/columns.
- **Backend layering**: each domain under `spot-backend/src/domains/<name>/` follows `controller/ dto/ entity/ repository/ service/` — match this structure when adding backend code.
- **Commits**: `<type>(<scope>): <description>` (e.g. `feat(booking): add slot lock`).

## Important Guidelines

- **Polyrepo, not monorepo**: `spot-frontend-web`, `spot-frontend-mobile`, and `spot-admin-console` each contain their own `.git` — they are independent repositories, not git submodules of this repo. A `git status`/`git commit` at this repo's root does **not** track changes inside them.
- **`spot-backend` is runnable** (auth + matchmaking, including `/users/:id`). Read `spot-backend/CLAUDE.md` before changing kèo APIs. Compose from this directory, not from `spot-backend/`.
- **`spot-ai-services/*` are empty directory scaffolds** — check for `requirements.txt`/app code before assuming a service is implemented. Matchmaking does **not** depend on them.
- **Env files**: `.env.development` and `.env.production` live at the repo root and are gitignored — never let real credentials get committed; verify `git status` shows them untracked before adding secrets. Note `docker-compose.yml` doesn't actually read `.env.development` (its values are hard-coded inline); `docker-compose.production.yml` does need `.env.production`, but only via an explicit `--env-file` flag — see Docker caveat above.
- **`Docs/` and `PA/`** hold course assignment materials (requirements docs, PDFs) — reference-only, not part of the running application.
- **`spot-backend/README.md` has corrupted content**: a chunk of the shell script that originally scaffolded the repo (heredocs, `git commit`, etc.) leaked verbatim into the middle of the file — don't treat that section as instructions to run.
- Each scaffolded app under `spot-*/` now has its own `CLAUDE.md` with app-specific status — read the relevant one before working in that app.
- **Polyrepo, not monorepo**: `spot-frontend-web`, `spot-frontend-mobile`, and `spot-admin-console` each contain their own `.git` — independent repos, not submodules. Root `git commit` does **not** track changes inside them. `spot-backend/` **is** tracked by this repo.
- **`spot-backend` is runnable** — use `spot-backend/CLAUDE.md` + `docs/API.md`. Do not revive old “no package.json / no user_profiles” assumptions.
- **`schema_auth` split:** `users` = auth identity; `user_profiles` = display + Settings prefs; view `user_prefs`. Prefs sync = same DB row (no Redis profile cache).
- **`spot-ai-services/*`**: `recommendation/` and `nlp-assistant/` are implemented (real app code, `requirements.txt`, `Dockerfile`, tests); `noshow-prediction/` is still an empty scaffold. Check for `requirements.txt`/app code before assuming a given service exists — don't assume all three are scaffolds.
- **Env files**: root `.env.development` / `.env.production` are gitignored. Backend secrets live in `spot-backend/.env` (also gitignored). Compose production needs `--env-file .env.production`.
- **`Docs/` and `PA/`** — course materials only, not app code.
- Each `spot-*/CLAUDE.md` is the source of truth for that app’s status — read it before editing.
