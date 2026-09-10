import { DEFAULT_CONFIG, normalizeConfig } from './defaults.js';
import type { FakeCallConfig } from './types.js';

export class ConfigConflictError extends Error {
  public readonly latest: FakeCallConfig | null;
  constructor(message: string, latest: FakeCallConfig | null) {
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
  private readonly listeners = new Set<(config: FakeCallConfig) => void>();
  private latest: FakeCallConfig | null = null;
  private poller: number | null = null;
  private pollInFlight = false;

  private apiUrl(path = ''): string {
    const configuredOrigin = (import.meta as any).env?.VITE_CONFIG_API_ORIGIN as string | undefined;
    // Packaged WebViews have a file:// origin and therefore require the deployed API origin.
    const origin = configuredOrigin ? configuredOrigin.replace(/\/$/, '') : '';
    return `${origin}/api/config${path}`;
  }

  private async request(path = ''): Promise<Response> {
    const sep = path.includes('?') ? '&' : '?';
    return fetch(`${this.apiUrl(path)}${sep}_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' }
    });
  }

  private publish(config: FakeCallConfig): void {
    this.latest = config;
    this.listeners.forEach((listener) => listener(config));
  }

  async getConfig(configId = 'main'): Promise<FakeCallConfig> {
    const response = await this.request(`?configId=${encodeURIComponent(configId)}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Configuration load failed (${response.status})`);
    // Defaults are used only when the database truly has no record; they are never saved automatically.
    const config = payload.status === 'no_config_yet' ? normalizeConfig(DEFAULT_CONFIG) : normalizeConfig(payload.config);
    if (config.id !== configId) throw new Error('Configuration response did not match the requested link');
    this.latest = config;
    return config;
  }

  async saveConfig(config: FakeCallConfig): Promise<FakeCallConfig> {
    const adminKey = (import.meta as any).env?.VITE_ADMIN_API_KEY as string | undefined;
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' };
    if (adminKey) headers.Authorization = `Bearer ${adminKey}`;
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
    if (!response.ok || !payload.config) throw new Error(payload.error || `Configuration save failed (${response.status})`);
    const canonical = normalizeConfig(payload.config);
    this.publish(canonical);
    return canonical;
  }

  subscribe(listener: (config: FakeCallConfig) => void): () => void {
    this.listeners.add(listener);
    if (this.poller === null && typeof window !== 'undefined') {
      this.poller = window.setInterval(() => this.refreshIfNewer(), 2500);
      window.addEventListener('focus', this.refreshIfNewer);
      window.addEventListener('online', this.refreshIfNewer);
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) this.stopPolling();
    };
  }

  private onVisibilityChange = () => {
    if (document.visibilityState === 'visible') void this.refreshIfNewer();
  };

  private stopPolling(): void {
    if (this.poller !== null) window.clearInterval(this.poller);
    this.poller = null;
    window.removeEventListener('focus', this.refreshIfNewer);
    window.removeEventListener('online', this.refreshIfNewer);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private refreshIfNewer = async (): Promise<void> => {
    if (this.pollInFlight) return;
    this.pollInFlight = true;
    try {
      const before = this.latest;
      const incoming = await this.getConfig(before?.id || 'main');
      if (!before || incoming.version > before.version || incoming.updatedAt > (before.updatedAt || 0)) {
        this.publish(incoming);
      }
    } catch {
      // A polling failure must never replace the live UI with defaults.
    } finally {
      this.pollInFlight = false;
    }
  };
}

export const configService = new ServerConfigService();
