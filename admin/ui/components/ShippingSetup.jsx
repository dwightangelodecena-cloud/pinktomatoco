import { useState } from 'react';
import { deleteMethod, saveMethod, saveZone } from '../lib/adminApi.js';

// Plain-language shipping for a non-technical owner: one sentence saying what customers pay,
// and a short chooser that sets it up. The detailed areas and options stay under "Advanced".
const money = (n) => `$${Number(n || 0).toFixed(2)}`;

// What customers in one area pay, as a sentence.
export function describeZone(z) {
  const on = z.methods.filter((m) => m.enabled);
  const free = z.freeShipping.enabled;
  if (!z.enabled) return { ok: true, text: `Shipping to ${z.name} is switched off.` };
  if (!on.length && !free) return { ok: false, text: `No shipping price is set for ${z.name}, so customers there can't check out yet.` };
  const parts = on.map((m) => {
    if (m.type === 'free') return 'shipping is free';
    if (m.type === 'perorder') return `customers pay ${money(m.rate)} shipping per order`;
    if (m.type === 'peritem') return `customers pay ${money(m.rate)} shipping per item`;
    if (m.type === 'total') return `shipping depends on the order total (${m.ranges.map((r) => `${money(r.from)}–${money(r.to)}: ${money(r.cost)}`).join(', ')})`;
    if (m.type === 'weight') return `shipping depends on the package weight`;
    return m.name;
  });
  let text = parts.length ? parts.join('; or ') : 'shipping is free';
  text = text.charAt(0).toUpperCase() + text.slice(1);
  if (free && z.freeShipping.minimum > 0) text += `. Orders of ${money(z.freeShipping.minimum)} or more ship free`;
  if (free && !(z.freeShipping.minimum > 0) && on.length) text += '. Every order ships free';
  return { ok: true, text: `${z.name}: ${text}.` };
}

const CHOICES = [
  { value: 'flat', title: 'One price for every order', text: 'Simple and clear, e.g. $8 shipping on any order.' },
  { value: 'free', title: 'Free shipping on every order', text: 'You cover shipping yourself. Customers pay nothing extra.' },
  { value: 'bands', title: 'Price depends on the order total', text: 'Smaller orders pay more, bigger orders pay less.' },
];

export function ShippingSetup({ zone, onDone, onCancel }) {
  const current = zone.methods.find((m) => m.enabled);
  const [choice, setChoice] = useState(current?.type === 'free' ? 'free' : current?.type === 'total' ? 'bands' : 'flat');
  const [price, setPrice] = useState(current?.type === 'perorder' ? String(current.rate) : '');
  const [freeOver, setFreeOver] = useState(zone.freeShipping.enabled && zone.freeShipping.minimum > 0);
  const [freeMin, setFreeMin] = useState(zone.freeShipping.minimum > 0 ? String(zone.freeShipping.minimum) : '');
  const [bands, setBands] = useState(current?.type === 'total' && current.ranges.length
    ? current.ranges.map((r) => ({ to: String(r.to), cost: String(r.cost) }))
    : [{ to: '30', cost: '' }, { to: '1000', cost: '' }]);
  const [status, setStatus] = useState(null);

  const preview = (() => {
    if (choice === 'free') return `Every order to ${zone.name} ships free.`;
    if (choice === 'flat') {
      if (!price) return 'Enter a shipping price to see how it will work.';
      return `Customers in ${zone.name} pay ${money(price)} shipping.${freeOver && freeMin ? ` Orders of ${money(freeMin)} or more ship free.` : ''}`;
    }
    let from = 0;
    return bands.filter((b) => b.to && b.cost !== '').map((b) => { const t = `orders ${money(from)}–${money(b.to)} pay ${money(b.cost)}`; from = Number(b.to); return t; }).join(', ') || 'Fill in the price bands to see how it will work.';
  })();

  const save = async (e) => {
    e.preventDefault();
    if (choice === 'flat' && !(Number(price) >= 0 && price !== '')) return setStatus({ type: 'error', text: 'Enter the shipping price.' });
    if (choice === 'flat' && freeOver && !(Number(freeMin) > 0)) return setStatus({ type: 'error', text: 'Enter the order total that ships free.' });
    if (!window.confirm(`This replaces the current shipping prices for ${zone.name}. Continue?`)) return;
    setStatus({ type: 'pending' });
    try {
      // Replace the area's shipping prices with the one chosen here.
      for (const m of zone.methods) await deleteMethod(zone.id, m.id);
      if (choice === 'flat') await saveMethod(zone.id, { name: 'Standard Shipping', type: 'perorder', rate: Number(price), enabled: true });
      if (choice === 'free') await saveMethod(zone.id, { name: 'Free Shipping', type: 'free', enabled: true });
      if (choice === 'bands') {
        let from = 0;
        const ranges = bands.filter((b) => b.to && b.cost !== '').map((b) => { const r = { from, to: Number(b.to), cost: Number(b.cost) }; from = Number(b.to); return r; });
        await saveMethod(zone.id, { name: 'Standard Shipping', type: 'total', ranges, enabled: true });
      }
      await saveZone({
        ...zone,
        locations: zone.locations,
        freeShipping: { enabled: choice === 'flat' && freeOver, minimum: choice === 'flat' && freeOver ? Number(freeMin) : 0 },
      });
      onDone();
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  return (
    <form className="ship-setup" onSubmit={save}>
      <h4>How do you want to charge shipping to {zone.name}?</h4>
      <div className="ship-choices" role="radiogroup">
        {CHOICES.map((c) => (
          <label key={c.value} className={`ship-choice ${choice === c.value ? 'is-on' : ''}`}>
            <input type="radio" name="ship-choice" value={c.value} checked={choice === c.value} onChange={() => setChoice(c.value)} />
            <strong>{c.title}</strong>
            <span>{c.text}</span>
          </label>
        ))}
      </div>

      {choice === 'flat' && (
        <div className="ship-fields">
          <label className="ship-money">
            <span>Shipping price</span>
            <span className="ship-money-input"><b>$</b><input className="form-input" type="number" min="0" step="0.01" inputMode="decimal" placeholder="8.00" value={price} onChange={(e) => setPrice(e.target.value)} /></span>
          </label>
          <label className="admin-switch">
            <input type="checkbox" checked={freeOver} onChange={(e) => setFreeOver(e.target.checked)} />
            <span>Bigger orders ship free</span>
          </label>
          {freeOver && (
            <label className="ship-money">
              <span>Orders of this amount or more ship free</span>
              <span className="ship-money-input"><b>$</b><input className="form-input" type="number" min="0" step="0.01" inputMode="decimal" placeholder="50.00" value={freeMin} onChange={(e) => setFreeMin(e.target.value)} /></span>
            </label>
          )}
        </div>
      )}

      {choice === 'bands' && (
        <div className="ship-fields">
          {bands.map((b, i) => (
            <div key={i} className="ship-band">
              <span>Orders {i === 0 ? 'up to' : `from ${money(bands[i - 1].to || 0)} up to`}</span>
              <span className="ship-money-input"><b>$</b><input className="form-input" type="number" min="0" step="0.01" value={b.to} onChange={(e) => setBands(bands.map((x, n) => (n === i ? { ...x, to: e.target.value } : x)))} /></span>
              <span>pay</span>
              <span className="ship-money-input"><b>$</b><input className="form-input" type="number" min="0" step="0.01" placeholder="0.00" value={b.cost} onChange={(e) => setBands(bands.map((x, n) => (n === i ? { ...x, cost: e.target.value } : x)))} /></span>
              {bands.length > 1 && <button type="button" className="link-button" onClick={() => setBands(bands.filter((_, n) => n !== i))}>Remove</button>}
            </div>
          ))}
          <button type="button" className="link-button" onClick={() => setBands([...bands, { to: '', cost: '' }])}>+ Add another price band</button>
        </div>
      )}

      <p className="ship-preview"><span>What customers will see:</span> {preview}</p>

      <div className="admin-actions">
        <button className="button button-primary button-small" type="submit" disabled={status?.type === 'pending'}>{status?.type === 'pending' ? 'Saving…' : 'Save shipping'}</button>
        <button type="button" className="link-button" onClick={onCancel}>Cancel</button>
        {status?.text && <p className={`form-message ${status.type}`} role="alert">{status.text}</p>}
      </div>
    </form>
  );
}
