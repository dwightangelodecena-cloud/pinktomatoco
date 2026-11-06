import { Link } from 'react-router-dom';
import { useProducts } from '../lib/useProducts.js';

export default function Sitemap() {
  const products = useProducts() || [];
  return (
    <div className="container page sitemap">
      <h1 className="page-heading">Sitemap</h1>
      <div className="sitemap-columns">
        <section>
          <h2 className="sitemap-title">Pages</h2>
          <ul>
            <li><Link to="/shipping-returns">Shipping &amp; Returns</Link></li>
            <li><Link to="/contact-us">Contact Us</Link></li>
            <li><Link to="/blog">Blog</Link></li>
          </ul>
        </section>
        <section>
          <h2 className="sitemap-title">Categories</h2>
          <ul><li><Link to="/shop-all">Shop All</Link></li></ul>
        </section>
        <section>
          <h2 className="sitemap-title">Products</h2>
          <ul>
            {products.map((p) => <li key={p.id}><Link to={`/${p.slug}`}>{p.name}</Link></li>)}
          </ul>
        </section>
      </div>
    </div>
  );
}
