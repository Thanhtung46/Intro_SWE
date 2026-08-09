# SPOT Engineering - Project Rules & Technology Version Matrix

**Document Version**: 2.0.0 — Polyrepo Realignment
**Project**: SPOT (Sport Pitch Online Ticketing Platform)
**Author / Tech Lead**: Nguyễn Thanh Tùng (24127583)
**Target Team**: Group 09 (HCMUS Software Engineering Dept)

> **v2.0.0 change note**: v1.0.0 specified a pnpm monorepo (`apps/*`,
> `services/*`, `packages/*`, `infrastructure/`) that was abandoned early in
> favor of a **polyrepo**: five top-level directories (`spot-frontend-web/`,
> `spot-frontend-mobile/`, `spot-admin-console/`, `spot-backend/`,
> `spot-ai-services/`), three of which (`spot-frontend-web`,
> `spot-frontend-mobile`, `spot-admin-console`) are their own git
> repositories. This revision realigns the rules and version matrix to that
> reality. See each app's own `CLAUDE.md` for current implementation status
> (what's actually built vs. still an empty scaffold) — this document
> defines the *rules*, not the status.

---

## 1. Technology Stack & Version Lock Matrix

Version locks below reflect what's **actually pinned today** (a
`package.json` range, a Docker base image tag) where that exists. Where a
component has no code yet (`spot-backend`, `spot-ai-services/*`), the table
lists the **intended** stack — install exactly these when scaffolding
begins, don't drift from them without updating this doc.

### 1.1. Core Runtime Environment & Tools
| Technology / Tool | Version Lock | Notes |
| :--- | :--- | :--- |
| **Node.js** | **`18.x` LTS** | Matches `node:18-alpine` used in every committed Dockerfile. No `.nvmrc` is committed in any app — add one per app if you want `nvm use` to enforce this locally. Local dev machines may have a newer Node installed (e.g. `24.x`) for running scripts outside Docker; that's fine for tooling, but builds should be validated against 18.x via Docker before merging. |
| **Package Manager** | **`npm`** (whatever ships with your Node install) | Not pnpm — no `pnpm-workspace.yaml` exists, and there's no monorepo workspace to manage. Each app has its own lockfile (`package-lock.json`); commit it. |
| **Python** | **`3.11.x`** | Target for `spot-ai-services/*` once code exists. No `.python-version` is committed yet. |
| **TypeScript** | **`^5.3.0`** | Matches `spot-frontend-web` and `spot-admin-console` `package.json`. No root-level TypeScript version exists — each app pins its own. |
| **Docker Engine / Compose** | **Compose v2 (`docker compose`, not `docker-compose`)** | Compose files live at the repo root (`docker-compose.yml`, `docker-compose.production.yml`), not under `infrastructure/docker/`. |
| **PostgreSQL** | **`15-alpine`** | Matches `docker-compose.yml`. (v1.0.0 of this doc locked 16.3 — that was never actually deployed; 15-alpine is what's running.) |
| **Redis** | **`7-alpine`** | Matches `docker-compose.yml`. |

---

### 1.2. `spot-frontend-web/` (Next.js)
| Package Name | Locked Version | Description & Usage |
| :--- | :--- | :--- |
| **`next`** | **`^14.0.0`** | React Framework (App Router) |
| **`react` / `react-dom`** | **`^18.2.0`** | Core React UI runtime |
| **`tailwindcss`** | **`^3.3.0`** | Utility-first CSS framework (config file not committed yet — see this app's `CLAUDE.md`) |
| **`zustand`** | **`^4.4.0`** | Client-state management |
| **`axios`** | **`^1.6.0`** | HTTP client |

Not currently installed, despite being common Next.js companions — add
deliberately if/when needed, don't assume they're available:
`lucide-react`, `framer-motion`, `@tanstack/react-query`,
`react-hook-form`, `zod`.

---

### 1.3. `spot-admin-console/` (Vite, not Next.js)
| Package Name | Locked Version | Description & Usage |
| :--- | :--- | :--- |
| **`react` / `react-dom`** | **`^18.2.0`** | Core React UI runtime |
| **`react-router-dom`** | **`^6.20.0`** | Client-side routing (this app does not use Next.js/App Router) |
| **`recharts`** | **`^2.10.0`** | Charts for analytics/reporting views |
| **`zustand`** | **`^4.4.0`** | Client-state management |
| **`axios`** | **`^1.6.0`** | HTTP client |
| **`vite`** | **`^5.0.0`** | Build tool |

This app is architecturally distinct from `spot-frontend-web` — Vite +
React Router, no Tailwind, no App Router. Don't assume the two frontends
share a stack.

---

### 1.4. `spot-frontend-mobile/` (Expo)
| Package Name | Locked Version | Description & Usage |
| :--- | :--- | :--- |
| **`expo`** | **`~49.0.0`** | Cross-platform React Native framework |
| **`react-native`** | **`0.72.6`** | Mobile UI runtime |
| **`expo-router`** | **`^2.0.0`** | File-based navigation |
| **`@react-navigation/native`** | **`^6.1.9`** | Also present alongside `expo-router` — pick one as the primary navigation approach when screens are actually built; having both wired in isn't itself a bug, but don't let both grow independent routing logic. |
| **`zustand`** | **`^4.4.0`** | Client-state management |

`npm install` fails here today on a peer-dependency conflict
(`react-test-renderer` pulled in at a version `@testing-library/react-native`
doesn't accept) — use `npm install --legacy-peer-deps` until resolved. See
this app's `CLAUDE.md`.

---

### 1.5. `spot-backend/` — target stack (not installed yet)
No `package.json` exists in `spot-backend/` yet. The list below is the
**intended** dependency set for when backend work starts — install exactly
these, don't drift:

| Package Name | Target Version | Description & Usage |
| :--- | :--- | :--- |
| **`express`** | **`4.19.x`** | Node.js web server framework |
| **`jsonwebtoken`** | **`9.0.x`** | RS256 JWT authentication |
| **`argon2`** | **`0.40.x`** | OWASP-recommended password hashing |
| **`express-rate-limit`** | **`7.3.x`** | Rate limiting |
| **`helmet`** | **`7.1.x`** | HTTP security headers |
| **`pg`** | **`8.12.x`** | PostgreSQL client driver |
| **`@prisma/client` / `prisma`** | **`5.17.x`** | ORM |
| **`ioredis`** | **`5.4.x`** | Redis client driver |
| **`redlock`** | **`5.0.0-beta.2`** | Redis slot locking (see §2.3) |
| **`winston`** | **`3.13.x`** | Structured JSON logging |

There is exactly **one** backend service — not an `api-gateway` +
`core-api` split. Domain-driven under `src/domains/<name>/{controller,dto,
entity,repository,service}/`.

---

### 1.6. `spot-ai-services/*` — target stack (not installed yet)
No `requirements.txt` or Python code exists in any of `recommendation/`,
`noshow-prediction/`, `nlp-assistant/` yet. Target for when code starts:

| Python Package | Target Version | Purpose |
| :--- | :--- | :--- |
| **`fastapi`** | **`0.111.x`** | ASGI framework |
| **`uvicorn[standard]`** | **`0.30.x`** | ASGI server |
| **`xgboost`** | **`2.1.x`** | No-show prediction |
| **`scikit-learn`** | **`1.5.x`** | Recommendation engine |
| **`google-generativeai`** | **`0.7.x`** | Gemini SDK for the NLP assistant |
| **`pandas` / `numpy`** | **`2.2.x` / `1.26.x`** | Data preprocessing |
| **`psycopg2-binary`** | **`2.9.x`** | PostgreSQL connector |
| **`redis`** | **`5.0.x`** | Redis connector |

Each service builds and runs independently, its own `Dockerfile` (none
committed yet), no shared Python package between them.

---

## 2. Architecture & Repo Boundary Rules

1. **Polyrepo boundaries, not monorepo workspace boundaries**:
   - `spot-frontend-web`, `spot-frontend-mobile`, `spot-admin-console` are
     separate git repositories — there is no shared `packages/*` workspace
     to pull common code from. If code needs to be shared across them
     (types, a UI component), either duplicate it deliberately per repo or
     publish it as a versioned npm package — don't assume a local import
     path works across repos.
   - `spot-backend` and `spot-ai-services/*` communicate with each other
     (and are called by the frontends) over HTTP REST only. Direct code
     imports between them are not possible anyway (no shared workspace),
     but call this out explicitly: don't add a build-time dependency from
     one service's code onto another's.

2. **Database Boundary & Schema Scoping Rules** *(not yet implemented — no
   migrations exist in `spot-backend/migrations/` yet; this is the target
   for when they're written)*:
   - PostgreSQL queries MUST specify explicit schema names matching the
     domain folder they belong to (e.g. `schema_auth.users` for
     `src/domains/auth/`, `schema_booking.bookings` for
     `src/domains/booking/`).
   - No domain may perform raw SQL mutations on tables outside its own
     schema.

3. **Zero Double-Booking Ephemeral Locking Rule** *(not yet implemented —
   `src/domains/booking/` is currently an empty scaffold)*:
   - Any booking slot reservation MUST acquire the Redis lock
     `slot:lock:{field_id}:{date}:{start_time}` (TTL: `300` seconds) BEFORE
     initiating a database transaction.
   - Direct PostgreSQL booking inserts without an active Redis lock token
     are REJECTED.

4. **Security & Data Privacy Rules** *(not yet implemented —
   `src/domains/auth/` is currently an empty scaffold)*:
   - Passwords MUST be hashed using `argon2id`. Plaintext or MD5/SHA1
     hashing is FORBIDDEN.
   - JWT tokens MUST be signed with **RS256** asymmetric keys.
   - Accounts MUST lock automatically for 15 minutes after **5 consecutive
     failed login attempts**.
   - Sensitive actions (changing email, phone number) MUST require OTP
     re-confirmation.

---

## 3. Code Style, Linting & Git Conventions

1. **Coding Style Standards**:
   - **TypeScript/JS**: ESLint + Prettier, 2 spaces, single quotes, trailing
     commas. (v1.0.0 specified Airbnb config specifically — no ESLint
     config file is committed in any app yet, including
     `spot-admin-console` where `eslint` is already a dependency; `npm run
     lint` fails there today with "couldn't find a configuration file".
     Whoever adds the first `.eslintrc*`/`eslint.config.js` should decide
     then whether to adopt Airbnb or a lighter ruleset.)
   - **Python**: PEP8 compliance via `black` (line length 88) and `isort` —
     applies once `spot-ai-services/*` has code.
   - **Naming Conventions**:
     - Variables & Functions: `camelCase` (`lockSlot`, `calculateFee`)
     - Classes & Interfaces: `PascalCase` (`SlotLockManager`, `UserResponse`)
     - Constants: `UPPER_SNAKE_CASE` (`DEFAULT_LOCK_TTL_SECONDS = 300`)
     - Database Tables & Columns: `snake_case` (`booking_date`, `total_amount`)

2. **Git Flow & Branching Rules** *(target process — the repo currently has
   only a `master` branch; no `develop` or `feature/*` branches exist yet,
   and nothing technically enforces this beyond convention)*:
   - Direct commits to `main`/`master` (once a `develop` branch exists)
     should be avoided in favor of PRs.
   - Branch naming: `feature/<dri-name>/<feature-name>` (e.g.
     `feature/cuong/auth-otp`, `feature/khoa/redis-lock`).
   - Commit Message format: `<type>(<scope>): <description>` (e.g.
     `feat(booking): implement 5-min Redis slot lock TTL`).

3. **Pull Request & Review SLA** *(target process — no CI is configured
   yet; there's no `.github/workflows/` in this repo)*:
   - Every PR requires ≥1 approval from the module DRI or Tech Lead.
   - SLA for code review: within 24 hours.
   - Once CI exists: linter + unit tests MUST pass 100% before merge.

---

## 4. Team DRI Responsibility Quick Reference

Folder paths updated to match the actual polyrepo layout (v1.0.0 pointed at
`apps/*`/`services/*`/`packages/*`, none of which exist):

| Member Name | Role | Primary Folder Boundaries |
| :--- | :--- | :--- |
| **Nguyễn Thanh Tùng** | Tech Lead & Architect | `spot-backend/`, `spot-ai-services/`, root architecture docs (`CLAUDE.md`, this file) |
| **Nguyễn Thái Cường** | Security Lead | `spot-backend/src/domains/auth/` |
| **Đỗ Trương Khoa** | Core Backend Engineer | `spot-backend/src/domains/{booking,matchmaking,referee,review}/` |
| **K'Vớn** | Frontend & UX Lead | `spot-frontend-web/`, `spot-admin-console/`, `spot-frontend-mobile/` |
| **Đào Hoàng Phúc** | Database & Infra Lead | `spot-backend/migrations/`, `docker-compose.yml`, `docker-compose.production.yml`, `DOCKER.md` |
