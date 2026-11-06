import { useState } from 'react';
import { Link } from 'react-router-dom';
import { subscribe } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PaymentIcons } from './Icons.jsx';
import { BRAND } from './Header.jsx';

export default function Footer() {
  const { user, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);

  const onSubscribe = async (e) => {
    e.preventDefault();
    setStatus({ type: 'pending' });
    try {
      await subscribe(email.trim());
      setEmail('');
      setStatus({ type: 'success', text: 'Thanks for subscribing!' });
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  return (
    <footer className="main-footer">
      <section className="footer-site-subscribe">
        <h2 className="footer-heading">Join our candle club</h2>
        <p className="footer-sub">New scents and restocks, straight to your inbox.</p>
        <form className="subscription-form" onSubmit={onSubscribe}>
          <label className="sr-only" htmlFor="nl_email">Email</label>
          <input
            className="form-input"
            id="nl_email"
            type="email"
            required
            placeholder="Sign up for our newsletter"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="button button-primary" type="submit" disabled={status?.type === 'pending'}>
            Subscribe
          </button>
        </form>
        {status?.text && <p className={`form-message ${status.type}`}>{status.text}</p>}
      </section>

      <section className="footer-branding">
        <Link to="/" className="logo">
          <img src="/images/logo.png" alt={BRAND} className="footer-logo-image" />
        </Link>
        <address>Watford City, ND, United States, 5884</address>
      </section>

      <nav className="footer-navigation" aria-label="Footer">
        <ul className="footer-menu">
          <li className="footer-menu-header">Pages</li>
          <li><Link to="/shipping-returns">Shipping &amp; Returns</Link></li>
          <li><Link to="/contact-us">Contact Us</Link></li>
          <li><Link to="/blog">Blog</Link></li>
          <li><Link to="/sitemap">Sitemap</Link></li>
        </ul>
        <ul className="footer-menu">
          <li className="footer-menu-header">Categories</li>
          <li><Link to="/shop-all">Shop All</Link></li>
        </ul>
        <ul className="footer-menu">
          <li className="footer-menu-header">Account</li>
          <li>{user ? <button className="link-button" onClick={signOut}>Log out</button> : <Link to="/login">Log in</Link>}</li>
          <li><Link to="/wishlist">Wishlist</Link></li>
        </ul>
      </nav>

      <div className="footer-bottom-row">
        <PaymentIcons />
        <span className="footer-copyright">&copy; {new Date().getFullYear()} Pink Tomato Enterprises</span>
      </div>
    </footer>
  );
}
