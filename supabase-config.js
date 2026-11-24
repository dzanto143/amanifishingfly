// AMANI FISHING WHOLESALE
// Replace these two values with your Supabase project values.
// Never put a Supabase service_role key in this file.
window.AMANI_SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
window.AMANI_SUPABASE_ANON_KEY = "YOUR-SUPABASE-ANON-KEY";

window.AMANI_SUPABASE =
  window.supabase && window.supabase.createClient
    ? window.supabase.createClient(
        window.AMANI_SUPABASE_URL,
        window.AMANI_SUPABASE_ANON_KEY
      )
    : null;
