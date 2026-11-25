```sql
-- ============================================================
-- AMIANI'S FLY WHOLESALERS
-- COMPLETE SUPABASE DATABASE
-- ============================================================
--
-- PRICING:
--   products.price = USD price per dozen
--   1 dozen = 12 flies
--
-- STOCK:
--   products.stock = number of dozens available
--
-- CART:
--   qty = number of dozens ordered
--
-- STORAGE:
--   product-images
--   category-images
--
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================

create extension if not exists pgcrypto;


-- ============================================================
-- CATEGORIES
-- ============================================================

create table if not exists public.categories (

    id uuid
        primary key
        default gen_random_uuid(),

    name text
        not null,

    slug text
        unique
        not null,

    description text
        default '',

    image_url text
        default '',

    created_at timestamptz
        not null
        default now()

);


-- ============================================================
-- PRODUCTS
-- ============================================================

create table if not exists public.products (

    id uuid
        primary key
        default gen_random_uuid(),

    name text
        not null,

    category_id uuid
        references public.categories(id)
        on delete set null,

    -- USD PRICE PER DOZEN
    price numeric(10,2)
        not null
        default 0
        check (price >= 0),

    image_url text
        default '',

    sizes text
        default '',

    description text
        default '',

    -- NUMBER OF DOZENS IN STOCK
    stock integer
        not null
        default 0
        check (stock >= 0),

    featured boolean
        not null
        default false,

    created_at timestamptz
        not null
        default now(),

    updated_at timestamptz
        not null
        default now()

);


-- ============================================================
-- ADMIN USERS
-- ============================================================

create table if not exists public.admin_users (

    user_id uuid
        primary key
        references auth.users(id)
        on delete cascade,

    created_at timestamptz
        not null
        default now()

);


-- ============================================================
-- ORDERS
-- ============================================================

create table if not exists public.orders (

    id uuid
        primary key
        default gen_random_uuid(),

    customer_name text
        not null,

    phone text
        not null,

    email text
        default '',

    address text
        not null,

    notes text
        default '',

    -- JSON ARRAY OF ORDERED PRODUCTS
    items jsonb
        not null
        default '[]'::jsonb,

    -- TOTAL ORDER VALUE IN USD
    total numeric(10,2)
        not null
        default 0
        check (total >= 0),

    status text
        not null
        default 'pending',

    created_at timestamptz
        not null
        default now()

);


-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists
products_category_id_idx
on public.products(category_id);


create index if not exists
products_created_at_idx
on public.products(created_at desc);


create index if not exists
orders_created_at_idx
on public.orders(created_at desc);


create index if not exists
orders_status_idx
on public.orders(status);


-- ============================================================
-- PRODUCT UPDATED_AT FUNCTION
-- ============================================================

create or replace function
public.set_products_updated_at()

returns trigger

language plpgsql

as $$

begin

    new.updated_at = now();

    return new;

end;

$$;


-- ============================================================
-- PRODUCT UPDATED_AT TRIGGER
-- ============================================================

drop trigger if exists
products_updated_at
on public.products;


create trigger
products_updated_at

before update
on public.products

for each row

execute function
public.set_products_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.categories
enable row level security;


alter table public.products
enable row level security;


alter table public.orders
enable row level security;


alter table public.admin_users
enable row level security;


-- ============================================================
-- CATEGORY POLICIES
-- ============================================================

drop policy if exists
"Public can read categories"
on public.categories;


create policy
"Public can read categories"

on public.categories

for select

to anon, authenticated

using (true);


drop policy if exists
"Admins manage categories"
on public.categories;


create policy
"Admins manage categories"

on public.categories

for all

to authenticated

using (

    exists (

        select 1

        from public.admin_users a

        where a.user_id = auth.uid()

    )

)

with check (

    exists (

        select 1

        from public.admin_users a

        where a.user_id = auth.uid()

    )

);


-- ============================================================
-- PRODUCT POLICIES
-- ============================================================

drop policy if exists
"Public can read products"
on public.products;


create policy
"Public can read products"

on public.products

for select

to anon, authenticated

using (true);


drop policy if exists
"Admins manage products"
on public.products;


create policy
"Admins manage products"

on public.products

for all

to authenticated

using (

    exists (

        select 1

        from public.admin_users a

        where a.user_id = auth.uid()

    )

)

with check (

    exists (

        select 1

        from public.admin_users a

        where a.user_id = auth.uid()

    )

);


-- ============================================================
-- ADMIN USERS POLICIES
-- ============================================================

drop policy if exists
"Admins can read own admin record"
on public.admin_users;


create policy
"Admins can read own admin record"

on public.admin_users

for select

to authenticated

using (

    user_id = auth.uid()

);


-- ============================================================
-- ORDER POLICIES
-- ============================================================

drop policy if exists
"Public can create orders"
on public.orders;


create policy
"Public can create orders"

on public.orders

for insert

to anon, authenticated

with check (true);


drop policy if exists
"Admins manage orders"
on public.orders;


create policy
"Admins manage orders"

on public.orders

for all

to authenticated

using (

    exists (

        select 1

        from public.admin_users a

        where a.user_id = auth.uid()

    )

)

with check (

    exists (

        select 1

        from public.admin_users a

        where a.user_id = auth.uid()

    )

);


-- ============================================================
-- STORAGE BUCKET: PRODUCT IMAGES
-- ============================================================

insert into storage.buckets (
    id,
    name,
    public
)

values (
    'product-images',
    'product-images',
    true
)

on conflict (id)

do update set
    public = true;


-- ============================================================
-- STORAGE BUCKET: CATEGORY IMAGES
-- ============================================================

insert into storage.buckets (
    id,
    name,
    public
)

values (
    'category-images',
    'category-images',
    true
)

on conflict (id)

do update set
    public = true;


-- ============================================================
-- PRODUCT IMAGE POLICIES
-- ============================================================

drop policy if exists
"Public can view product images"
on storage.objects;


create policy
"Public can view product images"

on storage.objects

for select

to anon, authenticated

using (

    bucket_id = 'product-images'

);


drop policy if exists
"Admins can upload product images"
on storage.objects;


create policy
"Admins can upload product images"

on storage.objects

for insert

to authenticated

with check (

    bucket_id = 'product-images'

    and exists (

        select 1

        from public.admin_users a

        where a.user_id = auth.uid()

    )

);


drop policy if exists
"Admins can update product images"
on storage.objects;


create policy
"Admins can update product images"

on storage.objects

for update

to authenticated

using (

    bucket_id = 'product-images'

    and exists (

        select 1

        from public.admin_users a

        where a.user_id = auth.uid()

    )

)

with check (

    bucket_id = 'product-images'

    and exists (

        select 1

        from public.admin_users a

        where a.user_id = auth.uid()

    )

);


drop policy if exists
"Admins can delete product images"
on storage.objects;


create policy
"Admins can delete product images"

on storage.objects

for delete

to authenticated

using (

    bucket_id = 'product-images'

    and exists (

        select 1

        from public.admin_users a

        where a.user_id = auth.uid()

    )

);


-- ============================================================
-- CATEGORY IMAGE POLICIES
-- ============================================================

drop policy if exists
"Public can view category images"
on storage.objects;


create policy
"Public can view category images"

on storage.objects

for select

to anon, authenticated

using (

    bucket_id = 'category-images'

);


drop policy if exists
"Admins can upload category images"
on storage.objects;


create policy
"Admins can upload category images"

on storage.objects

for insert

to authenticated

with check (

    bucket_id = 'category-images'

    and exists (

        select 1

        from public.admin_users a

        where a.user_id = auth.uid()

    )

);


drop policy if exists
"Admins can update category images"
on storage.objects;


create policy
"Admins can update category images"

on storage.objects

for update

to authenticated

using (

    bucket_id = 'category-images'

    and exists (

        select 1

        from public.admin_users a

        where a.user_id = auth.uid()

    )

)

with check (

    bucket_id = 'category-images'

    and exists (

        select 1

        from public.admin_users a

        where a.user_id = auth.uid()

    )

);


drop policy if exists
"Admins can delete category images"
on storage.objects;


create policy
"Admins can delete category images"

on storage.objects

for delete

to authenticated

using (

    bucket_id = 'category-images'

    and exists (

        select 1

        from public.admin_users a

        where a.user_id = auth.uid()

    )

);


-- ============================================================
-- ADMIN ACCOUNT
-- ============================================================
--
-- IMPORTANT:
--
-- First create the administrator in:
--
-- Supabase Dashboard
-- > Authentication
-- > Users
-- > Add user
--
-- Then copy that user's UUID.
--
-- Replace the UUID below if necessary.
--
-- ============================================================

insert into public.admin_users (
    user_id
)

values (
    '13dfec8e-d191-485d-99d0-6f5e84f36c86'
)

on conflict (user_id)

do nothing;


-- ============================================================
-- FINISHED
-- ============================================================
--
-- DATABASE:
--   categories       ✓
--   products         ✓
--   admin_users      ✓
--   orders           ✓
--
-- STORAGE:
--   product-images   ✓
--   category-images  ✓
--
-- PRICING:
--   USD per dozen   ✓
--
-- STOCK:
--   Number of dozens ✓
--
-- ============================================================
```