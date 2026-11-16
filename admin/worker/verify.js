// Email codes for the shop: a 6-digit code is emailed before an account is created, and to reset a
// forgotten password. The shop's pages call these routes from the browser.
//
//   GET  /verify/config  -> { enabled }            (off until an email service is connected)
//   POST /verify/send    { email, purpose }        purpose: "signup" or "reset"
//   POST /verify/check   { email, purpose, code }  -> { token } when the code is right
//   POST /verify/reset   { email, token, password } sets the new password (purpose "reset" only)
//
// Codes are never stored as typed: only a keyed hash, for 10 minutes, with 5 tries.
// Sending is limited per email and per visitor so the routes can't be used to flood someone's inbox.
// Emails go through Resend (https://resend.com): RESEND_API_KEY is a secret, MAIL_FROM a var such as
// "Pink Tomato <hello@pinktomatoco.com>" on a domain verified in Resend.

const CODE_TTL = 600; // seconds a code lasts
const TOKEN_TTL = 900; // seconds a "verified" token lasts after a right code
const MAX_TRIES = 5;
const SENDS_PER_EMAIL = 5; // per hour
const SENDS_PER_VISITOR = 15; // per hour
const PURPOSES = ['signup', 'reset'];

const ALLOWED_ORIGINS = [
  'https://pinktomatoco.com',
  'https://www.pinktomatoco.com',
  'https://store-v7sdscf7vw.mybigcommerce.com',
  'http://localhost:3005',
];

// The live domain, this store's BigCommerce addresses (theme previews run there) and the local preview.
const allowedOrigin = (origin) => ALLOWED_ORIGINS.includes(origin)
  || /^https:\/\/store-v7sdscf7vw(-[a-z0-9]+)?\.mybigcommerce\.com$/.test(origin)
  || /^https:\/\/([a-z0-9-]+\.)?pinktomatoco\.com$/.test(origin)
  // Local theme previews (stencil start) on any port.
  || /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/.test(origin);

function cors(request) {
  const origin = request.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': allowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
  };
}

export const emailEnabled = (env) => Boolean(env.RESEND_API_KEY && env.MAIL_FROM);
const enabled = (env) => Boolean(env.RESEND_API_KEY && env.MAIL_FROM);
const cleanEmail = (value) => String(value || '').trim().toLowerCase().slice(0, 254);
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
const enc = new TextEncoder();

async function hmac(env, text) {
  const key = await crypto.subtle.importKey('raw', enc.encode(`pt-verify:${env.BC_CLIENT_SECRET}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(text));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

// Compares two hex strings without stopping at the first difference.
function same(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function newCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return String(n).padStart(6, '0');
}

// A short-lived proof that this email was confirmed: "email|purpose|expires.signature".
async function makeToken(env, email, purpose) {
  const body = `${email}|${purpose}|${Math.floor(Date.now() / 1000) + TOKEN_TTL}`;
  return `${btoa(body)}.${await hmac(env, body)}`;
}

async function readToken(env, token, email, purpose) {
  const [b64, sig] = String(token || '').split('.');
  if (!b64 || !sig) return false;
  let body;
  try { body = atob(b64); } catch { return false; }
  if (!same(await hmac(env, body), sig)) return false;
  const [tEmail, tPurpose, exp] = body.split('|');
  return tEmail === email && tPurpose === purpose && Number(exp) > Date.now() / 1000;
}

// Counts sends in the current hour; true when over the limit.
async function overLimit(env, key, max) {
  const hour = Math.floor(Date.now() / 3600000);
  const k = `verify-rate:${key}:${hour}`;
  const used = Number(await env.STORE.get(k)) || 0;
  if (used >= max) return true;
  await env.STORE.put(k, String(used + 1), { expirationTtl: 3700 });
  return false;
}

async function findCustomer(bc, email) {
  const { data } = await bc.get(`/v3/customers?email:in=${encodeURIComponent(email)}&limit=1`);
  return data && data[0];
}

function emailHtml(code, purpose) {
  const line = purpose === 'signup' ? 'Here is your code to finish creating your Pink Tomato account.'
    : purpose === 'pin' ? 'Here is your code to choose a new admin security code. If you didn\x27t ask for it, someone may be trying to change it.'
      : 'Here is your code to choose a new password for your Pink Tomato account.';
  const digits = code.split('').map((d) => `<td style="width:44px;height:56px;border:1px solid #e2d2cc;border-radius:12px;background:#fdf8f5;font:600 28px Georgia,serif;color:#2b2024;text-align:center">${d}</td>`).join('<td style="width:8px"></td>');
  return `<!doctype html><html><body style="margin:0;background:#f7efea;padding:32px 12px;font-family:Helvetica,Arial,sans-serif;color:#5c4f53">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:24px;padding:36px 28px" cellspacing="0" cellpadding="0">
<tr><td align="center" style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#a83a42">Pink Tomato Candle &amp; Bath Co.</td></tr>
<tr><td align="center" style="padding:14px 0 6px;font:500 26px Georgia,serif;color:#2b2024">Your code</td></tr>
<tr><td align="center" style="padding-bottom:22px;font-size:15px;line-height:1.5">${line}</td></tr>
<tr><td align="center"><table role="presentation" cellspacing="0" cellpadding="0"><tr>${digits}</tr></table></td></tr>
<tr><td align="center" style="padding-top:22px;font-size:13px;line-height:1.5;color:#75666b">The code works for 10 minutes. If you didn't ask for it, you can ignore this email.</td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendEmail(env, to, code, purpose) {
  const subject = purpose === 'signup' ? `${code} is your Pink Tomato code`
    : purpose === 'pin' ? `${code} is your Pink Tomato admin code` : `${code} is your Pink Tomato password code`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [to],
      subject,
      html: emailHtml(code, purpose),
      text: `Your Pink Tomato code is ${code}. It works for 10 minutes. If you didn't ask for it, you can ignore this email.`,
    }),
  });
  if (!response.ok) {
    console.log('verify email failed', response.status, (await response.text()).slice(0, 200));
    throw new Error('send failed');
  }
}

export async function verifyRoute(request, env, pathname, bcFor) {
  const headers = cors(request);
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (pathname === '/verify/config') return reply({ enabled: enabled(env) });
  if (request.method !== 'POST') return reply({ error: 'Not found' }, 404);
  if (!enabled(env)) return reply({ error: 'Email codes are not switched on yet.' }, 503);

  const body = await request.json().catch(() => ({}));
  const email = cleanEmail(body.email);
  const purpose = PURPOSES.includes(body.purpose) ? body.purpose : '';
  if (!validEmail(email)) return reply({ error: 'Please enter a valid email address.' }, 400);
  if (!purpose) return reply({ error: 'Unknown request.' }, 400);
  const id = await hmac(env, `id:${email}`);
  const codeKey = `verify-code:${purpose}:${id}`;

  if (pathname === '/verify/send') {
    const visitor = request.headers.get('CF-Connecting-IP') || 'local';
    if (await overLimit(env, `ip:${await hmac(env, visitor)}`, SENDS_PER_VISITOR) || await overLimit(env, `email:${id}`, SENDS_PER_EMAIL)) {
      return reply({ error: 'Too many codes were asked for. Please wait a while and try again.' }, 429);
    }
    const bc = await bcFor();
    const customer = await findCustomer(bc, email);
    if (purpose === 'signup' && customer) return reply({ error: 'There is already an account with this email. Sign in instead, or reset your password.', exists: true }, 409);
    // For a reset, the answer is the same whether or not the email has an account, so nobody can
    // use this page to find out who shops here. The code is only sent when there is an account.
    if (purpose === 'reset' && !customer) return reply({ ok: true });
    const code = newCode();
    await env.STORE.put(codeKey, JSON.stringify({ hash: await hmac(env, `code:${id}:${code}`), tries: 0 }), { expirationTtl: CODE_TTL });
    try {
      await sendEmail(env, email, code, purpose);
    } catch {
      return reply({ error: 'The email could not be sent. Please try again in a minute.' }, 502);
    }
    return reply({ ok: true });
  }

  if (pathname === '/verify/check') {
    const saved = JSON.parse((await env.STORE.get(codeKey)) || 'null');
    if (!saved) return reply({ error: 'That code has expired. Ask for a new one.', expired: true }, 400);
    const code = String(body.code || '').replace(/\D/g, '');
    if (code.length === 6 && same(await hmac(env, `code:${id}:${code}`), saved.hash)) {
      await env.STORE.delete(codeKey);
      return reply({ ok: true, token: await makeToken(env, email, purpose) });
    }
    saved.tries += 1;
    if (saved.tries >= MAX_TRIES) {
      await env.STORE.delete(codeKey);
      return reply({ error: 'Too many wrong tries. Ask for a new code.', expired: true }, 400);
    }
    await env.STORE.put(codeKey, JSON.stringify(saved), { expirationTtl: CODE_TTL });
    return reply({ error: 'That code isn\'t right. Check the email and try again.', left: MAX_TRIES - saved.tries }, 400);
  }

  if (pathname === '/verify/reset' && purpose === 'reset') {
    if (!(await readToken(env, body.token, email, 'reset'))) return reply({ error: 'This step has timed out. Please start again.', expired: true }, 400);
    const password = String(body.password || '');
    if (password.length < 7 || password.length > 100 || !/[a-z]/i.test(password) || !/\d/.test(password)) {
      return reply({ error: 'Use at least 7 characters, with letters and numbers.' }, 400);
    }
    const bc = await bcFor();
    const customer = await findCustomer(bc, email);
    if (!customer) return reply({ error: 'This step has timed out. Please start again.', expired: true }, 400);
    try {
      await bc.put('/v3/customers', [{ id: customer.id, authentication: { force_password_reset: false, new_password: password } }]);
    } catch (err) {
      return reply({ error: err.message || 'That password could not be saved. Try a different one.' }, 400);
    }
    return reply({ ok: true });
  }

  return reply({ error: 'Not found' }, 404);
}
