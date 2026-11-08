import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { submitReview } from '../lib/api.js';
import { CloseIcon, Star } from './Icons.jsx';

export default function ReviewModal({ product, onClose }) {
  const [form, setForm] = useState({ rating: 0, name: '', email: '', subject: '', comments: '' });
  const [status, setStatus] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.rating) {
      setStatus({ type: 'error', text: 'Please choose a rating.' });
      return;
    }
    setStatus({ type: 'pending' });
    try {
      await submitReview({ ...form, product_id: product.id });
      setStatus({ type: 'success', text: 'Thank you! Your review has been submitted and will appear once approved.' });
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal review-modal" role="dialog" aria-modal="true" aria-label="Write a Review" onClick={(e) => e.stopPropagation()}>
        <button className="icon-button modal-close" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        <h2 className="modal-heading">Write a Review</h2>
        <div className="review-product">
          <img src={product.images?.[0]} alt="" />
          <span>{product.name}</span>
        </div>
        {status?.type === 'success' ? (
          <p className="form-message success">{status.text}</p>
        ) : (
          <form className="form" onSubmit={submit}>
            <div className="form-field">
              <span className="form-field-title">Your Rating <span className="required-text">Required</span></span>
              <div className="rating-input" role="radiogroup" aria-label="Your Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    role="radio"
                    aria-checked={form.rating === n}
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, rating: n }))}
                  >
                    <Star filled={n <= form.rating} />
                  </button>
                ))}
              </div>
            </div>
            <Field label="Name" autoComplete="name" value={form.name} onChange={set('name')} />
            <Field label="Email Address" type="email" autoComplete="email" value={form.email} onChange={set('email')} />
            <Field label="Subject" value={form.subject} onChange={set('subject')} />
            <label className="form-field">
              <span className="form-field-title">Comments <span className="required-text">Required</span></span>
              <textarea className="form-input" rows="5" required value={form.comments} onChange={set('comments')} />
            </label>
            {status?.type === 'error' && <p className="form-message error">{status.text}</p>}
            <button className="button button-primary" type="submit" disabled={status?.type === 'pending'}>Submit Review</button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}

function Field({ label, type = 'text', autoComplete, value, onChange }) {
  return (
    <label className="form-field">
      <span className="form-field-title">{label} <span className="required-text">Required</span></span>
      <input className="form-input" type={type} required autoComplete={autoComplete} value={value} onChange={onChange} />
    </label>
  );
}
