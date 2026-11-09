import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { customerRequest, getMyOrders } from '../lib/api.js';
import { money } from '../lib/pricing.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import PasswordRules, { PASSWORD_ERROR, passwordIsValid } from '../components/PasswordRules.jsx';
import {
  ArrowRight, CheckIcon, EyeIcon, EyeOffIcon, HeartIcon, LockIcon, LogOutIcon,
  MailIcon, PackageIcon, ShieldCheckIcon, UserIcon,
} from '../components/Icons.jsx';

const BENEFITS = ['Check out faster', 'Save your shipping details', 'See your order history', 'Keep a wishlist of favourite scents'];

function friendlyError(msg = '') {
  if (/invalid login credentials/i.test(msg)) return "That email and password don't match. Try again or reset your password.";
  if (/email not confirmed/i.test(msg)) return 'Please confirm your email first. Check your inbox for the link we sent.';
  if (/already registered|already exists/i.test(msg)) return 'An account with this email already exists. Try signing in instead.';
  if (/rate limit|too many/i.test(msg)) return 'Too many attempts. Please wait a minute and try again.';
  return msg || 'Something went wrong. Please try again.';
}

function passwordScore(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) s++;
  return s;
}
const STRENGTH = ['Too short', 'Weak', 'Okay', 'Good', 'Strong'];

function Field({ icon: Icon, label, type = 'text', value, onChange, autoComplete, required = true, minLength, children }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <label className="auth-field">
      <span className="form-field-title">{label}</span>
      <span className="auth-input-wrap">
        <Icon size={18} />
        <input
          className="auth-input"
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          placeholder=" "
        />
        {isPassword && (
          <button type="button" className="auth-eye" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </span>
      {children}
    </label>
  );
}

function SubmitButton({ pending, children }) {
  return (
    <button className="button button-primary auth-submit" type="submit" disabled={pending}>
      {pending ? <span className="spinner" aria-label="Please wait" /> : <>{children} <ArrowRight /></>}
    </button>
  );
}

// Only pages on this site, so a link can't send someone elsewhere after they sign in.
const safeNext = (value) => (value?.startsWith('/') && !value.startsWith('//') ? value : '/');

function splitName(fullName) {
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  return { firstName, lastName: rest.join(' ') };
}

function AuthForms() {
  const navigate = useNavigate();
  const { signIn: logIn, signUp: createAccount } = useAuth();
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') || 'signin'; // signin | signup | forgot | reset
  const next = safeNext(params.get('next'));
  const setMode = (m) => {
    setStatus(null);
    setParams({ ...(m === 'signin' ? {} : { mode: m }), ...(next === '/' ? {} : { next }) }, { replace: true });
  };

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState(null);

  // Opening the reset link from the email signs the visitor in with a "recovery" session.
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setParams({ mode: 'reset' }, { replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [setParams]);

  const run = async (fn) => {
    setStatus({ type: 'pending' });
    try {
      await fn();
    } catch (err) {
      setStatus({ type: 'error', text: friendlyError(err.message) });
    }
  };

  const signIn = (e) => {
    e.preventDefault();
    run(async () => {
      await logIn(email, password);
      navigate(next, { replace: true });
    });
  };

  const signUp = (e) => {
    e.preventDefault();
    if (!passwordIsValid(password)) return setStatus({ type: 'error', text: PASSWORD_ERROR });
    if (password !== confirm) return setStatus({ type: 'error', text: 'Passwords do not match.' });
    const { firstName, lastName } = splitName(name);
    if (!lastName) return setStatus({ type: 'error', text: 'Please enter your first and last name.' });
    run(async () => {
      await createAccount({ firstName, lastName, email, password });
      navigate(next, { replace: true });
    });
  };

  const forgot = (e) => {
    e.preventDefault();
    run(async () => {
      await customerRequest({ action: 'forgot', email });
      setStatus({ type: 'sent', text: `If ${email} has an account, a reset link is on its way.` });
    });
  };

  const reset = (e) => {
    e.preventDefault();
    if (!passwordIsValid(password)) return setStatus({ type: 'error', text: PASSWORD_ERROR });
    if (password !== confirm) return setStatus({ type: 'error', text: 'Passwords do not match.' });
    run(async () => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setParams({}, { replace: true });
    });
  };

  const pending = status?.type === 'pending';
  const score = passwordScore(password);

  if (status?.type === 'sent') {
    return (
      <div className="auth-card auth-sent">
        <span className="auth-sent-icon"><MailIcon size={30} /></span>
        <h2>Check your inbox</h2>
        <p>{status.text}</p>
        <button className="button button-secondary" onClick={() => setMode('signin')}>Back to sign in</button>
      </div>
    );
  }

  return (
    <div className="auth-card">
      {(mode === 'signin' || mode === 'signup') && (
        <div className="auth-tabs" role="tablist" data-active={mode}>
          <span className="auth-tab-indicator" aria-hidden="true" />
          <button role="tab" aria-selected={mode === 'signin'} onClick={() => setMode('signin')}>Sign in</button>
          <button role="tab" aria-selected={mode === 'signup'} onClick={() => setMode('signup')}>Create account</button>
        </div>
      )}

      <div key={mode} className="auth-panel">
        {mode === 'signin' && (
          <form className="auth-form" onSubmit={signIn}>
            <div className="auth-heading">
              <h1>Welcome back</h1>
              <p>Sign in to check out faster and see your orders.</p>
            </div>
            <Field icon={MailIcon} label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Field icon={LockIcon} label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}>
              <button type="button" className="auth-forgot" onClick={() => setMode('forgot')}>Forgot password?</button>
            </Field>
            {status?.type === 'error' && <p className="auth-error shake">{status.text}</p>}
            <SubmitButton pending={pending}>Sign in</SubmitButton>
            <p className="auth-switch">New here? <button type="button" onClick={() => setMode('signup')}>Create an account</button></p>
          </form>
        )}

        {mode === 'signup' && (
          <form className="auth-form" onSubmit={signUp}>
            <div className="auth-heading">
              <h1>Join Pink Tomato</h1>
              <p>Create an account in less than a minute.</p>
            </div>
            <Field icon={UserIcon} label="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            <Field icon={MailIcon} label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Field icon={LockIcon} label="Password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}>
              {password && (
                <span className="strength" data-score={score}>
                  <span className="strength-bars">{[1, 2, 3, 4].map((n) => <i key={n} className={n <= score ? 'on' : ''} />)}</span>
                  <span className="strength-label">{STRENGTH[score]}</span>
                </span>
              )}
              <PasswordRules password={password} />
            </Field>
            <Field icon={LockIcon} label="Confirm password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)}>
              {confirm && password === confirm && <span className="match"><CheckIcon /> Passwords match</span>}
            </Field>
            {status?.type === 'error' && <p className="auth-error shake">{status.text}</p>}
            <SubmitButton pending={pending}>Create account</SubmitButton>
            <p className="auth-switch">Already have an account? <button type="button" onClick={() => setMode('signin')}>Sign in</button></p>
          </form>
        )}

        {mode === 'forgot' && (
          <form className="auth-form" onSubmit={forgot}>
            <div className="auth-heading">
              <h1>Reset your password</h1>
              <p>Enter your email and we'll send you a link to choose a new one.</p>
            </div>
            <Field icon={MailIcon} label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {status?.type === 'error' && <p className="auth-error shake">{status.text}</p>}
            <SubmitButton pending={pending}>Send reset link</SubmitButton>
            <p className="auth-switch"><button type="button" onClick={() => setMode('signin')}>← Back to sign in</button></p>
          </form>
        )}

        {mode === 'reset' && (
          <form className="auth-form" onSubmit={reset}>
            <div className="auth-heading">
              <h1>Choose a new password</h1>
              <p>Pick something you haven't used before.</p>
            </div>
            <Field icon={LockIcon} label="New password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}>
              <PasswordRules password={password} />
            </Field>
            <Field icon={LockIcon} label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {status?.type === 'error' && <p className="auth-error shake">{status.text}</p>}
            <SubmitButton pending={pending}>Save password</SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}

function AccountDashboard({ user, isAdmin, signOut }) {
  const { ids } = useWishlist();
  const [orders, setOrders] = useState(null);
  const name = user.user_metadata?.full_name || user.email.split('@')[0];

  useEffect(() => {
    getMyOrders(user).then(setOrders).catch(() => setOrders([]));
  }, [user]);

  return (
    <div className="container page account-page">
      <section className="account-hero">
        <span className="account-avatar">{name.charAt(0).toUpperCase()}</span>
        <div>
          <p className="eyebrow">My account</p>
          <h1>Hi, {name}</h1>
          <p className="account-email">{user.email}</p>
        </div>
        <button className="button button-secondary account-signout" onClick={signOut}><LogOutIcon /> Sign out</button>
      </section>

      <div className="account-grid">
        <section className="account-card account-orders">
          <h2><PackageIcon size={20} /> Recent orders</h2>
          {orders === null ? (
            <div className="skeleton skeleton-block" />
          ) : orders.length === 0 ? (
            <div className="account-empty">
              <p>You haven't placed an order yet.</p>
              <Link to="/shop-all" className="button button-primary button-small">Start shopping <ArrowRight /></Link>
            </div>
          ) : (
            <ul className="order-list">
              {orders.map((o) => (
                <li key={o.id}>
                  <div>
                    <strong>Order #{o.id}</strong>
                    <span>{new Date(o.created_at).toLocaleDateString()} · {o.order_items?.reduce((n, i) => n + i.quantity, 0)} items</span>
                  </div>
                  <span className={`order-status status-${o.status}`}>{o.statusLabel}</span>
                  <span className="order-total">{money(o.subtotal)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="account-side">
          {isAdmin && (
            <Link to="/admin" className="account-card account-tile">
              <span className="account-tile-icon"><ShieldCheckIcon /></span>
              <span><strong>Store admin</strong><small>Orders, products, reviews and messages</small></span>
              <ArrowRight />
            </Link>
          )}
          <Link to="/wishlist" className="account-card account-tile">
            <span className="account-tile-icon"><HeartIcon /></span>
            <span><strong>Wishlist</strong><small>{ids.length} saved item{ids.length === 1 ? '' : 's'}</small></span>
            <ArrowRight />
          </Link>
          <Link to="/shop-all" className="account-card account-tile">
            <span className="account-tile-icon"><PackageIcon size={18} /></span>
            <span><strong>Shop all candles</strong><small>21 scents & wax melts</small></span>
            <ArrowRight />
          </Link>
          <Link to="/contact-us" className="account-card account-tile">
            <span className="account-tile-icon"><MailIcon /></span>
            <span><strong>Need help?</strong><small>Returns, orders and questions</small></span>
            <ArrowRight />
          </Link>
        </aside>
      </div>
    </div>
  );
}

export default function Login() {
  const { user, isAdmin, signOut } = useAuth();
  const [params] = useSearchParams();

  if (user && params.get('mode') !== 'reset') return <AccountDashboard user={user} isAdmin={isAdmin} signOut={signOut} />;

  return (
    <div className="auth-page container">
      <aside className="auth-visual">
        <div className="auth-visual-bg" style={{ backgroundImage: 'url(/images/hero/hero-3.jpg)' }} />
        <div className="auth-visual-copy">
          <p className="hero-eyebrow">Pink Tomato Candle &amp; Bath Co.</p>
          <h2>Hand-poured candles, saved just for you.</h2>
          <ul>
            {BENEFITS.map((b, i) => (
              <li key={b} style={{ '--d': `${300 + i * 90}ms` }}><span><CheckIcon /></span>{b}</li>
            ))}
          </ul>
        </div>
      </aside>
      <AuthForms />
    </div>
  );
}
