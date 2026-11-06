import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Mosaic from '../components/Mosaic.jsx';
import ValueProps from '../components/ValueProps.jsx';
import MoodFinder from '../components/MoodFinder.jsx';
import Process from '../components/Process.jsx';
import Reveal from '../components/Reveal.jsx';
import { ProductGrid } from '../components/ProductCard.jsx';
import { ProductGridSkeleton } from '../components/Skeleton.jsx';
import { ArrowRight } from '../components/Icons.jsx';
import { getNewProducts } from '../lib/api.js';
import { useProducts } from '../lib/useProducts.js';

export default function Home() {
  const [newProducts, setNewProducts] = useState(null);
  const products = useProducts();
  useEffect(() => {
    getNewProducts(4).then(setNewProducts);
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
        {newProducts ? <ProductGrid products={newProducts} /> : <ProductGridSkeleton count={4} />}
      </section>

      {products && <MoodFinder products={products} />}
      <Process />

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
