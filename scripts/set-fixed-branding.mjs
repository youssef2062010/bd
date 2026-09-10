import { Redis } from '@upstash/redis';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
});

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

async function setFixedBranding() {
  console.log('Setting fixed App Branding to 12/12❤️ and farida icon...');
  const now = Date.now();

  const fixedBranding = {
    appName: '12/12❤️',
    appIconUrl: '/icon-192.png',
    appIcon: 'farida',
    updatedAt: now
  };

  // 1. Set fakecall:branding in Redis
  await redis.set('fakecall:branding', JSON.stringify(fixedBranding));
  console.log('✓ fakecall:branding set to "12/12❤️"');

  // 2. Set config.branding in Redis
  const rawConfig = await redis.get('fakecall:config');
  if (rawConfig) {
    const config = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
    config.branding = {
      appDisplayName: '12/12❤️',
      appIcon: 'farida',
      customIconUri: '/icon-192.png'
    };
    config.updatedAt = now;
    config.version = (typeof config.version === 'number' ? config.version : 1) + 1;
    await redis.set('fakecall:config', JSON.stringify(config));
    console.log('✓ fakecall:config branding updated (version:', config.version, ')');
  }

  // 3. Update local files
  fs.writeFileSync('.branding.json', JSON.stringify(fixedBranding, null, 2), 'utf8');
  if (fs.existsSync('.sync-config.json')) {
    const local = JSON.parse(fs.readFileSync('.sync-config.json', 'utf8'));
    local.branding = {
      appDisplayName: '12/12❤️',
      appIcon: 'farida',
      customIconUri: '/icon-192.png'
    };
    local.updatedAt = now;
    fs.writeFileSync('.sync-config.json', JSON.stringify(local, null, 2), 'utf8');
  }

  console.log('DONE: App Branding locked to 12/12❤️ and /icon-192.png.');
}

setFixedBranding().catch(console.error);
