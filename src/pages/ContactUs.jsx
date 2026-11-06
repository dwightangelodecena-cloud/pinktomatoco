import { useState } from 'react';
import { sendContactMessage } from '../lib/api.js';

const empty = { full_name: '', phone: '', email: '', order_number: '', company_name: '', rma_number: '', comments: '' };

export default function ContactUs() {
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ type: 'pending' });
    try {
      await sendContactMessage(form);
      setForm(empty);
      setStatus({ type: 'success', text: "Thank you. We've received your message and will respond shortly." });
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="container page page-narrow">
      <h1 className="page-heading">Contact Us</h1>
      <p>We're happy to answer questions or help you with returns.</p>

      <form className="form contact-form" onSubmit={submit}>
        <div className="form-row">
          <Field label="Full Name" required value={form.full_name} onChange={set('full_name')} />
          <Field label="Phone Number" type="tel" value={form.phone} onChange={set('phone')} />
        </div>
        <div className="form-row">
          <Field label="Email Address" type="email" required value={form.email} onChange={set('email')} />
          <Field label="Order Number" value={form.order_number} onChange={set('order_number')} />
        </div>
        <div className="form-row">
          <Field label="Company Name" value={form.company_name} onChange={set('company_name')} />
          <Field label="RMA Number" value={form.rma_number} onChange={set('rma_number')} />
        </div>
        <label className="form-field">
          <span className="form-field-title">Comments/Questions <span className="required-text">Required</span></span>
          <textarea className="form-input" rows="6" required value={form.comments} onChange={set('comments')} />
        </label>
        {status?.text && <p className={`form-message ${status.type}`}>{status.text}</p>}
        <button className="button button-primary" type="submit" disabled={status?.type === 'pending'}>Submit Form</button>
      </form>
    </div>
  );
}

function Field({ label, required, type = 'text', value, onChange }) {
  return (
    <label className="form-field">
      <span className="form-field-title">
        {label} {required && <span className="required-text">Required</span>}
      </span>
      <input className="form-input" type={type} required={required} value={value} onChange={onChange} />
    </label>
  );
}
