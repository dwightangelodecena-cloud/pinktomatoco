import { useEffect, useState } from 'react';
import { deleteProduct, getAdminProducts, saveProduct, setProductVisible } from '../../lib/adminApi.js';
import { priceRange } from '../../lib/pricing.js';
import { descriptionToText, textToDescription } from '../../lib/productText.js';
import { ArrowRight, PencilIcon, PlusIcon, TrashIcon } from '../Icons.jsx';
import { ImageUpload, OrderButtons, Section, Text } from './ContentFields.jsx';
import { Empty, Loading, Problem, useAdminData } from './shared.jsx';

// Product pages live at the top of the site, so these names belong to other pages.
const RESERVED = ['admin', 'blog', 'cart', 'categories', 'checkout', 'contact-us', 'login', 'search', 'shipping-returns', 'shop-all', 'sitemap', 'wishlist'];
const slugify = (name) => name.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

let nextRowId = 1;
const sizeRow = (v = {}) => ({
  row: nextRowId++,
  id: v.id ?? null,
  label: v.label ?? '',
  price: v.price != null ? Number(v.price).toFixed(2) : '',
  sku: v.sku ?? '',
  is_default: Boolean(v.is_default),
});

function ProductEditor({ product, onDone, onCancel, setDirty }) {
  const isNew = !product.id;
  const startText = descriptionToText(product.description_html);
  const [form, setForm] = useState({
    name: product.name ?? '',
    sku: product.sku ?? '',
    description: startText,
    images: product.images ?? [],
    option_name: product.option_name ?? 'Size',
    is_visible: product.is_visible ?? true,
  });
  const [sizes, setSizes] = useState(() => {
    const rows = [...(product.product_variants ?? [])].sort((a, b) => a.sort - b.sort).map(sizeRow);
    return rows.length ? rows : [sizeRow({ is_default: true })];
  });
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setDirty(true);
    return () => setDirty(false);
  }, [setDirty]);

  const set = (k) => (value) => setForm((f) => ({ ...f, [k]: value }));
  const patchSize = (row, change) => setSizes((list) => list.map((s) => (s.row === row ? { ...s, ...change } : s)));
  const moveSize = (from, to) => setSizes((list) => {
    const next = [...list];
    next.splice(to, 0, next.splice(from, 1)[0]);
    return next;
  });
  const removeSize = (row) => setSizes((list) => {
    const next = list.filter((s) => s.row !== row);
    return next.some((s) => s.is_default) || !next.length ? next : next.map((s, i) => ({ ...s, is_default: i === 0 }));
  });

  const submit = async (e) => {
    e.preventDefault();
    const slug = product.slug ?? slugify(form.name);
    if (!slug || (isNew && RESERVED.includes(slug))) return setStatus({ type: 'error', text: 'That name clashes with a page on the site. Try a different one.' });
    if (!sizes.length) return setStatus({ type: 'error', text: 'Add at least one size.' });

    setStatus({ type: 'pending' });
    try {
      await saveProduct(
        {
          id: product.id ?? null,
          slug,
          name: form.name.trim(),
          sku: form.sku.trim(),
          // An unchanged description keeps its original formatting.
          description_html: form.description === startText ? product.description_html ?? '' : textToDescription(form.description),
          images: form.images,
          option_name: form.option_name.trim() || 'Size',
          is_visible: form.is_visible,
        },
        sizes.map((s) => ({ id: s.id, label: s.label.trim(), price: Number(s.price), sku: s.sku.trim(), is_default: s.is_default }))
      );
      setDirty(false);
      onDone(`/${slug}`);
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  return (
    <form className="content-product-form" onSubmit={submit}>
      <button type="button" className="content-back" onClick={onCancel}><ArrowRight size={16} /> Back to products</button>

      <Section title={isNew ? 'New product' : product.name}>
        <Text label="Name" value={form.name} onChange={set('name')} />
        <Text label="SKU" value={form.sku} onChange={set('sku')} />
        <Text
          label="Description"
          rows={9}
          value={form.description}
          onChange={set('description')}
          hint='Leave a blank line to start a new paragraph. Lines starting "Mood:", "Scent Notes:" and "Burn Time:" feed the homepage mood finder.'
        />
        <label className="admin-switch">
          <input type="checkbox" checked={form.is_visible} onChange={(e) => set('is_visible')(e.target.checked)} />
          <span>Show in the shop</span>
        </label>
      </Section>

      <Section title="Photos" intro="The first photo is the main one, used on product cards.">
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

      <Section title="Sizes and prices" intro="The default is picked for shoppers when they open the product.">
        <Text label="Option name" value={form.option_name} onChange={set('option_name')} />
        <ul className="content-sizes">
          {sizes.map((s, i) => (
            <li key={s.row}>
              <OrderButtons index={i} count={sizes.length} label={s.label || `size ${i + 1}`} onMove={moveSize} />
              <label><span>Size</span><input className="form-input" required value={s.label} onChange={(e) => patchSize(s.row, { label: e.target.value })} /></label>
              <label><span>Price ($)</span><input className="form-input" type="number" min="0" step="0.01" required value={s.price} onChange={(e) => patchSize(s.row, { price: e.target.value })} /></label>
              <label><span>SKU</span><input className="form-input" value={s.sku} onChange={(e) => patchSize(s.row, { sku: e.target.value })} /></label>
              <label className="content-default">
                <input type="radio" name="default-size" checked={s.is_default} onChange={() => setSizes((list) => list.map((x) => ({ ...x, is_default: x.row === s.row })))} />
                <span>Default</span>
              </label>
              <button type="button" className="content-tool is-danger" aria-label={`Remove ${s.label || 'size'}`} onClick={() => removeSize(s.row)}><TrashIcon size={14} /></button>
            </li>
          ))}
        </ul>
        <button type="button" className="content-tool" onClick={() => setSizes((list) => [...list, sizeRow({ is_default: list.length === 0 })])}><PlusIcon size={14} /> Add size</button>
      </Section>

      <div className="admin-actions content-product-save">
        <button className="button button-primary button-small" type="submit" disabled={status?.type === 'pending'}>{isNew ? 'Add product' : 'Save product'}</button>
        <button type="button" className="link-button" onClick={onCancel}>Cancel</button>
        {status?.text && <p className={`form-message ${status.type}`} role="alert">{status.text}</p>}
      </div>
    </form>
  );
}

export default function ProductManager({ setDirty, onPreview }) {
  const { data: products, setData, error, setError, reload } = useAdminData(getAdminProducts);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');

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
    if (!window.confirm(`Delete ${p.name}? This can't be undone, and its reviews are deleted too.`)) return;
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
  const shown = (products || []).filter((p) => !q || p.name.toLowerCase().includes(q));

  return (
    <Section title="Products" intro="Everything for sale. Changes here go live as soon as you save them.">
      <div className="content-add">
        <input className="form-input" type="search" aria-label="Search products" placeholder="Search products" value={query} onChange={(e) => setQuery(e.target.value)} />
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
                <small>{priceRange({ ...p, variants: p.product_variants })}{p.is_new ? ' · On homepage' : ''}</small>
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
