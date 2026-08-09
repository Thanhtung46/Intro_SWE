# SPOT Frontend Mobile

Mobile application cho SPOT platform, xây dựng với React Native + Expo.

## Status

Empty scaffold — `app/` and every `src/` subfolder have zero files, so
`npm start` boots Expo with nothing to render beyond the default splash.
**Plain `npm install` fails** on a peer-dependency conflict
(`react-test-renderer@19.x` vs. `@testing-library/react-native` wanting
React ^16–18) — use `npm install --legacy-peer-deps` until versions are
reconciled. See `CLAUDE.md` in this directory for details.

## Quick Start

```bash
# Install dependencies
npm install --legacy-peer-deps

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
app/            # expo-router routes — auth/, tabs/ expected, currently empty
src/
├── components/ config/ hooks/ screens/ services/ state/ types/ utils/   # all empty
```

## Building for Production

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to stores
eas submit
```
