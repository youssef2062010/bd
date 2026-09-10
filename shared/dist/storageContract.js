import { DEFAULT_CONFIG, nextConfigVersion, normalizeConfig } from './defaults.js';
import { supabase } from './supabaseClient.js';
const STORAGE_KEY = 'fake_call_system_config_v2';
const RECORDINGS_KEY = 'fake_call_recordings_archive_v2';
const DEVICES_KEY = 'fake_call_devices_tracking_v2';
const CHANNEL_NAME = 'fake_call_sync_broadcast';
const CLOUD_API_SYNC = '/api/sync';
/**
 * Admin API key — injected at build time via VITE_ADMIN_API_KEY env variable.
 */
const ADMIN_API_KEY = typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_API_KEY
    ? import.meta.env.VITE_ADMIN_API_KEY
    : undefined;
/**
 * Cross-platform persistent storage adapter with real-time multi-window / multi-app synchronization.
 * Backed by Supabase with automatic real-time subscriptions, offline LocalStorage, and native bridges.
 */
class CrossPlatformStorageService {
    broadcastChannel = null;
    listeners = new Set();
    recordingListeners = new Set();
    deviceListeners = new Set();
    cachedConfig = null;
    cachedRecordings = null;
    cachedDevices = null;
    constructor() {
        this.initSyncChannel();
    }
    mapRowToConfig(row) {
        return normalizeConfig({
            version: Number(row.version || 1),
            callerName: row.caller_name || '',
            callerPhone: row.caller_phone || '',
            callerImage: row.caller_image || '',
            voiceAudio: row.voice_audio || null,
            ringtone: row.ringtone || DEFAULT_CONFIG.ringtone,
            callSettings: row.call_settings || DEFAULT_CONFIG.callSettings,
            branding: row.branding || DEFAULT_CONFIG.branding,
            updatedAt: Number(row.updated_at || Date.now())
        });
    }
    mapConfigToRow(config) {
        return {
            id: 'main',
            version: config.version,
            caller_name: config.callerName,
            caller_phone: config.callerPhone,
            caller_image: config.callerImage,
            voice_audio: config.voiceAudio,
            ringtone: config.ringtone,
            call_settings: config.callSettings,
            branding: config.branding,
            updated_at: config.updatedAt
        };
    }
    async readApiConfig() {
        try {
            const apiRes = await fetch(CLOUD_API_SYNC, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache, no-store' }
            });
            if (!apiRes.ok)
                return null;
            const apiData = await apiRes.json();
            if (!apiData || apiData.status === 'no_config_yet')
                return null;
            return normalizeConfig(apiData);
        }
        catch {
            return null;
        }
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
        // 2. Supabase Real-Time Subscriptions for instant synchronization across all devices
        if (typeof window !== 'undefined' && supabase) {
            try {
                supabase
                    .channel('fakecall_config_realtime')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'fakecall_config' }, (payload) => {
                    const row = payload.new;
                    if (row && row.id === 'main') {
                        const incoming = this.mapRowToConfig(row);
                        if (!this.cachedConfig || incoming.updatedAt >= (this.cachedConfig.updatedAt || 0)) {
                            this.cachedConfig = incoming;
                            try {
                                localStorage.setItem(STORAGE_KEY, JSON.stringify(incoming));
                            }
                            catch { }
                            this.notifyListeners(incoming);
                        }
                    }
                })
                    .subscribe();
                supabase
                    .channel('fakecall_devices_realtime')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'fakecall_devices' }, () => {
                    this.pullLatestDevices().catch(() => { });
                })
                    .subscribe();
                supabase
                    .channel('fakecall_recordings_realtime')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'fakecall_recordings' }, () => {
                    this.pullLatestRecordings().catch(() => { });
                })
                    .subscribe();
            }
            catch (e) {
                console.warn('Supabase Realtime subscription error:', e);
            }
        }
        if (typeof window !== 'undefined') {
            // Re-sync from Supabase when app returns to foreground
            window.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    this.pullLatestCloudConfig().catch(() => { });
                    this.pullLatestDevices().catch(() => { });
                    this.pullLatestRecordings().catch(() => { });
                }
            });
            window.addEventListener('focus', () => {
                this.pullLatestCloudConfig().catch(() => { });
            });
            window.addEventListener('online', () => {
                this.pullLatestCloudConfig().catch(() => { });
            });
            // Regular polling heartbeat to ensure data is always up to date
            window.setInterval(() => {
                this.pullLatestCloudConfig().catch(() => { });
            }, 3000);
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
     * Pulls the latest configuration from Supabase (or fallback API endpoint).
     */
    async pullLatestCloudConfig() {
        try {
            const { data, error } = await supabase
                .from('fakecall_config')
                .select('*')
                .eq('id', 'main')
                .maybeSingle();
            if (!error && data) {
                const merged = this.mapRowToConfig(data);
                const isNewer = !this.cachedConfig ||
                    merged.version > this.cachedConfig.version ||
                    merged.updatedAt > (this.cachedConfig.updatedAt || 0);
                if (isNewer) {
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
        catch {
            // Continue to the API fallback below.
        }
        const apiConfig = await this.readApiConfig();
        if (apiConfig) {
            const isNewer = !this.cachedConfig ||
                apiConfig.version > this.cachedConfig.version ||
                apiConfig.updatedAt > (this.cachedConfig.updatedAt || 0);
            if (isNewer) {
                this.cachedConfig = apiConfig;
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(apiConfig));
                }
                catch { }
                this.notifyListeners(apiConfig);
                return apiConfig;
            }
        }
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
     * Checks Supabase first, then local persistence and defaults.
     */
    async getConfig() {
        if (this.cachedConfig) {
            this.pullLatestCloudConfig().catch(() => { });
            return this.cachedConfig;
        }
        // 1. First attempt: Read directly from Supabase
        let cloudReadSucceeded = false;
        try {
            const { data, error } = await supabase
                .from('fakecall_config')
                .select('*')
                .eq('id', 'main')
                .maybeSingle();
            if (!error && data) {
                const cloudConfig = this.mapRowToConfig(data);
                this.cachedConfig = cloudConfig;
                cloudReadSucceeded = true;
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudConfig));
                }
                catch { }
                return cloudConfig;
            }
        }
        catch (e) {
            console.warn('Initial Supabase fetch error, checking local fallback:', e);
        }
        if (!cloudReadSucceeded) {
            const apiConfig = await this.readApiConfig();
            if (apiConfig) {
                this.cachedConfig = apiConfig;
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(apiConfig));
                }
                catch { }
                return apiConfig;
            }
        }
        // 2. Second attempt: Check native bridge & LocalStorage
        if (typeof window !== 'undefined') {
            const win = window;
            if (win.FakeCallAndroidBridge?.getConfigJson) {
                try {
                    const raw = win.FakeCallAndroidBridge.getConfigJson();
                    if (raw) {
                        const parsed = normalizeConfig(JSON.parse(raw));
                        this.cachedConfig = parsed;
                        this.pullLatestCloudConfig().catch(() => { });
                        return this.cachedConfig;
                    }
                }
                catch (e) {
                    console.warn('Android bridge read error:', e);
                }
            }
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) {
                    const parsed = normalizeConfig(JSON.parse(raw));
                    this.cachedConfig = parsed;
                    this.pullLatestCloudConfig().catch(() => { });
                    return this.cachedConfig;
                }
            }
            catch (err) {
                console.warn('LocalStorage read error:', err);
            }
        }
        this.cachedConfig = normalizeConfig(DEFAULT_CONFIG);
        return this.cachedConfig;
    }
    /**
     * Saves the configuration directly to Supabase and broadcasts the update.
     */
    async saveConfig(config) {
        const current = this.cachedConfig ?? normalizeConfig(await this.getConfig().catch(() => DEFAULT_CONFIG));
        const updated = normalizeConfig({
            ...config,
            version: nextConfigVersion(current.version),
            updatedAt: Date.now()
        });
        this.cachedConfig = updated;
        // 1. Local caching and BroadcastChannel
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            }
            catch (err) {
                console.warn('LocalStorage write warning:', err);
            }
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
        }
        // 2. Direct Supabase Upsert, then the server sync endpoint
        let cloudSaved = false;
        try {
            const row = this.mapConfigToRow(updated);
            const { error } = await supabase.from('fakecall_config').upsert(row);
            if (error) {
                console.error('Supabase save error:', error);
                throw error;
            }
            cloudSaved = true;
        }
        catch (error) {
            console.warn('Supabase direct save failed, falling back to /api/sync:', error);
            try {
                const headers = {
                    'Content-Type': 'application/json'
                };
                if (ADMIN_API_KEY) {
                    headers['Authorization'] = `Bearer ${ADMIN_API_KEY}`;
                }
                const apiRes = await fetch(CLOUD_API_SYNC, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(updated)
                });
                if (!apiRes.ok) {
                    throw new Error(`Sync API save failed with status ${apiRes.status}`);
                }
                cloudSaved = true;
            }
            catch { }
        }
        if (!cloudSaved) {
            throw new Error('Cloud save failed. The change is kept locally and will retry when sync is available.');
        }
        // 3. Native WebView bridges
        if (typeof window !== 'undefined') {
            const win = window;
            if (win.FakeCallAndroidBridge?.saveConfigJson) {
                try {
                    win.FakeCallAndroidBridge.saveConfigJson(JSON.stringify(updated));
                }
                catch (e) {
                    console.warn('Android bridge save error:', e);
                }
            }
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
     * Pulls latest recordings from Supabase.
     */
    async pullLatestRecordings() {
        try {
            const { data, error } = await supabase
                .from('fakecall_recordings')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(50);
            if (!error && data) {
                const items = data.map((r) => ({
                    id: r.id,
                    callerName: r.caller_name || '',
                    callerPhone: r.caller_phone || '',
                    callerImage: r.caller_image || '',
                    timestamp: Number(r.timestamp),
                    durationSeconds: Number(r.duration_seconds || 0),
                    audioDataUri: r.audio_data_uri || '',
                    fileName: r.file_name || '',
                    fileSizeText: r.file_size_text || '',
                    mimeType: r.mime_type || 'audio/webm'
                }));
                this.cachedRecordings = items;
                try {
                    localStorage.setItem(RECORDINGS_KEY, JSON.stringify(items));
                }
                catch { }
                this.notifyRecordingListeners(items);
                return items;
            }
        }
        catch { }
        return this.cachedRecordings || [];
    }
    /**
     * Retrieves all saved call recordings.
     */
    async getRecordings() {
        if (this.cachedRecordings && this.cachedRecordings.length > 0) {
            this.pullLatestRecordings().catch(() => { });
            return this.cachedRecordings;
        }
        const fetched = await this.pullLatestRecordings();
        if (fetched && fetched.length > 0) {
            return fetched;
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
            catch { }
        }
        this.cachedRecordings = [];
        return [];
    }
    /**
     * Saves a new call recording item to Supabase & offline storage.
     */
    async saveRecording(recording) {
        const list = await this.getRecordings();
        const updated = [recording, ...list.filter((r) => r.id !== recording.id)].slice(0, 50);
        this.cachedRecordings = updated;
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(RECORDINGS_KEY, JSON.stringify(updated));
            }
            catch { }
            if (this.broadcastChannel) {
                try {
                    this.broadcastChannel.postMessage({
                        type: 'RECORDINGS_UPDATED',
                        recordings: updated
                    });
                }
                catch { }
            }
        }
        try {
            await supabase.from('fakecall_recordings').upsert({
                id: recording.id,
                caller_name: recording.callerName,
                caller_phone: recording.callerPhone,
                caller_image: recording.callerImage,
                timestamp: recording.timestamp,
                duration_seconds: recording.durationSeconds,
                audio_data_uri: recording.audioDataUri,
                file_name: recording.fileName,
                file_size_text: recording.fileSizeText,
                mime_type: recording.mimeType
            });
        }
        catch (e) {
            console.warn('Supabase save recording error:', e);
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
            catch { }
            if (this.broadcastChannel) {
                try {
                    this.broadcastChannel.postMessage({
                        type: 'RECORDINGS_UPDATED',
                        recordings: updated
                    });
                }
                catch { }
            }
        }
        try {
            await supabase.from('fakecall_recordings').delete().eq('id', id);
        }
        catch (e) {
            console.warn('Supabase delete recording error:', e);
        }
        this.notifyRecordingListeners(updated);
    }
    subscribeRecordings(callback) {
        this.recordingListeners.add(callback);
        return () => {
            this.recordingListeners.delete(callback);
        };
    }
    /**
     * Pulls latest tracked devices from Supabase.
     */
    async pullLatestDevices() {
        try {
            const { data, error } = await supabase
                .from('fakecall_devices')
                .select('*')
                .order('last_seen', { ascending: false });
            if (!error && data) {
                const devices = data.map((d) => {
                    const info = d.device_info || {};
                    return {
                        deviceId: d.id,
                        deviceName: info.deviceName || d.platform || 'Phone',
                        os: info.os || d.os || '',
                        browser: info.browser || d.browser || '',
                        screenResolution: info.screenResolution || '',
                        launchCount: Number(d.launch_count || 1),
                        firstOpenedAt: Number(info.firstOpenedAt || d.last_seen),
                        lastOpenedAt: Number(d.last_seen || Date.now()),
                        isOnline: Boolean(d.is_online),
                        launchHistory: Array.isArray(info.launchHistory) ? info.launchHistory : []
                    };
                });
                this.cachedDevices = devices;
                try {
                    localStorage.setItem(DEVICES_KEY, JSON.stringify(devices));
                }
                catch { }
                this.notifyDeviceListeners(devices);
                return devices;
            }
        }
        catch { }
        return this.cachedDevices || [];
    }
    /**
     * Retrieves the list of all tracked devices that have launched the app.
     */
    async getTrackedDevices() {
        if (this.cachedDevices && this.cachedDevices.length > 0) {
            this.pullLatestDevices().catch(() => { });
            return this.cachedDevices;
        }
        const fetched = await this.pullLatestDevices();
        if (fetched && fetched.length > 0) {
            return fetched;
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
            catch { }
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
        const sorted = [...list].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
        this.cachedDevices = sorted;
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(DEVICES_KEY, JSON.stringify(sorted));
            }
            catch { }
            if (this.broadcastChannel) {
                try {
                    this.broadcastChannel.postMessage({
                        type: 'DEVICES_UPDATED',
                        devices: sorted
                    });
                }
                catch { }
            }
        }
        try {
            await supabase.from('fakecall_devices').upsert({
                id: info.deviceId,
                platform: info.deviceName || '',
                browser: info.browser || '',
                os: info.os || '',
                is_online: true,
                last_seen: now,
                launch_count: updatedDevice.launchCount,
                device_info: updatedDevice
            });
        }
        catch (e) {
            console.warn('Supabase device upsert error:', e);
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
            try {
                await supabase.from('fakecall_devices').update({
                    is_online: isOnline,
                    last_seen: Date.now()
                }).eq('id', deviceId);
            }
            catch { }
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
        try {
            await supabase.from('fakecall_devices').delete().eq('id', deviceId);
        }
        catch { }
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
        try {
            await supabase.from('fakecall_devices').delete().neq('id', '');
        }
        catch { }
        this.notifyDeviceListeners([]);
    }
    subscribeDevices(callback) {
        this.deviceListeners.add(callback);
        return () => {
            this.deviceListeners.delete(callback);
        };
    }
}
export const sharedStorage = new CrossPlatformStorageService();
