import { Link } from 'react-router-dom';

const images = ['/images/hero/hero-1.jpg', '/images/hero/hero-2.jpg', '/images/hero/hero-3.jpg', '/images/hero/hero-4.jpg'];

// Same 4-tile mosaic as the original home page: one large tile on the left,
// two small tiles top-right and one wide tile bottom-right.
export default function Mosaic() {
  return (
    <section className={`mosaic mosaic-count-${images.length}`}>
      {images.map((src, i) => (
        <div key={src} className={`mosaic-item mosaic-item-${i}`} style={{ '--i': i }}>
          <div className="mosaic-item-bg" style={{ backgroundImage: `url(${src})` }} />
          <img className="mosaic-item-image" src={src} alt="" />
          {i === 0 && (
            <div className="mosaic-overlay">
              <p className="eyebrow">Hand-poured in North Dakota</p>
              <h1 className="hero-title">Candles &amp; wax melts made to linger</h1>
              <Link to="/shop-all" className="button button-light">Shop All</Link>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
