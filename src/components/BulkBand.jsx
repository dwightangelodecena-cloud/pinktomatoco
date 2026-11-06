import { Link } from 'react-router-dom';
import { ArrowRight } from './Icons.jsx';
import { useCountUp, useInView } from '../lib/useInView.js';

// Candle bulk tiers from the store's bulk pricing (12–24: 10%, 25–49: 20%, 50+: 30%).
const TIERS = [
  { off: 10, qty: '12–24 candles' },
  { off: 20, qty: '25–49 candles' },
  { off: 30, qty: '50+ candles' },
];

function Tier({ off, qty, start, delay }) {
  const n = useCountUp(off, start, 1200 + delay);
  return (
    <li className="bulk-tier" style={{ '--d': `${delay}ms` }}>
      <span className="bulk-num">{n}<small>%</small></span>
      <span className="bulk-off">off</span>
      <span className="bulk-qty">{qty}</span>
    </li>
  );
}

export default function BulkBand() {
  const [ref, inView] = useInView();
  return (
    <section className="bulk-band-wrap container">
      <div className={`bulk-band ${inView ? 'is-in' : ''}`} ref={ref}>
        <span className="bulk-orb bulk-orb-1" aria-hidden="true" />
        <span className="bulk-orb bulk-orb-2" aria-hidden="true" />
        <div className="bulk-copy">
          <p className="eyebrow">Bulk pricing</p>
          <h2>Weddings, showers &amp; gifting: the more you pour, the more you save.</h2>
          <p>Discounts apply automatically in your cart. Mix any candle scents.</p>
          <div className="bulk-actions">
            <Link to="/shop-all" className="button button-light">Start a bulk order <ArrowRight /></Link>
            <Link to="/contact-us" className="bulk-contact">Questions? Contact us</Link>
          </div>
        </div>
        <ul className="bulk-tiers">
          {TIERS.map((t, i) => (
            <Tier key={t.off} {...t} start={inView} delay={i * 150} />
          ))}
        </ul>
      </div>
    </section>
  );
}
