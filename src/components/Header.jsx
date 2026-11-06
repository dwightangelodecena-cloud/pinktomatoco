import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { SearchIcon, CartIcon, CloseIcon, MenuIcon, ChevronDown } from './Icons.jsx';

export const BRAND = 'Pink Tomato Candle & Bath Co. by Len Parent Style';

const shopLinks = [
  { to: '/shop-all', label: 'Shop All' },
  { to: '/shipping-returns', label: 'Shipping & Returns' },
  { to: '/contact-us', label: 'Contact Us' },
  { to: '/blog', label: 'Blog' },
];

export default function Header() {
  const { count, openPreview } = useCart();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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

  const submitSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header className="main-header">
      {searchOpen && (
        <section className="header-search">
          <form className="search-form" onSubmit={submitSearch} role="search">
            <label className="sr-only" htmlFor="header-search">Search</label>
            <input
              id="header-search"
              ref={searchRef}
              className="search-input"
              type="search"
              placeholder="Search the store"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="button" className="icon-button" onClick={() => setSearchOpen(false)} aria-label="Close search">
              <CloseIcon />
            </button>
          </form>
        </section>
      )}

      <div className="primary-navigation">
        <button
          className="icon-button navigation-toggle"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        <nav className={`main-menu ${menuOpen ? 'is-open' : ''}`} aria-label="Main">
          <ul className="main-menu-list">
            <li
              className={`has-dropdown ${shopOpen ? 'is-open' : ''}`}
              onMouseEnter={() => setShopOpen(true)}
              onMouseLeave={() => setShopOpen(false)}
            >
              <button className="main-menu-link" aria-expanded={shopOpen} onClick={() => setShopOpen((o) => !o)}>
                Shop <ChevronDown />
              </button>
              <ul className="dropdown">
                <li><NavLink to="/shop-all">Shop All</NavLink></li>
              </ul>
            </li>
            {shopLinks.map((l) => (
              <li key={l.to}><NavLink className="main-menu-link" to={l.to}>{l.label}</NavLink></li>
            ))}
            <li className="mobile-only">
              {user ? (
                <button className="main-menu-link" onClick={signOut}>Log out</button>
              ) : (
                <NavLink className="main-menu-link" to="/login">Log in</NavLink>
              )}
            </li>
          </ul>
        </nav>

        <div className="header-tools">
          {user ? (
            <button className="tool-link desktop-only" onClick={signOut}>Log out</button>
          ) : (
            <Link className="tool-link desktop-only" to="/login">Log in</Link>
          )}
          <button className="icon-button" aria-label="Search" onClick={() => setSearchOpen((o) => !o)}>
            <SearchIcon />
          </button>
          <button className="icon-button cart-preview-trigger" aria-label={`Cart, ${count} items`} onClick={openPreview}>
            <CartIcon />
            <span className="cart-preview-quantity">{count}</span>
          </button>
        </div>
      </div>

      <div className="header-logo">
        <Link to="/" className="logo">
          <img src="/images/logo.png" alt={BRAND} className="logo-image" />
        </Link>
      </div>
    </header>
  );
}
