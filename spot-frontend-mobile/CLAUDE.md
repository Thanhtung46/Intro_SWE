# CLAUDE.md — spot-frontend-mobile

Scoped guide for this app. The repo-root `CLAUDE.md` (one level up) is the
polyrepo map and general behavioral guidelines — read it first for
cross-app context. This file is the local layer: what's actually true
inside `spot-frontend-mobile/` today.

Deeper, workflow-specific detail lives in `.claude/rules/*.md`
(code style, API conventions, testing), `.claude/agents/*.md` (review
subagents), and `.claude/skills/*` (scaffolders) — this file stays a
quick-reference, not a duplicate of those.

## Project Overview

Mobile client for **SPOT** (Sport Pitch Online Ticketing — HCMUS Software
Engineering coursework, Group 09), built with Expo + React Native +
`expo-router` for file-based navigation, in plain JavaScript (no
TypeScript — no `tsconfig.json` here). This is its **own git repository**
(nested `.git`) — `git status`/`git commit` at the polyrepo root does not
see changes made here.

Scope: this app targets the **Player / Match Host** actors only (venue
search, booking, matchmaking, reviews). Venue Owner / Referee / System
Administrator flows belong to `spot-admin-console`, not here — see
`.specify/memory/constitution.md` for the full rationale.

**Status: real screens exist, not an empty scaffold.** Onboarding (ticket
`SPOT-33`) is implemented and persists past first launch: `app/index.js` →
`app/onboarding/2.js` → `app/onboarding/3.js`, each a thin route delegating
to `src/screens/onboarding/OnboardingSlide{1,2,3}.js`, plus shared
`src/components/onboarding/PaginationDots.js` and `GlassCard.js` (frosted
illustration card via `expo-blur`), `src/hooks/useFloatingAnimation.js`
(shared float-in-place animation), `src/utils/onboardingStorage.js`
(AsyncStorage-backed `onboarding_completed` flag — `app/index.js` checks it
on mount and skips straight to `/home` if already set), and
`src/constants/colors.js`. Illustrations are real cropped PNGs (with
transparent backgrounds) under `assets/onboarding/`, sliced from the
`assets/icons.png` sprite sheet — not icon-font approximations. `app/home.js`
and `app/_layout.js` also exist.
Everything else under `src/` (`components/` beyond onboarding, `config/`,
`services/`, `state/`, `types/`) and `app/auth/`, `app/tabs/` are still
empty placeholders (only a `.gitignore` in each) — check for actual files
before assuming a screen, route, or service exists beyond what's listed
above.

## Known Gotchas

- **`npm install` fails today** without a flag — verified with a fresh
  `npm install --dry-run`: `react-test-renderer@19.2.8` (pulled in
  transitively) requires `react@^19.2.8`, but the root project pins
  `react@19.2.3`. This is an `ERESOLVE` conflict, not the "React 19 vs.
  `@testing-library/react-native` wanting ≤18" story you may see in older
  notes — that's now out of date (`@testing-library/react-native` is on
  `^13.2.0` here, which does support React 19). Fix:
  ```bash
  npm install --legacy-peer-deps
  ```
  Don't assume a plain `npm install` or `npm ci` will succeed.
- **`README.md` in this directory is stale** — it still says "empty
  scaffold" and lists the old `@testing-library/react-native@12.9.0`
  conflict. Don't trust it over this file or `package.json`; update it if
  you're touching onboarding-adjacent docs.
- **Version drift from the repo-root docs**: the root `CLAUDE.md` describes
  this app as "Expo 49 / React Native 0.72". `package.json` actually pins
  `expo@^57.0.12` and `react-native@^0.86.2` (React `19.2.3`). Trust
  `package.json` over that prose.
- **No `jest` config exists yet** despite `jest` + `jest-expo` +
  `@testing-library/react-native` being installed — `npm test` needs a
  `"jest": {"preset": "jest-expo"}` block (in `package.json` or a
  `jest.config.js`) added before it will actually run. Zero test files
  exist yet either.
- **No ESLint/Prettier config is committed** — style is enforced by hand
  (see `.claude/rules/code-style.md`), not tooling.
- **`.env.example`'s vars aren't wired up yet.** It lists `API_URL`,
  `SOCKET_URL`, `GOOGLE_MAPS_KEY`, `ENV`, but nothing reads them into the
  app yet — `process.env` is not populated at runtime in Expo/RN without
  extra bundler config. `expo-constants` **is** already a dependency, so
  the intended path is `app.json`'s `expo.extra` + `Constants.expoConfig.extra`,
  not a `.env` loader — see `.claude/rules/api-conventions.md`.
- **`spot-backend` has no `package.json` and isn't runnable yet** — don't
  block UI work on it being live; mock or clearly flag backend-dependent
  behavior instead (same rule file).
- A `Dockerfile` exists here but isn't wired into any root
  `docker-compose.yml` — Expo's dev workflow (device/simulator, Metro) runs
  via `npm start`/EAS, not Docker.

## Common Commands

```bash
npm install --legacy-peer-deps   # plain `npm install` currently fails, see above
npm start            # expo start
npm run android       # expo start --android
npm run ios           # expo start --ios
npm run web           # expo start --web
npm test              # will error until a jest config is added, see above
npm run test:watch
```

Production builds go through EAS, not local scripts (`eas.json` already
configures `development`/`preview`/`production` profiles):
```bash
eas build --platform ios
eas build --platform android
eas submit
```

## Architecture & Project Structure

```
app/                       # expo-router routes (file-based)
├── _layout.js              # root Stack layout
├── index.js                 # "/" — onboarding slide 1
├── home.js
├── onboarding/2.js, 3.js
├── auth/                   # route group, currently empty (.gitignore placeholder only)
└── tabs/                   # route group, currently empty (.gitignore placeholder only)
src/
├── screens/onboarding/     # OnboardingSlide1/2/3.js — actual screen UI
├── components/onboarding/  # PaginationDots.js, GlassCard.js — shared UI
├── hooks/useFloatingAnimation.js   # shared onboarding float animation
├── utils/onboardingStorage.js      # AsyncStorage onboarding_completed flag
├── constants/colors.js     # shared design tokens
└── config/ services/ state/ types/   # all still empty placeholders
```

Convention (see `.claude/rules/code-style.md` for the full version): each
screen is a thin `app/<route>.js` (owns navigation, calls `useRouter()`)
rendering a presentational `src/screens/<flow>/<Screen>.js` (owns UI, takes
navigation as callback props like `onNext`/`onSkip`). Use the
`expo-screen-scaffolder` skill to add a new screen following this pattern,
`zustand-store-generator` for shared state, and `api-service-scaffolder` for
backend calls.

## Code Style & Conventions

2 spaces, single quotes, trailing commas (matches the polyrepo root
convention; not enforced by tooling yet — no ESLint config here). Full
detail in `.claude/rules/code-style.md`.

## Important Guidelines

- This directory has its own `.git` — commits/branches here aren't visible
  from the polyrepo root.
- Nothing beyond the onboarding flow (see Project Overview) is implemented
  — verify a screen/route/service exists before assuming it does.
- Auth tokens and other sensitive values must go through `expo-secure-store`
  once auth exists, never `AsyncStorage` — see
  `.claude/rules/api-conventions.md` and the `security-auditor` subagent.
- Ticket refs in commits follow the existing `SPOT-NNN: ...` convention
  (e.g. `SPOT-33`).
- Before starting a feature, check `.specify/memory/constitution.md` and
  `specs/` (if a feature spec already exists) for this app's Spec Kit
  workflow.
