import { DEFAULT_CONFIG, normalizeConfig } from './defaults.js';
export class ConfigConflictError extends Error {
    latest;
    constructor(message, latest) {
        super(message);
        this.name = 'ConfigConflictError';
        this.latest = latest;
    }
}
/**
 * Configuration-only client. It deliberately has no localStorage or direct
 * database access: /api/config is the one authoritative read/write boundary.
 */
class ServerConfigService {
    listeners = new Set();
    latest = null;
    poller = null;
    pollInFlight = false;
    apiUrl(path = '') {
        const configuredOrigin = import.meta.env?.VITE_CONFIG_API_ORIGIN;
        // Packaged WebViews have a file:// origin and therefore require the deployed API origin.
        const origin = configuredOrigin ? configuredOrigin.replace(/\/$/, '') : '';
        return `${origin}/api/config${path}`;
    }
    async request(path = '') {
        const sep = path.includes('?') ? '&' : '?';
        return fetch(`${this.apiUrl(path)}${sep}_t=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' }
        });
    }
    publish(config) {
        this.latest = config;
        this.listeners.forEach((listener) => listener(config));
    }
    async getConfig(configId = 'main') {
        const response = await this.request(`?configId=${encodeURIComponent(configId)}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok)
            throw new Error(payload.error || `Configuration load failed (${response.status})`);
        // Defaults are used only when the database truly has no record; they are never saved automatically.
        const config = payload.status === 'no_config_yet' ? normalizeConfig(DEFAULT_CONFIG) : normalizeConfig(payload.config);
        if (config.id !== configId)
            throw new Error('Configuration response did not match the requested link');
        this.latest = config;
        return config;
    }
    async saveConfig(config) {
        const adminKey = import.meta.env?.VITE_ADMIN_API_KEY;
        const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' };
        if (adminKey)
            headers.Authorization = `Bearer ${adminKey}`;
        const response = await fetch(this.apiUrl(), {
            method: 'POST',
            cache: 'no-store',
            headers,
            body: JSON.stringify({ configId: config.id || 'main', baseVersion: config.version, config })
        });
        const payload = await response.json().catch(() => ({}));
        if (response.status === 409) {
            if (payload.config && typeof payload.config.version === 'number') {
                const retryRes = await fetch(this.apiUrl(), {
                    method: 'POST',
                    cache: 'no-store',
                    headers,
                    body: JSON.stringify({ configId: config.id || 'main', baseVersion: payload.config.version, config: { ...config, version: payload.config.version } })
                });
                const retryPayload = await retryRes.json().catch(() => ({}));
                if (retryRes.ok && retryPayload.config) {
                    const canonical = normalizeConfig(retryPayload.config);
                    this.publish(canonical);
                    return canonical;
                }
            }
            throw new ConfigConflictError(payload.error || 'This configuration was changed elsewhere', payload.config ? normalizeConfig(payload.config) : null);
        }
        if (!response.ok || !payload.config)
            throw new Error(payload.error || `Configuration save failed (${response.status})`);
        const canonical = normalizeConfig(payload.config);
        this.publish(canonical);
        return canonical;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        if (this.poller === null && typeof window !== 'undefined') {
            this.poller = window.setInterval(() => this.refreshIfNewer(), 2500);
            window.addEventListener('focus', this.refreshIfNewer);
            window.addEventListener('online', this.refreshIfNewer);
            document.addEventListener('visibilitychange', this.onVisibilityChange);
        }
        return () => {
            this.listeners.delete(listener);
            if (!this.listeners.size)
                this.stopPolling();
        };
    }
    onVisibilityChange = () => {
        if (document.visibilityState === 'visible')
            void this.refreshIfNewer();
    };
    stopPolling() {
        if (this.poller !== null)
            window.clearInterval(this.poller);
        this.poller = null;
        window.removeEventListener('focus', this.refreshIfNewer);
        window.removeEventListener('online', this.refreshIfNewer);
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
    refreshIfNewer = async () => {
        if (this.pollInFlight)
            return;
        this.pollInFlight = true;
        try {
            const before = this.latest;
            const incoming = await this.getConfig(before?.id || 'main');
            if (!before || incoming.version > before.version || incoming.updatedAt > (before.updatedAt || 0)) {
                this.publish(incoming);
            }
        }
        catch {
            // A polling failure must never replace the live UI with defaults.
        }
        finally {
            this.pollInFlight = false;
        }
    };
}
export const configService = new ServerConfigService();
