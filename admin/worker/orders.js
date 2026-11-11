// Orders. Cloudflare's free plan allows 50 outbound requests per call, so the list is paged
// (25 at a time) and an order's items and delivery address load only when it is opened.
const PAGE_SIZE = 25;
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

const toAddress = (a = {}) => ({ line1: a.street_1, line2: a.street_2, city: a.city, state: a.state, zip: a.zip, country: a.country, phone: a.phone });

function toOrder(order) {
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
    item_count: order.items_total,
  };
}

export async function listOrders(bc, page = 1) {
  const orders = await bc.list(`/v2/orders?limit=${PAGE_SIZE}&page=${page}&sort=date_created:desc`);
  const { count } = await bc.get('/v2/orders/count');
  return { orders: orders.map(toOrder), page, pages: Math.max(1, Math.ceil(count / PAGE_SIZE)), total: count };
}

// One order's items and delivery address, fetched when the admin opens it.
export async function getOrderDetails(bc, id) {
  const [products, addresses] = await Promise.all([
    bc.list(`/v2/orders/${id}/products?limit=250`),
    bc.list(`/v2/orders/${id}/shipping_addresses`),
  ]);
  const a = addresses[0];
  return {
    order_items: products.map((p) => ({
      id: p.id,
      name: p.name,
      option_label: (p.product_options || []).map((o) => o.display_value).join(', '),
      quantity: p.quantity,
      unit_price: Number(p.price_inc_tax),
    })),
    delivery: a ? { name: [a.first_name, a.last_name].filter(Boolean).join(' '), ...toAddress(a), method: a.shipping_method } : null,
  };
}

export async function countOrdersToHandle(bc) {
  const { statuses } = await bc.get('/v2/orders/count');
  return statuses.filter((s) => TO_HANDLE.includes(s.id)).reduce((n, s) => n + s.count, 0);
}

export const setOrderStatus = (bc, id, statusId) => bc.put(`/v2/orders/${id}`, { status_id: statusId });

// Totals for the Dashboard and Sales tabs. 250 orders per request, no items, so it stays well
// under the request limit until the store has thousands of orders.
export async function salesSummary(bc, since) {
  const orders = [];
  for (let page = 1; page <= 20; page++) {
    const batch = await bc.list(`/v2/orders?limit=250&page=${page}&min_date_created=${encodeURIComponent(since)}&sort=date_created:desc`);
    orders.push(...batch);
    if (batch.length < 250) break;
  }
  return orders.map((o) => ({
    id: o.id,
    created_at: new Date(o.date_created).toISOString(),
    subtotal: Number(o.total_inc_tax),
    status: STATUS_GROUPS[o.status_id] ?? 'pending',
    items: o.items_total,
  }));
}
