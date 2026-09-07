# spot-backend agent notes — Vmito Dev-Seed Import (commands & scripts)

Part of the spot-backend agent notes — see [../../CLAUDE.md](../../CLAUDE.md) for the index. Overview/concepts are in [01-vmito-import.md](./01-vmito-import.md).

### Lệnh — fetch vs ghi DB vs file output

| Lệnh | Ghi DB? | `vmito-sessions.json` | `vmito-sync-report.json` |
| :--- | :--- | :--- | :--- |
| `npm run fetch:vmito` | **Không** | ✅ ghi đè (default 12) | ❌ |
| `npm run fetch:vmito:50` | **Không** | ✅ ghi đè | ❌ |
| `npm run fetch:vmito:100` | **Không** | ✅ ghi đè | ❌ |
| `npm run fetch:vmito:500` | **Không** | ✅ ghi đè | ❌ |
| `npm run fetch:vmito:1000` | **Không** | ✅ ghi đè | ❌ |
| `npm run sync:vmito` | **Có** | ❌ chỉ đọc | ✅ ghi đè |
| `npm run sync:vmito:live` | **Có** | ✅ fetch + ghi | ✅ ghi đè |
| `npm run sync:vmito:live:50` | **Có** | ✅ fetch + ghi | ✅ ghi đè |
| `npm run sync:vmito:live:500` | **Có** | ✅ fetch + ghi | ✅ ghi đè |
| `npm run sync:vmito:live:1000` | **Có** | ✅ fetch + ghi | ✅ ghi đè |
| `npm run sync:vmito -- --dry-run` | **Không** | ❌ chỉ đọc | ✅ (mô phỏng) |
| `npm run sync:vmito -- --file path.json` | **Có** | ❌ đọc file chỉ định | ✅ ghi đè |
| `npm run reset:vmito -- --dry-run` | **Không** | ❌ | ❌ |
| `npm run reset:vmito` | **Có** (xóa Vmito) | ❌ | ❌ |

**Script reset Vmito:** `scripts/reset-vmito-import.js` (`npm run reset:vmito`).

**Yêu cầu sync:** `.env` có `DB_*` (Supabase pooler). **Không cần** server API chạy — sync gọi trực tiếp `createMatch` + `userRepository`.

**Legacy (tránh dùng):** `npm run fetch:vmito -- --import --email ... --password ...` — ghi DB qua HTTP `POST /matches`, cần server + JWT; **mọi kèo gán 1 account login**, không tạo host theo SĐT Vmito. Prefer **`sync:vmito`**.

### Đồng bộ với model kèo SPOT (app)

Import map sang **cùng schema** user host kèo qua `POST /matches` (**free listing**):

| SPOT field | Nguồn import |
| :--- | :--- |
| `venueName`, `venueAddress` | Text từ Vmito |
| `province`, `city` | Mã pre-2025 từ `GET /geo/vn` — **không** copy `venueId` Vmito |
| `latitude`, `longitude` | Vmito `lat`/`lng` nếu có |
| `courts[]` | Tên sân con Vmito |

**Không đồng bộ:** catalog sân Vmito, `schema_venue`, booking, roster player Vmito, club Vmito. Filter `GET /matches?province=&city=` và card `provinceName`/`cityName` hoạt động như kèo user tạo tay.

**Không import:** Vmito `venueId`, players đã join, club, cover (thường null).

### Mapping Vmito → SPOT (`POST /matches` body)

| Vmito | SPOT |
| :--- | :--- |
| `sportType` BADMINTON/FOOTBALL | `sport` |
| `defaultMatchType` SINGLES/DOUBLES | `format` |
| `feeConfig.femaleFee` / `maleFee` (×1000 VND) | `GENDER_RANGE` `priceMin`/`priceMax` |
| `feeConfig.splitTotal` | `SPLIT_EVENLY` `priceMin` |
| `requiredLevels[]` (rank 1–10) | `skillMin`/`skillMax` hoặc `allLevels` |
| `venue`, lat/lng, district, city | `venueName`, `venueAddress`, `province` (`79` / `01`), `city` (quận/huyện) |
| Quận 9 (Vmito cũ) | alias → **Thành phố Thủ Đức** (`769`); normalize `đ` → `d` |
| Tỉnh ngoài HCM/Hà Nội | **Bỏ qua** khi fetch/sync |
| `hostName`, `hostPhone` | **Không** map vào create body — host = user SPOT (below) |
| Mô tả + SĐT host | `notes` (mô tả Vmito + liên hệ; tag nội bộ `[vmito-import:{slug}]` cho sync/reset — **không** hiện link Vmito) |

Thiếu quận → fallback `city`: HCM **`778`**, Hà Nội **`001`**; flag `cityResolved: false`.

### Host / tài khoản — quan trọng

Host trên Vmito **không tồn tại sẵn** trong SPOT (user system riêng: `hostId` CUID Vmito vs `user_id` serial SPOT). Sync **tạo shadow PLAYER**:

| Field | Giá trị import |
| :--- | :--- |
| Email | `vmito.{hostIdSuffix}@import.spot.local` |
| Phone | SĐT Vmito nếu hợp lệ; không có → synthetic `09xxxxxxxx` (hash `hostId`) |
| Password | `Password1!` (hoặc `VMITO_IMPORT_PASSWORD`) |
| Role | `PLAYER`, `email_verified_at` + `role_selected_at` set ngay (không OTP) |
| Skill | `user_sport_skills`: **skillMax cao nhất** trên các kèo host set (bỏ qua `allLevels`); upsert sau sync |

Nhiều kèo cùng host Vmito → **1 user SPOT** (cache theo `hostId`). SĐT host vẫn nằm trong `notes` kèo cho liên hệ; **không** phải account thật của họ trên app.

### Đăng nhập host import (dev / QA)

Sau `npm run sync:vmito`, email host nằm trong `data/vmito-sync-report.json` (`hostEmail` từng dòng `created`) hoặc suy ra từ `hostId` Vmito.

| | |
| :--- | :--- |
| **API** | `POST /auth/login` `{ "email", "password" }` |
| **Email** | `vmito.{hostIdSuffix}@import.spot.local` — suffix = 24 ký tự cuối `hostId` (chữ/số), vd. `cmrtks1bg00nonu01ccl0vw6j` → `vmito.mrtks1bg00nonu01ccl0vw6j@import.spot.local` |
| **Password** | `Password1!` hoặc env `VMITO_IMPORT_PASSWORD` |
| **Tra cứu nhanh** | `vmito-sync-report.json` → `results[].hostEmail` + `hostUserId`; hoặc Supabase `schema_auth.users` `WHERE email LIKE 'vmito.%@import.spot.local'` |

Ví dụ (server đang chạy):

```bash
curl -s -X POST http://127.0.0.1:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"vmito.msh3lgct0086o7015n9adac4@import.spot.local","password":"Password1!"}'
```

→ `{ accessToken, refreshToken, user }` — host quản lý kèo qua `GET /matches/mine`, `PATCH /matches/:id`, v.v.

**Lưu ý:** Account import **không** phải user Vmito thật; không dùng email/password Vmito gốc. User đăng ký tay trên app (`POST /auth/register` + OTP) **không** liên quan các email `@import.spot.local`.

### Chính sách ghi DB — thêm mới, không ghi đè

| Thành phần | Hành vi |
| :--- | :--- |
| Kèo đã import (cùng slug Vmito) | **Skip** — giữ row cũ |
| Kèo mới | **INSERT** |
| Kèo/user tạo tay trên app | **Không đụng** |
| File `vmito-sessions.json` | **Ghi đè** mỗi lần fetch |
| Skill host import | **Upsert** (`user_sport_skills`) |

**Không** tự `UPDATE`/`DELETE` kèo cũ khi sync lại.

### Reset dữ liệu test Vmito (không ảnh hưởng dữ liệu cũ trên DB)

Dùng khi đã **`sync:vmito`** lên DB và muốn **gỡ chỉ phần import Vmito** để fetch/sync lại — **không** xóa kèo smoke, kèo tạo tay, user đăng ký OTP, groups, tournaments.

| Lệnh | Tác dụng |
| :--- | :--- |
| `npm run reset:vmito -- --dry-run` | Đếm trước: số kèo + shadow host sẽ xóa (không đụng DB) |
| `npm run reset:vmito` | Xóa kèo Vmito + shadow host orphan (transaction) |
| `npm run reset:matches` | **Xóa toàn bộ kèo** mọi nguồn — **không dùng** nếu chỉ muốn gỡ Vmito |

**Quy trình import lại (khuyến nghị):**

```bash
npm run reset:vmito -- --dry-run   # 1. xem số dòng sẽ xóa
npm run reset:vmito                # 2. xóa Vmito trên DB
npm run sync:vmito                 # 3. đẩy lại từ data/vmito-sessions.json
# hoặc fetch mới rồi sync:
npm run sync:vmito:live:50         # fetch + sync một lệnh
```

**Cách nhận diện trên DB (script dùng điều kiện này):**

| Entity | Điều kiện xóa |
| :--- | :--- |
| Kèo | `notes` chứa `[vmito-import:` hoặc (legacy) `vmito.com/vi/sessions/` |
| Shadow host | `schema_auth.users.email LIKE 'vmito.%@import.spot.local'` **và** sau khi xóa kèo không còn host kèo nào |

**Cascade:** xóa kèo → courts, join requests, favorites liên quan (FK). **Không xóa:** user đăng ký app (`@gmail`, …), kèo không có link Vmito trong `notes`, groups/tournaments.

**Không đụng file JSON:** `data/vmito-sessions.json` và `vmito-sync-report.json` vẫn trên disk — chỉ DB được reset phần Vmito.

**Docker (từ `Intro_SWE/`):**

```bash
docker compose run --rm backend npm run reset:vmito -- --dry-run
docker compose run --rm backend npm run reset:vmito
```

**So sánh nhanh:**

| | `reset:vmito` | `reset:matches` |
| :--- | :--- | :--- |
| Kèo Vmito import | ✅ xóa | ✅ xóa |
| Kèo smoke / tạo tay | ❌ giữ | ❌ xóa hết |
| User đăng ký OTP | ❌ giữ | ❌ giữ (chỉ TRUNCATE matches) |
| Shadow host Vmito | ✅ xóa (nếu không còn kèo) | ❌ giữ (user row còn) |

Sau `reset:vmito`, `sync:vmito` coi mọi slug là mới → **INSERT** lại (không skip `already synced`).

### Sync — skip / sanitize (thiếu sót OK)

| Trường hợp | Hành vi |
| :--- | :--- |
| **Cùng tên sân + trùng/overlap giờ** (trong file hoặc DB) | **Skip** — giữ kèo đầu tiên; **không** đổi tên/slug |
| Tỉnh ngoài HCM/Hà Nội | **Skip** — không fetch vào JSON / không sync |
| Đã sync (notes chứa slug Vmito) | **Skip** — idempotent |
| **Trùng tên sân + trùng giờ** (DB hoặc cùng batch import) | **Skip** — không đẩy 2 kèo cùng venue + overlapping time |
| Trùng pitch + giờ + sân con (409 occupancy SPOT) | **Skip** — fallback nếu lọc trên chưa bắt |
| `startsAt` quá khứ | Bump +7 ngày/lần tối đa 52 tuần |
| `coverUrl` | Giữ ảnh thật từ Vmito (`session`/`venue`/`images`) nếu có. **Không** dùng avatar host. Badminton thiếu cover → ảnh sân bundled trên mobile; Football thiếu → stock photo |
| Skill thiếu khi `allLevels=false` | → `allLevels: true` |
| Tên sân trùng trên 1 kèo | Suffix `(2)`, `(3)`… |
| Validation Zod fail | **Skip** + ghi reason trong report |

### Kết quả mẫu (Aug 2026)

| Lần chạy | Kết quả |
| :--- | :--- |
| Fetch 12 → sync lần đầu | **11 created**, **1 skipped** (overlap sân cùng giờ), **9 hosts**, matchId ~1000–1010 |
| Sync lại cùng file | **0 created**, **12 skipped** (`already synced`) — report ghi `matchId` cũ |
| Fetch 50 (scope HCM+Hà Nội) | **50** trong JSON, `unsupportedSkipped: 2` (Bắc Ninh, …), ~48 HCM + ~10 Hà Nội trong mẫu |

### Scripts / layout

```
scripts/
├── fetch-vmito-listings.js       # fetch only → vmito-sessions.json
├── sync-vmito-to-spot.js         # read JSON → DB + vmito-sync-report.json
└── lib/
    ├── vmito-parser.js           # API fetch, province filter, map draft
    └── vmito-sync.js             # shadow host, sanitize, createMatch, skip rules
data/
├── vmito-sessions.json           # INPUT snapshot (fetch / live fetch)
└── vmito-sync-report.json        # OUTPUT biên bản sync
```

**Env tùy chọn:** `VMITO_FETCH_URL`, `VMITO_FETCH_LIMIT`, `VMITO_IMPORT_PASSWORD`.

**Export constants (parser):** `SUPPORTED_PROVINCE_CODES` = `['79','01']`, `HCM_PROVINCE_CODE`, `HANOI_PROVINCE_CODE`.

**Không implement:** import toàn quốc, claim listing cho host Vmito thật, import player roster, sync 2 chiều, liên kết `venueId` Vmito ↔ SPOT catalog.

