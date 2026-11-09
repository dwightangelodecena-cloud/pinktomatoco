import { CHANNEL_ID, bigcommerce, isSameSite, readJson, sendJson } from './_lib/bigcommerce.js';
import { customerLoginUrl, readSession } from './_lib/session.js';

const MAX_LINES = 50;
const MAX_QUANTITY = 999;
const isId = (n) => Number.isInteger(n) && n > 0;

// Prices aren't sent from the browser. BigCommerce works them out from the catalog.
function toLineItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) return null;
  const lines = items.map((i) => ({ product_id: i?.productId, variant_id: i?.variantId, quantity: i?.quantity }));
  const valid = lines.every((l) => isId(l.product_id) && isId(l.variant_id) && isId(l.quantity) && l.quantity <= MAX_QUANTITY);
  return valid ? lines : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
  if (!isSameSite(req)) return sendJson(res, 403, { error: 'Not allowed' });

  try {
    // Guests can check out. A signed-in customer's order is linked to their account.
    const customerId = readSession(req)?.customer.id;

    const { items } = await readJson(req);
    const lineItems = toLineItems(items);
    if (!lineItems) return sendJson(res, 400, { error: 'Your cart could not be read. Please refresh and try again.' });

    const response = await bigcommerce('/v3/carts?include=redirect_urls', {
      method: 'POST',
      body: JSON.stringify({ channel_id: CHANNEL_ID, line_items: lineItems, ...(customerId ? { customer_id: customerId } : {}) }),
    });
    if (response.status === 422) {
      return sendJson(res, 409, { error: 'An item in your cart has sold out or has fewer left than you selected. Please update your cart and try again.' });
    }
    if (!response.ok) throw new Error(`BigCommerce cart request failed: ${response.status}`);

    const { data } = await response.json();
    const checkout = new URL(data.redirect_urls.checkout_url);
    // A signed-in customer stays signed in on BigCommerce's checkout.
    const url = customerId ? customerLoginUrl(checkout.origin, customerId, checkout.pathname + checkout.search) : checkout.href;
    sendJson(res, 200, { cartId: data.id, url });
  } catch (err) {
    console.error(err);
    sendJson(res, 502, { error: 'Checkout is not available right now. Please try again in a moment.' });
  }
}
