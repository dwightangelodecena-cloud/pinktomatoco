import { useState } from 'react';
import { getProfile, resetPin, sendPinReset, setPin } from '../lib/adminApi.js';
import { LockIcon, MailIcon, ShieldCheckIcon, UserIcon } from '../Icons.jsx';
import { Avatar, HowTo, Loading, Panel, PinInput, Problem, formatDate, useAdminData } from './shared.jsx';

// Set, change or reset the 6-digit security code. Each admin has their own.
function SecurityCode({ profile, onSaved }) {
  const [mode, setMode] = useState(profile.pinSet ? 'idle' : 'set'); // idle | set | change | reset
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const clear = () => { setCurrent(''); setNext(''); setAgain(''); setEmailCode(''); setError(''); };
  const go = (m) => { clear(); setDone(''); setSent(false); setMode(m); };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    if (next.length !== 6) return setError('Your new code must be 6 numbers.');
    if (next !== again) return setError('The two new codes don\'t match.');
    if (/^(\d)\1{5}$/.test(next) || '0123456789'.includes(next) || '9876543210'.includes(next)) return setError('Pick something harder to guess than repeated or counting numbers.');
    setBusy(true);
    try {
      const status = mode === 'reset' ? await resetPin(emailCode, next) : await setPin(current, next);
      onSaved(status);
      clear();
      setMode('idle');
      setDone(profile.pinSet ? 'Your security code was changed.' : 'Your security code is set.');
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const emailMe = async () => {
    setError('');
    setBusy(true);
    try {
      await sendPinReset();
      setSent(true);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  if (mode === 'idle') {
    return (
      <div className="profile-code">
        <div className="profile-code-status">
          <span className="profile-code-badge is-on"><ShieldCheckIcon size={18} /> Security code is on</span>
          {profile.pinUpdated && <small>Last changed {formatDate(profile.pinUpdated)}</small>}
        </div>
        {done && <p className="form-message success" role="status">{done}</p>}
        <div className="profile-actions">
          <button type="button" className="button button-primary button-small" onClick={() => go('change')}>Change code</button>
          {profile.canEmailReset && <button type="button" className="link-button" onClick={() => go('reset')}>Forgot your code?</button>}
        </div>
      </div>
    );
  }

  return (
    <form className="profile-code" onSubmit={save}>
      {mode === 'set' && <p className="profile-code-intro">Choose 6 numbers you'll remember. You'll type them whenever you delete a customer.</p>}
      {mode === 'change' && (
        <PinInput label="Current code" value={current} onChange={setCurrent} autoFocus />
      )}
      {mode === 'reset' && (
        <div className="profile-reset">
          <p className="profile-code-intro">We'll email a one-time code to <strong>{profile.email}</strong>. Use it to choose a new security code.</p>
          <button type="button" className="button button-secondary button-small" onClick={emailMe} disabled={busy}>
            <MailIcon size={16} /> {sent ? 'Send it again' : 'Email me a code'}
          </button>
          {sent && <p className="form-message success" role="status">Sent. Check your inbox (and spam folder). The code works for 10 minutes.</p>}
          {sent && <PinInput label="Code from the email" value={emailCode} onChange={setEmailCode} autoFocus />}
        </div>
      )}
      {(mode !== 'reset' || sent) && (
        <div className="profile-pin-grid">
          <PinInput label={mode === 'set' ? 'New code' : 'New code'} value={next} onChange={setNext} autoFocus={mode === 'set'} />
          <PinInput label="Type it again" value={again} onChange={setAgain} />
        </div>
      )}
      <Problem>{error}</Problem>
      <div className="profile-actions">
        {(mode !== 'reset' || sent) && (
          <button type="submit" className="button button-primary button-small" disabled={busy}>
            <LockIcon size={16} /> {busy ? 'Saving…' : mode === 'set' ? 'Turn on security code' : 'Save new code'}
          </button>
        )}
        {profile.pinSet && <button type="button" className="link-button" onClick={() => go('idle')}>Cancel</button>}
      </div>
    </form>
  );
}

export default function ProfileTab() {
  const { data: profile, setData, error } = useAdminData(getProfile);

  return (
    <Panel title="Profile" icon={<UserIcon size={22} />} intro="Your sign-in and your security code.">
      <Problem>{error}</Problem>
      {!profile && !error && <Loading />}
      {profile && (
        <div className="profile-grid">
          <section className="dash-card profile-card">
            <h4>Signed in as</h4>
            <div className="profile-who">
              <Avatar name={profile.email} />
              <span className="admin-person">
                <strong>{profile.email || 'Admin'}</strong>
                <small>Admin of Pink Tomato Candle &amp; Bath Co.</small>
              </span>
            </div>
            <p className="dash-card-sub">To sign out, use Log out at the bottom of the menu.</p>
          </section>

          <section className="dash-card profile-card">
            <h4>Security code</h4>
            <p className="dash-card-sub">
              A 6-number code only you know. It's asked for before a customer is deleted, so nobody can remove
              customers by accident or from a computer you left signed in.
            </p>
            <SecurityCode profile={profile} onSaved={(status) => setData((p) => ({ ...p, ...status }))} />
          </section>

          <div className="profile-help">
            <HowTo
              title="Good to know"
              steps={[
                'Each admin has their own code. Theresa\'s and Dwight\'s are separate.',
                'After 5 wrong tries, the code is locked for 15 minutes.',
                'Forgot it? Use "Forgot your code?" and we\'ll email you a one-time code to choose a new one.',
                'The code is stored scrambled. Nobody, not even us, can read it back.',
              ]}
            />
          </div>
        </div>
      )}
    </Panel>
  );
}
