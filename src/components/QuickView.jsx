import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductOptions from './ProductOptions.jsx';
import { defaultVariant, money } from '../lib/pricing.js';
import { CloseIcon } from './Icons.jsx';

export default function QuickView({ product, onClose }) {
  const [price, setPrice] = useState(() => Number(defaultVariant(product)?.price ?? product.price));

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal quick-view" role="dialog" aria-modal="true" aria-label={product.name} onClick={(e) => e.stopPropagation()}>
        <button className="icon-button modal-close" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        <div className="quick-view-image">
          <img src={product.images?.[0]} alt={product.name} />
        </div>
        <div className="quick-view-details">
          <h2 className="product-title">{product.name}</h2>
          <div key={price} className="product-price price-pop">{price != null ? money(price) : ''}</div>
          <ProductOptions product={product} onPriceChange={(p) => p != null && setPrice(p)} onAdded={onClose} />
          <Link to={`/${product.slug}`} className="view-details" onClick={onClose}>View Full Details</Link>
        </div>
      </div>
    </div>,
    document.body
  );
}
