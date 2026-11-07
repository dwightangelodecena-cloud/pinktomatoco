import { useCallback, useEffect, useState } from 'react';

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

export function Panel({ title, intro, actions, children }) {
  return (
    <section className="admin-panel">
      <header className="admin-panel-head">
        <div>
          <h2>{title}</h2>
          {intro && <p>{intro}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

export function Filter({ options, value, onChange, label }) {
  return (
    <div className="admin-filter" role="group" aria-label={label}>
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
