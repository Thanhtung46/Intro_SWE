# CLAUDE.md — spot-backend

Scoped guide for this app. The repo-root `CLAUDE.md` (one level up) has
general behavioral guidelines and the cross-project map — read it too.

## Project Overview

Node.js/Express REST API for SPOT, domain-driven (`controller/dto/entity/
repository/service` per domain). Unlike the three frontends, this directory
has **no nested `.git`** — it's tracked directly by the repo-root git repo.

**Status: source skeleton only, not installable.** There is **no
`package.json`** anywhere in this directory. Only three source files have
real content: `src/server.js`, `src/app.js`, `src/shared/config/env.js`.
Every domain folder under `src/domains/{admin,auth,booking,matchmaking,
notification,payment,referee,review,venue}/` and the rest of `src/shared/`
(`constants/`, `database/`, `middleware/`, `types/`, `utils/`) and
`src/events/{handlers,topics}/` are empty directories. `migrations/`,
`seeds/`, `scripts/`, `config/`, `docs/` are also empty.

`Dockerfile` and `.dockerignore` exist and are correct (multi-stage,
`dumb-init`, healthcheck), but **`docker build` fails at `npm ci`** because
there's no `package.json` to install from — confirmed by a real build run.
This is the actual blocker, not a path/config issue.

## Common Commands

**Not runnable yet.** Do not assume `npm install`/`npm run dev`/`npm test`
work here until a `package.json` is added — there isn't one.

Once `package.json` exists, the README documents the intended commands:
```bash
npm install
npm run dev
npm test
npm run migrate
```

## Architecture & Project Structure

```
src/
├── server.js / app.js              # real content
├── domains/{admin,auth,booking,matchmaking,notification,payment,referee,review,venue}/
│   └── controller/ dto/ entity/ repository/ service/   # all empty
├── events/{handlers,topics}/        # empty
├── shared/
│   ├── config/env.js               # real content
│   └── constants/ database/ middleware/ types/ utils/  # empty
migrations/ seeds/ scripts/ config/ docs/   # empty
tests/{unit,integration,e2e,fixtures}/      # empty, no test files yet
Dockerfile / .dockerignore          # correct, but blocked on missing package.json
```

Match this domain layering (`controller/dto/entity/repository/service`) when
adding backend code — see root `CLAUDE.md` Code Style section.

## Code Style & Conventions

Root convention applies (2 spaces, single quotes, trailing commas, camelCase
functions, PascalCase classes). No linter config exists yet — nothing to
run.

## Important Guidelines

- **No `package.json` exists** — this is the single blocker for almost
  everything else here (install, dev server, tests, migrations, Docker
  build). Don't assume any npm command works until one is added.
- **`README.md` has corrupted content**: a chunk of the shell script that
  originally scaffolded this repo (heredocs building `Dockerfile` and a
  standalone `docker-compose.yml`, plus a `git add . && git commit`) leaked
  verbatim into the middle of the file. The heredoc's `Dockerfile` content
  shown there is a simpler single-stage version and does **not** match the
  actual `Dockerfile` committed here — don't use it as a reference; the real
  `Dockerfile` in this directory is the one that matters.
- `.env.example` lists many vars beyond what root `CLAUDE.md`'s
  `docker-compose.yml` currently wires up (MoMo, SendGrid, Firebase, AWS S3,
  Google Maps) — treat those as aspirational until code that reads them
  exists.
- This directory is tracked by the root repo (no nested `.git`), unlike
  `spot-frontend-web`/`spot-frontend-mobile`/`spot-admin-console`.
