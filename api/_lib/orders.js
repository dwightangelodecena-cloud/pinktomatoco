import { bigcommerce } from './bigcommerce.js';

const ORDER_LIMIT = 250;
const LOOKUPS_AT_ONCE = 8;
const TO_HANDLE = [1, 9, 11, 12]; // Pending, Awaiting Shipment, Awaiting Fulfillment, Manual Verification Required

// Groups BigCommerce's order statuses for the admin's filters.
const STATUS_GROUPS = {
  0: 'pending', 1: 'pending', 7: 'pending', 12: 'pending',
  9: 'paid', 11: 'paid', 8: 'paid',
  2: 'shipped', 3: 'shipped',
  10: 'completed',
  4: 'cancelled', 5: 'cancelled', 6: 'cancelled', 13: 'cancelled', 14: 'completed',
};

// Statuses the admin may set. Refunds and disputes stay in BigCommerce, where the money is handled.
export const SETTABLE_STATUSES = [1, 7, 11, 9, 2, 10, 5];

async function readList(path) {
  const response = await bigcommerce(path);
  if (response.status === 204) return [];
  if (!response.ok) throw new Error(`BigCommerce request failed: ${response.status}`);
  return response.json();
}

function toAddress(a = {}) {
  return { line1: a.street_1, line2: a.street_2, city: a.city, state: a.state, zip: a.zip, country: a.country, phone: a.phone };
}

export function toOrder(order, products) {
  const billing = order.billing_address || {};
  return {
    id: order.id,
    created_at: new Date(order.date_created).toISOString(),
    email: billing.email || '',
    full_name: [billing.first_name, billing.last_name].filter(Boolean).join(' ') || 'Guest',
    address: toAddress(billing),
    subtotal: Number(order.total_inc_tax),
    status: STATUS_GROUPS[order.status_id] ?? 'pending',
    statusId: order.status_id,
    statusLabel: order.custom_status || order.status,
    order_items: products.map((p) => ({
      id: p.id,
      name: p.name,
      option_label: (p.product_options || []).map((o) => o.display_value).join(', '),
      quantity: p.quantity,
      unit_price: Number(p.price_inc_tax),
    })),
  };
}

export async function listOrders() {
  const orders = await readList(`/v2/orders?limit=${ORDER_LIMIT}&sort=date_created:desc`);
  const results = [];
  for (let i = 0; i < orders.length; i += LOOKUPS_AT_ONCE) {
    const batch = orders.slice(i, i + LOOKUPS_AT_ONCE);
    const products = await Promise.all(batch.map((o) => readList(`/v2/orders/${o.id}/products?limit=250`)));
    batch.forEach((o, n) => results.push(toOrder(o, products[n])));
  }
  return results;
}

export async function countOrdersToHandle() {
  const response = await bigcommerce('/v2/orders/count');
  if (!response.ok) throw new Error(`BigCommerce order count failed: ${response.status}`);
  const { statuses } = await response.json();
  return statuses.filter((s) => TO_HANDLE.includes(s.id)).reduce((n, s) => n + s.count, 0);
}

export async function getDeliveryAddress(orderId) {
  const addresses = await readList(`/v2/orders/${orderId}/shipping_addresses`);
  const a = addresses[0];
  if (!a) return null;
  return { name: [a.first_name, a.last_name].filter(Boolean).join(' '), ...toAddress(a), method: a.shipping_method };
}

export async function setOrderStatus(orderId, statusId) {
  const response = await bigcommerce(`/v2/orders/${orderId}`, { method: 'PUT', body: JSON.stringify({ status_id: statusId }) });
  if (!response.ok) throw new Error(`BigCommerce order update failed: ${response.status}`);
}
