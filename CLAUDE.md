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
Software Engineering coursework, Group 09). It is a **monorepo**: as of
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
| `spot-frontend-mobile/` | Expo, React Native, expo-router, Zustand, Axios — `package.json` currently pins Expo `^57`/React Native `^0.86`/React `19.2.8` (version drifts fast here, check `package.json` directly). | Real, mostly-wired auth/onboarding/home/booking/venue-detail flow, not an empty scaffold. Plain `npm install` works (no `--legacy-peer-deps` needed). See `spot-frontend-mobile/CLAUDE.md`. |
| `spot-admin-console/` | Vite, React 18, TypeScript, React Router, Recharts, ESLint | Scaffolded, runnable — `docker build` verified working end-to-end. `npm run lint` fails today (no `.eslintrc*` committed, despite `eslint`/`@typescript-eslint/*` in `devDependencies`; there is **no oxlint** here despite older docs claiming so — a leftover `.oxlintrc.json` file exists but isn't wired to anything). Also hosts the **Venue Owner console** (`/owner`, `/owner/schedule`, `/owner/facilities`, `/owner/revenue`, `/owner/reviews`) consuming `spot-backend`'s `/owner/*` API — spec `006-owner-booking-web`. |
| `spot-backend/` | Node.js/Express, domain-driven (controller/dto/entity/repository/service), ESM, Node ≥ 18 | **Runnable** (local or Docker). Auth + **matchmaking (kèo) Phases 1–5** + **Groups (hội) G0–G5** + **Tournaments (giải đấu) T0–T5** + venue/booking + referee domains done. Default DB is **Supabase Postgres** (Session pooler), not the optional compose `postgres` profile. File uploads (avatar/verification/facility images) go through **Supabase Storage**, not local disk. See `spot-backend/CLAUDE.md`. |
| `spot-ai-services/{recommendation,nlp-assistant}/` | Python/FastAPI | **Implemented** — real app code, `requirements.txt`, `Dockerfile`, tests. `noshow-prediction/` is still an **empty folder scaffold** (`app/`, `models/`, `services/`, `data/` — no code). See `spot-ai-services/CLAUDE.md`. |
| Infra | PostgreSQL 15-alpine (optional profile), Redis 7-alpine, Docker Compose | Default backend uses **Supabase** + Redis. `admin-console`/`backend`/`redis` docker builds verified; `nlp` has a Dockerfile + live compose block; `recommendation` has a Dockerfile but no compose service block yet; `noshow` has neither. |

### Backend snapshot (auth + profile + matchmaking + groups)

Implemented under `spot-backend/` (do not re-document full API here):

- **Auth:** register → role → OTP → login/refresh; forgot/reset password
- **Profile Hub:** `user_profiles` (display + prefs); `GET/PATCH /users/me`; Main Profile `GET /users/me/profile`; Settings `GET/PATCH /users/me/preferences`; password change; avatar upload (Supabase Storage, not local disk)
- **Contact change:** OTP-gated email/phone (FR-1.4) — not via plain PATCH
- **Schedule / notifications / reviews:** personal schedule + seed; inbox + T-24h/T-2h reminders + match cancel types + **group/tournament join types**; venue reviews + reply; **pickup kèo host reviews** (`POST /matches/:id/review`); **referee** inbox `REFEREE_INVITATION` / `REFEREE_RATING_REQUEST`
- **Matchmaking (kèo):** browse/list/detail/join/mine/my-join-requests; lifecycle expiry worker; Manage Squad fields; post-match review + `summary`; host `rating` live on cards/profile
- **Groups (hội) G0–G5:** create/browse/detail; join AUTO/APPROVAL; mine/favorites; admin PATCH + courts/slots; members/schedule matrix/gallery; kick/transfer/leave/delete; inbox notifications — Figma Manage `101:2`, detail tabs `810:*`. Product locks: skill **hard gate** on join; `memberCount` = admin + accepted only (**PENDING không tính**). Detail: [`spot-backend/docs/agent/05-groups-tournaments.md`](./spot-backend/docs/agent/05-groups-tournaments.md); contract: [`spot-backend/docs/api/05-groups.md`](./spot-backend/docs/api/05-groups.md).
- **Tournaments (giải đấu) T0–T5:** create/browse/detail/join (captain + APPROVAL); mine/favorites; organizer manage; matches + results; standings PTS; PATCH winners + in-team ranks; lifecycle worker — Figma browse `880:404`, detail tabs Overview/Matches/Standings/Players. Product locks: [`spot-backend/docs/TOURNAMENT_PLAN.md`](./spot-backend/docs/TOURNAMENT_PLAN.md). **FE contract:** [`spot-backend/docs/api/06-tournaments.md`](./spot-backend/docs/api/06-tournaments.md).
- **Referee domain:** Job Board, invitations **Plan A** (`myVenues` + Pending Queue), hire-referee fan-out, player rating — see [`agent-docs/03-referee.md`](./agent-docs/03-referee.md).
- **Migrations:** `001` auth → `014` tournaments → **`015`–`022` admin + referee + board filter/favourite**. Run `npm run migrate` after pull.
- **Not yet:** JWT refresh rotate/blacklist; booking **payment gateway** (non-prod: `POST /bookings/:id/dev/mark-paid`); FCM device push; Admin UI approvals; **referee FE screens**


## Agent notes index

Full project reference (commands, architecture, per-domain agent notes) lives under [`agent-docs/`](./agent-docs/) (kept ≤300 lines/file):

| Topic | File |
| :--- | :--- |
| Common commands (web / mobile / admin / backend / AI services / Docker) | [`agent-docs/00-commands.md`](./agent-docs/00-commands.md) |
| Architecture, project structure, data flow | [`agent-docs/01-architecture.md`](./agent-docs/01-architecture.md) |
| Matchmaking (kèo) | [`agent-docs/02-matchmaking.md`](./agent-docs/02-matchmaking.md) |
| Referee (trọng tài) | [`agent-docs/03-referee.md`](./agent-docs/03-referee.md) |
| Groups (hội) \& Tournaments (giải đấu) | [`agent-docs/04-groups-tournaments.md`](./agent-docs/04-groups-tournaments.md) |

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

- **Monorepo, not polyrepo**: `spot-frontend-web`, `spot-frontend-mobile`, and `spot-admin-console` no longer have their own nested `.git` — as of commit `a2dff26` the whole tree (including `spot-backend`/`spot-ai-services`) is tracked by this single repo's history. A `git status`/`git commit` at this repo's root **does** track changes everywhere. (An older version of this note called it a polyrepo — verify with `ls -la spot-*/.git` if in doubt, don't trust stale prose.)
- **`spot-backend` is runnable** — auth + matchmaking (kèo) + groups (hội) + tournaments (giải đấu) + venue/booking + referee domains are all implemented. Read `spot-backend/CLAUDE.md` + `docs/API.md` before changing any of these APIs. Compose from this repo's root, not from `spot-backend/`.
- **`schema_auth` split:** `users` = auth identity; `user_profiles` = display + Settings prefs; view `user_prefs`. Prefs sync = same DB row (no Redis profile cache).
- **`spot-ai-services/*`**: `recommendation/` and `nlp-assistant/` are implemented (real app code, `requirements.txt`, `Dockerfile`, tests); `noshow-prediction/` is still an empty scaffold. Check for `requirements.txt`/app code before assuming a given service exists — don't assume all three are scaffolds. Matchmaking does **not** depend on any of them.
- **Env files**: root `.env.development`/`.env.production` are gitignored. Backend secrets (DB, SMTP, JWT, Supabase Storage) live in `spot-backend/.env` (also gitignored, separate file). `docker-compose.yml` doesn't actually read `.env.development` (its values are hard-coded inline); `docker-compose.production.yml` does need `.env.production`, but only via an explicit `--env-file` flag — see the Docker section in [`agent-docs/00-commands.md`](./agent-docs/00-commands.md).
- **`Docs/` and `PA/`** hold course assignment materials (requirements docs, PDFs) — reference-only, not part of the running application.
- **`spot-backend/README.md` has corrupted content**: a chunk of the shell script that originally scaffolded the repo (heredocs, `git commit`, etc.) leaked verbatim into the middle of the file — don't treat that section as instructions to run.
- Each `spot-*/CLAUDE.md` is the source of truth for that app's current status — read the relevant one before working in that app; don't trust this file's summaries over it.
