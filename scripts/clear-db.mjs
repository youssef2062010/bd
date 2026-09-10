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

const now = Date.now();

const CLEAN_DEFAULT_CONFIG = {
  version: 1,
  callerName: '',
  callerPhone: '',
  callerImage: '',
  voiceAudio: null,
  ringtone: {
    id: 'modern',
    name: 'Modern Smartphone (Marimba)',
    uri: 'synth:modern',
    enabled: true,
    volume: 0.85
  },
  callSettings: {
    autoAnswerDelaySeconds: 0,
    callDuration: 60,
    autoEndWhenAudioFinishes: true,
    vibrationEnabled: true,
    animationStyle: 'pulse',
    theme: 'romantic',
    fallingHeartsEnabled: true,
    uiStyle: 'ios',
    answerMethod: 'buttons',
    realisticVoiceFilter: true,
    autoRecordCalls: true
  },
  branding: {
    appDisplayName: '',
    appIcon: '',
    customIconUri: ''
  },
  updatedAt: now
};

const CLEAN_DEFAULT_BRANDING = {
  appName: '',
  appIconUrl: '',
  appIcon: '',
  updatedAt: now
};

async function resetCleanDatabase() {
  console.log('Connecting to Upstash Redis...');
  const existingKeys = await redis.keys('*');
  console.log('Keys before wipe:', existingKeys);

  for (const k of existingKeys) {
    await redis.del(k);
    console.log(`✓ Deleted old key: "${k}"`);
  }

  // Set clean initial state so all connected devices/browsers overwrite their stale local cache
  await redis.set('fakecall:config', JSON.stringify(CLEAN_DEFAULT_CONFIG));
  console.log('✓ Initialized clean "fakecall:config" (empty name, empty phone, empty image, no audio)');

  await redis.set('fakecall:branding', JSON.stringify(CLEAN_DEFAULT_BRANDING));
  console.log('✓ Initialized clean "fakecall:branding" (Phone, phone-green)');

  // Also sync local dev files
  fs.writeFileSync('.sync-config.json', JSON.stringify(CLEAN_DEFAULT_CONFIG, null, 2), 'utf8');
  fs.writeFileSync('.branding.json', JSON.stringify(CLEAN_DEFAULT_BRANDING, null, 2), 'utf8');
  console.log('✓ Updated local .sync-config.json and .branding.json to clean defaults');

  console.log('\n>>> SUCCESS: DATABASE HAS BEEN WIPED AND RESET TO CLEAN BLANK SLATE! <<<');
}

resetCleanDatabase().catch(console.error);
