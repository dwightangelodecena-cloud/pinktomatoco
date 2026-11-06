import { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { CartIcon, CheckIcon, MinusIcon, PlusIcon } from './Icons.jsx';
import { bulkTierText, defaultVariant, money, sortedVariants, unitPrice } from '../lib/pricing.js';

// Size select, bulk pricing, quantity and Add To Cart (used on the product page and in Quick View).
export default function ProductOptions({ product, onPriceChange, onAdded }) {
  const { add } = useCart();
  const variants = sortedVariants(product);
  const [variantId, setVariantId] = useState(defaultVariant(product)?.id ?? '');
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);
  const variant = variants.find((v) => v.id === Number(variantId)) || null;

  const changeVariant = (id) => {
    setVariantId(id);
    setError('');
    const v = variants.find((x) => x.id === Number(id));
    onPriceChange?.(v ? Number(v.price) : null, v);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!variant) {
      setError('Please choose a ' + (product.option_name || 'Size').toLowerCase() + '.');
      return;
    }
    add(product, variant, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
    onAdded?.();
  };

  const tiers = product.bulk_pricing || [];
  const lineUnit = variant ? unitPrice(variant.price, tiers, qty) : null;

  return (
    <form className="product-options" onSubmit={submit}>
      {variants.length > 0 && (
        <label className="form-field">
          <span className="form-field-title">
            {product.option_name || 'Size'} <span className="required-text">Required</span>
          </span>
          <span className="form-select-wrapper">
            <select className="form-input form-select" value={variantId} onChange={(e) => changeVariant(e.target.value)}>
              <option value="">Pick one</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
          </span>
        </label>
      )}

      {tiers.length > 0 && (
        <div className="form-field bulk-pricing">
          <div className="form-field-title">Bulk Pricing</div>
          <ul>
            {tiers.map((t) => <li key={t.min}>{bulkTierText(t)}</li>)}
          </ul>
        </div>
      )}

      <div className="form-submit-container">
        <div className="form-field">
          <span className="form-field-title">Quantity</span>
          <div className="quantity-control-wrap">
            <button type="button" className="quantity-control" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}><MinusIcon /></button>
            <input
              className="form-input quantity-input"
              type="number"
              min="1"
              aria-label="Quantity"
              value={qty}
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
            <button type="button" className="quantity-control" aria-label="Increase quantity" onClick={() => setQty((q) => q + 1)}><PlusIcon /></button>
          </div>
        </div>
        <button className={`button button-primary add-to-cart ${added ? 'is-added' : ''}`} type="submit">
          <span className="add-label"><CartIcon size={18} /> Add To Cart</span>
          <span className="added-label" aria-hidden={!added}><CheckIcon /> Added</span>
        </button>
      </div>
      {variant && lineUnit !== Number(variant.price) && (
        <p className="bulk-note">Bulk price applied: {money(lineUnit)} each</p>
      )}
      {error && <p className="form-message error shake">{error}</p>}
    </form>
  );
}
