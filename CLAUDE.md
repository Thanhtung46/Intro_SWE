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
| `spot-frontend-mobile/` | Expo, React Native, expo-router, Zustand, Axios — `package.json` currently pins Expo `^57`/React Native `^0.86`/React `19.2.8` (not Expo 49/RN 0.72 as this line used to say; version drifts fast here, so check `package.json` directly). See `spot-frontend-mobile/CLAUDE.md` for current status — it has a real, mostly-wired auth/onboarding/home flow, not an empty scaffold, and plain `npm install` works (no `--legacy-peer-deps` needed anymore). |
| `spot-admin-console/` | Vite, React 18, TypeScript, React Router, Recharts, ESLint | Scaffolded, runnable — `docker build` verified working end-to-end. `npm run lint` fails today (no `.eslintrc*` committed, despite `eslint`/`@typescript-eslint/*` in `devDependencies`; there is **no oxlint** here despite older docs claiming so — a leftover `.oxlintrc.json` file exists but isn't wired to anything). |
| `spot-backend/` | Node.js/Express, domain-driven (controller/dto/entity/repository/service) | **Has a `package.json` and is installable/runnable** — the `auth` domain (register/role/OTP/login/refresh/forgot-password/reset-password) is fully implemented; other domains are still empty scaffolds. See `spot-backend/CLAUDE.md`/`README.md` for the full API. |
| `spot-ai-services/{recommendation,noshow-prediction,nlp-assistant}/` | Python/FastAPI (planned) | **Empty folder scaffolds only** (`app/`, `models/`, `services/`, `data/`) — no code, no `requirements.txt`, no `Dockerfile` |
| Infra | PostgreSQL 15-alpine, Redis 7-alpine, Docker Compose | `postgres`/`redis`/`admin-console` verified; **backend** builds with `env_file: spot-backend/.env` + `REDIS_HOST=redis`. Default backend DB is **Supabase**, not compose postgres. |

### Backend snapshot (Sprint 4 Player Core — recent work)

Implemented under `spot-backend/` (do not re-document full API here):

- **Auth:** register → role → OTP → login/refresh; forgot/reset password
- **Profile Hub:** `user_profiles` (display + prefs); `GET/PATCH /users/me`; Main Profile `GET /users/me/profile` (stats); Settings `GET/PATCH /users/me/preferences`; logged-in password change; local avatar upload
- **Contact change:** OTP-gated email/phone (FR-1.4) — not via plain PATCH
- **Schedule / notifications / reviews:** personal schedule + seed; inbox + T-24h/T-2h reminders; venue reviews + reply
- **Migrations:** squashed to `001` auth → `002` notification → `003` venue/booking/social → `004` review. Reset with `npm run migrate:reset` (destructive)
- **Not yet:** JWT refresh rotate/blacklist; admin approve OWNER/REFEREE; booking CRUD / matchmaking / payment / S3 CDN

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

**Backend (`spot-backend/`):**
```bash
cd spot-backend
npm install && cp .env.example .env   # DB_* (Supabase pooler), SMTP_*, JWT_SECRET, OTP_DEBUG
npm run migrate
npm run dev                           # http://localhost:3000
npm test
npm run smoke:otp|login|profile|schedule|notifications|reviews
```

**AI services (`spot-ai-services/*/`):** not runnable yet — no application
code or `requirements.txt` exists.

**Docker (repo root):**
```bash
docker compose up -d postgres redis          # always works (local postgres optional for backend)
docker compose up -d --build admin-console   # verified end-to-end
docker compose up -d --build redis backend   # uses spot-backend/.env; REDIS_HOST=redis
docker compose run --rm backend npm run migrate
docker compose build frontend-web recommendation noshow nlp  # still fail — see below
docker compose logs -f <service>
docker compose down [-v]
docker compose -f docker-compose.production.yml --env-file .env.production up -d   # --env-file required
```
`build.context` for `backend`/`frontend-web`/`admin-console` points at each
app directory. Status:
- `admin-console` — **builds successfully end-to-end.**
- `backend` — **builds** when `package.json`/`package-lock.json` present; runtime DB defaults to Supabase via `spot-backend/.env`.
- `frontend-web` — gets past `npm ci` but fails at `next build` (missing `globals.css` + Next/Tailwind configs).
- `recommendation`/`noshow`/`nlp` — no `Dockerfile` under `spot-ai-services/*/` yet.

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
├── spot-ai-services/        # 3 planned FastAPI microservices (empty scaffolds)
├── docker-compose.yml               # dev stack — each service builds from its own app's Dockerfile
├── docker-compose.production.yml    # prod stack
├── .env.development / .env.production   # compose env files (gitignored, contain placeholders)
├── PROJECT_RULES.md         # target architecture & version-lock matrix (aspirational, see caveat above)
├── Docs/ , PA/               # HCMUS course assignment materials — reference only, not app code
```

**Data flow:** frontends → `spot-backend` (REST `:3000`) → Supabase Postgres + Redis. Planned: backend → AI services recommendation (5001), noshow (5002), nlp (5003) — AI not implemented yet.

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

- **Polyrepo, not monorepo**: `spot-frontend-web`, `spot-frontend-mobile`, and `spot-admin-console` each contain their own `.git` — independent repos, not submodules. Root `git commit` does **not** track changes inside them. `spot-backend/` **is** tracked by this repo.
- **`spot-backend` is runnable** — use `spot-backend/CLAUDE.md` + `docs/API.md`. Do not revive old “no package.json / no user_profiles” assumptions.
- **`schema_auth` split:** `users` = auth identity; `user_profiles` = display + Settings prefs; view `user_prefs`. Prefs sync = same DB row (no Redis profile cache).
- **`spot-ai-services/*` are empty scaffolds** — check for `requirements.txt`/app code before assuming a service exists.
- **Env files**: root `.env.development` / `.env.production` are gitignored. Backend secrets live in `spot-backend/.env` (also gitignored). Compose production needs `--env-file .env.production`.
- **`Docs/` and `PA/`** — course materials only, not app code.
- Each `spot-*/CLAUDE.md` is the source of truth for that app’s status — read it before editing.
