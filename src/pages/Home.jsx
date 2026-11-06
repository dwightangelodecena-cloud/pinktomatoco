import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Mosaic from '../components/Mosaic.jsx';
import ValueProps from '../components/ValueProps.jsx';
import Reveal from '../components/Reveal.jsx';
import { ProductGrid } from '../components/ProductCard.jsx';
import { ProductGridSkeleton } from '../components/Skeleton.jsx';
import { ArrowRight } from '../components/Icons.jsx';
import { getNewProducts } from '../lib/api.js';

export default function Home() {
  const [products, setProducts] = useState(null);
  useEffect(() => {
    getNewProducts(4).then(setProducts);
  }, []);

  return (
    <>
      <Mosaic />
      <ValueProps />

      <section className="products-home container">
        <Reveal className="section-head">
          <div>
            <p className="eyebrow">Just poured</p>
            <h2 className="section-title">New Products</h2>
          </div>
          <Link to="/shop-all" className="text-link">View all products <ArrowRight /></Link>
        </Reveal>
        {products ? <ProductGrid products={products} /> : <ProductGridSkeleton count={4} />}
      </section>

      <section className="latest-blog-posts container">
        <Reveal className="blog-card">
          <p className="eyebrow">Journal</p>
          <h2 className="section-title">Blog</h2>
          <p className="blog-empty">Scent notes, candle care tips and stories from our studio are coming soon.</p>
          <Link to="/shop-all" className="button button-primary">Shop the collection <ArrowRight /></Link>
        </Reveal>
      </section>
    </>
  );
}
