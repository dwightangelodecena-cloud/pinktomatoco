// The admin screens' calls, now answered by the Cloudflare Worker instead of Supabase and Vercel.
import { api, session } from '../api.js';

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

export const STORE_URL = 'https://pinktomatoco.com';

export const getCounts = () => api('/api/counts');

// One page of orders (25), newest first. Items and delivery load when an order is opened.
export const getOrderPage = (page = 1) => api(`/api/orders?page=${page}`);
export const getOrderDetails = (id) => api(`/api/orders?id=${id}`);
export const setOrderStatus = (id, statusId) => api('/api/orders', { id, statusId });

// Orders from the last `days` days, for the Dashboard, Sales and Customers tabs.
export const getRecentOrders = (days = 90) => api(`/api/sales?days=${days}`).then((r) => r.orders);

export const getCustomers = () => api('/api/customers');
export const getSubscribers = () => api('/api/subscribers');

export const getAdminProducts = () => api('/api/products');
export const saveProduct = (id, product) => api('/api/products', id ? { action: 'update', id, product } : { action: 'create', product });
export const setProductVisible = (id, isVisible) => api('/api/products', { action: 'visibility', id, isVisible });
export const deleteProduct = (id) => api('/api/products', { action: 'delete', id });

export const getAdminReviews = () => api('/api/reviews');
export const setReviewApproved = (review, approved) => api('/api/reviews', { action: 'approve', productId: review.product_id, id: review.id, approved });
export const deleteReview = (review) => api('/api/reviews', { action: 'delete', productId: review.product_id, id: review.id });

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Content tab: saved wording and photos for each section (missing sections use the built-in wording).
export const getContent = () => api('/api/content');
export const saveContent = (pages) => api('/api/content', { pages });

// Returns a web address for the photo. Product photos are copied by BigCommerce, so they're kept
// for a week; Content tab photos are shown on the store from this address, so they're kept (keep).
export async function uploadImage(file, keep = false) {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error('Please choose a JPG, PNG or WebP photo.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('That photo is over 5 MB. Please choose a smaller one.');
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(keep ? '/api/images?keep=1' : '/api/images', { method: 'POST', headers: { Authorization: `Bearer ${session()}` }, body: form });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The photo could not be uploaded. Please try again.');
  return result.url;
}
