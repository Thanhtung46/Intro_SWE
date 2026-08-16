# CLAUDE.md — spot-frontend-mobile

Scoped guide for this app. The repo-root `CLAUDE.md` (one level up) is the
cross-project map and general behavioral guidelines — read it first for
cross-app context. This file is the local layer: what's actually true
inside `spot-frontend-mobile/` today.

Deeper, workflow-specific detail lives in `.claude/rules/*.md`
(code style, API conventions, testing), `.claude/agents/*.md` (review
subagents), and `.claude/skills/*` (scaffolders) — this file stays a
quick-reference, not a duplicate of those.

## Project Overview

Mobile client for **SPOT** (Sport Pitch Online Ticketing — HCMUS Software
Engineering coursework, Group 09), built with Expo + React Native +
`expo-router` for file-based navigation, in TypeScript (`tsconfig.json` +
`@/*` → `src/*` path alias, wired via `babel-plugin-module-resolver`).
There is **no `.git` inside this directory** — verified directly
(`ls -la .git` → not found); this app was merged into the root repo
(commit `a2dff26`) and is now tracked there like everything else.
`git status`/`git commit` run from here operate on the single repo rooted
at the top of the monorepo; a plain-JS, no-TypeScript version of this app
may be true history, but it isn't the state on disk now.

Scope: this app targets the **Player / Match Host** actors only (venue
search, booking, matchmaking, reviews). Venue Owner / Referee / System
Administrator flows belong to `spot-admin-console`, not here — see
`.specify/memory/constitution.md` for the full rationale.

**Status: a real, mostly-wired auth + onboarding flow exists, not an empty
scaffold.** Everything below is written in TypeScript (`.tsx`/`.ts`).
Verified actually rendering end-to-end on web (headless-browser run,
onboarding → Skip → `/auth/choose-role`, no console page errors) — see
Known Gotchas for a route-conflict crash that blocked this until fixed.

- **Entry point**: `app/index.tsx` is the brand Splash screen
  (`src/screens/splash/SplashScreen.tsx`, ticket SPOT-28). It bootstraps
  onboarding-completed state + a secure token in parallel, then routes to
  `/onboarding`, `/auth/choose-role`, or `/home`.
- **Onboarding** (`SPOT-33`, reworked since to a single screen): `/onboarding`
  → `src/screens/onboarding/OnboardingScreen.tsx` (3 internal animated
  steps, not 3 separate routes anymore — the old `app/onboarding/{1,2,3}`
  routes are gone). `src/utils/onboardingStorage.ts` holds the
  AsyncStorage-backed `onboarding_completed` flag.
- **Auth** (`app/auth/`): `choose-role`, `register`, `login`, `otp`,
  `forgot-password`, `reset-password` — each a thin route over
  `src/services/authService.ts` (axios + `axios-mock-adapter`, gated by
  `USE_MOCK_API` in `src/config/env.ts` — see that file's header comment
  for the manual-QA trigger emails/OTPs per endpoint) and
  `src/schemas/*Schema.ts` (zod validation, each with a co-located
  `.test.ts`). `src/screens/auth/ChooseRoleScreen.tsx` is the only screen
  component under `src/screens/auth/`; the others render inline in their
  `app/auth/*.tsx` route file rather than following the thin-route/
  presentational-screen split described under Architecture below.
- **Owner registration** (`app/owner/`): `register` (→
  `src/screens/owner/OwnerRegisterScreen.tsx`, calls `registerOwner` in
  authService) and `welcome` (→ `OwnerWelcomeScreen.tsx`, has a
  copy-to-clipboard action via `expo-clipboard`). `app/pending.tsx` →
  `src/screens/common/PendingApprovalScreen.tsx` is the shared
  post-registration waiting screen.
- **Profile/session**: `app/profile/index.tsx`, `app/profile/edit.tsx`,
  `app/settings.tsx`, all reading from `src/context/UserContext.tsx` (wraps
  the app in `app/_layout.tsx`) and `src/utils/authStorage.ts`
  (secure-store token helpers).
- **Home** (`SPOT-34`, in progress): `app/home.tsx` is now a thin route
  wrapper around `src/screens/home/HomeScreen.tsx` — a "Football Dashboard"
  (Figma node `8:2`) with a blurred header (logo + avatar → `ProfileMenu`),
  a sport toggle (football/badminton), an image carousel, and a venue list
  built from `src/components/home/{VenueCard,BottomNavItem}.tsx` and assets
  under `assets/home/`. Previously `app/home.tsx` was just a placeholder;
  this is real, in-progress UI work, not yet wired to a live venues API.
- Test coverage exists (`__tests__/*.test.tsx`, plus co-located
  `*.test.ts(x)` next to several schemas/components) but **cannot run
  yet** — no jest config is committed, see Known Gotchas.

`src/state/` and `app/tabs/` are still empty placeholders (`.gitignore`
only) — check for actual files before assuming a store or tab route
exists beyond what's listed above.

## Known Gotchas

- **Plain `npm install` works now** — `react` is pinned to `19.2.8`
  (matching what `react-test-renderer` wants transitively), so the
  `ERESOLVE` conflict older notes describe is gone; verified with a fresh
  `npm install --dry-run`. `npm install --legacy-peer-deps` still works
  too and is harmless if you're used to typing it, but it's no longer
  required.
- **`npm start` can silently no-op** if a stale `expo start` process from
  an earlier session is still holding port 8081 — in non-interactive
  contexts (scripts, agents) Expo prints "Skipping dev server" instead of
  prompting to use another port. Check `lsof -i :8081` / kill the old
  process (or answer the "Use port 8082?" prompt) if `npm start` returns
  instantly without "Waiting on http://localhost:8081".
- **`expo-clipboard` was a missing dependency** (used by
  `OwnerWelcomeScreen.tsx`, not declared in `package.json`) — this made
  the web/native bundle fail to build (`UnableToResolveError`) even though
  Metro itself started fine and looked healthy. Fixed via
  `npx expo install expo-clipboard`, which pins the SDK-57-compatible
  version. If a screen import 500s the bundle again, check
  `package.json`'s `dependencies` before assuming it's a code bug — a new
  screen pulling in an Expo module needs `npx expo install <module>`, not
  a plain `npm install <module>`, to get the SDK-matched version.
- **Duplicate route files crashed the app on launch** — `app/_layout.js`
  and `app/_layout.tsx` both defined the root layout route
  (`.js` was a pre-TS leftover, never deleted after the `.tsx` rewrite).
  Expo Router does **not** silently pick one; it throws `Uncaught Error:
  The layouts "./_layout.tsx" and "./_layout.js" conflict on the route
  "/_layout". Remove or rename one of these files.` on every platform
  (verified via a headless-browser run on web: blank page, LogBox overlay
  with that exact message). `app/home.js`/`app/home.tsx` had the same
  duplicate-route shape. **Fixed** by deleting both `.js` files — the
  `.tsx` ones are the live versions (`UserContext`/`ProfileMenu` wiring).
  If `npm start`/`npm run web` looks like it's serving fine but the app
  itself won't render, check for another route file pair like this before
  assuming it's a dependency or config problem.
- **Version drift from the repo-root docs**: the root `CLAUDE.md` describes
  this app as "Expo 49 / React Native 0.72". `package.json` actually pins
  `expo@^57.0.12` and `react-native@^0.86.2` (React `19.2.8`). Trust
  `package.json` over that prose.
- **No `jest` config exists yet** despite `jest` + `jest-expo` +
  `@testing-library/react-native` being installed, and despite real test
  files now existing (`__tests__/*.test.tsx` + several co-located
  `*.test.ts(x)` under `src/`) — `npm test` fails immediately with "Jest
  encountered an unexpected token" (can't parse TSX) until a
  `"jest": {"preset": "jest-expo"}` block (in `package.json` or a
  `jest.config.js`) is added.
- **No ESLint/Prettier config is committed** — style is enforced by hand
  (see `.claude/rules/code-style.md`), not tooling.
- **`.env.example`'s vars aren't wired up yet.** It lists `API_URL`,
  `SOCKET_URL`, `GOOGLE_MAPS_KEY`, `ENV`, but nothing reads them into the
  app yet — `process.env` is not populated at runtime in Expo/RN without
  extra bundler config. `expo-constants` **is** already a dependency, so
  the intended path is `app.json`'s `expo.extra` + `Constants.expoConfig.extra`,
  not a `.env` loader — see `.claude/rules/api-conventions.md`.
- **`spot-backend` is runnable** (tracked by the root repo) — see
  `../spot-backend/CLAUDE.md` + `docs/API.md`. Mobile UI can call real APIs
  when the backend is up; mock only when working offline.
- A `Dockerfile` exists here but isn't wired into any root
  `docker-compose.yml` — Expo's dev workflow (device/simulator, Metro) runs
  via `npm start`/EAS, not Docker.

## Common Commands

```bash
npm install           # plain install works now, see Known Gotchas
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
├── _layout.tsx              # root Stack layout (wraps in UserProvider)
├── index.tsx                 # "/" — Splash screen, bootstraps + redirects
├── onboarding.tsx            # "/onboarding" — single animated screen
├── auth/                    # choose-role, register, login, otp, forgot/reset-password
├── owner/                   # register, welcome
├── profile/                 # index (view), edit
├── settings.tsx
├── pending.tsx               # shared post-registration waiting screen
├── home.tsx                  # thin route → src/screens/home/HomeScreen.tsx (Football Dashboard, SPOT-34)
└── tabs/                    # route group, still empty (.gitignore placeholder only)
src/
├── screens/{splash,onboarding,auth,owner,common,home}/   # presentational screen components
├── components/{onboarding,common,home}/ + top-level *.tsx  # shared UI (forms, OTP input, RoleCard, VenueCard, ...)
├── services/authService.ts   # axios + axios-mock-adapter, gated by USE_MOCK_API
├── schemas/                  # zod validation per form, each with a co-located *.test.ts
├── context/UserContext.tsx   # session state, wraps app in _layout.tsx
├── config/env.ts             # API_URL / USE_MOCK_API / etc. via expo-constants
├── utils/{authStorage,onboardingStorage}.ts   # secure-store token + AsyncStorage onboarding flag
├── hooks/useFloatingAnimation.ts
├── constants/ theme/          # design tokens
└── state/ types/               # state/ still empty; types/ has auth.ts only
```

Convention (see `.claude/rules/code-style.md` for the full version): each
screen is a thin `app/<route>.tsx` (owns navigation, calls `useRouter()`)
rendering a presentational `src/screens/<flow>/<Screen>.tsx` (owns UI, takes
navigation as callback props like `onNext`/`onSkip`) — not consistently
followed today, see the Auth bullet under Project Overview. Use the
`expo-screen-scaffolder` skill to add a new screen following this pattern,
`zustand-store-generator` for shared state, and `api-service-scaffolder` for
backend calls.

## Code Style & Conventions

2 spaces, single quotes, trailing commas (matches the repo-root
convention; not enforced by tooling yet — no ESLint config here). Full
detail in `.claude/rules/code-style.md`.

## Important Guidelines

- This directory has no `.git` of its own — it's part of the root monorepo,
  see Project Overview.
- Auth, owner-registration, profile, and settings flows are real (see
  Project Overview) — but `src/state/` and `app/tabs/` are still empty;
  verify a store or tab route exists before assuming it does.
- Auth tokens and other sensitive values must go through `expo-secure-store`
  once auth exists, never `AsyncStorage` — see
  `.claude/rules/api-conventions.md` and the `security-auditor` subagent.
- Ticket refs in commits follow the existing `SPOT-NNN: ...` convention
  (e.g. `SPOT-33`).
- Before starting a feature, check `.specify/memory/constitution.md` and
  `specs/` (if a feature spec already exists) for this app's Spec Kit
  workflow.
