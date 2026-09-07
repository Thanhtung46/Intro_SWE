# CLAUDE.md — spot-frontend-mobile

Scoped guide for this app. The repo-root `CLAUDE.md` (one level up) is the
cross-project map and general behavioral guidelines — read it first for
cross-app context. This file is the local layer: what's actually true
inside `spot-frontend-mobile/` today.

Only `.claude/skills/speckit-*` (the Spec Kit workflow skills) exist under
`.claude/` today — there is no `.claude/rules/*.md`, `.claude/agents/*.md`,
or scaffolder skills (`expo-screen-scaffolder`, `zustand-store-generator`,
`api-service-scaffolder`) despite earlier versions of this file citing
them repeatedly; verify with `find .claude -type f` before trusting a
reference to one. This file is the source of truth for conventions until
those are actually written.

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
  `forgot-password`, `reset-password` — each a thin route over a real
  presentational screen component under `src/screens/auth/`
  (`ChooseRoleScreen`, `RegisterScreen`, `LoginScreen`, `OtpScreen`,
  `ForgotPasswordScreen`, `ResetPasswordScreen` — all 6 exist and follow
  the thin-route/presentational-screen split), calling
  `src/services/authService.ts` (axios; the `axios-mock-adapter` import
  and mock block are commented-out dead code — `USE_MOCK_API` in
  `src/config/env.ts` doesn't actually gate anything today, real network
  calls always fire regardless of the flag) and `src/schemas/*Schema.ts`
  (zod validation, each with a co-located `.test.ts`).
- **Owner registration** (`app/owner/`): `register` (→
  `src/screens/owner/OwnerRegisterScreen.tsx`, calls `registerOwner` in
  authService) and `welcome` (→ `OwnerWelcomeScreen.tsx`, has a
  copy-to-clipboard action via `expo-clipboard`). `app/pending/index.tsx` →
  `src/screens/common/PendingApprovalScreen.tsx` is the shared
  post-registration waiting screen.
- **Profile/session**: `app/profile/index.tsx`, `app/profile/edit.tsx`,
  `app/settings/index.tsx`, all reading from `src/context/UserContext.tsx` (wraps
  the app in `app/_layout.tsx`) and `src/utils/authStorage.ts`
  (secure-store token helpers).
- **Home** (`SPOT-34`, in progress): `app/home/index.tsx` is a thin route wrapper
  around `src/screens/home/HomeScreen.tsx` — a "Football Dashboard" (Figma
  node `8:2`) with a sport toggle (football/badminton), an image carousel,
  a "Book Field" quick action (→ `/booking`), and a venue list built from
  `src/components/home/VenueCard.tsx` and assets under `assets/home/`,
  wired to the real `GET /venues` via `venueService.ts`. A "Suggested for
  you" section (spec `004-ai-features-frontend-integration`) sits above it,
  backed by `GET /recommendations` via `src/services/recommendationService.ts`
  — reuses `VenueCard` as-is, and is simply omitted (not an error state)
  when the recommendation service is unavailable.
- **AI Assistant** (`app/assistant/index.tsx` → `src/screens/assistant/AssistantScreen.tsx`,
  spec `004-ai-features-frontend-integration`): chat screen reached from the
  AI icon in the shared header — text + voice search, join/host confirmation
  cards. Calls `src/services/assistantService.ts`
  (`POST/GET/DELETE /assistant/conversations/:id(/messages)`); voice capture
  uses `expo-audio` + `expo-file-system` (`src/components/assistant/VoiceRecorderButton.tsx`).
  Tapping a chat result currently falls back to `comingSoon()` — no
  match-detail screen exists yet (only `/venue/[id]`, and a `matchId` isn't
  a `venueId`).
- **Booking** (`app/booking/index.tsx`, `app/booking/map.tsx`): reached from
  Home's "Book Field" quick action. `BookingScreen.tsx` is a venue list
  (Figma node `79:1390`) with its own search/filter bar and a map-view
  button (→ `/booking/map`); `BookingMapScreen.tsx` is a **pre-SPOT-76
  static map-image mockup** (Figma node `79:1286`) with tappable pins and a
  venue popup — its pan/zoom/location controls are `comingSoon()`
  placeholders and its venue data is a local mock array. This is the one
  screen still on the old mockup; the SPOT-76 map stack below (real map via
  WebView + Leaflet + Geoapify) has not been ported to it yet.
- **Maps (SPOT-76)** — no `react-native-maps`, no Google Maps key. The stack
  is `react-native-webview` + Leaflet (CDN) + Geoapify raster tiles
  (`EXPO_PUBLIC_GEOAPIFY_API_KEY`, see `src/config/env.ts`):
  - `src/components/common/AppMap.tsx` — marker map + an optional `routeLine`
    polyline (Leaflet `L.polyline` in `colors.primary`, fits its bounds).
    Embedded on Match / Group / Tournament detail (venue mini-map) and
    full-screen in `JoinMatchMapScreen` (browse-all, `/matches/map`).
    `AppMap.web.tsx` is a deliberate "not available on web" stub — `npm run
    web` isn't the primary target.
  - `src/screens/common/VenueMapScreen.tsx` + `app/venue-map.tsx` — the
    shared single-venue map (pin + text fallback when a venue has no
    coords). Reached via `openVenueDirections(router, venue)`
    (`src/utils/directions.ts`) from the `MatchCard` paper-plane, referee
    board / assignment flows, and every detail screen's venue block — that
    helper is the single choke point for the `/venue-map` route. Its
    **"Chỉ đường"** button requests GPS (`requestCurrentPosition`,
    `src/utils/location.ts`) and calls `getMotorcycleRoute`
    (`geoapifyService.ts` — Geoapify Routing, `mode=motorcycle`, same
    key/quota) to draw a blue route line + show distance/ETA. Native only;
    any failure (no coords / permission declined / routing error / web)
    falls back to `openDirections` (external Google Maps).
  - `src/components/matches/PinDropModal.tsx` (+ `PinDropMap.tsx` / `.web.tsx`)
    — "find it on the map" pin picker used by all three create screens
    (`HostMatchScreen`, `CreateGroupScreen`, `CreateTournamentScreen`):
    Geoapify autocomplete search → drop/drag pin → `reverseGeocode` prefills
    Address + best-effort Province/Ward (`src/utils/vnAdminMatch.ts`, pre-2025
    GSO codes, always lands in an editable field).
- The top app bar (logo + AI/notification/avatar) is primarily owned by
  `src/components/AppShell.tsx` (Home/Matches/Schedule/Settings), with the
  AI sparkle wired to `router.push(ROUTES.ASSISTANT)`. `BookingScreen` may
  still use `src/components/layout/AppHeader.tsx` separately;
  `BookingMapScreen` has no header (full-bleed map). The
  football/badminton segmented toggle is shared via
  `src/components/venue/SportSegmentedToggle.tsx` (Home/Booking only —
  the map screen's "All/Football/Badminton" filter-chip row is a
  different shape and stays screen-local).
- **Bottom navigation**: `SlidingBottomNav` (via `AppShell` / `BottomNav.tsx`)
  owns the 5-tab array — Home/Booking/Matches/Schedule/Settings — and
  navigates with `router.replace` so tab switches don't stack screens.
- Test coverage exists (`__tests__/*.test.tsx`, plus co-located
  `*.test.ts(x)` next to several schemas/components) and a jest config
  **is** committed (`"jest": {"preset": "jest-expo"}` in `package.json`) —
  but `npm test` currently fails in this environment because
  `node_modules/expo-modules-core` is missing (an install gap, not a
  config gap); re-run `npm install` before assuming the suite is broken.

`src/state/` and `app/tabs/` are still empty placeholders (`.gitignore`
only) — check for actual files before assuming a store or tab route
exists beyond what's listed above.

## Known Gotchas

- Plain `npm install` works (`react` pinned to `19.2.8`, matching what `react-test-renderer` wants transitively) — no `--legacy-peer-deps` needed.
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
- `package.json` pins `expo@^57.0.12` and `react-native@^0.86.2` (React `19.2.8`) — trust `package.json` over any prose elsewhere that says otherwise.
- Jest config exists (`"jest": {"preset": "jest-expo"}` in `package.json`). `npm test` fails today with "Cannot find module 'expo-modules-core'" — an install gap (re-run `npm install`), not a config gap.
- **No ESLint/Prettier config is committed** — style is enforced by hand, not tooling (see Code Style & Conventions below).
- **`.env.example` — mixed.** `EXPO_PUBLIC_GEOAPIFY_API_KEY` **is** wired:
  `src/config/env.ts` reads `process.env.EXPO_PUBLIC_*` (Metro inlines
  `EXPO_PUBLIC_`-prefixed vars at build time, SDK 49+). The rest
  (`API_URL`, `SOCKET_URL`, `ENV`) are still placeholders that nothing
  reads — `API_URL` is actually derived at runtime in `env.ts`.
- Single color-token source: `src/constants/colors.ts` — every screen imports `colors` from `@/constants/colors`.
- **`spot-backend` is runnable** (tracked by the root repo) — see
  `../spot-backend/CLAUDE.md` + `docs/API.md`. Mobile UI can call real APIs
  when the backend is up; mock only when working offline.
- A `Dockerfile` exists here but isn't wired into any root
  `docker-compose.yml` — Expo's dev workflow (device/simulator, Metro) runs
  via `npm start`/EAS, not Docker.

## Common Commands

```bash
npm install            # install dependencies
npm start              # expo start (Metro). Then press a / i / w
npm run android        # expo run:android — build + install Dev Client APK (first time / after native changes)
npm run ios            # expo run:ios
npm run web            # expo start --web
npm test               # jest config exists; currently fails on missing expo-modules-core, see Known Gotchas
npm run test:watch
```

**Android first-time (required once per emulator/device):** this app ships
`expo-dev-client` (AI voice / native modules). `npm start` → `a` will fail
with `No development build (com.anonymous.spotapp)` until the APK is
installed. Fix:

```bash
# Need JDK 17+ (Android Studio's bundled JBR is fine). Then:
npm run android        # builds + installs com.anonymous.spotapp on the emulator
```

After that, daily flow is just `npm start` → press `a` (or open the **SPOT**
app on the emulator). Do **not** log in to Expo Go for this path.

Web does not need a Dev Client: `npm start` → `w`.

Production builds go through EAS, not local scripts (`eas.json` already
configures `development`/`preview`/`production` profiles):
```bash
eas build --platform ios
eas build --platform android
eas submit
```

## Architecture & Project Structure

```
app/                       # expo-router routes (file-based) — every feature
│                            # lives in its own folder, even single-route ones
├── _layout.tsx              # root Stack layout (wraps in UserProvider)
├── index.tsx                 # "/" — Splash screen, bootstraps + redirects
├── onboarding/index.tsx      # "/onboarding" — single animated screen
├── auth/                    # choose-role, register, login, otp, forgot/reset-password
├── owner/                   # register, welcome
├── profile/                 # index (view), edit
├── settings/index.tsx
├── schedule/index.tsx
├── pending/index.tsx         # shared post-registration waiting screen
├── home/index.tsx            # thin route → src/screens/home/HomeScreen.tsx (Football Dashboard, SPOT-34)
├── booking/
│   ├── index.tsx              # thin route → src/screens/booking/BookingScreen.tsx (venue list)
│   └── map.tsx                 # "/booking/map" → src/screens/booking/BookingMapScreen.tsx (venue map mockup)
├── venue/[id].tsx            # "/venue/:id" → src/screens/venue/VenueDetailScreen.tsx (venue detail)
├── assistant/index.tsx        # thin route → src/screens/assistant/AssistantScreen.tsx (AI chat, spec 004)
├── venue-map.tsx             # "/venue-map" → src/screens/common/VenueMapScreen.tsx (shared single-venue map — Matches/Groups/Tournaments/Referee)
├── matches/ , groups/ , tournaments/ , referee/   # SPOT-76 / SPOT-93 feature routes (not expanded here — see each feature's Figma/plan)
└── tabs/                    # route group, still empty (.gitignore placeholder only)
src/
├── screens/{splash,onboarding,auth,owner,common,home,booking,venue,assistant,profile,settings,schedule}/   # presentational screen components
├── components/
│   ├── navigation/{BottomNav,BottomNavItem}.tsx   # shared bottom nav (5-tab array + wiring)
│   ├── layout/AppHeader.tsx                        # top app bar — Booking only, see note above (AppShell duplicates it for Home)
│   ├── venue/SportSegmentedToggle.tsx               # shared football/badminton toggle (Home + Booking)
│   ├── assistant/{ChatMessageBubble,PendingActionCard,VoiceRecorderButton}.tsx   # AI chat UI (spec 004)
│   ├── {onboarding,common,home,booking}/ + top-level *.tsx  # shared UI (forms, OTP input, RoleCard, VenueCard, ...)
├── services/authService.ts   # axios; the axios-mock-adapter block is dead code, USE_MOCK_API doesn't gate anything
├── services/{recommendationService,assistantService}.ts   # spec 004 — both call the shared apiClient, not their own axios instance
├── schemas/                  # zod validation per form, each with a co-located *.test.ts
├── context/UserContext.tsx   # session state, wraps app in _layout.tsx
├── config/env.ts             # API_URL / USE_MOCK_API / etc. via expo-constants
├── utils/{authStorage,onboardingStorage,comingSoon}.ts   # secure-store token, AsyncStorage onboarding flag, shared "coming soon" alert
├── hooks/useFloatingAnimation.ts
├── constants/{colors,routes}.ts   # single color-token source (src/theme/colors.ts was merged in and deleted) + centralized route paths
└── state/ types/               # state/ still empty; types/ has auth.ts + venue.ts (shared VenueBase type) + assistant.ts (ChatMessage, spec 004)
```

Convention: each screen is a thin `app/<route>.tsx` (owns navigation, calls
`useRouter()`) rendering a presentational `src/screens/<flow>/<Screen>.tsx`
(owns UI, takes navigation as callback props like `onNext`/`onSkip`) — this
is followed consistently today across every flow.

## Code Style & Conventions

2 spaces, single quotes, trailing commas (matches the repo-root
convention; not enforced by tooling yet — no ESLint config here). Imports
use the `@/*` → `src/*` alias, not deep relative paths (`../../`) — every
file under `src/` and `app/` follows this today.

## Important Guidelines

- This directory has no `.git` of its own — it's part of the root monorepo,
  see Project Overview.
- Auth, owner-registration, profile, and settings flows are real (see
  Project Overview) — but `src/state/` and `app/tabs/` are still empty;
  verify a store or tab route exists before assuming it does.
- Auth tokens and other sensitive values must go through `expo-secure-store`
  (see `src/utils/authStorage.ts`), never `AsyncStorage`.
- Ticket refs in commits follow the existing `SPOT-NNN: ...` convention
  (e.g. `SPOT-33`).
- Before starting a feature, check `.specify/memory/constitution.md` and
  `specs/` (if a feature spec already exists) for this app's Spec Kit
  workflow.
