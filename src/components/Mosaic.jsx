import { Link } from 'react-router-dom';
import { useContent } from '../context/SiteContentContext.jsx';
import { ArrowRight } from './Icons.jsx';

// Same four photos as the original home page, laid out as a rounded bento grid:
// one large tile on the left, two small tiles top-right and one wide tile bottom-right.
export default function Mosaic() {
  const home = useContent('home');
  return (
    <section className="mosaic container">
      {home.heroImages.map((src, i) => (
        <div key={i} className={`mosaic-item mosaic-item-${i}`} style={{ '--i': i }}>
          <div className="mosaic-item-bg" style={{ backgroundImage: `url("${src}")` }} />
          {i === 0 && (
            <div className="mosaic-overlay">
              <p className="hero-eyebrow">{home.heroEyebrow}</p>
              <h1 className="hero-title">{home.heroTitle}</h1>
              <Link to="/shop-all" className="button button-light">{home.heroButton} <ArrowRight /></Link>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
