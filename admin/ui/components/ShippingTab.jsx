import { useState } from 'react';
import {
  CONTROL_PANEL, deleteMethod, deleteTaxRate, deleteZone, getPayments, getShipping, getTax, saveMethod, saveTaxRate, saveZone,
} from '../lib/adminApi.js';
import { ArrowRight, PencilIcon, PlusIcon, TrashIcon, TruckIcon } from '../Icons.jsx';
import { Section } from './ContentFields.jsx';
import { ShippingSetup, describeZone } from './ShippingSetup.jsx';
import { Empty, Loading, Panel, Problem, useAdminData } from './shared.jsx';

const COUNTRIES = [
  ['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['AU', 'Australia'], ['PH', 'Philippines'], ['MX', 'Mexico'],
];
const countryName = (code) => COUNTRIES.find((c) => c[0] === code)?.[1] || code;
const METHOD_TYPES = [
  { value: 'perorder', label: 'Flat rate per order', hint: 'One price for the whole order.' },
  { value: 'peritem', label: 'Flat rate per item', hint: 'The price is multiplied by the number of items.' },
  { value: 'total', label: 'By order total', hint: 'Price bands by how much the order costs.' },
  { value: 'weight', label: 'By weight (lb)', hint: 'Price bands by how heavy the order is.' },
  { value: 'free', label: 'Free shipping', hint: 'Always free in this area.' },
];
const typeLabel = (t) => METHOD_TYPES.find((m) => m.value === t)?.label || t;
const dollars = (n) => `$${Number(n).toFixed(2)}`;

function describeMethod(m) {
  if (m.type === 'perorder') return `${dollars(m.rate)} per order`;
  if (m.type === 'peritem') return `${dollars(m.rate)} per item`;
  if (m.type === 'free') return 'Free';
  if (m.type === 'total' || m.type === 'weight') {
    const unit = m.type === 'weight' ? (n) => `${n} lb` : dollars;
    return m.ranges.map((r) => `${unit(r.from)}–${unit(r.to)}: ${dollars(r.cost)}`).join(' · ');
  }
  return typeLabel(m.type);
}

function MethodForm({ method, onSave, onCancel }) {
  const [m, setM] = useState({
    id: method.id ?? null,
    name: method.name ?? 'Standard Shipping',
    type: method.type ?? 'perorder',
    rate: method.rate ?? '',
    ranges: method.ranges?.length ? method.ranges : [{ from: 0, to: '', cost: '' }],
    enabled: method.enabled ?? true,
  });
  const [status, setStatus] = useState(null);
  const set = (k, v) => setM((x) => ({ ...x, [k]: v }));
  const setRange = (i, k, v) => set('ranges', m.ranges.map((r, n) => (n === i ? { ...r, [k]: v } : r)));
  const banded = m.type === 'total' || m.type === 'weight';

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ type: 'pending' });
    try {
      await onSave(m);
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  return (
    <form className="settings-form" onSubmit={submit}>
      <label className="form-field">
        <span className="form-field-title">Name shoppers see at checkout</span>
        <input className="form-input" required value={m.name} onChange={(e) => set('name', e.target.value)} />
      </label>
      <label className="form-field">
        <span className="form-field-title">How it's charged</span>
        <select className="form-input form-select" value={m.type} onChange={(e) => set('type', e.target.value)}>
          {METHOD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <small className="content-hint">{METHOD_TYPES.find((t) => t.value === m.type)?.hint}</small>
      </label>
      {(m.type === 'perorder' || m.type === 'peritem') && (
        <label className="form-field">
          <span className="form-field-title">Price ($)</span>
          <input className="form-input" type="number" min="0" step="0.01" required value={m.rate} onChange={(e) => set('rate', e.target.value)} />
        </label>
      )}
      {banded && (
        <div className="form-field">
          <span className="form-field-title">Price bands</span>
          <ul className="settings-bands">
            {m.ranges.map((r, i) => (
              <li key={i}>
                <label><span>From {m.type === 'weight' ? '(lb)' : '($)'}</span><input className="form-input" type="number" min="0" step="0.01" value={r.from} onChange={(e) => setRange(i, 'from', e.target.value)} /></label>
                <label><span>Up to {m.type === 'weight' ? '(lb)' : '($)'}</span><input className="form-input" type="number" min="0" step="0.01" required value={r.to} onChange={(e) => setRange(i, 'to', e.target.value)} /></label>
                <label><span>Shipping ($)</span><input className="form-input" type="number" min="0" step="0.01" required value={r.cost} onChange={(e) => setRange(i, 'cost', e.target.value)} /></label>
                <button type="button" className="content-tool is-danger" aria-label="Remove band" disabled={m.ranges.length === 1} onClick={() => set('ranges', m.ranges.filter((_, n) => n !== i))}><TrashIcon size={14} /></button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="content-tool"
            onClick={() => set('ranges', [...m.ranges, { from: m.ranges[m.ranges.length - 1]?.to || 0, to: '', cost: '' }])}
          >
            <PlusIcon size={14} /> Add band
          </button>
        </div>
      )}
      <label className="admin-switch">
        <input type="checkbox" checked={m.enabled} onChange={(e) => set('enabled', e.target.checked)} />
        <span>Offer this at checkout</span>
      </label>
      <div className="admin-actions">
        <button className="button button-primary button-small" type="submit" disabled={status?.type === 'pending'}>{status?.type === 'pending' ? 'Saving…' : 'Save shipping option'}</button>
        <button type="button" className="link-button" onClick={onCancel}>Cancel</button>
        {status?.text && <p className={`form-message ${status.type}`} role="alert">{status.text}</p>}
      </div>
    </form>
  );
}

function ZoneForm({ zone, onSave, onCancel }) {
  const [z, setZ] = useState({
    id: zone.id ?? null,
    name: zone.name ?? '',
    country: zone.locations?.[0]?.country ?? 'US',
    states: (zone.locations || []).map((l) => l.state).filter(Boolean).join(', '),
    enabled: zone.enabled ?? true,
    freeOn: zone.freeShipping?.enabled ?? false,
    freeMin: zone.freeShipping?.minimum ?? '',
    handlingFee: zone.handlingFee ?? 0,
  });
  const [status, setStatus] = useState(null);
  const set = (k, v) => setZ((x) => ({ ...x, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ type: 'pending' });
    const states = z.states.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    try {
      await onSave({
        id: z.id,
        name: z.name || countryName(z.country),
        locations: states.length ? states.map((state) => ({ country: z.country, state })) : [{ country: z.country }],
        enabled: z.enabled,
        freeShipping: { enabled: z.freeOn, minimum: Number(z.freeMin) || 0 },
        handlingFee: Number(z.handlingFee) || 0,
      });
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  return (
    <form className="settings-form" onSubmit={submit}>
      <label className="form-field">
        <span className="form-field-title">Area name</span>
        <input className="form-input" placeholder="e.g. United States" value={z.name} onChange={(e) => set('name', e.target.value)} />
      </label>
      <label className="form-field">
        <span className="form-field-title">Country</span>
        <select className="form-input form-select" value={z.country} onChange={(e) => set('country', e.target.value)}>
          {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </select>
      </label>
      <label className="form-field">
        <span className="form-field-title">Only these states (optional)</span>
        <input className="form-input" placeholder="e.g. ND, MN, SD — leave empty for the whole country" value={z.states} onChange={(e) => set('states', e.target.value)} />
      </label>
      <label className="admin-switch">
        <input type="checkbox" checked={z.freeOn} onChange={(e) => set('freeOn', e.target.checked)} />
        <span>Offer free shipping on bigger orders</span>
      </label>
      {z.freeOn && (
        <label className="form-field">
          <span className="form-field-title">Order total that gets free shipping ($)</span>
          <input className="form-input" type="number" min="0" step="0.01" required placeholder="e.g. 50" value={z.freeMin} onChange={(e) => set('freeMin', e.target.value)} />
          <small className="content-hint">This is not a charge. Orders at or above this amount ship free; smaller orders pay the shipping options below. Use 0 to make shipping always free.</small>
        </label>
      )}
      <label className="form-field">
        <span className="form-field-title">Handling fee per order ($)</span>
        <input className="form-input" type="number" min="0" step="0.01" value={z.handlingFee} onChange={(e) => set('handlingFee', e.target.value)} />
        <small className="content-hint">Added on top of shipping. Leave at 0 for none.</small>
      </label>
      <label className="admin-switch">
        <input type="checkbox" checked={z.enabled} onChange={(e) => set('enabled', e.target.checked)} />
        <span>Ship to this area</span>
      </label>
      <div className="admin-actions">
        <button className="button button-primary button-small" type="submit" disabled={status?.type === 'pending'}>{status?.type === 'pending' ? 'Saving…' : 'Save area'}</button>
        <button type="button" className="link-button" onClick={onCancel}>Cancel</button>
        {status?.text && <p className={`form-message ${status.type}`} role="alert">{status.text}</p>}
      </div>
    </form>
  );
}

function Shipping() {
  const { data: zones, error, setError, reload } = useAdminData(getShipping);
  const [editing, setEditing] = useState(null); // { kind: 'zone' | 'method', zoneId, item }
  const [setupZone, setSetupZone] = useState(null);

  const run = async (fn) => {
    setError('');
    try {
      await fn();
      setEditing(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const noMethods = zones?.some((z) => z.enabled && z.methods.filter((m) => m.enabled).length === 0 && !z.freeShipping.enabled);

  return (
    <Section title="Shipping" intro="What customers pay to get their order. Changes apply at checkout straight away.">
      <Problem>{error}</Problem>
      {!zones && !error && <Loading />}
      {zones?.length === 0 && <Empty>You don't ship anywhere yet. Open "Advanced" below to add the United States.</Empty>}

      {/* The simple view: one sentence per area and one button to set it up. */}
      {zones?.map((z) => {
        const d = describeZone(z);
        return (
          <div key={z.id} className={`ship-summary ${d.ok ? 'is-ok' : 'is-missing'}`}>
            {setupZone === z.id ? (
              <ShippingSetup zone={z} onCancel={() => setSetupZone(null)} onDone={() => { setSetupZone(null); reload(); }} />
            ) : (
              <>
                <p><span className="ship-dot" aria-hidden="true" />{d.text}</p>
                <button type="button" className="button button-primary button-small" onClick={() => setSetupZone(z.id)}>{d.ok ? 'Change shipping' : 'Set up shipping'}</button>
              </>
            )}
          </div>
        );
      })}

      <details className="ship-advanced">
        <summary>Advanced: shipping areas and options</summary>
        <p className="content-hint">For more control: ship to other countries or only some states, offer several options at checkout, or charge by weight. Most stores never need this.</p>
      {noMethods && <p className="form-message error" role="alert">A shipping area has no shipping options, so shoppers there can't finish checkout.</p>}
      {zones?.map((z) => (
        <article key={z.id} className="settings-card">
          {editing?.kind === 'zone' && editing.item.id === z.id ? (
            <ZoneForm zone={z} onCancel={() => setEditing(null)} onSave={(zone) => run(() => saveZone(zone))} />
          ) : (
            <header>
              <div>
                <h4>{z.name}</h4>
                <small>
                  {z.locations.map((l) => (l.state ? `${l.state}, ${l.country}` : countryName(l.country))).join(' · ')}
                  {z.freeShipping.enabled ? (z.freeShipping.minimum > 0 ? ` · Free shipping on orders of ${dollars(z.freeShipping.minimum)} or more` : ' · Free shipping on every order') : ''}
                  {z.handlingFee > 0 ? ` · ${dollars(z.handlingFee)} handling` : ''}
                </small>
              </div>
              <div className="content-row-tools">
                <span className={`content-state ${z.enabled ? 'is-on' : ''}`}>{z.enabled ? 'Shipping' : 'Off'}</span>
                <button type="button" className="content-tool" onClick={() => setEditing({ kind: 'zone', item: z })}><PencilIcon size={14} /> Edit</button>
                <button type="button" className="content-tool is-danger" onClick={() => window.confirm(`Stop shipping to ${z.name} and delete its shipping options?`) && run(() => deleteZone(z.id))}><TrashIcon size={14} /></button>
              </div>
            </header>
          )}
          <ul className="content-rows">
            {z.methods.map((m) => (
              <li key={m.id}>
                {editing?.kind === 'method' && editing.item.id === m.id ? (
                  <MethodForm method={m} onCancel={() => setEditing(null)} onSave={(method) => run(() => saveMethod(z.id, method))} />
                ) : (
                  <>
                    <div className="content-row-main">
                      <strong>{m.name}</strong>
                      <small>{typeLabel(m.type)} · {describeMethod(m)}</small>
                    </div>
                    <div className="content-row-tools">
                      <span className={`content-state ${m.enabled ? 'is-on' : ''}`}>{m.enabled ? 'Offered' : 'Off'}</span>
                      <button type="button" className="content-tool" onClick={() => setEditing({ kind: 'method', item: m })}><PencilIcon size={14} /> Edit</button>
                      <button type="button" className="content-tool is-danger" onClick={() => window.confirm(`Delete the shipping option "${m.name}"?`) && run(() => deleteMethod(z.id, m.id))}><TrashIcon size={14} /></button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
          {editing?.kind === 'method' && editing.zoneId === z.id && !editing.item.id ? (
            <MethodForm method={{}} onCancel={() => setEditing(null)} onSave={(method) => run(() => saveMethod(z.id, method))} />
          ) : (
            <button type="button" className="content-tool" onClick={() => setEditing({ kind: 'method', zoneId: z.id, item: {} })}><PlusIcon size={14} /> Add shipping option</button>
          )}
        </article>
      ))}
      {editing?.kind === 'zone' && !editing.item.id ? (
        <article className="settings-card"><ZoneForm zone={{}} onCancel={() => setEditing(null)} onSave={(zone) => run(() => saveZone(zone))} /></article>
      ) : (
        <button type="button" className="button button-small" onClick={() => setEditing({ kind: 'zone', item: {} })}><PlusIcon size={14} /> Add shipping area</button>
      )}
      </details>
    </Section>
  );
}

function Payments() {
  const { data: methods, error } = useAdminData(getPayments);
  return (
    <Section title="Payments" intro="How customers can pay at checkout.">
      <Problem>{error}</Problem>
      {!methods && !error && <Loading />}
      {methods?.length === 0 && <p className="form-message error" role="alert">No way to pay is switched on yet, so customers can't check out.</p>}
      {methods?.some((m) => m.testMode) && (
        <div className="pay-warning" role="alert">
          <strong>A test payment option is switched on.</strong>
          <span>With "{methods.filter((m) => m.testMode).map((m) => m.name).join('", "')}" on, customers could place orders without really paying. Use it for one test order, then switch it off in payment settings.</span>
        </div>
      )}
      {methods?.length > 0 && (
        <>
          <p className="pay-lead">Customers can pay with:</p>
          <div className="pay-chips">
            {methods.filter((m) => !m.testMode).map((m) => <span key={m.code} className="pay-chip">{m.name === 'BigCommerce Payments' ? 'Credit & debit cards' : m.name.replace(/^BigCommerce Payments /, '')}</span>)}
          </div>
        </>
      )}
      <p className="content-hint">To add or remove a way to pay, open payment settings. Connecting a provider means signing in with the business's bank details, which BigCommerce only allows there.</p>
      <a className="button button-small" href={`${CONTROL_PANEL}/settings/payment`} target="_blank" rel="noreferrer">Open payment settings <ArrowRight size={14} /></a>
    </Section>
  );
}

function TaxRateForm({ rate, zones, onSave, onCancel }) {
  const [r, setR] = useState({ id: rate.id ?? null, name: rate.name ?? 'Sales Tax', rate: rate.rate ?? '', zoneId: rate.zoneId ?? zones[0]?.id ?? '', enabled: rate.enabled ?? true });
  const [status, setStatus] = useState(null);
  const set = (k, v) => setR((x) => ({ ...x, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    setStatus({ type: 'pending' });
    try { await onSave(r); } catch (err) { setStatus({ type: 'error', text: err.message }); }
  };
  return (
    <form className="settings-form" onSubmit={submit}>
      <label className="form-field"><span className="form-field-title">Name shoppers see</span><input className="form-input" required value={r.name} onChange={(e) => set('name', e.target.value)} /></label>
      <label className="form-field"><span className="form-field-title">Rate (%)</span><input className="form-input" type="number" min="0" max="100" step="0.001" required value={r.rate} onChange={(e) => set('rate', e.target.value)} /></label>
      <label className="form-field">
        <span className="form-field-title">Applies in</span>
        <select className="form-input form-select" value={r.zoneId} onChange={(e) => set('zoneId', e.target.value)}>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
      </label>
      <label className="admin-switch"><input type="checkbox" checked={r.enabled} onChange={(e) => set('enabled', e.target.checked)} /><span>Charge this tax</span></label>
      <div className="admin-actions">
        <button className="button button-primary button-small" type="submit" disabled={status?.type === 'pending'}>{status?.type === 'pending' ? 'Saving…' : 'Save tax'}</button>
        <button type="button" className="link-button" onClick={onCancel}>Cancel</button>
        {status?.text && <p className={`form-message ${status.type}`} role="alert">{status.text}</p>}
      </div>
    </form>
  );
}

function Tax() {
  const { data: tax, error, setError, reload } = useAdminData(getTax);
  const [editing, setEditing] = useState(null);
  const run = async (fn) => {
    setError('');
    try { await fn(); setEditing(null); reload(); } catch (err) { setError(err.message); }
  };
  const zoneName = (id) => tax?.zones.find((z) => z.id === id)?.name || 'Unknown area';
  return (
    <Section title="Tax" intro="Sales tax added at checkout. Check the right rates with your accountant or state tax office.">
      <Problem>{error}</Problem>
      {!tax && !error && <Loading />}
      {tax?.rates.length === 0 && !editing && <Empty>No tax is charged right now.</Empty>}
      {tax?.rates.length > 0 && (
        <ul className="content-rows">
          {tax.rates.map((r) => (
            <li key={r.id}>
              {editing?.id === r.id ? (
                <TaxRateForm rate={r} zones={tax.zones} onCancel={() => setEditing(null)} onSave={(rate) => run(() => saveTaxRate(rate))} />
              ) : (
                <>
                  <div className="content-row-main"><strong>{r.name}: {r.rate}%</strong><small>{zoneName(r.zoneId)}</small></div>
                  <div className="content-row-tools">
                    <span className={`content-state ${r.enabled ? 'is-on' : ''}`}>{r.enabled ? 'Charged' : 'Off'}</span>
                    <button type="button" className="content-tool" onClick={() => setEditing(r)}><PencilIcon size={14} /> Edit</button>
                    <button type="button" className="content-tool is-danger" onClick={() => window.confirm(`Delete ${r.name}?`) && run(() => deleteTaxRate(r.id))}><TrashIcon size={14} /></button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {tax && editing && !editing.id && <TaxRateForm rate={{}} zones={tax.zones} onCancel={() => setEditing(null)} onSave={(rate) => run(() => saveTaxRate(rate))} />}
      {tax && !editing && <button type="button" className="content-tool" onClick={() => setEditing({})}><PlusIcon size={14} /> Add tax rate</button>}
      <p className="content-hint">Tax areas (which states a rate covers) and automatic tax services are set in <a href={`${CONTROL_PANEL}/settings/tax`} target="_blank" rel="noreferrer">BigCommerce tax settings</a>.</p>
    </Section>
  );
}

export default function ShippingTab() {
  return (
    <Panel title="Shipping, Payments & Tax" icon={<TruckIcon size={22} />} intro="What shoppers pay for delivery, how they can pay you, and any sales tax.">
      {/* Wide screens: shipping on the left, payments and tax beside it on the right. */}
      <div className="settings-layout">
        <div className="settings-main"><Shipping /></div>
        <div className="settings-side"><Payments /><Tax /></div>
      </div>
    </Panel>
  );
}
