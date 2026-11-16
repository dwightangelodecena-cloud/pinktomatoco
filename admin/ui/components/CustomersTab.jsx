import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { deleteCustomer, getCustomers, getProfile, getRecentOrders } from '../lib/adminApi.js';
import { mergeCustomers } from '../lib/adminStats.js';
import { money } from '../lib/pricing.js';
import { CloseIcon, LockIcon, TrashIcon, UsersIcon } from '../Icons.jsx';
import { Avatar, EmptyState, Loading, Panel, PinInput, Problem, SearchBox, StatTiles, formatDate, useAdminData } from './shared.jsx';

const loadCustomers = async () => {
  const [accounts, orders] = await Promise.all([getCustomers(), getRecentOrders(365)]);
  return mergeCustomers(accounts, orders);
};

// "Delete this customer?" — needs the admin's 6-digit security code (set on the Profile tab).
function DeleteCustomer({ customer, onClose, onDeleted }) {
  const [pin, setPin] = useState('');
  const [pinSet, setPinSet] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getProfile().then((p) => setPinSet(p.pinSet)).catch(() => setPinSet(true));
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const remove = async (e) => {
    e.preventDefault();
    if (pin.length !== 6) return setError('Type your 6-number security code.');
    setBusy(true);
    setError('');
    try {
      await deleteCustomer(customer.id, pin);
      onDeleted(customer);
    } catch (err) {
      setError(err.message);
      setPin('');
      setBusy(false);
    }
  };

  // Drawn on <body> so the dark backdrop covers the whole screen, menu included.
  return createPortal(
    <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="delete-customer-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="admin-modal-card" onSubmit={remove}>
        <button type="button" className="admin-modal-close" aria-label="Close" onClick={onClose}><CloseIcon size={18} /></button>
        <span className="admin-modal-icon is-danger" aria-hidden="true"><TrashIcon size={24} /></span>
        <h3 id="delete-customer-title">Delete {customer.name || customer.email}?</h3>
        <p>
          Their account is removed, so they can't sign in, and their saved addresses and wishlist are gone.
          Their past orders stay in Orders. <strong>This can't be undone.</strong>
        </p>
        <div className="admin-modal-who">
          <Avatar name={customer.name || customer.email} />
          <span className="admin-person"><strong>{customer.name}</strong><small>{customer.email}</small></span>
        </div>
        {pinSet === false ? (
          <div className="admin-modal-note">
            <LockIcon size={18} />
            <span>To delete customers, first set your security code. <Link to="?tab=profile">Go to Profile</Link></span>
          </div>
        ) : (
          <PinInput label="Your security code" value={pin} onChange={(v) => { setPin(v); setError(''); }} autoFocus hint="The 6 numbers you set on the Profile tab." />
        )}
        <Problem>{error}</Problem>
        <div className="admin-modal-actions">
          <button type="button" className="button button-secondary button-small" onClick={onClose}>Keep customer</button>
          <button type="submit" className="button button-small admin-danger-button" disabled={busy || pinSet === false || pin.length !== 6}>
            <TrashIcon size={16} /> {busy ? 'Deleting…' : 'Delete customer'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

export default function CustomersTab() {
  const { data: customers, setData, error } = useAdminData(loadCustomers);
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [notice, setNotice] = useState('');

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () => (customers || []).filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)),
    [customers, q]
  );
  const list = customers || [];
  const buyers = list.filter((c) => c.orders > 0).length;
  const repeat = list.filter((c) => c.orders > 1).length;
  const spent = list.reduce((n, c) => n + c.spent, 0);

  const onDeleted = (customer) => {
    setData((all) => all.filter((c) => c.email !== customer.email));
    setDeleting(null);
    setNotice(`${customer.name || customer.email} was deleted.`);
  };

  return (
    <Panel title="Customers" icon={<UsersIcon size={22} />} intro="Everyone who made an account or placed an order. Your best customers are at the top.">
      {notice && <p className="form-message success" role="status">{notice}</p>}
      {list.length > 0 && (
        <StatTiles items={[
          { label: 'Customers', value: list.length, note: 'Accounts and shoppers' },
          { label: 'Have ordered', value: buyers, note: 'In the last 12 months' },
          { label: 'Came back', value: repeat, note: 'Ordered more than once' },
          { label: 'Spent in total', value: money(spent), note: 'In the last 12 months' },
        ]} />
      )}
      {list.length > 0 && <SearchBox value={query} onChange={setQuery} placeholder="Search by name or email" />}
      <Problem>{error}</Problem>
      {!customers && !error && <Loading />}
      {customers && shown.length === 0 && (
        <EmptyState icon={<UsersIcon size={28} />} title={list.length === 0 ? 'No customers yet' : 'Nobody matches that search'}>
          {list.length === 0 ? 'People who make an account or buy from your shop will show up here.' : 'Try part of their name or email.'}
        </EmptyState>
      )}
      {shown.length > 0 && (
        <ul className="admin-people">
          {shown.map((c, i) => (
            <li key={c.email}>
              <Avatar name={c.name || c.email} />
              <span className="admin-person">
                <strong>
                  {c.name || 'No name given'}
                  {!q && i < 3 && c.spent > 0 && <span className="admin-tag">Top customer</span>}
                  {c.protected && <span className="admin-tag is-admin">Admin</span>}
                </strong>
                <a href={`mailto:${c.email}`}>{c.email}</a>
              </span>
              <span className="admin-person-meta">
                <span className="admin-chip">{c.orders} order{c.orders === 1 ? '' : 's'}</span>
                <small>{c.lastOrder ? `Last order ${formatDate(c.lastOrder)}` : c.joined ? `Joined ${formatDate(c.joined)}` : ''}</small>
              </span>
              <strong className="admin-person-spent">{money(c.spent)}<small>spent</small></strong>
              {/* Only real accounts can be deleted, and never an admin's own account. */}
              {c.id && !c.protected ? (
                <button type="button" className="admin-row-delete" aria-label={`Delete ${c.name || c.email}`} title="Delete customer" onClick={() => { setNotice(''); setDeleting(c); }}>
                  <TrashIcon size={16} />
                </button>
              ) : <span className="admin-row-delete is-placeholder" aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
      {deleting && <DeleteCustomer customer={deleting} onClose={() => setDeleting(null)} onDeleted={onDeleted} />}
    </Panel>
  );
}
