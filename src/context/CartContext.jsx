import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { isCartActive } from '../lib/api.js';
import { load, save } from '../lib/storage.js';

const CartContext = createContext(null);
const OLD_SHARED_KEY = 'ptc-cart-bc';

// Each customer has their own cart, so it only ever shows while they're signed in.
const cartKey = (customerId) => `ptc-cart:${customerId}`;
const checkoutKey = (customerId) => `ptc-checkout-cart:${customerId}`;

export function CartProvider({ children }) {
  const { user } = useAuth();
  const customerId = user?.isCustomer ? user.id : null;
  const [cart, setCart] = useState({ owner: null, items: [] });
  const [previewOpen, setPreviewOpen] = useState(false);

  const items = cart.owner === customerId ? cart.items : [];
  const setItems = useCallback((update) => setCart((c) => ({ ...c, items: update(c.items) })), []);

  useEffect(() => {
    try {
      localStorage.removeItem(OLD_SHARED_KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    setCart({ owner: customerId, items: customerId ? load(cartKey(customerId), []) : [] });
    setPreviewOpen(false);
  }, [customerId]);

  useEffect(() => {
    if (cart.owner) save(cartKey(cart.owner), cart.items);
  }, [cart]);

  const rememberCheckout = useCallback((cartId) => {
    if (customerId) save(checkoutKey(customerId), cartId);
  }, [customerId]);

  // A customer who finished paying on BigCommerce comes back to an empty cart.
  useEffect(() => {
    if (!customerId) return;
    const cartId = load(checkoutKey(customerId), null);
    if (!cartId) return;
    isCartActive(cartId)
      .then((active) => {
        if (active) return;
        save(checkoutKey(customerId), null);
        setItems(() => []);
      })
      .catch(() => {});
  }, [customerId, setItems]);

  const value = useMemo(() => {
    const lines = items.map((i) => {
      const unit = Number(i.basePrice);
      return { ...i, unit, total: unit * i.quantity };
    });
    return {
      items: lines,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: lines.reduce((n, i) => n + i.total, 0),
      previewOpen,
      rememberCheckout,
      openPreview: () => setPreviewOpen(true),
      closePreview: () => setPreviewOpen(false),
      add(product, variant, quantity) {
        setItems((prev) => {
          const existing = prev.find((i) => i.variantId === variant.id);
          if (existing) {
            return prev.map((i) =>
              i.variantId === variant.id ? { ...i, quantity: i.quantity + quantity } : i
            );
          }
          return [
            ...prev,
            {
              productId: product.id,
              variantId: variant.id,
              slug: product.slug,
              name: product.name,
              image: product.images?.[0],
              optionName: product.option_name || 'Size',
              optionLabel: variant.label,
              basePrice: Number(variant.price),
              quantity,
            },
          ];
        });
        setPreviewOpen(true);
      },
      setQuantity(variantId, quantity) {
        setItems((prev) =>
          quantity < 1
            ? prev.filter((i) => i.variantId !== variantId)
            : prev.map((i) => (i.variantId === variantId ? { ...i, quantity } : i))
        );
      },
      remove: (variantId) => setItems((prev) => prev.filter((i) => i.variantId !== variantId)),
      clear: () => setItems(() => []),
    };
  }, [items, previewOpen, rememberCheckout, setItems]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
