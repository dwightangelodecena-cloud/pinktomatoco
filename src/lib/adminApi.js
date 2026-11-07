import { supabase } from './supabase.js';
import { clearProductCache } from './api.js';

export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];

async function rows(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Row level security skips rows it won't allow without raising an error, so a
// write that touched nothing has to be treated as a failure.
async function write(query) {
  const data = await rows(query.select('id'));
  if (data.length === 0) throw new Error("That change wasn't saved. Check you're still signed in as an admin.");
}

async function count(table, filter = (q) => q) {
  const { count: n, error } = await filter(supabase.from(table).select('id', { count: 'exact', head: true }));
  if (error) throw error;
  return n ?? 0;
}

// Numbers shown on the tab badges and the Overview tab.
export async function getCounts() {
  const [pendingOrders, waitingReviews, openMessages, subscribers] = await Promise.all([
    count('orders', (q) => q.eq('status', 'pending')),
    count('reviews', (q) => q.eq('approved', false)),
    count('contact_messages', (q) => q.eq('handled', false)),
    count('newsletter_subscribers'),
  ]);
  return { pendingOrders, waitingReviews, openMessages, subscribers };
}

export const getOrders = () =>
  rows(
    supabase
      .from('orders')
      .select('id, created_at, email, full_name, address, subtotal, status, order_items(id, name, option_label, quantity, unit_price)')
      .order('created_at', { ascending: false })
      .limit(500)
  );

export const setOrderStatus = (id, status) => write(supabase.from('orders').update({ status }).eq('id', id));

export const getAdminProducts = () =>
  rows(supabase.from('products').select('id, slug, name, images, is_visible, product_variants(id, label, price, sort)').order('id', { ascending: false }));

export async function setProductVisible(id, isVisible) {
  await write(supabase.from('products').update({ is_visible: isVisible }).eq('id', id));
  clearProductCache();
}

export async function setVariantPrices(changes) {
  await Promise.all(changes.map(({ id, price }) => write(supabase.from('product_variants').update({ price }).eq('id', id))));
  clearProductCache();
}

export const getAdminReviews = () =>
  rows(
    supabase
      .from('reviews')
      .select('id, rating, name, subject, comments, approved, created_at, products(name, slug)')
      .order('created_at', { ascending: false })
  );

export const setReviewApproved = (id, approved) => write(supabase.from('reviews').update({ approved }).eq('id', id));
export const deleteReview = (id) => write(supabase.from('reviews').delete().eq('id', id));

export const getMessages = () => rows(supabase.from('contact_messages').select('*').order('created_at', { ascending: false }));
export const setMessageHandled = (id, handled) => write(supabase.from('contact_messages').update({ handled }).eq('id', id));

export const getSubscribers = () => rows(supabase.from('newsletter_subscribers').select('id, email, created_at').order('created_at', { ascending: false }));
