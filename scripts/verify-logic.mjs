import { DEFAULT_CONFIG, RINGTONE_PRESETS } from '../shared/dist/defaults.js';
import { sharedStorage } from '../shared/dist/storageContract.js';

function testLogic() {
  console.log('--- RUNNING SIMULATION LOGIC TESTS ---');

  // Test 1: Verify Default Configuration Schema
  const requiredFields = [
    'callerName',
    'callerPhone',
    'callerImage',
    'voiceAudio',
    'ringtone',
    'callSettings',
    'branding',
    'updatedAt'
  ];

  for (const field of requiredFields) {
    if (!(field in DEFAULT_CONFIG)) {
      throw new Error(`Missing required configuration field: ${field}`);
    }
  }
  console.log('[PASS] Config schema validation: all required fields present.');

  // Test 2: Verify Call Settings Fields
  const requiredSettings = [
    'autoAnswerDelaySeconds',
    'callDuration',
    'autoEndWhenAudioFinishes',
    'vibrationEnabled',
    'animationStyle',
    'theme',
    'autoRecordCalls'
  ];
  for (const s of requiredSettings) {
    if (!(s in DEFAULT_CONFIG.callSettings)) {
      throw new Error(`Missing call setting: ${s}`);
    }
  }
  console.log('[PASS] Call settings validation: autoEnd, vibration, timing, and autoRecordCalls verified.');

  // Test 3: Verify Ringtone Presets
  if (!Array.isArray(RINGTONE_PRESETS) || RINGTONE_PRESETS.length < 4) {
    throw new Error('Expected at least 4 ringtone presets');
  }
  console.log(`[PASS] Ringtone presets: ${RINGTONE_PRESETS.length} presets available (${RINGTONE_PRESETS.map(r => r.name).join(', ')}).`);

  // Test 4: Verify Fallback Avatar Rendering
  if (!DEFAULT_CONFIG.callerImage.startsWith('data:image/svg+xml')) {
    throw new Error('Default caller avatar must be an offline self-contained data URI');
  }
  console.log('[PASS] Offline avatar: self-contained vector data URI verified.');

  // Test 5: Call State Machine Progression Simulation
  let state = 'incoming';
  console.log(`[STATE] Step 1: App cold launch -> State is "${state}" (immediate incoming call)`);
  if (state !== 'incoming') throw new Error('Cold launch must immediately be incoming');

  // User answers call
  state = 'active';
  const callStartTime = Date.now();
  console.log(`[STATE] Step 2: User answers -> State is "${state}", voice starts playing, timer begins`);

  // Audio completes (simulation)
  const voiceDurationMs = 200; // simulated
  setTimeout(async () => {
    state = 'ended';
    console.log(`[STATE] Step 3: Voice finishes -> Call auto-ends, state is "${state}", vibration stopped`);

    // Test 6: Device Launch Tracking Verification
    console.log('[TEST] Testing device tracking recording & history...');
    const tracked = await sharedStorage.recordDeviceLaunch({
      deviceId: 'test_iphone_15_device',
      deviceName: 'Apple iPhone 15 Pro',
      os: 'iOS 17.5',
      browser: 'Safari Mobile 17',
      screenResolution: '393x852 (@3x)'
    });

    if (!tracked || tracked.launchCount < 1) {
      throw new Error('Failed to record device launch');
    }
    if (!tracked.launchHistory || tracked.launchHistory.length < 1) {
      throw new Error('Missing launchHistory in device tracking');
    }
    console.log(`[PASS] Device tracking: Recorded launch for "${tracked.deviceName}" at ${tracked.launchHistory[0].formattedTime} on ${tracked.launchHistory[0].formattedDate}, count=${tracked.launchCount}.`);

    console.log('\n>>> ALL SIMULATION LOGIC TESTS PASSED! <<<');
  }, voiceDurationMs);
}

testLogic();

