import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { CHANNEL_ID } from './bigcommerce.js';

const COOKIE = 'ptc_session';
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const key = () => createHash('sha256').update(`ptc-session:${process.env.BIGCOMMERCE_CLIENT_SECRET}`).digest();

// Encrypted and tamper-proof, so the customer's access token is never readable in the browser.
function seal(payload) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString('base64url')).join('.');
}

function unseal(value) {
  try {
    const [iv, tag, data] = value.split('.').map((part) => Buffer.from(part, 'base64url'));
    const decipher = createDecipheriv('aes-256-gcm', key(), iv);
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8'));
  } catch {
    return null;
  }
}

function cookieHeader(req, value, maxAge) {
  const secure = req.headers.host?.startsWith('localhost') ? '' : ' Secure;';
  return `${COOKIE}=${value}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${maxAge}`;
}

export function startSession(req, res, customer, accessToken) {
  const expires = Math.min(Date.now() + MAX_AGE_SECONDS * 1000, new Date(accessToken.expiresAt).getTime());
  const value = seal({ customer, token: accessToken.value, expires });
  res.setHeader('Set-Cookie', cookieHeader(req, value, Math.max(0, Math.floor((expires - Date.now()) / 1000))));
}

export function endSession(req, res) {
  res.setHeader('Set-Cookie', cookieHeader(req, '', 0));
}

export function readSession(req) {
  const match = (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  if (!match) return null;
  const session = unseal(match.slice(COOKIE.length + 1));
  return session && session.expires > Date.now() ? session : null;
}

// A one-time link that signs the shopper in on BigCommerce's own pages, used for checkout.
export function customerLoginUrl(origin, customerId, redirectTo) {
  const { BIGCOMMERCE_CLIENT_ID: iss, BIGCOMMERCE_CLIENT_SECRET: secret, BIGCOMMERCE_STORE_HASH: store_hash } = process.env;
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    iss,
    iat: Math.floor(Date.now() / 1000),
    jti: randomUUID(),
    operation: 'customer_login',
    store_hash,
    customer_id: customerId,
    channel_id: CHANNEL_ID,
    redirect_to: redirectTo,
  })}`;
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${origin}/login/token/${body}.${signature}`;
}
