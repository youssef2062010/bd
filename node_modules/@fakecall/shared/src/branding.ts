import { supabase } from './supabaseClient.js';

export interface AppBranding {
    appName: string;
    appIconUrl: string;
    appIcon: string;
    updatedAt: number;
}

export const DEFAULT_APP_BRANDING: AppBranding = {
    appName: '',
    appIconUrl: '',
    appIcon: '',
    updatedAt: 0
};

const BRANDING_CACHE_KEY = 'fake_call_app_branding_v2';
const BRANDING_API = '/api/branding';

function normalizeBranding(value: unknown): AppBranding {
    const input = value && typeof value === 'object' ? value as Partial<AppBranding> : {};
    return {
        appName: typeof input.appName === 'string' && input.appName.trim() ? input.appName.trim() : DEFAULT_APP_BRANDING.appName,
        appIconUrl: typeof input.appIconUrl === 'string' ? input.appIconUrl : DEFAULT_APP_BRANDING.appIconUrl,
        appIcon: typeof input.appIcon === 'string' ? input.appIcon : DEFAULT_APP_BRANDING.appIcon,
        updatedAt: typeof input.updatedAt === 'number' ? input.updatedAt : 0
    };
}

export async function getAppBranding(): Promise<AppBranding> {
    try {
        const { data, error } = await supabase
            .from('fakecall_config')
            .select('branding, updated_at')
            .eq('id', 'main')
            .maybeSingle();
        if (!error && data?.branding) {
            const branding = normalizeBranding({
                appName: data.branding.appDisplayName,
                appIcon: data.branding.appIcon,
                appIconUrl: data.branding.customIconUri,
                updatedAt: Number(data.updated_at || Date.now())
            });
            try { localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(branding)); } catch { }
            return branding;
        }
    } catch { }

    try {
        const response = await fetch(BRANDING_API, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
        if (response.ok) {
            const branding = normalizeBranding(await response.json());
            try { localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(branding)); } catch { /* storage is optional */ }
            return branding;
        }
    } catch { /* use the cache/default below */ }

    try {
        const cached = localStorage.getItem(BRANDING_CACHE_KEY);
        if (cached) return normalizeBranding(JSON.parse(cached));
    } catch { /* use defaults */ }
    return DEFAULT_APP_BRANDING;
}

export async function saveAppBranding(branding: Pick<AppBranding, 'appName' | 'appIconUrl' | 'appIcon'>): Promise<AppBranding> {
    const adminKey = (import.meta as any).env?.VITE_ADMIN_API_KEY as string | undefined;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminKey) {
        headers.Authorization = `Bearer ${adminKey}`;
    }

    const normalized = normalizeBranding({
        ...branding,
        updatedAt: Date.now()
    });

    try {
        await supabase
            .from('fakecall_config')
            .update({
                branding: {
                    appDisplayName: normalized.appName,
                    appIcon: normalized.appIcon,
                    customIconUri: normalized.appIconUrl || undefined
                },
                updated_at: normalized.updatedAt
            })
            .eq('id', 'main');
    } catch (e) {
        console.warn('Supabase branding update error:', e);
    }

    try {
        const response = await fetch(BRANDING_API, { method: 'POST', headers, body: JSON.stringify(branding) });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
            const saved = normalizeBranding(payload.branding || payload || branding);
            try { localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(saved)); } catch { }
            return saved;
        }
    } catch (e) {
        console.warn('saveAppBranding network error:', e);
    }

    try { localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(normalized)); } catch { }
    return normalized;
}

export async function uploadAppIcon(dataUrl: string): Promise<string> {
    const adminKey = (import.meta as any).env?.VITE_ADMIN_API_KEY as string | undefined;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminKey) {
        headers.Authorization = `Bearer ${adminKey}`;
    }
    try {
        const response = await fetch(`${BRANDING_API}/icon`, { method: 'POST', headers, body: JSON.stringify({ dataUrl }) });
        if (response.ok) {
            const payload = await response.json().catch(() => ({}));
            return normalizeBranding(payload.branding || payload).appIconUrl || dataUrl;
        }
    } catch (e) {
        console.warn('uploadAppIcon network error:', e);
    }
    return dataUrl;
}