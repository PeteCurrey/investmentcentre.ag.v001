import { SupabaseClient } from '@supabase/supabase-js';
export declare function getSupabaseClient(): SupabaseClient;
/**
 * Returns a Supabase client authenticated with the service-role key (SUPABASE_SECRET_KEY).
 * MUST only be called from server-side code (API routes, server actions).
 * Required for writes to gate_decisions and mode_transitions which have application-role
 * UPDATE/DELETE revoked.
 */
export declare function getSupabaseServiceClient(): SupabaseClient;
export declare function resetSupabaseClient(): void;
//# sourceMappingURL=db.d.ts.map