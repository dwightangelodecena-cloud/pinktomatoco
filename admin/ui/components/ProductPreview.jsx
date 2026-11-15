import { useState } from 'react';

// A live preview of the product page while editing: photo, name, price, options, and the
// "At a glance" card built from the Mood / Scent Notes / Burn Time lines (like the store does).
const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const split = (t) => t.split(/[,/·]/).map((x) => x.trim().replace(/\.$/, '')).filter(Boolean);

function glance(text) {
  const facts = { mood: [], notes: [], burn: '', story: [], all: [] };
  String(text || '').split(/\n+/).map((l) => l.trim()).filter(Boolean).forEach((line) => {
    const m = line.match(/^(mood|scent notes?|notes|burn time)\s*:\s*(.+)$/i);
    // Every other line, for descriptions that are only the standard text (no story of their own).
    if (!m) facts.all.push(line);
    if (!m) { if (!/^[-•*]|constructed with|^all (our )?candles/i.test(line)) facts.story.push(line); return; }
    const k = m[1].toLowerCase();
    if (k === 'mood') facts.mood = split(m[2]);
    else if (k === 'burn time') facts.burn = m[2];
    else facts.notes = split(m[2]);
  });
  return facts;
}

export default function ProductPreview({ name, description, images, options, rows, visible, categories }) {
  const [photo, setPhoto] = useState(0);
  const prices = rows.map((r) => Number(r.price)).filter((n) => n >= 0 && !Number.isNaN(n));
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const facts = glance(description);
  const main = images[photo] || images[0];

  return (
    <aside className="product-preview" aria-label="Preview of the product page">
      <p className="product-preview-label">Preview of the product page{visible ? '' : ' · hidden from the shop'}</p>
      <div className="product-preview-page">
        <div className="product-preview-top">
          <div className="product-preview-media">
            {main ? <img src={main} alt="" /> : <span className="product-preview-empty">Add a photo</span>}
            {images.length > 1 && (
              <div className="product-preview-thumbs">
                {images.slice(0, 5).map((src, i) => (
                  <button key={src} type="button" className={i === photo ? 'is-on' : ''} onClick={() => setPhoto(i)}><img src={src} alt="" /></button>
                ))}
              </div>
            )}
          </div>
          <div className="product-preview-info">
            {categories.length > 0 && <p className="product-preview-crumbs">Shop All / {categories.join(' · ')}</p>}
            <h3>{name || 'Product name'}</h3>
            <p className="product-preview-price">{min === max ? money(min) : `${money(min)} – ${money(max)}`}</p>
            {options.filter((o) => o.name && o.values.length).map((o) => (
              <label key={o.name} className="product-preview-option">
                <span>{o.name} <small>Required</small></span>
                <select defaultValue="">
                  <option value="" disabled>Pick one</option>
                  {o.values.map((v) => <option key={v}>{v}</option>)}
                </select>
              </label>
            ))}
            <span className="product-preview-cart">Add To Cart</span>
          </div>
        </div>
        <div className="product-preview-story">
          <div className="product-preview-desc">{(facts.story.length ? facts.story : facts.all.length ? facts.all : ['Your description shows here.']).slice(0, 8).map((p, i) => <p key={i}>{p}</p>)}</div>
          {(facts.mood.length > 0 || facts.notes.length > 0 || facts.burn) && (
            <div className="glance-card">
              <p className="eyebrow">At a glance</p>
              {facts.mood.length > 0 && <div className="glance-row"><span className="glance-label">Mood</span><div className="glance-chips">{facts.mood.map((m) => <span key={m} className="glance-chip">{m}</span>)}</div></div>}
              {facts.notes.length > 0 && <div className="glance-row"><span className="glance-label">Scent notes</span><div className="glance-tags">{facts.notes.map((m) => <span key={m} className="glance-tag">{m}</span>)}</div></div>}
              {facts.burn && <div className="glance-row"><span className="glance-label">Burn time</span><p className="glance-burn">{facts.burn}</p></div>}
            </div>
          )}
        </div>
      </div>
      <p className="content-hint">Tip: lines that start with "Mood:", "Scent Notes:" and "Burn Time:" become the "At a glance" card.</p>
    </aside>
  );
}
