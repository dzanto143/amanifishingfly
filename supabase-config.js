// AMANI FISHING WHOLESALE
// Replace these two values with your Supabase project values.
// Never put a Supabase service_role key in this file.
window.AMANI_SUPABASE_URL = "https://jxxbfnjhbgsopixvrzow.supabase.co";
window.AMANI_SUPABASE_ANON_KEY = "sb_publishable_s_Xl68a74D7AxSjixyW3OA_WStqOU4y";

window.AMANI_SUPABASE =
  window.supabase && window.supabase.createClient
    ? window.supabase.createClient(
        window.AMANI_SUPABASE_URL,
        window.AMANI_SUPABASE_ANON_KEY
      )
    : null;
