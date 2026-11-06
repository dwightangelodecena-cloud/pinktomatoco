import { useState } from 'react';
import { Link } from 'react-router-dom';
import { priceRange } from '../lib/pricing.js';
import { useWishlist } from '../context/WishlistContext.jsx';
import QuickView from './QuickView.jsx';
import Reveal from './Reveal.jsx';
import { ArrowRight, EyeIcon, HeartIcon } from './Icons.jsx';

function summary(html) {
  return (html || '')
    .replace(/<br[^>]*>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function ProductCard({ product, showSummary = false, index = 0 }) {
  const [quick, setQuick] = useState(false);
  const wishlist = useWishlist();
  const saved = wishlist.has(product.id);
  const url = `/${product.slug}`;

  return (
    <Reveal as="article" className="product-item" delay={(index % 4) * 90}>
      <div className="product-item-thumbnail">
        <Link to={url} className="product-item-image" tabIndex={-1} aria-hidden="true">
          <img src={product.images?.[0]} alt="" loading="lazy" />
        </Link>
        {product.is_new && <span className="product-badge">New</span>}
        <button
          className={`card-wishlist ${saved ? 'is-active' : ''}`}
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={saved}
          onClick={() => wishlist.toggle(product.id)}
        >
          <HeartIcon filled={saved} />
        </button>
        <button className="quick-view-button" onClick={() => setQuick(true)}>
          <EyeIcon /> Quick View
        </button>
      </div>
      <div className="product-item-details">
        <h3 className="product-item-title">
          <Link to={url}>{product.name}</Link>
        </h3>
        <div className="product-item-price">{priceRange(product)}</div>
        {showSummary && <p className="product-item-summary">{summary(product.description_html)}</p>}
        <Link to={url} className="product-item-action">
          Pick Options <ArrowRight />
        </Link>
      </div>
      {quick && <QuickView product={product} onClose={() => setQuick(false)} />}
    </Reveal>
  );
}

export function ProductGrid({ products, showSummary }) {
  return (
    <div className="product-grid">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} showSummary={showSummary} index={i} />
      ))}
    </div>
  );
}
