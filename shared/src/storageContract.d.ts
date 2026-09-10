import { FakeCallConfig, StorageAdapter, CallRecordingItem, DeviceTrackingInfo } from './types.js';
/**
 * Cross-platform persistent storage adapter with real-time multi-window / multi-app synchronization.
 * Supports iOS App Groups bridge, Android ContentProvider bridge, and Offline IndexedDB/LocalStorage.
 */
declare class CrossPlatformStorageService implements StorageAdapter {
    private broadcastChannel;
    private sseConnection;
    private listeners;
    private recordingListeners;
    private deviceListeners;
    private cachedConfig;
    private cachedRecordings;
    private cachedDevices;
    constructor();
    private initSyncChannel;
    /**
     * Polls the live /api/sync endpoint and cloud topic for any configuration saved from Admin console.
     */
    pullLatestCloudConfig(): Promise<FakeCallConfig | null>;
    private notifyDeviceListeners;
    private notifyRecordingListeners;
    private notifyListeners;
    /**
     * Retrieves the latest configuration.
     * Checks live server sync first, then native bridge and local persistence.
     */
    getConfig(): Promise<FakeCallConfig>;
    /**
     * Saves the configuration and broadcasts the update to all listening apps/screens
     * both locally and across physical devices via real-time cloud push.
     */
    saveConfig(config: FakeCallConfig): Promise<void>;
    resetToDefaults(): Promise<FakeCallConfig>;
    subscribe(callback: (config: FakeCallConfig) => void): () => void;
    /**
     * Retrieves all saved call recordings.
     */
    getRecordings(): Promise<CallRecordingItem[]>;
    /**
     * Saves a new call recording item to offline storage and syncs across all windows/apps.
     */
    saveRecording(recording: CallRecordingItem): Promise<void>;
    /**
     * Deletes a recorded call item.
     */
    deleteRecording(id: string): Promise<void>;
    /**
     * Subscribes to changes in the call recordings archive.
     */
    subscribeRecordings(callback: (recordings: CallRecordingItem[]) => void): () => void;
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
    /**
     * Subscribes to real-time updates of tracked devices.
     */
    subscribeDevices(callback: (devices: DeviceTrackingInfo[]) => void): () => void;
    private mergeWithDefaults;
}
export declare const sharedStorage: CrossPlatformStorageService;
export {};
//# sourceMappingURL=storageContract.d.ts.map