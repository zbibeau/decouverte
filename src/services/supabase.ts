import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client used by the Solid app to load published parcours content.
 *
 * Reads:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *
 * Returns null when env vars are missing so the app can fall back to
 * the legacy hardcoded sections without crashing in dev.
 */
let cached: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!url || !anonKey) {
    // eslint-disable-next-line no-console
    console.warn('[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing — falling back to legacy sections');
    cached = null;
    return cached;
  }

  cached = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  return cached;
}
