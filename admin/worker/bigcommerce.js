// Server-only BigCommerce access. The token never reaches the browser.
const API = 'https://api.bigcommerce.com/stores';

// A message that's safe to show the admin, unlike unexpected errors.
export class AdminError extends Error {}

export async function storeToken(env) {
  const saved = await env.STORE.get(`token:${env.STORE_HASH}`);
  if (saved) return saved;
  // Local development only: .dev.vars can supply a store-level token instead of an install.
  if (env.DEV_MODE === '1' && env.DEV_ACCESS_TOKEN) return env.DEV_ACCESS_TOKEN;
  throw new AdminError('The app is not installed on this store yet. Install it from Apps in the BigCommerce control panel.');
}

export function client(env, token) {
  async function call(path, options = {}) {
    const response = await fetch(`${API}/${env.STORE_HASH}${path}`, {
      ...options,
      headers: { 'X-Auth-Token': token, Accept: 'application/json', 'Content-Type': 'application/json', ...options.headers },
    });
    if (response.status === 204) return null;
    const body = await response.json().catch(() => null);
    if (response.status === 409 || response.status === 422) {
      const detail = body?.errors ? Object.values(body.errors).join(' ') : '';
      throw new AdminError(detail || body?.title || 'BigCommerce refused that change.');
    }
    if (!response.ok) throw new Error(`BigCommerce request failed: ${response.status} ${path}`);
    return body;
  }
  const json = (method, body) => ({ method, body: JSON.stringify(body) });
  return {
    get: (path) => call(path),
    post: (path, body) => call(path, json('POST', body)),
    put: (path, body) => call(path, json('PUT', body)),
    delete: (path) => call(path, { method: 'DELETE' }),
    // v2 endpoints answer 204 for an empty list.
    list: async (path) => (await call(path)) || [],
  };
}
