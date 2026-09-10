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

async function runCheck() {
  const config = await redis.get('fakecall:config');
  const branding = await redis.get('fakecall:branding');

  const cleanConfig = typeof config === 'string' ? JSON.parse(config) : config;
  const cleanBranding = typeof branding === 'string' ? JSON.parse(branding) : branding;

  const configPreview = { ...cleanConfig };
  if (configPreview.callerImage && configPreview.callerImage.length > 50) {
    configPreview.callerImage = configPreview.callerImage.slice(0, 50) + '... (len: ' + configPreview.callerImage.length + ')';
  }
  if (configPreview.branding?.customIconUri && configPreview.branding.customIconUri.length > 50) {
    configPreview.branding.customIconUri = configPreview.branding.customIconUri.slice(0, 50) + '...';
  }

  const brandingPreview = { ...cleanBranding };
  if (brandingPreview.appIconUrl && brandingPreview.appIconUrl.length > 50) {
    brandingPreview.appIconUrl = brandingPreview.appIconUrl.slice(0, 50) + '... (len: ' + brandingPreview.appIconUrl.length + ')';
  }

  console.log('=== REDIS "fakecall:config" ===');
  console.log(JSON.stringify(configPreview, null, 2));

  console.log('\n=== REDIS "fakecall:branding" ===');
  console.log(JSON.stringify(brandingPreview, null, 2));

  console.log('\n=== LOCAL ".sync-config.json" ===');
  if (fs.existsSync('.sync-config.json')) {
    const local = JSON.parse(fs.readFileSync('.sync-config.json', 'utf8'));
    if (local.callerImage) local.callerImage = local.callerImage.slice(0, 50) + '...';
    console.log(JSON.stringify(local, null, 2));
  } else {
    console.log('.sync-config.json does not exist');
  }

  console.log('\n=== LOCAL ".branding.json" ===');
  if (fs.existsSync('.branding.json')) {
    console.log(fs.readFileSync('.branding.json', 'utf8'));
  } else {
    console.log('.branding.json does not exist');
  }
}

runCheck();
