import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { changePassword } from '../../lib/adminApi.js';
import PasswordRules, { PASSWORD_ERROR, passwordIsValid } from '../PasswordRules.jsx';
import { Panel } from './shared.jsx';

const EMPTY = { current: '', next: '', confirm: '' };

function Field({ label, autoComplete, value, onChange, children }) {
  return (
    <label className="form-field">
      <span className="form-field-title">{label}</span>
      <input className="form-input" type="password" required autoComplete={autoComplete} value={value} onChange={onChange} />
      {children}
    </label>
  );
}

export default function AccountTab() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!passwordIsValid(form.next)) return setStatus({ type: 'error', text: PASSWORD_ERROR });
    if (form.next !== form.confirm) return setStatus({ type: 'error', text: 'The new passwords do not match.' });
    setStatus({ type: 'pending' });
    try {
      await changePassword(user.email, form.current, form.next);
      setForm(EMPTY);
      setStatus({ type: 'success', text: 'Password changed. Use it next time you sign in.' });
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  return (
    <Panel title="Account" intro={`Signed in as ${user.email}.`}>
      <form className="admin-card admin-account" onSubmit={submit}>
        <h3>Change password</h3>
        <Field label="Current password" autoComplete="current-password" value={form.current} onChange={set('current')} />
        <Field label="New password" autoComplete="new-password" value={form.next} onChange={set('next')}>
          <PasswordRules password={form.next} />
        </Field>
        <Field label="Confirm new password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
        {status?.text && <p className={`form-message ${status.type}`} role="status">{status.text}</p>}
        <button className="button button-primary button-small" type="submit" disabled={status?.type === 'pending'}>Save password</button>
      </form>
    </Panel>
  );
}
