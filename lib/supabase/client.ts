import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readPublicEnv, type PublicEnv } from '@/lib/env';

export function requireSupabasePublicConfig(env: PublicEnv = readPublicEnv()) {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error(
      'Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).',
    );
  }
  return { url: env.supabaseUrl, anonKey: env.supabaseAnonKey };
}

/** Browser/anon client. Subject to row-level security; safe to import from client components. */
export function createBrowserSupabaseClient(env?: PublicEnv): SupabaseClient {
  const { url, anonKey } = requireSupabasePublicConfig(env);
  return createClient(url, anonKey);
}
