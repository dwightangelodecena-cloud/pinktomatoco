import { useState } from 'react';
import { STORE_URL, deleteReview, getAdminReviews, setReviewApproved } from '../lib/adminApi.js';
import { Star } from '../Icons.jsx';
import { Empty, Filter, Loading, Panel, Problem, formatDate, useAdminData } from './shared.jsx';

export default function ReviewsTab({ onChange }) {
  const { data: reviews, setData, error, setError } = useAdminData(getAdminReviews);
  const [filter, setFilter] = useState('waiting');

  const act = async (fn, apply) => {
    setError('');
    try {
      await fn();
      setData(apply);
      onChange();
    } catch (err) {
      setError(err.message);
    }
  };

  const approve = (r, approved) =>
    act(() => setReviewApproved(r, approved), (list) => list.map((x) => (x.id === r.id ? { ...x, approved } : x)));

  const remove = (r) => {
    if (!window.confirm(`Delete this review from ${r.name}? This can't be undone.`)) return;
    act(() => deleteReview(r), (list) => list.filter((x) => x.id !== r.id));
  };

  const waiting = reviews?.filter((r) => !r.approved) ?? [];
  const published = reviews?.filter((r) => r.approved) ?? [];
  const shown = filter === 'waiting' ? waiting : published;

  return (
    <Panel title="Reviews" intro="Reviews only appear on the shop after you approve them.">
      <Filter
        label="Filter reviews"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'waiting', label: 'Waiting', count: waiting.length },
          { value: 'published', label: 'Published', count: published.length },
        ]}
      />
      <Problem>{error}</Problem>
      {!reviews && !error && <Loading />}
      {reviews && shown.length === 0 && <Empty>{filter === 'waiting' ? 'No reviews are waiting.' : 'No published reviews yet.'}</Empty>}
      <div className="admin-list">
        {shown.map((r) => (
          <article key={r.id} className="admin-card">
            <div className="admin-card-top">
              <span className="stars" role="img" aria-label={`${r.rating} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((n) => <Star key={n} filled={n <= r.rating} />)}
              </span>
              {r.product && <a href={`${STORE_URL}/${r.product.slug}/`} target="_blank" rel="noreferrer">{r.product.name}</a>}
            </div>
            <h3>{r.subject}</h3>
            <p>{r.comments}</p>
            <p className="admin-muted">{r.name} · {formatDate(r.created_at)}</p>
            <div className="admin-actions">
              {r.approved ? (
                <button className="button button-secondary button-small" onClick={() => approve(r, false)}>Unpublish</button>
              ) : (
                <button className="button button-primary button-small" onClick={() => approve(r, true)}>Approve</button>
              )}
              <button className="link-button" onClick={() => remove(r)}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}
