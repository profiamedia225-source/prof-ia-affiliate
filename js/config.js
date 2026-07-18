/*
==========================================
PROF IA MEDIA PARTNERS
config.js
==========================================
*/

// Informations Supabase
const SUPABASE_URL = "https://cfikzkivgimvvswyqpfq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_D71-5xxFnk6KKgmVg3ADBw_ccfRxehG";
const APP_URL = "https://prof-ia-affiliate.vercel.app";

// Création du client
const sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);

// Disponible partout
window.sb = sb;
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
console.log("✅ Supabase connecté.");