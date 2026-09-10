/* eslint-disable no-unreachable */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function normalizeConfig(value) {
  if (!value || typeof value !== 'object') return null;
  const currentVersion = typeof value.version === 'number' ? value.version : 1;
  return {
    ...value,
    version: currentVersion,
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : Date.now(),
    branding: value.branding && typeof value.branding === 'object' ? value.branding : { appDisplayName: '', appIcon: '', customIconUri: '' }
  };
}

function mapRowToConfig(row) {
  if (!row) return null;
  return normalizeConfig({
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

function mapConfigToRow(config) {
  return {
    id: 'main',
    version: config.version,
    caller_name: config.callerName || '',
    caller_phone: config.callerPhone || '',
    caller_image: config.callerImage || '',
    voice_audio: config.voiceAudio || null,
    ringtone: config.ringtone,
    call_settings: config.callSettings,
    branding: config.branding,
    updated_at: config.updatedAt
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Pragma');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Retired write path. All configuration reads and writes use /api/config so
  // there is exactly one canonical persistence and concurrency implementation.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res.status(410).json({ error: 'Use /api/config for configuration synchronization' });

  if (req.method === 'POST') {
    const authHeader = req.headers['authorization'] || '';
    const expectedKey = process.env.ADMIN_API_KEY;

    if (expectedKey) {
      const providedKey = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : authHeader.trim();

      if (providedKey !== expectedKey) {
        return res.status(401).json({ error: 'Unauthorized: invalid admin key' });
      }
    }

    try {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'Invalid payload' });
      }

      if (!supabase) return res.status(503).json({ error: 'Supabase server configuration is missing' });
      const { data: currentData } = await supabase.from('fakecall_config').select('*').eq('id', 'main').maybeSingle();
      const current = mapRowToConfig(currentData);
      const currentVer = typeof current?.version === 'number' ? current.version : 0;
      const incomingVer = typeof data.version === 'number' ? data.version : 0;

      const safeNextVersion = Math.max(currentVer, incomingVer) + 1;

      const configToSave = normalizeConfig({
        ...(current || {}),
        ...data,
        version: safeNextVersion,
        updatedAt: Date.now()
      });

      const row = mapConfigToRow(configToSave);
      const { error: upsertErr } = await supabase.from('fakecall_config').upsert(row);
      if (upsertErr) {
        console.error('Supabase upsert error in sync.js:', upsertErr);
        return res.status(502).json({ error: 'Supabase save failed' });
      }

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res.status(200).json({ success: true, config: configToSave, updatedAt: configToSave.updatedAt, version: configToSave.version });
    } catch (err) {
      console.error('POST /api/sync error:', err);
      return res.status(400).json({ error: 'Invalid JSON or storage error' });
    }
  }

  try {
    if (!supabase) return res.status(503).json({ error: 'Supabase server configuration is missing' });
    const { data: currentData } = await supabase.from('fakecall_config').select('*').eq('id', 'main').maybeSingle();
    const config = mapRowToConfig(currentData);
    if (config) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res.status(200).json(config);
    }
  } catch (err) {
    console.warn('GET /api/sync Supabase error:', err);
  }

  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({ status: 'no_config_yet' });
}
