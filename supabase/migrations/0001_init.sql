-- Pink Tomato Candle & Bath Co. schema
-- Run this first (SQL editor or `supabase db push`), then run supabase/seed.sql.

create table if not exists public.products (
  id               integer primary key,
  slug             text not null unique,
  name             text not null,
  sku              text,
  price            numeric(10,2) not null default 0,
  description_html text,
  images           text[] not null default '{}',
  option_name      text default 'Size',
  is_new           boolean not null default false,
  new_rank         integer,
  bulk_pricing     jsonb not null default '[]'::jsonb,
  related_ids      integer[] not null default '{}',
  is_visible       boolean not null default true,
  created_at       timestamptz not null default now()
);

create table if not exists public.product_variants (
  id          integer primary key,
  product_id  integer not null references public.products(id) on delete cascade,
  label       text not null,
  price       numeric(10,2) not null,
  sku         text,
  is_default  boolean not null default false,
  sort        integer not null default 0,
  stock       integer
);
create index if not exists product_variants_product_id_idx on public.product_variants(product_id);

create table if not exists public.reviews (
  id          bigint generated always as identity primary key,
  product_id  integer not null references public.products(id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  name        text not null,
  email       text not null,
  subject     text not null,
  comments    text not null,
  approved    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id          bigint generated always as identity primary key,
  email       text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id            bigint generated always as identity primary key,
  full_name     text not null,
  phone         text,
  email         text not null,
  order_number  text,
  company_name  text,
  rma_number    text,
  comments      text not null,
  created_at    timestamptz not null default now()
);

create table if not exists public.orders (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete set null,
  email       text not null,
  full_name   text not null,
  address     jsonb not null,
  subtotal    numeric(10,2) not null,
  status      text not null default 'pending',
  created_at  timestamptz not null default now()
);

create table if not exists public.order_items (
  id           bigint generated always as identity primary key,
  order_id     bigint not null references public.orders(id) on delete cascade,
  product_id   integer not null references public.products(id),
  variant_id   integer references public.product_variants(id),
  name         text not null,
  option_label text,
  quantity     integer not null check (quantity > 0),
  unit_price   numeric(10,2) not null
);

-- Row level security
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.reviews enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.contact_messages enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "products are public" on public.products;
create policy "products are public" on public.products for select using (is_visible);
drop policy if exists "variants are public" on public.product_variants;
create policy "variants are public" on public.product_variants for select using (true);

drop policy if exists "approved reviews are public" on public.reviews;
create policy "approved reviews are public" on public.reviews for select using (approved);
drop policy if exists "anyone can submit a review" on public.reviews;
create policy "anyone can submit a review" on public.reviews for insert with check (approved = false);

drop policy if exists "anyone can subscribe" on public.newsletter_subscribers;
create policy "anyone can subscribe" on public.newsletter_subscribers for insert with check (true);

drop policy if exists "anyone can send a message" on public.contact_messages;
create policy "anyone can send a message" on public.contact_messages for insert with check (true);

drop policy if exists "users read own orders" on public.orders;
create policy "users read own orders" on public.orders for select using (auth.uid() = user_id);
drop policy if exists "users read own order items" on public.order_items;
create policy "users read own order items" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- Bulk pricing: unit price for a variant at a given quantity.
-- percent = % off; price = amount off each; fixed = flat price each.
create or replace function public.bulk_unit_price(base numeric, tiers jsonb, qty integer)
returns numeric language sql immutable as $fn$
  select coalesce((
    select case t->>'type'
      when 'percent' then round(base * (1 - (t->>'value')::numeric / 100), 2)
      when 'price'   then greatest(base - (t->>'value')::numeric, 0)
      when 'fixed'   then (t->>'value')::numeric
      else base end
    from jsonb_array_elements(tiers) t
    where qty >= (t->>'min')::int
      and (t->>'max' is null or qty <= (t->>'max')::int)
    limit 1
  ), base);
$fn$;

-- Checkout: prices are computed server-side from the catalog, never trusted from the browser.
-- p_items: [{ "variant_id": 185, "quantity": 2 }, ...]
create or replace function public.create_order(p_email text, p_full_name text, p_address jsonb, p_items jsonb)
returns bigint language plpgsql security definer set search_path = public as $fn$
declare
  v_order_id bigint;
  v_item jsonb;
  v_variant record;
  v_qty integer;
  v_unit numeric;
  v_subtotal numeric := 0;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  insert into orders (user_id, email, full_name, address, subtotal)
  values (auth.uid(), p_email, p_full_name, p_address, 0)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty < 1 then raise exception 'Invalid quantity'; end if;

    select v.id, v.label, v.price, p.id as product_id, p.name
      into v_variant
      from product_variants v join products p on p.id = v.product_id
     where v.id = (v_item->>'variant_id')::int and p.is_visible;
    if not found then raise exception 'Unknown product option'; end if;

    v_unit := v_variant.price;
    v_subtotal := v_subtotal + v_unit * v_qty;

    insert into order_items (order_id, product_id, variant_id, name, option_label, quantity, unit_price)
    values (v_order_id, v_variant.product_id, v_variant.id, v_variant.name, v_variant.label, v_qty, v_unit);
  end loop;

  update orders set subtotal = v_subtotal where id = v_order_id;
  return v_order_id;
end;
$fn$;

grant execute on function public.create_order(text, text, jsonb, jsonb) to anon, authenticated;
