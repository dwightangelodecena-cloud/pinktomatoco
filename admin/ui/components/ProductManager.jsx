import { useEffect, useMemo, useState } from 'react';
import { deleteProduct, getAdminProducts, getCategories, saveProduct, setProductVisible } from '../lib/adminApi.js';
import { priceRange } from '../lib/pricing.js';
import { descriptionToText, textToDescription } from '../lib/productText.js';
import { ArrowRight, PencilIcon, PlusIcon, TrashIcon } from '../Icons.jsx';
import { ImageUpload, Section, Text } from './ContentFields.jsx';
import ProductPreview from './ProductPreview.jsx';
// The store's own ingredient drawings and label notes, so the preview here matches the website.
import { artFor, noteKind, notesFromText } from '../../../theme/assets/js/theme/global/pinktomato-notes.js';
import { LABEL_NOTES } from '../../../theme/assets/js/theme/global/pinktomato-cutouts.js';

// Scent notes live in the description as a "Scent Notes:" line (the website reads that line for the
// product page, homepage showcase and mood finder). This field edits just that line.
const NOTES_LINE = /^\s*scent notes?\s*:.*$/im;
function withNotes(text, notes) {
  const line = notes.length ? `Scent Notes: ${notes.join(', ')}` : '';
  if (NOTES_LINE.test(text)) return text.replace(NOTES_LINE, line).replace(/\n{3,}/g, '\n\n').trim();
  return line ? `${text.trim()}\n\n${line}` : text;
}

function ScentNotes({ description, productId, onChange }) {
  const fromText = notesFromText(description);
  const label = LABEL_NOTES[productId] || [];
  const [value, setValue] = useState((fromText.length ? fromText : []).join(', '));
  const notes = value.split(',').map((n) => n.trim()).filter(Boolean);
  const unknown = notes.filter((n) => !noteKind(n));
  const update = (v) => {
    setValue(v);
    onChange(withNotes(description, v.split(',').map((n) => n.trim()).filter(Boolean)));
  };
  return (
    <div className="form-field">
      <span className="form-field-title">Scent notes</span>
      <input className="form-input" placeholder="e.g. Taro Root, Black Tea, Heavy Milk" value={value} onChange={(e) => update(e.target.value)} />
      <small className="content-hint">Separate with commas. They show on the product page with little ingredient drawings, and float around the candle in the homepage showcase.</small>
      {!fromText.length && !value && label.length > 0 && (
        <button type="button" className="content-tool" onClick={() => update(label.join(', '))}>Use the notes from the label: {label.join(', ')}</button>
      )}
      {notes.length > 0 && (
        <div className="hero-notes-preview">
          {/* Drawings come from the theme's own library (trusted markup). */}
          {artFor(notes).map((svg, i) => <span key={i} className="hero-note-art" dangerouslySetInnerHTML={{ __html: svg }} />)}
          {unknown.length > 0 && <small>No drawing yet for: {unknown.join(', ')}</small>}
        </div>
      )}
    </div>
  );
}
import { Empty, Loading, Problem, useAdminData } from './shared.jsx';

// Product pages live at the top of the site, so these names belong to other pages.
const RESERVED = ['admin', 'blog', 'cart', 'categories', 'checkout', 'contact-us', 'login', 'search', 'shipping-returns', 'shop-all', 'sitemap', 'wishlist'];
const slugify = (name) => name.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const SHOP_ALL = 23;
const MAX_COMBOS = 40;
const OPTION_IDEAS = ['Scent', 'Vessel', 'Size', 'Wick', 'Color'];

const keyOf = (values) => Object.keys(values).sort().map((k) => `${k}=${values[k]}`).join('|');

// Every combination of the options' choices, e.g. Tin / 8 oz / Cotton.
function combinations(options) {
  const usable = options.filter((o) => o.name.trim() && o.values.length);
  return usable.reduce((list, o) => list.flatMap((combo) => o.values.map((v) => ({ ...combo, [o.name.trim()]: v }))), [{}]);
}

const rowFrom = (v = {}) => ({
  id: v.id ?? null,
  price: v.price != null && v.price !== '' ? Number(v.price).toFixed(2) : '',
  inherited: Boolean(v.inherited),
  sku: v.sku ?? '',
  stock: v.stock ?? '',
  image_url: v.image_url ?? '',
  onSale: !v.purchasing_disabled,
});

function OptionEditor({ option, onChange, onRemove }) {
  const [value, setValue] = useState('');
  const add = () => {
    const parts = value.split(',').map((s) => s.trim()).filter(Boolean).filter((s) => !option.values.includes(s));
    if (parts.length) onChange({ ...option, values: [...option.values, ...parts] });
    setValue('');
  };
  return (
    <li className="content-option">
      <div className="content-option-head">
        <label>
          <span>Option name</span>
          <input className="form-input" list="pt-option-ideas" placeholder="e.g. Vessel" value={option.name} onChange={(e) => onChange({ ...option, name: e.target.value })} />
        </label>
        <button type="button" className="content-tool is-danger" onClick={onRemove}><TrashIcon size={14} /> Remove option</button>
      </div>
      <div className="content-chips">
        {option.values.map((v) => (
          <span key={v} className="content-chip">
            {v}
            <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange({ ...option, values: option.values.filter((x) => x !== v) })}>×</button>
          </span>
        ))}
      </div>
      <div className="content-add">
        <input
          className="form-input"
          placeholder={option.name ? `Add a ${option.name.toLowerCase()} choice, e.g. ${option.name === 'Wick' ? 'Wooden' : 'Glass jar'}` : 'Add a choice'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <button type="button" className="content-tool" onClick={add}><PlusIcon size={14} /> Add choice</button>
      </div>
    </li>
  );
}

function ProductEditor({ product, categories, onDone, onCancel, setDirty }) {
  const isNew = !product.id;
  const startText = descriptionToText(product.description_html);
  const [form, setForm] = useState({
    name: product.name ?? '',
    weight: product.weight ?? '',
    description: startText,
    images: product.images ?? [],
    is_visible: product.is_visible ?? true,
    categories: product.categories ?? [SHOP_ALL],
    trackStock: isNew ? true : product.inventory_tracking !== 'none',
  });
  const [options, setOptions] = useState(() => (product.options ?? []).map((o) => ({ name: o.name, values: [...o.values] })));
  // Grid rows by combination, so typed prices survive adding or reordering choices.
  const [rows, setRows] = useState(() => {
    const map = {};
    // Stock counted for the whole product can't be split between choices, so those boxes start empty.
    const splitStock = product.inventory_tracking === 'product' && (product.options ?? []).length > 0;
    for (const v of product.variants ?? []) map[keyOf(v.values)] = rowFrom(splitStock ? { ...v, stock: '' } : v);
    if (!Object.keys(map).length) map[''] = rowFrom({ stock: 0 });
    return map;
  });
  const [fill, setFill] = useState({ price: '', stock: '' });
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setDirty(true);
    return () => setDirty(false);
  }, [setDirty]);

  const combos = useMemo(() => combinations(options), [options]);
  const hasOptions = combos.length > 0 && Object.keys(combos[0]).length > 0;
  const firstPrice = Object.values(rows).find((r) => r.price !== '')?.price ?? '';
  const rowFor = (values) => rows[keyOf(values)] ?? { ...rowFrom({ price: firstPrice, stock: 0 }) };
  const patchRow = (values, change) => setRows((r) => ({ ...r, [keyOf(values)]: { ...rowFor(values), ...change, inherited: change.price != null ? false : rowFor(values).inherited } }));

  const set = (k) => (value) => setForm((f) => ({ ...f, [k]: value }));
  const toggleCategory = (id) => set('categories')(form.categories.includes(id) ? form.categories.filter((x) => x !== id) : [...form.categories, id]);

  const applyFill = () => {
    setRows((r) => {
      const next = { ...r };
      for (const values of combos) {
        const row = { ...rowFor(values) };
        if (fill.price !== '') Object.assign(row, { price: Number(fill.price).toFixed(2), inherited: false });
        if (fill.stock !== '') row.stock = fill.stock;
        next[keyOf(values)] = row;
      }
      return next;
    });
    setFill({ price: '', stock: '' });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (isNew && (!slugify(form.name) || RESERVED.includes(slugify(form.name)))) {
      return setStatus({ type: 'error', text: 'That name clashes with a page on the site. Try a different one.' });
    }
    if (options.some((o) => !o.name.trim() || o.values.length === 0)) {
      return setStatus({ type: 'error', text: 'Every option needs a name and at least one choice. Remove any option you are not using.' });
    }
    if (combos.length > MAX_COMBOS) {
      return setStatus({ type: 'error', text: `That makes ${combos.length} combinations. Keep it to ${MAX_COMBOS} or fewer, or split it into two products.` });
    }
    setStatus({ type: 'pending' });
    try {
      const saved = await saveProduct(product.id, {
        name: form.name,
        weight: Number(form.weight),
        // An unchanged description keeps its original formatting.
        description_html: form.description === startText ? product.description_html ?? '' : textToDescription(form.description),
        images: form.images,
        is_visible: form.is_visible,
        categories: form.categories,
        trackStock: form.trackStock,
        options: options.map((o) => ({ name: o.name.trim(), values: o.values })),
        variants: combos.map((values) => {
          const r = rowFor(values);
          return {
            values,
            price: r.price === '' ? '' : Number(r.price),
            sku: r.sku.trim(),
            stock: form.trackStock ? (r.stock === '' ? '' : Number(r.stock)) : null,
            image_url: r.image_url,
            purchasing_disabled: !r.onSale,
          };
        }),
      });
      setDirty(false);
      onDone(`/${saved.slug}`);
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="product-edit-split">
    <form className="content-product-form" onSubmit={submit}>
      <datalist id="pt-option-ideas">{OPTION_IDEAS.map((o) => <option key={o} value={o} />)}</datalist>
      <button type="button" className="content-back" onClick={onCancel}><ArrowRight size={16} /> Back to products</button>

      <Section title={isNew ? 'New product' : product.name} intro="One product per scent works best. Put vessels, sizes and wicks in Options below.">
        <Text label="Name" value={form.name} onChange={set('name')} />
        <label className="form-field">
          <span className="form-field-title">Weight (lb)</span>
          <input className="form-input" type="number" min="0.01" step="0.01" required value={form.weight} onChange={(e) => set('weight')(e.target.value)} />
          <small className="content-hint">Used to work out shipping. Use the heaviest choice.</small>
        </label>
        <ScentNotes description={form.description} productId={product.id} onChange={set('description')} />
        <Text
          label="Description"
          rows={8}
          value={form.description}
          onChange={set('description')}
          hint='Leave a blank line to start a new paragraph. Lines starting "Mood:", "Scent Notes:" and "Burn Time:" feed the homepage mood finder.'
        />
        <label className="admin-switch">
          <input type="checkbox" checked={form.is_visible} onChange={(e) => set('is_visible')(e.target.checked)} />
          <span>Show in the shop</span>
        </label>
      </Section>

      <Section title="Categories" intro="Where the product appears in the Shop menu. Every product is in Shop All. Add new categories in Content → Categories.">
        <div className="content-checks">
          {(categories || []).map((c) => (
            <label key={c.id} className="content-default">
              <input type="checkbox" checked={c.id === SHOP_ALL || form.categories.includes(c.id)} disabled={c.id === SHOP_ALL} onChange={() => toggleCategory(c.id)} />
              <span>{c.name}{!c.is_visible && <small> (hidden)</small>}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Photos" intro="The first photo is the main one, used on product cards. You can also give each choice its own photo in the price list below.">
        {form.images.length === 0 && <Empty>No photos yet.</Empty>}
        <div className="content-photos">
          {form.images.map((src, i) => (
            <div key={src} className="content-photo">
              <img src={src} alt="" />
              <span>{i === 0 ? 'Main photo' : `Photo ${i + 1}`}</span>
              <div className="content-row-tools">
                {i > 0 && <button type="button" className="content-tool" onClick={() => set('images')([src, ...form.images.filter((x) => x !== src)])}>Make main</button>}
                <button type="button" className="content-tool is-danger" aria-label={`Remove photo ${i + 1}`} onClick={() => set('images')(form.images.filter((x) => x !== src))}><TrashIcon size={14} /></button>
              </div>
            </div>
          ))}
        </div>
        <ImageUpload label="Add photos" multiple onUploaded={(url) => setForm((f) => ({ ...f, images: [...f.images, url] }))} />
      </Section>

      <Section title="Options" intro="Choices the shopper picks, like Vessel (Tin, Glass jar), Size (4 oz, 8 oz) or Wick (Cotton, Wooden). Leave empty if the product comes one way only.">
        {options.length > 0 && (
          <ul className="content-options">
            {options.map((o, i) => (
              <OptionEditor
                key={i}
                option={o}
                onChange={(next) => setOptions((list) => list.map((x, n) => (n === i ? next : x)))}
                onRemove={() => setOptions((list) => list.filter((_, n) => n !== i))}
              />
            ))}
          </ul>
        )}
        {options.length < 4 && (
          <button type="button" className="content-tool" onClick={() => setOptions((list) => [...list, { name: OPTION_IDEAS.find((n) => !list.some((o) => o.name === n)) || '', values: [] }])}>
            <PlusIcon size={14} /> Add option
          </button>
        )}
        {!isNew && (product.options ?? []).length > 0 && options.map((o) => o.name).join() !== (product.options ?? []).map((o) => o.name).join() && (
          <p className="content-notice" role="note">You changed the option names, so this product's choices will be rebuilt when you save. Prices, SKUs and stock in the list below are kept.</p>
        )}
      </Section>

      <Section
        title={hasOptions ? `Prices and stock (${combos.length} combination${combos.length === 1 ? '' : 's'})` : 'Price and stock'}
        intro={hasOptions ? 'One row for each combination. Untick Sell to stop selling a combination without deleting it.' : undefined}
      >
        <label className="admin-switch">
          <input type="checkbox" checked={form.trackStock} onChange={(e) => set('trackStock')(e.target.checked)} />
          <span>Count stock (shows Sold out at 0). Untick for made-to-order items that never sell out.</span>
        </label>
        {hasOptions && combos.length > 1 && (
          <div className="content-fill">
            <span>Set every row:</span>
            <input className="form-input" type="number" min="0" step="0.01" placeholder="Price $" value={fill.price} onChange={(e) => setFill((f) => ({ ...f, price: e.target.value }))} />
            {form.trackStock && <input className="form-input" type="number" min="0" step="1" placeholder="Stock" value={fill.stock} onChange={(e) => setFill((f) => ({ ...f, stock: e.target.value }))} />}
            <button type="button" className="content-tool" disabled={fill.price === '' && fill.stock === ''} onClick={applyFill}>Apply</button>
          </div>
        )}
        {combos.length > MAX_COMBOS ? (
          <p className="form-message error" role="alert">{combos.length} combinations is too many for one product (the limit is {MAX_COMBOS}). Remove some choices, or split it into two products.</p>
        ) : (
          <ul className="content-sizes content-grid">
            {combos.map((values) => {
              const r = rowFor(values);
              const label = Object.values(values).join(' / ') || 'This product';
              return (
                <li key={keyOf(values) || 'single'}>
                  <div className="content-grid-name">
                    {hasOptions && (r.image_url ? <img src={r.image_url} alt="" /> : <span className="content-grid-noimg" aria-hidden="true" />)}
                    <strong>{label}</strong>
                    {r.inherited && <small className="content-badge" title="This row has no price of its own; it uses the product's base price. Type a price to set one.">Base price</small>}
                    {!r.id && !isNew && hasOptions && <small className="content-badge is-new">New</small>}
                  </div>
                  <label><span>Price ($)</span><input className="form-input" type="number" min="0" step="0.01" required value={r.price} onChange={(e) => patchRow(values, { price: e.target.value })} /></label>
                  <label><span>SKU</span><input className="form-input" placeholder="Made for you" value={r.sku} onChange={(e) => patchRow(values, { sku: e.target.value })} /></label>
                  {form.trackStock && (
                    <label><span>Stock</span><input className="form-input" type="number" min="0" step="1" required value={r.stock} onChange={(e) => patchRow(values, { stock: e.target.value })} /></label>
                  )}
                  {hasOptions && (
                    <div className="content-grid-photo">
                      <ImageUpload label={r.image_url ? 'Change photo' : 'Photo'} onUploaded={(url) => patchRow(values, { image_url: url })} />
                    </div>
                  )}
                  <label className="content-default">
                    <input type="checkbox" checked={r.onSale} onChange={(e) => patchRow(values, { onSale: e.target.checked })} />
                    <span>Sell</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        <small className="content-hint">Leave SKU empty and one is made for you.</small>
      </Section>

      <div className="admin-actions content-product-save">
        <button className="button button-primary button-small" type="submit" disabled={status?.type === 'pending'}>{status?.type === 'pending' ? 'Saving…' : isNew ? 'Add product' : 'Save product'}</button>
        <button type="button" className="link-button" onClick={onCancel}>Cancel</button>
        {status?.text && <p className={`form-message ${status.type}`} role="alert">{status.text}</p>}
      </div>
    </form>
    <ProductPreview
      name={form.name}
      description={form.description}
      images={form.images}
      options={options}
      rows={combos.map(rowFor)}
      visible={form.is_visible}
      categories={(categories || []).filter((c) => c.id !== SHOP_ALL && form.categories.includes(c.id)).map((c) => c.name)}
    />
    </div>
  );
}

export default function ProductManager({ setDirty, onPreview = () => {} }) {
  const { data: products, setData, error, setError, reload } = useAdminData(getAdminProducts);
  const { data: categories } = useAdminData(getCategories);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  const open = (product) => {
    setEditing(product);
    if (product.slug) onPreview(`/${product.slug}`);
  };

  const close = () => {
    setEditing(null);
    onPreview('/shop-all');
  };

  const toggle = async (p) => {
    setError('');
    try {
      await setProductVisible(p.id, !p.is_visible);
      setData((list) => list.map((x) => (x.id === p.id ? { ...x, is_visible: !p.is_visible } : x)));
      onPreview('/shop-all', true);
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Permanently delete ${p.name} from BigCommerce? It disappears from every storefront, including the live store. To take it off sale without deleting it, use Hide instead.`)) return;
    setError('');
    try {
      await deleteProduct(p.id);
      setData((list) => list.filter((x) => x.id !== p.id));
      onPreview('/shop-all', true);
    } catch (err) {
      setError(err.message);
    }
  };

  if (editing) {
    return (
      <ProductEditor
        key={editing.id ?? 'new'}
        product={editing}
        categories={categories}
        setDirty={setDirty}
        onCancel={close}
        onDone={(path) => {
          setEditing(null);
          reload();
          onPreview(path, true);
        }}
      />
    );
  }

  const q = query.trim().toLowerCase();
  const shown = (products || []).filter((p) => (!q || p.name.toLowerCase().includes(q)) && (category === 'all' || p.categories.includes(Number(category))));
  const basePriceCount = (products || []).reduce((n, p) => n + p.variants.filter((v) => v.inherited && p.options.length).length, 0);

  return (
    <Section title="Products" intro="Everything for sale: names, photos, options, prices and stock.">
      <p className="content-notice" role="note">Changes here save to BigCommerce straight away, so they also change the live store at pinktomatoco.com.</p>
      {basePriceCount > 0 && (
        <p className="content-notice" role="note">{basePriceCount} choice{basePriceCount === 1 ? '' : 's'} still use{basePriceCount === 1 ? 's' : ''} the product's base price instead of a price of {basePriceCount === 1 ? 'its' : 'their'} own. Open a product and look for the "Base price" tag to check them.</p>
      )}
      <div className="content-add">
        <input className="form-input" type="search" aria-label="Search products" placeholder="Search products" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="form-input form-select" aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {(categories || []).filter((c) => c.id !== SHOP_ALL).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button type="button" className="button button-primary button-small" onClick={() => open({})}><PlusIcon size={16} /> Add product</button>
      </div>
      <Problem>{error}</Problem>
      {!products && !error && <Loading />}
      {products && shown.length === 0 && <Empty>No products found.</Empty>}
      {shown.length > 0 && (
        <ul className="content-rows">
          {shown.map((p) => (
            <li key={p.id}>
              <img src={p.images?.[0]} alt="" />
              <div className="content-row-main">
                <strong>{p.name}</strong>
                <small>
                  {priceRange({ ...p, variants: p.product_variants })}
                  {p.options.length > 0 && ` · ${p.options.map((o) => `${o.values.length} ${o.name.toLowerCase()}${o.values.length === 1 ? '' : 's'}`).join(', ')}`}
                  {p.inventory_tracking === 'none' ? ' · Stock not counted' : ''}
                  {(() => { const names = (categories || []).filter((c) => c.id !== SHOP_ALL && p.categories.includes(c.id)).map((c) => c.name); return names.length ? ` · ${names.join(', ')}` : ' · No category yet'; })()}
                </small>
              </div>
              <div className="content-row-tools">
                <span className={`content-state ${p.is_visible ? 'is-on' : ''}`}>{p.is_visible ? 'Showing' : 'Hidden'}</span>
                <button type="button" className="content-tool" onClick={() => toggle(p)}>{p.is_visible ? 'Hide' : 'Show'}</button>
                <button type="button" className="content-tool" onClick={() => open(p)}><PencilIcon size={14} /> Edit</button>
                <button type="button" className="content-tool is-danger" onClick={() => remove(p)}><TrashIcon size={14} /> Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
