// The admin's security code (a 6-digit "2FA" code): asked for before a customer is deleted.
// Each admin (by the email they signed in with) has their own code, set and changed on the Profile tab.
// Only a salted PBKDF2 hash is kept in KV, never the code. Wrong codes are counted: 5 misses lock code
// entry for 15 minutes. A forgotten code can be reset with a one-time code emailed to the admin.
import { AdminError } from './bigcommerce.js';
import { emailEnabled, sendEmail } from './verify.js';

const ITERATIONS = 100000;
const MAX_MISSES = 5;
const LOCK_SECONDS = 900;
const RESET_TTL = 600;
const enc = new TextEncoder();

const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
const validPin = (pin) => /^\d{6}$/.test(String(pin || ''));

async function idFor(env, email) {
  const key = await crypto.subtle.importKey('raw', enc.encode(`pt-pin:${env.SESSION_SECRET}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(String(email || '').trim().toLowerCase())));
}

async function derive(pin, saltHex) {
  const salt = new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, base, 256));
}

function same(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function save(env, id, pin) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  await env.STORE.put(`pin:${id}`, JSON.stringify({ salt, hash: await derive(pin, salt), updated: new Date().toISOString() }));
  await env.STORE.delete(`pin-miss:${id}`);
}

export async function pinStatus(env, email) {
  const saved = JSON.parse((await env.STORE.get(`pin:${await idFor(env, email)}`)) || 'null');
  return { pinSet: Boolean(saved), pinUpdated: saved?.updated || null, canEmailReset: emailEnabled(env) && /@/.test(email || '') };
}

// Throws a friendly AdminError when the code is wrong, missing or locked.
export async function checkPin(env, email, pin) {
  const id = await idFor(env, email);
  const saved = JSON.parse((await env.STORE.get(`pin:${id}`)) || 'null');
  if (!saved) throw new AdminError('Set your security code on the Profile tab first.');
  const misses = Number(await env.STORE.get(`pin-miss:${id}`)) || 0;
  if (misses >= MAX_MISSES) throw new AdminError('Too many wrong codes. Try again in 15 minutes, or reset your code on the Profile tab.');
  if (validPin(pin) && same(await derive(pin, saved.salt), saved.hash)) {
    if (misses) await env.STORE.delete(`pin-miss:${id}`);
    return true;
  }
  await env.STORE.put(`pin-miss:${id}`, String(misses + 1), { expirationTtl: LOCK_SECONDS });
  const left = MAX_MISSES - misses - 1;
  throw new AdminError(left > 0 ? `That security code isn't right. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Too many wrong codes. Try again in 15 minutes, or reset your code on the Profile tab.');
}

export async function setPin(env, email, { current, next }) {
  if (!validPin(next)) throw new AdminError('Your security code must be exactly 6 numbers.');
  const id = await idFor(env, email);
  if (await env.STORE.get(`pin:${id}`)) await checkPin(env, email, current);
  await save(env, id, String(next));
  return pinStatus(env, email);
}

export async function sendPinReset(env, email) {
  if (!emailEnabled(env) || !/@/.test(email || '')) throw new AdminError('Code emails are not available for this account.');
  const id = await idFor(env, email);
  const rate = `pin-reset-rate:${id}:${Math.floor(Date.now() / 3600000)}`;
  const used = Number(await env.STORE.get(rate)) || 0;
  if (used >= 5) throw new AdminError('Too many reset emails. Please wait an hour and try again.');
  await env.STORE.put(rate, String(used + 1), { expirationTtl: 3700 });
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  await env.STORE.put(`pin-reset:${id}`, JSON.stringify({ salt, hash: await derive(code, salt), tries: 0 }), { expirationTtl: RESET_TTL });
  try {
    await sendEmail(env, email, code, 'pin');
  } catch {
    throw new AdminError('The email could not be sent. Please try again in a minute.');
  }
  return { ok: true };
}

export async function resetPin(env, email, { code, next }) {
  if (!validPin(next)) throw new AdminError('Your new security code must be exactly 6 numbers.');
  const id = await idFor(env, email);
  const saved = JSON.parse((await env.STORE.get(`pin-reset:${id}`)) || 'null');
  if (!saved) throw new AdminError('That emailed code has expired. Send a new one.');
  if (validPin(code) && same(await derive(String(code), saved.salt), saved.hash)) {
    await env.STORE.delete(`pin-reset:${id}`);
    await save(env, id, String(next));
    return pinStatus(env, email);
  }
  saved.tries += 1;
  if (saved.tries >= MAX_MISSES) {
    await env.STORE.delete(`pin-reset:${id}`);
    throw new AdminError('Too many wrong tries. Send a new code.');
  }
  await env.STORE.put(`pin-reset:${id}`, JSON.stringify(saved), { expirationTtl: RESET_TTL });
  throw new AdminError('That emailed code isn\'t right. Check the email and try again.');
}
