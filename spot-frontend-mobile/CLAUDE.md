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
  `app/(tabs)/settings.tsx`, all reading from `src/context/UserContext.tsx` (wraps
  the app in `app/_layout.tsx`) and `src/utils/authStorage.ts`
  (secure-store token helpers).
- **Home** (`SPOT-34`, in progress): `app/(tabs)/home.tsx` is a thin route wrapper
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
- **Booking** (`app/(tabs)/booking.tsx`, `app/booking/map.tsx`): reached from
  Home's "Book Field" quick action. `BookingScreen.tsx` is a venue list
  (Figma node `79:1390`) with its own search/filter bar and a map-view
  button (→ `/booking/map`); `BookingMapScreen.tsx` is a **pre-SPOT-76
  static map-image mockup** (Figma node `79:1286`) with tappable pins and a
  venue popup — its pan/zoom/location controls are `comingSoon()`
  placeholders and its venue data is a local mock array. This is the one
  screen still on the old mockup; the SPOT-76 map stack below (real map via
  WebView + Leaflet + Geoapify) has not been ported to it yet.
- **Schedule** (`app/(tabs)/schedule.tsx` → `src/screens/schedule/ScheduleScreen.tsx`): calendar view over `GET /users/me/schedule` (bookings + pickup matches only — no tournaments/groups). Each item's status (`upcoming` / `in_progress` / `completed` / `cancelled`) is computed server-side (`spot-backend`'s `schedule.entity.js`) and rendered as-is — the screen never re-derives it from `startsAt`/`endsAt`. A booking auto-transitions to `completed` (unlocking the review action) via `spot-backend`'s `npm run worker:booking-completion`, not any client-side timer. A type filter (all/bookings/pickup matches, `schedule-filter-*` testIDs) narrows both the calendar dots and the day list, in-memory only (resets on app restart, not persisted). Pickup-match cards show the host's name and the viewing player's own role (host vs. participant) — see spec `003-schedule-booking-match-rework`. Cancel/leave actions from this screen are explicitly out of scope (kèo leave still lives in Manage Matches; no booking-cancel capability exists anywhere in the app yet).
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
- **Bottom navigation & tab routing** (spec `002-tab-navigation-performance`,
  SPOT — fixes the "switching tabs reloads the page" jank): the 5 tab roots
  (`home`, `booking`, `matches`, `schedule`, `settings`) live under
  `app/(tabs)/`, a route *group* — the URL paths (`/home`, `/booking`, ...)
  are unchanged, only the file location moved, via an `app/(tabs)/_layout.tsx`
  `Tabs` layout (not a plain `Stack`). `Tabs` keeps all 5 tab screens mounted
  in the background across switches — this is the entire fix; a switch is
  now a visibility toggle, not a remount, so revisiting a tab renders
  instantly with no reload/reload-flash. The root `app/_layout.tsx`'s
  `Stack` treats the whole group as a single entry (`TAB_ROUTES =
  ['(tabs)']`) with no slide animation. `app/booking/[id].tsx`,
  `app/booking/map.tsx`, `app/matches/[id].tsx`, `app/matches/host-form.tsx`,
  etc. are genuine non-tab sibling routes and correctly stayed **outside**
  `(tabs)/` — expo-router route groups are transparent to these paths, so
  nothing about them changed.
  The single shared tab bar is `src/components/navigation/AppTabBar.tsx`,
  wired to `Tabs`' `tabBar` render prop (`state`/`navigation`/`insets`,
  imported from `expo-router/build/react-navigation/bottom-tabs` — **not**
  plain `@react-navigation/bottom-tabs`, whose same-named `BottomTabBarProps`
  type is structurally different and fails `tsc`) and calling
  `navigation.navigate(route.name)`, not `router.replace()`. It renders
  `src/components/navigation/SlidingBottomNav.tsx` (the pill-slide
  animation). `src/components/navigation/BottomNav.tsx` and
  `src/components/common/BottomNavBar.tsx` are separate, narrower nav-bar
  instances kept intentionally — they're used only by the genuinely
  non-tab `BookingMapScreen`/`JoinMatchMapScreen` routes above, which still
  need real `router.replace()` navigation since they're leaving/re-entering
  the Stack, not switching within `Tabs`. Do not add a 4th copy; if a new
  non-tab screen needs a bottom bar, check whether one of these two already
  fits before writing another.
  `src/components/AppShell.tsx` (Home/Matches/Schedule/Settings' shared
  header) no longer renders its own bottom nav or takes an `activeTab` prop
  — that responsibility moved entirely to `AppTabBar` above.
- **Per-tab data caching** (same spec, `src/state/*Cache.ts`): each of
  Home/Booking/Matches/Schedule reads its list data through a small
  `zustand` store built from `src/state/createStaleCache.ts` (a generic
  `{ data, lastFetchedAt, isRefreshing, error }` factory — see
  `homeVenuesCache.ts`, `bookingVenuesCache.ts`, `matchesCache.ts` (created
  but not actually wired into `MatchesHomepageScreen.tsx` — that screen's
  own pre-existing `status`/`matches`/`total` state was judged adequate and
  lower-risk to touch than a full rewrite; see the feature's `tasks.md`
  T018 note), `scheduleCache.ts`). This is `zustand`'s first real usage in
  this app — it was previously a declared-but-unused dependency. Pattern
  for a new tab-like screen: hold data in one of these stores (`data ??
  []`/`data ?? null` for rendering, `applyResult`/`applyError` from the
  fetch's `.then`), gate the *first-ever-load* spinner on a local
  `isFirstLoad` flag (seeded `cache.data === null`, cleared once after the
  first fetch resolves) rather than a generic "is fetching" boolean — this
  is what keeps a revisit or a filter change showing the previous results
  instead of flashing to a spinner/blank state. Wrap the fetch effect with
  `src/hooks/useCancelledGuard.ts` (a `createGuard()` factory, fresh per
  effect invocation — a single mount-scoped flag isn't enough once tabs
  stay mounted and effects can re-run from a dependency change alone) so a
  superseded request can't clobber a newer one's result; if a fetch is
  triggered by both an effect and direct user actions (e.g. pull-to-refresh)
  a monotonic request-id `useRef` counter is the alternative used by
  `MatchesHomepageScreen.tsx`. Add a `useFocusEffect` (from `expo-router`)
  that calls `cache.isStale(ttlMs)` (~30s) and silently refetches in the
  background on a stale revisit — critical: an error from that background
  refetch must never blank out already-rendered `data` (render the error as
  a small banner *above* the content, never as a replacement for it — this
  was a real bug caught and fixed in `BookingScreen.tsx` during
  implementation), and a small non-blocking spinner keyed off
  `cache.isRefreshing` communicates the background activity.
- Test coverage exists (`__tests__/*.test.tsx`, plus co-located
  `*.test.ts(x)` next to several schemas/components) and a jest config
  **is** committed (`"jest": {"preset": "jest-expo"}` in `package.json`) —
  but `npm test` currently fails in this environment because
  `node_modules/expo-modules-core` is missing (an install gap, not a
  config gap); re-run `npm install` before assuming the suite is broken.

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
├── _layout.tsx              # root Stack layout (wraps in UserProvider); TAB_ROUTES=['(tabs)'] — the whole tab group is one Stack entry, no slide animation on tab switch
├── index.tsx                 # "/" — Splash screen, bootstraps + redirects
├── onboarding/index.tsx      # "/onboarding" — single animated screen
├── auth/                    # choose-role, register, login, otp, forgot/reset-password
├── owner/                   # register, welcome
├── profile/                 # index (view), edit
├── pending/index.tsx         # shared post-registration waiting screen
├── (tabs)/                   # route GROUP (spec 002-tab-navigation-performance) — Tabs layout, screens stay mounted across switches; URL paths below are unchanged, only file location moved
│   ├── _layout.tsx             # Tabs layout, tabBar={AppTabBar}, no unmountOnBlur
│   ├── home.tsx                 # "/home" → src/screens/home/HomeScreen.tsx (Football Dashboard, SPOT-34)
│   ├── booking.tsx              # "/booking" → src/screens/booking/BookingScreen.tsx (venue list)
│   ├── matches.tsx              # "/matches" → src/screens/matches/MatchesHomepageScreen.tsx
│   ├── schedule.tsx             # "/schedule" → src/screens/schedule/ScheduleScreen.tsx
│   └── settings.tsx             # "/settings"
├── booking/map.tsx           # "/booking/map" → src/screens/booking/BookingMapScreen.tsx (venue map mockup) — sibling of (tabs)/booking.tsx, genuinely non-tab, stays outside the group
├── venue/[id].tsx            # "/venue/:id" → src/screens/venue/VenueDetailScreen.tsx (venue detail)
├── assistant/index.tsx        # thin route → src/screens/assistant/AssistantScreen.tsx (AI chat, spec 004)
├── venue-map.tsx             # "/venue-map" → src/screens/common/VenueMapScreen.tsx (shared single-venue map — Matches/Groups/Tournaments/Referee)
└── matches/ , groups/ , tournaments/ , referee/   # non-tab siblings ([id].tsx, map.tsx, host-form.tsx, ...) + SPOT-76 / SPOT-93 feature routes (not expanded here — see each feature's Figma/plan)
src/
├── screens/{splash,onboarding,auth,owner,common,home,booking,venue,assistant,profile,settings,schedule}/   # presentational screen components
├── components/
│   ├── navigation/AppTabBar.tsx                    # THE shared bottom nav for the 5 (tabs)/ screens — wired to Tabs' tabBar prop, renders SlidingBottomNav
│   ├── navigation/SlidingBottomNav.tsx              # pill-slide animation, consumed by AppTabBar + the two non-tab bars below
│   ├── navigation/{BottomNav,BottomNavItem}.tsx     # narrower nav bar for BookingMapScreen only (genuinely non-tab, still router.replace()-based)
│   ├── common/BottomNavBar.tsx                      # separate narrower nav bar for JoinMatchMapScreen only — do not add a 4th copy, check these two first
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
├── hooks/{useFloatingAnimation,useCancelledGuard}.ts   # useCancelledGuard: createGuard() factory, fresh {isCancelled,cancel} per effect invocation — spec 002
├── constants/{colors,routes}.ts   # single color-token source (src/theme/colors.ts was merged in and deleted) + centralized route paths
└── state/{createStaleCache,homeVenuesCache,bookingVenuesCache,matchesCache,scheduleCache}.ts + types/   # zustand stale-while-revalidate cache stores (spec 002 — zustand's first real usage in this app), one per tab; types/ has auth.ts + venue.ts (shared VenueBase type) + assistant.ts (ChatMessage, spec 004)
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
  Project Overview). `src/state/` and the tab route group are no longer
  empty (spec `002-tab-navigation-performance` — see Architecture above):
  the 5 tab roots live under `app/(tabs)/`, and `src/state/` holds the
  `zustand` stale-cache stores.
- Auth tokens and other sensitive values must go through `expo-secure-store`
  (see `src/utils/authStorage.ts`), never `AsyncStorage`.
- Ticket refs in commits follow the existing `SPOT-NNN: ...` convention
  (e.g. `SPOT-33`).
- Before starting a feature, check `.specify/memory/constitution.md` and
  `specs/` (if a feature spec already exists) for this app's Spec Kit
  workflow.
