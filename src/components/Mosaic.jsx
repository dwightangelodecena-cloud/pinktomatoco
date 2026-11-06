import { Link } from 'react-router-dom';
import { ArrowRight } from './Icons.jsx';

const images = ['/images/hero/hero-1.jpg', '/images/hero/hero-2.jpg', '/images/hero/hero-3.jpg', '/images/hero/hero-4.jpg'];

// Same four photos as the original home page, laid out as a rounded bento grid:
// one large tile on the left, two small tiles top-right and one wide tile bottom-right.
export default function Mosaic() {
  return (
    <section className="mosaic container">
      {images.map((src, i) => (
        <div key={src} className={`mosaic-item mosaic-item-${i}`} style={{ '--i': i }}>
          <div className="mosaic-item-bg" style={{ backgroundImage: `url(${src})` }} />
          {i === 0 && (
            <div className="mosaic-overlay">
              <p className="hero-eyebrow">Hand-poured in North Dakota</p>
              <h1 className="hero-title">Candles &amp; wax melts made to linger</h1>
              <Link to="/shop-all" className="button button-light">Shop All <ArrowRight /></Link>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
