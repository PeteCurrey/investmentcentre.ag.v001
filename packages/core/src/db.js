"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabaseClient = getSupabaseClient;
const supabase_js_1 = require("@supabase/supabase-js");
let supabaseInstance = null;
function getSupabaseClient() {
    if (supabaseInstance) {
        return supabaseInstance;
    }
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
        // If not provided, return a mock or warn, but in production we throw
        console.warn('WARNING: SUPABASE_URL or SUPABASE_ANON_KEY environment variables are missing. Database integrations will fail.');
    }
    supabaseInstance = (0, supabase_js_1.createClient)(supabaseUrl || 'https://placeholder-url.supabase.co', supabaseAnonKey || 'placeholder-anon-key');
    return supabaseInstance;
}
//# sourceMappingURL=db.js.map