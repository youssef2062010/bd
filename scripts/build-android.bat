@echo off
REM ==============================================================================
REM Fake Call Simulator System — Android Native Build Script
REM Builds both App 1 (Fake Call Receiver) and App 2 (Fake Call Editor) APKs
REM ==============================================================================

echo [1/4] Fetching latest app branding and generating native resources...
node scripts\prepare-native-branding.mjs
if %errorlevel% neq 0 (
    echo [ERROR] Branding preparation failed. Set BRANDING_API_URL to the deployed /api/branding endpoint.
    exit /b %errorlevel%
)

echo [2/4] Building Web Assets for Fake Call App and Editor...
call npx vite build
if %errorlevel% neq 0 (
    echo [ERROR] Web assets build failed!
    exit /b %errorlevel%
)

echo.
echo [3/4] Preparing Android Asset Bundles...
if not exist "fake-call-app\android\app\src\main\assets\fake-call-app" mkdir "fake-call-app\android\app\src\main\assets\fake-call-app"
if not exist "editor-app\android\app\src\main\assets\editor-app" mkdir "editor-app\android\app\src\main\assets\editor-app"

xcopy /E /Y "dist\fake-call-app\*" "fake-call-app\android\app\src\main\assets\fake-call-app\"
xcopy /E /Y "dist\assets\*" "fake-call-app\android\app\src\main\assets\assets\"
xcopy /Y "dist\icon-*.png" "fake-call-app\android\app\src\main\assets\"

xcopy /E /Y "dist\editor-app\*" "editor-app\android\app\src\main\assets\editor-app\"
xcopy /E /Y "dist\assets\*" "editor-app\android\app\src\main\assets\assets\"
xcopy /Y "dist\icon-*.png" "editor-app\android\app\src\main\assets\"

echo.
echo [4/4] Android Native Projects Ready!
echo Android manifest and source locations:
echo - Fake Call App:    fake-call-app\android
echo - Fake Call Editor: editor-app\android
echo.
echo To compile APKs using Gradle:
echo   cd fake-call-app\android ^&^& gradlew assembleRelease
echo   cd editor-app\android ^&^& gradlew assembleRelease
echo.
echo Build script completed successfully.
