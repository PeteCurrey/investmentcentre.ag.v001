"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabaseClient = getSupabaseClient;
exports.resetSupabaseClient = resetSupabaseClient;
const supabase_js_1 = require("@supabase/supabase-js");
let supabaseInstance = null;
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
function resetSupabaseClient() {
    supabaseInstance = null;
}
//# sourceMappingURL=db.js.map