// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use the widest generic so both "public" and "meridian" schema clients satisfy the type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

let supabaseInstance: AnySupabaseClient | null = null;
let supabaseServiceInstance: AnySupabaseClient | null = null;

function resolveSupabaseUrl(): string | undefined {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!rawUrl) return undefined;
  if (rawUrl.startsWith('https://') || rawUrl.startsWith('http://')) return rawUrl;
  // Convert PostgreSQL connection string to the Supabase REST URL
  if (rawUrl.startsWith('postgresql://') || rawUrl.startsWith('postgres://')) {
    const match = rawUrl.match(/db\.([a-z0-9]+)\.supabase\.co/);
    if (match && match[1]) {
      return `https://${match[1]}.supabase.co`;
    }
  }
  return rawUrl;
}

/**
 * @deprecated PROHIBITED: Nothing server-side should use the unauthenticated anon key.
 * All server-side database access MUST use getSupabaseServiceClient().
 */
export function getSupabaseClient(): AnySupabaseClient {
  throw new Error(
    'SECURITY EXCEPTION: getSupabaseClient() is prohibited. All database access must use getSupabaseServiceClient().'
  );
}

/**
 * Returns a Supabase client authenticated with the service-role key (SUPABASE_SECRET_KEY).
 * MUST only be called from server-side code (API routes, server actions).
 * Required for writes to gate_decisions and mode_transitions which have application-role
 * UPDATE/DELETE revoked.
 */
export function getSupabaseServiceClient(): AnySupabaseClient {
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
