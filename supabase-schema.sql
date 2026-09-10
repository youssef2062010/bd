-- 1. Create fakecall_config table
CREATE TABLE IF NOT EXISTS fakecall_config (
  id TEXT PRIMARY KEY DEFAULT 'main',
  version BIGINT DEFAULT 1,
  caller_name TEXT DEFAULT '',
  caller_phone TEXT DEFAULT '',
  caller_image TEXT DEFAULT '',
  voice_audio JSONB DEFAULT NULL,
  ringtone JSONB DEFAULT '{"id":"modern","name":"Modern Smartphone (Marimba)","uri":"synth:modern","enabled":true,"volume":0.85}'::jsonb,
  call_settings JSONB DEFAULT '{"autoAnswerDelaySeconds":0,"callDuration":60,"autoEndWhenAudioFinishes":true,"vibrationEnabled":true,"animationStyle":"pulse","theme":"romantic","fallingHeartsEnabled":true,"uiStyle":"ios","answerMethod":"buttons","realisticVoiceFilter":true,"autoRecordCalls":true}'::jsonb,
  branding JSONB DEFAULT '{"appDisplayName":"","appIcon":"","customIconUri":""}'::jsonb,
  updated_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 2. Insert clean initial row
INSERT INTO fakecall_config (id, version, caller_name, caller_phone, caller_image, voice_audio, ringtone, call_settings, branding, updated_at)
VALUES (
  'main',
  1,
  '',
  '',
  '',
  NULL,
  '{"id":"modern","name":"Modern Smartphone (Marimba)","uri":"synth:modern","enabled":true,"volume":0.85}'::jsonb,
  '{"autoAnswerDelaySeconds":0,"callDuration":60,"autoEndWhenAudioFinishes":true,"vibrationEnabled":true,"animationStyle":"pulse","theme":"romantic","fallingHeartsEnabled":true,"uiStyle":"ios","answerMethod":"buttons","realisticVoiceFilter":true,"autoRecordCalls":true}'::jsonb,
  '{"appDisplayName":"","appIcon":"","customIconUri":""}'::jsonb,
  (extract(epoch from now()) * 1000)::bigint
)
ON CONFLICT (id) DO NOTHING;

-- 3. Create fakecall_devices table
CREATE TABLE IF NOT EXISTS fakecall_devices (
  id TEXT PRIMARY KEY,
  platform TEXT DEFAULT '',
  browser TEXT DEFAULT '',
  os TEXT DEFAULT '',
  is_online BOOLEAN DEFAULT TRUE,
  last_seen BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint,
  launch_count INT DEFAULT 1,
  device_info JSONB DEFAULT '{}'::jsonb
);

-- 4. Create fakecall_recordings table
CREATE TABLE IF NOT EXISTS fakecall_recordings (
  id TEXT PRIMARY KEY,
  caller_name TEXT DEFAULT '',
  caller_phone TEXT DEFAULT '',
  caller_image TEXT DEFAULT '',
  timestamp BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint,
  duration_seconds NUMERIC DEFAULT 0,
  audio_data_uri TEXT,
  file_name TEXT DEFAULT '',
  file_size_text TEXT DEFAULT '',
  mime_type TEXT DEFAULT 'audio/webm'
);

-- 5. Enable Row Level Security (RLS) with Public Open Policies
ALTER TABLE fakecall_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE fakecall_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE fakecall_recordings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on fakecall_config" ON fakecall_config;
CREATE POLICY "Allow all on fakecall_config" ON fakecall_config FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on fakecall_devices" ON fakecall_devices;
CREATE POLICY "Allow all on fakecall_devices" ON fakecall_devices FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on fakecall_recordings" ON fakecall_recordings;
CREATE POLICY "Allow all on fakecall_recordings" ON fakecall_recordings FOR ALL USING (true) WITH CHECK (true);

-- 6. Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE fakecall_config;
ALTER PUBLICATION supabase_realtime ADD TABLE fakecall_devices;
ALTER PUBLICATION supabase_realtime ADD TABLE fakecall_recordings;
