import { createClient } from '@supabase/supabase-js';

const CONFIG_ID = 'main';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
  : null;

function setNoStore(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    version: Number(row.version),
    callerName: row.caller_name,
    callerPhone: row.caller_phone,
    callerImage: row.caller_image,
    voiceAudio: row.voice_audio,
    ringtone: row.ringtone,
    callSettings: row.call_settings,
    branding: row.branding,
    updatedAt: Number(row.updated_at)
  };
}

function toRow(config) {
  return {
    id: CONFIG_ID,
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

const isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
const validMediaUri = (value) => value === '' || /^(https:\/\/|data:(image|audio)\/|synth:)/i.test(value);

// This is intentionally strict: every write is a complete canonical configuration.
function validateConfig(config) {
  if (!isObject(config)) throw new Error('config must be an object');
  for (const key of ['callerName', 'callerPhone', 'callerImage', 'voiceAudio', 'ringtone', 'callSettings', 'branding']) {
    if (!(key in config)) throw new Error(`config.${key} is required`);
  }
  if (typeof config.callerName !== 'string' || config.callerName.length > 120) throw new Error('Invalid callerName');
  if (typeof config.callerPhone !== 'string' || config.callerPhone.length > 64) throw new Error('Invalid callerPhone');
  if (typeof config.callerImage !== 'string' || !validMediaUri(config.callerImage)) throw new Error('Invalid callerImage');
  if (config.voiceAudio !== null && (!isObject(config.voiceAudio) || typeof config.voiceAudio.uri !== 'string' ||
    !validMediaUri(config.voiceAudio.uri) || typeof config.voiceAudio.name !== 'string' ||
    !Number.isFinite(config.voiceAudio.durationMs) || typeof config.voiceAudio.mimeType !== 'string')) throw new Error('Invalid voiceAudio');
  const r = config.ringtone;
  if (!isObject(r) || typeof r.id !== 'string' || typeof r.name !== 'string' || typeof r.uri !== 'string' ||
    typeof r.enabled !== 'boolean' || !Number.isFinite(r.volume) || r.volume < 0 || r.volume > 1) throw new Error('Invalid ringtone');
  const s = config.callSettings;
  if (!isObject(s) || !Number.isFinite(s.autoAnswerDelaySeconds) || !Number.isFinite(s.callDuration) ||
    !['pulse', 'radar', 'ripple'].includes(s.animationStyle) || !['romantic', 'dark', 'amoled', 'light'].includes(s.theme) ||
    !['ios', 'android'].includes(s.uiStyle) || !['slide', 'buttons'].includes(s.answerMethod) ||
    ['autoEndWhenAudioFinishes', 'vibrationEnabled', 'fallingHeartsEnabled', 'realisticVoiceFilter', 'autoRecordCalls'].some((key) => typeof s[key] !== 'boolean')) throw new Error('Invalid callSettings');
  const b = config.branding;
  if (!isObject(b) || typeof b.appDisplayName !== 'string' || b.appDisplayName.length > 40 || typeof b.appIcon !== 'string' ||
    (b.customIconUri !== undefined && (typeof b.customIconUri !== 'string' || !validMediaUri(b.customIconUri)))) throw new Error('Invalid branding');
  return config;
}

function isAuthorized(req) {
  const expected = process.env.ADMIN_API_KEY;
  return !expected || (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim() === expected;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Pragma');
  setNoStore(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!supabase) return res.status(503).json({ error: 'SUPABASE_URL and a server Supabase key are required' });

  const configId = typeof req.query?.configId === 'string' ? req.query.configId : CONFIG_ID;
  if (configId !== CONFIG_ID) return res.status(404).json({ error: 'Configuration not found' });

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase.from('fakecall_config').select('*').eq('id', CONFIG_ID).maybeSingle();
      if (error) throw error;
      return res.status(200).json(data ? { config: mapRow(data) } : { status: 'no_config_yet', configId: CONFIG_ID });
    } catch (error) {
      console.error('Configuration read failed:', error);
      return res.status(502).json({ error: 'Configuration database read failed' });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!isObject(payload) || payload.configId !== CONFIG_ID || !Number.isInteger(payload.baseVersion) || payload.baseVersion < 0) {
      return res.status(400).json({ error: 'configId and non-negative integer baseVersion are required' });
    }
    const incoming = validateConfig(payload.config);
    const { data: currentRow, error: readError } = await supabase.from('fakecall_config').select('*').eq('id', CONFIG_ID).maybeSingle();
    if (readError) throw readError;
    const current = mapRow(currentRow);
    const version = current?.version ?? 0;
    if (payload.baseVersion !== version) return res.status(409).json({ error: 'Stale configuration revision', config: current });

    const canonical = { ...incoming, id: CONFIG_ID, version: version + 1, updatedAt: Date.now() };
    const result = current
      ? await supabase.from('fakecall_config').update(toRow(canonical)).eq('id', CONFIG_ID).eq('version', version).select('*').maybeSingle()
      : await supabase.from('fakecall_config').insert(toRow(canonical)).select('*').maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) {
      const { data: latest } = await supabase.from('fakecall_config').select('*').eq('id', CONFIG_ID).maybeSingle();
      return res.status(409).json({ error: 'Configuration changed while saving', config: mapRow(latest) });
    }
    return res.status(200).json({ success: true, config: mapRow(result.data) });
  } catch (error) {
    console.error('Configuration save failed:', error);
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid configuration' });
  }
}
