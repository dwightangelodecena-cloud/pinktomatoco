import { useState } from 'react';
import { Link } from 'react-router-dom';
import { priceRange } from '../lib/pricing.js';
import QuickView from './QuickView.jsx';

function summary(html) {
  return (html || '')
    .replace(/<br[^>]*>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function ProductCard({ product, showSummary = false }) {
  const [quick, setQuick] = useState(false);
  const url = `/${product.slug}`;

  return (
    <article className="product-item">
      <div className="product-item-thumbnail">
        <Link to={url} className="product-item-image">
          <img src={product.images?.[0]} alt={product.name} loading="lazy" />
        </Link>
        <button className="button button-second quick-view-button" onClick={() => setQuick(true)}>
          Quick View
        </button>
      </div>
      <div className="product-item-details">
        <h3 className="product-item-title">
          <Link to={url}>{product.name}</Link>
        </h3>
        <div className="product-item-price">{priceRange(product)}</div>
        {showSummary && <p className="product-item-summary">{summary(product.description_html)}</p>}
        <Link to={url} className="button button-primary button-small product-item-action">
          Pick Options
        </Link>
      </div>
      {quick && <QuickView product={product} onClose={() => setQuick(false)} />}
    </article>
  );
}

export function ProductGrid({ products, showSummary }) {
  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} showSummary={showSummary} />
      ))}
    </div>
  );
}
