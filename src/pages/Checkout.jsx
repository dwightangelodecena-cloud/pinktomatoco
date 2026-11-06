import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { createOrder } from '../lib/api.js';
import { money } from '../lib/pricing.js';

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const [form, setForm] = useState({
    email: user?.email || '',
    fullName: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
    phone: '',
  });
  const [status, setStatus] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (status?.type === 'success') {
    return (
      <div className="container page page-narrow">
        <h1 className="page-heading">Thank you for your order!</h1>
        <p>Your order number is <strong>#{status.orderId}</strong>. We'll email you at {status.email} with payment and shipping details.</p>
        <Link to="/shop-all" className="button button-primary">Continue Shopping</Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container page page-narrow">
        <h1 className="page-heading">Checkout</h1>
        <p>Your cart is empty. <Link to="/shop-all">Continue shopping</Link>.</p>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ type: 'pending' });
    try {
      const { email, fullName, ...address } = form;
      const orderId = await createOrder({ email, fullName, address, items });
      clear();
      setStatus({ type: 'success', orderId, email });
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="container page">
      <h1 className="page-heading">Checkout</h1>
      <div className="checkout-layout">
        <form className="form" onSubmit={submit}>
          <h2 className="account-sub-heading">Customer</h2>
          <F label="Email Address" type="email" value={form.email} onChange={set('email')} required />
          <h2 className="account-sub-heading">Shipping Address</h2>
          <F label="Full Name" value={form.fullName} onChange={set('fullName')} required />
          <F label="Address" value={form.line1} onChange={set('line1')} required />
          <F label="Apartment/Suite/Building" value={form.line2} onChange={set('line2')} />
          <div className="form-row">
            <F label="City" value={form.city} onChange={set('city')} required />
            <F label="State/Province" value={form.state} onChange={set('state')} required />
          </div>
          <div className="form-row">
            <F label="Postal Code" value={form.zip} onChange={set('zip')} required />
            <F label="Country" value={form.country} onChange={set('country')} required />
          </div>
          <F label="Phone Number" type="tel" value={form.phone} onChange={set('phone')} />
          {status?.type === 'error' && <p className="form-message error">{status.text}</p>}
          <button className="button button-primary" type="submit" disabled={status?.type === 'pending'}>Place Order</button>
        </form>

        <aside className="order-summary">
          <h2 className="account-sub-heading">Order Summary</h2>
          <ul>
            {items.map((i) => (
              <li key={i.variantId}>
                <span>{i.quantity} × {i.name} <small>({i.optionLabel})</small></span>
                <span>{money(i.total)}</span>
              </li>
            ))}
          </ul>
          <div className="cart-total-row cart-grand-total"><span>Subtotal</span><span>{money(subtotal)}</span></div>
        </aside>
      </div>
    </div>
  );
}

function F({ label, required, type = 'text', value, onChange }) {
  return (
    <label className="form-field">
      <span className="form-field-title">{label} {required && <span className="required-text">Required</span>}</span>
      <input className="form-input" type={type} required={required} value={value} onChange={onChange} />
    </label>
  );
}
