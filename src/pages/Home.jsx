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
import { useContent } from '../context/SiteContentContext.jsx';
import { useProducts } from '../lib/useProducts.js';

export default function Home() {
  const [newProducts, setNewProducts] = useState(null);
  const products = useProducts();
  const home = useContent('home');
  useEffect(() => {
    getNewProducts().then(setNewProducts);
  }, []);

  return (
    <>
      <Mosaic />
      {home.showValueProps && <ValueProps />}

      <section className="products-home container">
        <Reveal className="section-head">
          <div>
            <p className="eyebrow">{home.productsEyebrow}</p>
            <h2 className="section-title">{home.productsTitle}</h2>
          </div>
          <Link to="/shop-all" className="text-link">View all products <ArrowRight /></Link>
        </Reveal>
        {newProducts ? <ProductGrid products={newProducts} /> : <ProductGridSkeleton count={4} />}
      </section>

      {home.showMood && products && <MoodFinder products={products} />}
      {home.showProcess && <Process />}

      {home.showJournal && (
        <section className="latest-blog-posts container">
          <Reveal className="blog-card">
            <p className="eyebrow">{home.journalEyebrow}</p>
            <h2 className="section-title">{home.journalTitle}</h2>
            <p className="blog-empty">{home.journalText}</p>
            <Link to="/shop-all" className="button button-primary">{home.journalButton} <ArrowRight /></Link>
          </Reveal>
        </section>
      )}
    </>
  );
}
