/*
==========================================
PROF IA MEDIA PARTNERS
config.js
==========================================
*/

// Informations Supabase
const SUPABASE_URL = "https://cfikzkivgimvvswyqpfq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_D71-5xxFnk6KKgmVg3ADBw_ccfRxehG";

// Création du client
const sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

// Disponible partout
window.sb = sb;

console.log("✅ Supabase connecté.");