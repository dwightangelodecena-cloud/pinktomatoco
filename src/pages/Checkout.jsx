import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { startCheckout } from '../lib/api.js';

// Shoppers pay on BigCommerce's secure checkout, so this page sends the cart there.
export default function Checkout() {
  const { items, rememberCheckout } = useCart();
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current || items.length === 0) return;
    started.current = true;
    startCheckout(items)
      .then(({ cartId, url }) => {
        rememberCheckout(cartId);
        window.location.assign(url);
      })
      .catch((err) => setError(err.message));
  }, [items, rememberCheckout]);

  if (items.length === 0) {
    return (
      <div className="container page page-narrow">
        <h1 className="page-heading">Checkout</h1>
        <p>Your cart is empty. <Link to="/shop-all">Continue shopping</Link>.</p>
      </div>
    );
  }

  return (
    <div className="container page page-narrow">
      <h1 className="page-heading">Checkout</h1>
      {error ? (
        <>
          <p className="form-message error" role="alert">{error}</p>
          <Link to="/cart" className="button button-primary">Back to cart</Link>
        </>
      ) : (
        <p role="status">Taking you to secure checkout…</p>
      )}
    </div>
  );
}
