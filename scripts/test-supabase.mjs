import { createClient } from '@supabase/supabase-js';
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

const supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

console.log('Testing Supabase connection to:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabase() {
  const { data, error } = await supabase.from('fakecall_config').select('*');
  if (error) {
    console.error('fakecall_config query error:', error);
  } else {
    console.log('fakecall_config success! Rows found:', data?.length);
    console.log('Current main config:', data?.[0]?.branding);
  }

  // Test upsert
  const testUpdate = {
    id: 'main',
    version: 2,
    caller_name: 'Farida',
    caller_phone: '01012345678',
    branding: {
      appDisplayName: '12/12❤️',
      appIcon: 'farida',
      customIconUri: '/icon-192.png'
    },
    updated_at: Date.now()
  };
  const { error: upsertErr } = await supabase.from('fakecall_config').upsert(testUpdate);
  if (upsertErr) {
    console.error('Upsert test error:', upsertErr);
  } else {
    console.log('Upsert test SUCCESS! Updated caller_name to Farida.');
  }

  const { data: readBack } = await supabase.from('fakecall_config').select('*').eq('id', 'main').single();
  console.log('Read back caller_name:', readBack?.caller_name);
}

testSupabase().catch(console.error);
