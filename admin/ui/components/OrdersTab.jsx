import { useCallback, useState } from 'react';
import { ORDER_FILTERS, ORDER_STATUSES, getOrderDetails, getOrderPage, setOrderStatus } from '../lib/adminApi.js';
import { money } from '../lib/pricing.js';
import { CheckIcon, ChevronDown, PackageIcon, TruckIcon } from '../Icons.jsx';
import { Avatar, EmptyState, Filter, HowTo, Loading, Panel, Problem, SearchBox, StatTiles, formatDate, useAdminData } from './shared.jsx';

// The next step for an order, as one button: paid orders get shipped, shipped ones get completed.
const NEXT_STEP = {
  paid: { statusId: 2, label: 'Mark as shipped', Icon: TruckIcon },
  shipped: { statusId: 10, label: 'Mark as completed', Icon: CheckIcon },
};

function Address({ address }) {
  const a = address || {};
  const lines = [a.name, a.line1, a.line2, [a.city, a.state, a.zip].filter(Boolean).join(', '), a.country, a.phone, a.method].filter(Boolean);
  if (!lines.length) return <p className="admin-muted">No delivery address on this order.</p>;
  return <address>{lines.map((l) => <span key={l}>{l}</span>)}</address>;
}

function OrderCard({ order, onStatus }) {
  // Items and the delivery address load the first time the order is opened.
  const [details, setDetails] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const known = ORDER_STATUSES.some((s) => s.id === order.statusId);
  const next = NEXT_STEP[order.status];

  const onToggle = (e) => {
    if (!e.currentTarget.open || details !== undefined) return;
    setDetails(null);
    getOrderDetails(order.id).then(setDetails).catch(() => setDetails({ failed: true }));
  };
  const change = async (statusId) => {
    setBusy(true);
    await onStatus(order, statusId);
    setBusy(false);
  };

  return (
    <details className="admin-card admin-order" onToggle={onToggle}>
      <summary>
        <Avatar name={order.full_name} />
        <span className="admin-order-who">
          <strong>{order.full_name || 'Guest'}</strong>
          <small>Order #{order.id} · {formatDate(order.created_at)}</small>
        </span>
        <span className={`admin-pill status-${order.status}`}>{order.statusLabel}</span>
        <strong className="admin-order-total">{money(order.subtotal)}</strong>
        <ChevronDown size={18} className="admin-order-chevron" />
      </summary>
      <div className="admin-order-body">
        <div className="admin-order-col">
          <h3 className="admin-subheading">Customer</h3>
          {order.email ? <p><a href={`mailto:${order.email}`}>{order.email}</a></p> : <p className="admin-muted">No email given.</p>}
          <h3 className="admin-subheading">Send it to</h3>
          <Address address={details?.delivery || order.address} />
        </div>
        <div className="admin-order-col">
          <h3 className="admin-subheading">What to pack</h3>
          {details === null && <Loading />}
          {details?.failed && <p className="admin-muted">The items couldn't load. Close and open the order to try again.</p>}
          {details?.order_items && (
            <ul className="admin-items">
              {details.order_items.map((i) => (
                <li key={i.id}>
                  <span><b className="admin-qty">{i.quantity}×</b> {i.name} {i.option_label && <small>({i.option_label})</small>}</span>
                  <span>{money(i.unit_price * i.quantity)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="admin-order-actions">
            {next && (
              <button type="button" className="button button-primary button-small" disabled={busy} onClick={() => change(next.statusId)}>
                <next.Icon size={16} /> {busy ? 'Saving…' : next.label}
              </button>
            )}
            <label className="admin-order-status">
              <span>{next ? 'Or set the status' : 'Status'}</span>
              <select className="form-input form-select" value={order.statusId} disabled={busy} onChange={(e) => change(Number(e.target.value))}>
                {!known && <option value={order.statusId} disabled>{order.statusLabel}</option>}
                {ORDER_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
          </div>
          <p className="admin-muted admin-small">The customer may get an email when the status changes. Cancelling an order doesn't send the money back; refunds are done in BigCommerce.</p>
        </div>
      </div>
    </details>
  );
}

const FILTER_LABELS = { pending: 'Waiting for payment', paid: 'To ship' };

export default function OrdersTab({ onChange }) {
  const [page, setPage] = useState(1);
  const load = useCallback(() => getOrderPage(page), [page]);
  const { data, setData, error, setError } = useAdminData(load);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
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

  const count = (status) => (orders || []).filter((o) => o.status === status).length;
  const options = [
    { value: 'all', label: 'All', count: orders?.length },
    ...ORDER_FILTERS.map((f) => ({ ...f, label: FILTER_LABELS[f.value] || f.label, count: orders && count(f.value) })),
  ];
  const q = query.trim().toLowerCase().replace(/^#/, '');
  const shown = (orders || [])
    .filter((o) => filter === 'all' || o.status === filter)
    .filter((o) => !q || String(o.id).includes(q) || String(o.full_name || '').toLowerCase().includes(q) || String(o.email || '').toLowerCase().includes(q));
  const onPage = data?.pages > 1 ? 'On this page' : '';

  return (
    <Panel title="Orders" icon={<PackageIcon size={22} />} intro="Every order from your shop, newest first. Tap an order to see what to pack and where to send it.">
      {orders && orders.length > 0 && (
        <StatTiles items={[
          { label: 'To ship', value: count('paid'), note: onPage || 'Paid and ready to pack', tone: count('paid') ? 'alert' : '' },
          { label: 'Waiting for payment', value: count('pending'), note: onPage || 'Not paid yet' },
          { label: 'On the way', value: count('shipped'), note: onPage || 'Shipped, not completed yet' },
          { label: 'Total', value: data.total ?? orders.length, note: 'Orders in your shop' },
        ]} />
      )}
      <HowTo steps={[
        'A new order shows under "To ship" once it is paid.',
        'Open it, pack the items listed under "What to pack", and send it to the address shown.',
        'Tap "Mark as shipped". When it has arrived, tap "Mark as completed".',
        'Need to cancel? Choose Cancelled under the status. Refunds are done in BigCommerce.',
      ]} />
      <div className="admin-toolbar">
        <Filter label="Filter by status" options={options} value={filter} onChange={setFilter} />
        {orders && orders.length > 0 && <SearchBox value={query} onChange={setQuery} placeholder="Search name, email or order #" />}
      </div>
      <Problem>{error}</Problem>
      {!orders && !error && <Loading />}
      {orders && shown.length === 0 && (
        data.total === 0
          ? <EmptyState icon={<PackageIcon size={28} />} title="No orders yet">When someone buys from your shop, their order appears here with everything you need to pack and ship it.</EmptyState>
          : <EmptyState icon={<PackageIcon size={28} />} title={q ? 'No orders match that search' : 'Nothing here right now'}>{q ? 'Try a name, an email or an order number.' : 'Pick "All" to see every order.'}</EmptyState>
      )}
      <div className="admin-list">
        {shown.map((o) => <OrderCard key={o.id} order={o} onStatus={changeStatus} />)}
      </div>
      {data?.pages > 1 && (
        <nav className="admin-pager" aria-label="Order pages">
          <button type="button" className="button button-secondary button-small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Newer orders</button>
          <span className="admin-muted">Page {page} of {data.pages}</span>
          <button type="button" className="button button-secondary button-small" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Older orders</button>
        </nav>
      )}
    </Panel>
  );
}
