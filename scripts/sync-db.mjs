import { Redis } from '@upstash/redis';
import fs from 'fs';
import path from 'path';

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

async function pullFromCloud() {
  console.log('Fetching latest config from Upstash Redis...');
  const remoteConfig = await redis.get('fakecall:config');
  const remoteBranding = await redis.get('fakecall:branding');

  if (remoteConfig) {
    const parsedConfig = typeof remoteConfig === 'string' ? JSON.parse(remoteConfig) : remoteConfig;
    fs.writeFileSync('.sync-config.json', JSON.stringify(parsedConfig, null, 2), 'utf8');
    console.log('✓ Updated .sync-config.json from Cloud (Caller:', parsedConfig.callerName, ')');
  }

  if (remoteBranding) {
    const parsedBranding = typeof remoteBranding === 'string' ? JSON.parse(remoteBranding) : remoteBranding;
    fs.writeFileSync('.branding.json', JSON.stringify(parsedBranding, null, 2), 'utf8');
    console.log('✓ Updated .branding.json from Cloud (App Name:', parsedBranding.appName, ')');
  }
}

pullFromCloud().catch(console.error);
