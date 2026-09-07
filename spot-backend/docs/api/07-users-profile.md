# API Reference — Users / Profile

Part of the SPOT backend API reference — see [../API.md](../API.md) for the full index.

### 6.10 `GET /users/:id`

Profile **public** (Check Profile / host card). Bearer bắt buộc. **Không** trả `email`, `phoneNumber`, `role`, `status`, `gender`. SĐT host chỉ trên `GET /matches/:id` khi caller là host hoặc `yourRequest.status === ACCEPTED`.

`matchCount` = số kèo đã host trừ `CANCELLED`. `joinedMatches` = số join request `ACCEPTED` (pickup kèo). `rating` / `reviewCount` = aggregate từ `schema_review.match_host_reviews` — `null` / `0` nếu chưa có review.

**Success `200`**

```json
{
  "user": {
    "userId": 12,
    "fullName": "Nguyen Van A",
    "avatarUrl": null,
    "createdAt": "...",
    "skills": { "badminton": null, "football": "PROFESSIONAL" },
    "matchCount": 10,
    "joinedMatches": 4,
    "rating": 4.9,
    "reviewCount": 12
  }
}
```

`matchCount` = kèo hosted trừ `CANCELLED`. `joinedMatches` = join request `ACCEPTED`.  
`rating` / `reviewCount` = aggregate từ pickup kèo reviews (`schema_review.match_host_reviews`). `null` / `0` nếu chưa có review.

Hosted Matches trên Figma = `GET /matches?hostUserId=:id`. Reviews section = `GET /reviews/hosts/:userId/reviews`.

**Errors:** `400` Invalid user id · `401` · `404` User not found

---


---

## 10. Users / Profile endpoints

Profile Hub: identity trên `schema_auth.users`, display/prefs trên
`schema_auth.user_profiles` (JOIN). JSON `user` giữ nguyên cho FE.  
Mọi route dưới đây cũng có alias `/api/users/*`. Cần `Authorization: Bearer <accessToken>`.

| Method | Path | Body | Success |
| :--- | :--- | :--- | :--- |
| `GET` | `/users/me` | — | `200` `{ user }` (cùng shape với `GET /auth/me`) |
| `GET` | `/users/me/profile` | — | `200` `{ user, stats }` Main Profile stats |
| `PATCH` | `/users/me` | partial profile/prefs (≥1 field) | `200` `{ message, user }` |
| `GET` | `/users/me/preferences` | — | `200` `{ preferences }` Settings prefs |
| `PATCH` | `/users/me/preferences` | language / appearance / push / location | `200` `{ message, preferences }` |
| `POST` | `/users/me/password` | `{ currentPassword, newPassword, confirmPassword }` | `200` `{ message }` |
| `POST` | `/users/me/avatar` | multipart `avatar` (jpeg/png/webp/gif ≤2MB) | `200` `{ message, user }` |
| `POST` | `/users/me/email/request` | `{ newEmail }` | `200` OTP gửi tới **email mới** (`purpose=CHANGE_EMAIL`) |
| `POST` | `/users/me/email/confirm` | `{ newEmail, otp }` | `200` `{ message, user }` — cập nhật email + `email_verified_at` |
| `POST` | `/users/me/phone/request` | `{ newPhone }` | `200` OTP gửi tới **email hiện tại** (`purpose=CHANGE_PHONE`) |
| `POST` | `/users/me/phone/confirm` | `{ newPhone, otp }` | `200` `{ message, user }` |
| `GET` | `/users/me/schedule` | query `type`/`from`/`to`/`limit` | `200` `{ items, timezone }` |
| `POST` | `/users/me/schedule/dev/seed` | optional `{ includeMatch, daysFromNow }` | `201` venue/field/booking/match — **dev only** |

**PATCH** cho phép `fullName`, `gender`, `avatarUrl`, `language`, `appearance`, `pushNotificationsEnabled`, `locationServicesEnabled`. Gửi `email` / `phone` → `400` (strict Zod). Đổi email/phone bắt buộc qua request → confirm OTP (FR-1.4).

### 10.1 `GET /users/me`

Giống `GET /auth/me`. `user` gồm prefs defaults: `language: "en"`, `appearance: "light"`, toggles `true`, `avatarUrl: null`.

### 10.1b `GET /users/me/profile` (Main Profile)

Header Main Profile: cùng `user` như `/users/me` + `stats` aggregate từ bookings/matches (không denormalize, không Redis trong MVP).

**Success `200`**

```json
{
  "user": { "...": "same as GET /users/me" },
  "stats": {
    "hostedMatches": 0,
    "joinedMatches": 0,
    "completedBookings": 0,
    "reviewsCount": 0,
    "avgRating": null,
    "joinedAt": "2026-07-18T10:00:00.000Z"
  }
}
```

| Field | Nguồn |
| :--- | :--- |
| `hostedMatches` | `COUNT` `schema_social.matches` where `host_id = me` |
| `joinedMatches` | join requests `ACCEPTED` trên pickup kèo (không tính host) |
| `completedBookings` | bookings `status = COMPLETED` |
| `reviewsCount` / `avgRating` | pickup kèo `match_host_reviews` where user is host (+ venue reviews later) |
| `joinedAt` | `users.created_at` |

### 10.2 `PATCH /users/me`   

**Body** (ít nhất một field)

| Field | Type | Notes |
| :--- | :--- | :--- |
| `fullName` | string (1–100) | |
| `gender` | `male` \| `female`  |
| `avatarUrl` | string URL http(s) \| `null` | `null` xóa avatar; hoặc `POST /users/me/avatar` |
| `language` | `en` \| `vi` | |
| `appearance` | `light` \| `dark` \| `system` | |
| `pushNotificationsEnabled` | boolean | |
| `locationServicesEnabled` | boolean | |

**Success `200`**

```json
{
  "message": "Profile updated successfully",
  "user": { "...": "..." }
}
```

**Errors:** `400` validation / unrecognized keys, `401`, `404`.

```bash
curl -s -X PATCH http://localhost:3000/users/me \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Nguyen Van B","gender":"female","language":"vi","appearance":"dark"}'
```

### 10.2b `POST /users/me/password` (Change Password)

**Body:** `currentPassword`, `newPassword`, `confirmPassword` (rule giống register).

**Success `200`:** `{ "message": "Password updated successfully" }`

### 10.2c `POST /users/me/avatar`

Multipart field **`avatar`** (jpeg/png/webp/gif, ≤2MB). Lưu `uploads/avatars/`, URL qua `/uploads/avatars/*`. Set `PUBLIC_BASE_URL` cho device LAN.

```bash
curl -s -X POST http://localhost:3000/users/me/avatar \
  -H "Authorization: Bearer <accessToken>" \
  -F "avatar=@./photo.jpg"
```

### 10.2d `GET/PATCH /users/me/preferences` (Settings)

Preference + Layout (Figma Settings). Data trên `user_profiles`; view `schema_auth.user_prefs`. Sync đa thiết bị = cùng row DB.

**GET `200`:** `{ "preferences": { language, appearance, pushNotificationsEnabled, locationServicesEnabled } }`

**PATCH** (≥1 field): `language` (`en`|`vi`), `appearance` (`light`|`dark`|`system`), toggles. Strict — không nhận `fullName`/email.

**PATCH `200`:** `{ "message": "Preferences updated successfully", "preferences": { ... } }`

### 10.3 Đổi email (OTP)

1. `POST /users/me/email/request` `{ "newEmail": "new@example.com" }`
2. `POST /users/me/email/confirm` `{ "newEmail": "new@example.com", "otp": "123456" }`

OTP gửi tới **email mới**. OTP row dùng `purpose = CHANGE_EMAIL:{sha256(newEmail)[:32]}` để gắn đúng địa chỉ. Trùng email khác user → `409`. Email giống hiện tại → `400`. OTP sai / hết hạn giống auth (`400` / `429`).

### 10.4 Đổi phone (OTP)

1. `POST /users/me/phone/request` `{ "newPhone": "0901234567" }`
2. `POST /users/me/phone/confirm` `{ "newPhone": "0901234567", "otp": "123456" }`

OTP gửi tới **email hiện tại** (chưa có SMS). Purpose: `CHANGE_PHONE:{newPhone}`. Phone VN 10 số (cùng rule register).

### 10.5 `GET /users/me/schedule` (View Schedule)

Lịch cá nhân: booking của player + social match (host hoặc participant `APPROVED`).  
Join `schema_booking` + `schema_social` + `schema_venue`. Timezone lịch: **`Asia/Bangkok`**.

**Query**

| Param | Default | Notes |
| :--- | :--- | :--- |
| `type` | `all` | `all` \| `booking` \| `match` |
| `from` | hôm nay (Bangkok) | `YYYY-MM-DD` |
| `to` | `from` + 30 ngày | `YYYY-MM-DD`; phải ≥ `from` |
| `limit` | `50` | 1–100 |

Ngày `from`/`to` là ngày lịch Bangkok; server map sang nửa khoảng UTC `[from 00:00+07, to+1 00:00+07)` rồi so với `booking_time_range` (`tstzrange`).

**Success `200`**

```json
{
  "items": [
    {
      "type": "BOOKING",
      "bookingId": 1,
      "matchId": null,
      "startsAt": "2026-08-20T11:00:00.000Z",
      "endsAt": "2026-08-20T12:00:00.000Z",
      "bookingDate": "2026-08-20",
      "status": "PAID",
      "displayStatus": "UPCOMING",
      "venueName": "Smoke Venue",
      "fieldName": "Pitch A",
      "address": "123 Nguyen Trai, Dist 1, HCMC",
      "sportType": "Football",
      "hostName": null
    },
    {
      "type": "MATCH",
      "bookingId": 1,
      "matchId": 9,
      "role": "HOST",
      "startsAt": "2026-08-20T11:00:00.000Z",
      "endsAt": "2026-08-20T12:00:00.000Z",
      "bookingDate": "2026-08-20",
      "status": "PAID",
      "displayStatus": "UPCOMING",
      "venueName": "Smoke Venue",
      "fieldName": "Pitch A",
      "address": "123 Nguyen Trai, Dist 1, HCMC",
      "sportType": "Football",
      "hostName": "Nguyen Van A"
    }
  ],
  "timezone": "Asia/Bangkok"
}
```

`bookingId` / `matchId` đủ để FE navigate detail / cancellation policy. Bỏ `CANCELLED`.

`displayStatus` (`UPCOMING` \| `IN_PROGRESS` \| `COMPLETED` \| `CANCELLED`) là bucket tính theo thời gian thực trên server (`schedule.entity.js::computeDisplayStatus`) — FE **không** tự suy ra từ `startsAt`/`endsAt`, chỉ hiển thị field này. `NO_SHOW` map vào `CANCELLED`; `CANCELLED` thật đã bị loại khỏi query nên không bao giờ xuất hiện ở đây. Booking tự chuyển `PAID`/`CHECKED_IN` → `COMPLETED` nhờ `npm run worker:booking-completion` (poll ~60s, giống `worker:match-expiry`) — trước đây không có cơ chế này nên `status` không bao giờ tự đạt `COMPLETED`, khiến review (`POST /reviews`, yêu cầu `status = COMPLETED`) không thể thực hiện qua flow thật.

`hostName` chỉ khác `null` khi `type: "MATCH"` (join `schema_auth.user_profiles` theo `host_user_id`); luôn `null` cho `BOOKING`.

```bash
curl -s "http://localhost:3000/users/me/schedule?type=all" \
  -H "Authorization: Bearer <accessToken>"
```

### 10.6 `POST /users/me/schedule/dev/seed` (dev only)

Tạo venue + field + booking (+ match nếu `includeMatch`, default `true`) gắn user hiện tại. Không có trong production.

```bash
curl -s -X POST http://localhost:3000/users/me/schedule/dev/seed \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"includeMatch":true,"daysFromNow":3}'
```

---

