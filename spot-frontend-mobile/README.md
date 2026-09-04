# SPOT Frontend Mobile

Mobile application cho SPOT platform, xây dựng với React Native + Expo.

## Status

Không phải empty scaffold — đã có luồng auth + onboarding + home hoàn chỉnh
(splash → onboarding → chọn vai trò → đăng ký/đăng nhập → OTP →
profile/settings/home), viết bằng TypeScript. Một tính năng "Football
Dashboard" (trang chủ Player, xem danh sách sân, carousel) đang được phát
triển thêm dưới `src/screens/home/`, `src/components/home/`.

`npm install` (không cần flag) hiện chạy được bình thường — `react` được
pin ở `19.2.8`, tương thích với `react-test-renderer`/
`@testing-library/react-native`, nên xung đột peer-dependency cũ không còn
tái hiện.

**Không còn chạy thuần Expo Go như trước.** Project có `expo-dev-client`
(AI voice / native modules) — mỗi máy/emulator phải cài app **SPOT** một lần.
Cách nhanh: [tải APK đã build sẵn](#cách-nhanh-nhất-tải-apk-dev-client-đã-build-sẵn)
(không cần Android SDK). Muốn tự build: [Cài lần đầu trên máy mới](#cài-lần-đầu-trên-máy-mới-android).

Xem `CLAUDE.md` trong thư mục này để biết chi tiết đầy đủ (kiến trúc, known
gotchas, trạng thái từng màn hình).

## Quick Start

### Hàng ngày (sau khi máy đã cài Dev Client)

```bash
npm install
cp .env.example .env   # lần đầu; sửa API_URL / key nếu cần
npm start
# nhấn: a (Android) / i (iOS) / w (Web)
```

Mở app **SPOT** trên emulator — **không** mở Expo Go, **không** cần login Expo.

### Web (không cần APK)

```bash
npm start
# nhấn w
```

---

## Cài lần đầu trên máy mới (Android)

Trước đây chỉ cần Expo Go + `npm start`. Giờ **mỗi máy + mỗi emulator**
phải cài app SPOT **một lần** (`npm run android` tự build + tự cài APK).

### Bước 0 — Chuẩn bị

1. Cài **Node.js**, **Android Studio**, tạo/bật **emulator**
2. Path project nên **ngắn, ít khoảng trắng** (tránh lỗi Windows 260 ký tự)  
   Nên: `C:\dev\Intro_SWE\spot-frontend-mobile`  
   Tránh: `D:\Code test\Project ...` (dài + có space → hay fail CMake)

### Bước 1 — JDK 17+ và Android SDK

Mở PowerShell trong `spot-frontend-mobile`:

```powershell
# JDK — JBR đi kèm Android Studio (đổi path cho đúng máy bạn)
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
# Ví dụ path khác: "D:\Program file\adroid studio\jbr"

$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:Path="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

java -version
# Phải hiện 17 hoặc 21 — KHÔNG phải "1.8.0_xxx"
```

Tạo file **`android/local.properties`** (mỗi máy một file, **không commit**):

```properties
sdk.dir=C:/Users/<TEN_USER>/AppData/Local/Android/Sdk
```

Thay `<TEN_USER>` bằng tên user Windows. Dùng dấu `/` như trên.

### Bước 2 — Install + build lần đầu

```powershell
npm install
npm run android
```

- Lần đầu **5–15 phút**
- Tự build + tự cài APK lên emulator đang chạy — **không cần tải APK tay**
- Xong sẽ mở app **SPOT** (`com.anonymous.spotapp`)

### Bước 3 — Sau đó dùng như cũ

```powershell
npm start
# nhấn a
```

Chỉ cần `npm run android` lại khi: wipe emulator, đổi máy ảo, hoặc thêm/đổi native module.

---

## Lỗi thường gặp khi `npm run android` (máy mới)

### 1) `Gradle requires JVM 17 ... currently JVM 8`

Đang dùng Java 8. Set lại `JAVA_HOME` (Bước 1), mở terminal mới, kiểm tra
`java -version`, rồi chạy lại `npm run android`.

Ghi cố định cho máy (không commit vào repo) —
`%USERPROFILE%\.gradle\gradle.properties`:

```properties
org.gradle.java.home=C:/Program Files/Android/Android Studio/jbr
```

### 2) `SDK location not found` / thiếu `ANDROID_HOME`

Tạo `android/local.properties` với `sdk.dir=...` (Bước 1), hoặc set
`$env:ANDROID_HOME`.

### 3) `Filename longer than 260 characters` (ninja / CMake)

Path Windows quá dài. Chuyển project sang path ngắn (`C:\dev\...`), rồi:

```powershell
Remove-Item -Recurse -Force android\app\.cxx -ErrorAction SilentlyContinue
npm run android
```

### 4) `No development build (com.anonymous.spotapp)`

Emulator chưa có app SPOT. Bật đúng emulator → chạy lại `npm run android`.

### 5) Metro hỏi Log in / Expo Go

**Ctrl+C** — đừng login. Dùng app **SPOT**, không dùng Expo Go.

### 6) Bundle lỗi kiểu `Unable to resolve "./C:/..."`

Cache Metro lệch path:

```powershell
npx expo start --clear
```

---

## Cách nhanh nhất: tải APK Dev Client đã build sẵn

Không cần Android SDK / NDK / build gì. **1 người build → cả team dùng chung
1 file.** APK là universal (đủ 4 ABI: arm64-v8a, armeabi-v7a, x86, x86_64) nên
chạy trên mọi emulator/máy Android.

**Tải:** https://drive.google.com/file/d/1ZIjrHZ9PsXNJa0MNgAJgdJXge0Fw9pko/view
(`app-debug.apk`, ~261 MB — link nội bộ, đăng nhập tài khoản đã được add vào
Share; ai vào team sau thì nhờ chủ file add thêm)

```powershell
# emulator/máy Android đang chạy + adb thấy device
adb install -r app-debug.apk

cd spot-frontend-mobile
npm install
# .env (Windows): thêm EXPO_PUBLIC_API_HOST=10.0.2.2 để app trong emulator gọi được backend
npm start          # bấm a — mở app SPOT (KHÔNG dùng Expo Go, KHÔNG login Expo)
```

**Khi nào cần tải APK mới:** chỉ khi có thay đổi **native module**
(thêm/bớt package có code native) hoặc sửa `app.json` (plugins / permissions).
Code JS/TS thường → Metro hot-reload, dùng APK cũ được.

**Tự build lại APK** (khi cần bản mới): `npm run android` trên máy có
Android SDK + path ngắn; hoặc EAS; hoặc build trên Linux/WSL rồi copy `.apk`
ra (`android/app/build/outputs/apk/debug/app-debug.apk`) — xem 2 mục dưới.

---

## Dev Client (bắt buộc cho AI Assistant/voice)

`expo-speech-recognition` là native module — cần build riêng ("Dev Client")
thay cho Expo Go. Chỉ build lại khi thêm/đổi native module; code JS/TS vẫn
hot-reload qua Metro.

### Cách 1 — EAS Build (cloud, dùng chung team)

```bash
npm install -g eas-cli
eas login
eas build --profile development --platform android
```

EAS trả link tải `.apk` → cài vào emulator:

```bash
adb install ten-file-tai-ve.apk
```

Sau đó `npm start` → nhấn `a` / mở app **SPOT**.

### Cách 2 — Docker build local

```bash
docker build -f docker/android-build.Dockerfile -t spot-mobile-dev-client .
docker create --name spot-mobile-apk-extract spot-mobile-dev-client
docker cp spot-mobile-apk-extract:/app-debug.apk ./app-debug.apk
docker rm spot-mobile-apk-extract
adb install ./app-debug.apk
```

Sau đó `npm start` như Cách 1.

**Lưu ý:** Docker chỉ ra `.apk` (Android). iOS cần Mac + Xcode hoặc EAS.

## Project Structure

```
app/            # expo-router routes: index (splash), onboarding, auth/, owner/,
                # profile/, settings.tsx, pending.tsx, home.tsx
src/
├── screens/    # {splash,onboarding,auth,owner,common,home}/ — presentational screens
├── components/ # {onboarding,common,home}/ — shared UI
├── services/   # authService.ts (axios + mock adapter)
├── schemas/    # zod validation per form
├── context/    # UserContext.tsx (session state)
├── config/ constants/ theme/ utils/ hooks/
└── state/      # still empty (.gitignore placeholder only)
```

`npm test` runs the Jest suite (`__tests__/`, plus co-located `*.test.ts(x)`
under `src/`) — see `CLAUDE.md` for known gaps in coverage.

## Building for Production

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to stores
eas submit
```
