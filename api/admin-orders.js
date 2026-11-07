import { requireAdmin, sendAdminError } from './_lib/admin.js';
import { isSameSite, readJson, sendJson } from './_lib/bigcommerce.js';
import { SETTABLE_STATUSES, countOrdersToHandle, getDeliveryAddress, listOrders, setOrderStatus } from './_lib/orders.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'POST' && !isSameSite(req)) return sendJson(res, 403, { error: 'Not allowed' });
    if (!(await requireAdmin(req, res))) return;

    if (req.method === 'GET') {
      const params = new URL(req.url, 'http://local').searchParams;
      if (params.has('summary')) return sendJson(res, 200, { toHandle: await countOrdersToHandle() });
      const id = Number(params.get('id'));
      if (Number.isInteger(id) && id > 0) return sendJson(res, 200, { delivery: await getDeliveryAddress(id) });
      return sendJson(res, 200, await listOrders());
    }

    if (req.method === 'POST') {
      const { id, statusId } = await readJson(req);
      if (!Number.isInteger(id) || id < 1 || !SETTABLE_STATUSES.includes(statusId)) return sendJson(res, 400, { error: 'That status change is not allowed.' });
      await setOrderStatus(id, statusId);
      return sendJson(res, 200, { ok: true });
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    sendAdminError(res, err);
  }
}
