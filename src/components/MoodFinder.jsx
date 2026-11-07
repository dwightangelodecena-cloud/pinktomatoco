import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Reveal from './Reveal.jsx';
import { ArrowRight, FlameIcon } from './Icons.jsx';
import { priceRange } from '../lib/pricing.js';
import { scentProfile } from '../lib/productText.js';
import { useInView } from '../lib/useInView.js';
import { useContent } from '../context/SiteContentContext.jsx';

// "Find your mood": chips built from each candle's own Mood / Scent Notes lines.
export default function MoodFinder({ products }) {
  const items = useMemo(() => {
    const used = new Set();
    return (products || [])
      .map((p) => ({ product: p, profile: scentProfile(p) }))
      .filter((x) => x.profile)
      .map((x) => {
        const mood = x.profile.moods.find((m) => !used.has(m)) || x.profile.moods[0];
        used.add(mood);
        return { ...x, mood };
      });
  }, [products]);

  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);
  const [ref, inView] = useInView();
  const home = useContent('home');

  // Gently cycle through moods until the visitor picks one.
  useEffect(() => {
    if (!inView || touched || items.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setActive((i) => (i + 1) % items.length), 5000);
    return () => clearInterval(id);
  }, [inView, touched, items.length]);

  if (items.length === 0) return null;
  const { product, profile } = items[active];

  return (
    <section className="mood-finder container" ref={ref}>
      <div className="mood-inner">
        <Reveal className="mood-head">
          <p className="eyebrow">{home.moodEyebrow}</p>
          <h2 className="section-title">{home.moodTitle}</h2>
          <div className="mood-chips" role="tablist" aria-label="Moods">
            {items.map((it, i) => (
              <button
                key={it.product.id}
                role="tab"
                aria-selected={i === active}
                className={`mood-chip ${i === active ? 'is-active' : ''}`}
                onClick={() => {
                  setActive(i);
                  setTouched(true);
                }}
              >
                {it.mood}
              </button>
            ))}
          </div>
        </Reveal>

        <div className="mood-stage" role="tabpanel" aria-live="polite">
          <Link to={`/${product.slug}`} key={`img-${product.id}`} className="mood-image">
            <img src={product.images?.[0]} alt={product.name} />
            <span className="mood-image-glow" aria-hidden="true" />
          </Link>
          <div key={`txt-${product.id}`} className="mood-copy">
            <div className="mood-tags">
              {profile.moods.map((m) => <span key={m}>{m}</span>)}
            </div>
            <h3 className="mood-name">{product.name}</h3>
            <p className="mood-intro">{profile.intro}</p>
            <p className="mood-label">Scent notes</p>
            <ul className="mood-notes">
              {profile.notes.map((n, i) => (
                <li key={n} style={{ '--d': `${i * 45}ms` }}>{n}</li>
              ))}
            </ul>
            <div className="mood-foot">
              <span className="mood-price">{priceRange(product)}</span>
              {profile.burnTime && (
                <span className="mood-burn"><FlameIcon size={15} /> {profile.burnTime}</span>
              )}
            </div>
            <Link to={`/${product.slug}`} className="button button-primary">
              Shop {product.name} <ArrowRight />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
