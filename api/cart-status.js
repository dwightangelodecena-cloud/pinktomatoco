import { bigcommerce, isSameSite, readJson, sendJson } from './_lib/bigcommerce.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// BigCommerce removes a cart once it becomes an order, so a missing cart means the shopper finished checkout.
export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
  if (!isSameSite(req)) return sendJson(res, 403, { error: 'Not allowed' });

  try {
    const { cartId } = await readJson(req);
    if (!UUID.test(cartId ?? '')) return sendJson(res, 400, { error: 'Invalid cart' });
    const response = await bigcommerce(`/v3/carts/${cartId}`);
    if (response.status !== 200 && response.status !== 404) throw new Error(`BigCommerce cart status failed: ${response.status}`);
    sendJson(res, 200, { active: response.status === 200 });
  } catch (err) {
    console.error(err);
    sendJson(res, 502, { error: 'Cart status is not available.' });
  }
}
