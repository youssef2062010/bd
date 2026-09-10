/* eslint-disable @typescript-eslint/no-unused-vars */
import { createClient } from '@supabase/supabase-js';
import { put } from '@vercel/blob';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const DEFAULT_BRANDING = { appName: '', appIconUrl: '', appIcon: '', updatedAt: 0 };
const MAX_ICON_BYTES = 10 * 1024 * 1024;
let memoryBranding = { ...DEFAULT_BRANDING };

const presetColors = {
  'phone-green': ['#10b981', '#0d9488'],
  'phone-classic': ['#2563eb', '#4f46e5'],
  'phone-dark': ['#334155', '#020617'],
  'phone-gold': ['#f59e0b', '#d97706'],
};

function getPresetIcon(appIcon) {
  const [start, end] = presetColors[appIcon] || presetColors['phone-green'];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${start}"/><stop offset="100%" stop-color="${end}"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#g)"/><path d="M19 16c2.5 0 4 3 4.8 4.6.6 1.3.4 2.7-.6 3.7l-2 2c2 3.8 5 6.8 8.8 8.8l2-2c1-.9 2.4-1.2 3.7-.6 1.6.8 4.6 2.3 4.6 4.8 0 3.3-2.6 6-5.8 6-12.7 0-23-10.3-23-23 0-3.2 2.6-5.8 6-5.8z" fill="#fff"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function normalizeBranding(input) {
  const base = { ...DEFAULT_BRANDING, ...(input || {}) };
  const appName = typeof base.appName === 'string' && base.appName.trim() ? base.appName.trim() : DEFAULT_BRANDING.appName;
  return {
    appName: appName.slice(0, 40),
    appIconUrl: typeof base.appIconUrl === 'string' ? base.appIconUrl : '',
    appIcon: ['phone-green', 'phone-classic', 'phone-dark', 'phone-gold', 'custom'].includes(base.appIcon) ? base.appIcon : (base.appIconUrl ? 'custom' : ''),
    updatedAt: typeof base.updatedAt === 'number' ? base.updatedAt : Date.now()
  };
}

function adminAuthorized(req) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) return true;
  const provided = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  return provided === expected;
}

function validateBranding(input) {
  let appName = typeof input?.appName === 'string' ? input.appName.trim() : (typeof input?.appDisplayName === 'string' ? input.appDisplayName.trim() : '');
  if (!appName) appName = '';
  if (appName.length > 40) appName = appName.slice(0, 40);

  const appIconUrl = typeof input?.appIconUrl === 'string' ? input.appIconUrl : (typeof input?.customIconUri === 'string' ? input.customIconUri : '');
  if (appIconUrl && !/^https?:\/\//i.test(appIconUrl) && !/^\//.test(appIconUrl) && !/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(appIconUrl)) {
    throw new Error('Invalid icon URL');
  }
  if (/^data:image\//i.test(appIconUrl) && Buffer.byteLength(appIconUrl, 'utf8') > MAX_ICON_BYTES) {
    throw new Error('Icon must be smaller than 10 MB');
  }
  const appIcon = typeof input?.appIcon === 'string' ? input.appIcon : '';
  const validIcons = new Set(['phone-green', 'phone-classic', 'phone-dark', 'phone-gold', 'custom']);
  const safeIcon = validIcons.has(appIcon) ? appIcon : (appIconUrl ? 'custom' : '');

  return { appName, appIconUrl, appIcon: safeIcon };
}

async function maybeUploadIcon(appIconUrl) {
  if (!appIconUrl || !/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(appIconUrl)) {
    return appIconUrl;
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return appIconUrl;
  }

  try {
    const response = await fetch(appIconUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    const blob = new Blob([buffer], { type: 'image/webp' });
    const fileName = `brand-${Date.now()}.png`;
    const upload = await put(fileName, blob, { access: 'public', contentType: 'image/png' });
    return upload.url;
  } catch (error) {
    console.warn('Blob upload failed, keeping local data URL for fallback:', error);
    return appIconUrl;
  }
}

export async function readBranding() {
  if (!supabase) return memoryBranding;
  try {
    const { data, error } = await supabase
      .from('fakecall_config')
      .select('branding, updated_at')
      .eq('id', 'main')
      .maybeSingle();

    if (!error && data?.branding) {
      const iconUrl = data.branding.customIconUri || (data.branding.appIcon ? getPresetIcon(data.branding.appIcon) : '/icon-512.png');
      const b = {
        appName: data.branding.appDisplayName || '',
        appIcon: data.branding.appIcon || 'phone-green',
        appIconUrl: iconUrl,
        updatedAt: Number(data.updated_at || Date.now())
      };
      memoryBranding = b;
      return b;
    }
  } catch (e) {
    console.warn('Supabase branding read failed, fallback to memory:', e);
  }
  return memoryBranding;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Pragma');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      return res.status(200).json(await readBranding());
    } catch (error) {
      console.warn('GET /api/branding fallback:', error);
      return res.status(200).json(memoryBranding);
    }
  }

  return res.status(410).json({ error: 'Branding is part of the complete /api/config record; save it through that endpoint.' });
}
