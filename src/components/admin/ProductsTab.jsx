import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminProducts, setProductVisible, setVariantPrices } from '../../lib/adminApi.js';
import { Loading, Panel, Problem, useAdminData } from './shared.jsx';

function ProductRow({ product, onSaved }) {
  const variants = [...product.product_variants].sort((a, b) => a.sort - b.sort);
  const [prices, setPrices] = useState({});
  const [status, setStatus] = useState(null);

  const value = (v) => prices[v.id] ?? Number(v.price).toFixed(2);
  const changes = variants
    .filter((v) => prices[v.id] !== undefined && Number(prices[v.id]) !== Number(v.price))
    .map((v) => ({ id: v.id, price: Number(prices[v.id]) }));
  const invalid = variants.some((v) => prices[v.id] !== undefined && !(prices[v.id] !== '' && Number(prices[v.id]) >= 0));

  const run = async (fn, done) => {
    setStatus({ type: 'pending' });
    try {
      await fn();
      setStatus(done ? { type: 'success', text: done } : null);
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  const save = (e) => {
    e.preventDefault();
    run(async () => {
      await setVariantPrices(changes);
      onSaved(product.id, {
        product_variants: product.product_variants.map((v) => {
          const c = changes.find((x) => x.id === v.id);
          return c ? { ...v, price: c.price } : v;
        }),
      });
      setPrices({});
    }, 'Prices saved.');
  };

  const toggle = () =>
    run(async () => {
      await setProductVisible(product.id, !product.is_visible);
      onSaved(product.id, { is_visible: !product.is_visible });
    });

  return (
    <form className={`admin-card admin-product ${product.is_visible ? '' : 'is-hidden'}`} onSubmit={save}>
      <div className="admin-product-head">
        <img src={product.images?.[0]} alt="" />
        <Link to={`/${product.slug}`} className="admin-product-name">{product.name}</Link>
        <label className="admin-switch">
          <input type="checkbox" checked={product.is_visible} disabled={status?.type === 'pending'} onChange={toggle} />
          <span>{product.is_visible ? 'On sale' : 'Hidden'}</span>
        </label>
      </div>
      <div className="admin-prices">
        {variants.map((v) => (
          <label key={v.id}>
            <span>{v.label}</span>
            <span className="admin-price-input">
              $<input
                type="number"
                min="0"
                step="0.01"
                required
                value={value(v)}
                onChange={(e) => setPrices((p) => ({ ...p, [v.id]: e.target.value }))}
              />
            </span>
          </label>
        ))}
      </div>
      {(changes.length > 0 || status?.text) && (
        <div className="admin-actions">
          {changes.length > 0 && (
            <button className="button button-primary button-small" type="submit" disabled={invalid || status?.type === 'pending'}>Save prices</button>
          )}
          {status?.text && <p className={`form-message ${status.type}`}>{status.text}</p>}
        </div>
      )}
    </form>
  );
}

export default function ProductsTab() {
  const { data: products, setData, error } = useAdminData(getAdminProducts);
  const update = (id, patch) => setData((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  return (
    <Panel title="Products" intro="Change prices or hide a product from the shop. Changes apply to new orders straight away.">
      <Problem>{error}</Problem>
      {!products && !error && <Loading />}
      <div className="admin-list">
        {products?.map((p) => <ProductRow key={p.id} product={p} onSaved={update} />)}
      </div>
    </Panel>
  );
}
