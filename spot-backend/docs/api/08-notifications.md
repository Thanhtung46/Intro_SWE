# API Reference — Notifications

Part of the SPOT backend API reference — see [../API.md](../API.md) for the full index.

## 11. Notifications endpoints

Inbox in-app + badge unread + mark read (SPOT-153/154). Schema: `schema_notification`.  
Alias `/api/notifications/*`. Tất cả route cần Bearer access.

| Method | Path | Behavior |
| :--- | :--- | :--- |
| `GET` | `/notifications` | Inbox: `?limit=20&beforeId=&unreadOnly=` → `{ items, nextCursor }` |
| `GET` | `/notifications/unread-count` | `{ count }` cho bell badge |
| `PATCH` | `/notifications/:id/read` | Đánh dấu một thông báo đã đọc |
| `POST` | `/notifications/read-all` | Đánh dấu tất cả đã đọc → `{ updated }` |
| `POST` | `/notifications/dev/seed` | Dev only — tạo inbox (+ optional `dueReminderNow` / schedule) |
| `POST` | `/notifications/dev/process-due` | Dev only — chạy một tick reminder worker |

Types: `BOOKING_CREATED` \| `BOOKING_REMINDER` \| `MATCH_CANCELLED` \| `MATCH_EXPIRED_UNDERFILLED` \| `GROUP_JOIN_REQUEST` \| `GROUP_APPROVED` \| `GROUP_REJECTED` \| `GROUP_KICKED` \| `GROUP_ADMIN_TRANSFERRED` \| `SYSTEM`.  
Match cancel/expiry: `MATCH_CANCELLED` với `data.reason` = `HOST_CANCEL` \| `EXPIRED_UNDERFILLED` (host cancel không notify chính host).  
Group join/manage: xem [§8.16 Group notifications](#816-group-notifications-inbox).
Reminder T-24h / T-2h: service `scheduleBookingReminders` + Redis ZSET `notif:reminders` + DB `reminder_jobs`. Worker: `npm run worker:reminders`. Match expiry: `npm run worker:match-expiry`.  
### 8.1 Player inbox — nhắc đánh giá (FE)

Mọi thông báo nhắc player **đánh giá trọng tài** đều ghi vào **`GET /notifications`** (chuông inbox). FE **không** cần polling riêng — đọc inbox + badge `GET /notifications/unread-count`.

| `type` | Ai nhận | Khi nào | `data` (deep link) | Màn hình / API sau tap |
| :--- | :--- | :--- | :--- | :--- |
| `REFEREE_RATING_REQUEST` | **Player** (người đặt sân) | Sau `endsAt`, booking `hireReferee=true`, trọng tài đã accept | `action`, `bookingId`, `refereeId`, `assignmentId`, `venueName`, `refereeName` | Màn half-star rating → `POST /reviews/referee` `{ bookingId, rating }` |

**Ví dụ item inbox (`GET /notifications`):**

```json
{
  "notificationId": 88,
  "type": "REFEREE_RATING_REQUEST",
  "title": "Rate your referee",
  "body": "How was Nguyen Van A at Saigon FC Arena? Tap to leave a star rating (0.5–5.0).",
  "data": {
    "action": "REFEREE_RATING_REQUEST",
    "assignmentId": 7,
    "bookingId": 42,
    "refereeId": 15,
    "venueName": "Saigon FC Arena",
    "refereeName": "Nguyen Van A"
  },
  "isRead": false,
  "createdAt": "2026-08-22T20:00:00.000Z"
}
```

**FE routing (gợi ý):**

```typescript
if (item.type === 'REFEREE_RATING_REQUEST' && item.data?.bookingId) {
  router.push({
    pathname: '/bookings/rate-referee',
    params: {
      bookingId: String(item.data.bookingId),
      refereeId: String(item.data.refereeId),
    },
  });
}
```

Sau khi `POST /reviews/referee` thành công → `PATCH /notifications/:id/read`.

**Lưu ý:** Đánh giá **sân** (`POST /reviews`) hiện **chưa** có inbox prompt — player vào từ lịch/booking detail. Chỉ **trọng tài** có `REFEREE_RATING_REQUEST`.

```bash
curl -s http://localhost:3000/notifications/unread-count \
  -H "Authorization: Bearer <accessToken>"
```

---

Opt-out (`pushNotificationsEnabled: false`): vẫn ghi inbox; **không** gửi email cho `BOOKING_REMINDER`.

```bash
curl -s http://localhost:3000/notifications/unread-count \
  -H "Authorization: Bearer <accessToken>"
```

---

