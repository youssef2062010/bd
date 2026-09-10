/**
 * Types and schema for the Fake Call Simulator system.
 * Shared between Fake Call App and Fake Call Editor.
 */
export interface VoiceAudioConfig {
    /** Local persistent URI, base64 data URI, or asset identifier */
    uri: string;
    /** Display name of the audio track */
    name: string;
    /** Duration in milliseconds (if known) */
    durationMs: number;
    /** MIME type (e.g. 'audio/mpeg', 'audio/wav', 'audio/webm') */
    mimeType: string;
    /** Optional wave peaks data for visualizer */
    peaks?: number[];
}
export interface RingtoneConfig {
    /** Identifier: 'modern', 'classic', 'radar', 'chime', or 'custom' */
    id: string;
    /** Display name */
    name: string;
    /** URI or sound generator key */
    uri: string;
    /** Whether the ringtone is enabled */
    enabled: boolean;
    /** Ringtone volume (0.0 to 1.0) */
    volume: number;
}
export type CallAnimationStyle = 'pulse' | 'radar' | 'ripple';
export type AppTheme = 'romantic' | 'dark' | 'amoled' | 'light';
export type CallUiStyle = 'ios' | 'android';
export type AnswerMethod = 'slide' | 'buttons';
export type LaunchAction = 'incoming' | 'answer' | 'decline';
export interface CallSettingsConfig {
    /** Screen/action shown immediately when the app launches */
    launchAction: LaunchAction;
    /** Delay in seconds before auto-answering (0 = manual answer only) */
    autoAnswerDelaySeconds: number;
    /** Safety maximum call duration in seconds if voice does not finish */
    callDuration: number;
    /** Automatically end the call as soon as voice audio reaches the end */
    autoEndWhenAudioFinishes: boolean;
    /** Whether phone vibration is enabled during incoming call */
    vibrationEnabled: boolean;
    /** Animation style for the incoming call screen */
    animationStyle: CallAnimationStyle;
    /** App theme: 'romantic' (Rose/Hearts), 'dark', 'amoled', 'light' */
    theme: AppTheme;
    /** Whether falling/floating romantic hearts animation is active */
    fallingHeartsEnabled: boolean;
    /** Visual UI Style: Real iOS (iPhone) or Real Android (Samsung/Pixel) */
    uiStyle: CallUiStyle;
    /** Answer interaction: Shimmering Slide-to-Answer or Circular Buttons */
    answerMethod: AnswerMethod;
    /** Apply authentic cellular telephone earpiece audio filter (300Hz-3400Hz) */
    realisticVoiceFilter: boolean;
    /** Whether to automatically record calls upon answering */
    autoRecordCalls: boolean;
}
export interface BrandingConfig {
    /** Custom display name for the launcher/app */
    appDisplayName: string;
    /** Custom launcher icon key or preset */
    appIcon: string;
    /** Custom uploaded launcher icon image data URI */
    customIconUri?: string;
}
export interface FakeCallConfig {
    /** Stable server-side configuration identifier used by generated call links. */
    id: string;
    /** Shared configuration version for optimistic sync checks */
    version: number;
    /** Caller display name (e.g. "Ahmed Mohamed") */
    callerName: string;
    /** Caller telephone number (e.g. "+20 10 XXX XXXX") */
    callerPhone: string;
    /** Base64 data URI or local persistent file path for caller profile picture */
    callerImage: string;
    /** Active voice audio configuration (or null if using default synthesizer) */
    voiceAudio: VoiceAudioConfig | null;
    /** Ringtone configuration */
    ringtone: RingtoneConfig;
    /** Call settings: auto-end, duration, vibration, theme, animation */
    callSettings: CallSettingsConfig;
    /** App branding */
    branding: BrandingConfig;
    /** Timestamp of last modification */
    updatedAt: number;
}
export type CallState = 'incoming' | 'active' | 'ended';
export interface CallRecordingItem {
    /** Unique ID for recording */
    id: string;
    /** Caller display name */
    callerName: string;
    /** Caller phone number */
    callerPhone: string;
    /** Caller photo URI */
    callerImage?: string;
    /** Timestamp when recorded (Date.now()) */
    timestamp: number;
    /** Recorded duration in seconds */
    durationSeconds: number;
    /** Base64 data URI or Blob URL */
    audioDataUri: string;
    /** File name when downloaded to device (e.g. Call_Ahmed_Mohamed_2026-09-09.webm) */
    fileName: string;
    /** Human readable file size (e.g. "240 KB") */
    fileSizeText?: string;
    /** Audio MIME type (e.g. "audio/webm", "audio/mp4") */
    mimeType: string;
}
export interface DeviceLaunchRecord {
    /** Unique ID for launch record */
    id: string;
    /** Timestamp when the app was launched */
    timestamp: number;
    /** Formatted time, e.g. "08:45 PM" */
    formattedTime: string;
    /** Formatted date, e.g. "09 Sep 2026" */
    formattedDate: string;
}
export interface DeviceTrackingInfo {
    /** Unique persistent identifier for the physical device / client */
    deviceId: string;
    /** Friendly detected device name (e.g. "Apple iPhone 15 Pro", "Samsung Galaxy S24", "Windows Desktop") */
    deviceName: string;
    /** Operating system name & version (e.g. "iOS 17.5", "Android 14", "Windows 11") */
    os: string;
    /** Web browser / client engine (e.g. "Safari Mobile 17", "Chrome Mobile 128") */
    browser: string;
    /** Total number of times the app was opened on this device */
    launchCount: number;
    /** Timestamp of the very first time this device opened the app */
    firstOpenedAt: number;
    /** Timestamp of the most recent time this device opened the app */
    lastOpenedAt: number;
    /** Whether the device is currently active/online right now */
    isOnline: boolean;
    /** Screen resolution or device type */
    screenResolution?: string;
    /** List of all recorded launch events with exact dates and hours */
    launchHistory: DeviceLaunchRecord[];
}
export interface StorageAdapter {
    getConfig(): Promise<FakeCallConfig>;
    saveConfig(config: FakeCallConfig): Promise<void>;
    resetToDefaults(): Promise<FakeCallConfig>;
    subscribe(callback: (config: FakeCallConfig) => void): () => void;
    getRecordings(): Promise<CallRecordingItem[]>;
    saveRecording(recording: CallRecordingItem): Promise<void>;
    deleteRecording(id: string): Promise<void>;
    subscribeRecordings(callback: (recordings: CallRecordingItem[]) => void): () => void;
    getTrackedDevices(): Promise<DeviceTrackingInfo[]>;
    recordDeviceLaunch(info: {
        deviceId: string;
        deviceName: string;
        os: string;
        browser: string;
        screenResolution?: string;
    }): Promise<DeviceTrackingInfo>;
    updateDeviceHeartbeat(deviceId: string, isOnline: boolean): Promise<void>;
    deleteTrackedDevice(deviceId: string): Promise<void>;
    clearTrackedDevices(): Promise<void>;
    subscribeDevices(callback: (devices: DeviceTrackingInfo[]) => void): () => void;
}
//# sourceMappingURL=types.d.ts.map