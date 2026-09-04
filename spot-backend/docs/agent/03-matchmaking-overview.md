# spot-backend agent notes — Matchmaking (kèo): Figma & Manage Matches

Part of the spot-backend agent notes — see [../../CLAUDE.md](../../CLAUDE.md) for the index. List-filter / search / rejoin rules are in [04-matchmaking-search.md](./04-matchmaking-search.md). Full API contract: [../api/04-matchmaking.md](../api/04-matchmaking.md).

### Matchmaking (kèo)

Pickup **kèo** matches only in `schema_matchmaking` (Groups live in separate `schema_groups`). Sports: `BADMINTON`, `FOOTBALL`.
Host is a **free listing** — no `booking_id`, no venue catalog lock.
Contract: [`docs/api/04-matchmaking.md`](./docs/api/04-matchmaking.md). Product locks:
[`docs/MATCHMAKING_PLAN.md`](./docs/MATCHMAKING_PLAN.md).

**Figma Matches screens → API**

| Screen | Node | BE status | FE uses |
| :--- | :--- | :--- | :--- |
| Homepage list | `95:2417` | **Done** — see **Homepage 1** below | `GET /matches` + search/filter below. Map = FE tiles + `latitude`/`longitude`. Paper-plane = **directions** (Geoapify), not share. |
| Filter sheet | `87:1903` | **Done** — same list API + `GET /geo/vn` | Figma “Ward/Commune” → BE `city` (quận/huyện). “Province/City” → `province` + `city`. Price chips → `priceMin`/`priceMax` **VND**. Skill chips → codes from `shared/constants/sports.js`. “Book Field” bg = Booking — **locked**. |
| Match detail | `100:401` | Done | `GET /matches/:id` + favorite + `POST .../join`. Map = FE Geoapify. |
| Join Match sheet | `100:551` | Done | Detail + `GET /auth/me` + `POST /matches/:id/join`. Skill/gender labels from FE + sports constants. |
| Host a Match form | `99:2` | **Done** — see **Host form 99:2** below | `POST /matches` / `POST /matches/bulk`; `GET /matches/venue-suggestions`; sport from Homepage tab `95:2675`. Advanced: `format`, `maxPlayers`, `coverUrl`, `joinMode` default `AUTO`. |
| Check Profile (host) | `432:1211` | Done | `GET /users/:id` + `GET /matches?hostUserId=`. Hide Groups / verified / reviews. Phone **not** on this endpoint. |
| Manage Matches | `101:98` | **Done** — see **Manage Matches 101:98** below | `GET /matches/mine` + `GET /matches/my-join-requests`; cards reuse Homepage; host approve on detail `100:401`. |

**Host form (`99:2`) — product locked**

Decisions from Figma + [Vmito sessions/new](https://vmito.com/vi/sessions/new). Do **not** re-open without FE gap.

| Topic | Contract |
| :--- | :--- |
| **Sport** | From Homepage tab `95:2675`. Body field `sport`. |
| **Location** | `GET /matches/venue-suggestions?location=&sport=` — pool `status <> CANCELLED`. Returns distinct venues (+ province/city/lat/lng). Map miss → Geoapify on FE; admin → `GET /geo/vn` codes. |
| **Host name / phone** | Not in create body; read-only from `GET /auth/me`. |
| **Multi-day** | Always `isMultiDay: false` (Figma toggle removed). |
| **Skill** | Multi-chip → `skillMin`/`skillMax`; `allLevels` = full ladder. Per-sport labels in `sports.js`. |
| **Fee** | Always on. `SPLIT_EVENLY` **or** `GENDER_RANGE` — **either sport** (VND). |
| **Recurring** | Off → `POST /matches` (1 schedule). On → FE expand dates/weekdays → `POST /matches/bulk` (max 100 schedules). Partial 409 OK. |
| **Advanced (FE required)** | `format`, `maxPlayers`, `coverUrl` (URL). `joinMode` default `AUTO`. `maxPlayers` min by format (incl. host): Singles 2, Doubles 4, 5v5 10, 7v7 14, 11v11 22; max 40. |
| **Cover** | Supabase Storage on FE → `coverUrl`. No BE upload. |

**Do not confuse:** `GET /matches?location=` = browse joinable kèo. `GET /matches/venue-suggestions` = Host venue reuse (wider pool).

**Manage Matches (`101:98`) — product locked**

Decisions from Figma + product review ([`101:98`](https://www.figma.com/design/ZTpFWfkdcEpHH4xJaKaBxT/Spot?node-id=101-98)). Do **not** re-open without FE gap. **Do not** confuse with Manage Group (`101:2`) — out of scope.

**Navigation (FE)**

| From | Goes to |
| :--- | :--- |
| Homepage FAB menu | Manage Matches `101:98` |
| Bottom nav tab **Matches** | Homepage browse `95:2675` (not Manage unless IA changes) |
| Empty state **Host a Match** | Host form `99:2` (sport from Homepage tab) |
| Empty state **Find Matches** | Homepage list |

**Three tabs → two APIs**

| UI tab | Who | API | Pool |
| :--- | :--- | :--- | :--- |
| **Active** | Host + participant | `GET /matches/mine?tab=active` | Host: own `OPEN`/`FULL`, `endsAt > now`. Participant: request **`ACCEPTED`**, kèo not cancelled, not ended. **No `PENDING`.** |
| **Completed** | Host + participant | `GET /matches/mine?tab=completed` | **Chỉ** kèo đã hết giờ (`endsAt <= now`), **đủ người** (`filledCount >= maxPlayers`), `status <> CANCELLED`, participant **`ACCEPTED`**. **Không** gồm: host cancel, hết giờ thiếu người, kicked. Card có `outcome` / `outcomeMessage`. |
| **Join Requests** | Joiner only | `GET /matches/my-join-requests` | Caller’s **`PENDING`** + **`REJECTED`**. Sort: PENDING first. **`ACCEPTED`** → Active tab. **`KICKED`** **không** vào Completed — xem lại qua detail nếu cần. |

**Host duyệt request — không có tab gộp**

Host **does not** use Join Requests tab. Flow:

1. `GET /matches/mine?tab=active` → card with `myRole: HOST`
2. Tap card → Match detail (`100:401` — **host variant**: waiting list + Edit/Cancel; Figma joiner frame exists, host frame TBD)
3. `GET /matches/:id/requests` → PENDING only (`avatarUrl`, `skill`, `shareAmount`, `phoneNumber`)
4. `POST .../accept` \| `POST .../reject` \| joiner `DELETE .../join` (hủy PENDING)

**List item shape (`GET /matches/mine`)**

Same public match card as Homepage **plus**:

| Field | Notes |
| :--- | :--- |
| `myRole` | `HOST` \| `PARTICIPANT` |
| `myRequestStatus` | Participant: `ACCEPTED` (active) hoặc `KICKED` (không còn Active; **không** lên Completed tab). Host: `null` |
| `pendingRequestCount` | Host only — count of **`PENDING`** join requests on that kèo |

**FE chips on Active (host cards)**

| Chip | Condition |
| :--- | :--- |
| **N chờ duyệt** | `myRole=HOST` && `pendingRequestCount > 0` && `joinMode=APPROVAL` |
| **Đủ người** | `status === FULL` |
| **HOST** / **JOINED** | From `myRole` |

Participant Active cards: badge **JOINED**; no `pendingRequestCount`.

**Join Requests tab item (`GET /matches/my-join-requests`)**

```json
{ "total", "pendingCount", "requestId", "status", "heads", "message", "shareAmount", "paymentStatus", "match": { "matchId", "title", "startsAt", "venueName", "hostFullName", "hostAvatarUrl", ... } }
```

Tap → `GET /matches/:id`. **`REJECTED`** rows stay here for tracking; same kèo **reappears on Homepage** browse (caller may join again).

**Homepage browse exclusion (`GET /matches` — default, not `hostUserId=`)**

Hide from feed (avoid duplicate with Manage):

| Reason | Hidden? |
| :--- | :--- |
| Caller is **host** | Yes |
| Join request **`PENDING`** | Yes → only Join Requests tab |
| Join request **`ACCEPTED`** | Yes → Active tab |
| Join request **`KICKED`** | Yes |
| Join request **`REJECTED`** | **No** — show again for re-join |

Same rule when `favorited=true`. **`GET /matches/:id`** and Manage routes unchanged.

**Empty state**

Figma `101:98` ships empty Active only. Filled states = reuse Homepage card + chips above. Pro Tip card = static FE copy.

**Homepage 1 (Figma `95:2675` / list `95:2417`) — BE complete**

Product review locked. Do **not** re-open unless FE finds a gap.

| Topic | BE | Notes |
| :--- | :--- | :--- |
| **Search (`location=`)** | **Done** | Full spec in **Homepage search** in [`04-matchmaking-search.md`](./04-matchmaking-search.md). Postgres only — **not** Geoapify, **not** NLP/AI. |
| **Suggestions while typing** | **Done** | Same `GET /matches?location=` returns `suggestions[]` (max 5). FE debounces per keystroke. |
| **Public browse list** | **Done** | `OPEN` + spots left + `startsAt > now` (chưa bắt đầu); **`FULL` hidden**. Also hides caller’s hosted kèo + join `PENDING`/`ACCEPTED`/`KICKED`; **`REJECTED` reappears** — see **Manage Matches** browse exclusion. |
| **Hosted Matches on profile** | **Done** | `GET /matches?hostUserId=` still returns `OPEN` **and** `FULL` (future `endsAt`). |
| **Filter tỉnh/quận** | **Done** | `province` + `city` exact codes from `GET /geo/vn` (pre-2025 63 tỉnh + quận/huyện). |
| **Filter sport / date / time / skill / price** | **Done** | `skill` needs `sport`; prices in **VND**; skill chip labels map to codes in `sports.js`. |
| **Distance filter** | **Done** | `latitude` + `longitude` + `radiusKm` (0–50 km). **XOR** with `location` → `400`. |
| **Favorites filter** | **Done** | `favorited=true`. Same browse-exclusion rule as default list. |
| **Card fields** | **Done** | `coverUrl`, `host`, `isFavorited`, `participantAvatars`, `province`/`city` + names, `spotsLeft`, `yourShare` (VND). |
| **Card location display** | FE | Show `{venueName}, {cityName}`; distance from user GPS = FE (Haversine or map). |
| **Logo → Home / Avatar → Profile** | FE | Nav only — no BE endpoint. |
| **Sparkles (AI search)** | **Out of scope** | Search is text SQL only. |
| **Notification bell** | **Done (BE)** | `GET /notifications`, `/unread-count`, mark read; match cancel types `MATCH_CANCELLED` |
| **Groups tab** | **Out of scope (kèo)** | Implemented under `/groups` — see **Groups (hội)**. |
| **Tournaments tab** | **Out of scope (kèo)** | Product locked — separate `/tournaments` domain; see **Tournaments (giải đấu)**. |
| **Booking / Schedule** | **Out of scope** | Free listing, no `booking_id`. |
| **Host rating on card** | **Done** | `host.rating` + `host.reviewCount` from `match_host_reviews`; `null` until có review |
| **FAB Host / Manage** | **Done (BE)** | Create = `POST /matches` / bulk. Manage = **Manage Matches 101:98** section. |

**API map**

| Method | Path | Notes |
| :--- | :--- | :--- |
| `POST` | `/matches` | PLAYER host; single kèo |
| `POST` | `/matches/bulk` | Same template + `schedules[]` (Vmito multi-publish) |
| `GET` | `/matches/venue-suggestions` | Host location picker (wide venue pool) |
| `GET` | `/matches` | Browse: excludes FULL, hosted, joined/pending/kicked; **`REJECTED` visible**. `hostUserId` → also `FULL` |
| `GET` | `/geo/vn` | Pre-2025 63 tỉnh + 705 quận/huyện (static JSON, Bearer) |
| `GET` | `/matches/mine` | Manage Active/Completed — `myRole`, `pendingRequestCount`, `outcome` |
| `GET` | `/matches/my-join-requests` | Joiner tab — `pendingCount`, `?status=`, `match.hostAvatarUrl` |
| `GET` | `/matches/:id` | Detail + `summary` (View Summary / review) + `participants[]` |
| `DELETE` | `/matches/:id/join` | Joiner hủy PENDING |
| `POST` | `/matches/:id/review` | Participant đánh giá host (kèo reviewable) |
| `POST` / `DELETE` | `/matches/:id/favorite` | Heart |
| `POST` | `/matches/:id/join` | PLAYER; `message?`, `phoneNumber?`, `guests?` |
| `GET` | `/matches/:id/requests` | Host; PENDING — `avatarUrl`, `skill`, `shareAmount`, phones |
| `POST` | `/matches/:id/requests/:requestId/accept\|reject` | Host |
| `POST` | `/matches/:id/participants/:userId/kick` | Host |
| `PATCH` | `/matches/:id` | Host; before `startsAt` |
| `POST` | `/matches/:id/cancel` | Host; notify joiners |
| `GET` | `/reviews/hosts/:userId/reviews` | Check Profile — reviews host nhận |
| `GET` | `/users/:id` | Public profile — `matchCount`, `joinedMatches`, `rating`, `reviewCount` |

