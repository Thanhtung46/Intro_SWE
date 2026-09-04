# SPOT Referee Feature — Implementation Plan

> **Status:** Locked product spec — **BE implemented (Aug 2026)** — migrations `015`–`022`, `/referee/*`, board filter/favourite, Plan A pending API  
> **Scope:** Mobile FE (`spot-frontend-mobile`) + Backend (`spot-backend`)  
> **Figma file:** `ZTpFWfkdcEpHH4xJaKaBxT/Spot` — nodes `224:*`  
> **FE contract (chi tiết từng endpoint):** [`api/15-referee-onboarding.md`](./api/15-referee-onboarding.md)

---

## 0. BE vs FE — báo cáo triển khai (Aug 2026)

Bảng này tóm tắt những gì đã **chốt product + implement BE** sau merge matchmaking. FE mobile **chưa wire** — dùng bảng này làm checklist.

| Hạng mục | BE | FE mobile | Ghi chú |
| :--- | :---: | :---: | :--- |
| Onboarding REFEREE + batch 3 docs | ✅ | ❌ | `POST /users/me/verification-requests/batch` |
| Admin approve + `certifiedSportTypes` | ✅ | ❌ | Admin console chưa có UI |
| Job Board list + Apply pool | ✅ | ❌ | `GET /referee/board`, `POST .../register` |
| Board filter Tỉnh/Phường (H23) | ✅ | ❌ | `province`+`city`, XOR distance; `GET /geo/vn` |
| Board distance 1–20 km | ✅ | ❌ | `lat`/`lng`/`radiusKm` |
| Board search `q=` | ✅ | ❌ | Tên sân / địa chỉ |
| Venue favourite (H22) | ✅ | ❌ | `POST/DELETE .../favorite`, `?favorited=true` |
| Pending tab **Plan A** | ✅ | ❌ | `matchInvitations[]` + `myVenues[]` một API |
| Accept / Decline (first wins) | ✅ | ❌ | `409 ASSIGNMENT_ALREADY_TAKEN` |
| Confirmed / Completed tabs | ✅ | ❌ | `tab=confirmed\|completed` |
| Schedule + Earnings | ✅ | ❌ | Calendar dots, chart data thật |
| Hire referee fan-out | ✅ | ❌ | Player `POST /bookings` + `dev/mark-paid` |
| Player rating referee | ✅ | ❌ | `REFEREE_RATING_REQUEST` + `POST /reviews/referee` |
| Payment gateway IPN | ❌ | ❌ | Post-MVP — dùng `dev/mark-paid` |
| FCM push | ❌ | ❌ | In-app + email only |
| Assignment detail Zalo/Call UI | — | ❌ | BE trả assignment + reuse `GET /venues/:id` contact |

**Migrations:** `015` admin → `016` referee schema → `017`–`020` reviews/rating notify → `021` venue `province`/`city` → `022` `referee_venue_favorites`.

**Smoke:** `cd spot-backend && npm run smoke:referee` (cần `OTP_DEBUG=true`, `npm run seed:admin`, migrate `015`–`022`).

---

## 1. Executive summary

Referee flow gồm **2 tầng**:

| Tầng | Màn hình | Hành vi |
|------|----------|---------|
| **Venue pool** | Job Board | Trọng tài apply vào **sân** theo **môn thể thao** (chứng chỉ admin duyệt). Sân đã apply → ẩn khỏi Board. |
| **Match assignment** | Invitations (Pending) | Khi có **booking + Hire Referee** tại sân đã apply → mọi trọng tài trong pool thấy invitation; **ai Accept trước** nhận trận. |

Onboarding: Register → OTP → Choose Referee → 3 docs → Pending (admin) → Activated → **Job Board**.

---

## 2. Locked product decisions

### 2.1 Onboarding & verification

| # | Decision |
|---|----------|
| A1 | 3 loại giấy tờ: `ID_FRONT`, `ID_BACK`, `VFF_LICENSE` (+ `CERT_UPDATE` sau này) |
| A3 | Upload 3× file → `POST /users/me/verification-requests/batch` (BE mới) |
| B | Pending UI 3 bước derive từ `user.status` + submit success; admin duyệt **một lần** kích hoạt account |
| Auth | `PENDING` referee → block login → `/referee/pending`; `ACTIVE` → `/referee/board` |
| H21 | Cert update post-activation → upload mới → admin duyệt riêng (không khóa account) |

### 2.2 Job Board (venue-level)

| # | Decision |
|---|----------|
| C5 | Trọng tài chủ động tìm **sân**, không phải booking slot |
| Filter | Chỉ sân có `field.sport_type` khớp **chứng chỉ** trọng tài |
| Q2 | Admin duyệt 1 hoặc 2 môn (`FOOTBALL`, `BADMINTON`, …) khi approve referee |
| UI | **Sport tabs** implicit (reuse `SportSegmentedToggle`) — chỉ hiện tab môn trọng tài được cert |
| C6 | Apply → **auto vào pool sân** (không chờ chủ sân); sân **ẩn** khỏi Board |
| Cancel | Trọng tài **hủy pool sân** từ section **My venues** trên tab Pending (**Plan A** — FE thêm dưới Pending Queue; Figma `224:3113` chưa vẽ) |
| Q3-B | Hủy pool vẫn **giữ** assignment `ACCEPTED` hiện tại; không nhận invitation mới tại sân đó |
| H22 | **Favourite sân (MVP)** — heart trên Job Board card + filter “favourites only” trong sheet `224:5828`. BE: `venue_favorites` + `POST/DELETE /referee/venues/:id/favorite`, `GET /board?favorited=true`, field `isFavorited` trên board DTO. **Khác** `match_favorites` (kèo player). |
| H23 | **Filter sheet** (`224:5828`): Sport tabs + **Location** (Tỉnh/Phường) **XOR** **Distance** (1–20 km). Reuse `GET /geo/vn`, `province` + `city`. Distance: `lat` + `lng` + `radiusKm`. Search `q=` trên board (tên/địa chỉ). Map toggle = FE. |
| H24 | **Board card** (`224:3292`): search “Find courts”, filter icon, map toggle, heart, share/directions, rating, **Apply** (không “Book Field” / giá giờ — artefact player trong `224:5828`). |

### 2.3 Invitations

| Tab | Nội dung | Actions |
|-----|----------|---------|
| **Pending** | **Plan A — một màn scroll:** (1) **Pending Queue** — lời mời trận (Figma `224:3113`); (2) **My venues** — sân đã apply (FE thêm **dưới** Pending Queue) | Approve/Decline trận; **Cancel** venue pool |
| **Confirmed** | `ACCEPTED` + chưa tới giờ | Read-only card (muted khi trên Schedule) |
| **Completed** | Trận xong **≤ 1 tháng** | Filter: Completed / Declined |

| # | Decision |
|---|----------|
| Q1-A | Booking Hire Referee → **tất cả** trọng tài trong pool thấy invitation; **Accept trước** thắng |
| D7 | Incoming: Approve → `ACCEPTED`; Decline → `DECLINED` |
| D8-D9 | Confirmed/Completed read-only trên list |
| E11 | Detail incoming: **tên player** (người đặt); Detail Board/sân: **tên chủ sân** |
| E13 | ~~Không Zalo/Call~~ **Tạm theo Figma `224:5703`:** có Zalo, Call Now, Get Directions, Payment Breakdown (Base + Travel). Plan cũ (chỉ Directions) deferred. |
| **Plan A** | `GET /referee/invitations?tab=pending` → `{ matchInvitations[], myVenues[] }`. Một API, pull-to-refresh cả hai section. Cancel → `DELETE /referee/venues/:venueId/register` + confirm dialog. |

### 2.4 Schedule, Earnings, Profile

| Area | Decision |
|------|----------|
| Schedule dots | Chỉ ngày có assignment **CONFIRMED/ACCEPTED** |
| Schedule card xám | ACCEPTED nhưng **chưa tới giờ** (không phải invitation pending) |
| F16 | Detail Schedule = confirmed assignment (không phải flow apply sân) |
| Earnings | Sum `fee_vnd` assignment COMPLETED trong tháng; chart = data thật |
| E12 fee | **Base match fee** snapshot lúc assign; default **150,000 VND** (Hire Referee addon); xem §5 |
| Profile | Bỏ badge decorative; certs = docs uploaded; reuse `EditProfileScreen` |
| H20 | Player **rating** referee sau trận — thang 0.5–5.0; inbox `REFEREE_RATING_REQUEST` khi trận kết thúc |
| Nav | 5 tabs: Invitations \| Board \| Schedule \| Earnings \| Settings |

---

## 3. User flows

### 3.1 Registration → Activated

```
Register → OTP → Choose REFEREE → POST /auth/role (PENDING)
  → RefereeRegisterScreen (3 uploads)
  → POST verification-requests/batch
  → /referee/pending (step tracker)
  → [Admin approve all docs + set certified_sports]
  → user.status = ACTIVE
  → /referee/activated → Go to Job Board
```

### 3.2 Job Board apply

```
GET /referee/board?sport=FOOTBALL
  → venues matching sport + not in my ACTIVE registrations
  → Tap venue → detail (owner name, address, sport)
  → Apply → POST /referee/venues/:venueId/register
  → venue hidden from board
  → appears in Invitations Pending → "My venues"
```

### 3.3 Booking → First accept wins (Q1-A)

```
Player books field + hire_referee addon (booking PAID/confirmed)
  → BE finds ACTIVE referee_venue_registrations for venue
  → For EACH referee in pool: INSERT referee_assignment (status=PENDING)
  → Push notification (optional)

Referee A taps Approve (first)
  → TX: assignment A → ACCEPTED
  → booking.referee_assignment_id = A (or flag hire_referee_filled)
  → All other PENDING assignments for same booking → CANCELLED
  → Losers see invitation disappear / status cancelled

Referee B taps Approve (late)
  → 409 ASSIGNMENT_ALREADY_TAKEN
```

### 3.4 Cancel venue pool (Q3-B)

```
DELETE /referee/venues/:venueId/register
  → registration.status = CANCELLED
  → venue reappears on Job Board (if sport still matches)
  → future bookings: no new invitations for this referee
  → existing ACCEPTED assignments: unchanged
  → PENDING invitations at that venue: auto CANCELLED
```

---

## 4. Figma → Routes

| Node | Screen | Route |
|------|--------|-------|
| `224:5377` | Document Submission | `/referee/register` |
| `224:5141` / `224:5234` | Application Under Review | `/referee/pending` |
| `224:5329` | Account Activated | `/referee/activated` |
| `224:3113` | Invitations — Pending (**+ My venues** section Plan A dưới Pending Queue) | `/referee/(tabs)/invitations?tab=pending` |
| `224:3204` | Invitations — Confirmed | `?tab=confirmed` |
| `224:5610` | Invitions — Completed | `?tab=completed` |
| `224:5703` | Assignment Detail | `/referee/assignments/:id` |
| `224:3292` | Job Board | `/referee/(tabs)/board` |
| `224:5828` | Board + Filter sheet | sheet on Board |
| `224:4790` | Schedule | `/referee/(tabs)/schedule` |
| `224:3471` | Earnings & Performance | `/referee/(tabs)/earnings` |
| `224:4993` | Settings | `/referee/(tabs)/settings` |
| `224:3392` | Referee Profile | `/referee/profile` |

**FE structure:** `app/referee/(tabs)/` — tách khỏi player `(tabs)`.

---

## 5. Fee logic (E12)

| Case | `fee_vnd` |
|------|-----------|
| Booking có Hire Referee addon | Giá addon lúc booking (default **150,000**) — snapshot vào assignment |
| Display on card | Label "Standard Rate" / "Base Match Fee" |
| Earnings | Sum assignments `COMPLETED` where `completed_at` in month |

**Phase 2 formula (optional):**

```
fee_vnd = max(150_000, round(duration_hours × 75_000))
```

**UI Figma `224:5703`:** có thể hiển thị Travel Allowance + breakdown — FE theo design; BE hiện snapshot **một** `fee_vnd` (base addon). Travel line item = FE placeholder hoặc phase 2 nếu tách fee.

---

## 5.1 Pending tab — Plan A (FE wire)

Màn `224:3113` + section bổ sung (designer có thể thêm frame sau):

```
Invitations → tab Pending
├── Section: Pending Queue          ← Figma có
│     GET .../invitations?tab=pending → matchInvitations[]
│     Card: player, venue, time, fee → Approve / Decline
│     Empty: "No pending invitations"
├── Section: My venues              ← Plan A — scroll dưới Pending Queue
│     Cùng response → myVenues[]
│     Card: venueName, sportType, registeredAt, (address/owner optional)
│     Action: Cancel → DELETE /referee/venues/:venueId/register { sportType }
│     Confirm copy: giữ trận ACCEPTED; không nhận invite mới tại sân đó
│     Empty: "No venues applied yet" + CTA Job Board
```

**Không** thêm tab con; **không** endpoint riêng cho My venues (BE đã gộp trong `tab=pending`).

---

## 6. Backend — triển khai hiện tại

### 6.1 Đã implement ✅ (Aug 2026)

| Layer | Done |
| :--- | :--- |
| **Auth / onboarding** | Role `REFEREE`, `PENDING` block login; batch 3 docs; admin approve `{ certifiedSportTypes }` |
| **Schema** | `schema_referee.*`, `bookings.hire_referee`, `referee_fee_vnd`, `referee_reviews`, rating jobs |
| **Migrations** | `015`–`022` (admin, referee, rating notify, venue admin units, venue favourites) |
| **Job Board** | `GET /referee/board` — sport, province/city, distance, `q`, `favorited`, pagination |
| **Favourite** | `POST/DELETE /referee/venues/:id/favorite`, `isFavorited` on board |
| **Venue pool** | register / cancel registration; ẩn sân đã apply khỏi board |
| **Plan A pending** | `GET /referee/invitations?tab=pending` → `matchInvitations[]` + `myVenues[]` |
| **Assignments** | accept (first wins TX), decline, detail, confirmed/completed tabs |
| **Schedule / Earnings** | month query, chart points, history pagination |
| **Fan-out** | Booking paid + `hireReferee` → assignments + `REFEREE_INVITATION` |
| **Player rating** | `REFEREE_RATING_REQUEST` + `POST /reviews/referee` (0.5–5.0) |
| **Dev / smoke** | `dev/mark-paid`, `dev/complete`, `npm run smoke:referee` |

### 6.2 Chưa có (post-MVP)

| Gap | Ghi chú |
| :--- | :--- |
| Payment IPN → auto PAID → fan-out | Test: `POST /bookings/:id/dev/mark-paid` |
| FCM device push | In-app + email today |
| Admin UI duyệt 3 docs + sport picker | BE `/admin/approvals/*` sẵn |
| Venue Owner tạo sân qua API | Seed dev: `POST /users/me/schedule/dev/seed` |

### 6.3 FE mobile — cần làm

Xem **§0 BE vs FE** và [`api/15-referee-onboarding.md`](./api/15-referee-onboarding.md) (contract đầy đủ).

1. Shell `app/referee/(tabs)/` — tách khỏi player tabs  
2. Onboarding pending + activated screens  
3. Job Board + filter sheet `224:5828` + heart  
4. Pending Plan A scroll (Queue + My venues)  
5. Confirmed / Completed / Schedule / Earnings  
6. Assignment detail `224:5703` (Zalo/Call UI — contact từ `GET /venues/:id`)  
7. Player-side hire referee toggle trên booking (khi booking UI có)

---

## 7. Database schema (proposed)

### 7.1 Migration `016_schema_referee.sql`

```sql
CREATE SCHEMA IF NOT EXISTS schema_referee;

-- Admin sets on referee approval (1 or 2 sports from credentials)
CREATE TABLE schema_referee.referee_profiles (
  user_id INT PRIMARY KEY REFERENCES schema_auth.users(user_id),
  certified_sport_types TEXT[] NOT NULL DEFAULT '{}',
  total_matches_officiated INT NOT NULL DEFAULT 0,
  avg_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Job Board: referee ↔ venue pool
CREATE TABLE schema_referee.referee_venue_registrations (
  registration_id SERIAL PRIMARY KEY,
  referee_id INT NOT NULL REFERENCES schema_auth.users(user_id),
  venue_id INT NOT NULL REFERENCES schema_venue.venues(venue_id),
  sport_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TIMESTAMPTZ NULL,
  UNIQUE (referee_id, venue_id, sport_type)
);

-- Match-level assignments (Invitations)
CREATE TABLE schema_referee.referee_assignments (
  assignment_id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES schema_booking.bookings(booking_id),
  venue_id INT NOT NULL REFERENCES schema_venue.venues(venue_id),
  referee_id INT NOT NULL REFERENCES schema_auth.users(user_id),
  fee_vnd DECIMAL(10,2) NOT NULL CHECK (fee_vnd >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','ACCEPTED','DECLINED','CANCELLED','COMPLETED')),
  source VARCHAR(20) NOT NULL DEFAULT 'HIRE_REFEREE',
  accepted_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (booking_id, referee_id)
);

-- Only one ACCEPTED referee per booking
CREATE UNIQUE INDEX idx_one_accepted_referee_per_booking
  ON schema_referee.referee_assignments (booking_id)
  WHERE status = 'ACCEPTED';
```

### 7.2 Verification extension (migration `017_verification_document_kind.sql`)

```sql
ALTER TABLE schema_auth.verification_requests
  ADD COLUMN document_kind VARCHAR(30) NULL
    CHECK (document_kind IN ('ID_FRONT','ID_BACK','VFF_LICENSE','CERT_UPDATE'));

-- Drop single-pending constraint behavior in app layer;
-- unique partial index for signup bundle:
CREATE UNIQUE INDEX idx_verification_pending_kind
  ON schema_auth.verification_requests (user_id, document_kind)
  WHERE status = 'PENDING' AND document_kind IS NOT NULL;
```

### 7.3 Booking addon

```sql
ALTER TABLE schema_booking.bookings
  ADD COLUMN hire_referee BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN referee_fee_vnd DECIMAL(10,2) NULL
    CHECK (referee_fee_vnd IS NULL OR referee_fee_vnd >= 0);
```

**Trigger/hook:** Khi booking chuyển `PAID` + `hire_referee=true` → fan-out PENDING assignments cho pool.

---

## 8. API contract (draft)

Prefix: `/api/referee/*` — Bearer + `requireRole('REFEREE')` + `user.status = ACTIVE`.

### 8.1 Verification (extend existing)

#### `POST /users/me/verification-requests/batch`

```json
{
  "documents": [
    { "documentKind": "ID_FRONT", "documentUrl": "/uploads/..." },
    { "documentKind": "ID_BACK", "documentUrl": "/uploads/..." },
    { "documentKind": "VFF_LICENSE", "documentUrl": "/uploads/..." }
  ]
}
```

**201** — `{ "requests": [...] }`  
**409** — duplicate kind pending

#### Admin approve referee (extend)

`POST /admin/approvals/:userId/approve` body thêm:

```json
{ "certifiedSportTypes": ["FOOTBALL"] }
```

hoặc `["FOOTBALL", "BADMINTON"]` — admin chọn theo chứng chỉ.

---

### 8.2 Referee profile

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/referee/me` | Profile + `certifiedSportTypes` + stats |
| `GET` | `/referee/me/certifications` | Approved + pending cert docs |

---

### 8.3 Job Board

| Method | Path | Query | Response |
|--------|------|-------|----------|
| `GET` | `/referee/board` | `sport` (required), `lat`, `lng`, `radiusKm`, `page` | `{ venues: [{ venueId, name, ownerName, address, sportType, distanceKm, avgRating }] }` |

- Exclude venues where referee has `ACTIVE` registration for that sport.

| Method | Path | Body | Response |
|--------|------|------|----------|
| `POST` | `/referee/venues/:venueId/register` | `{ "sportType": "FOOTBALL" }` | **201** `{ registration }` |
| `DELETE` | `/referee/venues/:venueId/register` | `{ "sportType": "FOOTBALL" }` | **200** — cancel pool (Q3-B) |

---

### 8.4 Invitations & assignments

| Method | Path | Query | Description |
|--------|------|-------|-------------|
| `GET` | `/referee/invitations` | `tab=pending\|confirmed\|completed` | See §8.4.1 |
| `GET` | `/referee/assignments/:id` | — | Detail (player name for incoming) |
| `POST` | `/referee/assignments/:id/accept` | — | First-accept-wins TX |
| `POST` | `/referee/assignments/:id/decline` | `{ "reason"?: string }` | Decline invitation |
| `GET` | `/referee/venues/registrations` | `status=ACTIVE` | My venues (Pending section) |

#### 8.4.1 `GET /referee/invitations?tab=pending` response

```json
{
  "matchInvitations": [
    {
      "assignmentId": 1,
      "bookingId": 42,
      "venueName": "Saigon FC Arena",
      "playerName": "Nguyen Van A",
      "sportType": "FOOTBALL",
      "startsAt": "2026-08-25T18:00:00+07:00",
      "feeVnd": 150000,
      "status": "PENDING"
    }
  ],
  "myVenues": [
    {
      "registrationId": 5,
      "venueId": 12,
      "venueName": "District 7 Sports Hub",
      "ownerName": "Tran Owner",
      "sportType": "FOOTBALL",
      "registeredAt": "2026-08-20T10:00:00+07:00"
    }
  ]
}
```

#### Completed tab

`GET /referee/invitations?tab=completed&since=30d&filter=all|completed|declined`

---

### 8.5 Schedule & Earnings

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/referee/schedule` | `?month=2026-08` — calendar dots + list ACCEPTED |
| `GET` | `/referee/earnings` | `?month=2026-08` — summary + chart points |
| `GET` | `/referee/earnings/history` | Paginated COMPLETED assignments |

---

## 9. Frontend implementation phases

| Phase | Deliverable | BE dependency |
|-------|-------------|---------------|
| **R0** | `RefereeRegisterScreen`, pending tracker, activated, auth guards | Batch verification |
| **R1** | `RefereeBottomNav`, Invitations 3 tabs + 2 sections Pending | `/referee/invitations`, accept/decline |
| **R2** | Job Board + `SportSegmentedToggle` + apply + cancel venue | `/referee/board`, register/cancel |
| **R3** | Assignment detail (2 variants), directions | `/referee/assignments/:id` |
| **R4** | Schedule (calendar + gray upcoming) | `/referee/schedule` |
| **R5** | Earnings + chart + paginated history | `/referee/earnings` |
| **R6** | Profile, certs, Settings, EditProfile extensions | Cert APIs |
| **R7** | Remove all mocks → production API | Full domain |

**Mock policy:** Mock allowed during R0–R6; **must wire real API before release**.

### 9.1 Reuse from codebase

| Component | Path |
|-----------|------|
| Sport tabs | `src/components/venue/SportSegmentedToggle.tsx` |
| Owner register pattern | `src/screens/owner/OwnerRegisterScreen.tsx` |
| Pending (replace) | `src/screens/common/PendingApprovalScreen.tsx` → referee-specific |
| Edit profile | `src/screens/profile/EditProfileScreen.tsx` |
| Routes | Extend `src/constants/routes.ts` |

### 9.2 Pending tab UI sections

```
┌─ Match invitations ─────────────┐
│  [Card] Approve | Decline       │
└─────────────────────────────────┘
┌─ My venues ─────────────────────┐
│  [Card] Cancel venue registration│
└─────────────────────────────────┘
```

---

## 10. Backend implementation order (historical — all done Aug 2026)

1. ✅ `017_verification_document_kind.sql` + batch submit + admin `certifiedSportTypes`
2. ✅ `016_schema_referee.sql` + booking `hire_referee` columns
3. ✅ Referee domain: board, register, cancel registration
4. ✅ Booking hook: fan-out on PAID + `hire_referee`
5. ✅ Accept/decline first-accept-wins TX
6. ✅ Schedule + earnings queries
7. ✅ Player review referee + `REFEREE_RATING_REQUEST`
8. ✅ `021_venue_admin_units` + board province/city filter
9. ✅ `022_referee_venue_favorites` + favourite API + `q=` search

**Next:** FE wire per §0 and [`api/15-referee-onboarding.md`](./api/15-referee-onboarding.md).

---

## 11. Test cases (PA3 mapping)

| TC | Scenario |
|----|----------|
| TC_REF_01 | 3 docs batch submit |
| TC_REF_02 | Pending UI steps |
| TC_REF_03 | Admin approve + sport types |
| TC_REF_04 | Job Board sport filter |
| TC_REF_05 | Apply venue → hidden from board |
| TC_REF_06 | Cancel venue pool (Q3-B) |
| TC_REF_07 | Pending invitation Approve/Decline |
| TC_REF_08 | Job Board distance filter |
| TC_REF_09 | Apply venue (not match) |
| TC_REF_10 | First accept wins (Q1-A) |
| TC_REF_11 | Schedule confirmed dots |
| TC_REF_12 | Profile + certs |
| TC_REF_13 | Earnings month sum |

---

## 12. Open items

### BE — next

| Item | Status | Notes |
|------|--------|-------|
| **Venue favourite** (H22) | **Done** | `022_referee_venue_favorites`; `POST/DELETE .../favorite`, `?favorited=true`, `isFavorited` |
| **Board filter province/city** (H23) | **Done** | `021_venue_admin_units`; `GET /referee/board?province=&city=` XOR distance |
| **Board search `q=`** | **Done** | Fuzzy name/address on Job Board |
| Payment IPN → PAID fan-out | Post-MVP | Hiện `dev/mark-paid` |
| FCM push | Post-MVP | In-app + email today |
| Admin UI 3 docs + sport picker | Post-MVP | BE `/admin/approvals/*` ready |

### FE

- Wire Pending **Plan A** (My venues section)
- Job Board filter sheet + favourite (BE ready)
- Assignment detail theo Figma `224:5703` (Zalo/Call/breakdown)

---

## 13. Recommended next step

1. **FE:** Shell `app/referee/(tabs)/` + Pending tab Plan A + Board Apply flow
2. **FE:** Filter sheet + heart (wire `GET /geo/vn`, board filters, favorite API)
