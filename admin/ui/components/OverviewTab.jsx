import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminProducts, getCategories, getPayments, getRecentOrders, getShipping } from '../lib/adminApi.js';
import { money } from '../lib/pricing.js';
import { ArrowRight, RefreshIcon } from '../Icons.jsx';
import { Empty, Loading, Problem, formatDate } from './shared.jsx';

// The Dashboard: what needs attention, money, the store, sales, orders & stock, and best sellers.
const LOW_STOCK = 3; // a size with this many or fewer left counts as running low
const DAY = 864e5;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const active = (orders) => orders.filter((o) => o.status !== 'cancelled');
const sum = (orders) => orders.reduce((n, o) => n + Number(o.subtotal), 0);
const whole = (n) => `$${Math.round(n).toLocaleString()}`;


// Loads everything the dashboard needs in one go; Refresh runs it again.
function useDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState(null);
  const load = useCallback(() => {
    setError('');
    Promise.all([
      getRecentOrders(62),
      getAdminProducts(),
      getCategories().catch(() => []),
      getShipping().catch(() => null),
      getPayments().catch(() => null),
    ])
      .then(([orders, products, categories, shipping, payments]) => { setData({ orders, products, categories, shipping, payments }); setUpdated(new Date()); })
      .catch((err) => setError(err.message));
  }, []);
  useEffect(load, [load]);
  return { data, error, updated, reload: load };
}

function Tile({ label, value, note, to, tone, icon }) {
  return (
    <Link to={to} className={`dash-tile ${tone ? `is-${tone}` : ''}`}>
      <span className="dash-tile-label">{label}{icon && <span aria-hidden="true">{icon}</span>}</span>
      <strong className="dash-tile-value">{value}</strong>
      <span className="dash-tile-note">{note}</span>
      <span className="dash-tile-more">See details <ArrowRight size={12} /></span>
    </Link>
  );
}

// Last 7 days: one bar per day (today in the darker shade), with a hover tooltip on each bar.
function WeekBars({ days }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...days.map((d) => d.value), 1);
  const nice = Math.ceil(max / 50) * 50 || 50;
  return (
    <div className="dash-bars" role="img" aria-label={`Sales for the last 7 days: ${days.map((d) => `${d.label} ${money(d.value)}`).join(', ')}`}>
      <div className="dash-bars-grid" aria-hidden="true">
        {[1, 0.5, 0].map((f) => <span key={f} style={{ bottom: `${f * 100}%` }}><em>{whole(nice * f)}</em></span>)}
      </div>
      <div className="dash-bars-cols">
        {days.map((d, i) => (
          <div key={d.label} className="dash-bar-col" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}>
            <span className={`dash-bar ${d.today ? 'is-today' : ''}`} style={{ height: `${(d.value / nice) * 100}%` }} />
            {hover === i && <span className="dash-tip">{d.long}<strong>{money(d.value)}</strong>{d.orders} order{d.orders === 1 ? '' : 's'}</span>}
            <span className={`dash-bar-label ${d.today ? 'is-today' : ''}`}>{d.today ? 'Today' : d.label}</span>
          </div>
        ))}
      </div>
      {days.every((d) => d.value === 0) && <p className="dash-bars-empty">No sales in the last 7 days yet.</p>}
    </div>
  );
}

const RESULT_PARTS = [
  { key: 'completed', label: 'Completed / shipped', groups: ['completed', 'shipped'], tone: 'good' },
  { key: 'paid', label: 'Paid, to ship', groups: ['paid'], tone: 'info' },
  { key: 'pending', label: 'Awaiting payment', groups: ['pending'], tone: 'warn' },
  { key: 'cancelled', label: 'Cancelled', groups: ['cancelled'], tone: 'muted' },
];

export default function OverviewTab({ counts, onChange }) {
  const { data, error, updated, reload } = useDashboard();
  const refresh = () => { reload(); if (onChange) onChange(); };

  const view = useMemo(() => {
    if (!data) return null;
    const { orders, products, categories } = data;
    const now = new Date();
    const today = startOfDay(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const at = (o) => new Date(o.created_at);
    const live = active(orders);
    const todayOrders = live.filter((o) => at(o) >= today);
    const monthOrders = live.filter((o) => at(o) >= monthStart);
    const monthAll = orders.filter((o) => at(o) >= monthStart);

    const days = Array.from({ length: 7 }, (_, i) => {
      const start = new Date(today.getTime() - (6 - i) * DAY);
      const end = new Date(start.getTime() + DAY);
      const list = live.filter((o) => at(o) >= start && at(o) < end);
      return {
        label: start.toLocaleDateString(undefined, { weekday: 'short' }),
        long: start.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
        value: sum(list), orders: list.length, today: i === 6,
      };
    });
    const thisWeek = live.filter((o) => at(o) >= new Date(today.getTime() - 6 * DAY));
    const lastWeek = live.filter((o) => at(o) >= new Date(today.getTime() - 13 * DAY) && at(o) < new Date(today.getTime() - 6 * DAY));

    // Stock: sizes running low, and what the counted stock would sell for.
    const low = [];
    let stockValue = 0;
    for (const p of products) {
      if (!p.is_visible || p.inventory_tracking === 'none') continue;
      for (const v of p.variants) {
        if (v.stock == null) continue;
        stockValue += Math.max(0, v.stock) * Number(v.price || 0);
        if (v.stock <= LOW_STOCK && !v.purchasing_disabled) low.push({ product: p.name, label: v.label, stock: v.stock, id: `${p.id}-${v.id}` });
      }
    }
    low.sort((a, b) => a.stock - b.stock);

    // Best sellers this month (from the order items BigCommerce sent).
    const units = new Map();
    const byCategory = new Map();
    const catName = Object.fromEntries((categories || []).map((c) => [c.id, c.name]));
    const productCats = Object.fromEntries(products.map((p) => [p.id, p.categories]));
    for (const o of monthOrders) {
      for (const it of o.order_items || []) {
        units.set(it.name, (units.get(it.name) || 0) + it.quantity);
        for (const c of productCats[it.product_id] || []) {
          if (catName[c] && catName[c] !== 'Shop All') byCategory.set(catName[c], (byCategory.get(catName[c]) || 0) + it.quantity);
        }
      }
    }
    const top = (m) => Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return {
      todayTotal: sum(todayOrders), todayCount: todayOrders.length,
      monthTotal: sum(monthOrders), monthCount: monthOrders.length,
      average: monthOrders.length ? sum(monthOrders) / monthOrders.length : 0,
      stockValue, low, days,
      thisWeek: { total: sum(thisWeek), count: thisWeek.length }, lastWeek: { total: sum(lastWeek), count: lastWeek.length },
      results: RESULT_PARTS.map((r) => ({ ...r, count: monthAll.filter((o) => r.groups.includes(o.status)).length })),
      latest: orders.slice(0, 6),
      topProducts: top(units), topCategories: top(byCategory),
      onStore: products.filter((p) => p.is_visible).length,
    };
  }, [data]);

  const shippingMissing = data?.shipping?.some((z) => z.enabled && !z.methods.some((m) => m.enabled) && !z.freeShipping.enabled);
  const testPayment = data?.payments?.some((m) => m.testMode);
  const change = view && view.lastWeek.total > 0 ? ((view.thisWeek.total - view.lastWeek.total) / view.lastWeek.total) * 100 : null;
  const resultsTotal = view ? view.results.reduce((n, r) => n + r.count, 0) : 0;

  return (
    <section className="dash">
      <header className="dash-head">
        <div>
          <p>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}{updated && ` · Updated ${updated.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`}</p>
        </div>
        <button type="button" className="dash-refresh" onClick={refresh}><RefreshIcon size={15} /> Refresh numbers</button>
      </header>

      <Problem>{error}</Problem>
      {!view && !error && <Loading />}
      {view && (
        <>
          {/* Things that need doing, in plain words. */}
          <div className="dash-alerts">
            {view.low.length > 0 && (
              <div className="dash-alert"><span><strong>{view.low.length} size{view.low.length === 1 ? ' is' : 's are'} running low</strong>: {LOW_STOCK} or fewer left.</span><Link className="dash-alert-btn" to="?tab=content&card=products">Restock now</Link></div>
            )}
            {shippingMissing && (
              <div className="dash-alert"><span><strong>Shipping isn't set up yet</strong>, so customers can't finish checkout.</span><Link className="dash-alert-btn" to="?tab=shipping">Set up shipping</Link></div>
            )}
            {testPayment && (
              <div className="dash-alert is-warn"><span><strong>A test payment option is on</strong>: switch it off after your test order.</span><Link className="dash-alert-btn" to="?tab=shipping">See payments</Link></div>
            )}
            {counts?.pendingOrders > 0 && (
              <div className="dash-alert is-info"><span><strong>{counts.pendingOrders} order{counts.pendingOrders === 1 ? '' : 's'} to handle</strong>: pack and ship.</span><Link className="dash-alert-btn" to="?tab=orders">Open orders</Link></div>
            )}
          </div>

          <h3 className="dash-section">Money <small>Tap any box for the details</small></h3>
          <div className="dash-tiles is-4">
            <Tile label="Sales today" value={money(view.todayTotal)} note={`${view.todayCount} order${view.todayCount === 1 ? '' : 's'}`} to="?tab=sales" />
            <Tile label="Sales this month" value={money(view.monthTotal)} note={`${view.monthCount} order${view.monthCount === 1 ? '' : 's'} since the 1st`} to="?tab=sales" />
            <Tile label="Average order" value={money(view.average)} note="This month" to="?tab=sales" />
            <Tile label="Stock value" value={whole(view.stockValue)} note="What your counted stock would sell for" to="?tab=content&card=products" />
          </div>

          <h3 className="dash-section">Store</h3>
          <div className="dash-tiles is-4">
            <Tile label="Running low" value={view.low.length} note="Sizes to restock" to="?tab=content&card=products" tone={view.low.length ? 'alert' : ''} />
            <Tile label="Orders to handle" value={counts?.pendingOrders ?? '–'} note="Waiting to be packed or paid" to="?tab=orders" />
            <Tile label="Customers" value={counts?.customers ?? '–'} note={`${counts?.subscribers ?? 0} newsletter subscribers`} to="?tab=customers" />
            <Tile label="Products in the shop" value={view.onStore} note={`${counts?.waitingReviews ?? 0} review${counts?.waitingReviews === 1 ? '' : 's'} to approve`} to="?tab=content&card=products" />
          </div>

          <h3 className="dash-section">Sales <small>Paid and pending orders; cancelled ones don't count</small></h3>
          <div className="dash-grid">
            <article className="dash-card">
              <h4>Last 7 days</h4>
              <p className="dash-card-sub">How much you sold each day. Today is the darker bar.</p>
              <p className="dash-kpi"><small>7-day total</small>{money(view.thisWeek.total)}</p>
              <WeekBars days={view.days} />
            </article>
            <div className="dash-stack">
              <article className="dash-card">
                <h4>This week vs. last</h4>
                <p className="dash-card-sub">The last 7 days compared with the 7 days before.</p>
                {change !== null && <span className={`dash-change ${change >= 0 ? 'is-up' : 'is-down'}`}>{change >= 0 ? '▲ Up' : '▼ Down'} {Math.abs(change).toFixed(0)}%</span>}
                {[['This week', view.thisWeek], ['Last week', view.lastWeek]].map(([label, w]) => {
                  const most = Math.max(view.thisWeek.total, view.lastWeek.total, 1);
                  return (
                    <div key={label} className="dash-compare">
                      <span>{label}<strong>{money(w.total)}</strong></span>
                      <span className="dash-track"><span className={label === 'This week' ? 'is-now' : ''} style={{ width: `${(w.total / most) * 100}%` }} /></span>
                      <small>{w.count} order{w.count === 1 ? '' : 's'}</small>
                    </div>
                  );
                })}
              </article>
              <article className="dash-card">
                <h4>How this month's orders ended</h4>
                <p className="dash-card-sub">Every order placed since the 1st.</p>
                {resultsTotal === 0 ? <Empty>No orders this month yet.</Empty> : (
                  <>
                    <div className="dash-stackbar" role="img" aria-label={view.results.map((r) => `${r.label}: ${r.count}`).join(', ')}>
                      {view.results.filter((r) => r.count).map((r) => <span key={r.key} className={`is-${r.tone}`} style={{ flex: r.count }} title={`${r.label}: ${r.count}`} />)}
                    </div>
                    <ul className="dash-legend">
                      {view.results.map((r) => <li key={r.key}><span className={`dash-dot is-${r.tone}`} />{r.label}<strong>{r.count}</strong></li>)}
                    </ul>
                  </>
                )}
              </article>
            </div>
          </div>

          <h3 className="dash-section">Orders & stock</h3>
          <div className="dash-grid">
            <article className="dash-card">
              <h4>Latest orders</h4>
              <p className="dash-card-sub">The 6 newest orders.</p>
              {view.latest.length === 0 ? <Empty>No orders yet. They'll show here as soon as someone buys.</Empty> : (
                <ul className="dash-orders">
                  {view.latest.map((o) => (
                    <li key={o.id}>
                      <span><strong>{o.full_name}</strong> <small>#{o.id}</small><em>{formatDate(o.created_at)}</em></span>
                      <span className="dash-order-right"><strong>{money(o.subtotal)}</strong><span className={`admin-pill status-${o.status}`}>{o.statusLabel}</span></span>
                    </li>
                  ))}
                </ul>
              )}
              {view.latest.length > 0 && <Link to="?tab=orders" className="text-link">All orders <ArrowRight /></Link>}
            </article>
            <article className="dash-card">
              <div className="dash-card-head"><h4>Running low</h4><Link className="dash-alert-btn" to="?tab=content&card=products">Restock</Link></div>
              <p className="dash-card-sub">Sizes with {LOW_STOCK} or fewer left.</p>
              {view.low.length === 0 ? <Empty>Everything is well stocked.</Empty> : (
                <ul className="dash-low">
                  {view.low.slice(0, 6).map((l) => (
                    <li key={l.id}><span><strong>{l.product}</strong><small>{l.label}</small></span><span className={`dash-left ${l.stock <= 0 ? 'is-out' : ''}`}>{l.stock <= 0 ? 'Sold out' : `${l.stock} left`}</span></li>
                  ))}
                </ul>
              )}
            </article>
          </div>

          <h3 className="dash-section">Best sellers this month</h3>
          <div className="dash-tiles is-2">
            {[['Top candles', view.topProducts], ['Top categories', view.topCategories]].map(([title, rows]) => (
              <article key={title} className="dash-card">
                <h4>{title}</h4>
                <p className="dash-card-sub">Most units sold this month.</p>
                {rows.length === 0 ? <Empty>Nothing sold yet this month.</Empty> : (
                  <ol className="dash-rank">
                    {rows.map(([name, n]) => (
                      <li key={name}>
                        <span><b>{name}</b><small>{n} sold</small></span>
                        <span className="dash-track"><span style={{ width: `${(n / rows[0][1]) * 100}%` }} /></span>
                      </li>
                    ))}
                  </ol>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
