import { defineConfig, Plugin, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const localEnv = loadEnv('development', process.cwd(), '');
const SUPABASE_URL = process.env.SUPABASE_URL || localEnv.SUPABASE_URL || process.env.VITE_SUPABASE_URL || localEnv.VITE_SUPABASE_URL || '';
const SUPABASE_SERVER_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || localEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || localEnv.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY || localEnv.SUPABASE_ANON_KEY || '';
const SUPABASE_PUBLIC_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || localEnv.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || localEnv.VITE_SUPABASE_ANON_KEY || '';

const presetColors: Record<string, [string, string]> = {
  'phone-green': ['#10b981', '#0d9488'],
  'phone-classic': ['#2563eb', '#4f46e5'],
  'phone-dark': ['#334155', '#020617'],
  'phone-gold': ['#f59e0b', '#d97706']
};

function getPresetIcon(appIcon: string): string {
  const [start, end] = presetColors[appIcon] || presetColors['phone-green'];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${start}"/><stop offset="100%" stop-color="${end}"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#g)"/><path d="M19 16c2.5 0 4 3 4.8 4.6.6 1.3.4 2.7-.6 3.7l-2 2c2 3.8 5 6.8 8.8 8.8l2-2c1-.9 2.4-1.2 3.7-.6 1.6.8 4.6 2.3 4.6 4.8 0 3.3-2.6 6-5.8 6-12.7 0-23-10.3-23-23 0-3.2 2.6-5.8 6-5.8z" fill="#fff"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Development counterpart of api/config.js. It uses the same persistent table;
// it intentionally has no file or in-memory configuration fallback.
function configApiPlugin(): Plugin {
  const client = SUPABASE_URL && SUPABASE_SERVER_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVER_KEY) : null;
  const mapRow = (row: any) => row && ({
    id: row.id, version: Number(row.version), callerName: row.caller_name, callerPhone: row.caller_phone,
    callerImage: row.caller_image, voiceAudio: row.voice_audio, ringtone: row.ringtone,
    callSettings: row.call_settings, branding: row.branding, updatedAt: Number(row.updated_at)
  });
  const toRow = (config: any) => ({
    id: 'main', version: config.version, caller_name: config.callerName, caller_phone: config.callerPhone,
    caller_image: config.callerImage, voice_audio: config.voiceAudio, ringtone: config.ringtone,
    call_settings: config.callSettings, branding: config.branding, updated_at: config.updatedAt
  });
  return {
    name: 'canonical-config-api',
    configureServer(server) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url?.split('?')[0] !== '/api/config') return next();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        if (!client) { res.statusCode = 503; res.end(JSON.stringify({ error: 'SUPABASE_URL and server key are required' })); return; }
        if (req.method === 'GET') {
          const { data, error } = await client.from('fakecall_config').select('*').eq('id', 'main').maybeSingle();
          if (error) { res.statusCode = 502; res.end(JSON.stringify({ error: 'Configuration database read failed' })); return; }
          res.end(JSON.stringify(data ? { config: mapRow(data) } : { status: 'no_config_yet', configId: 'main' }));
          return;
        }
        if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ error: 'Method not allowed' })); return; }
        let raw = '';
        req.on('data', (chunk: any) => { raw += chunk; });
        req.on('end', async () => {
          try {
            const payload = JSON.parse(raw);
            if (payload.configId !== 'main' || !Number.isInteger(payload.baseVersion) || !payload.config ||
              !['callerName', 'callerPhone', 'callerImage', 'voiceAudio', 'ringtone', 'callSettings', 'branding'].every((key) => key in payload.config)) throw new Error('Invalid complete configuration payload');
            const { data: currentRow, error } = await client.from('fakecall_config').select('*').eq('id', 'main').maybeSingle();
            if (error) throw error;
            const current = mapRow(currentRow);
            const version = current?.version || 0;
            if (payload.baseVersion !== version) { res.statusCode = 409; res.end(JSON.stringify({ error: 'Stale configuration revision', config: current })); return; }
            const canonical = { ...payload.config, id: 'main', version: version + 1, updatedAt: Date.now() };
            const result = current
              ? await client.from('fakecall_config').update(toRow(canonical)).eq('id', 'main').eq('version', version).select('*').maybeSingle()
              : await client.from('fakecall_config').insert(toRow(canonical)).select('*').maybeSingle();
            if (result.error) throw result.error;
            if (!result.data) { res.statusCode = 409; res.end(JSON.stringify({ error: 'Configuration changed while saving' })); return; }
            res.end(JSON.stringify({ success: true, config: mapRow(result.data) }));
          } catch (error) { res.statusCode = 400; res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid configuration' })); }
        });
      });
    }
  };
}

function syncApiPlugin(): Plugin {
  const syncFilePath = path.resolve(__dirname, '.sync-config.json');
  const brandingFilePath = path.resolve(__dirname, '.branding.json');
  let sseClients: any[] = [];

  // Initialize Supabase in Vite dev server
  let supabaseClient: any = null;
  try {
    if (SUPABASE_URL && SUPABASE_SERVER_KEY) {
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVER_KEY);
    }
  } catch (e) {
    console.warn('Vite Supabase initialization error:', e);
  }

  const devAdminKey = process.env.VITE_ADMIN_API_KEY || 'dev-admin-key';

  const readStoredBranding = async () => {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('fakecall_config')
          .select('branding')
          .eq('id', 'main')
          .maybeSingle();
        if (!error && data?.branding) {
          const branding = data.branding;
          return {
            appName: branding.appDisplayName || '',
            appIcon: branding.appIcon || '',
            appIconUrl: branding.customIconUri || '',
            updatedAt: Date.now()
          };
        }
      } catch (error) {
        console.warn('Vite Supabase branding read failed, using local fallback:', error);
      }
    }
    if (fs.existsSync(brandingFilePath)) {
      return JSON.parse(fs.readFileSync(brandingFilePath, 'utf8'));
    }
    return { appName: '', appIconUrl: '', appIcon: '', updatedAt: 0 };
  };

  const handleMiddleware = async (req: any, res: any, next: any) => {
    const url = req.url?.split('?')[0];

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Pragma');

    if (req.method === 'OPTIONS') {
      res.statusCode = 200;
      res.end();
      return;
    }

    if (url === '/api/branding' || url === '/api/branding/icon') {
      const isIconUpload = url.endsWith('/icon');
      const providedKey = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
      if (req.method === 'GET' && isIconUpload) {
        try {
          const current = await readStoredBranding();
          const match = typeof current.appIconUrl === 'string'
            ? current.appIconUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i)
            : null;
          if (!match) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'No custom icon configured' }));
            return;
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', match[1]);
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          res.end(Buffer.from(match[2], 'base64'));
        } catch {
          res.statusCode = 500;
          res.end();
        }
        return;
      }
      if (req.method === 'GET' && !isIconUpload) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(await readStoredBranding()));
        return;
      }
      if (((req.method === 'PUT' || req.method === 'POST') && !isIconUpload) || (req.method === 'POST' && isIconUpload)) {
        if (process.env.VITE_ADMIN_API_KEY && providedKey !== process.env.VITE_ADMIN_API_KEY) {
          res.statusCode = 401;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }
        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body);
            const current = await readStoredBranding();
            const appName = typeof (isIconUpload ? current.appName : parsed.appName) === 'string'
              ? (isIconUpload ? current.appName : parsed.appName).trim() : '';
            const appIconUrl = isIconUpload ? parsed.dataUrl : (parsed.appIconUrl || '');
            const appIcon = isIconUpload ? (current.appIcon || 'custom') : (parsed.appIcon || current.appIcon || '');
            if (!['', 'phone-green', 'phone-classic', 'phone-dark', 'phone-gold', 'custom'].includes(appIcon)) throw new Error('Invalid app icon');
            if (!appName || appName.length > 40 || /[<>\u0000-\u001f]/.test(appName)) throw new Error('Invalid app name');
            if (appIconUrl && (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(appIconUrl) || Buffer.byteLength(appIconUrl, 'utf8') > 10 * 1024 * 1024)) throw new Error('Invalid icon');
            const branding = { appName, appIconUrl, appIcon, updatedAt: Date.now() };
            fs.writeFileSync(brandingFilePath, JSON.stringify(branding, null, 2), 'utf8');

            if (supabaseClient) {
              await supabaseClient
                .from('fakecall_config')
                .update({
                  branding: {
                    appDisplayName: branding.appName,
                    appIcon: branding.appIcon,
                    customIconUri: branding.appIconUrl || undefined
                  },
                  updated_at: branding.updatedAt
                })
                .eq('id', 'main');
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, branding }));
          } catch (error) { res.statusCode = 400; res.end(JSON.stringify({ error: (error as Error).message })); }
        });
        return;
      }
    }

    // PWA Web App Manifest endpoint
    if (url === '/api/manifest') {
      res.setHeader('Content-Type', 'application/manifest+json');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      let appName = '';
      let iconSrc = '';
      let iconType = 'image/png';
      try {
        const branding = await readStoredBranding();
        if (branding.appName?.trim()) appName = branding.appName.trim();
        if (branding.appIconUrl) {
          iconSrc = /^data:image\//i.test(branding.appIconUrl) ? '/api/branding/icon' : branding.appIconUrl;
          const match = branding.appIconUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,/i);
          if (match) iconType = match[1].toLowerCase();
        } else {
          iconSrc = getPresetIcon(branding.appIcon || 'phone-green');
          iconType = 'image/svg+xml';
        }
      } catch (error) {
        console.warn('Vite branding read failed, using default manifest:', error);
      }
      res.end(JSON.stringify({
        id: '/fake-call-app/',
        name: appName || 'Fake Call',
        short_name: appName || 'Fake Call',
        description: 'Incoming Call Phone Simulator',
        start_url: '/fake-call-app/index.html?mode=standalone',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'window-controls-overlay'],
        background_color: '#000000',
        theme_color: '#000000',
        orientation: 'portrait',
        prefer_related_applications: false,
        icons: [
          { src: iconSrc || '/icon-512.png', sizes: '192x192', type: iconType || 'image/png', purpose: 'any' },
          { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: iconSrc || '/icon-512.png', sizes: '512x512', type: iconType || 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }));
      return;
    }

    // Live SSE stream
    if (url === '/api/legacy-sync/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      res.write('data: {"type":"CONNECTED"}\n\n');
      sseClients.push(res);
      req.on('close', () => {
        sseClients = sseClients.filter((c) => c !== res);
      });
      return;
    }

    // GET /api/sync
    if (url === '/api/legacy-sync' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient.from('fakecall_config').select('*').eq('id', 'main').maybeSingle();
          if (!error && data) {
            const config = {
              version: Number(data.version || 1),
              callerName: data.caller_name || '',
              callerPhone: data.caller_phone || '',
              callerImage: data.caller_image || '',
              voiceAudio: data.voice_audio || null,
              ringtone: data.ringtone,
              callSettings: data.call_settings,
              branding: data.branding,
              updatedAt: Number(data.updated_at || Date.now())
            };
            res.statusCode = 200;
            res.end(JSON.stringify(config));
            return;
          }
        } catch { }
      }

      if (fs.existsSync(syncFilePath)) {
        try {
          const data = fs.readFileSync(syncFilePath, 'utf8');
          res.statusCode = 200;
          res.end(data);
          return;
        } catch { }
      }
      res.statusCode = 200;
      res.end(JSON.stringify({ status: 'no_config_yet' }));
      return;
    }

    // POST /api/sync
    if (url === '/api/legacy-sync' && req.method === 'POST') {
      const authHeader = req.headers['authorization'] || '';
      const providedKey = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : authHeader.trim();

      if (process.env.VITE_ADMIN_API_KEY && providedKey !== devAdminKey) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Unauthorized: invalid admin key' }));
        return;
      }

      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk;
      });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body);
          fs.writeFileSync(syncFilePath, JSON.stringify(parsed, null, 2), 'utf8');

          if (supabaseClient) {
            await supabaseClient.from('fakecall_config').upsert({
              id: 'main',
              version: parsed.version,
              caller_name: parsed.callerName || '',
              caller_phone: parsed.callerPhone || '',
              caller_image: parsed.callerImage || '',
              voice_audio: parsed.voiceAudio || null,
              ringtone: parsed.ringtone,
              call_settings: parsed.callSettings,
              branding: parsed.branding,
              updated_at: parsed.updatedAt || Date.now()
            });
          }

          const payload = JSON.stringify({ type: 'CONFIG_UPDATED', config: parsed });
          sseClients.forEach((client) => {
            try {
              client.write(`data: ${payload}\n\n`);
            } catch { }
          });

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, updatedAt: Date.now() }));
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }

    next();
  };

  return {
    name: 'fakecall-sync-api',
    configureServer(server) {
      server.middlewares.use(handleMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleMiddleware);
    }
  };
}

export default defineConfig({
  plugins: [react(), configApiPlugin(), syncApiPlugin()],
  base: './',
  define: {
    'process.env.VITE_SUPABASE_URL': JSON.stringify(SUPABASE_URL),
    'process.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(SUPABASE_PUBLIC_KEY),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(SUPABASE_PUBLIC_KEY),
  },
  resolve: {
    alias: {
      '@fakecall/shared': path.resolve(__dirname, 'shared/src/index.ts')
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        install: path.resolve(__dirname, 'install.html'),
        installAdmin: path.resolve(__dirname, 'install-admin.html'),
        editor: path.resolve(__dirname, 'editor.html'),
        fakeCallApp: path.resolve(__dirname, 'fake-call-app/index.html'),
        editorApp: path.resolve(__dirname, 'editor-app/index.html')
      }
    }
  },
  server: {
    port: 3000,
    open: false,
    host: true
  }
});
