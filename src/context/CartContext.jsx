import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isCartActive } from '../lib/api.js';
import { load, save } from '../lib/storage.js';

const CartContext = createContext(null);
// Size ids changed when the shop moved to BigCommerce, so carts saved before that are not reused.
const KEY = 'ptc-cart-bc';
const CHECKOUT_KEY = 'ptc-checkout-cart';

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => load(KEY, []));
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => save(KEY, items), [items]);

  const rememberCheckout = useCallback((cartId) => save(CHECKOUT_KEY, cartId), []);

  // A shopper who finished paying on BigCommerce comes back to an empty cart.
  useEffect(() => {
    const cartId = load(CHECKOUT_KEY, null);
    if (!cartId) return;
    isCartActive(cartId)
      .then((active) => {
        if (active) return;
        save(CHECKOUT_KEY, null);
        setItems([]);
      })
      .catch(() => {});
  }, []);

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
      clear: () => setItems([]),
    };
  }, [items, previewOpen, rememberCheckout]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
