// Small HMAC helpers on Web Crypto: BigCommerce's signed_payload_jwt (HS256) and the admin's own session token.
const encoder = new TextEncoder();

const base64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64url = (text) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

const key = (secret, hash = 'SHA-256') => crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash }, false, ['sign', 'verify']);
// BigCommerce signs app-load tokens with HS256 and storefront "current customer" tokens with HS512.
const HMAC_HASH = { HS256: 'SHA-256', HS512: 'SHA-512' };

async function verifyHs256(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || !secret) return null;
  const [header, payload, signature] = parts;
  // Anything malformed is simply "not valid", never a server error.
  try {
    const hash = HMAC_HASH[JSON.parse(new TextDecoder().decode(fromBase64url(header))).alg];
    if (!hash) return null;
    const ok = await crypto.subtle.verify('HMAC', await key(secret, hash), fromBase64url(signature), encoder.encode(`${header}.${payload}`));
    if (!ok) return null;
    return JSON.parse(new TextDecoder().decode(fromBase64url(payload)));
  } catch {
    return null;
  }
}

// BigCommerce opens the app with a JWT signed by the app's client secret.
export async function verifyBigCommerceJwt(token, env) {
  const claims = await verifyHs256(token, env.BC_CLIENT_SECRET);
  const now = Math.floor(Date.now() / 1000);
  if (!claims || claims.aud !== env.BC_CLIENT_ID) return null;
  if (claims.exp && claims.exp < now) return null;
  if (claims.nbf && claims.nbf > now + 60) return null;
  return claims;
}

const SESSION_HOURS = 12;

// The admin's own short-lived session, kept in the browser tab and sent as a Bearer token.
export async function createSession(env, { storeHash, user }) {
  const header = base64url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = base64url(encoder.encode(JSON.stringify({
    sub: storeHash,
    email: user?.email || '',
    exp: Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600,
  })));
  const signature = await crypto.subtle.sign('HMAC', await key(env.SESSION_SECRET), encoder.encode(`${header}.${payload}`));
  return `${header}.${payload}.${base64url(signature)}`;
}

export async function readSession(request, env) {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  const claims = await verifyHs256(auth.slice(7), env.SESSION_SECRET);
  if (!claims || claims.exp < Math.floor(Date.now() / 1000) || claims.sub !== env.STORE_HASH) return null;
  return claims;
}
