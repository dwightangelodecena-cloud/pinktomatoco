import { useState } from 'react';
import { STORE_URL, deleteReview, getAdminReviews, setReviewApproved } from '../lib/adminApi.js';
import { CheckIcon, EyeOffIcon, Star, TrashIcon } from '../Icons.jsx';
import { Avatar, EmptyState, Filter, HowTo, Loading, Panel, Problem, StatTiles, formatDate, useAdminData } from './shared.jsx';

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
  const average = published.length ? (published.reduce((n, r) => n + Number(r.rating || 0), 0) / published.length).toFixed(1) : '–';

  return (
    <Panel title="Reviews" icon={<Star size={22} />} intro="What customers say about your candles. A review only shows on the shop after you approve it.">
      {reviews && reviews.length > 0 && (
        <StatTiles items={[
          { label: 'Waiting for you', value: waiting.length, note: 'Read and approve', tone: waiting.length ? 'alert' : '' },
          { label: 'On the shop', value: published.length, note: 'Approved reviews' },
          { label: 'Average rating', value: average, note: published.length ? 'Out of 5 stars' : 'Once reviews are approved' },
        ]} />
      )}
      <HowTo steps={[
        'When a customer reviews a candle, it waits here first.',
        'Read it, then tap "Approve" to show it on that candle\'s page.',
        'Changed your mind? Tap "Hide from shop". Spam or rude ones can be deleted.',
      ]} />
      <Filter
        label="Filter reviews"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'waiting', label: 'Waiting for you', count: waiting.length },
          { value: 'published', label: 'On the shop', count: published.length },
        ]}
      />
      <Problem>{error}</Problem>
      {!reviews && !error && <Loading />}
      {reviews && shown.length === 0 && (
        filter === 'waiting'
          ? <EmptyState icon={<CheckIcon size={28} />} title="You're all caught up">New reviews will wait here until you approve them.</EmptyState>
          : <EmptyState icon={<Star size={28} />} title="No reviews on the shop yet">Reviews you approve show here and on each candle's page.</EmptyState>
      )}
      <div className="admin-list admin-reviews">
        {shown.map((r) => (
          <article key={r.id} className="admin-card admin-review">
            <div className="admin-review-head">
              <Avatar name={r.name} />
              <span className="admin-person">
                <strong>{r.name || 'A customer'}</strong>
                <small>{formatDate(r.created_at)}</small>
              </span>
              <span className="stars" role="img" aria-label={`${r.rating} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((n) => <Star key={n} filled={n <= r.rating} size={16} />)}
              </span>
            </div>
            {r.subject && <h3>{r.subject}</h3>}
            {r.comments && <p className="admin-review-text">{r.comments}</p>}
            {r.product && <a className="admin-chip is-link" href={`${STORE_URL}/${r.product.slug}/`} target="_blank" rel="noreferrer">{r.product.name}</a>}
            <div className="admin-actions">
              {r.approved ? (
                <button className="button button-secondary button-small" onClick={() => approve(r, false)}><EyeOffIcon size={16} /> Hide from shop</button>
              ) : (
                <button className="button button-primary button-small" onClick={() => approve(r, true)}><CheckIcon size={16} /> Approve</button>
              )}
              <button className="link-button admin-delete" onClick={() => remove(r)}><TrashIcon size={15} /> Delete</button>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}
