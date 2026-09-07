# API Reference — Venues & Booking Endpoints

Part of the SPOT backend API reference — see [../API.md](../API.md) for the full index.

## 18. Venues & Booking endpoints

Browse real venues + book a field (Home dashboard, SPOT `001-home-booking-api`). Schema: `schema_venue.venues`/`fields`/`venue_images`/`field_images`, `schema_booking.bookings` (`004`, `007`, `028`). Alias `/api/venues/*`, `/api/bookings/*`. Cần Bearer access.

| Method | Path | Behavior |
| :--- | :--- | :--- |
| `GET` | `/venues` | List venues có field `ACTIVE` của `sport`; filter `location` (text, XOR với distance) hoặc `lat`/`long`/`radiusKm` (PostGIS), `province`/`city`, `priceMin`/`priceMax`, `date`+`timeFrom`+`timeTo` (availability) |
| `GET` | `/venues/:venueId` | Venue detail + field (loại `INACTIVE` — sân đã xoá); optional `?sport=` lọc `fields[]` |
| `GET` | `/venues/:venueId/images` | Gallery ảnh — union `venue_images` + `field_images`, tag `source: 'venue'\|'field'` |
| `GET` | `/venues/:venueId/fields/:fieldId/availability` | Lưới slot 1 giờ trong `date`, `available:false` nếu trùng booking |
| `POST` | `/bookings` | Player tạo booking cho 1 field/khung giờ — `PENDING_PAYMENT`; optional `hireReferee`/`refereeFeeVnd` (§19.16) |
| `POST` | `/bookings/bulk` | Tạo nhiều booking cùng lúc (nhiều khung giờ và/hoặc nhiều sân) — mỗi item độc lập, partial success OK |

**Rules**

- `GET /venues` chỉ trả venue có ≥1 field `status = ACTIVE` khớp `sport`
- `location` (text search tên + địa chỉ, unaccent + fuzzy) và `lat`+`long`+`radiusKm` (distance) là **XOR** — gửi cả hai → `400`
- `lat`/`long` phải đi cùng nhau (chỉ 1 trong 2 → `400`); venue chưa có geo `location` bị loại khỏi kết quả lọc khoảng cách
- `city` yêu cầu có `province` đi kèm → `400` nếu thiếu
- `priceMin`/`priceMax` lọc theo `fields.price_per_hour` của field `ACTIVE` khớp `sport`; `priceMax < priceMin` → `400`
- `date`+`timeFrom`+`timeTo` (thiếu 1 trong 3 khi có param khác → `400`) lọc venue có ≥1 field trống khung giờ đó (không trùng booking `status <> CANCELLED`)
- Response mỗi venue có `coverImageUrl` (ảnh đầu từ `venue_images`, fallback ảnh đầu từ `field_images` của bất kỳ sân nào — loại `/uploads/...` cũ), `priceFromPerHour` (MIN giá field `ACTIVE` khớp `sport`), `footballVariants` (mảng `football_variant` distinct của field Football `ACTIVE`, rỗng `[]` cho badminton)
- Availability tính từ `venue.opening_hours` → `closing_hours`, bước 1 giờ; `date` không được ở quá khứ
- Booking: field phải `ACTIVE`, khung giờ phải nằm trong `opening_hours`/`closing_hours`, không được ở quá khứ
- Chống trùng lịch: DB `EXCLUDE USING gist` trên `(field_id, booking_time_range)` → `23P01` → `409` (không lock ứng dụng)
- **File uploads — Supabase Storage, không còn local disk / URL-only.** Owner upload ảnh qua `POST /owner/facilities/images/upload` (multipart, field `images`, đa file) → trả `urls[]` (Supabase Storage public URL); FE gắn URL vào `PUT /owner/facilities/venues/:venueId/images` (ảnh venue) hoặc `PUT .../fields/:fieldId/images` (ảnh từng sân) — xem §13 Owner Console. Không có endpoint tạo venue/field từ phía player.
- Legacy `.../uploads/...` URL (trước khi migrate sang Supabase Storage) đã chết vĩnh viễn (thư mục local đã xoá) — bị loại (`NOT LIKE '%/uploads/%'`) khỏi mọi query cover-image/gallery thay vì migrate ngược

### `GET /venues`

**Query params**

| Param | Bắt buộc | Ghi chú |
| :--- | :--- | :--- |
| `sport` | Có | `football` \| `badminton` (không phân biệt hoa/thường) |
| `location` | Không | Text search tên/địa chỉ venue (unaccent, fuzzy); **không** dùng cùng `lat`/`long` |
| `lat` | Không | `-90..90`; phải đi cùng `long`; không dùng cùng `location` |
| `long` | Không | `-180..180`; phải đi cùng `lat` |
| `radiusKm` | Không | Chỉ có nghĩa khi có `lat`+`long`; mặc định `20` |
| `province` | Không | Mã tỉnh/thành GSO pre-2025, xem `GET /geo/vn` |
| `city` | Không | Mã quận/huyện; yêu cầu có `province` |
| `priceMin` / `priceMax` | Không | VND, lọc theo `price_per_hour` field khớp `sport` |
| `date` | Không | `YYYY-MM-DD`; bắt buộc nếu có `timeFrom`/`timeTo` |
| `timeFrom` / `timeTo` | Không | `HH:mm`; đi cùng nhau + `date`; `timeTo > timeFrom` |

**Success `200`**

```json
{
  "venues": [
    {
      "venueId": 12,
      "name": "Skyline Arena",
      "address": "123 Sports Lane, District 1, HCMC",
      "amenities": "Parking, Wifi",
      "openingHours": "06:00",
      "closingHours": "23:00",
      "latitude": 10.776889,
      "longitude": 106.700897,
      "coverImageUrl": "https://<project-ref>.supabase.co/storage/v1/object/public/spot-uploads/facilities/...jpg",
      "priceFromPerHour": 200000,
      "footballVariants": ["FIVE_A_SIDE", "SEVEN_A_SIDE"],
      "avgRating": 4.8,
      "ratingCount": 120,
      "distanceKm": 2.4
    }
  ]
}
```

`distanceKm` chỉ xuất hiện khi request có `lat`+`long`. Không có `lat`/`long` → sort theo `avgRating` desc; có `lat`+`long` → sort theo `distanceKm` asc. `footballVariants` luôn `[]` khi `sport=badminton`; `coverImageUrl`/`priceFromPerHour` có thể `null` nếu venue chưa có ảnh/field phù hợp.

**Errors:** `400` thiếu/sai `sport`, chỉ có 1 trong `lat`/`long`, cả `location` và `lat`+`long`, `city` thiếu `province`, `priceMax < priceMin`, thiếu `date` khi có `timeFrom`/`timeTo`, hoặc `timeTo <= timeFrom` · `401`

**curl**

```bash
curl -s "http://localhost:3000/venues?sport=football&location=Skyline" \
  -H "Authorization: Bearer <accessToken>"
```

---

### `GET /venues/:venueId`

**Query params:** `sport` (không bắt buộc) — `football` \| `badminton`, lọc `fields[]` chỉ còn sân sport đó.

**Success `200`**

```json
{
  "venue": {
    "venueId": 12, "name": "Skyline Arena", "address": "123 Sports Lane, District 1, HCMC",
    "amenities": null, "openingHours": "06:00", "closingHours": "23:00",
    "latitude": null, "longitude": null, "avgRating": 0, "ratingCount": 0,
    "ownerName": "Nguyen Van A", "ownerAvatarUrl": null, "ownerPhone": "0912345678"
  },
  "fields": [
    { "fieldId": 45, "venueId": 12, "name": "Pitch A", "sportType": "Football", "footballVariant": "FIVE_A_SIDE", "pricePerHour": 250000, "capacity": 14, "status": "ACTIVE" }
  ]
}
```

`fields[]` **không** gồm field `status = 'INACTIVE'` (owner đã xoá sân) — đây là view công khai cho player; owner-side API vẫn thấy `INACTIVE` (§13). `footballVariant` là `"FIVE_A_SIDE"` \| `"SEVEN_A_SIDE"` \| `null` (badminton luôn `null`).

**Errors:** `404` venue không tồn tại

---

### `GET /venues/:venueId/images`

Union `schema_venue.venue_images` (ảnh từ "Edit Venue" form) + `schema_venue.field_images` (ảnh từng sân) — owner trong thực tế thường chụp ảnh từng sân hơn cả khu phức hợp. `imageId` chỉ unique trong phạm vi bảng nguồn — dùng `source` để phân biệt (VD: React list key `${source}-${imageId}`).

**Success `200`**

```json
{
  "images": [
    { "imageId": 1, "source": "venue", "imageUrl": "https://<project-ref>.supabase.co/storage/v1/object/public/spot-uploads/facilities/1.jpg", "displayOrder": 0 },
    { "imageId": 7, "source": "field", "imageUrl": "https://<project-ref>.supabase.co/storage/v1/object/public/spot-uploads/facilities/7.jpg", "displayOrder": 0 }
  ]
}
```

Ảnh legacy `.../uploads/...` (trước Supabase Storage) bị loại khỏi kết quả — file không còn tồn tại.

**Errors:** `404` venue không tồn tại

**curl**

```bash
curl -s "http://localhost:3000/venues/12/images" \
  -H "Authorization: Bearer <accessToken>"
```

---

### `GET /venues/:venueId/fields/:fieldId/availability`

**Query params:** `date` (`YYYY-MM-DD`, bắt buộc, không quá khứ)

**Success `200`**

```json
{
  "fieldId": 45,
  "date": "2026-08-20",
  "slots": [
    { "startTime": "18:00", "endTime": "19:00", "available": true },
    { "startTime": "19:00", "endTime": "20:00", "available": false }
  ]
}
```

**Errors:** `400` thiếu/sai/quá khứ `date` · `404` field/venue không tồn tại hoặc field không thuộc venue

---

### `POST /bookings`

Yêu cầu Bearer access + `status = ACTIVE` (PLAYER luôn ACTIVE; user
`PENDING`/`LOCKED` → `403 "Account is not active"`). Áp dụng cho
`POST /bookings`, `POST /bookings/bulk`, và `POST /bookings/:id/dev/mark-paid`.

**Body**

```json
{ "fieldId": 45, "bookingDate": "2026-08-20", "startTime": "19:00", "endTime": "20:00" }
```

Optional addon: `hireReferee: true` (+ optional `refereeFeeVnd`, defaults to `DEFAULT_REFEREE_FEE_VND` = 150,000 VND if omitted) — triggers referee fan-out once the booking is `PAID`. Detail: [§19.16 Booking hire-referee + fan-out](#1916-booking-hire-referee--fan-out-player-side). `totalAmount` below is court price only — `refereeFeeVnd` is stored as a separate `bookings.referee_fee_vnd` column; FE payment summaries that show "what the player pays" should add the two.

**Success `201`**

```json
{
  "booking": {
    "bookingId": 501,
    "fieldId": 45,
    "bookingDate": "2026-08-20",
    "startTime": "19:00",
    "endTime": "20:00",
    "totalAmount": 250000,
    "depositAmount": 75000,
    "status": "PENDING_PAYMENT"
  }
}
```

**Errors**

| Status | Message |
| :--- | :--- |
| `400` | Validation failed (thiếu field, `endTime <= startTime`, ngày/giờ quá khứ) |
| `404` | Field not found |
| `409` | Field is not available for booking / Requested time is outside the venue's opening hours / This field is already booked for the requested time |

**curl**

```bash
curl -s -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"fieldId": 45, "bookingDate": "2026-08-20", "startTime": "19:00", "endTime": "20:00"}'
```

---

### `POST /bookings/bulk`

Đặt nhiều khung giờ và/hoặc nhiều sân trong 1 request (VD: chọn nhiều ô trên lưới Select Pitch & Time). Mỗi item xử lý độc lập — 1 item trùng lịch không làm rollback các item khác (giống `POST /matches/bulk`). Max 20 item/request.

**Body**

```json
{
  "bookings": [
    { "fieldId": 45, "bookingDate": "2026-08-20", "startTime": "19:00", "endTime": "20:00" },
    { "fieldId": 46, "bookingDate": "2026-08-20", "startTime": "10:00", "endTime": "11:00" }
  ]
}
```

**Success `201`** (toàn bộ hoặc một phần thành công)

```json
{
  "message": "Bookings created",
  "totalRequested": 2,
  "totalCreated": 2,
  "created": [
    { "bookingId": 501, "fieldId": 45, "bookingDate": "2026-08-20", "startTime": "19:00", "endTime": "20:00", "totalAmount": 250000, "depositAmount": 75000, "status": "PENDING_PAYMENT" },
    { "bookingId": 502, "fieldId": 46, "bookingDate": "2026-08-20", "startTime": "10:00", "endTime": "11:00", "totalAmount": 200000, "depositAmount": 60000, "status": "PENDING_PAYMENT" }
  ],
  "failed": []
}
```

`message: "Some bookings were created"` khi chỉ một phần thành công — `failed[]` liệt kê item lỗi kèm `message` cụ thể.

**Errors**

| Status | Ghi chú |
| :--- | :--- |
| `400` | `bookings` rỗng, quá 20 item, hoặc 1 item sai format (thiếu field, ngày/giờ quá khứ, `endTime <= startTime`) |
| `409` | **Toàn bộ** item đều lỗi — body có `details: { failed, totalRequested, totalCreated: 0 }` |

**curl**

```bash
curl -s -X POST http://localhost:3000/bookings/bulk \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"bookings":[{"fieldId":45,"bookingDate":"2026-08-20","startTime":"19:00","endTime":"20:00"},{"fieldId":46,"bookingDate":"2026-08-20","startTime":"10:00","endTime":"11:00"}]}'
```

---

