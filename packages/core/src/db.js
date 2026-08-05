"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabaseClient = getSupabaseClient;
exports.getSupabaseServiceClient = getSupabaseServiceClient;
exports.resetSupabaseClient = resetSupabaseClient;
const supabase_js_1 = require("@supabase/supabase-js");
let supabaseInstance = null;
let supabaseServiceInstance = null;
function getSupabaseClient() {
    if (supabaseInstance) {
        return supabaseInstance;
    }
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Database Initialization Error: Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) environment variables.');
    }
    supabaseInstance = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
    return supabaseInstance;
}
/**
 * Returns a Supabase client authenticated with the service-role key (SUPABASE_SECRET_KEY).
 * MUST only be called from server-side code (API routes, server actions).
 * Required for writes to gate_decisions and mode_transitions which have application-role
 * UPDATE/DELETE revoked.
 */
function getSupabaseServiceClient() {
    if (supabaseServiceInstance) {
        return supabaseServiceInstance;
    }
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    if (!supabaseUrl || !secretKey) {
        throw new Error('Service Client Error: Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables.');
    }
    supabaseServiceInstance = (0, supabase_js_1.createClient)(supabaseUrl, secretKey, {
        auth: { persistSession: false },
    });
    return supabaseServiceInstance;
}
function resetSupabaseClient() {
    supabaseInstance = null;
    supabaseServiceInstance = null;
}
//# sourceMappingURL=db.js.map