import { requireAdmin, sendAdminError } from './_lib/admin.js';
import { isSameSite, readJson, sendJson } from './_lib/bigcommerce.js';
import { createProduct, deleteProduct, listAdminProducts, setProductVisible, updateProduct } from './_lib/catalog.js';

const isId = (n) => Number.isInteger(n) && n > 0;

export default async function handler(req, res) {
  try {
    if (req.method === 'POST' && !isSameSite(req)) return sendJson(res, 403, { error: 'Not allowed' });
    if (!(await requireAdmin(req, res))) return;

    if (req.method === 'GET') return sendJson(res, 200, await listAdminProducts());
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

    const { action, id, product, isVisible } = await readJson(req);
    if (action === 'create') return sendJson(res, 200, await createProduct(product));
    if (!isId(id)) return sendJson(res, 400, { error: 'Unknown product.' });
    if (action === 'update') return sendJson(res, 200, await updateProduct(id, product));
    if (action === 'visibility') {
      await setProductVisible(id, isVisible);
      return sendJson(res, 200, { ok: true });
    }
    if (action === 'delete') {
      await deleteProduct(id);
      return sendJson(res, 200, { ok: true });
    }
    sendJson(res, 400, { error: 'Unknown action.' });
  } catch (err) {
    sendAdminError(res, err);
  }
}
