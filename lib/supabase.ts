import { createClient, SupabaseClient } from "@supabase/supabase-js";

function getEnv(key: string): string {
  try {
    if (typeof import.meta !== "undefined" && (import.meta as any).env?.[key]) {
      return (import.meta as any).env[key];
    }
  } catch { }
  try {
    if (typeof process !== "undefined" && process.env?.[key]) {
      return process.env[key] as string;
    }
  } catch { }
  return "";
}

const supabaseUrl =
  getEnv("VITE_SUPABASE_URL") ||
  getEnv("NEXT_PUBLIC_SUPABASE_URL") ||
  getEnv("SUPABASE_URL") ||
  "https://zixeyymkpemzjzesmcpq.supabase.co";

const supabaseAnonKey =
  getEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ||
  getEnv("VITE_SUPABASE_ANON_KEY") ||
  getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
  getEnv("SUPABASE_ANON_KEY") ||
  "public-key-not-configured";

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

export default supabase;