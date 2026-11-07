// Server-only BigCommerce helpers. The access token must never reach the browser.
const API = 'https://api.bigcommerce.com/stores';

export const CHANNEL_ID = 1;

export function bigcommerce(path, options = {}) {
  const { BIGCOMMERCE_STORE_HASH: hash, BIGCOMMERCE_ACCESS_TOKEN: token } = process.env;
  if (!hash || !token) throw new Error('BigCommerce keys are not set.');
  return fetch(`${API}/${hash}${path}`, {
    ...options,
    headers: { 'X-Auth-Token': token, Accept: 'application/json', 'Content-Type': 'application/json', ...options.headers },
  });
}

export function sendJson(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
  res.end(JSON.stringify(body));
}

export async function readJson(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
}

// Writes are only accepted from this site's own pages.
export function isSameSite(req) {
  try {
    return new URL(req.headers.origin).host === req.headers.host;
  } catch {
    return false;
  }
}
