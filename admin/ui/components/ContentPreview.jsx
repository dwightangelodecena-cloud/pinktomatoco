import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight, CartIcon, FlameIcon, HeartIcon, LeafIcon, MapPinIcon, MenuIcon, MonitorIcon, PaymentIcons,
  PhoneIcon, SearchIcon, ShieldCheckIcon, UserIcon,
} from '../Icons.jsx';
import { priceRange } from '../lib/pricing.js';
import { scentProfile } from '../lib/productText.js';

const WIDTHS = { computer: 1280, phone: 390 };
const ANNOUNCEMENT_ICONS = [MapPinIcon, LeafIcon, ShieldCheckIcon];
const VALUE_ICONS = [MapPinIcon, LeafIcon, ShieldCheckIcon, FlameIcon];
const PROCESS_ICONS = [LeafIcon, ShieldCheckIcon, FlameIcon, MapPinIcon];

// A frame with the admin's own copy of the store's styles, so the phone view gets the store's
// real phone layout. The sections are drawn into it from the unsaved edits, as you type.
function Frame({ width, height, scale, children }) {
  const frame = useRef(null);
  const [body, setBody] = useState(null);

  useEffect(() => {
    const doc = frame.current.contentDocument;
    doc.open();
    doc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
    doc.close();
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => doc.head.appendChild(node.cloneNode(true)));
    doc.body.style.margin = '0';
    setBody(doc.body);
  }, []);

  return (
    <iframe
      ref={frame}
      title="Store preview"
      style={{ width, height: height / scale || '100%', transform: `translateX(-50%) scale(${scale})` }}
    >
      {body && createPortal(children, body)}
    </iframe>
  );
}

function Header({ draft }) {
  const items = draft.announcement.items.filter((m) => m.visible && m.text.trim());
  const row = [...items, ...items];
  return (
    <>
      {items.length > 0 && (
        <div className="announcement-bar">
          <div className="marquee-viewport" aria-hidden="true">
            <div className="marquee">
              {[0, 1].map((k) => (
                <div className="marquee-track" key={k}>
                  {row.map((m, i) => {
                    const Icon = ANNOUNCEMENT_ICONS[(i % items.length) % ANNOUNCEMENT_ICONS.length];
                    return (
                      <span key={i} className="marquee-item">
                        <span className="marquee-chip"><Icon size={14} strokeWidth={2} /></span>
                        {m.text}
                        <span className="marquee-sep"><FlameIcon size={12} strokeWidth={2} /></span>
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <header className="main-header">
        <div className="primary-navigation">
          <span className="icon-button navigation-toggle"><MenuIcon /></span>
          <nav className="main-menu" aria-label="Main">
            <ul className="main-menu-list">
              {['Shop', 'Shop All', 'Shipping & Returns', 'Contact Us', 'Blog'].map((l) => (
                <li key={l}><span className="main-menu-link"><span>{l}</span></span></li>
              ))}
            </ul>
          </nav>
          <div className="header-tools">
            <span className="tool-link desktop-only"><UserIcon size={18} /> Log in</span>
            <span className="icon-button"><SearchIcon /></span>
            <span className="icon-button cart-preview-trigger"><CartIcon /><span className="cart-preview-quantity">0</span></span>
          </div>
        </div>
      </header>
      <div className="header-logo"><span className="logo"><img src="/logo.webp" alt="" className="logo-image" /></span></div>
    </>
  );
}

function Footer({ draft }) {
  const f = draft.footer;
  return (
    <footer className="main-footer">
      <section className="footer-site-subscribe">
        <h2 className="footer-heading">{f.heading}</h2>
        <p className="footer-sub">{f.text}</p>
        <div className="subscription-form">
          <input className="form-input" placeholder="Your email address" readOnly />
          <span className="button button-primary">Subscribe</span>
        </div>
      </section>
      <section className="footer-branding">
        <span className="logo"><img src="/logo.webp" alt="" className="footer-logo-image" /></span>
        <address>{f.address}</address>
      </section>
      <nav className="footer-navigation">
        <ul className="footer-menu">
          <li className="footer-menu-header">Pages</li>
          <li>Shipping &amp; Returns</li><li>Contact Us</li><li>Blog</li><li>Sitemap</li>
        </ul>
        <ul className="footer-menu"><li className="footer-menu-header">Categories</li><li>Shop All</li></ul>
        <ul className="footer-menu"><li className="footer-menu-header">Account</li><li>Log in</li><li>Wishlist</li></ul>
      </nav>
      <div className="footer-bottom-row">
        <PaymentIcons />
        <span className="footer-copyright">&copy; {new Date().getFullYear()} {f.copyright}</span>
      </div>
    </footer>
  );
}

function ProductCard({ p }) {
  return (
    <article className="reveal is-visible product-item">
      <div className="product-item-thumbnail">
        <span className="product-item-image"><img src={p.images?.[0]} alt="" /></span>
        <span className="product-badge">New</span>
        <span className="card-wishlist"><HeartIcon /></span>
      </div>
      <div className="product-item-details">
        <h3 className="product-item-title"><span>{p.name}</span></h3>
        <div className="product-item-price">{priceRange({ ...p, variants: p.product_variants })}</div>
        <span className="product-item-action">Pick Options <ArrowRight /></span>
      </div>
    </article>
  );
}

function Home({ draft, products, featuredIds }) {
  const h = draft.home;
  const visible = (products || []).filter((p) => p.is_visible);
  const chosen = featuredIds?.length ? featuredIds.map((id) => visible.find((p) => p.id === id)).filter(Boolean) : visible.slice(0, 8);
  const moods = useMemo(() => visible.map((p) => ({ p, profile: scentProfile(p) })).filter((x) => x.profile), [visible]);
  const first = moods[0];

  return (
    <>
      <section className="mosaic container">
        {h.heroImages.map((src, i) => (
          <div key={i} className={`mosaic-item mosaic-item-${i}`} style={{ animation: 'none' }}>
            <div className="mosaic-item-bg" style={{ backgroundImage: `url("${src}")` }} />
            {i === 0 && (
              <div className="mosaic-overlay">
                <p className="hero-eyebrow">{h.heroEyebrow}</p>
                <h1 className="hero-title">{h.heroTitle}</h1>
                <span className="button button-light">{h.heroButton} <ArrowRight /></span>
              </div>
            )}
          </div>
        ))}
      </section>

      {h.showValueProps && (
        <section className="value-props container">
          <ul className="value-props-list">
            {h.valueProps.map((v, i) => {
              const Icon = VALUE_ICONS[i % 4];
              return <li key={i} className="reveal is-visible value-prop"><span className="value-prop-icon"><Icon size={24} /></span><div><h3>{v.title}</h3><p>{v.text}</p></div></li>;
            })}
          </ul>
        </section>
      )}

      <section className="products-home container">
        <div className="reveal is-visible section-head">
          <div><p className="eyebrow">{h.productsEyebrow}</p><h2 className="section-title">{h.productsTitle}</h2></div>
          <span className="text-link">View all products <ArrowRight /></span>
        </div>
        <div className="product-grid">{chosen.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </section>

      {h.showMood && first && (
        <section className="mood-finder container">
          <div className="mood-inner">
            <div className="reveal is-visible mood-head">
              <p className="eyebrow">{h.moodEyebrow}</p>
              <h2 className="section-title">{h.moodTitle}</h2>
              <div className="mood-chips">
                {moods.map((m, i) => <span key={m.p.id} className={`mood-chip ${i === 0 ? 'is-active' : ''}`}>{m.profile.moods[0]}</span>)}
              </div>
            </div>
            <div className="mood-stage">
              <span className="mood-image"><img src={first.p.images?.[0]} alt="" /></span>
              <div className="mood-copy">
                <h3 className="mood-name">{first.p.name}</h3>
                <p className="mood-intro">{first.profile.intro}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {h.showProcess && (
        <section className="process container">
          <div className="reveal is-visible process-head"><p className="eyebrow">{h.processEyebrow}</p><h2 className="section-title">{h.processTitle}</h2></div>
          <ol className="process-steps is-in">
            <span className="process-line" aria-hidden="true" />
            {h.processSteps.map((s, i) => {
              const Icon = PROCESS_ICONS[i % 4];
              return <li key={i} className="process-step"><span className="process-icon"><Icon size={24} /><span className="process-num">{i + 1}</span></span><h3>{s.title}</h3><p>{s.text}</p></li>;
            })}
          </ol>
        </section>
      )}

      {h.showJournal && (
        <section className="latest-blog-posts container">
          <div className="reveal is-visible blog-card">
            <p className="eyebrow">{h.journalEyebrow}</p>
            <h2 className="section-title">{h.journalTitle}</h2>
            <p className="blog-empty">{h.journalText}</p>
            <span className="button button-primary">{h.journalButton} <ArrowRight /></span>
          </div>
        </section>
      )}
    </>
  );
}

function Page({ draft, page }) {
  if (page === 'shipping') {
    return (
      <div className="container page page-narrow rte">
        <h1 className="page-heading">{draft.shipping.title}</h1>
        {draft.shipping.sections.map((s, i) => (
          <div key={i}>
            <p><strong>{s.heading}</strong></p>
            {s.body.split(/\n\s*\n/).filter((p) => p.trim()).map((p, n) => <p key={n}>{p}</p>)}
          </div>
        ))}
      </div>
    );
  }
  if (page === 'contact') {
    return (
      <div className="container page page-narrow">
        <h1 className="page-heading">{draft.contact.title}</h1>
        <p>{draft.contact.intro}</p>
        <div className="form contact-form">
          <div className="form-row">
            <label className="form-field"><span className="form-field-title">Full Name</span><input className="form-input" readOnly /></label>
            <label className="form-field"><span className="form-field-title">Email Address</span><input className="form-input" readOnly /></label>
          </div>
          <label className="form-field"><span className="form-field-title">Comments/Questions</span><textarea className="form-input" rows="4" readOnly /></label>
        </div>
      </div>
    );
  }
  if (page === 'blog') {
    return <div className="container page"><h1 className="page-heading">{draft.blog.title}</h1>{draft.blog.intro && <p>{draft.blog.intro}</p>}</div>;
  }
  return null;
}

// Shows unsaved edits the way the store will show them. Saved changes appear on the real store.
export default function ContentPreview({ title, draft, view, products, featuredIds }) {
  const [device, setDevice] = useState('computer');
  const [box, setBox] = useState({ width: 0, height: 0 });
  const stage = useRef(null);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setBox({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);

  const width = WIDTHS[device];
  const scale = box.width ? Math.min(1, box.width / width) : 1;

  return (
    <section className="store-preview" aria-label="Store preview">
      <header className="store-preview-head">
        <div><p>Preview of your edits</p><strong>{title}</strong></div>
        <div className="store-preview-tools">
          <div className="store-preview-devices" role="group" aria-label="Preview size">
            <button type="button" aria-pressed={device === 'computer'} onClick={() => setDevice('computer')}><MonitorIcon size={15} /> Computer</button>
            <button type="button" aria-pressed={device === 'phone'} onClick={() => setDevice('phone')}><PhoneIcon size={15} /> Phone</button>
          </div>
        </div>
      </header>
      <div className="store-preview-stage" ref={stage}>
        <Frame key={device} width={width} height={box.height} scale={scale}>
          <div className="site-frame">
            <Header draft={draft} />
            <main className="main-content">
              {view === 'home' || view === 'footer' ? <Home draft={draft} products={products} featuredIds={featuredIds} /> : <Page draft={draft} page={view} />}
            </main>
            <Footer draft={draft} />
          </div>
        </Frame>
      </div>
    </section>
  );
}
