import { createClient } from '@supabase/supabase-js';
function getEnv(key) {
    try {
        if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) {
            return import.meta.env[key];
        }
    }
    catch { }
    try {
        if (typeof process !== 'undefined' && process.env?.[key]) {
            return process.env[key];
        }
    }
    catch { }
    return '';
}
const supabaseUrl = getEnv('VITE_SUPABASE_URL') ||
    getEnv('NEXT_PUBLIC_SUPABASE_URL') ||
    getEnv('SUPABASE_URL') ||
    'https://zixeyymkpemzjzesmcpq.supabase.co';
const supabaseAnonKey = getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ||
    getEnv('VITE_SUPABASE_ANON_KEY') ||
    getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
    getEnv('SUPABASE_ANON_KEY') ||
    'public-key-not-configured';
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
});
export default supabase;
