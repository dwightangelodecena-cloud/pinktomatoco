import { supabase } from './supabase.js';
import { clearProductCache } from './api.js';

export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];

const NEEDS_UPDATE = 'The content editor needs its database update. Run supabase/migrations/0005_cms.sql in the Supabase SQL Editor.';

function check(error) {
  if (!error) return;
  if (['PGRST202', 'PGRST205', '42P01'].includes(error.code) || /bucket not found/i.test(error.message)) throw new Error(NEEDS_UPDATE);
  throw error;
}

async function rows(query) {
  const { data, error } = await query;
  check(error);
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
      .limit(1000)
  );

export const setOrderStatus = (id, status) => write(supabase.from('orders').update({ status }).eq('id', id));

export const getAdminProducts = () =>
  rows(supabase.from('products').select('*, product_variants(*)').order('id', { ascending: false }));

export async function setProductVisible(id, isVisible) {
  await write(supabase.from('products').update({ is_visible: isVisible }).eq('id', id));
  clearProductCache();
}

// Saves a product and its sizes in one step. See admin_save_product in 0005_cms.sql.
export async function saveProduct(product, variants) {
  const { error } = await supabase.rpc('admin_save_product', { p_product: product, p_variants: variants });
  check(error);
  clearProductCache();
}

export async function deleteProduct(id) {
  const { data, error } = await supabase.from('products').delete().eq('id', id).select('id');
  if (error?.code === '23503') throw new Error('This product has orders, so it can\'t be deleted. Hide it instead.');
  check(error);
  if (!data?.length) throw new Error("That product wasn't deleted. Check you're still signed in as an admin.");
  clearProductCache();
}

export async function setHomepageProducts(ids) {
  const { error } = await supabase.rpc('admin_set_homepage_products', { p_ids: ids });
  check(error);
  clearProductCache();
}

export async function saveContent(pages) {
  const updated_at = new Date().toISOString();
  const { error } = await supabase.from('site_content').upsert(pages.map((p) => ({ ...p, updated_at })));
  check(error);
}

const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function uploadImage(file) {
  const extension = IMAGE_TYPES[file.type];
  if (!extension) throw new Error('Please choose a JPG, PNG or WebP photo.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('That photo is over 5 MB. Please choose a smaller one.');
  const bucket = supabase.storage.from('site-images');
  const path = `uploads/${crypto.randomUUID()}.${extension}`;
  const { error } = await bucket.upload(path, file, { contentType: file.type });
  check(error);
  return bucket.getPublicUrl(path).data.publicUrl;
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

// Confirms the current password first, so an unattended signed-in screen can't be used to change it.
export async function changePassword(email, current, next) {
  const { error: wrong } = await supabase.auth.signInWithPassword({ email, password: current });
  if (wrong) throw new Error('Your current password is incorrect.');
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) throw error;
}

export const getSubscribers = () => rows(supabase.from('newsletter_subscribers').select('id, email, created_at').order('created_at', { ascending: false }));
