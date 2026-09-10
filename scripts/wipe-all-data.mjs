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

async function wipeAllData() {
  console.log('Connecting to Upstash Redis to wipe all stored data...');
  const now = Date.now();

  // Find all existing keys in Redis
  const keys = await redis.keys('*');
  console.log('Found keys in Redis:', keys);

  for (const k of keys) {
    await redis.del(k);
    console.log(`✓ Deleted key: "${k}"`);
  }

  // Set fresh, blank slate with a high version number so all clients immediately update
  const cleanConfig = {
    version: 1000,
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
      appDisplayName: '12/12❤️',
      appIcon: 'farida',
      customIconUri: '/icon-192.png'
    },
    updatedAt: now
  };

  const cleanBranding = {
    appName: '12/12❤️',
    appIcon: 'farida',
    appIconUrl: '/icon-192.png',
    updatedAt: now
  };

  await redis.set('fakecall:config', JSON.stringify(cleanConfig));
  console.log('✓ Initialized clean fakecall:config with empty caller info, no photos, no voice notes');

  await redis.set('fakecall:branding', JSON.stringify(cleanBranding));
  console.log('✓ Initialized clean fakecall:branding');

  // Clear local cache files
  fs.writeFileSync('.sync-config.json', JSON.stringify(cleanConfig, null, 2), 'utf8');
  fs.writeFileSync('.branding.json', JSON.stringify(cleanBranding, null, 2), 'utf8');
  console.log('✓ Local cache files cleared');

  console.log('\n>>> SUCCESS: ALL STORED DATA, NAMES, PHOTOS & AUDIO WIPED CLEAN! <<<');
}

wipeAllData().catch(console.error);
