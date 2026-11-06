import { Link } from 'react-router-dom';
import Reveal from './Reveal.jsx';
import { ArrowRight } from './Icons.jsx';
import { money } from '../lib/pricing.js';
import { typicalSizePrices } from '../lib/productText.js';

const SIZES = [
  { label: '1 oz', name: 'Mini', blurb: 'A sampler to test a new scent.', scale: 0.46, kind: 'tin' },
  { label: '8 oz', name: 'Classic', blurb: 'Everyday size for any room.', scale: 0.72, kind: 'jar' },
  { label: '11 oz', name: 'Signature', blurb: 'Our most-loved wooden-wick jar.', scale: 0.86, kind: 'jar' },
  { label: 'Aura (13 oz)', name: 'Aura', blurb: 'The biggest pour for big spaces.', scale: 1, kind: 'jar' },
  { label: 'Wax Melts', name: 'Wax Melts', blurb: 'Flameless scent for your warmer.', scale: 0.6, kind: 'melt' },
];

function Vessel({ kind, scale }) {
  if (kind === 'melt') {
    return (
      <svg viewBox="0 0 120 120" className="size-art" style={{ '--s': scale }} aria-hidden="true">
        {[0, 1, 2].map((r) =>
          [0, 1].map((c) => (
            <rect key={`${r}${c}`} x={30 + c * 32} y={36 + r * 22} width="28" height="18" rx="5" className="melt" style={{ '--d': `${(r * 2 + c) * 80}ms` }} />
          ))
        )}
      </svg>
    );
  }
  const tin = kind === 'tin';
  return (
    <svg viewBox="0 0 120 120" className="size-art" style={{ '--s': scale }} aria-hidden="true">
      <path className="flame" d="M60 14c5 7 8 11 8 16a8 8 0 0 1-16 0c0-5 3-9 8-16z" />
      <line x1="60" y1="38" x2="60" y2={tin ? 62 : 46} className="wick" />
      {tin ? (
        <rect x="24" y="62" width="72" height="34" rx="10" className="glass" />
      ) : (
        <rect x="30" y="46" width="60" height="62" rx="12" className="glass" />
      )}
      {tin ? (
        <rect x="24" y="62" width="72" height="12" rx="6" className="wax" />
      ) : (
        <rect x="30" y="58" width="60" height="50" rx="12" className="wax" />
      )}
    </svg>
  );
}

export default function SizeGuide({ products }) {
  const prices = typicalSizePrices(products || []);
  const sizes = SIZES.filter((s) => prices[s.label] != null);
  if (sizes.length === 0) return null;

  return (
    <section className="size-guide container">
      <Reveal className="section-head">
        <div>
          <p className="eyebrow">Find your size</p>
          <h2 className="section-title">Every scent, five ways</h2>
        </div>
        <Link to="/shop-all" className="text-link">Shop all sizes <ArrowRight /></Link>
      </Reveal>
      <ul className="size-list">
        {sizes.map((s, i) => (
          <Reveal as="li" key={s.label} delay={i * 80} className="size-card">
            <Link to="/shop-all" className="size-link">
              <div className="size-art-wrap"><Vessel kind={s.kind} scale={s.scale} /></div>
              <span className="size-label">{s.label.replace('Aura (13 oz)', '13 oz')}</span>
              <h3>{s.name}</h3>
              <p>{s.blurb}</p>
              <span className="size-price">from {money(prices[s.label])}</span>
            </Link>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
