// Pink Tomato admin: a private BigCommerce app on Cloudflare Workers.
// BigCommerce calls /auth on install, /load each time the app opens, and /uninstall.
// The React screens (built into ./dist) call /api/* with the session from /load.
import { AdminError, client, storeToken } from './bigcommerce.js';
import { createSession, readSession, verifyBigCommerceJwt } from './crypto.js';
import { createProduct, deleteProduct, listAdminProducts, setProductVisible, updateProduct } from './catalog.js';
import { SETTABLE_STATUSES, countOrdersToHandle, getOrderDetails, listOrders, salesSummary, setOrderStatus } from './orders.js';
import { deleteReview, listCustomers, listReviews, listSubscribers, setReviewApproved } from './customers.js';
import { saveUpload, serveUpload } from './media.js';
import { getContent, saveContent } from './content.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
const isId = (n) => Number.isInteger(n) && n > 0;

// The admin page reads its session from the address fragment, which never reaches a server log.
const openAdmin = (url, session) => Response.redirect(new URL(`/#session=${encodeURIComponent(session)}`, url).toString(), 302);

async function auth(request, env) {
  const url = new URL(request.url);
  const response = await fetch('https://login.bigcommerce.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.BC_CLIENT_ID,
      client_secret: env.BC_CLIENT_SECRET,
      code: url.searchParams.get('code'),
      context: url.searchParams.get('context'),
      scope: url.searchParams.get('scope'),
      grant_type: 'authorization_code',
      redirect_uri: `${url.origin}/auth`,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) return new Response('The app could not be installed. Please try again.', { status: 401 });
  const storeHash = String(body.context || '').replace('stores/', '');
  if (storeHash !== env.STORE_HASH) return new Response('This app is only for the Pink Tomato store.', { status: 403 });
  await env.STORE.put(`token:${storeHash}`, body.access_token);
  return openAdmin(request.url, await createSession(env, { storeHash, user: body.user }));
}

async function load(request, env) {
  const claims = await verifyBigCommerceJwt(new URL(request.url).searchParams.get('signed_payload_jwt'), env);
  const storeHash = String(claims?.sub || '').replace('stores/', '');
  if (!claims || storeHash !== env.STORE_HASH) return new Response('Please open the admin from the BigCommerce control panel.', { status: 401 });
  return openAdmin(request.url, await createSession(env, { storeHash, user: claims.user }));
}

async function uninstall(request, env) {
  const claims = await verifyBigCommerceJwt(new URL(request.url).searchParams.get('signed_payload_jwt'), env);
  if (!claims) return new Response('Not allowed', { status: 401 });
  await env.STORE.delete(`token:${env.STORE_HASH}`);
  return new Response('Uninstalled');
}

// Local development only: opens the admin without BigCommerce, using the token in .dev.vars.
async function devLogin(request, env) {
  const { hostname } = new URL(request.url);
  if (env.DEV_MODE !== '1' || !['localhost', '127.0.0.1'].includes(hostname)) return new Response('Not found', { status: 404 });
  return openAdmin(request.url, await createSession(env, { storeHash: env.STORE_HASH, user: { email: 'local developer' } }));
}

async function api(request, env, path) {
  const session = await readSession(request, env);
  if (!session) return json({ error: 'Your session has ended. Open the admin again from the BigCommerce control panel.' }, 401);
  if (request.method === 'POST' && path === '/api/images') {
    const saved = await saveUpload(request, env);
    return json(saved, saved.error ? 400 : 200);
  }
  const bc = client(env, await storeToken(env));
  const url = new URL(request.url);
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : null;

  switch (`${request.method} ${path}`) {
    case 'GET /api/me': return json({ email: session.email, store: env.STORE_HASH });
    case 'GET /api/counts': {
      const [pendingOrders, reviews, subscribers, customers] = await Promise.all([
        countOrdersToHandle(bc),
        listReviews(bc),
        bc.get('/v3/customers/subscribers?limit=1'),
        bc.get('/v3/customers?limit=1'),
      ]);
      return json({
        pendingOrders,
        waitingReviews: reviews.filter((r) => !r.approved).length,
        subscribers: subscribers.meta.pagination.total,
        customers: customers.meta.pagination.total,
      });
    }

    case 'GET /api/products': return json(await listAdminProducts(bc));
    case 'POST /api/products': {
      const { action, id, product, isVisible } = body;
      if (action === 'create') return json(await createProduct(bc, env, product));
      if (!isId(id)) return json({ error: 'Unknown product.' }, 400);
      if (action === 'update') return json(await updateProduct(bc, id, product));
      if (action === 'visibility') { await setProductVisible(bc, id, isVisible); return json({ ok: true }); }
      if (action === 'delete') { await deleteProduct(bc, id); return json({ ok: true }); }
      return json({ error: 'Unknown action.' }, 400);
    }

    case 'GET /api/orders': {
      const id = Number(url.searchParams.get('id'));
      if (isId(id)) return json(await getOrderDetails(bc, id));
      return json(await listOrders(bc, Math.max(1, Number(url.searchParams.get('page')) || 1)));
    }
    case 'POST /api/orders': {
      const { id, statusId } = body;
      if (!isId(id) || !SETTABLE_STATUSES.includes(statusId)) return json({ error: 'That status change is not allowed.' }, 400);
      await setOrderStatus(bc, id, statusId);
      return json({ ok: true });
    }
    case 'GET /api/sales': {
      const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days')) || 90));
      return json(await salesSummary(bc, new Date(Date.now() - days * 864e5).toUTCString()));
    }

    case 'GET /api/content': return json(await getContent(env));
    case 'POST /api/content': {
      if (!Array.isArray(body.pages) || body.pages.length === 0) return json({ error: 'Nothing to save.' }, 400);
      return json(await saveContent(bc, env, url.origin, body.pages));
    }
    case 'GET /api/customers': return json(await listCustomers(bc));
    case 'GET /api/subscribers': return json(await listSubscribers(bc));
    case 'GET /api/reviews': return json(await listReviews(bc));
    case 'POST /api/reviews': {
      const { action, productId, id, approved } = body;
      if (!isId(productId) || !isId(id)) return json({ error: 'Unknown review.' }, 400);
      if (action === 'approve') { await setReviewApproved(bc, productId, id, approved); return json({ ok: true }); }
      if (action === 'delete') { await deleteReview(bc, productId, id); return json({ ok: true }); }
      return json({ error: 'Unknown action.' }, 400);
    }
    default: return json({ error: 'Not found' }, 404);
  }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    try {
      if (pathname === '/auth') return await auth(request, env);
      if (pathname === '/load') return await load(request, env);
      if (pathname === '/uninstall') return await uninstall(request, env);
      if (pathname === '/dev-login') return await devLogin(request, env);
      if (pathname.startsWith('/media/')) return await serveUpload(env, pathname.slice(7));
      if (pathname.startsWith('/api/')) return await api(request, env, pathname);
      return env.ASSETS.fetch(request);
    } catch (err) {
      if (err instanceof AdminError) return json({ error: err.message }, 409);
      console.error(err);
      return json({ error: 'BigCommerce could not complete that. Please try again.' }, 502);
    }
  },
};
