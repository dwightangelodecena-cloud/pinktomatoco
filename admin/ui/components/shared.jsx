import { useCallback, useEffect, useRef, useState } from 'react';
import { useSlidePill } from '../lib/slidePill.js';
import { ChevronDown, SearchIcon } from '../Icons.jsx';

// Loads a list for a tab. `setData` lets a tab update a row after saving without refetching.
export function useAdminData(load) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    setError('');
    return load().then(setData).catch((err) => setError(err.message));
  }, [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, setData, error, setError, reload };
}

// A tab's page: an icon badge, a title, a one-line explanation in plain words, and optional buttons.
export function Panel({ title, intro, actions, icon, children }) {
  return (
    <section className="admin-panel">
      <header className="admin-panel-head">
        <div className="admin-panel-title">
          {icon && <span className="admin-panel-icon" aria-hidden="true">{icon}</span>}
          <div>
            <h2>{title}</h2>
            {intro && <p>{intro}</p>}
          </div>
        </div>
        {actions && <div className="admin-panel-actions">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

// A row of summary boxes, styled like the Dashboard's.
export function StatTiles({ items }) {
  return (
    <div className={`dash-tiles admin-stat-tiles ${items.length >= 4 ? 'is-4' : 'is-2'}`}>
      {items.map((t) => (
        <div key={t.label} className={`dash-tile is-static ${t.tone ? `is-${t.tone}` : ''}`}>
          <span className="dash-tile-label">{t.label}</span>
          <strong className="dash-tile-value">{t.value}</strong>
          {t.note && <span className="dash-tile-note">{t.note}</span>}
        </div>
      ))}
    </div>
  );
}

// Shown when a list has nothing in it yet: what will appear here, and why.
export function EmptyState({ icon, title, children, action }) {
  return (
    <div className="admin-empty-state">
      {icon && <span className="admin-empty-icon" aria-hidden="true">{icon}</span>}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

// A short "How this works" guide that opens and closes.
export function HowTo({ title = 'How this works', steps, open = false }) {
  return (
    <details className="admin-howto" open={open}>
      <summary>{title}<ChevronDown size={16} /></summary>
      <ol>
        {steps.map((s) => <li key={s}>{s}</li>)}
      </ol>
    </details>
  );
}

// A round badge with someone's initials, in one of a few warm colours picked from their name.
const AVATAR_TONES = ['#f6d9d3', '#f3e1c7', '#dfe8d6', '#e6dcef', '#d9e6ef', '#f2d6e2'];
export function Avatar({ name }) {
  const clean = String(name || '?').replace(/@.*/, '').replace(/[^A-Za-z\s._-]/g, ' ').trim();
  const parts = clean.split(/[\s._-]+/).filter(Boolean);
  const initials = ((parts[0] || '?')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  let h = 0;
  for (let i = 0; i < clean.length; i++) h = (h * 31 + clean.charCodeAt(i)) | 0;
  return <span className="admin-avatar" style={{ background: AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length] }} aria-hidden="true">{initials}</span>;
}

// A search box with a magnifying glass.
export function SearchBox({ value, onChange, placeholder, label }) {
  return (
    <label className="admin-searchbox">
      <SearchIcon size={18} />
      <input className="form-input" type="search" aria-label={label || placeholder} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function Filter({ options, value, onChange, label }) {
  const ref = useRef(null);
  useSlidePill(ref, '[aria-pressed="true"]', [value, options.length]);
  return (
    <div className="admin-filter" role="group" aria-label={label} ref={ref}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}{o.count != null && <span>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export const Empty = ({ children }) => <p className="admin-empty">{children}</p>;
export const Problem = ({ children }) => (children ? <p className="form-message error" role="alert">{children}</p> : null);
export const Loading = () => <div className="skeleton skeleton-block" aria-label="Loading" />;
export const formatDate = (value) => new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
