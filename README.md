# AMANI Fishing Wholesale

## Setup

1. Create a Supabase project.
2. Open Supabase SQL Editor and run `database.sql`.
3. In Supabase Authentication, create an admin email/password user.
4. Copy that user's UUID.
5. Run:
   `insert into public.admin_users(user_id) values ('YOUR-UUID');`
6. Open `supabase-config.js` and replace:
   - `YOUR-PROJECT`
   - `YOUR-SUPABASE-ANON-KEY`
7. Upload the whole folder to Vercel.
8. Open `/admin.html` and log in.

## Important

Only use the Supabase `anon` public key in the browser. Never expose a `service_role` key.

Product and category images uploaded by the admin are stored in Supabase Storage, not browser localStorage. Therefore the catalogue and images are available across devices.

The shopping cart is intentionally stored in the customer's browser. Orders are stored centrally in Supabase.
