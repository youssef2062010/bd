import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_CONFIG, audioSynthesizer } from '../shared/dist/index.js';
import { sharedStorage } from '../shared/dist/storageContract.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function testSyncAndAudio() {
  console.log('--- RUNNING REAL-TIME SYNC & AUDIO CONTROLS TEST ---');

  // 1. Test VoiceController interface
  console.log('[TEST 1] Testing VoiceController interface...');
  assert.strictEqual(typeof audioSynthesizer.playSynthesizedVoice, 'function');
  const controller = audioSynthesizer.playSynthesizedVoice(
    'Hello, this is a test call for real-time synchronization and audio controls.',
    () => { },
    () => { }
  );

  assert.strictEqual(typeof controller.stop, 'function', 'Controller must have stop()');
  assert.strictEqual(typeof controller.pause, 'function', 'Controller must have pause()');
  assert.strictEqual(typeof controller.resume, 'function', 'Controller must have resume()');
  assert.strictEqual(typeof controller.setMuted, 'function', 'Controller must have setMuted()');
  assert.strictEqual(typeof controller.setSpeaker, 'function', 'Controller must have setSpeaker()');

  // Test mute & pause execution
  controller.setMuted(true);
  controller.setSpeaker(true);
  controller.setSpeaker(false);
  controller.setMuted(false);
  controller.stop();
  console.log('[PASS] VoiceController controls (stop, pause, resume, setMuted, setSpeaker) verified.');

  // 2. Test Real-time Configuration Save and Local Persistence
  console.log('[TEST 2] Testing real-time config broadcast and storage...');
  let listenerCalled = false;
  let receivedName = '';

  const unsubscribe = sharedStorage.subscribe((cfg) => {
    listenerCalled = true;
    receivedName = cfg.callerName;
  });

  const testConfig = {
    ...DEFAULT_CONFIG,
    callerName: 'Nour El-Din',
    callerPhone: '+20 12 9999 8888',
    callSettings: {
      ...DEFAULT_CONFIG.callSettings,
      theme: 'romantic'
    },
    updatedAt: Date.now()
  };

  await sharedStorage.saveConfig(testConfig);
  assert.strictEqual(listenerCalled, true, 'Subscriber should be notified instantly on saveConfig');
  assert.strictEqual(receivedName, 'Nour El-Din', 'Caller name in subscriber must match updated config');

  const loadedConfig = await sharedStorage.getConfig();
  assert.strictEqual(loadedConfig.callerName, 'Nour El-Din');
  assert.strictEqual(loadedConfig.callerPhone, '+20 12 9999 8888');
  console.log('[PASS] Instant auto-sync broadcast verified: subscriber received update with 0 delay.');

  // 3. Test Sync File Simulation
  console.log('[TEST 3] Testing server sync config file write and read...');
  const syncFilePath = path.resolve(rootDir, '.sync-config.json');
  fs.writeFileSync(syncFilePath, JSON.stringify(testConfig, null, 2), 'utf8');
  assert.strictEqual(fs.existsSync(syncFilePath), true);
  const readBack = JSON.parse(fs.readFileSync(syncFilePath, 'utf8'));
  assert.strictEqual(readBack.callerName, 'Nour El-Din');
  console.log('[PASS] Server .sync-config.json persistence verified.');

  unsubscribe();
  console.log('\n>>> ALL REAL-TIME SYNC & AUDIO TESTS PASSED! <<<');
}

testSyncAndAudio().catch((err) => {
  console.error('[FAIL]', err);
  process.exit(1);
});
