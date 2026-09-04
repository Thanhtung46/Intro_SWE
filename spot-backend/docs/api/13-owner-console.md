# API Reference — Owner Console Endpoints (Venue Owner)

Part of the SPOT backend API reference — see [../API.md](../API.md) for the full index.

## 13. Owner Console endpoints (Venue Owner)

Prefix `/owner` + `/api/owner`. Cần `Authorization: Bearer` với `role = OWNER` và `status = ACTIVE` (admin phải duyệt trước). Figma: Dashboard `224:6044`, Revenue `224:2414`, Facility `224:2648`/`224:2893`, Reviews `224:4521`.

### Dashboard KPI (`224:6044` / TC_OWNER_01)

| Method | Path | Query |
| :--- | :--- | :--- |
| `GET` | `/owner/dashboard/summary` | `month?` (YYYY-MM), `venueId?`, `trendsWeeks?` (default 4), `recentLimit?` (default 10) |

Trả về 4 KPI cards (`monthlyRevenue`, `occupancyRate`, `pendingBookings`, `newReviews`), `bookingTrends` (Mon–Sun), `recentActivities`, `facilityCards`.

### Schedule (`/owner/schedule`) — spec `006-owner-booking-web`

| Method | Path | Notes |
| :--- | :--- | :--- |
| `GET` | `/owner/schedule?venueId=&date=&sport?` | Timeline grid: every field on the venue as a row, 30-min slots with `state` = `AVAILABLE`\|`BOOKED`\|`UNPAID`\|`MAINTENANCE`. `UNPAID` = booking `status = PENDING_PAYMENT` (no separate approve/reject workflow — see `specs/006-owner-booking-web/research.md` R3). `404` if `venueId` isn't owned by the caller. |
| `POST` | `/owner/schedule/bookings` | Owner-created walk-in/phone booking: `{ fieldId, bookingDate, startTime, endTime, customerName, customerPhone?, totalAmount, markPaid? }`. `409` on slot overlap (`EXCLUDE USING gist`); `422` if the field is `MAINTENANCE`/`INACTIVE`. `markPaid: true` creates as `PAID`, else `PENDING_PAYMENT`. |
| `POST` | `/owner/schedule/bookings/:bookingId/cancel` | Frees the slot (`status → CANCELLED`); used to resolve `UNPAID` bookings instead of a separate approve/reject step. |

Migration `010`: `guest_name`, `guest_phone` nullable columns on `schema_booking.bookings` for owner-created bookings without a registered player account. Smoke: `npm run smoke:owner-schedule`.

### Facility (`/owner/facilities`)

| Method | Path | Notes |
| :--- | :--- | :--- |
| `GET` | `/owner/facilities/venues` | List venue của owner (+ field counts) |
| `POST` | `/owner/facilities/venues` | Tạo venue |
| `GET` | `/owner/facilities/venues/:venueId` | Chi tiết + fields + images; field có `isAvailableNow` |
| `PATCH` | `/owner/facilities/venues/:venueId` | Sửa venue profile |
| `POST` | `/owner/facilities/venues/:venueId/fields` | Thêm field (`peakPricePerHour`, `offPeakPricePerHour`, `status`, `footballVariant`) |
| `PATCH` | `/owner/facilities/venues/:venueId/fields/:fieldId` | Sửa field / maintenance |
| `DELETE` | `/owner/facilities/venues/:venueId/fields/:fieldId` | Soft → `INACTIVE` (player-side `GET /venues/:venueId` loại field này ngay) |
| `PUT` | `/owner/facilities/venues/:venueId/images` | `{ images: [{ imageUrl, displayOrder }] }` replace gallery venue |
| `PUT` | `/owner/facilities/venues/:venueId/fields/:fieldId/images` | Replace gallery riêng của 1 field |
| `POST` | `/owner/facilities/images/upload` | Multipart, field `images` (đa file) → upload Supabase Storage, trả `{ urls: string[] }`; FE gắn `urls` vào 2 endpoint `PUT .../images` ở trên |

`footballVariant` (`FIVE_A_SIDE` \| `SEVEN_A_SIDE`) **bắt buộc** khi `sportType = Football`, **cấm** khi `sportType = Badminton` (`400` nếu sai). Migration `009`: `peak_price_per_hour`, `off_peak_price_per_hour`, `maintenance_note`; migration `028`: `football_variant` + CHECK constraint trên `fields`.

### Revenue (`/owner/revenue`)

| Method | Path | Query |
| :--- | :--- | :--- |
| `GET` | `/owner/revenue/summary` | `from`, `to` (YYYY-MM-DD), `sport?`, `venueId?` |
| `GET` | `/owner/revenue/timeseries` | + `granularity=week\|month` |
| `GET` | `/owner/revenue/export` | + `format=csv` → file CSV |

Aggregate từ booking `PAID`/`CHECKED_IN`/`COMPLETED` thuộc venue owner. Redis cache TTL 5 phút (`owner:revenue:*`).

### Customer Reviews (`/owner/reviews`)

| Method | Path | Notes |
| :--- | :--- | :--- |
| `GET` | `/owner/reviews` | `venueId?`, `rating?`, `hasReply?`, `from?`, `to?`, `limit`, `offset` |
| `GET` | `/owner/reviews/:reviewId` | Chi tiết + booking/field ref |
| `POST` | `/owner/reviews/:reviewId/reply` | `{ replyText }` — reuse logic `/reviews/:id/reply` |

Smoke: `npm run smoke:owner-ops` (cần migration 009 + seed admin).

---

