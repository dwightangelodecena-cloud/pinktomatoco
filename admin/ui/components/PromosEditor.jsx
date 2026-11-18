// Content > Promotions: the offers shown on the homepage and on every product page.
import { ImageUpload, OrderButtons, Section, Text } from './ContentFields.jsx';
import { PlusIcon, TagIcon, TrashIcon } from '../Icons.jsx';

const NEW_OFFER = { on: true, badge: '', title: '', text: '', code: '', image: '', button: 'Shop candles', link: '/shop-all/' };

function Switch({ checked, onChange, label }) {
  return (
    <label className="promo-switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function Photo({ src, onChange }) {
  return (
    <div className="promo-photo">
      {src ? <img src={src} alt="" /> : <span className="promo-photo-empty">No photo yet</span>}
      <div className="promo-photo-actions">
        <ImageUpload label={src ? 'Change photo' : 'Add photo'} keep shape="wide" onUploaded={onChange} />
        {src && <button type="button" className="content-tool is-danger" onClick={() => onChange('')}>Remove photo</button>}
      </div>
    </div>
  );
}

export default function PromosEditor({ draft, edit }) {
  const promos = draft.promos;
  const set = (patch, field) => edit('promos', patch, field);
  const items = promos.items || [];
  const setItem = (i, patch, field) => set({ items: items.map((it, n) => (n === i ? { ...it, ...patch } : it)) }, field && `promo-${i}-${field}`);
  const move = (from, to) => {
    const next = items.slice();
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    set({ items: next });
  };
  const bundle = promos.bundle || {};
  const setBundle = (patch, field) => set({ bundle: { ...bundle, ...patch } }, field && `bundle-${field}`);
  const tiers = bundle.tiers || [];
  const setTier = (i, patch) => setBundle({ tiers: tiers.map((t, n) => (n === i ? { ...t, ...patch } : t)) }, `tier-${i}`);
  const live = items.filter((it) => it.on).length + (bundle.on ? 1 : 0);

  return (
    <>
      <div className="promo-note">
        <TagIcon size={18} />
        <span>
          This shows your offers on the website. To make the price actually drop at checkout, the same discount must
          also be set up in BigCommerce: <strong>Marketing &gt; Promotions</strong> (a coupon code, or an automatic discount).
        </span>
      </div>

      <Section collapsible defaultOpen Icon={TagIcon} title="Where offers show" previewKey="promos" intro={`${live} offer${live === 1 ? ' is' : 's are'} switched on.`}>
        <Switch checked={promos.show !== false} onChange={(v) => set({ show: v })} label="Show the offers section on the homepage" />
        <Switch checked={promos.showOnProducts !== false} onChange={(v) => set({ showOnProducts: v })} label="Show a short offer note on every product page" />
        <Text label="Small label" value={promos.eyebrow} onChange={(v) => set({ eyebrow: v }, 'eyebrow')} />
        <Text label="Heading" value={promos.title} onChange={(v) => set({ title: v }, 'title')} />
      </Section>

      <Section collapsible defaultOpen Icon={TagIcon} title="Offers" previewKey="promos" intro="Each offer is a card with an optional photo. Switch an offer off to hide it without deleting it.">
        {items.map((it, i) => (
          <fieldset key={i} className={`promo-item ${it.on ? '' : 'is-off'}`}>
            <legend>{it.title || `Offer ${i + 1}`}</legend>
            <div className="promo-item-top">
              <Switch checked={it.on} onChange={(v) => setItem(i, { on: v })} label={it.on ? 'On: shown on the website' : 'Off: hidden'} />
              <OrderButtons index={i} count={items.length} onMove={move} label={it.title || `offer ${i + 1}`} />
              <button type="button" className="content-tool is-danger" onClick={() => window.confirm('Delete this offer?') && set({ items: items.filter((_, n) => n !== i) })}><TrashIcon size={14} /> Delete</button>
            </div>
            <div className="promo-grid">
              <Text label="Badge (big text)" hint="For example 10% OFF or FREE GIFT" value={it.badge} onChange={(v) => setItem(i, { badge: v }, 'badge')} />
              <Text label="Title" value={it.title} onChange={(v) => setItem(i, { title: v }, 'title')} />
            </div>
            <Text label="Short text" rows={2} value={it.text} onChange={(v) => setItem(i, { text: v }, 'text')} />
            <div className="promo-grid">
              <Text label="Coupon code (optional)" hint="Shown with a Copy button. It must match a coupon in BigCommerce." value={it.code} onChange={(v) => setItem(i, { code: v.toUpperCase().replace(/\s+/g, '') }, 'code')} />
              <Text label="Button text" value={it.button} onChange={(v) => setItem(i, { button: v }, 'button')} />
            </div>
            <Text label="Button goes to" hint="A page on your shop, like /shop-all/ or /candles/" value={it.link} onChange={(v) => setItem(i, { link: v }, 'link')} />
            <Photo src={it.image} onChange={(url) => setItem(i, { image: url })} />
          </fieldset>
        ))}
        {items.length < 4 && (
          <button type="button" className="content-tool" onClick={() => set({ items: [...items, { ...NEW_OFFER }] })}><PlusIcon size={14} /> Add an offer</button>
        )}
      </Section>

      <Section collapsible Icon={TagIcon} title="Bundle promotions" previewKey="promos" intro="A price table for buying several candles at once.">
        <Switch checked={Boolean(bundle.on)} onChange={(v) => setBundle({ on: v })} label={bundle.on ? 'On: shown on the website' : 'Off: hidden (turn on when the bundle discount is ready)'} />
        <Text label="Title" value={bundle.title} onChange={(v) => setBundle({ title: v }, 'title')} />
        <Text label="Text" rows={3} value={bundle.text} onChange={(v) => setBundle({ text: v }, 'text')} />
        <div className="promo-tier-editor">
          <div className="promo-tier is-head"><span>Quantity</span><span>Discount</span><span /></div>
          {tiers.map((t, i) => (
            <div key={i} className="promo-tier">
              <input className="form-input" aria-label={`Quantity ${i + 1}`} value={t.qty} onChange={(e) => setTier(i, { qty: e.target.value })} />
              <input className="form-input" aria-label={`Discount ${i + 1}`} value={t.off} onChange={(e) => setTier(i, { off: e.target.value })} />
              <button type="button" className="content-tool is-danger" aria-label="Remove row" onClick={() => setBundle({ tiers: tiers.filter((_, n) => n !== i) })}><TrashIcon size={14} /></button>
            </div>
          ))}
          {tiers.length < 8 && <button type="button" className="content-tool" onClick={() => setBundle({ tiers: [...tiers, { qty: '', off: '' }] })}><PlusIcon size={14} /> Add a row</button>}
        </div>
        <Text label="Small print" rows={2} value={bundle.note} onChange={(v) => setBundle({ note: v }, 'note')} />
        <Photo src={bundle.image} onChange={(url) => setBundle({ image: url })} />
      </Section>
    </>
  );
}
