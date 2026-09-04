# API Reference — Reviews

Part of the SPOT backend API reference — see [../API.md](../API.md) for the full index.

## 12. Reviews endpoints

Đánh giá sân sau booking (SPOT-165/166). Schema: `schema_review` + cột `avg_rating` / `rating_count` trên `schema_venue.venues`.  
Alias `/api/reviews/*`. Cần Bearer access.

| Method | Path | Behavior |
| :--- | :--- | :--- |
| `GET` | `/reviews/hosts/:userId/reviews` | Pickup kèo — reviews host nhận từ participants (`limit`, `offset`) |
| `POST` | `/reviews` | Player tạo review **venue** cho booking `COMPLETED` |
| `POST` | `/reviews/referee` | Player review **trọng tài** sau trận có `hireReferee` |
| `POST` | `/reviews/:id/reply` | Venue owner trả lời (1 reply / review) |
| `GET` | `/reviews/venues/:venueId` | List review venue riêng lẻ, phân trang (`limit` ≤50, `offset`) |
| `GET` | `/reviews/venues/:venueId/rating` | Aggregate rating (DB + Redis cache `venue:rating:{id}`) |
| `POST` | `/reviews/dev/seed-booking` | Dev only — tạo booking `COMPLETED` để test review |

**Pickup kèo host review** (Manage Matches Completed / Check Profile)

- `POST /matches/:id/review` — participant `ACCEPTED`, kèo reviewable, 1 review / user / kèo
- `GET /reviews/hosts/:userId/reviews` — list + `hostRating` aggregate
- `host.rating` trên match cards + `GET /users/:id` lấy từ `match_host_reviews`

**Booking venue review rules**

- 1 review / `booking_id` (`UNIQUE`)
- Chỉ `status = COMPLETED`
- Spam filter cơ bản (Zod): rating 1–5, text ≤ 2000, reject text “spammy”
- Rate limit: tối đa 10 review / player / 24h → `429`
- Reply: chỉ `venues.owner_id ===` user hiện tại; 1 reply / review
- Sau create: cập nhật `venues.avg_rating` / `rating_count`, invalidate Redis cache

### 11.1 `POST /reviews`

**Body**

```json
{
  "bookingId": 1,
  "rating": 5,
  "reviewText": "Clean field and friendly staff"
}
```

**Success `201`**

```json
{
  "review": {
    "reviewId": 1,
    "bookingId": 1,
    "venueId": 1,
    "playerId": 1,
    "rating": 5,
    "reviewText": "Clean field and friendly staff",
    "createdAt": "...",
    "reply": null
  },
  "venueRating": {
    "venueId": 1,
    "avgRating": 5,
    "ratingCount": 1
  }
}
```

**Errors:** `400` (chưa COMPLETED / validation), `401`, `404` booking, `409` đã review, `429` spam rate.

### 11.2 `POST /reviews/:id/reply`

```json
{ "replyText": "Thanks for your feedback!" }
```

**Success `201`** → `{ review, reply }`.  
**Errors:** `403` không phải owner, `404`, `409` đã reply.

### 11.2b `GET /reviews/venues/:venueId`

Individual venue reviews (venue detail's Reviews tab), paginated — separate from the aggregate-only `.../rating` below. Requires Bearer.

**Query params:** `limit` (default 20, max 50), `offset` (default 0)

**Success `200`**

```json
{
  "reviews": [
    {
      "reviewId": 1,
      "bookingId": 1,
      "venueId": 12,
      "playerId": 8,
      "playerName": "Nguyen Van A",
      "playerAvatarUrl": null,
      "rating": 5,
      "reviewText": "Clean field and friendly staff",
      "createdAt": "2026-08-20T12:00:00.000Z",
      "reply": { "replyId": 1, "replyText": "Thanks!", "createdAt": "2026-08-20T13:00:00.000Z" }
    }
  ],
  "total": 1
}
```

`reply` is `null` when the owner hasn't replied. `total` is the full count (ignores `limit`/`offset`), for pagination UI.

**curl**

```bash
curl -s "http://localhost:3000/reviews/venues/12?limit=20&offset=0" \
  -H "Authorization: Bearer <accessToken>"
```

### 11.3 `GET /reviews/venues/:venueId/rating`

```json
{ "venueId": 1, "avgRating": 5, "ratingCount": 1, "source": "db" }
```

`source` là `cache` hoặc `db`.

### 9.2 `POST /reviews/referee` (player → trọng tài)

**Body** — **chỉ rating** (không có text review):

```json
{
  "bookingId": 42,
  "rating": 4.5
}
```

| Field | Type | Rules |
| :--- | :--- | :--- |
| `bookingId` | int | Booking player đã thuê trọng tài |
| `rating` | number | **0.5 → 5.0**, bước **0.5** (0.5, 1.0, 1.5, … 5.0) |

**Rules**

- Chỉ **player** đặt booking (`bookings.player_id`)
- Booking có `hireReferee=true` và assignment đã **ACCEPTED/COMPLETED**
- Trận **đã kết thúc** (`endsAt <= now`) — player chỉ đánh giá sau khi trải nghiệm xong
- 1 rating / assignment (`409` nếu đã đánh giá)

**Success `201`**

```json
{
  "review": {
    "reviewId": 3,
    "assignmentId": 7,
    "bookingId": 42,
    "refereeId": 15,
    "playerId": 5,
    "rating": 4.5,
    "createdAt": "2026-08-22T12:00:00.000Z"
  },
  "refereeRating": {
    "refereeId": 15,
    "avgRating": 4.75,
    "ratingCount": 12,
    "totalMatchesOfficiated": 20
  }
}
```

### 9.3 `GET /reviews/referees/:refereeId/rating`

**Success `200`:** `{ "refereeRating": { "refereeId", "avgRating", "ratingCount", "totalMatchesOfficiated" } }`

**Errors:** `404` referee profile không tồn tại

```bash
curl -s -X POST http://localhost:3000/reviews \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"bookingId":1,"rating":5,"reviewText":"Great pitch"}'
```

---

