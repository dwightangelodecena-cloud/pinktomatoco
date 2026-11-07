import { supabase } from './supabase.js';
import { clearProductCache, getMerchandising } from './api.js';

// Statuses the admin can set. Refunds stay in BigCommerce, where the money is handled.
export const ORDER_STATUSES = [
  { id: 1, label: 'Pending', group: 'pending' },
  { id: 7, label: 'Awaiting Payment', group: 'pending' },
  { id: 11, label: 'Awaiting Fulfillment', group: 'paid' },
  { id: 9, label: 'Awaiting Shipment', group: 'paid' },
  { id: 2, label: 'Shipped', group: 'shipped' },
  { id: 10, label: 'Completed', group: 'completed' },
  { id: 5, label: 'Cancelled', group: 'cancelled' },
];

export const ORDER_FILTERS = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'To ship' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

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

// Calls the server functions that reach BigCommerce. They check this session belongs to an admin.
async function adminRequest(path, body) {
  const { data } = await supabase.auth.getSession();
  const response = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${data.session?.access_token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.');
  return result;
}

async function count(table, filter = (q) => q) {
  const { count: n, error } = await filter(supabase.from(table).select('id', { count: 'exact', head: true }));
  if (error) throw error;
  return n ?? 0;
}

// Numbers shown on the tab badges and the Overview tab.
export async function getCounts() {
  const [{ toHandle: pendingOrders }, waitingReviews, openMessages, subscribers] = await Promise.all([
    adminRequest('/api/admin-orders?summary=1'),
    count('reviews', (q) => q.eq('approved', false)),
    count('contact_messages', (q) => q.eq('handled', false)),
    count('newsletter_subscribers'),
  ]);
  return { pendingOrders, waitingReviews, openMessages, subscribers };
}

export const getOrders = () => adminRequest('/api/admin-orders');
export const setOrderStatus = (id, statusId) => adminRequest('/api/admin-orders', { id, statusId });
export const getOrderDelivery = (id) => adminRequest(`/api/admin-orders?id=${id}`).then((r) => r.delivery);

export async function getAdminProducts() {
  const [products, merchandising] = await Promise.all([adminRequest('/api/admin-products'), getMerchandising()]);
  const extras = new Map(merchandising.map((row) => [row.id, row]));
  return products.map((p) => ({ ...p, is_new: extras.get(p.id)?.is_new ?? false, new_rank: extras.get(p.id)?.new_rank ?? null }));
}

export async function saveProduct(id, product) {
  const saved = await adminRequest('/api/admin-products', id ? { action: 'update', id, product } : { action: 'create', product });
  clearProductCache();
  return saved;
}

export async function setProductVisible(id, isVisible) {
  await adminRequest('/api/admin-products', { action: 'visibility', id, isVisible });
  clearProductCache();
}

export async function deleteProduct(id) {
  await adminRequest('/api/admin-products', { action: 'delete', id });
  clearProductCache();
}

export async function setHomepageProducts(ids) {
  await saveContent([{ key: 'featured', value: { ids } }]);
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

export const getCustomers = () => adminRequest('/api/admin-customers');

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
