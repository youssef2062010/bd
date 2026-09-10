import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

function mapDbRow(row: any): FakeCallConfig | null {
  if (!row || typeof row !== 'object') return null;
  return normalizeConfig({
    id: row.id || 'main',
    version: Number(row.version || 1),
    callerName: row.caller_name || '',
    callerPhone: row.caller_phone || '',
    callerImage: row.caller_image || '',
    voiceAudio: row.voice_audio || null,
    ringtone: row.ringtone,
    callSettings: row.call_settings,
    branding: row.branding,
    updatedAt: Number(row.updated_at || Date.now())
  });
}

/**
 * Authoritative client configuration service.
 * Dual-layer synchronization:
 * 1. Supabase Realtime WebSocket push for instant (<100ms) live updates.
 * 2. HTTP polling (2.5s) + window focus + visibility + online reconnect fallback.
 * 3. LocalStorage cache for instant (0ms) startup and offline resilience.
 */
class ServerConfigService {
  private readonly listeners = new Set<(config: FakeCallConfig) => void>();
  private latest: FakeCallConfig | null = null;
  private poller: number | null = null;
  private pollInFlight = false;
  private supabaseClient: SupabaseClient | null = null;
  private realtimeChannel: any = null;

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
    this.listeners.forEach((listener) => {
      try {
        listener(config);
      } catch (err) {
        console.error('Config listener error:', err);
      }
    });
  }

  private initRealtime(): void {
    if (this.realtimeChannel || typeof window === 'undefined') return;
    try {
      const url =
        (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
        (import.meta as any).env?.VITE_SUPABASE_URL ||
        'https://zixeyymkpemzjzesmcpq.supabase.co';
      const key =
        (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_PUBLISHABLE_KEY || process.env?.VITE_SUPABASE_ANON_KEY)) ||
        (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
        (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppeGV5eW1rcGVtemp6ZXNtY3BxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5OTU5NjIsImV4cCI6MjEwNDU3MTk2Mn0.mqYcCXqfUdMRKwrrWk24A9P7ShEClvKtimZHThKYGMQ';

      if (url && key) {
        this.supabaseClient = createClient(url, key, {
          auth: { persistSession: false },
          realtime: { params: { eventsPerSecond: 10 } }
        });

        this.realtimeChannel = this.supabaseClient
          .channel('public:fakecall_config')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'fakecall_config' },
            (payload: any) => {
              if (payload?.new) {
                const incoming = mapDbRow(payload.new);
                if (
                  incoming &&
                  (!this.latest || incoming.version > this.latest.version || incoming.updatedAt > (this.latest.updatedAt || 0))
                ) {
                  try {
                    localStorage.setItem('fakecall_config_cache', JSON.stringify(incoming));
                  } catch {}
                  this.publish(incoming);
                }
              }
            }
          )
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              void this.refreshIfNewer();
            }
          });
      }
    } catch (e) {
      console.warn('Realtime channel notice:', e);
    }
  }

  async getConfig(configId = 'main'): Promise<FakeCallConfig> {
    const response = await this.request(`?configId=${encodeURIComponent(configId)}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Configuration load failed (${response.status})`);
    // Defaults are used only when the database truly has no record; they are never saved automatically.
    const config = payload.status === 'no_config_yet' ? normalizeConfig(DEFAULT_CONFIG) : normalizeConfig(payload.config);
    if (config.id !== configId) throw new Error('Configuration response did not match the requested link');
    this.latest = config;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('fakecall_config_cache', JSON.stringify(config));
      }
    } catch {}
    return config;
  }

  async saveConfig(config: FakeCallConfig): Promise<FakeCallConfig> {
    const adminKey = (import.meta as any).env?.VITE_ADMIN_API_KEY as string | undefined;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store',
      Pragma: 'no-cache'
    };
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
          body: JSON.stringify({
            configId: config.id || 'main',
            baseVersion: payload.config.version,
            config: { ...config, version: payload.config.version }
          })
        });
        const retryPayload = await retryRes.json().catch(() => ({}));
        if (retryRes.ok && retryPayload.config) {
          const canonical = normalizeConfig(retryPayload.config);
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('fakecall_config_cache', JSON.stringify(canonical));
            }
          } catch {}
          this.publish(canonical);
          return canonical;
        }
      }
      throw new ConfigConflictError(
        payload.error || 'This configuration was changed elsewhere',
        payload.config ? normalizeConfig(payload.config) : null
      );
    }

    if (!response.ok || !payload.config) {
      throw new Error(payload.error || `Configuration save failed (${response.status})`);
    }

    const canonical = normalizeConfig(payload.config);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('fakecall_config_cache', JSON.stringify(canonical));
      }
    } catch {}
    this.publish(canonical);
    return canonical;
  }

  subscribe(listener: (config: FakeCallConfig) => void): () => void {
    this.listeners.add(listener);
    this.initRealtime();

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

    if (this.realtimeChannel && this.supabaseClient) {
      try {
        this.supabaseClient.removeChannel(this.realtimeChannel);
      } catch {}
      this.realtimeChannel = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', this.refreshIfNewer);
      window.removeEventListener('online', this.refreshIfNewer);
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  private refreshIfNewer = async (): Promise<void> => {
    if (this.pollInFlight) return;
    this.pollInFlight = true;
    try {
      const before = this.latest;
      const incoming = await this.getConfig(before?.id || 'main');
      if (!before || incoming.version > before.version || incoming.updatedAt > (before.updatedAt || 0)) {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('fakecall_config_cache', JSON.stringify(incoming));
          }
        } catch {}
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
