#!/usr/bin/env bash
set -e

# ==============================================================================
# Fake Call Simulator System — Android Native Build Script (Linux/macOS)
# ==============================================================================

echo "[1/3] Building Web Assets for Fake Call App and Editor..."
npx vite build

echo "[2/3] Syncing assets into Android projects..."
mkdir -p fake-call-app/android/app/src/main/assets
mkdir -p editor-app/android/app/src/main/assets

cp -r dist/fake-call-app/* fake-call-app/android/app/src/main/assets/
cp -r dist/assets fake-call-app/android/app/src/main/assets/

cp -r dist/editor-app/* editor-app/android/app/src/main/assets/
cp -r dist/assets editor-app/android/app/src/main/assets/

echo "[3/3] Android projects are synced!"
echo "To build APKs:"
echo "  (cd fake-call-app/android && ./gradlew assembleRelease)"
echo "  (cd editor-app/android && ./gradlew assembleRelease)"
