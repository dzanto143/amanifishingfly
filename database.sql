-- ============================================================
-- AMANI FISHING WHOLESALE
-- DATABASE - NO SUPABASE AUTH ADMIN LOGIN
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- CATEGORIES
-- ============================================================

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text default '',
  image_url text default '',
  created_at timestamptz default now()
);

-- ============================================================
-- PRODUCTS
-- ============================================================

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  price numeric(10,2) not null default 0,
  image_url text default '',
  sizes text default '',
  description text default '',
  stock integer not null default 0,
  featured boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- ORDERS
-- ============================================================

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  email text default '',
  address text not null,
  notes text default '',
  items jsonb not null default '[]'::jsonb,
  total numeric(10,2) not null default 0,
  status text not null default 'pending',
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists products_category_id_idx
on public.products(category_id);

create index if not exists products_created_at_idx
on public.products(created_at desc);

create index if not exists orders_created_at_idx
on public.orders(created_at desc);

-- ============================================================
-- PRODUCT UPDATED TIMESTAMP
-- ============================================================

create or replace function public.set_products_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_updated_at on public.products;

create trigger products_updated_at
before update on public.products
for each row
execute function public.set_products_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

-- ============================================================
-- PUBLIC CATEGORY READ
-- ============================================================

drop policy if exists "Public can read categories"
on public.categories;

create policy "Public can read categories"
on public.categories
for select
using (true);

-- ============================================================
-- PUBLIC PRODUCT READ
-- ============================================================

drop policy if exists "Public can read products"
on public.products;

create policy "Public can read products"
on public.products
for select
using (true);

-- ============================================================
-- PUBLIC ORDER CREATION
-- ============================================================

drop policy if exists "Public can create orders"
on public.orders;

create policy "Public can create orders"
on public.orders
for insert
to anon, authenticated
with check (true);

-- ============================================================
-- STORAGE
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
do update set public = true;

-- Public can view images
drop policy if exists "Public can view product images"
on storage.objects;

create policy "Public can view product images"
on storage.objects
for select
using (
  bucket_id = 'product-images'
);