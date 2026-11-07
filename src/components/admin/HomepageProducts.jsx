import { useEffect, useState } from 'react';
import { getAdminProducts, setHomepageProducts } from '../../lib/adminApi.js';
import { HOME_PRODUCT_LIMIT } from '../../lib/api.js';
import { TrashIcon } from '../Icons.jsx';
import { OrderButtons } from './ContentFields.jsx';
import { Loading, Problem, useAdminData } from './shared.jsx';

const startingIds = (products) =>
  products.filter((p) => p.is_new).sort((a, b) => (a.new_rank ?? 99) - (b.new_rank ?? 99)).map((p) => p.id);

export default function HomepageProducts({ onSaved }) {
  const { data: products, error } = useAdminData(getAdminProducts);
  const [ids, setIds] = useState(null);
  const [saved, setSaved] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!products) return;
    const start = startingIds(products);
    setIds(start);
    setSaved(start);
  }, [products]);

  if (error) return <Problem>{error}</Problem>;
  if (!ids) return <Loading />;

  const byId = new Map(products.map((p) => [p.id, p]));
  const available = products.filter((p) => p.is_visible && !ids.includes(p.id));
  const changed = ids.join() !== saved.join();

  const reorder = (from, to) => {
    const next = [...ids];
    next.splice(to, 0, next.splice(from, 1)[0]);
    setIds(next);
    setStatus(null);
  };

  const save = async () => {
    setStatus({ type: 'pending' });
    try {
      await setHomepageProducts(ids);
      setSaved(ids);
      setStatus({ type: 'success', text: 'Homepage products saved.' });
      onSaved();
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="content-featured">
      <ul className="content-rows">
        {ids.map((id, i) => {
          const p = byId.get(id);
          return (
            <li key={id}>
              <OrderButtons index={i} count={ids.length} label={p.name} onMove={reorder} />
              <img src={p.images?.[0]} alt="" />
              <div className="content-row-main">
                <strong>{p.name}</strong>
                {!p.is_visible && <small>Hidden from the shop, so it won't show</small>}
              </div>
              <div className="content-row-tools">
                <button type="button" className="content-tool is-danger" onClick={() => { setIds(ids.filter((x) => x !== id)); setStatus(null); }}><TrashIcon size={14} /> Remove</button>
              </div>
            </li>
          );
        })}
      </ul>
      {ids.length < HOME_PRODUCT_LIMIT && available.length > 0 && (
        <label className="form-field">
          <span className="form-field-title">Add a product</span>
          <select className="form-input form-select" value="" onChange={(e) => { setIds([...ids, Number(e.target.value)]); setStatus(null); }}>
            <option value="">Choose a product</option>
            {available.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      )}
      <div className="admin-actions">
        {changed && <button type="button" className="button button-primary button-small" disabled={status?.type === 'pending'} onClick={save}>Save homepage products</button>}
        {status?.text && <p className={`form-message ${status.type}`}>{status.text}</p>}
      </div>
    </div>
  );
}
