# Builds a debug Dev Client APK for Android without needing the Android
# SDK/NDK/Gradle installed on the host — same toolchain for every dev.
#
# This is a *build* image only (produces an .apk), not a dev server image —
# see the root Dockerfile for that. It does not (and cannot) install the
# result onto a device/emulator; `adb install` still runs on the host
# afterwards, since the container has no access to the host's emulator/USB
# devices.
#
# Usage: see "Dev Client — Docker build (offline / no Expo account)" in
# README.md.
FROM reactnativecommunity/react-native-android:latest

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Regenerates the native android/ project from app.json + installed Expo
# modules (expo-speech-recognition's config plugin included) — same output
# `eas build`/`expo run:android` would generate, just done locally.
RUN npx expo prebuild --platform android --clean

RUN cd android && ./gradlew assembleDebug --no-daemon

# Copy the APK to a fixed path so the host can `docker cp` it out without
# knowing Gradle's variant-specific output path.
RUN cp android/app/build/outputs/apk/debug/app-debug.apk /app-debug.apk
