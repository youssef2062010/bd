import { FakeCallConfig, StorageAdapter, CallRecordingItem, DeviceTrackingInfo } from './types.js';
/**
 * Cross-platform persistent storage adapter with real-time multi-window / multi-app synchronization.
 * Backed by Supabase with automatic real-time subscriptions, offline LocalStorage, and native bridges.
 */
declare class CrossPlatformStorageService implements StorageAdapter {
    private broadcastChannel;
    private listeners;
    private recordingListeners;
    private deviceListeners;
    private cachedConfig;
    private cachedRecordings;
    private cachedDevices;
    constructor();
    private mapRowToConfig;
    private mapConfigToRow;
    private readApiConfig;
    private initSyncChannel;
    /**
     * Pulls the latest configuration from Supabase (or fallback API endpoint).
     */
    pullLatestCloudConfig(): Promise<FakeCallConfig | null>;
    private notifyDeviceListeners;
    private notifyRecordingListeners;
    private notifyListeners;
    /**
     * Retrieves the latest configuration.
     * Checks Supabase first, then local persistence and defaults.
     */
    getConfig(): Promise<FakeCallConfig>;
    /**
     * Saves the configuration directly to Supabase and broadcasts the update.
     */
    saveConfig(config: FakeCallConfig): Promise<void>;
    resetToDefaults(): Promise<FakeCallConfig>;
    subscribe(callback: (config: FakeCallConfig) => void): () => void;
    /**
     * Pulls latest recordings from Supabase.
     */
    pullLatestRecordings(): Promise<CallRecordingItem[]>;
    /**
     * Retrieves all saved call recordings.
     */
    getRecordings(): Promise<CallRecordingItem[]>;
    /**
     * Saves a new call recording item to Supabase & offline storage.
     */
    saveRecording(recording: CallRecordingItem): Promise<void>;
    /**
     * Deletes a recorded call item.
     */
    deleteRecording(id: string): Promise<void>;
    subscribeRecordings(callback: (recordings: CallRecordingItem[]) => void): () => void;
    /**
     * Pulls latest tracked devices from Supabase.
     */
    pullLatestDevices(): Promise<DeviceTrackingInfo[]>;
    /**
     * Retrieves the list of all tracked devices that have launched the app.
     */
    getTrackedDevices(): Promise<DeviceTrackingInfo[]>;
    /**
     * Records a device launch event with exact timestamp, hour, date, and increments total launch count.
     */
    recordDeviceLaunch(info: {
        deviceId: string;
        deviceName: string;
        os: string;
        browser: string;
        screenResolution?: string;
    }): Promise<DeviceTrackingInfo>;
    /**
     * Updates device heartbeat / online status.
     */
    updateDeviceHeartbeat(deviceId: string, isOnline: boolean): Promise<void>;
    /**
     * Deletes a tracked device from the log.
     */
    deleteTrackedDevice(deviceId: string): Promise<void>;
    /**
     * Clears all tracked devices from the log.
     */
    clearTrackedDevices(): Promise<void>;
    subscribeDevices(callback: (devices: DeviceTrackingInfo[]) => void): () => void;
}
export declare const sharedStorage: CrossPlatformStorageService;
export {};
//# sourceMappingURL=storageContract.d.ts.map