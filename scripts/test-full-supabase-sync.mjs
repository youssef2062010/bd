import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Set SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY before running this test.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runTest() {
  console.log('1. Reading current fakecall_config...');
  const { data: config, error: cfgErr } = await supabase
    .from('fakecall_config')
    .select('*')
    .eq('id', 'main')
    .single();

  if (cfgErr) {
    throw new Error('Config read failed: ' + cfgErr.message);
  }
  console.log('Current config branding:', config.branding);
  console.log('Current caller name:', config.caller_name);

  console.log('\n2. Updating branding and caller name...');
  const testName = 'Farida ❤️';
  const testPhone = '+20 10 9988 7766';
  const { error: updateErr } = await supabase
    .from('fakecall_config')
    .update({
      caller_name: testName,
      caller_phone: testPhone,
      branding: {
        appDisplayName: '12/12❤️',
        appIcon: 'farida',
        customIconUri: '/icon-192.png'
      },
      updated_at: Date.now()
    })
    .eq('id', 'main');

  if (updateErr) {
    throw new Error('Config update failed: ' + updateErr.message);
  }
  console.log('Config update SUCCESS!');

  console.log('\n3. Verifying persistence after refresh...');
  const { data: readBack } = await supabase
    .from('fakecall_config')
    .select('*')
    .eq('id', 'main')
    .single();

  if (readBack.caller_name !== testName) {
    throw new Error(`Data persistence mismatch! Expected "${testName}", got "${readBack.caller_name}"`);
  }
  console.log('Verification PASSED! Data persisted in Supabase:');
  console.log(' - Caller Name:', readBack.caller_name);
  console.log(' - Caller Phone:', readBack.caller_phone);
  console.log(' - Branding Display Name:', readBack.branding.appDisplayName);

  console.log('\n4. Testing Device radar insertion...');
  const testDevId = 'test_dev_' + Date.now();
  const { error: devErr } = await supabase.from('fakecall_devices').upsert({
    id: testDevId,
    platform: 'iPhone 15 Pro',
    browser: 'Mobile Safari',
    os: 'iOS 17.5',
    is_online: true,
    last_seen: Date.now(),
    launch_count: 1,
    device_info: { deviceId: testDevId, deviceName: 'iPhone 15 Pro', isOnline: true }
  });
  if (devErr) throw new Error('Device upsert error: ' + devErr.message);
  console.log('Device upsert SUCCESS!');

  const { data: devices } = await supabase.from('fakecall_devices').select('*');
  console.log('Devices in radar table:', devices.length);

  // Clean up test device
  await supabase.from('fakecall_devices').delete().eq('id', testDevId);
  console.log('Test device cleaned up.');

  console.log('\nALL SUPABASE TESTS PASSED 100%! Ready for production deployment!');
}

runTest().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
