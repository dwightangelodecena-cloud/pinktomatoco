import { createContext, useContext, useEffect, useState } from 'react';
import { load, save } from '../lib/storage.js';

const WishlistContext = createContext(null);
const KEY = 'ptc-wishlist';

export function WishlistProvider({ children }) {
  const [ids, setIds] = useState(() => load(KEY, []));
  useEffect(() => save(KEY, ids), [ids]);

  const value = {
    ids,
    has: (id) => ids.includes(id),
    toggle: (id) => setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
  };
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => useContext(WishlistContext);
