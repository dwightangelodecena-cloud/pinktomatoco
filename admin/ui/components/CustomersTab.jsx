import { useMemo, useState } from 'react';
import { getCustomers, getRecentOrders } from '../lib/adminApi.js';
import { mergeCustomers } from '../lib/adminStats.js';
import { money } from '../lib/pricing.js';
import { UsersIcon } from '../Icons.jsx';
import { Avatar, EmptyState, Loading, Panel, Problem, SearchBox, StatTiles, formatDate, useAdminData } from './shared.jsx';

const loadCustomers = async () => {
  const [accounts, orders] = await Promise.all([getCustomers(), getRecentOrders(365)]);
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
  const list = customers || [];
  const buyers = list.filter((c) => c.orders > 0).length;
  const repeat = list.filter((c) => c.orders > 1).length;
  const spent = list.reduce((n, c) => n + c.spent, 0);

  return (
    <Panel title="Customers" icon={<UsersIcon size={22} />} intro="Everyone who made an account or placed an order. Your best customers are at the top.">
      {list.length > 0 && (
        <StatTiles items={[
          { label: 'Customers', value: list.length, note: 'Accounts and shoppers' },
          { label: 'Have ordered', value: buyers, note: 'In the last 12 months' },
          { label: 'Came back', value: repeat, note: 'Ordered more than once' },
          { label: 'Spent in total', value: money(spent), note: 'In the last 12 months' },
        ]} />
      )}
      {list.length > 0 && <SearchBox value={query} onChange={setQuery} placeholder="Search by name or email" />}
      <Problem>{error}</Problem>
      {!customers && !error && <Loading />}
      {customers && shown.length === 0 && (
        <EmptyState icon={<UsersIcon size={28} />} title={list.length === 0 ? 'No customers yet' : 'Nobody matches that search'}>
          {list.length === 0 ? 'People who make an account or buy from your shop will show up here.' : 'Try part of their name or email.'}
        </EmptyState>
      )}
      {shown.length > 0 && (
        <ul className="admin-people">
          {shown.map((c, i) => (
            <li key={c.email}>
              <Avatar name={c.name || c.email} />
              <span className="admin-person">
                <strong>{c.name || 'No name given'}{!q && i < 3 && c.spent > 0 && <span className="admin-tag">Top customer</span>}</strong>
                <a href={`mailto:${c.email}`}>{c.email}</a>
              </span>
              <span className="admin-person-meta">
                <span className="admin-chip">{c.orders} order{c.orders === 1 ? '' : 's'}</span>
                <small>{c.lastOrder ? `Last order ${formatDate(c.lastOrder)}` : c.joined ? `Joined ${formatDate(c.joined)}` : ''}</small>
              </span>
              <strong className="admin-person-spent">{money(c.spent)}<small>spent</small></strong>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
