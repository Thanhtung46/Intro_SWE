# API Reference — Matchmaking (kèo)

Part of the SPOT backend API reference — see [../API.md](../API.md) for the full index.

## 7. Matchmaking endpoints

Base: `/matches` hoặc `/api/matches`. Mọi route cần Bearer.  
`POST /matches`, `POST /matches/:id/join`, `DELETE /matches/:id/join` thêm `requireRole('PLAYER')`.  
Route tĩnh (`/mine`, `/my-join-requests`, `/venue-suggestions`, `/bulk`, `/dev/process-expired`) **trước** `GET /:id`.

Host = 1 slot lúc tạo. Payment là stub `SUCCESS`.

### 7.1 `POST /matches`

Tạo kèo tự do (không cần `booking_id`).

**Body**

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `sport` | string | ✓ | `BADMINTON` \| `FOOTBALL` |
| `format` | string | ✓ | Đúng ladder của sport |
| `title` | string | ✓ | ≤ 150 |
| `notes` | string | | ≤ 2000 |
| `venueName` | string | ✓ | |
| `venueAddress` | string | ✓ | Số nhà / đường (≤ 500). Không thay dropdown tỉnh/quận |
| `province` | string | ✓ | Mã tỉnh/TP pre-2025. HCM = `79`. List: `GET /geo/vn` |
| `city` | string | ✓ | Mã quận/huyện **thuộc** `province`. Quận 7 = `778` |
| `latitude` / `longitude` | number | | Optional, phải gửi cặp. Pin map; không dùng occupancy |
| `startsAt` / `endsAt` | datetime | ✓ | ISO, tương lai; duration **≥ 1 giờ** |
| `isMultiDay` | boolean | | Luôn coi `false` trên product hiện tại |
| `isRecurring` | boolean | | Default `false` |
| `maxPlayers` | int | ✓ | 2–40 |
| `allLevels` | boolean | | `true` → full ladder |
| `skillMin` / `skillMax` | string | nếu không `allLevels` | Cùng sport; min rank ≤ max |
| `feeType` | string | ✓ | `GENDER_RANGE` \| `SPLIT_EVENLY` |
| `priceMin` / `priceMax` | int | theo fee | `GENDER_RANGE`: nữ min, nam max. `SPLIT_EVENLY`: chỉ `priceMin` = tổng, không `priceMax` |
| `joinMode` | string | ✓ | `AUTO` \| `APPROVAL` |
| `courts` | `{ name }[]` | ✓ | Tên bắt buộc, không trùng |
| `coverUrl` | string | | http(s) ≤ 2048. Không upload S3 |

**Success `201`:** `{ "message": "Match created", "match": { matchId, host, hostPhoneNumber, spotsLeft, yourShare, courts, … } }`

`filledCount` bắt đầu = 1. Occupancy trùng → `409`.

```bash
curl -s -X POST http://localhost:3000/matches \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d "{\"sport\":\"FOOTBALL\",\"format\":\"SEVEN_A_SIDE\",\"title\":\"Saturday 7v7\",\"venueName\":\"San ABC\",\"venueAddress\":\"123 Nguyen Van Linh, Q7, TP.HCM\",\"province\":\"79\",\"city\":\"778\",\"startsAt\":\"2026-09-01T09:00:00+07:00\",\"endsAt\":\"2026-09-01T11:00:00+07:00\",\"maxPlayers\":14,\"skillMin\":\"REC_BASIC\",\"skillMax\":\"SEMI_PRO\",\"feeType\":\"SPLIT_EVENLY\",\"priceMin\":1400000,\"joinMode\":\"APPROVAL\",\"courts\":[{\"name\":\"1\"}]}"
```

### 7.1b `POST /matches/bulk`

Nhiều kèo cùng template (FE expand ngày/tuần → `schedules[]`). PLAYER. `isMultiDay` luôn false. `isRecurring: true` khi `schedules.length > 1`.

**Body:** `template` (giống 7.1 trừ `startsAt`/`endsAt`/`isMultiDay`) + `schedules: [{ startsAt, endsAt }]` (1–100).

**Success `201`:** `{ totalRequested, totalCreated, created[], failed[] }`. Một số slot 409 vẫn tạo slot khác. Không tạo được cái nào → `409`.

### 7.1c `GET /matches/venue-suggestions`

Gợi ý **địa điểm** cho form Host — **không** dùng cho Homepage browse.

**Query:** `location` (required), `sport?`, `limit?` (default 10, max 10).

Pool: kèo `status <> CANCELLED`. Distinct venue. Không có trong DB → `suggestions: []` → FE mở Geoapify.

**Success `200`:** `{ "suggestions": [ { venueName, venueAddress, province, provinceName, city, cityName, latitude, longitude } ] }`

### `GET /geo/vn`

Dropdown 2 cấp pre-2025 (63 tỉnh + 705 quận/huyện). JSON tĩnh, Bearer. Alias `/api/geo/vn`.

**Success `200`:** `{ "map": "pre-2025", "provinces": [ { "code": "79", "name": "Thành phố Hồ Chí Minh", "cities": [ { "code": "778", "name": "Quận 7" } ] } ] }`

### 7.2 `GET /matches`

Browse: `OPEN`, còn slot, `startsAt > now`. `FULL` **ẩn** trên homepage; vẫn thấy qua `?hostUserId=` (OPEN/FULL còn hạn đến `endsAt`).

**Ẩn khỏi browse mặc định** (không khi `hostUserId=`): kèo caller đang host; join `PENDING`/`ACCEPTED`/`KICKED`. **`REJECTED` hiện lại**.

**Query:** `sport`, `date` (`YYYY-MM-DD`), `timeFrom`/`timeTo` (`HH:mm`), `skill` (cần `sport`; OR ranks), `priceMin`/`priceMax` (VND), `location` (title/venue/address, unaccent + fuzzy; trả `suggestions[]` max 5), `province`/`city` (exact; `city` cần `province`), `favorited=true`, `hostUserId`, `latitude`+`longitude`+`radiusKm` (1–20, XOR với `location`), `limit` (default 20, max 50), `offset`.

**Success `200`:** `{ total, limit, offset, matches[], suggestions[] }`. List **không** có `hostPhoneNumber`.

### 7.3 `GET /matches/:id`

Chi tiết (kể cả đã qua giờ / cancelled).

**Success `200`:** `{ match, canJoin, yourRequest, participants[], summary }`

`summary` (View Summary / post-match review): `{ reviewable, canReview, yourReview, hostRating: { avgRating, reviewCount } }`.  
`reviewable` = kèo đã hết giờ + đủ người + không cancel. `canReview` = participant `ACCEPTED` chưa review.  
Đánh giá host: `POST /matches/:id/review` (xem 7.4c). `host.rating` / `host.reviewCount` trên card lấy từ aggregate review pickup kèo.

`hostPhoneNumber` **chỉ** khi caller là host hoặc `yourRequest.status === ACCEPTED`. `yourRequest` = `PENDING`/`ACCEPTED`/`KICKED` (hoặc `null` nếu chưa join / `REJECTED`); gồm `avatarUrl`, `skill` (sport của kèo).  
`canJoin` = không phải host, `OPEN`, còn slot, chưa request active, **`startsAt > now`**, không bị kick.

`participants[]`: HOST + joiners `ACCEPTED`. HOST và player gồm `skill` (sport kèo). Player thêm `shareAmount`, `paymentStatus`, `avatarUrl`, `phoneNumber` (host hoặc chính mình).

**Errors:** `400` Invalid match id / Match has ended · `401` · `404`

### 7.4 `POST /matches/:id/join`

PLAYER. Body có thể `{}`.

| Field | Notes |
| :--- | :--- |
| `message` | ≤ 500 |
| `phoneNumber` | SĐT người xin; bỏ trống → SĐT account |
| `guests` | max 10; mỗi guest: `name`, `skill` (đúng sport), `gender` male/female, `phoneNumber` bắt buộc |

Skill ngoài range → vẫn join, `skillWarning: true`. Skill sai sport → `400`.  
`AUTO`: `ACCEPTED`, tăng `filledCount`. `APPROVAL`: `PENDING`, chưa tăng filled.

**Success `201`:** `{ message, skillWarning, request, match }`

**Errors:** `400` host join own / not enough spots / **Match has ended** · `403` kicked / not PLAYER · `409` đã PENDING/ACCEPTED

### 7.4b `DELETE /matches/:id/join`

Joiner hủy request **`PENDING`** (xóa row + guests). Host không được gọi.

**Success `200`:** `{ message: "Join request cancelled", matchId, requestId }`

**Errors:** `400` No pending join request / Host cannot withdraw · `404` match not found

### 7.4c `POST /matches/:id/review`

Participant đã **`ACCEPTED`** đánh giá **host** sau kèo reviewable (hết giờ + đủ người). Host không được tự review. 1 review / user / kèo.

**Body:** `{ rating: 1..5, reviewText?: string }`

**Success `201`:** `{ message, review, hostRating: { avgRating, reviewCount } }`

**Errors:** `400` not reviewable / host self-review · `403` not participant · `409` already reviewed · `429` spam limit

### 7.5 `GET /matches/:id/requests`

Host, **PENDING only**. Mỗi request: `avatarUrl`, `skill` (sport kèo), `shareAmount`, `phoneNumber` requester + guests.

**Success `200`:** `{ matchId, total, requests[] }` · `403` nếu không phải host

### 7.6 / 7.7 Accept · reject

`POST /matches/:id/requests/:requestId/accept` — chỉ `PENDING`; `heads` ≤ `spotsLeft`; tăng `filledCount`.  
`POST /matches/:id/requests/:requestId/reject` — `PENDING` → `REJECTED`; có thể join lại (cùng `requestId`).

### 7.8 `POST /matches/:id/participants/:userId/kick`

Kick joiner `ACCEPTED` (+ guests). `filledCount -= heads`. Không kick host. Bị kick **không join lại kèo đó** (`403`).

### 7.9 `GET /matches/mine`

Manage Matches — tab **Active** / **Completed**. Query `tab` (default `active`), `limit`, `offset`.

| `tab` | Host | Participant |
| :--- | :--- | :--- |
| `active` | `OPEN`/`FULL`, `endsAt > now`, chưa cancel | Join **`ACCEPTED`**, kèo chưa hết, chưa cancel |
| `completed` | **Chỉ** hết giờ + **đủ người** + không cancel | **`ACCEPTED`** + cùng điều kiện kèo |

**Không** vào Completed: host cancel, hết giờ thiếu người, kicked. Kèo đó vẫn xem qua `GET /matches/:id` (có `outcome`).  
**Không** gồm `PENDING` — xem 7.9b. Thêm `myRole`, `myRequestStatus`, `pendingRequestCount`, `outcome`/`outcomeMessage` (completed).

### 7.9b `GET /matches/my-join-requests`

Tab Join Requests (joiner). Mặc định `PENDING` + `REJECTED`. `ACCEPTED` → `/mine?tab=active`; `KICKED` → completed.

**Query:** `limit`, `offset`, `status?` (`PENDING` \| `REJECTED` — bỏ trống = cả hai).

**Success `200`:** `{ total, pendingCount, limit, offset, requests: [ ... ] }`

`pendingCount` = số request `PENDING` của caller (dùng badge tab Requests, không phụ thuộc filter `status`).  
Với badge chỉ cần số chờ duyệt: gọi `?status=PENDING&limit=1` hoặc đọc `pendingCount`.

### 7.10 `PATCH /matches/:id`

Host, trước `startsAt`. Partial. Nếu `filledCount > 1` không đổi sport/format/fee/giá. `maxPlayers >= filledCount`. Occupancy trừ chính kèo này.

### 7.11 `POST /matches/:id/cancel`

Host. PENDING → REJECTED. Status `CANCELLED` (hết chiếm sân). Notify joiners inbox `MATCH_CANCELLED` (`data.reason = HOST_CANCEL`). **Không** xuất hiện tab Completed.

### 7.11b Match expiry (background)

| Case | Worker action | Tab Completed |
| :--- | :--- | :--- |
| Hết giờ, **đủ người** | `status → COMPLETED`, nhả sân | Có |
| Hết giờ, **thiếu người** | `status → CANCELLED`, reject PENDING, notify (`data.reason = EXPIRED_UNDERFILLED`) | Không |

`GET /matches/mine` chạy expiry trước khi query. Prod: `npm run worker:match-expiry`. Dev: `POST /matches/dev/process-expired` (non-prod).

### 7.12 Favorite

`POST /matches/:id/favorite` · `DELETE /matches/:id/favorite`. List có `isFavorited`.

---

