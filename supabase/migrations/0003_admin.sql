-- Admin area: who is an admin, and what admins may read and change.
-- Safe to run more than once. Run it in the Supabase SQL Editor.

-- Admins are listed here. No policies on purpose: the browser can't read or change this table.
-- To add another admin, run: insert into public.admins (user_id) select id from auth.users where email = '...';
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from admins where user_id = auth.uid());
$fn$;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.contact_messages add column if not exists handled boolean not null default false;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending', 'paid', 'shipped', 'completed', 'cancelled'));

-- Orders
drop policy if exists "admins read orders" on public.orders;
create policy "admins read orders" on public.orders for select to authenticated using (public.is_admin());
drop policy if exists "admins update orders" on public.orders;
create policy "admins update orders" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins read order items" on public.order_items;
create policy "admins read order items" on public.order_items for select to authenticated using (public.is_admin());

-- Products
drop policy if exists "admins read products" on public.products;
create policy "admins read products" on public.products for select to authenticated using (public.is_admin());
drop policy if exists "admins update products" on public.products;
create policy "admins update products" on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins update variants" on public.product_variants;
create policy "admins update variants" on public.product_variants for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Reviews
drop policy if exists "admins read reviews" on public.reviews;
create policy "admins read reviews" on public.reviews for select to authenticated using (public.is_admin());
drop policy if exists "admins update reviews" on public.reviews;
create policy "admins update reviews" on public.reviews for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins delete reviews" on public.reviews;
create policy "admins delete reviews" on public.reviews for delete to authenticated using (public.is_admin());

-- Messages and subscribers
drop policy if exists "admins read messages" on public.contact_messages;
create policy "admins read messages" on public.contact_messages for select to authenticated using (public.is_admin());
drop policy if exists "admins update messages" on public.contact_messages;
create policy "admins update messages" on public.contact_messages for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins read subscribers" on public.newsletter_subscribers;
create policy "admins read subscribers" on public.newsletter_subscribers for select to authenticated using (public.is_admin());

-- Reviewer emails stay private: the public API can read every review column except email.
revoke select on public.reviews from anon, authenticated;
grant select (id, product_id, rating, name, subject, comments, approved, created_at)
  on public.reviews to anon, authenticated;

-- First admin. Also confirms the email, so this account can sign in straight away.
update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where email = 'pink@tomato.com';
insert into public.admins (user_id)
  select id from auth.users where email = 'pink@tomato.com'
  on conflict do nothing;
