import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let supabaseServiceInstance: SupabaseClient | null = null;

function resolveSupabaseUrl(): string | undefined {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!rawUrl) return undefined;
  if (rawUrl.startsWith('https://') || rawUrl.startsWith('http://')) return rawUrl;
  if (rawUrl.startsWith('postgresql://') || rawUrl.startsWith('postgres://')) {
    const match = rawUrl.match(/db\.([a-z0-9]+)\.supabase\.co/);
    if (match && match[1]) {
      return `https://${match[1]}.supabase.co`;
    }
  }
  return rawUrl;
}

export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = resolveSupabaseUrl();
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Database Initialization Error: Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) environment variables.'
    );
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    db: { schema: 'meridian' },
  });
  return supabaseInstance;
}

/**
 * Returns a Supabase client authenticated with the service-role key (SUPABASE_SECRET_KEY).
 * MUST only be called from server-side code (API routes, server actions).
 * Required for writes to gate_decisions and mode_transitions which have application-role
 * UPDATE/DELETE revoked.
 */
export function getSupabaseServiceClient(): SupabaseClient {
  if (supabaseServiceInstance) {
    return supabaseServiceInstance;
  }

  const supabaseUrl = resolveSupabaseUrl();
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    throw new Error(
      'Service Client Error: Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables.'
    );
  }

  supabaseServiceInstance = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false },
    db: { schema: 'meridian' },
  });
  return supabaseServiceInstance;
}

export function resetSupabaseClient(): void {
  supabaseInstance = null;
  supabaseServiceInstance = null;
}
