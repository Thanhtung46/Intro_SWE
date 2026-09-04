# SPOT agent notes — Matchmaking (kèo)

Part of the SPOT project agent notes — see [../CLAUDE.md](../CLAUDE.md) for the index.

### Matchmaking (kèo) — implemented

Pickup matches only. Agent rules + Figma map:
[`spot-backend/docs/agent/03-matchmaking-overview.md`](./spot-backend/docs/agent/03-matchmaking-overview.md).
FE/tester contract: [`spot-backend/docs/api/04-matchmaking.md`](./spot-backend/docs/api/04-matchmaking.md).
Product locks: [`spot-backend/docs/MATCHMAKING_PLAN.md`](./spot-backend/docs/MATCHMAKING_PLAN.md).

| | |
| :--- | :--- |
| Prefix | `/matches` + `/api/matches`; public host `/users/:id`; admin dropdown `/geo/vn` + `/api/geo/vn` (JWT Bearer) |
| Sports | `BADMINTON`, `FOOTBALL` |
| Host | Free listing, no `booking_id`. Duration ≥ 1h. Named courts. Optional `coverUrl`. Required `province` + `city` (pre-2025 GSO codes, e.g. HCM `79` / Quận 7 `778`). `venueAddress` = street line only. **`POST /matches/bulk`** for Vmito-style multi-publish. **`GET /matches/venue-suggestions`** for Host location picker (wider pool than browse). |
| Occupancy | Global: `venueName` + `venueAddress` + court + overlapping time → `409` |
| List | `GET /matches`: browse = `OPEN` + spots left + `startsAt > now` (**FULL hidden**); also hides caller's hosted kèo and kèo with join request `PENDING`/`ACCEPTED`/`KICKED` (**`REJECTED` shows again**). `hostUserId` = that host’s `OPEN`/`FULL` (until `endsAt`). Filters: `sport`, `date`, `timeFrom`/`timeTo`, `skill` (multi OR, needs `sport`), `priceMin`/`priceMax` (**VND**), `favorited`, `province`/`city` (exact; `city` needs `province`); **Location XOR Distance** (`location` vs `lat`+`lng`+`radiusKm` 0–50). Card: `coverUrl`, `host`, `isFavorited`, `participantAvatars`, `province`/`city` + names. |
| Join | `AUTO` or `APPROVAL`; guests (`name`, `skill`, `gender`, `phoneNumber`); skill mismatch **warns** but still joins |
| Fee | `GENDER_RANGE` or `SPLIT_EVENLY` — **either allowed per sport** (VND); always required on Host form |
| Requests | One row per `(match_id, user_id)`. Kick = cannot rejoin **that kèo**. Reject = may rejoin. Waiting list = `PENDING` only. |
| **Manage Matches** | [`101:98`](https://www.figma.com/design/ZTpFWfkdcEpHH4xJaKaBxT/Spot?node-id=101-98) — **`GET /mine`** + **`GET /my-join-requests`**; host approve on detail; chips on Active — see section below |
| Host edit / cancel | `PATCH /matches/:id` before start; `POST /matches/:id/cancel` |
| Host profile | `GET /users/:id` (`fullName`, `avatarUrl`, `createdAt`, `skills`, `matchCount`, `joinedMatches`; no email/phone). Hosted kèo = `GET /matches?hostUserId=`. `rating`/`reviewCount` live from pickup reviews. |
| Host phone | Only `GET /matches/:id` when caller is host or `yourRequest.status === ACCEPTED`. Never on list / mine / `/users/:id`. |
| Rating | `host.rating` + `host.reviewCount` on cards from `match_host_reviews`; `null`/`0` until first review. Post-match: `POST /matches/:id/review`, `GET /matches/:id` → `summary`. |
| Search / map | Homepage **`location=`** = SQL on **`title` + `venueName` + `venueAddress`** (unaccent, fuzzy ≥3 chars, multi-word AND). Same request returns **`suggestions[]`** (max 5, kinds `title` \| `venueName` \| `venueAddress`) while user types — Postgres only, **not** Geoapify/NLP. **Does not** search province/city names or GPS — use `province`/`city` or Distance filters. Filter tỉnh/quận = `province`+`city` from `GET /geo/vn` (**pre-2025**). Map / directions = **FE only** (built: `spot-frontend-mobile` WebView + Leaflet + Geoapify tiles — `AppMap`, shared `/venue-map`, `PinDropModal`; see that app's `CLAUDE.md` §Maps). No map key on backend. |
| Out of scope (kèo only) | Waitlist, Zalo, MoMo/VNPay, join-by-code, verified-host, user hero cover, AI chatbot, Booking/Schedule, football position on squad — **Tournaments** = separate domain (see below) |

`GET /matches/mine` must stay **before** `GET /matches/:id` in routes.
`full_name` / `gender` / `avatar_url` are on `schema_auth.user_profiles`, not `users`.
Migrations: `001`–`009` (`spot-backend/migrations/README.md`). Kèo = `006`; host reviews = `009`. Re-apply search/admin via `apply-match-search.js` / `apply-match-admin.js`. Do not delete leftover `schema_migrations` rows from the old duplicate-number files.

**Aug 2026 (P0–P3):** expiry worker, Completed tab = full+ended only, Manage Squad payment fields, `pendingCount`, host review — see [`spot-backend/CLAUDE.md`](./spot-backend/CLAUDE.md) **Migration map & product locks** and [`spot-backend/docs/api/04-matchmaking.md`](./spot-backend/docs/api/04-matchmaking.md).

**Figma Homepage 1 (`95:2675` / list `95:2417`) — BE done**

Locked after product review. Detail: [`spot-backend/CLAUDE.md`](./spot-backend/CLAUDE.md)
section **Homepage 1** and **Homepage search**.

| Done on BE | FE-only / out of scope |
| :--- | :--- |
| Text search + suggestions (`location=`) | Logo → Home, Avatar → Profile (nav) |
| Browse hides `FULL`; profile `hostUserId` shows FULL | Card distance from user GPS |
| Filter sheet: sport, date, time, skill, price **VND**, tỉnh/quận | Sparkles / AI search icon |
| `GET /geo/vn`, favorites, distance XOR location | Notification bell (BE: inbox + match cancel) |
| List card fields (`coverUrl`, host + rating, hearts, avatars, admin names) | **Tournaments tab** — BE **T0–T5 done**; contract [`spot-backend/docs/api/06-tournaments.md`](./spot-backend/docs/api/06-tournaments.md) |
| | Booking / Schedule |

Other Matches screens (detail `100:401`, Join `100:551`, host profile `432:1211`,
filter `87:1903`) — BE endpoints exist; see spot-backend CLAUDE **Figma** table.

**Figma Manage Matches (`101:98`) — product locked (BE done)**

Full detail: [`spot-backend/docs/agent/03-matchmaking-overview.md`](./spot-backend/docs/agent/03-matchmaking-overview.md) section **Manage Matches 101:98**.

| # | Decision | BE | FE |
| :--- | :--- | :--- | :--- |
| 1 | **Entry** | — | Homepage FAB → “Manage Matches”; bottom nav **Matches** = Homepage browse (`95:2675`), **not** this screen unless product changes IA |
| 2 | **Tabs** | `active` \| `completed` on **`GET /matches/mine`**; joiner tracking on **`GET /matches/my-join-requests`** | 3 segmented tabs: **Active**, **Completed**, **Join Requests** |
| 3 | **Active** | Host: own kèo `OPEN`/`FULL` future. Participant: join **`ACCEPTED`** only — **`PENDING` never here** | Reuse Homepage card (`95:2417`); badge `HOST` / `JOINED` from `myRole` |
| 4 | **Completed** | Chỉ kèo **đủ người** + **hết giờ** + không cancel + participant `ACCEPTED`. **Không** gồm host cancel, thiếu người, kicked — xem lại qua detail + notify. `summary` + `POST /matches/:id/review` khi reviewable | Same card reuse + View Summary |
| 5 | **Join Requests tab** | **`GET /matches/my-join-requests`** — `pendingCount`, `?status=`, caller’s **`PENDING`** + **`REJECTED`**; `DELETE /matches/:id/join` hủy PENDING | Joiner **theo dõi** đơn; tap → `GET /matches/:id`. **Not for host approve** |
| 6 | **Host approve** | Per kèo: **`GET /matches/:id/requests`** (avatar, skill, shareAmount, phones) → accept/reject on **Match detail** | Active → tap host card → detail → Manage Squad |
| 7 | **Host chips (Active)** | `pendingRequestCount` (PENDING waiting), `status=FULL` | Chip **“N chờ duyệt”** when `myRole=HOST` + `pendingRequestCount>0` + `joinMode=APPROVAL`; chip **“Đủ người”** when `FULL` |
| 8 | **Homepage dedupe** | **`GET /matches`** hides kèo caller hosts + `PENDING`/`ACCEPTED`/`KICKED` requests; **`REJECTED` shows again** (re-join) | Avoid same kèo on feed + Manage; detail still via Manage / deep link |
| 9 | **Empty state** | — | Figma `101:98` only empty Active; filled list = reuse cards + chips (no separate frame) |

**Manage Matches** (`101:98`), **Manage Groups** (`101:2`), và **Manage Tournaments** (mirror Groups FAB) là các màn riêng — đừng trộn route/tab. Groups BE: [`spot-backend/docs/api/05-groups.md`](./spot-backend/docs/api/05-groups.md); Tournaments: [`spot-backend/docs/api/06-tournaments.md`](./spot-backend/docs/api/06-tournaments.md); agent map: [`spot-backend/CLAUDE.md`](./spot-backend/CLAUDE.md).

Hide verified on kèo host profile; hide Booking chrome on filter sheet.

