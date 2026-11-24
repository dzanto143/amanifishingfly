// AMANI FISHING WHOLESALE
// Replace these two values with your Supabase project values.
// Never put a Supabase service_role key in this file.
window.AMANI_SUPABASE_URL = "https://amanifishingfly.vercel.app/.supabase.co";
window.AMANI_SUPABASE_ANON_KEY = "prj_xMmooTPK38Mfn1324yy9xM52659h";

window.AMANI_SUPABASE =
  window.supabase && window.supabase.createClient
    ? window.supabase.createClient(
        window.AMANI_SUPABASE_URL,
        window.AMANI_SUPABASE_ANON_KEY
      )
    : null;
