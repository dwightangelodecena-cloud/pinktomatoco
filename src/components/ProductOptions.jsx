import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { CartIcon, CheckIcon, MinusIcon, PlusIcon } from './Icons.jsx';
import { defaultVariant, isAvailable, sortedVariants } from '../lib/pricing.js';

// Size select, quantity and Add To Cart (used on the product page and in Quick View).
export default function ProductOptions({ product, onPriceChange, onAdded, formId }) {
  const { add } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const variants = sortedVariants(product);
  const [variantId, setVariantId] = useState(defaultVariant(product)?.id ?? '');
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);
  const variant = variants.find((v) => v.id === Number(variantId)) || null;
  const soldOut = variants.length > 0 && !variants.some(isAvailable);

  const changeVariant = (id) => {
    setVariantId(id);
    setError('');
    const v = variants.find((x) => x.id === Number(id));
    onPriceChange?.(v ? Number(v.price) : null, v);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/${product.slug}`)}`);
      return;
    }
    if (!user.isCustomer) {
      setError('The admin account can\'t shop. Log out and sign in with a customer account.');
      return;
    }
    if (!variant) {
      setError('Please choose a ' + (product.option_name || 'Size').toLowerCase() + '.');
      return;
    }
    if (!isAvailable(variant)) {
      setError('Sorry, this one has sold out.');
      return;
    }
    if (variant.stock != null && qty > variant.stock) {
      setError(`Only ${variant.stock} left in stock.`);
      return;
    }
    add(product, variant, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
    onAdded?.();
  };

  return (
    <form className="product-options" onSubmit={submit} id={formId}>
      {variants.length > 0 && (
        <label className="form-field">
          <span className="form-field-title">
            {product.option_name || 'Size'} <span className="required-text">Required</span>
          </span>
          <span className="form-select-wrapper">
            <select className="form-input form-select" value={variantId} onChange={(e) => changeVariant(e.target.value)}>
              <option value="">Pick one</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id} disabled={!isAvailable(v)}>{v.label}{isAvailable(v) ? '' : ' (Sold out)'}</option>
              ))}
            </select>
          </span>
        </label>
      )}

      <div className="form-submit-container">
        <div className="form-field">
          <span className="form-field-title">Quantity</span>
          <div className="quantity-control-wrap">
            <button type="button" className="quantity-control" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}><MinusIcon /></button>
            <input
              className="form-input quantity-input"
              type="number"
              inputMode="numeric"
              min="1"
              aria-label="Quantity"
              value={qty}
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
            <button type="button" className="quantity-control" aria-label="Increase quantity" onClick={() => setQty((q) => q + 1)}><PlusIcon /></button>
          </div>
        </div>
        <button className={`button button-primary add-to-cart ${added ? 'is-added' : ''}`} type="submit" disabled={soldOut}>
          <span className="add-label"><CartIcon size={18} /> {soldOut ? 'Sold Out' : 'Add To Cart'}</span>
          <span className="added-label" aria-hidden={!added}><CheckIcon /> Added</span>
        </button>
      </div>
      {error && <p className="form-message error shake">{error}</p>}
    </form>
  );
}
