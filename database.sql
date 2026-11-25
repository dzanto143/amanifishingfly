-- ============================================================
-- AMANI FISHING WHOLESALE
-- SUPABASE DATABASE
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

  price numeric(10,2)
    not null
    default 0,

  image_url text
    default '',

  sizes text
    default '',

  description text
    default '',

  stock integer
    not null
    default 0,

  featured boolean
    not null
    default false,

  created_at timestamptz
    default now(),

  updated_at timestamptz
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

  items jsonb
    not null
    default '[]'::jsonb,

  total numeric(10,2)
    not null
    default 0,

  status text
    not null
    default 'pending',

  created_at timestamptz
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


-- ============================================================
-- UPDATED_AT FUNCTION
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


alter table public.admin_users
enable row level security;


alter table public.orders
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
"Admins can read admin_users"
on public.admin_users;


create policy
"Admins can read admin_users"

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
-- STORAGE BUCKET
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
-- STORAGE: PUBLIC READ
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


-- ============================================================
-- STORAGE: ADMIN UPLOAD
-- ============================================================

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


-- ============================================================
-- STORAGE: ADMIN UPDATE
-- ============================================================

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


-- ============================================================
-- STORAGE: ADMIN DELETE
-- ============================================================

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
-- ADMIN ACCOUNT
-- ============================================================
--
-- IMPORTANT:
-- FIRST create your administrator in:
--
-- Supabase
-- Authentication
-- Users
-- Add user
--
-- Then copy that user's UUID.
--
-- Replace the UUID below.
-- ============================================================

insert into public.admin_users (
  user_id
)

values (
  '343c72c7-8d80-4d18-909a-707a76553a20'
)

on conflict (user_id)
do nothing;