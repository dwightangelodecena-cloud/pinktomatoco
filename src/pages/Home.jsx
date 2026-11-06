import { useEffect, useState } from 'react';
import Mosaic from '../components/Mosaic.jsx';
import { ProductGrid } from '../components/ProductCard.jsx';
import { getNewProducts } from '../lib/api.js';

export default function Home() {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    getNewProducts(4).then(setProducts);
  }, []);

  return (
    <>
      <Mosaic />
      <section className="products-home container">
        <h2 className="section-title">New Products</h2>
        <ProductGrid products={products} />
      </section>
      <section className="latest-blog-posts container">
        <h2 className="section-title">Blog</h2>
      </section>
    </>
  );
}
