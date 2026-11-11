// The admin's session comes from /load (or /dev-login locally) in the address fragment.
// It lives only in this browser tab and is sent to the Worker as a Bearer token.
const KEY = 'pt-admin-session';

export function takeSession() {
  const match = window.location.hash.match(/session=([^&]+)/);
  if (match) {
    try { sessionStorage.setItem(KEY, decodeURIComponent(match[1])); } catch { /* storage blocked */ }
    history.replaceState(null, '', window.location.pathname + window.location.search);
    return decodeURIComponent(match[1]);
  }
  try { return sessionStorage.getItem(KEY); } catch { return null; }
}

let current = null;
export const setSession = (value) => { current = value; };
export const session = () => current;

export async function api(path, body) {
  const response = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${current}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.');
  return result;
}
