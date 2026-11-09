import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { money } from '../lib/pricing.js';
import { MinusIcon, PlusIcon } from '../components/Icons.jsx';

export default function Cart() {
  const { items, subtotal, setQuantity, remove } = useCart();

  return (
    <div className="container page">
      <h1 className="page-heading">Your Cart ({items.reduce((n, i) => n + i.quantity, 0)} items)</h1>

      {items.length === 0 ? (
        <p className="cart-empty">Your cart is empty. <Link to="/shop-all">Continue shopping</Link>.</p>
      ) : (
        <>
          <table className="cart-table">
            <thead>
              <tr><th>Item</th><th>Price</th><th>Quantity</th><th>Total</th><th><span className="sr-only">Remove</span></th></tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.variantId}>
                  <td className="cart-item">
                    <Link to={`/${i.slug}`}><img src={i.image} alt="" /></Link>
                    <div>
                      <Link to={`/${i.slug}`} className="cart-item-name">{i.name}</Link>
                      <div className="cart-item-meta">{i.optionName}: {i.optionLabel}</div>
                    </div>
                  </td>
                  <td data-label="Price">
                    {money(i.unit)}
                    {i.unit !== i.basePrice && <div className="was-price">{money(i.basePrice)}</div>}
                  </td>
                  <td data-label="Quantity">
                    <div className="quantity-control-wrap">
                      <button type="button" className="quantity-control" aria-label="Decrease" onClick={() => setQuantity(i.variantId, i.quantity - 1)}><MinusIcon /></button>
                      <input
                        className="form-input quantity-input"
                        type="number"
                        inputMode="numeric"
                        min="1"
                        aria-label="Quantity"
                        value={i.quantity}
                        onChange={(e) => setQuantity(i.variantId, Math.max(1, parseInt(e.target.value, 10) || 1))}
                      />
                      <button type="button" className="quantity-control" aria-label="Increase" onClick={() => setQuantity(i.variantId, i.quantity + 1)}><PlusIcon /></button>
                    </div>
                  </td>
                  <td data-label="Total">{money(i.total)}</td>
                  <td><button className="link-button" onClick={() => remove(i.variantId)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="cart-totals">
            <div className="cart-total-row"><span>Subtotal:</span><span>{money(subtotal)}</span></div>
            <div className="cart-total-row cart-grand-total"><span>Grand total:</span><span>{money(subtotal)}</span></div>
            <p className="cart-note">Shipping and taxes are calculated at checkout.</p>
            <Link to="/checkout" className="button button-primary">Check Out</Link>
          </div>
        </>
      )}
    </div>
  );
}
