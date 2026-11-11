import { useState } from 'react';
import { getRecentOrders } from '../lib/adminApi.js';
const loadOrders = () => getRecentOrders(90);
import { dailyTotals, ordersSince, topProducts } from '../lib/adminStats.js';
import { money } from '../lib/pricing.js';
import SalesChart from './SalesChart.jsx';
import { Empty, Filter, Loading, Panel, Problem, useAdminData } from './shared.jsx';

const RANGES = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
];

export default function SalesTab() {
  const { data: orders, error } = useAdminData(loadOrders);
  const [range, setRange] = useState(30);

  const days = dailyTotals(orders || [], range);
  const inRange = ordersSince(orders || [], days[0].date);
  const value = inRange.reduce((n, o) => n + Number(o.subtotal), 0);
  const units = inRange.reduce((n, o) => n + (o.order_items || []).reduce((m, i) => m + i.quantity, 0), 0);
  const best = topProducts(inRange);

  const tiles = [
    { label: 'Order value', value: money(value) },
    { label: 'Orders', value: inRange.length },
    { label: 'Average order', value: money(inRange.length ? value / inRange.length : 0) },
    { label: 'Items sold', value: units },
  ];

  return (
    <Panel title="Sales" intro="Based on your BigCommerce orders from the last 90 days, not counting cancelled, declined or refunded ones.">
      <Filter label="Time period" options={RANGES} value={range} onChange={setRange} />
      <Problem>{error}</Problem>
      {!orders && !error && <Loading />}
      {orders && (
        <>
          <div className="admin-tiles">
            {tiles.map((t) => (
              <div key={t.label} className="admin-tile"><strong>{t.value}</strong><span>{t.label}</span></div>
            ))}
          </div>
          <SalesChart days={days} title="Order value per day" />
          <h3 className="admin-subheading">Best sellers</h3>
          {best.length === 0 ? (
            <Empty>Nothing sold in this period yet.</Empty>
          ) : (
            <ul className="admin-mini-list">
              {best.map((p) => (
                <li key={p.name}>
                  <span>{p.name}</span>
                  <span className="admin-muted">{p.units} sold</span>
                  <span>{money(p.value)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Panel>
  );
}
