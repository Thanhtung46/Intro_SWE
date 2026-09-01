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

**Tính năng AI Assistant (chat + voice) cần Dev Client, không chạy được
trên Expo Go** — voice input dùng `expo-speech-recognition` (native module
nhận diện giọng nói on-device của Android/iOS), và Expo Go chỉ hỗ trợ các
module có sẵn trong bản build cố định của nó. Các màn hình khác (auth,
home, booking, ...) vẫn chạy bình thường trên Expo Go. Xem mục
[Dev Client](#dev-client-bắt-buộc-cho-ai-assistantvoice) bên dưới.

Xem `CLAUDE.md` trong thư mục này để biết chi tiết đầy đủ (kiến trúc, known
gotchas, trạng thái từng màn hình).

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

Mở app bằng Expo Go (quét QR) như bình thường nếu bạn không cần test AI
Assistant/voice. Nếu cần, dùng Dev Client thay cho Expo Go — xem bên dưới.

## Dev Client (bắt buộc cho AI Assistant/voice)

`expo-speech-recognition` là native module — cần một build riêng của app
("Dev Client") cài lên máy ảo/thiết bị thật, thay cho app Expo Go. Chỉ cần
build lại khi bạn (hoặc ai đó) thêm/đổi một native module mới; các thay
đổi code JS/TS bình thường vẫn hot-reload qua Metro như cũ, không cần build
lại mỗi lần.

### Cách 1 — EAS Build (khuyến nghị, dùng chung cho cả team)

Build trên hạ tầng cloud của Expo — không ai cần cài Android SDK/Docker,
kết quả đồng nhất 100% giữa các máy vì không phụ thuộc môi trường cục bộ.

```bash
npm install -g eas-cli   # một lần
eas login                # tài khoản Expo (miễn phí)
eas build --profile development --platform android
```

Đợi build xong (vài phút, chạy trên cloud), EAS in ra link tải `.apk`.
Tải về rồi cài vào máy ảo:

```bash
adb install ten-file-tai-ve.apk
```

(hoặc kéo-thả file `.apk` vào cửa sổ máy ảo Android Studio). Sau đó chạy
`npx expo start --dev-client` (thay vì `npm start`) và mở app Dev Client đã
cài — nó sẽ tự kết nối tới Metro như Expo Go từng làm.

Build cho iOS tương tự với `--platform ios` (cần tài khoản Apple Developer
để cài lên thiết bị thật; Simulator không cần).

### Cách 2 — Docker build local (không cần tài khoản Expo, build offline)

Dùng khi không có/không muốn dùng tài khoản Expo. Image chứa sẵn Android
SDK/NDK/Gradle nên không cần cài gì thêm ngoài Docker — nhưng **vẫn cần
`adb` trên máy host** để cài APK lên máy ảo sau khi build xong (container
không có quyền truy cập máy ảo/thiết bị của host).

```bash
# Build APK bên trong container (lần đầu khá lâu — tải Android SDK, ~10-20 phút)
docker build -f docker/android-build.Dockerfile -t spot-mobile-dev-client .

# Lấy file APK ra khỏi image vừa build
docker create --name spot-mobile-apk-extract spot-mobile-dev-client
docker cp spot-mobile-apk-extract:/app-debug.apk ./app-debug.apk
docker rm spot-mobile-apk-extract

# Cài lên máy ảo/thiết bị đang chạy (từ host, không phải trong container)
adb install ./app-debug.apk
```

Sau đó chạy `npx expo start --dev-client` như Cách 1.

**Lưu ý**: build local qua Docker chỉ ra file `.apk` (Android). Build iOS
(`.ipa`) bắt buộc cần máy Mac + Xcode thật (Apple không cho build iOS
trong Linux container) — dùng Cách 1 (EAS) cho iOS.

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
