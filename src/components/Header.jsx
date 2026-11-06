import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { SearchIcon, CartIcon, CloseIcon, MenuIcon, ChevronDown, UserIcon } from './Icons.jsx';

export const BRAND = 'Pink Tomato Candle & Bath Co. by Len Parent Style';

const shopLinks = [
  { to: '/shop-all', label: 'Shop All' },
  { to: '/shipping-returns', label: 'Shipping & Returns' },
  { to: '/contact-us', label: 'Contact Us' },
  { to: '/blog', label: 'Blog' },
];

const announcements = [
  'Hand-poured in North Dakota',
  'Clean-burning coconut soy wax',
  'Bulk pricing on 12+ candles',
];

// Continuously scrolling strip; the list is repeated so the loop is seamless.
function AnnouncementBar() {
  const row = [...announcements, ...announcements];
  return (
    <div className="announcement-bar">
      <p className="sr-only">{announcements.join('. ')}</p>
      <div className="marquee" aria-hidden="true">
        {[0, 1].map((k) => (
          <div className="marquee-track" key={k}>
            {row.map((t, i) => (
              <span key={i} className="marquee-item">{t}<span className="marquee-dot">✦</span></span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Header() {
  const { count, openPreview } = useCart();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
    setShopOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen);
  }, [menuOpen]);

  const submitSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <>
      <AnnouncementBar />

      <header className={`main-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className={`header-search ${searchOpen ? 'is-open' : ''}`}>
          <form className="search-form" onSubmit={submitSearch} role="search">
            <SearchIcon />
            <label className="sr-only" htmlFor="header-search">Search</label>
            <input
              id="header-search"
              ref={searchRef}
              className="search-input"
              type="search"
              placeholder="Search candles, wax melts, scents…"
              value={query}
              tabIndex={searchOpen ? 0 : -1}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="button" className="icon-button" tabIndex={searchOpen ? 0 : -1} onClick={() => setSearchOpen(false)} aria-label="Close search">
              <CloseIcon />
            </button>
          </form>
        </div>

        <div className="primary-navigation">
          <button
            className="icon-button navigation-toggle"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className={`toggle-icon ${menuOpen ? 'is-open' : ''}`}>{menuOpen ? <CloseIcon /> : <MenuIcon />}</span>
          </button>

          <Link to="/" className={`nav-logo ${scrolled ? 'is-visible' : ''}`} aria-hidden={!scrolled} tabIndex={scrolled ? 0 : -1}>
            <img src="/images/logo.png" alt="" />
          </Link>

          <nav className={`main-menu ${menuOpen ? 'is-open' : ''}`} aria-label="Main">
            <ul className="main-menu-list">
              <li
                className={`has-dropdown ${shopOpen ? 'is-open' : ''}`}
                onMouseEnter={() => setShopOpen(true)}
                onMouseLeave={() => setShopOpen(false)}
              >
                <button className="main-menu-link" aria-expanded={shopOpen} onClick={() => setShopOpen((o) => !o)}>
                  <span>Shop</span> <ChevronDown />
                </button>
                <ul className="dropdown">
                  <li><NavLink to="/shop-all">Shop All</NavLink></li>
                </ul>
              </li>
              {shopLinks.map((l, i) => (
                <li key={l.to} style={{ '--i': i + 1 }}>
                  <NavLink className="main-menu-link" to={l.to}><span>{l.label}</span></NavLink>
                </li>
              ))}
              <li className="mobile-only" style={{ '--i': shopLinks.length + 1 }}>
                {user ? (
                  <button className="main-menu-link" onClick={signOut}><span>Log out</span></button>
                ) : (
                  <NavLink className="main-menu-link" to="/login"><span>Log in</span></NavLink>
                )}
              </li>
            </ul>
          </nav>

          <div className="header-tools">
            {user ? (
              <button className="tool-link desktop-only" onClick={signOut}><UserIcon size={18} /> Log out</button>
            ) : (
              <Link className="tool-link desktop-only" to="/login"><UserIcon size={18} /> Log in</Link>
            )}
            <button className="icon-button" aria-label="Search" aria-expanded={searchOpen} onClick={() => setSearchOpen((o) => !o)}>
              <SearchIcon />
            </button>
            <button className="icon-button cart-preview-trigger" aria-label={`Cart, ${count} items`} onClick={openPreview}>
              <CartIcon />
              <span key={count} className={`cart-preview-quantity ${count ? 'bump' : ''}`}>{count}</span>
            </button>
          </div>
        </div>
        <div className={`menu-backdrop ${menuOpen ? 'is-open' : ''}`} onClick={() => setMenuOpen(false)} />
      </header>

      <div className="header-logo">
        <Link to="/" className="logo">
          <img src="/images/logo.png" alt={BRAND} className="logo-image" />
        </Link>
      </div>
    </>
  );
}
