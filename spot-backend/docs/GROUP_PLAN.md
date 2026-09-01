# SPOT — Groups plan (hội / club)

Plan for backend work after matchmaking kèo (P0–P3) is done.  
Locked with Nguyễn (2026-08-20). Groups are **independent** from pickup kèo (`POST /matches`).

| | |
| :--- | :--- |
| Domain | `spot-backend/src/domains/groups/` |
| Schema | `schema_groups` (new migration `010`) |
| Auth | Existing JWT: `Authorization: Bearer <accessToken>`; `req.user = { userId, role, email }` |
| Sports | Badminton + football only (implicit from Homepage tab) |
| API language | English codes / labels. UI may map Vietnamese later. |

**Sources:** Figma Groups screens (`810:*`, `99:275`, `101:2`), patterns from [`MATCHMAKING_PLAN.md`](./MATCHMAKING_PLAN.md).

When a phase is done: update [`API.md`](./API.md) and [`CLAUDE.md`](../CLAUDE.md).

---

## 1. What we are building

**Sport groups** (“hội”): admin creates a club with home venue, skill range, recurring play schedule, members, gallery, and Zalo link. Players browse/search, favorite, and join (auto or approval). **Not** linked to hosting pickup kèo.

Not in this plan: tournaments, real venue booking lock, group-hosted matches, chat, multi-platform social (beyond Zalo URL).

---

## 2. Locked product decisions

| Topic | Decision |
| :--- | :--- |
| vs Kèo | **Separate domain.** No `match_id` / `booking_id` on groups. |
| Display name | **`name`** = GROUP NAME (card title). **`title`** = tagline/subtitle (admin input at create). **`description`** = About body. |
| Location | Home venue: `venueName` + `venueAddress` + `province` + `city` (+ optional `latitude`/`longitude`). Same admin-unit model as kèo (`GET /geo/vn`). Detail header location derives from venue admin units. |
| Sport | **Implicit** from Homepage tab (Football / Badminton) when browsing/creating — not a field on Create form. |
| Join mode (`MODE`) | **`AUTO`** \| **`APPROVAL`** at create (Figma Create missing — BE + FE must add). |
| Skill gate | **Hard block** (unlike kèo warn). `POST /groups/:id/join` → **`400`** if joiner skill ∉ group range. No PENDING row if skill fails. |
| AUTO join | Skill OK → **`MEMBER` immediately** (no PENDING). |
| APPROVAL join | Skill OK → **`PENDING`**; admin approve/reject. Joiner UI shows pending state. |
| `memberCount` | **Admin + accepted members only.** PENDING join requests **not** counted. |
| Roles | **`ADMIN`** \| **`MEMBER` only.** Exactly **one ADMIN** per group (= creator initially). |
| Promote | **Transfer admin** to another member; former admin → `MEMBER`, loses admin rights. |
| Kick | Admin may kick any member. **Kicked user cannot rejoin that group** (permanent ban for that group, mirror kèo). |
| Admin leave | **Must transfer admin first** (or delete group). Cannot leave as sole admin without transfer/delete. |
| Delete group | **Admin only** (`DELETE /groups/:id`). Cascades members, requests, gallery, schedule. |
| Member leave | **`POST /groups/:id/leave`** (or `DELETE` membership) — member role only. |
| Edit group | Admin may **PATCH all fields** including `joinMode`, venue, courts, recurring schedule, skills, media, Zalo. |
| joinMode change | If admin sets `joinMode` → **`AUTO`** while **`PENDING`** requests exist → **auto-accept all pending** (promote to members). |
| Schedule | **Fixed recurring** slots (not real booking). **“Booked”** on Schedule tab = slot where group **will play** (configured at create/edit). |
| Schedule UI grid | Full day, **30-minute steps** (00:00–23:30). Admin picks active slots per court at create/edit. |
| Courts | Named courts at create (`Court A`, …); editable later. |
| Gallery | **Admin-only** upload. FE → Supabase Storage → BE stores URL. Paginated list; max **50** images/group. |
| Social | **Zalo URL only** (MVP). Shown on detail About (Figma detail not drawn — still required). |
| Favorites | Separate **`group_favorites`** (heart on browse card), mirror `match_favorites`. |
| Browse search | Same geo/filter pattern as kèo: **`location`** (fuzzy), `province`/`city`, distance — but text search targets **`name`** (group name), **`venueName`**, **`venueAddress`** (not kèo `title`). Returns `suggestions[]` while typing. |
| Manage Groups | Two tabs × two sections — see §2.1. |
| Join requests (joiner) | `GET /groups/my-join-requests`: **`PENDING` + `REJECTED`**; rejected may request again (new row). |
| Notifications | `GROUP_JOIN_REQUEST` (admin, APPROVAL join) · `GROUP_APPROVED` (joiner: accept / AUTO / flush) · `GROUP_REJECTED` · `GROUP_KICKED` · `GROUP_ADMIN_TRANSFERRED` — inbox only (`sendEmail: false`) |

### 2.1 Manage Groups (`101:2`)

| Tab | Section | Content | API sketch |
| :--- | :--- | :--- | :--- |
| **Managed by Me** | My Groups | Groups user **created** (admin) — edit, gallery, members | `GET /groups/mine?tab=managed&section=groups` |
| | Pending Requests | Inbound join requests awaiting admin approve | `GET /groups/mine?tab=managed&section=pending-requests` or per-group `GET /groups/:id/requests` |
| **Joined Groups** | Groups | Groups user is **accepted member** (not admin-only view) | `GET /groups/mine?tab=joined&section=groups` |
| | Join Requests | Outbound requests user sent (`PENDING` / `REJECTED`) | `GET /groups/my-join-requests` |

---

## 3. Skill ladders

Reuse matchmaking ladders from [`MATCHMAKING_PLAN.md`](./MATCHMAKING_PLAN.md) §3.

Group stores `skillMin` + `skillMax` (+ `allLevels` boolean) for its sport.  
Join check: read joiner skill from `schema_auth.user_sport_skills` for group’s sport; compare ranks. **Out of range → 400** (no request row).

---

## 4. Create Group form (Figma `99:275` + gaps)

Figma has: GROUP NAME, Title, Description, Home Venue, Skill, Media.  
**Missing in Figma — required for MVP:**

| Field | Notes |
| :--- | :--- |
| **`joinMode`** (`MODE`) | `AUTO` \| `APPROVAL` |
| **`courts[]`** | `[{ name }]` — at least 1 |
| **`recurringSlots[]`** | `[{ dayOfWeek, startsAt, durationMinutes, courtName }]` — admin picks 30-min-aligned slots |
| **`zaloUrl`** | Optional URL; validate `http`/`https` |

```json
POST /groups
{
  "name": "Unity FC",
  "title": "Friendly 7v7 every weekend",
  "description": "...",
  "joinMode": "APPROVAL",
  "skillMin": "REC_BASIC",
  "skillMax": "SEMI_PRO",
  "allLevels": false,
  "logoUrl": "https://...",
  "coverUrl": "https://...",
  "venueName": "San ABC",
  "venueAddress": "123 Nguyen Van Linh, Q7, TP.HCM",
  "province": "79",
  "city": "778",
  "latitude": 10.73,
  "longitude": 106.72,
  "zaloUrl": "https://zalo.me/g/...",
  "courts": [{ "name": "Court A" }, { "name": "Court B" }],
  "recurringSlots": [
    { "dayOfWeek": 6, "startsAt": "18:00", "durationMinutes": 120, "courtName": "Court A" }
  ]
}
```

`sport` comes from request context / query (`?sport=FOOTBALL`) aligned with Homepage tab — not in JSON body (or optional override for API tests).

**Slot rules**

- `dayOfWeek`: ISO **1 = Monday … 7 = Sunday** (document in API).
- `startsAt`: `HH:mm` local (Asia/Bangkok); must align to **30-minute** boundary.
- `durationMinutes`: multiple of **30**, ≥ 30.
- `courtName` must match a court in `courts[]`.
- Overlapping slots on same court+day → **400**.

---

## 5. Schedule tab (detail `810:772`)

1. User picks a **date** on the date strip.
2. Backend derives `dayOfWeek` from that date.
3. Response: matrix **courts × time slots** (full day, 30-min steps).
4. Cell status:
   - **`BOOKED`** — overlaps a `recurringSlots` entry for that court + weekday.
   - **`AVAILABLE`** — empty (group does not play).

This is **visualization only** — not venue occupancy / external booking.

**Example fragment `GET /groups/:id/schedule?date=2026-08-23`:**

```json
{
  "date": "2026-08-23",
  "dayOfWeek": 7,
  "courts": [
    {
      "name": "Court A",
      "slots": [
        { "startsAt": "17:00", "durationMinutes": 30, "status": "AVAILABLE" },
        { "startsAt": "17:30", "durationMinutes": 30, "status": "BOOKED" },
        { "startsAt": "18:00", "durationMinutes": 30, "status": "BOOKED" }
      ]
    }
  ]
}
```

---

## 6. Data sketch

Migration **`010_schema_groups.sql`**. Reuse `schema_matchmaking.fold_search_text` (or duplicate in `schema_groups`).

### 6.1 `schema_groups.groups`

| Column | Notes |
| :--- | :--- |
| `group_id` | PK |
| `admin_user_id` | FK → users; denormalized for quick lookup (must match sole `ADMIN` member) |
| `sport` | `BADMINTON` \| `FOOTBALL` |
| `name` | GROUP NAME |
| `title` | Tagline |
| `description` | TEXT nullable |
| `logo_url`, `cover_url` | URL nullable |
| `venue_name`, `venue_address` | Required |
| `province`, `city` | Pre-2025 codes; pair null or both set |
| `venue_lat`, `venue_lng` | Optional pair |
| `skill_min`, `skill_max`, `skill_min_rank`, `skill_max_rank`, `all_levels` | Same pattern as matches |
| `join_mode` | `AUTO` \| `APPROVAL` |
| `zalo_url` | VARCHAR nullable |
| `member_count` | Denormalized; admin + members |
| `created_at`, `updated_at` | |

No link to `schema_matchmaking.matches`.

### 6.2 Related tables

| Table | Purpose |
| :--- | :--- |
| `group_courts` | `group_id`, `name`, `sort_order` |
| `group_schedule_slots` | `group_id`, `court_id`, `day_of_week`, `start_time`, `duration_minutes` |
| `group_members` | `group_id`, `user_id`, `role` (`ADMIN`\|`MEMBER`), `joined_at`. **Partial unique:** one `ADMIN` per group |
| `group_join_requests` | `group_id`, `user_id`, `status` (`PENDING`\|`ACCEPTED`\|`REJECTED`\|`KICKED`), `message?`. Unique `(group_id, user_id)`. **`KICKED` is terminal** — same user cannot create a new join request for that group. |
| `group_favorites` | `(user_id, group_id)` PK |
| `group_gallery_images` | `group_id`, `image_url`, `uploaded_by`, `sort_order`, `created_at` |

**Member row on create:** insert creator as `group_members` role `ADMIN`; `member_count = 1`.

---

## 7. Gallery upload (admin)

| Layer | Approach |
| :--- | :--- |
| Storage | Supabase bucket `group-gallery/{groupId}/{uuid}.webp` (FE upload) |
| Create | `POST /groups/:id/gallery` body `{ "imageUrl": "https://..." }` — admin only |
| List | `GET /groups/:id/gallery?limit=20&offset=0` |
| Delete | `DELETE /groups/:id/gallery/:imageId` — admin only |
| Limit | Max **50** per group → `400` when exceeded |
| FE | Resize/compress before upload (~500KB target) |

---

## 8. Auth contract

Same as matchmaking: `authenticate`, `requireRole('PLAYER')` on mutating routes.

Layering: `controller / dto / entity / repository / service`. Zod DTOs. `AppError`.

---

## 9. Implementation order

Stop after each phase so Nguyễn can test.

### Phase G0 — Schema + create + browse + detail About — **done**

- Migration `010_schema_groups.sql`
- `POST /groups` (full create body incl. courts + slots + MODE)
- `GET /groups` — browse filters (mirror kèo geo; search `name`/venue/address)
- `GET /groups/:id` — About tab fields + `memberCount`, `isFavorited`, `myRole`, `zaloUrl`

**Verify:** create football group with 2 courts + weekend slots; list by sport/province; detail shows venue + tagline.

### Phase G1 — Join + manage + favorites — **done**

- `POST /groups/:id/join` — skill hard gate; AUTO vs APPROVAL
- `DELETE /groups/:id/join` — cancel own PENDING
- `GET /groups/my-join-requests` — PENDING + REJECTED
- `GET /groups/mine` — managed + joined sections
- `GET /groups/:id/requests` — admin pending list
- Accept / reject join request
- `POST` / `DELETE /groups/:id/favorite`
- Kick member; transfer admin; member leave; admin delete group

**Verify:** APPROVAL flow; AUTO with skill fail 400; reject then re-join; kick → rejoin **`403`**; transfer admin; sole admin cannot leave without transfer.

### Phase G2 — Edit + joinMode pending flush — **done**

- `PATCH /groups/:id` — all fields; changing `joinMode` to AUTO flushes pending → members
- Update courts/slots (replace strategy — courts replace clears slots unless `recurringSlots` also sent)

**Verify:** edit venue/slots; flip APPROVAL→AUTO with 3 pending → 3 new members.

### Phase G3 — Detail tabs: Members, Schedule, Gallery — **done**

- `GET /groups/:id/members?search=` — paginated; admin flag
- `GET /groups/:id/schedule?date=` — 30-min matrix
- Gallery CRUD

**Verify:** member search; schedule matrix marks BOOKED; gallery max 50.

### Phase G4 — Docs + smoke — **done**

- Update [`API.md`](./API.md), [`CLAUDE.md`](../CLAUDE.md)
- `npm run smoke:groups`

### Phase G5 — Notifications — **done**

- Migration `011_notification_group_types.sql` — inbox types on `schema_notification.notifications`
- Emit on join (APPROVAL→admin, AUTO→joiner), accept/reject, kick, transfer-admin, joinMode flush
- Verified in `npm run smoke:groups` (inbox type checks)

---

## 10. API map (implemented)

Prefix `/groups` and `/api/groups`. Static routes **before** `GET /:id`.

| Method | Path | Notes |
| :--- | :--- | :--- |
| `POST` | `/groups` | Create (admin = caller); sport from tab/query |
| `GET` | `/groups` | Browse + search/filters |
| `GET` | `/groups/venue-suggestions` | Location picker (optional G0) |
| `GET` | `/groups/mine` | `?tab=managed\|joined` + section |
| `GET` | `/groups/my-join-requests` | Joiner outbound; `?status=` |
| `GET` | `/groups/:id` | Detail About |
| `PATCH` | `/groups/:id` | Admin edit |
| `DELETE` | `/groups/:id` | Admin disband |
| `POST` | `/groups/:id/join` | Joiner |
| `DELETE` | `/groups/:id/join` | Cancel PENDING |
| `POST` | `/groups/:id/leave` | Member leave |
| `GET` | `/groups/:id/requests` | Admin pending |
| `POST` | `/groups/:id/requests/:requestId/accept` | Admin |
| `POST` | `/groups/:id/requests/:requestId/reject` | Admin |
| `POST` | `/groups/:id/members/:userId/kick` | Admin |
| `POST` | `/groups/:id/members/:userId/transfer-admin` | Admin → member becomes admin |
| `POST` / `DELETE` | `/groups/:id/favorite` | Heart |
| `GET` | `/groups/:id/members` | Members tab + search |
| `GET` | `/groups/:id/schedule` | `?date=YYYY-MM-DD` |
| `GET` | `/groups/:id/gallery` | Paginated |
| `POST` | `/groups/:id/gallery` | Admin add URL |
| `DELETE` | `/groups/:id/gallery/:imageId` | Admin |

---

## 11. Error cases (selected)

| Case | Code |
| :--- | :--- |
| Skill out of range on join | `400` |
| Join when already member | `409` |
| Join when PENDING exists | `409` |
| Join when group full (if max added later) | `400` |
| Non-admin PATCH / gallery / kick | `403` |
| Admin leave without transfer | `400` |
| Kicked user rejoin same group | **`403`** — permanent; row stays `KICKED` (mirror kèo kick) |
| REJECTED user rejoin | Allowed — new `POST /join` creates fresh `PENDING` (APPROVAL) or member (AUTO) |
| Gallery over 50 | `400` |
| Invalid slot overlap | `400` |
| `GET /groups` location + distance both set | `400` |

---

## 12. Out of scope (later)

- Group ↔ kèo linking
- Tournament / standings inside group
- Real venue booking integration on Schedule tab
- Facebook / website links (Zalo only MVP)
- Group chat
- Max members cap (unless product adds later)
- Verified badge

---

## 13. Figma reference

| Node | Screen |
| :--- | :--- |
| `810:612` | Browse Groups |
| `810:156` | Detail — About |
| `810:772` | Detail — Schedule |
| `810:924` | Detail — Members |
| `810:308` | Detail — Gallery |
| `99:275` | Create Group (+ MODE, courts, slots — **FE gap**) |
| `101:2` | Manage Groups |

File: `ZTpFWfkdcEpHH4xJaKaBxT/Spot`

---

## 14. How to review

After **G0**: create + browse + detail.  
After **G1**: join loops + manage tabs + favorites.  
After **G2**: full admin edit + MODE flush.  
After **G3**: all detail tabs.  
After **G4**: `API.md` + `npm run smoke:groups`.  
After **G5**: group join/manage notifications in inbox.
