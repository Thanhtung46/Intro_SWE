# CLAUDE.md — spot-admin-console

Scoped guide for this app. The repo-root `CLAUDE.md` (one level up) has
general behavioral guidelines and the cross-project map — read it too.

## Project Overview

Vite + React 18 + TypeScript admin dashboard for SPOT. Talks to
`spot-backend`'s REST API. This is its **own git repository** (has a nested
`.git`) — commits here are not tracked by the root repo.

**Status: scaffolded, and the most complete of the three frontends.**
`src/App.tsx`, `src/main.tsx`, `src/App.css`, `src/index.css` have real
content; `tests/` exists but has no test files yet. `nginx.conf` (used by the
production Docker image) proxies `/api/` to the `backend` container and sets
cache headers for static assets.

**`docker build` succeeds end-to-end** — verified with a real
`docker compose build admin-console` run (`tsc && vite build` → nginx image).
This is currently the only one of the five SPOT services with a fully
working Docker build.

## Common Commands

```bash
npm install
npm run dev         # vite
npm run build        # tsc && vite build
npm run preview      # preview the production build locally
npm run lint          # eslint src --ext .ts,.tsx — FAILS today, see below
npm run lint:fix
```

## Architecture & Project Structure

```
src/
├── App.tsx / main.tsx / App.css / index.css   # real content
├── assets/          # hero.png, vite.svg, react.svg
tests/               # empty, no test files yet
Dockerfile           # multi-stage: vite build → nginx:alpine
nginx.conf           # serves dist/, proxies /api/ → backend:3000
.dockerignore
```

## Code Style & Conventions

Root convention applies (2 spaces, single quotes, trailing commas).
`eslint` + `@typescript-eslint/{eslint-plugin,parser}` are devDependencies
and `npm run lint` invokes `eslint` directly, but **no `.eslintrc*` (or flat
`eslint.config.js`) is committed** — running `npm run lint` today errors with
"ESLint couldn't find a configuration file" (confirmed by running it). Root
`CLAUDE.md` previously described this project as using oxlint; that's not
what's in `package.json` — don't rely on that claim.

## Important Guidelines

- This directory has its own `.git` — `git status`/`git commit` at the repo
  root does not see changes made here.
- `npm run lint` will fail until an ESLint config file is added — don't
  assume CI/lint gates work here yet.
- `README.md`'s "Project Structure" section is an empty heading with no
  content under it — don't expect a tree diagram there.
- `.env.example` → copy to `.env` per README; `VITE_API_URL`/`VITE_ENV` are
  the vars actually read (matches what `docker-compose.yml` passes in).
