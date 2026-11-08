import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PasswordRules, { PASSWORD_ERROR, passwordIsValid } from '../components/PasswordRules.jsx';
import { CheckIcon, LockIcon } from '../components/Icons.jsx';
import { customerRequest } from '../lib/api.js';

// Opens from BigCommerce's reset email, which adds the customer number (c) and a one-time code (t).
export default function ResetPassword() {
  const [params] = useSearchParams();
  const customerId = Number(params.get('c'));
  const token = params.get('t') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState(null);
  const linkWorks = Number.isInteger(customerId) && customerId > 0 && token.length > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!passwordIsValid(password)) return setStatus({ type: 'error', text: PASSWORD_ERROR });
    if (password !== confirm) return setStatus({ type: 'error', text: 'Passwords do not match.' });
    setStatus({ type: 'pending' });
    try {
      await customerRequest({ action: 'reset', customerId, token, password });
      setStatus({ type: 'done' });
    } catch (err) {
      setStatus({ type: 'error', text: err.message, expired: /expired|already used|not complete/.test(err.message) });
    }
  };

  return (
    <div className="container page page-narrow">
      <div className="auth-card reset-card">
        {status?.type === 'done' ? (
          <div className="auth-sent">
            <span className="auth-sent-icon"><CheckIcon size={30} /></span>
            <h1>Password changed</h1>
            <p>You can now sign in with your new password.</p>
            <Link to="/login" className="button button-primary">Sign in</Link>
          </div>
        ) : !linkWorks ? (
          <div className="auth-sent">
            <h1>This link isn't complete</h1>
            <p>Please open the link from your email again, or ask for a new one.</p>
            <Link to="/login?mode=forgot" className="button button-primary">Send a new link</Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <div className="auth-heading">
              <h1>Choose a new password</h1>
              <p>Pick something you haven't used before.</p>
            </div>
            <label className="auth-field">
              <span className="form-field-title">New password</span>
              <span className="auth-input-wrap">
                <LockIcon size={18} />
                <input className="auth-input" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              </span>
              <PasswordRules password={password} />
            </label>
            <label className="auth-field">
              <span className="form-field-title">Confirm new password</span>
              <span className="auth-input-wrap">
                <LockIcon size={18} />
                <input className="auth-input" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </span>
            </label>
            {status?.type === 'error' && (
              <p className="auth-error shake">
                {status.text} {status.expired && <Link to="/login?mode=forgot">Send a new link</Link>}
              </p>
            )}
            <button className="button button-primary auth-submit" type="submit" disabled={status?.type === 'pending'}>
              {status?.type === 'pending' ? 'Saving…' : 'Save password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
