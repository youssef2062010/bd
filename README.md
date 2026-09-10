# Fake Call Simulator System (Cross-Platform Mobile Suite)

A complete, production-grade cross-platform **Fake Call Simulator system** consisting of TWO separate mobile applications for **Android** and **iOS**, connected via an offline-first shared configuration and media storage layer.

---

## Architecture Overview

```
c:\Users\Yousef\Desktop\app\
├── shared/                         # Reusable data models, defaults, audio engine, and storage adapters
│   ├── src/
│   │   ├── types.ts                # TypeScript interfaces: FakeCallConfig, CallerInfo, CallSettings
│   │   ├── defaults.ts             # Default caller ("Ahmed Mohamed", vector avatar, ringtone presets)
│   │   ├── audioSynthesizer.ts     # WebAudio ringtone engine, DTMF keypad tones, synthesized speech
│   │   └── storageContract.ts      # Offline cross-app synchronization adapter
│   └── package.json
│
├── fake-call-app/                  # APP 1 — Fake Call App (Receiver)
│   ├── src/
│   │   ├── components/
│   │   │   ├── IncomingCallView.tsx    # Immediate incoming call screen on cold launch
│   │   │   ├── ActiveCallView.tsx      # Active call screen (timer, voice wave, mute, speaker, dialpad)
│   │   │   ├── CallEndedView.tsx       # Post-call summary & restart
│   │   │   └── AnimatedPulseRipple.tsx # Glowing radar/ripple ring animation
│   │   ├── services/
│   │   │   ├── audioPlayerService.ts   # Ringtone playback, voice player, auto-end trigger
│   │   │   └── hapticService.ts        # Rhythmic call vibration patterns
│   │   ├── App.tsx                     # Zero-delay incoming call startup orchestrator
│   │   └── index.html
│   ├── android/                        # Android Native Project (Wakes screen over lockscreen)
│   │   └── app/src/main/
│   │       ├── AndroidManifest.xml
│   │       └── java/com/fakecall/app/MainActivity.kt
│   └── ios/                            # iOS Native Project (App Group: group.com.fakecall.shared)
│       └── FakeCallApp/
│           ├── FakeCallApp.entitlements
│           ├── Info.plist
│           └── AppDelegate.swift
│
├── editor-app/                     # APP 2 — Fake Call Editor (Controller)
│   ├── src/
│   │   ├── components/
│   │   │   ├── CallerInfoCard.tsx      # Name, phone number, photo picker, preset avatars
│   │   │   ├── VoiceCard.tsx           # Voice recorder, audio file importer, waveform preview
│   │   │   ├── RingtoneCard.tsx        # 4 Ringtone presets, preview player, volume slider, toggle
│   │   │   ├── CallSettingsCard.tsx    # Auto-answer, duration limit, auto-end, vibration, themes
│   │   │   ├── BrandingCard.tsx        # App display name, app launcher icon preview
│   │   │   └── EditorHeader.tsx        # Real-time sync indicator, save button, quick reset
│   │   ├── services/
│   │   │   └── mediaService.ts         # Persistent Base64 conversion, mic recording
│   │   ├── App.tsx
│   │   └── index.html
│   ├── android/                        # Android Native Project with ContentProvider
│   │   └── app/src/main/
│   │       ├── AndroidManifest.xml
│   │       └── java/com/fakecall/editor/SharedConfigProvider.kt
│   └── ios/                            # iOS Native Project with App Groups
│       └── FakeCallEditor/
│           ├── FakeCallEditor.entitlements
│           └── AppDelegate.swift
│
├── harness/                        # Interactive Dual-Phone Side-by-Side Simulator
│   └── (served via root index.html)
├── scripts/                        # Automation & verification scripts
│   ├── build-android.bat / .sh     # Android asset bundling & release prep
│   ├── build-ios.sh                # iOS Xcode asset sync
│   ├── verify-suite.mjs            # Automated HTTP endpoint test
│   └── verify-logic.mjs            # Simulation state-machine & schema test
└── package.json
```

---

## Features & Specifications

### APP 1 — Fake Call App (Receiver)
- **Zero Friction Startup**:
  - Immediately displays the fake incoming call screen upon launch.
  - **No homepage, no dashboard, no "Start Call" button required**.
  - Loads the latest configuration saved by the Editor App automatically.
  - Rings and vibrates immediately if enabled.
- **Incoming Call Screen**:
  - Circular caller avatar with dynamic glowing ripple rings.
  - Caller Name, styled phone number, and "Mobile • Incoming call" badge.
  - Vibrant Green Answer button and Red Decline button with micro-interactions.
- **Active Call Screen**:
  - Transitions immediately upon answering; ringtone and vibration cease.
  - **Configured voice/audio automatically starts playback**.
  - Live call timer (`00:00`, counting up by seconds).
  - Dynamic voice waveform visualization reacting to voice playback.
  - In-call controls: Mute, Speakerphone, DTMF dialpad with audio tones, and Red End Call button.
- **Auto-End Behavior**:
  - When the configured voice finishes, the app **automatically stops audio, ends the call, and shows the post-call summary screen**.

---

### APP 2 — Fake Call Editor (Controller)
- **Executive Configuration Dashboard**:
  - **Caller Information**: Name input, formatted phone input, profile photo picker (device gallery/camera), plus 4 instant preset avatars (Ahmed, Sarah, Executive Boss, Doctor).
  - **Voice Audio**:
    - Select audio file (`.mp3`, `.wav`, `.m4a`, etc.) from device.
    - Built-in Voice Recorder: records directly from device microphone with live duration counter.
    - Preview player with Play/Pause, duration, and progress bar.
    - Replace, Delete, and "Active Voice" status.
    - Persisted locally without external server dependency.
  - **Ringtone Management**:
    - 4 Pre-packaged ringtones: *Modern Smartphone (Marimba)*, *Classic Dual Bell*, *Gentle Acoustic Chime*, and *Sonar Radar Pulse*.
    - Interactive audio preview button.
    - Ringtone enable/disable toggle.
    - Volume slider (0% to 100%).
  - **Call Settings**:
    - Auto-answer behavior: Manual, 3s, 5s, or 10s.
    - Safety call duration limit: 30s, 60s, 2m, or 5m.
    - "Automatically end call when voice finishes" toggle.
    - Vibration toggle.
    - Animation style: Pulse, Radar, or Ripple.
    - Themes: Dark Velvet, OLED Black, or Clean Light.
  - **Branding & Dynamic Launcher Icons**:
    - App display name customization.
    - Launcher icon preview tile.
    - Native architecture explanation:
      - **iOS**: Uses `UIApplication.shared.setAlternateIconName` declared in `Info.plist`.
      - **Android**: Uses `<activity-alias>` enabled/disabled at runtime via `PackageManager`.

---

## Cross-Platform Offline Data Sharing

The two applications communicate offline without needing any backend:

1. **iOS (App Groups)**:
   - Entitlement: `group.com.fakecall.shared`
   - Key-value configuration: `UserDefaults(suiteName: "group.com.fakecall.shared")`
   - Shared media container: `FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.com.fakecall.shared")`

2. **Android (ContentProvider & Scoped Storage)**:
   - Authority: `com.fakecall.shared.configprovider`
   - Shared directory: `context.getExternalFilesDir(null)/../com.fakecall.shared/config.json`
   - ContentProvider `openFile` descriptor for media streaming.

3. **Web / Dev Simulator (Zero-Latency Sync)**:
   - `BroadcastChannel('fake_call_sync_broadcast')` + `localStorage`
   - When you click "Save" on the Editor App, the Fake Call App updates its caller profile, photo, and voice audio instantly in real-time.

---

## Privacy & Security

- **No Real Phone Calls**: Entirely in-app audio synthesis and media simulation.
- **No Address Book / Contacts Access**: Zero contacts permission required.
- **No Call Logs**: Does not access or touch device telephony history.
- **No SMS Interception**: Zero SMS permissions.
- **100% Offline**: All personal caller names, phone numbers, and voice recordings remain exclusively on the user's device.

---

## Quickstart & Live Testing

### 1. Run the Interactive Dual-Phone Simulator
```bash
npm install
npm run dev
```
Open **`http://localhost:3000/`** in your browser.

You will see:
- **Left Device**: APP 2 — Fake Call Editor
- **Right Device**: APP 1 — Fake Call App (Ringing immediately upon launch!)
- Edit caller name to "Ahmed Mohamed", change the avatar or record a voice, click **Save Configuration**, and watch the right phone update immediately!

### 2. Run Automated Verification Tests
```bash
# Test HTTP endpoints and responses
node scripts/verify-suite.mjs

# Test simulation state-machine and configuration schema
node scripts/verify-logic.mjs
```

### 3. Standalone Application Endpoints
- Fake Call App: `http://localhost:3000/fake-call-app/index.html`
- Fake Call Editor: `http://localhost:3000/editor-app/index.html`

---

## Native Build Instructions

### Android Build (APK / AAB)
1. Bundle web assets:
   ```bash
   scripts\build-android.bat   # Windows
   # or
   bash scripts/build-android.sh # macOS / Linux
   ```
2. Build Android APKs using Gradle:
   ```bash
   cd fake-call-app/android && gradlew assembleRelease
   cd ../../editor-app/android && gradlew assembleRelease
   ```
   The generated APKs will be located in:
   - `fake-call-app/android/app/build/outputs/apk/release/app-release.apk`
   - `editor-app/android/app/build/outputs/apk/release/app-release.apk`

### iOS Build (Xcode / Archive)
1. Bundle web assets:
   ```bash
   bash scripts/build-ios.sh
   ```
2. Open in Xcode:
   - Open `fake-call-app/ios` in Xcode, select your Developer Team under **Signing & Capabilities**, and verify `group.com.fakecall.shared` App Group is checked.
   - Open `editor-app/ios` in Xcode, select your Developer Team, and verify `group.com.fakecall.shared` is checked.
3. Build and Archive:
   ```bash
   xcodebuild -project fake-call-app/ios/FakeCallApp.xcodeproj -scheme FakeCallApp -archivePath build/FakeCallApp.xcarchive archive
   ```
