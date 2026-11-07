import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { money } from '../lib/pricing.js';
import { CloseIcon } from './Icons.jsx';

export default function CartPreview() {
  const { items, subtotal, previewOpen, closePreview, remove } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (e) => e.key === 'Escape' && closePreview();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewOpen, closePreview]);

  return (
    <>
      <div className={`drawer-overlay ${previewOpen ? 'is-open' : ''}`} onClick={closePreview} />
      <aside className={`cart-preview ${previewOpen ? 'is-open' : ''}`} aria-hidden={!previewOpen} aria-label="Your Cart">
        <div className="cart-preview-header">
          <h2 className="cart-preview-title">Your Cart</h2>
          <button className="icon-button" onClick={closePreview} aria-label="Close cart"><CloseIcon /></button>
        </div>

        {items.length === 0 ? (
          user ? (
            <p className="cart-preview-empty">Your cart is empty</p>
          ) : (
            <p className="cart-preview-empty"><Link to="/login" onClick={closePreview}>Sign in or create an account</Link> to start your cart.</p>
          )
        ) : (
          <>
            <ul className="cart-preview-items">
              {items.map((i) => (
                <li key={i.variantId} className="cart-preview-item">
                  <Link to={`/${i.slug}`} onClick={closePreview}>
                    <img src={i.image} alt={i.name} />
                  </Link>
                  <div>
                    <Link to={`/${i.slug}`} onClick={closePreview} className="cart-preview-item-name">{i.name}</Link>
                    <div className="cart-preview-item-meta">{i.optionName}: {i.optionLabel}</div>
                    <div className="cart-preview-item-meta">{i.quantity} × {money(i.unit)}</div>
                    <button className="link-button" onClick={() => remove(i.variantId)}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="cart-preview-footer">
              <div className="cart-preview-subtotal">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <Link to="/cart" className="button button-secondary" onClick={closePreview}>View Cart</Link>
              <Link to="/checkout" className="button button-primary" onClick={closePreview}>Check Out</Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
