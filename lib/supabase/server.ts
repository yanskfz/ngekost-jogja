import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readPublicEnv, readServiceRoleKey } from '@/lib/env';
import { requireSupabasePublicConfig } from '@/lib/supabase/client';

/** Server-side anon client for server components and route handlers. Still subject to row-level security. */
export function createServerSupabaseClient(): SupabaseClient {
  const { url, anonKey } = requireSupabasePublicConfig(readPublicEnv());
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

/** Privileged client that bypasses row-level security. Server only; use for admin/system operations. */
export function createServiceSupabaseClient(): SupabaseClient {
  const { url } = requireSupabasePublicConfig(readPublicEnv());
  const serviceRoleKey = readServiceRoleKey();
  if (!serviceRoleKey) {
    throw new Error('Supabase service role is not configured: set SUPABASE_SERVICE_ROLE_KEY (see .env.example).');
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
