import { requireAdmin, sendAdminError } from './_lib/admin.js';
import { bigcommerce, sendJson } from './_lib/bigcommerce.js';

async function listCustomers() {
  const customers = [];
  for (let page = 1, pages = 1; page <= pages; page++) {
    const response = await bigcommerce(`/v3/customers?limit=250&page=${page}&sort=date_created:desc`);
    if (!response.ok) throw new Error(`BigCommerce customers request failed: ${response.status}`);
    const { data, meta } = await response.json();
    customers.push(...data);
    pages = meta.pagination.total_pages;
  }
  // Only what the Customers tab shows.
  return customers.map((c) => ({
    id: c.id,
    name: [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email,
    email: c.email,
    joined: c.date_created,
  }));
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });
    if (!(await requireAdmin(req, res))) return;
    sendJson(res, 200, await listCustomers());
  } catch (err) {
    sendAdminError(res, err);
  }
}
