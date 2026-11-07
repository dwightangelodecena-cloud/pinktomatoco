import { Link } from 'react-router-dom';
import { getOrders } from '../../lib/adminApi.js';
import { money } from '../../lib/pricing.js';
import { ArrowRight } from '../Icons.jsx';
import { Empty, Loading, Panel, Problem, formatDate, useAdminData } from './shared.jsx';

export default function OverviewTab({ counts }) {
  const { data: orders, error } = useAdminData(getOrders);
  const value = (orders || []).filter((o) => o.status !== 'cancelled').reduce((n, o) => n + Number(o.subtotal), 0);

  const tiles = [
    { label: 'Orders to handle', value: counts?.pendingOrders, to: '?tab=orders' },
    { label: 'Reviews to approve', value: counts?.waitingReviews, to: '?tab=reviews' },
    { label: 'Open messages', value: counts?.openMessages, to: '?tab=messages' },
    { label: 'Subscribers', value: counts?.subscribers, to: '?tab=subscribers' },
  ];

  return (
    <Panel title="Overview" intro="What needs your attention today.">
      <div className="admin-tiles">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} className="admin-tile">
            <strong>{t.value ?? '–'}</strong>
            <span>{t.label}</span>
          </Link>
        ))}
      </div>

      <Problem>{error}</Problem>
      {!orders && !error && <Loading />}
      {orders && (
        <>
          <p className="admin-note">
            {orders.length} order{orders.length === 1 ? '' : 's'} worth {money(value)}, not counting cancelled orders.
            Online payment isn't set up yet, so this money hasn't been collected automatically.
          </p>
          <h3 className="admin-subheading">Latest orders</h3>
          {orders.length === 0 ? (
            <Empty>No orders yet.</Empty>
          ) : (
            <ul className="admin-mini-list">
              {orders.slice(0, 5).map((o) => (
                <li key={o.id}>
                  <span><strong>#{o.id}</strong> {o.full_name}</span>
                  <span className="admin-muted">{formatDate(o.created_at)}</span>
                  <span className={`admin-pill status-${o.status}`}>{o.status}</span>
                  <span>{money(o.subtotal)}</span>
                </li>
              ))}
            </ul>
          )}
          {orders.length > 0 && <Link to="?tab=orders" className="text-link">All orders <ArrowRight /></Link>}
        </>
      )}
    </Panel>
  );
}
