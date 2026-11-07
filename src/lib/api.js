import { supabase } from './supabase.js';
import localProducts from '../data/products.json';

export const HOME_PRODUCT_LIMIT = 8;

const NOT_CONFIGURED = 'The store database is not connected yet. Please try again later.';

function normalize(row) {
  return {
    ...row,
    related: row.related ?? row.related_ids ?? [],
    variants: row.variants ?? row.product_variants ?? [],
  };
}

let cache = null;
export const clearProductCache = () => {
  cache = null;
};

// Homepage picks and similar items are chosen in the admin, so they come from Supabase.
// The original picks are the starting point until the admin saves their own.
export async function getMerchandising() {
  if (!supabase) return localProducts;
  const [{ data, error }, { data: featured }] = await Promise.all([
    supabase.from('products').select('id, is_new, new_rank, related_ids'),
    supabase.from('site_content').select('value').eq('key', 'featured').maybeSingle(),
  ]);
  const rows = error || !data?.length ? localProducts : data;
  const ids = featured?.value?.ids;
  if (!Array.isArray(ids)) return rows;
  const known = new Map(rows.map((row) => [row.id, row]));
  const all = [...new Set([...known.keys(), ...ids])];
  return all.map((id) => ({ ...known.get(id), id, is_new: ids.includes(id), new_rank: ids.includes(id) ? ids.indexOf(id) + 1 : null }));
}

async function getBigCommerceProducts() {
  const [response, merchandising] = await Promise.all([fetch('/api/products'), getMerchandising()]);
  if (!response.ok) throw new Error(`Products request failed: ${response.status}`);
  const products = await response.json();
  const extras = new Map(merchandising.map((row) => [row.id, row]));
  return products.map((p) => {
    const extra = extras.get(p.id);
    return {
      ...p,
      is_new: extra?.is_new ?? false,
      new_rank: extra?.new_rank ?? null,
      related: p.related.length ? p.related : extra?.related_ids ?? extra?.related ?? [],
    };
  });
}

// All visible products, newest first (same order as the original "Shop All").
// BigCommerce is the source. The older copies are only a fallback if it can't be reached.
export async function getProducts() {
  if (cache) return cache;
  try {
    const products = await getBigCommerceProducts();
    if (products.length) {
      cache = products.sort((a, b) => b.id - a.id);
      return cache;
    }
  } catch (err) {
    console.error('BigCommerce products error, using a saved copy:', err.message);
  }
  let rows = localProducts;
  if (supabase) {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variants(*)')
      .eq('is_visible', true)
      .order('id', { ascending: false });
    if (error) console.error('Supabase products error, using local data:', error.message);
    else if (data?.length) rows = data;
  }
  cache = rows.map(normalize).sort((a, b) => b.id - a.id);
  return cache;
}

export async function getProductBySlug(slug) {
  const all = await getProducts();
  return all.find((p) => p.slug === slug) || null;
}

export async function getNewProducts(limit = HOME_PRODUCT_LIMIT) {
  const all = await getProducts();
  return all
    .filter((p) => p.is_new)
    .sort((a, b) => (a.new_rank ?? 99) - (b.new_rank ?? 99))
    .slice(0, limit);
}

// Saved page content as { home: {...}, footer: {...} }. Pages without a row use the built-in wording.
export async function getSiteContent() {
  const { data, error } = await supabase.from('site_content').select('key, value');
  if (error) throw error;
  return Object.fromEntries(data.map((row) => [row.key, row.value]));
}

export async function getReviews(productId) {
  if (!supabase) return [];
  const { data } = await supabase
    .from('reviews')
    .select('id, rating, name, subject, comments, created_at')
    .eq('product_id', productId)
    .eq('approved', true)
    .order('created_at', { ascending: false });
  return data || [];
}

async function insert(table, row) {
  if (!supabase) throw new Error(NOT_CONFIGURED);
  const { error } = await supabase.from(table).insert(row);
  if (error) throw error;
}

export async function subscribe(email) {
  if (!supabase) throw new Error(NOT_CONFIGURED);
  const { error } = await supabase.from('newsletter_subscribers').insert({ email });
  if (error && error.code !== '23505') throw error; // already subscribed is fine
}

export const sendContactMessage = (msg) => insert('contact_messages', msg);
export const submitReview = (review) => insert('reviews', review);

// The signed-in customer's recent orders (row level security limits this to their own).
export async function getMyOrders(userId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('orders')
    .select('id, created_at, subtotal, status, order_items(name, option_label, quantity)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data || [];
}

async function postJson(url, body) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

export const startCheckout = (items) =>
  postJson('/api/checkout', { items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })) });

export const isCartActive = (cartId) => postJson('/api/cart-status', { cartId }).then((r) => r.active);
