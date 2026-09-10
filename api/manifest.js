import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');

  let appName = '';
  let iconSrc = '';
  let iconType = 'image/png';
  let dbVersion = '';

  try {
    if (!supabase) throw new Error('Supabase server configuration is missing');
    const { data, error } = await supabase
      .from('fakecall_config')
      .select('branding, version, updated_at')
      .eq('id', 'main')
      .maybeSingle();

    if (!error && data) {
      dbVersion = data.version ? String(data.version) : (data.updated_at ? String(data.updated_at) : '');
      const branding = data.branding;
      if (branding?.appDisplayName?.trim()) appName = branding.appDisplayName.trim();
      if (branding?.customIconUri) {
        iconSrc = /^data:image\//i.test(branding.customIconUri) ? '/api/branding/icon' : branding.customIconUri;
        if (/\.jpe?g($|\?)/i.test(branding.customIconUri)) iconType = 'image/jpeg';
        else if (/\.webp($|\?)/i.test(branding.customIconUri)) iconType = 'image/webp';
        else if (/\.png($|\?)/i.test(branding.customIconUri)) iconType = 'image/png';
        else {
          const match = branding.customIconUri.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,/i);
          if (match) iconType = match[1].toLowerCase();
        }
      } else if (branding?.appIcon) {
        iconSrc = getPresetIcon(branding.appIcon);
        iconType = 'image/svg+xml';
      }
    }
  } catch (error) {
    console.warn('GET /api/manifest fallback to default branding:', error);
  }

  const finalIconSrc = iconSrc || '/icon-512.png';
  const finalIconType = iconType || 'image/png';

  const icons = iconSrc
    ? [
        {
          src: finalIconSrc,
          sizes: '192x192',
          type: finalIconType,
          purpose: 'any'
        },
        {
          src: finalIconSrc,
          sizes: '192x192',
          type: finalIconType,
          purpose: 'maskable'
        },
        {
          src: finalIconSrc,
          sizes: '512x512',
          type: finalIconType,
          purpose: 'any'
        },
        {
          src: finalIconSrc,
          sizes: '512x512',
          type: finalIconType,
          purpose: 'maskable'
        }
      ]
    : [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/icon-maskable-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable'
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/icon-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ];

  const v = req.query?.v || (req.query?.clone ? String(Date.now()) : '');
  const manifestId = v ? `/fake-call-app/?v=${v}` : '/fake-call-app/';
  const startUrl = v ? `/fake-call-app/index.html?mode=standalone&v=${v}` : '/fake-call-app/index.html?mode=standalone';

  return res.status(200).json({
    id: manifestId,
    name: appName || 'Fake Call',
    short_name: appName || 'Fake Call',
    description: 'Incoming Call Phone Simulator',
    start_url: startUrl,
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'window-controls-overlay'],
    background_color: '#000000',
    theme_color: '#000000',
    orientation: 'portrait',
    prefer_related_applications: false,
    icons
  });
}
