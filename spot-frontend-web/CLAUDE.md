# CLAUDE.md — spot-frontend-web

Scoped guide for this app. The repo-root `CLAUDE.md` (one level up) has
general behavioral guidelines and the cross-project map — read it too.

## Project Overview

Next.js 14 (App Router) web client for SPOT. Talks to `spot-backend`'s REST
API. This used to be its own git repository, but was merged into the root
repo (commit `a2dff26`) — there is no nested `.git` here anymore; commits
are tracked by the root repo like everything else.

**Status: barely scaffolded.** Only `src/app/layout.tsx` and
`src/app/page.tsx` have content. Everything else — `src/components/{auth,
booking,common,matchmaking,venue,voice}/`, `src/hooks/`, `src/services/`,
`src/state/`, `src/styles/`, `src/types/`, `src/utils/`, `src/app/admin/`,
`src/app/auth/` — exists only as empty directories. No `tsconfig.json`, no
`next.config.js`, no Tailwind/PostCSS config file exist yet, despite
`tailwindcss`/`postcss`/`autoprefixer` being in `devDependencies`.

**`docker build` fails today**, confirmed by an actual build: `npm ci`
succeeds (a `package-lock.json` was generated — commit it), but `npm run
build` (`next build`) fails immediately because `layout.tsx` imports
`./globals.css`, which doesn't exist. Fixing that would likely just expose
the next missing file (`tailwind.config.js`, `postcss.config.js`,
`tsconfig.json`, `next.config.js` are all absent too) — treat this app as
needing its Next.js scaffold completed, not just one file.

## Common Commands

```bash
npm install
npm run dev        # next dev
npm run build       # next build
npm run start        # next start (after build)
npm run lint         # next lint
npm test             # jest
npm run test:watch
```

## Architecture & Project Structure

```
src/
├── app/            # App Router pages — only layout.tsx + page.tsx exist
│   ├── admin/      # empty
│   └── auth/       # empty
├── components/{auth,booking,common,matchmaking,venue,voice}/  # empty
├── hooks/ services/ state/ styles/ types/ utils/               # empty
tests/{e2e,integration,unit}/    # empty, no test files yet
Dockerfile / .dockerignore       # self-contained (build context = this dir); see status note above
```

API base URL (per README): `http://localhost:3000/api` — no `src/services/api.client.ts` file exists yet despite the README referencing it.

## Code Style & Conventions

Root convention applies (2 spaces, single quotes, trailing commas). No
`.eslintrc*` file is committed here — `eslint-config-next` is a devDependency
but not yet wired into a config file, so `npm run lint` relies on Next's
built-in default until one is added.

## Important Guidelines

- **`.env.example` uses the wrong prefix.** It defines `REACT_APP_*` vars
  (Create React App convention) — Next.js does not read these. Client-exposed
  env vars must be prefixed `NEXT_PUBLIC_*`. Treat the current
  `.env.example` as a placeholder to fix, not working config.
- No `tsconfig.json` exists. Don't assume path aliases (`@/...`) work until
  one is added deliberately — and don't assume `next build`/`next dev` will
  auto-generate one for you before failing; a real `docker build` run here
  failed on the missing `globals.css` before TS config was even reached.
- Every feature folder (auth, booking, matchmaking, venue, voice components)
  is an empty placeholder — verify a file exists before assuming any UI
  feature is implemented.
- This directory no longer has its own `.git` — `git status`/`git commit` at
  the repo root does see changes made here.
