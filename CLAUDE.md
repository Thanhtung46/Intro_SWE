


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

## Project Status

SPOT (Sport Pitch Online Ticketing Platform) is a pnpm monorepo in **early
scaffold stage**. Most of the architecture described in `PROJECT_RULES.md` is
not yet implemented — treat that file as the *target* architecture, not the
current state.

What exists today:
- Root workspace config (`package.json`, `pnpm-workspace.yaml`) — no lockfile yet.
- `services/ai-services/requirements.txt` — locked Python dependencies, no
  application code (`main.py`) yet.
- `infrastructure/docker/` — `docker-compose.yml` + `.env.example` covering the
  full target architecture (Postgres, Redis, api-gateway, core-api,
  ai-services, web-client, admin-portal).
- A `Dockerfile` per app/service (`apps/web-client`, `apps/admin-portal`,
  `services/api-gateway`, `services/core-api`, `services/ai-services`) —
  written ahead of the source code they'll build, so the Node-based ones
  will fail (`pnpm fetch` needs a lockfile; `pnpm --filter <name> run build`
  needs a `package.json`) and `ai-services` will fail at container *start*
  (no `main.py`/`app`) until real code lands.

Not yet started: `apps/*` and `services/api-gateway` / `services/core-api`
source code, `packages/*`, and a root `pnpm-lock.yaml`.

Before assuming any app/service has code, check the directory exists first.

## Running the project

Only the database layer is runnable right now:

```bash
cp infrastructure/docker/.env.example infrastructure/docker/.env
docker compose -f infrastructure/docker/docker-compose.yml up -d postgres redis
```

Once an app/service has real code and a `package.json` / `main.py`, bring up
everything:

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d --build
```

Node/Python toolchains are version-locked via `.nvmrc` / `.python-version` —
full dependency matrix in `PROJECT_RULES.md` §1.

## Structure

```
.
├── PROJECT_RULES.md         # Target architecture & version-lock matrix
├── package.json             # pnpm workspace root
├── pnpm-workspace.yaml
├── infrastructure/docker/   # docker-compose.yml + .env.example
├── services/
│   ├── ai-services/         # FastAPI (Python) — Dockerfile + requirements.txt, no app code yet
│   ├── api-gateway/         # Express — Dockerfile only, no source yet
│   └── core-api/            # Express/Prisma — Dockerfile only, no source yet
├── apps/
│   ├── web-client/          # Next.js — Dockerfile only, no source yet
│   ├── admin-portal/        # Next.js — Dockerfile only, no source yet
│   └── mobile-app/          # not yet created (Expo, not containerized)
└── packages/                # not yet created: shared-types, ui-components, database, redis-client
```

Folder ownership boundaries are defined in `PROJECT_RULES.md` §4.
