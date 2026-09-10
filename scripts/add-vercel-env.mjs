import { execSync } from 'child_process';

const publicKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!process.env.SUPABASE_URL || !publicKey || !serverKey) {
  throw new Error('Set SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY before running this script.');
}

const envs = [
  { name: 'VITE_SUPABASE_URL', value: process.env.SUPABASE_URL },
  { name: 'VITE_SUPABASE_PUBLISHABLE_KEY', value: publicKey },
  { name: 'SUPABASE_URL', value: process.env.SUPABASE_URL },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', value: serverKey },
];

for (const { name, value } of envs) {
  try {
    console.log(`Adding ${name}...`);
    execSync(`npx vercel env add ${name} production`, {
      input: `${value}\n`,
      stdio: ['pipe', 'inherit', 'inherit']
    });
  } catch (err) {
    console.warn(`Could not add ${name} (may already exist or failed):`, err.message);
  }
}

console.log('Finished updating Vercel environment variables.');
