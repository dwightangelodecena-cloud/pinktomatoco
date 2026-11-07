import { useState } from 'react';
import { money } from '../../lib/pricing.js';
import { Empty } from './shared.jsx';

const shortDate = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

// Rounds up to 1, 2 or 5 times a power of ten, so the axis label is a tidy number.
function niceMax(value) {
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((n) => n * power >= value);
  return step * power;
}

// `days` comes from dailyTotals().
export default function SalesChart({ days, title }) {
  const [active, setActive] = useState(null);
  const orders = days.reduce((n, d) => n + d.orders, 0);
  const total = days.reduce((n, d) => n + d.value, 0);

  if (orders === 0 || total === 0) return <Empty>No orders in this period yet.</Empty>;

  const max = niceMax(Math.max(...days.map((d) => d.value)));
  const day = active === null ? null : days[active];
  const position = active === null ? 0 : (active + 0.5) / days.length;
  const shift = position < 0.2 ? '0' : position > 0.8 ? '-100%' : '-50%';

  return (
    <figure className="admin-chart">
      <figcaption>{title}</figcaption>
      <div
        className="admin-chart-plot"
        role="img"
        aria-label={`${title}: ${money(total)} from ${orders} order${orders === 1 ? '' : 's'}`}
        onMouseLeave={() => setActive(null)}
      >
        <span className="admin-chart-line" style={{ bottom: '100%' }}><b>{money(max)}</b></span>
        <span className="admin-chart-line" style={{ bottom: '50%' }}><b>{money(max / 2)}</b></span>
        <span className="admin-chart-line is-base" style={{ bottom: 0 }}><b>$0</b></span>
        <div className="admin-chart-bars">
          {days.map((d, i) => (
            <div key={d.date.getTime()} className={`admin-chart-col ${i === active ? 'is-active' : ''}`} onMouseEnter={() => setActive(i)} onClick={() => setActive(i)}>
              {d.value > 0 && <i style={{ height: `${(d.value / max) * 100}%` }} />}
            </div>
          ))}
          {day && (
            <div className="admin-chart-tip" style={{ left: `${position * 100}%`, transform: `translateX(${shift})` }}>
              <strong>{money(day.value)}</strong>
              <span>{shortDate(day.date)} · {day.orders} order{day.orders === 1 ? '' : 's'}</span>
            </div>
          )}
        </div>
      </div>
      <div className="admin-chart-axis">
        <span>{shortDate(days[0].date)}</span>
        <span>{shortDate(days[days.length - 1].date)}</span>
      </div>
      <details className="admin-chart-table">
        <summary>View as table</summary>
        <table>
          <thead><tr><th>Day</th><th>Orders</th><th>Value</th></tr></thead>
          <tbody>
            {days.filter((d) => d.orders > 0).map((d) => (
              <tr key={d.date.getTime()}><td>{shortDate(d.date)}</td><td>{d.orders}</td><td>{money(d.value)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
