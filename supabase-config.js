// AMANI FISHING WHOLESALE
// Replace these two values with your Supabase project values.
// Never put a Supabase service_role key in this file.
window.AMANI_SUPABASE_URL = "https://wniqhlsksdualxtdhagz.supabase.co";
window.AMANI_SUPABASE_ANON_KEY = "sb_publishable_WtsnP0zQ-g-AHN4LA2cd3A_bu2XoGpZ";

window.AMANI_SUPABASE =
  window.supabase && window.supabase.createClient
    ? window.supabase.createClient(
        window.AMANI_SUPABASE_URL,
        window.AMANI_SUPABASE_ANON_KEY
      )
    : null;
