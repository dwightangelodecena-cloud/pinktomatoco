import { useState } from 'react';
import { STORE_URL, deleteCategory, getAdminProducts, getCategories, saveCategory } from '../lib/adminApi.js';
import { ArrowRight, PencilIcon, PlusIcon, TrashIcon } from '../Icons.jsx';
import { ImageUpload, Section, Text } from './ContentFields.jsx';
import { Empty, Loading, Problem, useAdminData } from './shared.jsx';

function CategoryEditor({ category, onDone, onCancel }) {
  const [form, setForm] = useState({
    id: category.id ?? null,
    name: category.name ?? '',
    description: category.description ?? '',
    image_url: category.image_url ?? '',
    is_visible: category.is_visible ?? true,
    sort_order: category.sort_order ?? 0,
  });
  const [status, setStatus] = useState(null);
  const set = (k) => (value) => setForm((f) => ({ ...f, [k]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ type: 'pending' });
    try {
      await saveCategory(form);
      onDone();
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  return (
    <form className="content-product-form" onSubmit={submit}>
      <button type="button" className="content-back" onClick={onCancel}><ArrowRight size={16} /> Back to categories</button>
      <Section title={category.id ? category.name : 'New category'} intro="Products are added to a category from each product's page (Products → Edit → Categories).">
        <Text label="Name" value={form.name} onChange={set('name')} hint="Shown in the Shop menu, e.g. Candles, Wax Melts, Bath & Body." />
        <Text label="Description (optional)" rows={3} value={form.description} onChange={set('description')} />
        <label className="form-field">
          <span className="form-field-title">Menu order</span>
          <input className="form-input" type="number" step="1" value={form.sort_order} onChange={(e) => set('sort_order')(e.target.value)} />
          <small className="content-hint">Lower numbers come first in the Shop menu.</small>
        </label>
        <div className="form-field">
          <span className="form-field-title">Photo (optional)</span>
          {form.image_url && <img className="content-category-photo" src={form.image_url} alt="" />}
          <ImageUpload label={form.image_url ? 'Replace photo' : 'Upload photo'} keep onUploaded={set('image_url')} />
        </div>
        <label className="admin-switch">
          <input type="checkbox" checked={form.is_visible} onChange={(e) => set('is_visible')(e.target.checked)} />
          <span>Show in the shop menu</span>
        </label>
      </Section>
      <div className="admin-actions content-product-save">
        <button className="button button-primary button-small" type="submit" disabled={status?.type === 'pending'}>{status?.type === 'pending' ? 'Saving…' : category.id ? 'Save category' : 'Add category'}</button>
        <button type="button" className="link-button" onClick={onCancel}>Cancel</button>
        {status?.text && <p className={`form-message ${status.type}`} role="alert">{status.text}</p>}
      </div>
    </form>
  );
}

export default function CategoryManager() {
  const { data: categories, error, setError, reload } = useAdminData(getCategories);
  const { data: products } = useAdminData(getAdminProducts);
  const [editing, setEditing] = useState(null);

  const countIn = (id) => (products || []).filter((p) => p.categories.includes(id)).length;

  const remove = async (c) => {
    if (!window.confirm(`Delete the category "${c.name}"? Its products are NOT deleted; they just leave this category.`)) return;
    setError('');
    try {
      await deleteCategory(c.id);
      reload();
    } catch (err) {
      setError(err.message);
    }
  };

  if (editing) {
    return <CategoryEditor category={editing} onCancel={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} />;
  }

  return (
    <Section title="Categories" intro="The groups in the Shop menu. A product can be in several categories, for example Candles and Gifts.">
      <p className="content-notice" role="note">Tip: make categories for the kind of product (Candles, Wax Melts, Bath & Body). Put vessel, size and wick inside each product as Options, not as categories.</p>
      <div className="content-add">
        <span />
        <button type="button" className="button button-primary button-small" onClick={() => setEditing({})}><PlusIcon size={16} /> Add category</button>
      </div>
      <Problem>{error}</Problem>
      {!categories && !error && <Loading />}
      {categories && categories.length === 0 && <Empty>No categories yet.</Empty>}
      {categories?.length > 0 && (
        <ul className="content-rows">
          {categories.map((c) => (
            <li key={c.id}>
              {c.image_url ? <img src={c.image_url} alt="" /> : <span className="content-grid-noimg" aria-hidden="true" />}
              <div className="content-row-main">
                <strong>{c.name}</strong>
                <small>{products ? `${countIn(c.id)} product${countIn(c.id) === 1 ? '' : 's'}` : '…'}{c.locked ? ' · Holds every product' : ''}</small>
              </div>
              <div className="content-row-tools">
                <span className={`content-state ${c.is_visible ? 'is-on' : ''}`}>{c.is_visible ? 'Showing' : 'Hidden'}</span>
                {c.url && <a className="content-tool" href={STORE_URL + c.url} target="_blank" rel="noreferrer">View</a>}
                <button type="button" className="content-tool" onClick={() => setEditing(c)}><PencilIcon size={14} /> Edit</button>
                {!c.locked && <button type="button" className="content-tool is-danger" onClick={() => remove(c)}><TrashIcon size={14} /> Delete</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
