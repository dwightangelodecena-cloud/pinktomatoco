import { useEffect, useState } from 'react';
import { getProducts } from './api.js';

export function useProducts() {
  const [products, setProducts] = useState(null);
  useEffect(() => {
    let alive = true;
    getProducts().then((p) => alive && setProducts(p));
    return () => {
      alive = false;
    };
  }, []);
  return products;
}
