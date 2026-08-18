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

`npm test` fails today — no jest config committed yet, see `CLAUDE.md`.

## Building for Production

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to stores
eas submit
```
