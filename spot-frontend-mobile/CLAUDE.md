# CLAUDE.md — spot-frontend-mobile

Scoped guide for this app. The repo-root `CLAUDE.md` (one level up) has
general behavioral guidelines and the cross-project map — read it too.

## Project Overview

Expo 49 / React Native 0.72 mobile client for SPOT, using `expo-router` for
file-based navigation. This is its **own git repository** (has a nested
`.git`) — commits here are not tracked by the root repo.

**Status: empty scaffold.** Only root-level files exist (`package.json`,
`app.json`, `eas.json`, `.env.example`, `Dockerfile`, `README.md`). The
`app/` directory (expected `auth/` and `tabs/` route groups) and every `src/`
subfolder (`components/`, `config/`, `hooks/`, `screens/`, `services/`,
`state/`, `types/`, `utils/`) contain **zero files** — not even a placeholder
screen. `npm start` will boot Expo but there is nothing to render beyond the
default splash.

**`npm install` fails today** — confirmed by an actual run: `react-test-renderer@19.2.8`
(pulled in transitively) conflicts with `@testing-library/react-native@12.9.0`,
which peer-depends on React `>=16.8.0` but not 19. Use `npm install
--legacy-peer-deps` until the dependency versions are reconciled, and don't
assume a plain `npm install` (or `npm ci`, which has no lockfile to run
against anyway) will succeed.

There's a `Dockerfile` here too, but it isn't referenced by any
`docker-compose.yml` at the repo root — Expo's dev workflow (device/simulator
connection, Metro bundler) doesn't fit a typical container setup, so this app
runs via `npm start`/EAS, not Docker.

## Common Commands

```bash
npm install
npm start           # expo start
npm run android      # expo start --android
npm run ios          # expo start --ios
npm run web          # expo start --web
npm test
npm run test:watch
```

Production builds use EAS (per README), not covered by local npm scripts:
```bash
eas build --platform ios
eas build --platform android
eas submit
```

## Architecture & Project Structure

```
app/            # expo-router routes — auth/, tabs/ expected, currently empty
src/
├── components/ config/ hooks/ screens/ services/ state/ types/ utils/   # all empty
```

## Code Style & Conventions

Root convention applies (2 spaces, single quotes, trailing commas). No
ESLint config is committed here yet. Mirror `spot-frontend-web`'s folder
naming when adding files (`services/`, `state/`, `hooks/`, `types/`, `utils/`)
for consistency across the two frontends.

## Important Guidelines

- Nothing is implemented yet — check for actual files before assuming any
  screen, route, or service exists.
- `.env.example` lists plain vars (`API_URL`, `SOCKET_URL`,
  `GOOGLE_MAPS_KEY`, `ENV`) but no env-loading library (`expo-constants`,
  `react-native-dotenv`, etc.) is in `package.json` dependencies yet — these
  won't be readable via `process.env` in RN/Expo without adding one first.
- This directory has its own `.git` — `git status`/`git commit` at the repo
  root does not see changes made here.
