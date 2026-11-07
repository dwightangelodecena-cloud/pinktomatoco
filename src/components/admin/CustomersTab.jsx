import { useMemo, useState } from 'react';
import { getOrders } from '../../lib/adminApi.js';
import { customersFrom } from '../../lib/adminStats.js';
import { money } from '../../lib/pricing.js';
import { Empty, Loading, Panel, Problem, formatDate, useAdminData } from './shared.jsx';

export default function CustomersTab() {
  const { data: orders, error } = useAdminData(getOrders);
  const [query, setQuery] = useState('');

  const customers = useMemo(() => customersFrom(orders || []), [orders]);
  const q = query.trim().toLowerCase();
  const shown = customers.filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));

  return (
    <Panel title="Customers" intro="Everyone who has placed an order, highest spenders first.">
      {customers.length > 0 && (
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
      {!orders && !error && <Loading />}
      {orders && shown.length === 0 && <Empty>{customers.length === 0 ? 'No customers yet.' : 'Nobody matches that search.'}</Empty>}
      {shown.length > 0 && (
        <ul className="admin-mini-list">
          {shown.map((c) => (
            <li key={c.email}>
              <span>
                <strong>{c.name}</strong>
                <a className="admin-customer-email" href={`mailto:${c.email}`}>{c.email}</a>
              </span>
              <span className="admin-muted">{c.orders} order{c.orders === 1 ? '' : 's'} · last {formatDate(c.lastOrder)}</span>
              <span>{money(c.spent)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
