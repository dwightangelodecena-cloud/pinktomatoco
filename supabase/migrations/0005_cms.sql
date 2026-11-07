-- Content editor: editable page content, photo uploads and full product editing.
-- Safe to run more than once. Run it in the Supabase SQL Editor after 0003_admin.sql.

-- Page content. One row per page; anything without a row uses the wording built into the site.
create table if not exists public.site_content (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;

drop policy if exists "site content is public" on public.site_content;
create policy "site content is public" on public.site_content for select using (true);
drop policy if exists "admins add site content" on public.site_content;
create policy "admins add site content" on public.site_content for insert to authenticated with check (public.is_admin());
drop policy if exists "admins change site content" on public.site_content;
create policy "admins change site content" on public.site_content for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Photos. Anyone can view them; only admins can upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-images', 'site-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "site images are public" on storage.objects;
create policy "site images are public" on storage.objects for select using (bucket_id = 'site-images');
drop policy if exists "admins upload site images" on storage.objects;
create policy "admins upload site images" on storage.objects for insert to authenticated
  with check (bucket_id = 'site-images' and public.is_admin());

-- New products and sizes need ids. The originals came from the old store.
create sequence if not exists public.products_id_seq owned by public.products.id;
select setval('public.products_id_seq', greatest((select max(id) from public.products), 1));
alter table public.products alter column id set default nextval('public.products_id_seq');

create sequence if not exists public.product_variants_id_seq owned by public.product_variants.id;
select setval('public.product_variants_id_seq', greatest((select max(id) from public.product_variants), 1));
alter table public.product_variants alter column id set default nextval('public.product_variants_id_seq');

-- Removing a size must not touch past orders, which keep their own copy of the name and price.
alter table public.order_items drop constraint if exists order_items_variant_id_fkey;
alter table public.order_items add constraint order_items_variant_id_fkey
  foreign key (variant_id) references public.product_variants(id) on delete set null;

-- A product with orders can't be deleted, because order_items.product_id blocks it. Hide it instead.
drop policy if exists "admins delete products" on public.products;
create policy "admins delete products" on public.products for delete to authenticated using (public.is_admin());

-- Saves a product and all its sizes together, so a failure can't leave it half changed.
-- p_product: { id?, slug?, name, sku, description_html, images, option_name, is_visible }
-- p_variants: [{ id?, label, price, sku, is_default }, ...] in display order
create or replace function public.admin_save_product(p_product jsonb, p_variants jsonb)
returns integer language plpgsql security definer set search_path = public as $fn$
declare
  v_id integer := (p_product->>'id')::int;
  v_images text[] := array(select jsonb_array_elements_text(coalesce(p_product->'images', '[]'::jsonb)));
  v_price numeric;
  v_item jsonb;
  v_variant_id integer;
  v_keep integer[] := '{}';
  v_sort integer := 0;
begin
  if not is_admin() then raise exception 'Not allowed'; end if;
  if coalesce(trim(p_product->>'name'), '') = '' then raise exception 'Give the product a name.'; end if;
  if p_variants is null or jsonb_array_length(p_variants) = 0 then raise exception 'Add at least one size.'; end if;

  select (x->>'price')::numeric into v_price
    from jsonb_array_elements(p_variants) x
   order by coalesce((x->>'is_default')::boolean, false) desc
   limit 1;

  if v_id is null then
    insert into products (slug, name, sku, price, description_html, images, option_name, is_visible)
    values (p_product->>'slug', p_product->>'name', p_product->>'sku', v_price, p_product->>'description_html',
            v_images, coalesce(p_product->>'option_name', 'Size'), coalesce((p_product->>'is_visible')::boolean, true))
    returning id into v_id;
  else
    update products set
      name = p_product->>'name',
      sku = p_product->>'sku',
      price = v_price,
      description_html = p_product->>'description_html',
      images = v_images,
      option_name = coalesce(p_product->>'option_name', 'Size'),
      is_visible = coalesce((p_product->>'is_visible')::boolean, true)
    where id = v_id;
    if not found then raise exception 'That product no longer exists.'; end if;
  end if;

  for v_item in select * from jsonb_array_elements(p_variants) loop
    if coalesce(trim(v_item->>'label'), '') = '' then raise exception 'Every size needs a name.'; end if;
    if (v_item->>'price')::numeric is null or (v_item->>'price')::numeric < 0 then raise exception 'Every size needs a price.'; end if;
    v_variant_id := (v_item->>'id')::int;

    if v_variant_id is null then
      insert into product_variants (product_id, label, price, sku, is_default, sort)
      values (v_id, v_item->>'label', (v_item->>'price')::numeric, v_item->>'sku',
              coalesce((v_item->>'is_default')::boolean, false), v_sort)
      returning id into v_variant_id;
    else
      update product_variants set
        label = v_item->>'label',
        price = (v_item->>'price')::numeric,
        sku = v_item->>'sku',
        is_default = coalesce((v_item->>'is_default')::boolean, false),
        sort = v_sort
      where id = v_variant_id and product_id = v_id;
      if not found then raise exception 'One of the sizes no longer exists. Reload and try again.'; end if;
    end if;

    v_keep := v_keep || v_variant_id;
    v_sort := v_sort + 1;
  end loop;

  delete from product_variants where product_id = v_id and not (id = any(v_keep));
  return v_id;
exception
  when unique_violation then raise exception 'Another product already has this name. Try a different one.';
end;
$fn$;

-- Chooses the homepage products, in order.
create or replace function public.admin_set_homepage_products(p_ids integer[])
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not is_admin() then raise exception 'Not allowed'; end if;
  update products
     set is_new = id = any(p_ids),
         new_rank = array_position(p_ids, id)
   where is_new or id = any(p_ids);
end;
$fn$;

revoke all on function public.admin_save_product(jsonb, jsonb) from public, anon;
revoke all on function public.admin_set_homepage_products(integer[]) from public, anon;
grant execute on function public.admin_save_product(jsonb, jsonb) to authenticated;
grant execute on function public.admin_set_homepage_products(integer[]) to authenticated;
