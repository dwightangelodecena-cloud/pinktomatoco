import { useState } from 'react';
import { getRecentOrders } from '../lib/adminApi.js';
import { dailyTotals, ordersSince, topProducts } from '../lib/adminStats.js';
import { money } from '../lib/pricing.js';
import { BarChartIcon } from '../Icons.jsx';
import SalesChart from './SalesChart.jsx';
import { EmptyState, Filter, Loading, Panel, Problem, StatTiles, useAdminData } from './shared.jsx';

const loadOrders = () => getRecentOrders(90);

const RANGES = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
];

const sum = (orders) => orders.reduce((n, o) => n + Number(o.subtotal), 0);

// "Up 12% on the 30 days before", or nothing when there's no earlier period to compare with.
function change(now, before, days) {
  if (days > 45 || before === 0) return '';
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return `Same as the ${days} days before`;
  return `${pct > 0 ? 'Up' : 'Down'} ${Math.abs(pct)}% on the ${days} days before`;
}

export default function SalesTab() {
  const { data: orders, error } = useAdminData(loadOrders);
  const [range, setRange] = useState(30);

  const days = dailyTotals(orders || [], range);
  const start = days[0].date;
  const inRange = ordersSince(orders || [], start);
  const earlierStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() - range);
  const earlier = ordersSince(orders || [], earlierStart).filter((o) => new Date(o.created_at) < start);
  const value = sum(inRange);
  const units = inRange.reduce((n, o) => n + (o.order_items || []).reduce((m, i) => m + i.quantity, 0), 0);
  const best = topProducts(inRange);
  const bestMax = Math.max(...best.map((p) => p.value), 1);

  return (
    <Panel title="Sales" icon={<BarChartIcon size={22} />} intro="How your shop is doing. Cancelled and refunded orders don't count.">
      <Filter label="Time period" options={RANGES} value={range} onChange={setRange} />
      <Problem>{error}</Problem>
      {!orders && !error && <Loading />}
      {orders && (
        <>
          <StatTiles items={[
            { label: 'Money taken', value: money(value), note: change(value, sum(earlier), range) || 'Before shipping and tax' },
            { label: 'Orders', value: inRange.length, note: change(inRange.length, earlier.length, range) || `In the last ${range} days` },
            { label: 'Average order', value: money(inRange.length ? value / inRange.length : 0), note: 'What one order is worth' },
            { label: 'Items sold', value: units, note: 'Candles, melts and more' },
          ]} />
          <div className="dash-card admin-sales-chart">
            <h4>Money taken each day</h4>
            <p className="dash-card-sub">Point at a bar to see that day's orders.</p>
            <SalesChart days={days} title="" />
          </div>
          <div className="dash-card">
            <h4>Best sellers</h4>
            <p className="dash-card-sub">What sold the most in the last {range} days.</p>
            {best.length === 0 ? (
              <EmptyState title="Nothing sold in this period yet">Your best sellers show up here once orders come in.</EmptyState>
            ) : (
              <ol className="admin-rank">
                {best.map((p, i) => (
                  <li key={p.name}>
                    <span className="admin-rank-num">{i + 1}</span>
                    <span className="admin-rank-name">
                      <strong>{p.name}</strong>
                      <span className="dash-track"><span style={{ width: `${(p.value / bestMax) * 100}%` }} /></span>
                    </span>
                    <span className="admin-rank-figures"><strong>{money(p.value)}</strong><small>{p.units} sold</small></span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}
