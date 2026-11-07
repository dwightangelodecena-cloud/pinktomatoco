import { useState } from 'react';
import { ORDER_STATUSES, getOrders, setOrderStatus } from '../../lib/adminApi.js';
import { money } from '../../lib/pricing.js';
import { Empty, Filter, Loading, Panel, Problem, formatDate, useAdminData } from './shared.jsx';

function Address({ address }) {
  const a = address || {};
  const lines = [a.line1, a.line2, [a.city, a.state, a.zip].filter(Boolean).join(', '), a.country, a.phone].filter(Boolean);
  return <address>{lines.map((l) => <span key={l}>{l}</span>)}</address>;
}

export default function OrdersTab({ onChange }) {
  const { data: orders, setData, error, setError } = useAdminData(getOrders);
  const [filter, setFilter] = useState('all');

  const changeStatus = async (order, status) => {
    setError('');
    try {
      await setOrderStatus(order.id, status);
      setData((list) => list.map((o) => (o.id === order.id ? { ...o, status } : o)));
      onChange();
    } catch (err) {
      setError(err.message);
    }
  };

  const options = [
    { value: 'all', label: 'All', count: orders?.length },
    ...ORDER_STATUSES.map((s) => ({ value: s, label: s, count: orders?.filter((o) => o.status === s).length })),
  ];
  const shown = (orders || []).filter((o) => filter === 'all' || o.status === filter);

  return (
    <Panel title="Orders" intro="Open an order to see the customer's details and update its status.">
      <Filter label="Filter by status" options={options} value={filter} onChange={setFilter} />
      <Problem>{error}</Problem>
      {!orders && !error && <Loading />}
      {orders && shown.length === 0 && <Empty>No orders here.</Empty>}
      <div className="admin-list">
        {shown.map((o) => (
          <details key={o.id} className="admin-card admin-order">
            <summary>
              <span className="admin-order-id">#{o.id}</span>
              <span className="admin-order-name">{o.full_name}</span>
              <span className="admin-muted">{formatDate(o.created_at)}</span>
              <span className={`admin-pill status-${o.status}`}>{o.status}</span>
              <strong>{money(o.subtotal)}</strong>
            </summary>
            <div className="admin-order-body">
              <div>
                <h3 className="admin-subheading">Customer</h3>
                <p><a href={`mailto:${o.email}`}>{o.email}</a></p>
                <Address address={o.address} />
              </div>
              <div>
                <h3 className="admin-subheading">Items</h3>
                <ul className="admin-items">
                  {o.order_items?.map((i) => (
                    <li key={i.id}>
                      <span>{i.quantity} × {i.name} <small>({i.option_label})</small></span>
                      <span>{money(i.unit_price * i.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <label className="form-field">
                  <span className="form-field-title">Status</span>
                  <select className="form-input form-select" value={o.status} onChange={(e) => changeStatus(o, e.target.value)}>
                    {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              </div>
            </div>
          </details>
        ))}
      </div>
    </Panel>
  );
}
