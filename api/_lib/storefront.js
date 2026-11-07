import { CHANNEL_ID, bigcommerce } from './bigcommerce.js';

const TOKEN_LIFETIME_SECONDS = 24 * 60 * 60;
const RENEW_BEFORE_MS = 5 * 60 * 1000;

let cached = null;

// A private token is server-only, and is reused until it's close to expiring.
async function privateToken() {
  if (cached && cached.expires - RENEW_BEFORE_MS > Date.now()) return cached.token;
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS;
  const response = await bigcommerce('/v3/storefront/api-token-private', {
    method: 'POST',
    body: JSON.stringify({ channel_ids: [CHANNEL_ID], expires_at: expiresAt, scopes: ['Unauthenticated', 'Customer'] }),
  });
  if (!response.ok) throw new Error(`BigCommerce token request failed: ${response.status}`);
  const { data } = await response.json();
  cached = { token: data.token, expires: expiresAt * 1000 };
  return cached.token;
}

export async function storefront(query, variables = {}, customerToken) {
  const hash = process.env.BIGCOMMERCE_STORE_HASH;
  const response = await fetch(`https://store-${hash}-${CHANNEL_ID}.mybigcommerce.com/graphql`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await privateToken()}`,
      'Content-Type': 'application/json',
      ...(customerToken ? { 'X-Bc-Customer-Access-Token': customerToken } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`BigCommerce storefront request failed: ${response.status}`);
  return response.json();
}
