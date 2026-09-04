# API Reference — Referee: Assignments, Schedule, Earnings, Booking Integration

Part of the SPOT backend API reference — see [../API.md](../API.md) for the full index.

### 19.10 `GET /referee/assignments/:id`

Chi tiết assignment. FE tạm theo Figma `224:5703` (Zalo, Call, breakdown).

**Success `200`**

```json
{
  "assignment": {
    "assignmentId": 7,
    "bookingId": 42,
    "venueId": 3,
    "venueName": "Skyline Arena",
    "venueAddress": "123 Sports Lane",
    "playerName": "Sarah M.",
    "ownerName": "Venue Owner Co.",
    "sportType": "Football",
    "startsAt": "2026-10-12T08:00:00+07:00",
    "endsAt": "2026-10-12T10:00:00+07:00",
    "feeVnd": 250000,
    "status": "PENDING",
    "source": "HIRE_REFEREE",
    "acceptedAt": null,
    "completedAt": null,
    "declineReason": null,
    "createdAt": "2026-10-10T12:00:00.000Z"
  }
}
```

**Quy ước hiển thị**

- Invitation / incoming: ưu tiên **`playerName`** (người đặt booking).
- Board / venue context: ưu tiên **`ownerName`**.

**FE notes:** BE không trả phone/Zalo trên assignment — reuse **`GET /venues/:venueId`** (§18) cho contact + directions. Payment breakdown UI: hiện một `feeVnd` (chưa tách Travel line).

**Errors:** `404` Assignment not found

---

### 19.11 `POST /referee/assignments/:id/accept`

**First accept wins** — referee khác accept cùng booking → thua cuộc.

**Body:** không cần.

**Success `200`**

```json
{
  "message": "Assignment accepted",
  "assignment": { "assignmentId": 7, "status": "ACCEPTED", "acceptedAt": "…", … }
}
```

**Errors**

| Status | Message / code |
| :--- | :--- |
| `404` | Assignment not found |
| `409` | Assignment is not pending |
| `409` | `details.code = ASSIGNMENT_ALREADY_TAKEN` — referee khác đã accept |

**Side effects:** Các assignment `PENDING` khác cùng `bookingId` → `CANCELLED`. Lên lịch `REFEREE_RATING_REQUEST` lúc `endsAt`.

---

### 19.12 `POST /referee/assignments/:id/decline`

**Body**

| Field | Type | Required |
| :--- | :--- | :--- |
| `reason` | string | | max 500 |

**Success `200`:** `{ "message": "Assignment declined", "assignment": { …, "status": "DECLINED" } }`

**Errors:** `404` Pending assignment not found

---

### 19.13 `GET /referee/schedule`

Calendar tháng — dots = ngày có assignment **ACCEPTED**.

**Query:** `month=YYYY-MM` (optional, default tháng hiện tại +07).

**Success `200`**

```json
{
  "month": "2026-10",
  "timezone": "Asia/Bangkok",
  "confirmedDates": ["2026-10-12", "2026-10-15"],
  "items": [
    {
      "assignmentId": 7,
      "bookingId": 42,
      "venueId": 3,
      "venueName": "Skyline Arena",
      "sportType": "Football",
      "playerName": "Sarah M.",
      "bookingDate": "2026-10-12",
      "startsAt": "2026-10-12T08:00:00+07:00",
      "endsAt": "2026-10-12T10:00:00+07:00",
      "feeVnd": 250000,
      "status": "ACCEPTED",
      "isUpcoming": true
    }
  ]
}
```

Card **upcoming** (`isUpcoming: true`) → style muted/read-only trên Schedule (không phải invitation pending).

---

### 19.14 `GET /referee/earnings`

Tổng thu nhập tháng + chart points (data thật từ assignment `COMPLETED`).

**Query:** `month=YYYY-MM` (optional).

**Success `200`**

```json
{
  "month": "2026-10",
  "currency": "VND",
  "totalFeeVnd": 750000,
  "matchCount": 3,
  "chartPoints": [
    { "day": "2026-10-05", "amountVnd": 250000 },
    { "day": "2026-10-12", "amountVnd": 500000 }
  ]
}
```

---

### 19.14b `GET /referee/earnings/monthly`

Monthly totals for the Performance Growth "Month" chart mode — one bucket per
month with earnings, over a trailing window. Same source as `earnings`
(assignment `COMPLETED`, bucketed by `completed_at` in Asia/Bangkok).

**Query:**

| Param | Default | Notes |
| :--- | :--- | :--- |
| `anchor` | current month (Bangkok) | `YYYY-MM` — the newest month in the window |
| `months` | `6` | `2`–`12`; window = `months` back through `anchor` |

**Success `200`** (sparse — months with no earnings are omitted; FE zero-fills):

```json
{
  "anchor": "2026-09",
  "months": 6,
  "currency": "VND",
  "buckets": [
    { "key": "2026-07", "amountVnd": 450000, "matchCount": 3 },
    { "key": "2026-09", "amountVnd": 300000, "matchCount": 2 }
  ]
}
```

`months` outside `2`–`12` → `400 Validation failed`.

---

### 19.15 `GET /referee/earnings/history`

Lịch sử paginated. Optional `month` scopes it to matches completed in that month
(Asia/Bangkok) — the FE "Match History" card uses this so it tracks the month picker.

**Query:** `month=YYYY-MM` (optional), `limit` (default 20, max 50), `offset` (default 0).

`month` echoed back on the response as `"month"` (`null` when omitted).

**Success `200`**

```json
{
  "items": [
    {
      "index": 1,
      "assignmentId": 7,
      "bookingId": 42,
      "venueName": "Skyline Arena",
      "sportType": "Football",
      "playerName": "Sarah M.",
      "startsAt": "2026-10-12T08:00:00+07:00",
      "feeVnd": 250000,
      "completedAt": "2026-10-12T10:30:00+07:00"
    }
  ],
  "total": 12,
  "limit": 20,
  "offset": 0
}
```

---

### 19.16 Booking hire-referee + fan-out (player-side)

Referee nhận invitation khi player booking field có addon hire referee và booking **PAID**.

| Method | Path | Body / ghi chú |
| :--- | :--- | :--- |
| `POST` | `/bookings` | `{ fieldId, bookingDate, startTime, endTime, hireReferee: true, refereeFeeVnd?: 150000 }` |
| `POST` | `/bookings/:id/dev/mark-paid` | **Non-prod** — set PAID + fan-out |

Default `refereeFeeVnd` = **150_000 VND** nếu omit. Chi tiết booking: [§18 Venues & Booking](#18-venues--booking-endpoints).

**Fan-out:** Mỗi referee trong pool sân (`referee_venue_registrations` ACTIVE) nhận assignment `PENDING` + notification `REFEREE_INVITATION`.

**Notification `data`:**

```json
{
  "action": "REFEREE_INVITATION",
  "assignmentId": 7,
  "bookingId": 42,
  "venueName": "Saigon FC Arena",
  "sportType": "Football",
  "startsAt": "2026-08-25T18:00:00+07:00",
  "feeVnd": 150000
}
```

FE referee: tap → `/referee/invitations?tab=pending` hoặc `/referee/assignments/:assignmentId`.

---

### 19.17 Player rating referee (cross-ref)

Sau `endsAt`, player nhận `REFEREE_RATING_REQUEST` → `POST /reviews/referee` `{ bookingId, rating }` — rating **0.5–5.0** step 0.5, **không text**.

Chi tiết: [§12 — `POST /reviews/referee`](#92-post-reviewsreferee-player--trọng-tài).

**Notification `data`:**

```json
{
  "action": "REFEREE_RATING_REQUEST",
  "assignmentId": 7,
  "bookingId": 42,
  "refereeId": 15,
  "venueName": "Saigon FC Arena",
  "refereeName": "Nguyen Van A"
}
```

---

### 19.18 Dev-only (non-production)

| Method | Path | Ghi chú |
| :--- | :--- | :--- |
| `POST` | `/referee/assignments/:id/dev/complete` | Mark completed + gửi rating prompt ngay |
| `POST` | `/bookings/:id/dev/mark-paid` | Trigger fan-out (player token) |

**Smoke:** `npm run smoke:referee` — full flow onboarding → board filter/favourite → apply → hire → accept.

---

