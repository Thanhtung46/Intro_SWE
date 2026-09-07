# API Reference — Referee: Venue Pool Registration

Part of the SPOT backend API reference — see [../API.md](../API.md) for the full index.

### 19.6 `POST /referee/venues/:venueId/register`

Apply vào **pool sân** — auto active, không chờ chủ sân duyệt.

**Body**

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `sportType` | string | ✓ | `football` \| `badminton` — phải cert + venue có field ACTIVE |

**Success `201`**

```json
{
  "message": "Venue registration successful",
  "registration": {
    "registrationId": 12,
    "venueId": 3,
    "venueName": "Skyline Arena",
    "venueAddress": "123 Sports Lane",
    "ownerName": "Owner Name",
    "sportType": "Football",
    "status": "ACTIVE",
    "registeredAt": "2026-10-01T10:00:00.000Z"
  }
}
```

**Errors**

| Status | Message |
| :--- | :--- |
| `403` | Not certified for sport |
| `404` | Venue not found |
| `409` | Already registered / Venue has no active field for this sport |

**curl**

```bash
curl -s -X POST "http://localhost:3000/referee/venues/12/register" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d "{\"sportType\": \"football\"}"
```

**FE notes:** Sau success → refresh board (venue ẩn) + pending tab (`myVenues`).

---

### 19.7 `DELETE /referee/venues/:venueId/register`

Hủy pool sân (**Plan A — My venues**).

**Body**

| Field | Type | Required |
| :--- | :--- | :--- |
| `sportType` | string | ✓ |

**Success `200`**

```json
{
  "message": "Venue registration cancelled",
  "registration": {
    "registrationId": 12,
    "venueId": 3,
    "venueName": "Skyline Arena",
    "sportType": "Football",
    "status": "CANCELLED",
    "registeredAt": "2026-10-01T10:00:00.000Z"
  }
}
```

**Hành vi BE khi cancel**

- Registration → `CANCELLED`; sân có thể hiện lại Job Board.
- Assignment **PENDING** tại sân đó → auto `CANCELLED`.
- Assignment **ACCEPTED** → **giữ nguyên**.

**Errors:** `404` Active venue registration not found

**FE copy (confirm dialog):** *"Hủy đăng ký tại {venueName}? Bạn sẽ không nhận lời mời mới tại sân này. Trận đã xác nhận (nếu có) vẫn giữ."*

---

### 19.8 `GET /referee/venues/registrations`

Legacy/list helper — danh sách registration `ACTIVE` (không gộp Plan A pending). Plan A ưu tiên `GET .../invitations?tab=pending` → `myVenues[]`.

**Success `200`:** `{ "registrations": [ … ] }` — shape giống `registration` ở trên.

---

### 19.9 `GET /referee/invitations`

Tabs Invitations. Query `tab` mặc định `pending`.

**Query**

| Param | Default | Ghi chú |
| :--- | :--- | :--- |
| `tab` | `pending` | `pending` \| `confirmed` \| `completed` |
| `since` | `30d` | Chỉ `tab=completed` — ví dụ `30d` |
| `filter` | `all` | `completed` tab: `all` \| `completed` \| `declined` |

#### 19.9a `tab=pending` — **Plan A**

**Một màn scroll:** (1) Pending Queue Figma `224:3113`; (2) **My venues** section **dưới**. **Một API** refresh cả hai.

**Success `200`**

```json
{
  "tab": "pending",
  "matchInvitations": [
    {
      "assignmentId": 7,
      "bookingId": 42,
      "venueId": 3,
      "venueName": "Skyline Arena",
      "playerName": "Sarah M.",
      "sportType": "Football",
      "startsAt": "2026-10-12T08:00:00+07:00",
      "endsAt": "2026-10-12T10:00:00+07:00",
      "feeVnd": 250000,
      "status": "PENDING"
    }
  ],
  "myVenues": [
    {
      "registrationId": 12,
      "venueId": 3,
      "venueName": "Skyline Arena",
      "venueAddress": "123 Sports Lane, District 1, HCMC",
      "ownerName": "Venue Management",
      "sportType": "Football",
      "status": "ACTIVE",
      "registeredAt": "2026-10-01T10:00:00.000Z"
    }
  ]
}
```

| Section UI | Field | Actions |
| :--- | :--- | :--- |
| Pending Queue | `matchInvitations[]` | Accept / Decline → §19.11 |
| My venues | `myVenues[]` | Cancel pool → §19.7 |

**Empty states:** hai section độc lập; CTA “Browse Job Board” khi trống.

#### 19.9b `tab=confirmed`

Chỉ assignment `ACCEPTED` chưa tới giờ.

**Success `200`:** `{ "tab": "confirmed", "assignments": [ … ] }` — item shape giống `matchInvitations`.

#### 19.9c `tab=completed`

Trận đã xong trong cửa sổ `since` (default 30 ngày).

**Success `200`:** `{ "tab": "completed", "since": "30d", "filter": "all", "assignments": [ … ] }`

**curl**

```bash
curl -s "http://localhost:3000/referee/invitations?tab=pending" \
  -H "Authorization: Bearer <accessToken>"
```

---

