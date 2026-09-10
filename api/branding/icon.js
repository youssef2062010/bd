import handler, { readBranding } from '../branding.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default async function iconHandler(req, res) {
  if (req.method === 'GET') {
    try {
      const branding = await readBranding();
      if (typeof branding.appIconUrl === 'string' && /^https?:\/\//i.test(branding.appIconUrl)) {
        try {
          const imgRes = await fetch(branding.appIconUrl);
          if (imgRes.ok) {
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.status(200).send(buffer);
          }
        } catch {
          // fallback if proxy fails
        }
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        return res.redirect(307, branding.appIconUrl);
      }
      const match = typeof branding.appIconUrl === 'string'
        ? branding.appIconUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i)
        : null;
      if (!match) {
        return res.redirect(307, '/icon-512.png');
      }
      res.setHeader('Content-Type', match[1]);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res.status(200).send(Buffer.from(match[2], 'base64'));
    } catch {
      return res.redirect(307, '/icon-512.png');
    }
  }

  if (req.method !== 'POST') return handler(req, res);

  const expected = process.env.ADMIN_API_KEY;
  if (expected) {
    const provided = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (provided !== expected) return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (!supabase) return res.status(503).json({ error: 'Supabase server configuration is missing' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const dataUrl = body?.dataUrl;
    if (typeof dataUrl !== 'string' || !/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(dataUrl) || Buffer.byteLength(dataUrl, 'utf8') > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'Icon must be a PNG, JPEG, or WebP image smaller than 10 MB' });
    }
    const current = await readBranding();
    const branding = { ...current, appIconUrl: dataUrl, updatedAt: Date.now() };

    try {
      const { data: currentConfig } = await supabase.from('fakecall_config').select('*').eq('id', 'main').maybeSingle();
      if (currentConfig) {
        await supabase.from('fakecall_config').update({
          branding: {
            appDisplayName: branding.appName || '',
            appIcon: 'custom',
            customIconUri: dataUrl
          },
          updated_at: branding.updatedAt,
          version: Number(currentConfig.version || 1) + 1
        }).eq('id', 'main');
      }
    } catch (e) {
      console.warn('Supabase icon save error:', e);
    }

    return res.status(200).json({ success: true, branding });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Invalid icon upload' });
  }
}
