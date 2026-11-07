import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import ProductOptions from '../components/ProductOptions.jsx';
import { ProductGrid } from '../components/ProductCard.jsx';
import ReviewModal from '../components/ReviewModal.jsx';
import NotFound from './NotFound.jsx';
import { ProductPageSkeleton } from '../components/Skeleton.jsx';

const FORM_ID = 'product-options-form';

// Phone-only bar that appears once the main Add To Cart button scrolls out of view.
function StickyBuyBar({ product, price }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const form = document.getElementById(FORM_ID);
    if (!form || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(form);
    return () => io.disconnect();
  }, [product.id]);

  const buy = () => {
    const form = document.getElementById(FORM_ID);
    if (!form) return;
    const select = form.querySelector('select');
    if (select && !select.value) {
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    form.requestSubmit();
  };

  return (
    <div className={`sticky-buy-bar ${show ? 'is-visible' : ''}`} aria-hidden={!show}>
      <img src={product.images?.[0]} alt="" />
      <div className="sticky-buy-info">
        <span className="sticky-buy-name">{product.name}</span>
        <span className="sticky-buy-price">{price != null ? money(price) : ''}</span>
      </div>
      <button className="button button-primary" onClick={buy} tabIndex={show ? 0 : -1}>Add To Cart</button>
    </div>
  );
}

// Image that zooms toward the cursor on hover.
function ZoomImage({ src, alt }) {
  const [origin, setOrigin] = useState('50% 50%');
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
  };
  return (
    <a href={src} target="_blank" rel="noreferrer" className="product-image zoomable" onMouseMove={onMove}>
      <img src={src} alt={alt} style={{ transformOrigin: origin }} />
    </a>
  );
}
import { getProductBySlug, getProducts, getReviews } from '../lib/api.js';
import { defaultVariant, money } from '../lib/pricing.js';
import { useWishlist } from '../context/WishlistContext.jsx';
import { FacebookIcon, HeartIcon, MailIcon, PinterestIcon, PrintIcon, Star, TwitterIcon } from '../components/Icons.jsx';

export default function Product() {
  const { slug } = useParams();
  const [product, setProduct] = useState(undefined);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [price, setPrice] = useState(null);
  const [sku, setSku] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [photo, setPhoto] = useState(0);
  const wishlist = useWishlist();

  useEffect(() => {
    let alive = true;
    setProduct(undefined);
    (async () => {
      const p = await getProductBySlug(slug);
      if (!alive) return;
      setProduct(p);
      if (!p) return;
      const dv = defaultVariant(p);
      setPrice(Number(dv?.price ?? p.price));
      setSku(dv?.sku ?? p.sku);
      document.title = `Pink Tomato Candle & Bath Co. - ${p.name}`;
      const all = await getProducts();
      if (alive) setRelated(all.filter((x) => p.related.includes(x.id)));
      const r = await getReviews(p.id);
      if (alive) setReviews(r);
    })();
    return () => {
      alive = false;
      document.title = 'Pink Tomato Candle & Bath Co.';
    };
  }, [slug]);

  if (product === undefined) return <ProductPageSkeleton />;
  if (product === null) return <NotFound />;

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const image = product.images?.[0];
  const absImage = image ? new URL(image, window.location.origin).href : '';
  const avg = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0;

  return (
    <div className="container page product-page">
      <Breadcrumbs items={[{ label: 'Shop All', to: '/shop-all' }, { label: product.name }]} />

      <div className="product-top">
        <div className="product-images">
          <ZoomImage src={product.images?.[photo] ?? image} alt={product.name} />
          {product.images?.length > 1 && (
            <div className="product-thumbs">
              {product.images.map((src, i) => (
                <button key={src} type="button" aria-label={`Show photo ${i + 1}`} aria-pressed={i === photo} onClick={() => setPhoto(i)}>
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-details">
          <header className="product-header">
            <h1 className="product-title">{product.name}</h1>
            <div key={price} className="product-price price-pop">{price != null ? money(price) : ''}</div>
            <div className="product-rating">
              {reviews.length > 0 ? (
                <>
                  <span className="stars">{[1, 2, 3, 4, 5].map((n) => <Star key={n} filled={n <= Math.round(avg)} />)}</span>
                  <span>{reviews.length} review{reviews.length === 1 ? '' : 's'}</span>
                  <button className="link-button" onClick={() => setReviewOpen(true)}>Write a review</button>
                </>
              ) : (
                <span>
                  Be the first to <button className="link-button" onClick={() => setReviewOpen(true)}>leave a review</button>
                </span>
              )}
            </div>
          </header>

          <dl className="product-detail-list">
            <div><dt className="product-detail-key">SKU</dt><dd>{sku}</dd></div>
          </dl>

          <ProductOptions
            formId={FORM_ID}
            product={product}
            onPriceChange={(p, v) => {
              if (p != null) setPrice(p);
              if (v) setSku(v.sku);
            }}
          />

          <div className="product-share">
            <h2 className="share-heading">Share This</h2>
            <ul className="share-buttons">
              <li><a href={`https://www.facebook.com/sharer.php?u=${encodeURIComponent(pageUrl)}`} target="_blank" rel="noreferrer" aria-label="Share on Facebook"><FacebookIcon /></a></li>
              <li><a href={`mailto:?subject=${encodeURIComponent(product.name)}&body=${encodeURIComponent(pageUrl)}`} aria-label="Share by email"><MailIcon /></a></li>
              <li><button className="link-button" onClick={() => window.print()} aria-label="Print"><PrintIcon /></button></li>
              <li><a href={`https://twitter.com/share?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(product.name)}`} target="_blank" rel="noreferrer" aria-label="Share on X"><TwitterIcon /></a></li>
              <li><a href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(pageUrl)}&media=${encodeURIComponent(absImage)}&description=${encodeURIComponent(product.name)}`} target="_blank" rel="noreferrer" aria-label="Pin on Pinterest"><PinterestIcon /></a></li>
            </ul>
            <button className={`wishlist-button ${wishlist.has(product.id) ? 'is-active' : ''}`} onClick={() => wishlist.toggle(product.id)}>
              <HeartIcon filled={wishlist.has(product.id)} /> {wishlist.has(product.id) ? 'In Wishlist' : 'Wishlist'}
            </button>
          </div>
        </div>
      </div>

      <section className="product-tabs">
        <nav className="product-tabs-menu"><span className="product-tab-link is-active">Overview</span></nav>
        <div className="product-description rte" dangerouslySetInnerHTML={{ __html: product.description_html || '' }} />
      </section>

      {reviews.length > 0 && (
        <section className="product-reviews">
          <h2 className="section-title">Reviews</h2>
          <ul>
            {reviews.map((r) => (
              <li key={r.id} className="review-item">
                <span className="stars">{[1, 2, 3, 4, 5].map((n) => <Star key={n} filled={n <= r.rating} />)}</span>
                <h3>{r.subject}</h3>
                <p className="review-meta">Posted by {r.name} on {new Date(r.created_at).toLocaleDateString()}</p>
                <p>{r.comments}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section className="products-related">
          <h2 className="section-title">Similar Items</h2>
          <ProductGrid products={related} />
        </section>
      )}

      <StickyBuyBar product={product} price={price} />

      {reviewOpen && <ReviewModal product={product} onClose={() => setReviewOpen(false)} />}
    </div>
  );
}
