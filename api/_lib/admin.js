import { sendJson } from './bigcommerce.js';

// The browser sends the admin's Supabase session. Supabase confirms it belongs to a listed admin.
export async function requireAdmin(req, res) {
  const authorization = req.headers.authorization;
  const url = process.env.VITE_SUPABASE_URL;
  const apikey = process.env.VITE_SUPABASE_ANON_KEY;

  if (authorization?.startsWith('Bearer ') && url && apikey) {
    const response = await fetch(`${url}/rest/v1/rpc/is_admin`, {
      method: 'POST',
      headers: { apikey, Authorization: authorization, 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (response.ok && (await response.json()) === true) return true;
  }

  sendJson(res, 403, { error: 'Please sign in as an admin.' });
  return false;
}

// A message that's safe to show the admin, unlike unexpected errors.
export class AdminError extends Error {}

export function sendAdminError(res, err) {
  if (err instanceof AdminError) return sendJson(res, 409, { error: err.message });
  console.error(err);
  sendJson(res, 502, { error: 'BigCommerce could not complete that. Please try again.' });
}
