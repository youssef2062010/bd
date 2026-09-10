import { DEFAULT_CONFIG } from './defaults.js';
const STORAGE_KEY = 'fake_call_system_config_v1';
const RECORDINGS_KEY = 'fake_call_recordings_archive_v1';
const DEVICES_KEY = 'fake_call_devices_tracking_v1';
const CHANNEL_NAME = 'fake_call_sync_broadcast';
const CLOUD_SYNC_TOPIC = 'https://ntfy.sh/didas-call-sync-8472910';
const CLOUD_API_SYNC = '/api/sync';
/**
 * Cross-platform persistent storage adapter with real-time multi-window / multi-app synchronization.
 * Supports iOS App Groups bridge, Android ContentProvider bridge, and Offline IndexedDB/LocalStorage.
 */
class CrossPlatformStorageService {
    broadcastChannel = null;
    sseConnection = null;
    listeners = new Set();
    recordingListeners = new Set();
    deviceListeners = new Set();
    cachedConfig = null;
    cachedRecordings = null;
    cachedDevices = null;
    constructor() {
        this.initSyncChannel();
    }
    initSyncChannel() {
        // 1. Cross-tab BroadcastChannel
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            try {
                this.broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
                this.broadcastChannel.onmessage = (event) => {
                    if (event.data && event.data.type === 'CONFIG_UPDATED') {
                        this.cachedConfig = event.data.config;
                        this.notifyListeners(event.data.config);
                    }
                    else if (event.data && event.data.type === 'RECORDINGS_UPDATED') {
                        this.cachedRecordings = event.data.recordings;
                        this.notifyRecordingListeners(event.data.recordings);
                    }
                    else if (event.data && event.data.type === 'DEVICES_UPDATED') {
                        this.cachedDevices = event.data.devices;
                        this.notifyDeviceListeners(event.data.devices);
                    }
                };
            }
            catch {
                // Fallback to storage event
            }
        }
        // 2. Local Real-Time SSE Stream (Instant live push across devices on local network / Vite server)
        if (typeof window !== 'undefined' && 'EventSource' in window) {
            try {
                const localSse = new EventSource('/api/sync/events');
                localSse.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data && data.type === 'CONFIG_UPDATED' && data.config) {
                            const merged = this.mergeWithDefaults(data.config);
                            this.cachedConfig = merged;
                            try {
                                localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
                            }
                            catch { }
                            this.notifyListeners(merged);
                        }
                    }
                    catch { }
                };
            }
            catch { }
            // 3. Fallback Cloud SSE synchronization
            try {
                this.sseConnection = new EventSource(`${CLOUD_SYNC_TOPIC}/sse`);
                this.sseConnection.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.event === 'message' && data.message) {
                            // Trigger immediate fetch of full payload from /api/sync
                            this.pullLatestCloudConfig().catch(() => { });
                        }
                    }
                    catch { }
                };
            }
            catch (err) {
                console.warn('Cloud SSE sync error:', err);
            }
        }
        if (typeof window !== 'undefined') {
            // Re-sync from server/cloud when screen is unlocked or app is brought to foreground
            window.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    this.pullLatestCloudConfig().catch(() => { });
                }
            });
            window.addEventListener('focus', () => {
                this.pullLatestCloudConfig().catch(() => { });
            });
            window.addEventListener('online', () => {
                this.pullLatestCloudConfig().catch(() => { });
            });
            // Regular 1-second pulse sync to catch any edits from admin
            window.setInterval(() => {
                this.pullLatestCloudConfig().catch(() => { });
            }, 1000);
            window.addEventListener('storage', (e) => {
                if (e.key === STORAGE_KEY && e.newValue) {
                    try {
                        const parsed = JSON.parse(e.newValue);
                        this.cachedConfig = parsed;
                        this.notifyListeners(parsed);
                    }
                    catch { }
                }
                else if (e.key === RECORDINGS_KEY && e.newValue) {
                    try {
                        const parsed = JSON.parse(e.newValue);
                        this.cachedRecordings = parsed;
                        this.notifyRecordingListeners(parsed);
                    }
                    catch { }
                }
                else if (e.key === DEVICES_KEY && e.newValue) {
                    try {
                        const parsed = JSON.parse(e.newValue);
                        this.cachedDevices = parsed;
                        this.notifyDeviceListeners(parsed);
                    }
                    catch { }
                }
            });
        }
    }
    /**
     * Polls the live /api/sync endpoint and cloud topic for any configuration saved from Admin console.
     */
    async pullLatestCloudConfig() {
        // 1. Prioritize /api/sync endpoint (supports full audio, image & settings payloads without size limits)
        try {
            const apiRes = await fetch(CLOUD_API_SYNC, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache, no-store' }
            });
            if (apiRes.ok) {
                const text = await apiRes.text();
                if (text && text.trim().startsWith('{')) {
                    const apiData = JSON.parse(text);
                    if (apiData && (apiData.callerName || apiData.updatedAt)) {
                        const merged = this.mergeWithDefaults(apiData);
                        if (!this.cachedConfig || (merged.updatedAt > (this.cachedConfig.updatedAt || 0))) {
                            this.cachedConfig = merged;
                            try {
                                localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
                            }
                            catch { }
                            this.notifyListeners(merged);
                            return merged;
                        }
                    }
                }
            }
        }
        catch { }
        // 2. Secondary fallback: ntfy topic cache
        try {
            const res = await fetch(`${CLOUD_SYNC_TOPIC}/json?poll=1`, { cache: 'no-store' });
            if (res.ok) {
                const text = await res.text();
                const lines = text.trim().split('\n').filter(Boolean);
                for (let i = lines.length - 1; i >= 0; i--) {
                    try {
                        const item = JSON.parse(lines[i]);
                        if (item.event === 'message' && item.message) {
                            const parsed = JSON.parse(item.message);
                            if (parsed && (parsed.callerName || parsed.updatedAt)) {
                                const merged = this.mergeWithDefaults(parsed);
                                if (!this.cachedConfig || (merged.updatedAt > (this.cachedConfig.updatedAt || 0))) {
                                    this.cachedConfig = merged;
                                    try {
                                        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
                                    }
                                    catch { }
                                    this.notifyListeners(merged);
                                    return merged;
                                }
                            }
                        }
                    }
                    catch { }
                }
            }
        }
        catch { }
        return this.cachedConfig;
    }
    notifyDeviceListeners(devices) {
        this.deviceListeners.forEach((listener) => {
            try {
                listener(devices);
            }
            catch (err) {
                console.error('Device listener error:', err);
            }
        });
    }
    notifyRecordingListeners(recordings) {
        this.recordingListeners.forEach((listener) => {
            try {
                listener(recordings);
            }
            catch (err) {
                console.error('Recordings listener error:', err);
            }
        });
    }
    notifyListeners(config) {
        this.listeners.forEach((listener) => {
            try {
                listener(config);
            }
            catch (err) {
                console.error('Storage listener error:', err);
            }
        });
    }
    /**
     * Retrieves the latest configuration.
     * Checks live server sync first, then native bridge and local persistence.
     */
    async getConfig() {
        // 1. Immediately race a fast pull from live /api/sync so fresh edits from Admin appear instantly!
        try {
            const live = await Promise.race([
                this.pullLatestCloudConfig(),
                new Promise((resolve) => setTimeout(() => resolve(null), 450))
            ]);
            if (live) {
                this.cachedConfig = live;
                return this.cachedConfig;
            }
        }
        catch { }
        if (this.cachedConfig) {
            this.pullLatestCloudConfig().catch(() => { });
            return this.cachedConfig;
        }
        // Check for iOS App Group bridge
        if (typeof window !== 'undefined') {
            const win = window;
            // Native Android ContentProvider Bridge
            if (win.FakeCallAndroidBridge?.getConfigJson) {
                try {
                    const raw = win.FakeCallAndroidBridge.getConfigJson();
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        this.cachedConfig = this.mergeWithDefaults(parsed);
                        this.pullLatestCloudConfig().catch(() => { });
                        return this.cachedConfig;
                    }
                }
                catch (e) {
                    console.warn('Android bridge read error:', e);
                }
            }
            // Offline persistent storage
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    this.cachedConfig = this.mergeWithDefaults(parsed);
                    this.pullLatestCloudConfig().catch(() => { });
                    return this.cachedConfig;
                }
            }
            catch (err) {
                console.warn('LocalStorage read error:', err);
            }
            // If no local config exists yet (e.g. fresh phone install), quickly fetch from cloud!
            try {
                const cloudConfig = await Promise.race([
                    this.pullLatestCloudConfig(),
                    new Promise((resolve) => setTimeout(() => resolve(null), 1200))
                ]);
                if (cloudConfig) {
                    this.cachedConfig = cloudConfig;
                    return this.cachedConfig;
                }
            }
            catch { }
        }
        this.cachedConfig = { ...DEFAULT_CONFIG };
        return this.cachedConfig;
    }
    /**
     * Saves the configuration and broadcasts the update to all listening apps/screens
     * both locally and across physical devices via real-time cloud push.
     */
    async saveConfig(config) {
        const updated = {
            ...config,
            updatedAt: Date.now()
        };
        this.cachedConfig = updated;
        if (typeof window !== 'undefined') {
            // 1. Save to LocalStorage
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            }
            catch (err) {
                console.error('LocalStorage write error:', err);
            }
            // 2. Broadcast via BroadcastChannel (same browser / multiple tabs)
            if (this.broadcastChannel) {
                try {
                    this.broadcastChannel.postMessage({
                        type: 'CONFIG_UPDATED',
                        config: updated
                    });
                }
                catch (e) {
                    console.warn('BroadcastChannel error:', e);
                }
            }
            // 3. Push to Live API (/api/sync) FIRST (our local Vite dev server & cloud API)
            try {
                fetch(CLOUD_API_SYNC, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updated)
                }).catch(() => { });
            }
            catch { }
            // 4. Push lightweight ping to Cloud Sync Topic (ntfy.sh broker)
            try {
                fetch(CLOUD_SYNC_TOPIC, {
                    method: 'POST',
                    headers: {
                        'Title': 'ConfigSync',
                        'Priority': 'high'
                    },
                    body: JSON.stringify({ type: 'PING', updatedAt: updated.updatedAt })
                }).catch(() => { });
            }
            catch { }
            // 5. Notify Native Android Bridge if present
            const win = window;
            if (win.FakeCallAndroidBridge?.saveConfigJson) {
                try {
                    win.FakeCallAndroidBridge.saveConfigJson(JSON.stringify(updated));
                }
                catch (e) {
                    console.warn('Android bridge save error:', e);
                }
            }
            // 6. Notify Native iOS App Group bridge if present
            if (win.webkit?.messageHandlers?.fakeCallStorage) {
                try {
                    win.webkit.messageHandlers.fakeCallStorage.postMessage({
                        action: 'SAVE_CONFIG',
                        config: updated
                    });
                }
                catch (e) {
                    console.warn('iOS bridge save error:', e);
                }
            }
        }
        this.notifyListeners(updated);
    }
    async resetToDefaults() {
        await this.saveConfig(DEFAULT_CONFIG);
        return DEFAULT_CONFIG;
    }
    subscribe(callback) {
        this.listeners.add(callback);
        return () => {
            this.listeners.delete(callback);
        };
    }
    /**
     * Retrieves all saved call recordings.
     */
    async getRecordings() {
        if (this.cachedRecordings) {
            return this.cachedRecordings;
        }
        if (typeof window !== 'undefined') {
            try {
                const raw = localStorage.getItem(RECORDINGS_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        this.cachedRecordings = parsed;
                        return parsed;
                    }
                }
            }
            catch (err) {
                console.warn('Failed to load recordings from localStorage:', err);
            }
        }
        this.cachedRecordings = [];
        return [];
    }
    /**
     * Saves a new call recording item to offline storage and syncs across all windows/apps.
     */
    async saveRecording(recording) {
        const list = await this.getRecordings();
        // Prepend new recording so newest is on top
        const updated = [recording, ...list.filter((r) => r.id !== recording.id)].slice(0, 50);
        this.cachedRecordings = updated;
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(RECORDINGS_KEY, JSON.stringify(updated));
            }
            catch (err) {
                console.error('Failed to save recording to localStorage:', err);
            }
            if (this.broadcastChannel) {
                try {
                    this.broadcastChannel.postMessage({
                        type: 'RECORDINGS_UPDATED',
                        recordings: updated
                    });
                }
                catch (e) {
                    console.warn('BroadcastChannel recordings error:', e);
                }
            }
        }
        this.notifyRecordingListeners(updated);
    }
    /**
     * Deletes a recorded call item.
     */
    async deleteRecording(id) {
        const list = await this.getRecordings();
        const updated = list.filter((r) => r.id !== id);
        this.cachedRecordings = updated;
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(RECORDINGS_KEY, JSON.stringify(updated));
            }
            catch (err) {
                console.error('Failed to update localStorage after recording delete:', err);
            }
            if (this.broadcastChannel) {
                try {
                    this.broadcastChannel.postMessage({
                        type: 'RECORDINGS_UPDATED',
                        recordings: updated
                    });
                }
                catch (e) {
                    console.warn('BroadcastChannel error:', e);
                }
            }
        }
        this.notifyRecordingListeners(updated);
    }
    /**
     * Subscribes to changes in the call recordings archive.
     */
    subscribeRecordings(callback) {
        this.recordingListeners.add(callback);
        return () => {
            this.recordingListeners.delete(callback);
        };
    }
    /**
     * Retrieves the list of all tracked devices that have launched the app.
     */
    async getTrackedDevices() {
        if (this.cachedDevices) {
            return this.cachedDevices;
        }
        if (typeof window !== 'undefined') {
            try {
                const raw = localStorage.getItem(DEVICES_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        this.cachedDevices = parsed;
                        return parsed;
                    }
                }
            }
            catch (err) {
                console.warn('Failed to load tracked devices from localStorage:', err);
            }
        }
        this.cachedDevices = [];
        return [];
    }
    /**
     * Records a device launch event with exact timestamp, hour, date, and increments total launch count.
     */
    async recordDeviceLaunch(info) {
        const list = await this.getTrackedDevices();
        const now = Date.now();
        const dateObj = new Date(now);
        const formattedTime = dateObj.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        const formattedDate = dateObj.toLocaleDateString(undefined, {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        const launchRecord = {
            id: `launch_${now}_${Math.random().toString(36).substring(2, 6)}`,
            timestamp: now,
            formattedTime,
            formattedDate
        };
        const existingIndex = list.findIndex((d) => d.deviceId === info.deviceId);
        let updatedDevice;
        if (existingIndex >= 0) {
            const existing = list[existingIndex];
            updatedDevice = {
                ...existing,
                deviceName: info.deviceName || existing.deviceName,
                os: info.os || existing.os,
                browser: info.browser || existing.browser,
                screenResolution: info.screenResolution || existing.screenResolution,
                launchCount: existing.launchCount + 1,
                lastOpenedAt: now,
                isOnline: true,
                launchHistory: [launchRecord, ...existing.launchHistory].slice(0, 100)
            };
            list[existingIndex] = updatedDevice;
        }
        else {
            updatedDevice = {
                deviceId: info.deviceId,
                deviceName: info.deviceName,
                os: info.os,
                browser: info.browser,
                screenResolution: info.screenResolution,
                launchCount: 1,
                firstOpenedAt: now,
                lastOpenedAt: now,
                isOnline: true,
                launchHistory: [launchRecord]
            };
            list.unshift(updatedDevice);
        }
        // Sort so most recently active device is on top
        const sorted = [...list].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
        this.cachedDevices = sorted;
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(DEVICES_KEY, JSON.stringify(sorted));
            }
            catch (err) {
                console.error('Failed to save device tracking to localStorage:', err);
            }
            if (this.broadcastChannel) {
                try {
                    this.broadcastChannel.postMessage({
                        type: 'DEVICES_UPDATED',
                        devices: sorted
                    });
                }
                catch (e) {
                    console.warn('BroadcastChannel devices error:', e);
                }
            }
        }
        this.notifyDeviceListeners(sorted);
        return updatedDevice;
    }
    /**
     * Updates device heartbeat / online status.
     */
    async updateDeviceHeartbeat(deviceId, isOnline) {
        const list = await this.getTrackedDevices();
        const idx = list.findIndex((d) => d.deviceId === deviceId);
        if (idx >= 0) {
            list[idx] = {
                ...list[idx],
                isOnline,
                lastOpenedAt: isOnline ? Date.now() : list[idx].lastOpenedAt
            };
            this.cachedDevices = [...list];
            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem(DEVICES_KEY, JSON.stringify(list));
                }
                catch { }
                if (this.broadcastChannel) {
                    try {
                        this.broadcastChannel.postMessage({
                            type: 'DEVICES_UPDATED',
                            devices: list
                        });
                    }
                    catch { }
                }
            }
            this.notifyDeviceListeners(list);
        }
    }
    /**
     * Deletes a tracked device from the log.
     */
    async deleteTrackedDevice(deviceId) {
        const list = await this.getTrackedDevices();
        const updated = list.filter((d) => d.deviceId !== deviceId);
        this.cachedDevices = updated;
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(DEVICES_KEY, JSON.stringify(updated));
            }
            catch { }
            if (this.broadcastChannel) {
                try {
                    this.broadcastChannel.postMessage({
                        type: 'DEVICES_UPDATED',
                        devices: updated
                    });
                }
                catch { }
            }
        }
        this.notifyDeviceListeners(updated);
    }
    /**
     * Clears all tracked devices from the log.
     */
    async clearTrackedDevices() {
        this.cachedDevices = [];
        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem(DEVICES_KEY);
            }
            catch { }
            if (this.broadcastChannel) {
                try {
                    this.broadcastChannel.postMessage({
                        type: 'DEVICES_UPDATED',
                        devices: []
                    });
                }
                catch { }
            }
        }
        this.notifyDeviceListeners([]);
    }
    /**
     * Subscribes to real-time updates of tracked devices.
     */
    subscribeDevices(callback) {
        this.deviceListeners.add(callback);
        return () => {
            this.deviceListeners.delete(callback);
        };
    }
    mergeWithDefaults(saved) {
        const legacyBranding = false;
        const legacyCaller = false;
        return {
            callerName: legacyCaller ? '' : (saved.callerName || DEFAULT_CONFIG.callerName),
            callerPhone: legacyCaller ? '' : (saved.callerPhone || DEFAULT_CONFIG.callerPhone),
            callerImage: legacyCaller ? '' : (saved.callerImage || DEFAULT_CONFIG.callerImage),
            voiceAudio: legacyCaller ? null : (saved.voiceAudio !== undefined ? saved.voiceAudio : DEFAULT_CONFIG.voiceAudio),
            ringtone: saved.ringtone || DEFAULT_CONFIG.ringtone,
            callSettings: {
                ...DEFAULT_CONFIG.callSettings,
                ...(saved.callSettings || {})
            },
            branding: legacyBranding ? { ...DEFAULT_CONFIG.branding } : {
                ...DEFAULT_CONFIG.branding,
                ...(saved.branding || {})
            },
            updatedAt: saved.updatedAt || Date.now()
        };
    }
}
export const sharedStorage = new CrossPlatformStorageService();
