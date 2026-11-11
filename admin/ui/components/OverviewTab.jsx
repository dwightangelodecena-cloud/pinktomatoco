import { Link } from 'react-router-dom';
import { getRecentOrders } from '../lib/adminApi.js';
const loadOrders = () => getRecentOrders(30);
import { dailyTotals } from '../lib/adminStats.js';
import { money } from '../lib/pricing.js';
import { ArrowRight } from '../Icons.jsx';
import SalesChart from './SalesChart.jsx';
import { Empty, Loading, Panel, Problem, formatDate, useAdminData } from './shared.jsx';

export default function OverviewTab({ counts }) {
  const { data: orders, error } = useAdminData(loadOrders);

  const tiles = [
    { label: 'Orders to handle', value: counts?.pendingOrders, to: '?tab=orders' },
    { label: 'Reviews to approve', value: counts?.waitingReviews, to: '?tab=reviews' },
    { label: 'Customers', value: counts?.customers, to: '?tab=customers' },
    { label: 'Subscribers', value: counts?.subscribers, to: '?tab=subscribers' },
  ];

  return (
    <Panel title="Dashboard" intro="What needs your attention today.">
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
          <SalesChart days={dailyTotals(orders, 14)} title="Order value, last 14 days" />
          <h3 className="admin-subheading">Latest orders</h3>
          {orders.length === 0 ? (
            <Empty>No orders yet.</Empty>
          ) : (
            <ul className="admin-mini-list">
              {orders.slice(0, 5).map((o) => (
                <li key={o.id}>
                  <span><strong>#{o.id}</strong> {o.full_name}</span>
                  <span className="admin-muted">{formatDate(o.created_at)}</span>
                  <span className={`admin-pill status-${o.status}`}>{o.statusLabel}</span>
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
