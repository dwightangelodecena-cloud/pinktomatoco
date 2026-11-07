import { useMemo, useState } from 'react';
import { getCustomers, getOrders } from '../../lib/adminApi.js';
import { mergeCustomers } from '../../lib/adminStats.js';
import { money } from '../../lib/pricing.js';
import { Empty, Loading, Panel, Problem, formatDate, useAdminData } from './shared.jsx';

const loadCustomers = async () => {
  const [accounts, orders] = await Promise.all([getCustomers(), getOrders()]);
  return mergeCustomers(accounts, orders);
};

export default function CustomersTab() {
  const { data: customers, error } = useAdminData(loadCustomers);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () => (customers || []).filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)),
    [customers, q]
  );

  return (
    <Panel title="Customers" intro="Everyone with a BigCommerce account or an order, highest spenders first.">
      {customers?.length > 0 && (
        <input
          className="form-input admin-search"
          type="search"
          aria-label="Search customers"
          placeholder="Search by name or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      <Problem>{error}</Problem>
      {!customers && !error && <Loading />}
      {customers && shown.length === 0 && <Empty>{customers.length === 0 ? 'No customers yet.' : 'Nobody matches that search.'}</Empty>}
      {shown.length > 0 && (
        <ul className="admin-mini-list">
          {shown.map((c) => (
            <li key={c.email}>
              <span>
                <strong>{c.name}</strong>
                <a className="admin-customer-email" href={`mailto:${c.email}`}>{c.email}</a>
              </span>
              <span className="admin-muted">
                {c.orders} order{c.orders === 1 ? '' : 's'}
                {c.lastOrder ? ` · last ${formatDate(c.lastOrder)}` : c.joined ? ` · joined ${formatDate(c.joined)}` : ''}
              </span>
              <span>{money(c.spent)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
