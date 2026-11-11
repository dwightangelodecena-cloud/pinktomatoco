import { useCallback, useState } from 'react';
import { ORDER_FILTERS, ORDER_STATUSES, getOrderDetails, getOrderPage, setOrderStatus } from '../lib/adminApi.js';
import { money } from '../lib/pricing.js';
import { Empty, Filter, Loading, Panel, Problem, formatDate, useAdminData } from './shared.jsx';

function Address({ address }) {
  const a = address || {};
  const lines = [a.name, a.line1, a.line2, [a.city, a.state, a.zip].filter(Boolean).join(', '), a.country, a.phone, a.method].filter(Boolean);
  return <address>{lines.map((l) => <span key={l}>{l}</span>)}</address>;
}

function OrderCard({ order, onStatus }) {
  // Items and the delivery address load the first time the order is opened.
  const [details, setDetails] = useState(undefined);
  const known = ORDER_STATUSES.some((s) => s.id === order.statusId);

  const onToggle = (e) => {
    if (!e.currentTarget.open || details !== undefined) return;
    setDetails(null);
    getOrderDetails(order.id).then(setDetails).catch(() => setDetails({ failed: true }));
  };

  return (
    <details className="admin-card admin-order" onToggle={onToggle}>
      <summary>
        <span className="admin-order-id">#{order.id}</span>
        <span className="admin-order-name">{order.full_name}</span>
        <span className="admin-muted">{formatDate(order.created_at)}</span>
        <span className={`admin-pill status-${order.status}`}>{order.statusLabel}</span>
        <strong>{money(order.subtotal)}</strong>
      </summary>
      <div className="admin-order-body">
        <div>
          <h3 className="admin-subheading">Customer</h3>
          {order.email && <p><a href={`mailto:${order.email}`}>{order.email}</a></p>}
          <h3 className="admin-subheading">Deliver to</h3>
          <Address address={details?.delivery || order.address} />
        </div>
        <div>
          <h3 className="admin-subheading">Items</h3>
          {details === null && <Loading />}
          {details?.failed && <p className="admin-muted">The items couldn't load. Close and open the order to try again.</p>}
          {details?.order_items && (
            <ul className="admin-items">
              {details.order_items.map((i) => (
                <li key={i.id}>
                  <span>{i.quantity} × {i.name} {i.option_label && <small>({i.option_label})</small>}</span>
                  <span>{money(i.unit_price * i.quantity)}</span>
                </li>
              ))}
            </ul>
          )}
          <label className="form-field">
            <span className="form-field-title">Status</span>
            <select className="form-input form-select" value={order.statusId} onChange={(e) => onStatus(order, Number(e.target.value))}>
              {!known && <option value={order.statusId} disabled>{order.statusLabel}</option>}
              {ORDER_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <p className="admin-muted">BigCommerce may email the customer when the status changes. Cancelling doesn't refund money, so handle refunds in BigCommerce.</p>
        </div>
      </div>
    </details>
  );
}

export default function OrdersTab({ onChange }) {
  const [page, setPage] = useState(1);
  const load = useCallback(() => getOrderPage(page), [page]);
  const { data, setData, error, setError } = useAdminData(load);
  const [filter, setFilter] = useState('all');
  const orders = data?.orders;

  const changeStatus = async (order, statusId) => {
    setError('');
    try {
      await setOrderStatus(order.id, statusId);
      const next = ORDER_STATUSES.find((s) => s.id === statusId);
      setData((d) => ({ ...d, orders: d.orders.map((o) => (o.id === order.id ? { ...o, statusId, statusLabel: next.label, status: next.group } : o)) }));
      onChange();
    } catch (err) {
      setError(err.message);
    }
  };

  const options = [
    { value: 'all', label: 'All', count: orders?.length },
    ...ORDER_FILTERS.map((f) => ({ ...f, count: orders?.filter((o) => o.status === f.value).length })),
  ];
  const shown = (orders || []).filter((o) => filter === 'all' || o.status === filter);

  return (
    <Panel title="Orders" intro="Orders from BigCommerce, 25 at a time. Open one to see its items and update its status.">
      <Filter label="Filter by status" options={options} value={filter} onChange={setFilter} />
      <Problem>{error}</Problem>
      {!orders && !error && <Loading />}
      {orders && shown.length === 0 && <Empty>{data.total === 0 ? 'No orders yet.' : 'No orders here on this page.'}</Empty>}
      <div className="admin-list">
        {shown.map((o) => <OrderCard key={o.id} order={o} onStatus={changeStatus} />)}
      </div>
      {data?.pages > 1 && (
        <nav className="admin-pager" aria-label="Order pages">
          <button type="button" className="button button-secondary button-small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Newer</button>
          <span className="admin-muted">Page {page} of {data.pages}</span>
          <button type="button" className="button button-secondary button-small" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Older</button>
        </nav>
      )}
    </Panel>
  );
}
