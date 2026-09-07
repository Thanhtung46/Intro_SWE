# SPOT agent notes — Referee (trọng tài)

Part of the SPOT project agent notes — see [../CLAUDE.md](../CLAUDE.md) for the index.

### Referee (trọng tài) — BE done, FE to wire (Aug 2026)

**Docs:** [`spot-backend/docs/REFEREE_PLAN.md`](./spot-backend/docs/REFEREE_PLAN.md) (product) · [`spot-backend/docs/api/15-referee-onboarding.md`](./spot-backend/docs/api/15-referee-onboarding.md) (+ `16-referee-venue-registration.md`, `17-referee-assignments.md`) · [`spot-backend/CLAUDE.md`](./spot-backend/CLAUDE.md).

**Smoke (all referee routes):** `cd spot-backend && npm run smoke:referee` — requires server up, `OTP_DEBUG=true`, `npm run seed:admin`, migrations `015`–`020`.

#### FE env (mobile)

Copy `spot-frontend-mobile/.env.example` → `.env`. App resolves API base automatically via `src/config/env.ts`:

| Context | Base URL |
| :--- | :--- |
| iOS Simulator / desktop web | `http://localhost:3000` |
| Android emulator | `http://10.0.2.2:3000` |
| Expo Go on phone | LAN IP of dev machine + port `3000` |

All service calls use **`API_URL = {base}/api`** (e.g. `GET /api/referee/me`). Optional override: set `API_URL` in `.env` if you add explicit env read later.

**Docker backend:** from repo root `Intro_SWE/` → `docker compose up -d redis backend`. Postman: `http://localhost:3000` (no `/api` prefix for raw paths; FE adds `/api`).

#### App structure (mobile)

| App area | Route group | Role / status |
| :--- | :--- | :--- |
| Player booking + rating | `(tabs)/` | `PLAYER` + `ACTIVE` |
| Referee ops | `app/referee/(tabs)/` **separate** | `REFEREE` + `ACTIVE` |
| Referee onboarding | pending screens | `REFEREE` + `PENDING` → batch docs → admin approve |

Do **not** mount referee Job Board inside player tabs.

#### Product flows (locked)

| Layer | BE | FE |
| :--- | :--- | :--- |
| **Onboarding** | Register → role `REFEREE` → OTP → `POST /users/me/verification-requests/batch` (3 docs: `ID_FRONT`, `ID_BACK`, `VFF_LICENSE`) → admin `POST /admin/approvals/:id/approve` `{ certifiedSportTypes: ["football"] }` (1–2 sports) | Step tracker until `ACTIVE`; then `/referee/(tabs)` |
| **Job Board** | `GET /referee/board?sport=football` (+ `province`/`city`, `favorited`, `q`, distance) · `POST/DELETE .../favorite` · `POST /referee/venues/:venueId/register` `{ sportType }` | Hide sân đã apply; filter sheet Figma `224:5828` |
| **Invitations — Plan A** | `GET /referee/invitations?tab=pending` → **`matchInvitations[]` + `myVenues[]`** (một API) · accept/decline · `DELETE .../register` cancel pool | **Một màn Pending scroll:** (1) Pending Queue Figma `224:3113` (2) **My venues** section **dưới** — sân đã Apply + Cancel. Không tab con riêng. |
| **First accept wins** | Player `POST /bookings` `{ hireReferee: true, refereeFeeVnd?: 150000 }` → pay → fan-out · `POST /referee/assignments/:id/accept` | `409 ASSIGNMENT_ALREADY_TAKEN` |
| **Schedule / Earnings** | `GET /referee/schedule?month=YYYY-MM` · `/earnings` · `/earnings/history` | Calendar dots = ACCEPTED |
| **Player rate referee** | After `endsAt`: inbox **`REFEREE_RATING_REQUEST`** → `POST /reviews/referee` `{ bookingId, rating }` — rating **0.5–5.0** step 0.5, **no text** | Half-star UI; deep link from `notification.data.bookingId` |
| **Auth** | `/referee/*` requires Bearer + `REFEREE` + **`ACTIVE`** | `PENDING` blocked at login |

#### Locked Aug 2026 (Figma review + product chốt)

| Topic | Decision | BE | FE |
| :--- | :--- | :--- | :--- |
| **My venues (Plan A)** | Cùng tab Pending, section dưới Pending Queue | `GET .../invitations?tab=pending` → `myVenues[]`; cancel `DELETE /referee/venues/:venueId/register` | Card + Cancel + confirm; empty state + CTA Board |
| **Favourite sân** | MVP **có** — `POST/DELETE /referee/venues/:id/favorite`, `?favorited=true`, `isFavorited` on board | **Done** | Heart toggle; filter heart = favourites only |
| **Filter Tỉnh/Phường** | MVP **có** — `GET /geo/vn`; board `province` + `city`; **Location XOR Distance** (`lat`/`lng`/`radiusKm` 1–20) | **Done** | Sheet `224:5828`; bỏ “Book Field” / `$40/hr` (artefact player) |
| **Assignment detail** | Tạm **theo Figma `224:5703`** | `GET /referee/assignments/:id` (fee snapshot); venue contact có thể reuse `GET /venues/:id` | Zalo, Call, Get Directions, Payment breakdown UI; Travel line = display (BE một `fee_vnd` today) |

Chi tiết: [`spot-backend/docs/REFEREE_PLAN.md`](./spot-backend/docs/REFEREE_PLAN.md) §2.2 H22–H24, §5.1 Plan A.

#### Notifications (inbox — both roles)

Poll `GET /api/notifications` + badge `GET /api/notifications/unread-count`.

| `type` | Recipient | When | `data` keys for navigation |
| :--- | :--- | :--- | :--- |
| `REFEREE_INVITATION` | Referee | Booking paid + fan-out | `assignmentId`, `bookingId`, `venueName`, `feeVnd` → `/referee/invitations?tab=pending` |
| `REFEREE_RATING_REQUEST` | **Player** | Match ended + referee accepted | `bookingId`, `refereeId`, `assignmentId` → rate screen → `POST /reviews/referee` |

Production: run `npm run worker:reminders` beside API (schedules rating prompt at `endsAt`). Dev: `POST /referee/assignments/:id/dev/complete` sends rating prompt immediately.

#### Player booking addon

```json
POST /api/bookings
{ "fieldId": 1, "bookingDate": "2026-08-25", "startTime": "19:00", "endTime": "20:00", "hireReferee": true }
```

Non-prod pay + fan-out: `POST /api/bookings/:id/dev/mark-paid`.

#### FE status

Referee screens **not implemented** on mobile yet — wire against live API per Figma map in `REFEREE_PLAN.md` §4. Admin console approvals UI **not implemented** (BE `/admin/approvals/*` ready).

**Figma Host form (`99:2`) — product locked (BE + FE contract)**

Full detail: [`spot-backend/docs/agent/03-matchmaking-overview.md`](./spot-backend/docs/agent/03-matchmaking-overview.md) section **Host form 99:2**.
Reference UX: [Vmito create session](https://vmito.com/vi/sessions/new) (recurring / fee toggles — not Zalo).

| # | Decision | BE | FE |
| :--- | :--- | :--- | :--- |
| 1 | **Sport** | `sport` in body | From Homepage tab [`95:2675`](https://www.figma.com/design/ZTpFWfkdcEpHH4xJaKaBxT/Spot?node-id=95-2675) — Badminton / Football **before** Host form |
| 2 | **Location** | `venueName`, `venueAddress`, `province`, `city`, optional `latitude`/`longitude` | User types → **`GET /matches/venue-suggestions`** (pool = any non-`CANCELLED` kèo). No hit → **map icon → Geoapify** (autocomplete/geocode). Map fills address + lat/lng; FE maps admin → GSO codes (`GET /geo/vn`) or dropdown fallback |
| 3 | **Host name / phone** | **Not** in create body | Read-only from `GET /auth/me`; edit via profile — do not send on `POST /matches` |
| 4 | **Multi-day** | Always `isMultiDay: false` | **Remove** toggle (Figma drew extra) |
| 5 | **Schedule** | `startsAt`, `endsAt` (ISO `+07`, ≥1h, future) | Date + start/end time pickers |
| 6 | **Courts** | `courtCount` + `courts[{ name }]` | No. of courts + names + Add Court |
| 7 | **Skill** | `allLevels` or `skillMin`+`skillMax` | Multi-select chips → FE derives min/max rank; labels from `sports.js` **per sport** |
| 8 | **Entry fee** | Always on — **`feeType`** required | Toggle always ON (Figma mistake). **Both** `SPLIT_EVENLY` and `GENDER_RANGE` allowed **for each sport** (VND) |
| 9 | **Recurring / N kèo** | Toggle OFF → `POST /matches` (1 slot). Toggle ON → FE expands dates/weekdays → **`POST /matches/bulk`** | Vmito-style: clone specific dates **or** weekdays + week count (max 52); show total N; partial 409 per slot |
| 10 | **Advanced (required on FE)** | `format`, `maxPlayers`, `coverUrl` (URL) | Badminton `SINGLES`/`DOUBLES`; Football `FIVE_A_SIDE`/`SEVEN_A_SIDE`/`ELEVEN_A_SIDE`; **`joinMode` default `AUTO`** |
| 11 | **Cover image** | `coverUrl` http(s) only — **no** BE upload | **Supabase Storage** upload on FE → public URL → `coverUrl` (recommended). Paste URL or sport placeholder OK for dev |
| 12 | **Publish** | `POST /matches` or `POST /matches/bulk` | PLAYER + Bearer |

**Do not confuse with Homepage search:** `GET /matches?location=` = find **joinable kèo** (browse pool). `GET /matches/venue-suggestions` = reuse **venues** for Host (wider DB pool).

Smoke (server up, `OTP_DEBUG=true`): `cd spot-backend && npm run smoke:matches` · `npm run smoke:groups` · `npm run smoke:tournaments`.

