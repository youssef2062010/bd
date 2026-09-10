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

async function resetBrandingToBlank() {
  console.log('Resetting App Branding to blank...');
  const now = Date.now();

  const defaultBranding = {
    appName: '',
    appIconUrl: '',
    appIcon: '',
    updatedAt: now
  };

  // 1. Reset fakecall:branding in Redis
  await redis.set('fakecall:branding', JSON.stringify(defaultBranding));
  console.log('✓ fakecall:branding cleared');

  // 2. Reset config.branding in Redis
  const rawConfig = await redis.get('fakecall:config');
  if (rawConfig) {
    const config = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
    config.branding = {
      appDisplayName: '',
      appIcon: '',
      customIconUri: ''
    };
    config.updatedAt = now;
    config.version = (typeof config.version === 'number' ? config.version : 1) + 1;
    await redis.set('fakecall:config', JSON.stringify(config));
    console.log('✓ fakecall:config branding cleared (version:', config.version, ')');
  }

  // 3. Reset local files
  fs.writeFileSync('.branding.json', JSON.stringify(defaultBranding, null, 2), 'utf8');
  if (fs.existsSync('.sync-config.json')) {
    const local = JSON.parse(fs.readFileSync('.sync-config.json', 'utf8'));
    local.branding = {
      appDisplayName: 'Phone',
      appIcon: 'phone-green'
    };
    local.updatedAt = now;
    fs.writeFileSync('.sync-config.json', JSON.stringify(local, null, 2), 'utf8');
  }

  console.log('DONE: App Branding is now blank and ready for Admin values.');
}

resetBrandingToBlank().catch(console.error);
