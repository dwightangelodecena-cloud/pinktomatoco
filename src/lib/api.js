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

// All visible products, newest first (same order as the original "Shop All").
export async function getProducts() {
  if (cache) return cache;
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

export async function createOrder({ email, fullName, address, items }) {
  if (!supabase) throw new Error(NOT_CONFIGURED);
  const { data, error } = await supabase.rpc('create_order', {
    p_email: email,
    p_full_name: fullName,
    p_address: address,
    p_items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
  });
  if (error) throw error;
  return data;
}
