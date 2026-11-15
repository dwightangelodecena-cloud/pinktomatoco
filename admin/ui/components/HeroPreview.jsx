import { useEffect, useState } from 'react';
// The theme's own helpers, so the preview shows exactly what the store will.
import { artFor, notesFromText, storyText } from '../../../theme/assets/js/theme/global/pinktomato-notes.js';
import CUTOUTS, { LABEL_NOTES } from '../../../theme/assets/js/theme/global/pinktomato-cutouts.js';
import { ArrowRight } from '../Icons.jsx';

// Same tints and ingredient spots as the homepage hero (pinktomato-showcase.js).
const TINTS = [
  { glow: 'rgba(232, 150, 80, .55)', bg: '#251a14' },
  { glow: 'rgba(200, 71, 79, .5)', bg: '#28171a' },
  { glow: 'rgba(214, 150, 110, .5)', bg: '#261b15' },
  { glow: 'rgba(236, 186, 120, .5)', bg: '#241c13' },
  { glow: 'rgba(240, 170, 160, .45)', bg: '#2a1b1c' },
];
const SPOTS = [
  { x: 36, y: 16, s: 58, r: -18 }, { x: 62, y: 12, s: 46, r: 24 }, { x: 31, y: 70, s: 50, r: 12 },
  { x: 68, y: 74, s: 62, r: -28 }, { x: 46, y: 6, s: 34, r: 40 }, { x: 57, y: 88, s: 38, r: -8 },
  { x: 4, y: 88, s: 44, r: 18 }, { x: 95, y: 10, s: 48, r: -22 },
];

const plain = (html) => {
  const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
  doc.querySelectorAll('p, br, li, div').forEach((el) => el.append('\n'));
  return doc.body.textContent || '';
};

// slides: the admin's hero candles; fallback: the products shown when none are chosen.
export default function HeroPreview({ draft, slides, fallback }) {
  const h = draft.home;
  const [index, setIndex] = useState(0);
  const items = slides.length ? slides : fallback.map((p) => ({ p, s: {} }));
  useEffect(() => { if (index >= items.length) setIndex(0); }, [items.length, index]);
  if (!items.length) return null;

  const { p, s } = items[Math.min(index, items.length - 1)];
  const text = plain(p.description_html);
  const notes = (s.notes && s.notes.length) ? s.notes : notesFromText(text).length ? notesFromText(text) : LABEL_NOTES[p.id] || p.name.split(/\s+/);
  const chips = notes.filter((n) => n.length > 2 && !/^(wax|melt|wick|wooden|candle)$/i.test(n)).slice(0, 4);
  const art = [...(s.images || []).map((src) => ({ img: src })), ...artFor(notes).map((svg) => ({ svg }))];
  const cutout = s.cutout || (CUTOUTS.includes(p.id) ? `/cutouts/${p.id}.webp` : '');
  const hexTint = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    const dark = (v) => Math.round(v * 0.16 + 14);
    return { glow: `rgba(${r}, ${g}, ${b}, .55)`, bg: `rgb(${dark(r)}, ${dark(g)}, ${dark(b)})` };
  };
  const tint = s.color ? hexTint(s.color) : TINTS[index % TINTS.length];

  return (
    <section data-preview="hero" className="showcase is-ready is-in" style={{ '--showcase-glow': tint.glow, '--showcase-bg': tint.bg }} key={`${p.id}-${index}`}>
      <div className="showcase-stage">
        <span className="showcase-glow" aria-hidden="true" />
        <p className="showcase-word" aria-hidden="true">{p.name}</p>
        <div className="showcase-notes" aria-hidden="true">
          {SPOTS.map((spot, n) => {
            const a = art[n % art.length];
            return (
              <span key={n} className="showcase-note" style={{ left: `${spot.x}%`, top: `${spot.y}%`, '--s': `${spot.s + 10}px`, '--r': `${spot.r}deg`, '--d': `${n * 90}ms`, '--f': `${6 + (n % 3) * 1.5}s` }}>
                {/* Drawings come from the theme's own library; pictures are the admin's uploads. */}
                {a.img ? <img src={a.img} alt="" /> : <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: a.svg }} />}
              </span>
            );
          })}
        </div>
        <div className="showcase-inner container">
          <div className="showcase-copy">
            <p className="showcase-eyebrow">{h.heroEyebrow}</p>
            <h1 className="showcase-title">{p.name}</h1>
            <p className="showcase-text">{storyText(text)}</p>
            {chips.length > 0 && <ul className="showcase-chips">{chips.map((c) => <li key={c}>{c}</li>)}</ul>}
            <div className="showcase-actions"><span className="button button-light">Shop this candle <ArrowRight /></span><span className="showcase-all">{h.heroButton}</span></div>
          </div>
          <div className={`showcase-figure ${cutout ? 'is-cutout' : ''}`}>
            <span className="showcase-arch-glow" aria-hidden="true" />
            <div className="showcase-arch"><img className="showcase-img" src={cutout || p.images?.[0]} alt="" /></div>
            <span className="showcase-floor" aria-hidden="true" />
          </div>
          <div className="showcase-side">
            <p className="showcase-tagline">{h.heroTitle}</p>
            <p className="showcase-side-text">{h.heroText}</p>
            <ul className="showcase-thumbs">
              {items.slice(0, 5).map((it, i) => (
                <li key={`${it.p.id}-${i}`}>
                  <button type="button" className={`showcase-thumb ${i === index ? 'is-active' : ''}`} onClick={() => setIndex(i)} aria-label={it.p.name}>
                    <img src={it.p.images?.[0]} alt="" />
                  </button>
                </li>
              ))}
            </ul>
            <p className="showcase-count"><span>{String(index + 1).padStart(2, '0')}</span> / <span>{String(Math.min(5, items.length)).padStart(2, '0')}</span></p>
          </div>
        </div>
      </div>
    </section>
  );
}
