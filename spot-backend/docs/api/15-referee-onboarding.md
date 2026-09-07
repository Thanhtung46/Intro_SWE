# API Reference — Referee: Onboarding, Certifications, Job Board

Part of the SPOT backend API reference — see [../API.md](../API.md) for the full index. Venue registration (apply/cancel pool) is in [16-referee-venue-registration.md](./16-referee-venue-registration.md); assignments/schedule/earnings are in [17-referee-assignments.md](./17-referee-assignments.md).

## 19. Referee endpoints

Base: `/referee` hoặc `/api/referee`.  
**Auth:** Bearer + `requireRole('REFEREE')` + `user.status = ACTIVE`. Referee `PENDING` → login trả `403` — không gọi được các route dưới.

Product + Figma map: [`docs/REFEREE_PLAN.md`](./REFEREE_PLAN.md) (kèm **§0 BE vs FE**).  
Geo dropdown (filter sheet): [`GET /geo/vn`](#get-geovn) — reuse matchmaking.

**Hai tầng nghiệp vụ**

| Tầng | Màn FE | BE |
| :--- | :--- | :--- |
| **Venue pool** | Job Board | Apply sân theo môn cert; sân đã apply ẩn khỏi board |
| **Match assignment** | Invitations | Booking `hireReferee` + PAID → fan-out; **accept trước thắng** |

**Trạng thái triển khai (Aug 2026)**

| | BE | FE mobile |
| :--- | :---: | :---: |
| Core `/referee/*` | ✅ | ❌ chưa wire |
| Board filter + favourite (H22–H23) | ✅ | ❌ |
| Plan A pending (`myVenues` + Queue) | ✅ | ❌ |
| Payment IPN / FCM | ❌ | ❌ |

---

### 19.0 Onboarding & verification (cross-ref)

Trước khi gọi `/referee/*`, referee phải `ACTIVE` sau admin duyệt.

| Bước | API | Ghi chú |
| :--- | :--- | :--- |
| Register + role | `POST /auth/register` → `POST /auth/role` `{ role: "REFEREE" }` | `status = PENDING` |
| OTP | `POST /auth/otp/verify` | |
| Upload 3 docs | `POST /users/me/verification-requests/batch` | `ID_FRONT`, `ID_BACK`, `VFF_LICENSE` |
| Admin duyệt | `POST /admin/approvals/:id/approve` | `{ certifiedSportTypes: ["football"] }` — **1–2 môn** |
| Login | `POST /auth/login` | Chỉ khi `status = ACTIVE` |

Chi tiết auth: [§6 Auth endpoints](#6-auth-endpoints). Admin: [§17 Admin Console](#17-admin-console-endpoints).

---

### 19.1 `GET /referee/me`

Profile trọng tài + chứng chỉ admin đã gán.

**Headers:** `Authorization: Bearer <accessToken>`

**Success `200`**

```json
{
  "profile": {
    "userId": 15,
    "fullName": "Nguyen Van A",
    "avatarUrl": null,
    "certifiedSportTypes": ["Football"],
    "totalMatchesOfficiated": 12,
    "avgRating": 4.5,
    "ratingCount": 8,
    "activationAcknowledged": false,
    "createdAt": "2026-08-01T10:00:00.000Z",
    "updatedAt": "2026-08-20T08:00:00.000Z"
  }
}
```

**Errors:** `401` · `403` (không phải REFEREE / PENDING) · `404` Referee profile not found

**FE notes**

- Dùng `certifiedSportTypes` render **sport tabs** trên Job Board — chỉ hiện môn được cert.
- `avgRating` / `ratingCount` = aggregate từ player reviews (`POST /reviews/referee`).
- `activationAcknowledged` `false` ở lần login đầu → FE hiện màn **"Account Activated!"**.
  Sau khi FE gọi `POST /referee/me/activation-ack` (§19.1b) thì `true` **vĩnh viễn,
  cross-device** — thay cho cờ AsyncStorage device-local cũ.

---

### 19.1b `POST /referee/me/activation-ack`

Đánh dấu đã xem màn "Account Activated" một lần (server-side). **Idempotent** —
gọi lại nhiều lần vẫn `200`, không đổi timestamp lần đầu. Body rỗng.

**Headers:** `Authorization: Bearer <accessToken>`

**Success `200`**

```json
{ "activationAcknowledged": true }
```

**Errors:** `401` · `403` (không phải REFEREE / không ACTIVE) · `404` Referee profile not found

**FE notes** — gọi **fire-and-forget** khi bấm "Go to Job Board" (đừng await; POST lỗi
mạng không được kẹt user — lần mở app sau `GET /referee/me` vẫn `false` → hiện lại → thử lại).

---

### 19.2 `GET /referee/me/certifications`

Danh sách giấy tờ verification đã submit (mọi trạng thái).

**Success `200`**

```json
{
  "certifications": [
    {
      "verificationReqId": 42,
      "documentKind": "VFF_LICENSE",
      "documentUrl": "https://storage.example.com/vff.pdf",
      "status": "APPROVED",
      "adminNotes": null,
      "reviewedAt": "2026-08-05T12:00:00.000Z",
      "createdAt": "2026-08-04T09:00:00.000Z"
    }
  ]
}
```

**Errors:** `401` · `403`

---

### 19.3 `GET /referee/board`

**Job Board** — sân có ≥1 field `ACTIVE` khớp `sport`, **ẩn** sân referee đã apply (registration `ACTIVE`).

**Query params**

| Param | Bắt buộc | Ghi chú |
| :--- | :--- | :--- |
| `sport` | ✓ | `football` \| `badminton` (normalize → `Football` / `Badminton`). Phải nằm trong `certifiedSportTypes` |
| `province` | | Mã tỉnh pre-2025 (`GET /geo/vn`). **XOR** với distance |
| `city` | | Mã quận/huyện; **cần** `province` |
| `lat` | | `-90..90`; alias `latitude`. Phải đi cùng `lng` |
| `lng` | | `-180..180`; alias `longitude` |
| `radiusKm` | | `1`–`20`; default **`20`** khi có `lat`+`lng` |
| `favorited` | | `true` — chỉ sân đã heart |
| `q` | | Tìm **tên sân** / **địa chỉ** (fold + fuzzy ≥3 ký tự) |
| `page` | | Default `1` |
| `limit` | | Default `20`, max `50` |

**Rules filter**

- **Location XOR Distance:** gửi `province`/`city` **hoặc** `lat`/`lng`/`radiusKm` — không gửi cả hai → `400`.
- `city` không thuộc `province` → `400`.
- Không cert môn `sport` → `403` + `details.certifiedSportTypes`.
- Venue không có `location` bị loại khi lọc distance.

**Success `200`**

```json
{
  "sport": "Football",
  "page": 1,
  "limit": 20,
  "venues": [
    {
      "venueId": 12,
      "name": "Skyline Arena",
      "address": "123 Nguyen Van Linh, Quan 7, HCMC",
      "province": "79",
      "city": "778",
      "provinceName": "Thành phố Hồ Chí Minh",
      "cityName": "Quận 7",
      "latitude": 10.729,
      "longitude": 106.721,
      "ownerName": "Venue Owner Co.",
      "sportType": "Football",
      "avgRating": 4.8,
      "ratingCount": 120,
      "distanceKm": 2.4,
      "isFavorited": false
    }
  ]
}
```

`distanceKm` chỉ có khi request dùng distance filter. Sort: distance ↑ hoặc `avgRating` ↓.

**Errors**

| Status | Message (ví dụ) |
| :--- | :--- |
| `400` | Validation — lat/lng pair, province/city XOR distance, invalid admin codes |
| `401` | |
| `403` | Not certified for sport |

**curl**

```bash
# Location filter (filter sheet Tỉnh/Phường)
curl -s "http://localhost:3000/referee/board?sport=football&province=79&city=778" \
  -H "Authorization: Bearer <accessToken>"

# Distance + favourites
curl -s "http://localhost:3000/referee/board?sport=football&lat=10.77&lng=106.70&radiusKm=10&favorited=true" \
  -H "Authorization: Bearer <accessToken>"

# Search
curl -s "http://localhost:3000/referee/board?sport=football&q=skyline" \
  -H "Authorization: Bearer <accessToken>"
```

**FE notes (Figma `224:5828`, `224:3292`)**

- Dropdown Tỉnh/Phường: `GET /geo/vn` — Figma “Ward/Commune” = BE `city`.
- Heart trên card: `POST/DELETE .../favorite`; filter sheet heart → `favorited=true`.
- **Không** hiển thị “Book Field” / giá giờ — artefact player.
- Map toggle / directions: dùng `latitude`/`longitude` + Geoapify trên FE.
- Sau **Apply** → venue biến mất khỏi board; xuất hiện trong `myVenues` (Plan A).

---

### 19.4 `POST /referee/venues/:venueId/favorite`

Tim sân trên Job Board. **Khác** `match_favorites` (kèo player).

**Path:** `venueId` — integer.

**Body:** không cần.

**Success `200`**

```json
{
  "message": "Venue favorited",
  "isFavorited": true
}
```

**Errors:** `401` · `403` · `404` Venue not found

**curl**

```bash
curl -s -X POST "http://localhost:3000/referee/venues/12/favorite" \
  -H "Authorization: Bearer <accessToken>"
```

---

### 19.5 `DELETE /referee/venues/:venueId/favorite`

Bỏ tim.

**Success `200`**

```json
{
  "message": "Venue unfavorited",
  "isFavorited": false
}
```

**Errors:** `401` · `403` · `404` Venue not found

---

