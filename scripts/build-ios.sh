#!/usr/bin/env bash
set -e

# ==============================================================================
# Fake Call Simulator System — iOS Native Build Script
# ==============================================================================

echo "[1/4] Fetching latest app branding and generating native resources..."
node scripts/prepare-native-branding.mjs

echo "[2/4] Building Web Assets..."
npx vite build

echo "[3/4] Syncing assets into iOS project bundles..."
mkdir -p fake-call-app/ios/FakeCallApp/www/fake-call-app
mkdir -p editor-app/ios/FakeCallEditor/www/editor-app

cp -r dist/fake-call-app/* fake-call-app/ios/FakeCallApp/www/fake-call-app/
mkdir -p fake-call-app/ios/FakeCallApp/www/assets
cp -r dist/assets/* fake-call-app/ios/FakeCallApp/www/assets/
cp dist/icon-*.png fake-call-app/ios/FakeCallApp/www/

cp -r dist/editor-app/* editor-app/ios/FakeCallEditor/www/editor-app/
mkdir -p editor-app/ios/FakeCallEditor/www/assets
cp -r dist/assets/* editor-app/ios/FakeCallEditor/www/assets/
cp dist/icon-*.png editor-app/ios/FakeCallEditor/www/

echo "[4/4] iOS Projects synced with App Group: group.com.fakecall.shared"
echo "To build in Xcode or CI:"
echo "  xcodebuild -project fake-call-app/ios/FakeCallApp.xcodeproj -scheme FakeCallApp -archivePath build/FakeCallApp.xcarchive archive"
echo "  xcodebuild -project editor-app/ios/FakeCallEditor.xcodeproj -scheme FakeCallEditor -archivePath build/FakeCallEditor.xcarchive archive"
