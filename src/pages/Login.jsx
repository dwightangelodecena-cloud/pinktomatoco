import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(null);

  if (user) {
    return (
      <div className="container page page-narrow">
        <h1 className="page-heading">My Account</h1>
        <p>You are signed in as <strong>{user.email}</strong>.</p>
        <button className="button button-secondary" onClick={signOut}>Log out</button>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!supabase) {
      setStatus({ type: 'error', text: 'Accounts are not available yet. Please try again later.' });
      return;
    }
    setStatus({ type: 'pending' });
    const fn = mode === 'login' ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { data, error } = await fn.call(supabase.auth, { email, password });
    if (error) return setStatus({ type: 'error', text: error.message });
    if (mode === 'signup' && !data.session) {
      return setStatus({ type: 'success', text: 'Check your email to confirm your account, then sign in.' });
    }
    navigate('/');
  };

  const resetPassword = async () => {
    if (!supabase || !email) {
      setStatus({ type: 'error', text: 'Enter your email address above first.' });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` });
    setStatus(error ? { type: 'error', text: error.message } : { type: 'success', text: 'If that email has an account, a reset link is on its way.' });
  };

  return (
    <div className="container page">
      <h1 className="page-heading">{mode === 'login' ? 'Sign in' : 'New Account'}</h1>
      <div className="account-login-wrapper">
        <form className="form login-form" onSubmit={submit}>
          <label className="form-field">
            <span className="form-field-title">Email Address</span>
            <input className="form-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="form-field">
            <span className="form-field-title">Password</span>
            <input className="form-input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {status?.text && <p className={`form-message ${status.type}`}>{status.text}</p>}
          <div className="form-actions">
            <button className="button button-primary" type="submit" disabled={status?.type === 'pending'}>
              {mode === 'login' ? 'Sign in' : 'Create Account'}
            </button>
            {mode === 'login' && (
              <button type="button" className="link-button" onClick={resetPassword}>Forgot your password?</button>
            )}
          </div>
        </form>

        <div className="new-customer">
          {mode === 'login' ? (
            <>
              <h2 className="account-sub-heading">New Customer?</h2>
              <p>Create an account with us and you'll be able to:</p>
              <ul>
                <li>Check out faster</li>
                <li>Save multiple shipping addresses</li>
                <li>Access your order history</li>
                <li>Track new orders</li>
                <li>Save items to your Wish List</li>
              </ul>
              <button className="button button-secondary" onClick={() => { setMode('signup'); setStatus(null); }}>Create Account</button>
            </>
          ) : (
            <>
              <h2 className="account-sub-heading">Already have an account?</h2>
              <button className="button button-secondary" onClick={() => { setMode('login'); setStatus(null); }}>Sign in</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
