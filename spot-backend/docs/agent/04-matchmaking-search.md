# spot-backend agent notes — Matchmaking (kèo): Search, Filters, Rejoin Rules

Part of the spot-backend agent notes — see [../../CLAUDE.md](../../CLAUDE.md) for the index. Figma / Manage Matches contract is in [03-matchmaking-overview.md](./03-matchmaking-overview.md).

**List filters (`GET /matches`)**

`sport`, `date` (`YYYY-MM-DD`, TZ `Asia/Ho_Chi_Minh`), `timeFrom`/`timeTo`
(`HH:mm`; with `date` = window overlap, without = local `startsAt` time;
`timeTo` after `timeFrom`), `skill` (needs `sport`; repeat or comma; OR —
match range contains at least one selected rank; max 10), `priceMin`/`priceMax`
(VND; both = GENDER_RANGE band overlap / SPLIT_EVENLY `ceil(price_min/maxPlayers)`
in range), `location` (unaccent + fuzzy `title` / `venueName` / `venueAddress`;
`suggestions[]` while typing; Postgres only), `province` / `city` (pre-2025
GSO codes, exact; `city` requires `province`; HCM `79`, Quận 7 `778`),
`favorited=true` (caller’s hearts), `hostUserId` (that host’s active kèo),
`latitude`+`longitude`+`radiusKm` (0–50, haversine; all three together;
matches without coords excluded), `limit` (default 20, max 50), `offset`.

**Location XOR Distance:** `location` together with lat/lng/radiusKm → `400`
(`Use location or distance, not both`). `province`/`city` **may** combine with
either. Football filter chips: Beginner→`LEARNING`, Basic Amateur→`REC_BASIC`,
Advanced Amateur→`REC_ADVANCED`, Semi-pro→`SEMI_PRO`, Professional→`PROFESSIONAL`,
Elite→`ELITE`.

**Homepage search (`GET /matches?location=`) — BE contract**

Text search on **our kèo in DB only**. No Geoapify Autocomplete, no NLP, no
external geocoding. Implementation: `fold_search_text()` + `pg_trgm` in
`match.repository.js` (`locationPredicate`, `listSearchSuggestions`).

**What is searched (3 fields)**

| Field | DB column | Example |
| :--- | :--- | :--- |
| Match title | `title` | `Saturday 7v7 AUTO` |
| Venue name | `venue_name` | `San ABC` |
| Street address | `venue_address` | `123 Nguyen Van Linh, Q7, TP.HCM` |

**Not searched:** host name, `notes`, `province`/`city` codes or names, GPS
coords. For admin area use `province` + `city` filters. For radius use
Distance trio (XOR with `location`).

**Normalization (`fold_search_text`)**

Lowercase, strip Vietnamese diacritics and `đ`, collapse whitespace. So
`location=san abc` matches `Sân ABC`.

**Match modes (any one is enough)**

1. **Substring** — folded query appears inside folded `title`, `venue_name`,
   or `venue_address`.
2. **Fuzzy** — **single-token only** (no spaces), length ≥ `FUZZY_MIN_CHARS`
   (4), max `similarity()` ≥ `LIST_SIMILARITY` (0.4). Multi-word queries like
   `san t12` **do not** fuzzy-match neighbors (`san t19`).
3. **Multi-word AND** — query contains spaces → every non-empty token must
   appear in the **same** field (`title` **or** `venue_name` **or**
   `venue_address`). Tokens are **not** allowed to be split across fields
   (avoids picking a venue suggestion then flooding the feed with unrelated
   kèo that only share common words like "cầu" / "lông").

**Suggestions (`suggestions[]`) — while user types**

Returned on the **same** `GET /matches` when `location` is present (FE should
debounce, e.g. 300 ms). Built from listable kèo only (same pool as browse:
`OPEN`, spots left, `startsAt > now`).

| Property | Value |
| :--- | :--- |
| Max items | 5 (`MATCH_SEARCH.SUGGEST_LIMIT`) |
| Shape | `{ text, kind }` |
| `kind` | `title` \| `venueName` \| `venueAddress` |
| Source | Distinct values from existing kèo (not Geoapify) |
| Dedup | By folded `text`; best score wins |
| Excludes | — |
| Score threshold | exact / substring / same-field tokens; fuzzy only for single-token queries (length ≥ 4, ≥ `SUGGEST_SIMILARITY` 0.3) |
| Sort | Score DESC, then text ASC |

Example response fragment:

```json
"suggestions": [
  { "text": "San ABC", "kind": "venueName" },
  { "text": "Saturday 7v7 AUTO", "kind": "title" },
  { "text": "123 Nguyen Van Linh, Q7, TP.HCM", "kind": "venueAddress" }
]
```

**Sort when searching**

With `location`: order by best similarity across title / venue / address, then
`startsAt` ASC. Without `location`: `startsAt` ASC only.

**Public browse vs profile list (do not confuse)**

| Query | Status filter | Spots filter | Caller exclusion |
| :--- | :--- | :--- | :--- |
| `GET /matches` (homepage) | `OPEN` only | `filledCount < maxPlayers` | Hide hosted + join `PENDING`/`ACCEPTED`/`KICKED`; show **`REJECTED`** again |
| `GET /matches?hostUserId=` | `OPEN` + `FULL` | none | No caller exclusion (public profile) |

Constants: `LISTABLE_MATCH_STATUSES` = browse; `PITCH_OCCUPIED_STATUSES` =
`OPEN`+`FULL` for pitch overlap / 409 and host profile list.

**Search / admin units (no 3rd-party API)**

- Filter tỉnh/quận: host and filter pick the **same codes** from `GET /geo/vn`
  (`vn-admin.json`). Map is **pre-2025** (63 tỉnh/TP + quận/huyện). Do **not**
  switch to the 2025 34-tỉnh / xã-phường list. Figma filter “Ward/Commune” →
  BE `city`; “Province/City” → BE `province` + `city`.
- `venueAddress` is the free-text street line. Occupancy still uses
  `venueName`+`venueAddress`+court, not `province`/`city`.
- Match card also returns `provinceName` / `cityName` (lookup from JSON).
  Old rows may have `province`/`city` `null` (excluded by those filters).
- Constraint `matches_admin_pair`: both NULL or both set.

**Public match card** (list + detail): `coverUrl`, `host: { userId, fullName,
avatarUrl, matchCount, rating }`, `isFavorited`, `participantAvatars` (max 3),
`province`, `provinceName`, `city`, `cityName`. `host.rating` / `host.reviewCount` live (pickup kèo reviews).
`matchCount` = hosted kèo except `CANCELLED`. No `hostPhoneNumber` on list /
mine / `GET /users/:id`.

**Listing rules**

- `startsAt` in the future; duration **≥ 1 hour** (no max).
- Courts required and **named**; unique names per match.
- `province` + `city` **required** on create (codes from `GET /geo/vn`).
  `venueAddress` is street/venue line, not a substitute for those codes.
- Pitch occupancy is **global**: normalized `venueName` + `venueAddress` + court
  name + overlapping time → `409`. Adjacent 9–11 then 11–13 is OK. Different
  court names at the same venue+time are OK. Optional `latitude`/`longitude`
  are map pin only — they do **not** affect occupancy. No Geoapify key or
  routing proxy on this backend. `CANCELLED`/`COMPLETED` listings do not occupy.
- `joinMode`: `AUTO` (join → `ACCEPTED` immediately) or `APPROVAL` (`PENDING`
  until host accepts).
- Fee: `GENDER_RANGE` (female `priceMin`, male `priceMax`) or `SPLIT_EVENLY`
  (`priceMin` = total; `yourShare = ceil(priceMin / maxPlayers)`). No `FREE`.
  Payment is a stub: `paymentStatus: SUCCESS` + recorded `shareAmount`.
- Recurring / multi-day flags exist, default off — do not generate extra dates.

**Slots / join (Figma Join Match)**

- Host counts as **1** at create (`filledCount: 1`).
- Join adds `1 + guests.length` heads (AUTO immediately; APPROVAL on accept).
  FE “Send Request (2)” = that number.
- **`yourShare`** (runtime on match card): `ceil(priceMin / maxPlayers)` preview for viewer.
- **`shareAmount`** (on join request / accepted participant): locked at join/accept for joiner + guests; Figma “Paid: 50k”.
- Join / accept / `POST` blocked when `startsAt <= now` (`assertJoinable`, `canJoin: false`).
- Guests: `name`, `skill` (that sport’s ladder), `gender` `male`/`female`,
  **`phoneNumber` required**. Requester `phoneNumber` optional on join (else
  account phone). Host sees phones on waiting list and on `participants` after
  accept; other players do not.
- Joiner You-card (name/phone/gender/skill) comes from `GET /auth/me`. Pencil:
  override **this join’s** phone via body `phoneNumber`; lasting skill change =
  `PATCH /auth/me`. No PATCH name/gender on join.
- Required-skill banner = match `skillMin`/`skillMax`/`allLevels` (FE labels).
  Skill out of range → **`skillWarning: true`**, request still created.
- Over-capacity (`heads > spotsLeft`) → `400`. No waitlist, no Zalo.

**Host phone**

On `GET /matches/:id` as `hostPhoneNumber` (and HOST `participants[].phoneNumber`)
**only** when the caller is the host or `yourRequest.status === ACCEPTED`.
Never on `GET /matches`, `GET /matches/mine`, or `GET /users/:id`. After AUTO
join the join response includes it; APPROVAL pending does not.

**Public host profile (`GET /users/:id`)**

`fullName`, `avatarUrl`, `createdAt`, `skills`, `matchCount`, `joinedMatches`,
`rating`, `reviewCount` (live từ `match_host_reviews`; `null`/`0` nếu chưa có review).
No `email` / `phoneNumber` / `role` / `status` / `gender`.
Reviews section = `GET /reviews/hosts/:userId/reviews`.
404 if missing, `LOCKED`, or not `ACTIVE`. Hosted Matches + View All =
`GET /matches?hostUserId=` (profile: OPEN/FULL still in the future; browse hides FULL).

**Join requests — one row per `(match_id, user_id)`**

Unique index `idx_join_requests_match_user`. Host accept / reject / kick
`UPDATE` that row (same `requestId`). Do not insert a new tuple on status change.

| Status | Re-join same kèo |
| :--- | :--- |
| `PENDING` / `ACCEPTED` | `409` |
| `REJECTED` | Allowed — `UPDATE` same `requestId` (reset guests) |
| `KICKED` | `403` — blocked **that match only**, not all kèo of the host |
| Joiner cancel PENDING | `DELETE /matches/:id/join` — **DELETE** row (not `REJECTED`); may join again |

`GET /matches/:id/requests` is the **waiting list**: `PENDING` only.
Accepted people are on `participants` in match detail (`shareAmount`, `paymentStatus`, `skill` — cả HOST). `yourRequest` on detail
is `PENDING` / `ACCEPTED` / `KICKED` (not `REJECTED` — they may join again).

**Match expiry / Completed lifecycle**

- Browse (`GET /matches`): chỉ `OPEN`, còn slot, **`startsAt > now`**.
- Hết giờ **đủ người**: worker `processExpiredFullMatches` → `status = COMPLETED` (nhả sân); vào tab Completed.
- Hết giờ **thiếu người**: `processExpiredUnderfilledMatches` → `CANCELLED` (không COMPLETED); reject `PENDING`; notify host + joiners (`MATCH_CANCELLED`, `data.reason = EXPIRED_UNDERFILLED`).
- Host cancel: `POST /matches/:id/cancel` → notify joiners (`data.reason = HOST_CANCEL`); **không** vào Completed.
- `listMine` gọi expiry processors trước query. Dev: `POST /matches/dev/process-expired`. Prod: `npm run worker:match-expiry`.
- `outcome` / `outcomeMessage` trên `GET /matches/:id` và completed cards (`COMPLETED` \| `CANCELLED`).

**Host manage (PATCH / cancel — see also Manage Matches 101:98)**

- `PATCH /matches/:id` only before kick-off. If `filledCount > 1`, cannot change sport /
  format / feeType / prices. `maxPlayers >= filledCount`. Occupancy check
  excludes this match.
- `POST /matches/:id/cancel` — pending join requests → `REJECTED`; match `CANCELLED` (frees pitch); inbox notify joiners.
  ACCEPTED rows stay as history. Cancelled kèo **không** xuất hiện tab Completed.

**Schema (`schema_matchmaking`)** — `006_schema_matchmaking.sql` is canonical:
`matches` (incl. `province`/`city`, `matches_admin_pair`, `fold_search_text`,
GIN + partial `idx_matches_province_city`), `match_courts`,
`match_join_requests`, `match_guests`, `match_favorites`. Chain: `001` auth →
`002` skills → `003` notification → `004` venue/booking/social → `005` review →
`006` kèo → `007` venue images → `008` notification match types → `009` match host reviews. `migrate.js` skips filenames already in `schema_migrations`.
Re-apply search/admin with `npm run apply:match-search` or
`npm run apply:match-admin` (`scripts/sql/`). Prefer numbered migrations for schema_notification CHECK updates.
Leftover rows in `schema_migrations` — do not delete. Do not `INSERT` name/gender on `users`.
`user_profiles.avatar_url` in `001`. Live homepage-card columns:
`npm run apply:homepage-card`.

**Out of scope (do not add in this domain):** waitlist, Zalo, real MoMo/VNPay,
`booking_id`, **Tournaments** (separate domain — see **Tournaments (giải đấu)**), join-by-code, cover **file upload**/S3
(URL-only `coverUrl` / `avatarUrl` is in), user profile **hero/cover** image,
verified-host badge, cron recurring (auto future weeks), AI chatbot,
Booking/Schedule tabs, Geoapify **on backend** (search/filter/admin units are Postgres + `vn-admin.json` only),
2025 34-tỉnh / xã-phường map, football **position** field on squad.

Reset kèo data — **chọn đúng lệnh:**

- **`npm run reset:vmito`** — xóa **chỉ** kèo/host import Vmito (giữ kèo smoke/tay + user thật). Preview: `--dry-run`.
- **`npm run reset:matches`** — TRUNCATE **toàn bộ** `schema_matchmaking.matches` (mọi nguồn). Docker: `docker compose run --rm backend npm run reset:matches`.

Chi tiết Vmito: section **Vmito import → Reset dữ liệu test Vmito**.
Windows bind-mount: after changing `src/`, `docker restart spot-backend`.

