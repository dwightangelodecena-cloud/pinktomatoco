import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { isCartActive } from '../lib/api.js';
import { load, save } from '../lib/storage.js';

const CartContext = createContext(null);
const OLD_SHARED_KEY = 'ptc-cart-bc';

// Guests have one cart and each customer has their own, so a customer's cart only shows while they're signed in.
const GUEST = 'guest';
const cartKey = (owner) => `ptc-cart:${owner}`;
const checkoutKey = (owner) => `ptc-checkout-cart:${owner}`;

function mergeItems(items, extra) {
  const merged = items.map((i) => ({ ...i }));
  for (const item of extra) {
    const same = merged.find((i) => i.variantId === item.variantId);
    if (same) same.quantity += item.quantity;
    else merged.push(item);
  }
  return merged;
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const owner = user?.isCustomer ? user.id : GUEST;
  const [cart, setCart] = useState({ owner: null, items: [] });
  const [previewOpen, setPreviewOpen] = useState(false);

  const items = cart.owner === owner ? cart.items : [];
  const setItems = useCallback((update) => setCart((c) => ({ ...c, items: update(c.items) })), []);

  useEffect(() => {
    try {
      localStorage.removeItem(OLD_SHARED_KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    let saved = load(cartKey(owner), []);
    if (owner !== GUEST) {
      const guestItems = load(cartKey(GUEST), []);
      if (guestItems.length) {
        saved = mergeItems(saved, guestItems);
        save(cartKey(GUEST), []);
      }
    }
    setCart({ owner, items: saved });
  }, [owner]);

  useEffect(() => {
    if (cart.owner) save(cartKey(cart.owner), cart.items);
  }, [cart]);

  const rememberCheckout = useCallback((cartId) => save(checkoutKey(owner), cartId), [owner]);

  // A customer who finished paying on BigCommerce comes back to an empty cart.
  useEffect(() => {
    const cartId = load(checkoutKey(owner), null);
    if (!cartId) return;
    isCartActive(cartId)
      .then((active) => {
        if (active) return;
        save(checkoutKey(owner), null);
        setItems(() => []);
      })
      .catch(() => {});
  }, [owner, setItems]);

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
