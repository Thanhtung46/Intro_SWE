# API Reference — Groups (hội)

Part of the SPOT backend API reference — see [../API.md](../API.md) for the full index.

## 8. Groups endpoints

Base: `/groups` hoặc `/api/groups`. Mọi route cần Bearer.  
`POST /groups`, `POST /groups/:id/join`, `DELETE /groups/:id/join`, `POST /groups/:id/leave`, `DELETE /groups/:id` thêm `requireRole('PLAYER')`.  
Route tĩnh (`/mine`, `/my-join-requests`) **trước** `GET /:id`.

Product lock: [`docs/GROUP_PLAN.md`](./GROUP_PLAN.md). Schema: `010_schema_groups.sql` (`schema_groups`).

**API map**

| Method | Path | Notes |
| :--- | :--- | :--- |
| `POST` | `/groups` | Create (caller = admin); `?sport=` |
| `GET` | `/groups` | Browse + search/filters |
| `GET` | `/groups/mine` | `?tab=managed\|joined` + section |
| `GET` | `/groups/my-join-requests` | Joiner outbound; `?status=` |
| `GET` | `/groups/:id` | Detail About |
| `PATCH` | `/groups/:id` | Admin edit; joinMode→AUTO flush pending |
| `DELETE` | `/groups/:id` | Admin disband |
| `POST` | `/groups/:id/join` | Joiner (`PLAYER`) |
| `DELETE` | `/groups/:id/join` | Cancel PENDING |
| `POST` | `/groups/:id/leave` | Member leave |
| `GET` | `/groups/:id/requests` | Admin pending |
| `POST` | `/groups/:id/requests/:requestId/accept` | Admin |
| `POST` | `/groups/:id/requests/:requestId/reject` | Admin |
| `POST` | `/groups/:id/members/:userId/kick` | Admin |
| `POST` | `/groups/:id/members/:userId/transfer-admin` | Admin transfer |
| `POST` / `DELETE` | `/groups/:id/favorite` | Heart |
| `GET` | `/groups/:id/members` | Members tab + `?search=` |
| `GET` | `/groups/:id/schedule` | `?date=YYYY-MM-DD` matrix |
| `GET` | `/groups/:id/gallery` | Paginated list |
| `POST` | `/groups/:id/gallery` | Admin add URL |
| `DELETE` | `/groups/:id/gallery/:imageId` | Admin delete |

---

### 8.1 `POST /groups`

Tạo hội/club. Caller = admin. `sport` từ Homepage tab (query `?sport=` hoặc body).

**Query (optional):** `sport=FOOTBALL|BADMINTON`

**Body**

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `name` | string | ✓ | GROUP NAME, ≤ 150 |
| `title` | string | ✓ | Tagline, ≤ 150 |
| `description` | string | | ≤ 5000 |
| `joinMode` | string | ✓ | `AUTO` \| `APPROVAL` |
| `allLevels` | boolean | | default `false` |
| `skillMin` / `skillMax` | string | nếu không `allLevels` | Cùng sport |
| `venueName`, `venueAddress` | string | ✓ | |
| `province`, `city` | string | ✓ | Pre-2025; `GET /geo/vn` |
| `latitude` / `longitude` | number | | Optional, gửi cặp |
| `logoUrl`, `coverUrl`, `zaloUrl` | string | | http(s) URL |
| `courts` | `{ name }[]` | ✓ | ≥ 1, tên không trùng |
| `recurringSlots` | object[] | ✓ | `dayOfWeek` 1=Mon…7=Sun; `startsAt` HH:mm (step 30 phút); `durationMinutes`; `courtName` |

**Success `201`:** `{ "message": "Group created", "group": { …, myRole: "ADMIN", memberCount: 1, courts[], recurringSlots[] } }`

### 8.2 `GET /groups`

Browse + search. Ẩn group caller đã là member hoặc join request `PENDING`/`KICKED`. **`REJECTED` hiện lại**.

**Query:** `sport`, `skill` (cần `sport`), `location` (fuzzy `name`/venue/address + `suggestions[]` max 5), `province`/`city`, `latitude`+`longitude`+`radiusKm` (1–20, XOR `location`), `favorited=true`, `limit` (default 20), `offset`.

**Success `200`:** `{ total, limit, offset, groups[], suggestions[] }`. Suggestion `kind`: `name` \| `venueName` \| `venueAddress`.

### 8.3 `GET /groups/:id`

Detail tab About (+ config schedule).

**Success `200`:** `{ group }` — `recurringSlots[]`, `zaloUrl`, `myRole`, `isFavorited`, `admin`, `memberAvatars`, `memberCount`.

**Errors:** `400` Invalid group id · `401` · `404`

### 8.4 `POST /groups/:id/join`

PLAYER. Body có thể `{}`.

| Field | Notes |
| :--- | :--- |
| `message` | ≤ 500 |

Skill **ngoài range → `400`** (hard gate, khác kèo). Không tạo request nếu fail skill.

**`memberCount` — khi nào thay đổi:**

| Sự kiện | `memberCount` |
| :--- | :--- |
| `POST /groups` (tạo) | `1` (admin) |
| Join `AUTO` thành công | `+1` ngay |
| Join `APPROVAL` (PENDING) | **không đổi** |
| Accept request | `+1` |
| Reject / hủy PENDING | không đổi |
| `PATCH joinMode`→`AUTO` flush | `+N` (mỗi pending chưa là member) |
| Kick / member leave | `-1` |
| Transfer admin | không đổi |

`AUTO`: thêm `group_members`, `memberCount++`. `APPROVAL`: `PENDING`, chưa tăng member.

**Success `201`:** `{ message, request, group }`

**Errors:** `400` skill mismatch / already member (via membership) · `403` kicked / not PLAYER · `409` đã PENDING / đã member

### 8.4b `DELETE /groups/:id/join`

Joiner hủy request **`PENDING`** (xóa row).

**Success `200`:** `{ message: "Join request cancelled", groupId, requestId }`

**Errors:** `400` No pending join request · `404` group not found

### 8.5 `GET /groups/:id/requests`

Admin, **PENDING only**. Mỗi request: `avatarUrl`, `skill` (sport group).

**Success `200`:** `{ groupId, total, requests[] }` · `403` nếu không phải admin

### 8.6 / 8.7 Accept · reject

`POST /groups/:id/requests/:requestId/accept` — chỉ `PENDING`; skill joiner phải trong range; thêm `group_members`, `memberCount++`.  
`POST /groups/:id/requests/:requestId/reject` — `PENDING` → `REJECTED`; có thể join lại.

### 8.8 `POST /groups/:id/members/:userId/kick`

Admin kick member. Xóa `group_members`, `memberCount--`, join request → `KICKED`. **Bị kick không join lại group đó** (`403`).

**Errors:** `400` Admin cannot be kicked · `403` not admin · `404` member not found

### 8.8b `POST /groups/:id/members/:userId/transfer-admin`

Admin chuyển quyền. Target phải là `MEMBER`. Admin cũ → `MEMBER`; cập nhật `groups.admin_user_id`.

**Success `200`:** `{ message, groupId, adminUserId, group }`

### 8.9 `POST /groups/:id/leave`

Member rời group. **Admin không được leave** — phải transfer hoặc `DELETE /groups/:id`.

**Success `200`:** `{ message: "Left group", groupId }`

### 8.9b `DELETE /groups/:id`

Admin disband group (cascade members, requests, gallery, schedule).

**Success `200`:** `{ message: "Group deleted", groupId }`

### 8.10 `GET /groups/mine`

Manage Groups (Figma `101:2`). Query `tab`, `section`, `limit`, `offset`.

| `tab` | `section` | Response |
| :--- | :--- | :--- |
| `managed` (default) | `groups` (default) | `groups[]` admin tạo + `pendingRequestCount` |
| `managed` | `pending-requests` | `requests[]` inbound (all admin groups) |
| `joined` | `groups` | `groups[]` where `myRole=MEMBER` |
| `joined` | `join-requests` | Cùng shape `my-join-requests` |

**Success `200`:** `{ tab, section, total, limit, offset, groups[] \| requests[] }`

### 8.10b `GET /groups/my-join-requests`

Tab Join Requests (joiner). Mặc định `PENDING` + `REJECTED`.

**Query:** `limit`, `offset`, `status?` (`PENDING` \| `REJECTED`).

**Success `200`:** `{ total, pendingCount, limit, offset, requests[] }` — mỗi item có nested `group` (name, title, sport, admin avatar…).

### 8.11 Favorite

`POST /groups/:id/favorite` · `DELETE /groups/:id/favorite`. List/detail có `isFavorited`.

### 8.12 `PATCH /groups/:id`

Admin chỉnh sửa mọi field (partial). `requireRole('PLAYER')`.

**Body (≥1 field):** cùng shape với create (trừ `sport` optional); `courts` replace toàn bộ — xóa slots cũ; nếu không gửi `recurringSlots` thì schedule trống. Gửi `recurringSlots` bắt buộc kèm `courts`.

**joinMode → `AUTO`:** nếu còn request `PENDING` → auto-accept tất cả (thêm member, `memberCount++`).

**Success `200`:** `{ message: "Group updated", group }`

**Errors:** `400` validation · `403` not admin · `404`

### 8.13 `GET /groups/:id/members`

Members tab. Paginated + optional `search` (full name fuzzy).

**Query:** `search?`, `limit` (default 20, max 50), `offset`

**Success `200`:** `{ groupId, total, limit, offset, members[] }` — mỗi member: `userId`, `fullName`, `avatarUrl`, `role`, `isAdmin`, `skill`, `joinedAt`

### 8.14 `GET /groups/:id/schedule`

Schedule tab matrix. **Query bắt buộc:** `date=YYYY-MM-DD`

**Success `200`:** `{ groupId, date, dayOfWeek, courts[] }` — mỗi court có `slots[]` 30 phút (00:00–23:30), `status`: `BOOKED` \| `AVAILABLE`

### 8.15 Gallery

| Method | Path | Notes |
| :--- | :--- | :--- |
| `GET` | `/groups/:id/gallery` | `limit`, `offset` — paginated |
| `POST` | `/groups/:id/gallery` | Admin; body `{ imageUrl }` — max **50**/group |
| `DELETE` | `/groups/:id/gallery/:imageId` | Admin |

**POST Success `201`:** `{ message, image }` · **GET `200`:** `{ groupId, total, limit, offset, images[] }`

**Errors:** `400` gallery full · `403` not admin · `404`

**Example schedule fragment (`GET /groups/:id/schedule?date=2026-08-23`):**

```json
{
  "groupId": 1,
  "date": "2026-08-23",
  "dayOfWeek": 7,
  "courts": [
    {
      "courtId": 1,
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

### 8.16 Group notifications (inbox)

Không có endpoint riêng — BE ghi vào `GET /notifications` khi các action group thành công (sau commit). Email **không** gửi (`sendEmail: false`).

| Event | Recipient | `type` | `data` (fragment) |
| :--- | :--- | :--- | :--- |
| Join `APPROVAL` | Admin | `GROUP_JOIN_REQUEST` | `{ groupId, groupName, requestId, userId }` |
| Join `AUTO` | Joiner | `GROUP_APPROVED` | `{ groupId, groupName, sport }` |
| Accept request | Joiner | `GROUP_APPROVED` | `{ groupId, groupName, sport }` |
| Reject request | Joiner | `GROUP_REJECTED` | `{ groupId, groupName, sport }` |
| Kick member | Kicked user | `GROUP_KICKED` | `{ groupId, groupName, sport }` |
| Transfer admin | New admin | `GROUP_ADMIN_TRANSFERRED` | `{ groupId, groupName, previousAdminUserId }` |
| `PATCH joinMode`→`AUTO` flush pending | Each flushed joiner | `GROUP_APPROVED` | `{ groupId, groupName, sport }` |

Migration: `011_notification_group_types.sql`. Chi tiết: [`GROUP_PLAN.md`](./GROUP_PLAN.md) §2.

---

