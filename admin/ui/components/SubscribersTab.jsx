import { useState } from 'react';
import { getSubscribers } from '../lib/adminApi.js';
import { MailIcon } from '../Icons.jsx';
import { Avatar, EmptyState, Loading, Panel, Problem, SearchBox, StatTiles, formatDate, useAdminData } from './shared.jsx';

// A spreadsheet file (opens in Excel, Numbers or Google Sheets).
function downloadSheet(subscribers) {
  const lines = ['email,joined', ...subscribers.map((s) => `"${s.email.replace(/"/g, '""')}",${s.created_at.slice(0, 10)}`)];
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'pink-tomato-subscribers.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function SubscribersTab() {
  const { data: subscribers, error } = useAdminData(getSubscribers);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState('');

  const list = subscribers || [];
  const q = query.trim().toLowerCase();
  const shown = list.filter((s) => !q || s.email.toLowerCase().includes(q));
  const now = new Date();
  const thisMonth = list.filter((s) => { const d = new Date(s.created_at); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); }).length;

  // Every email on one line, ready to paste into the "Bcc" box of an email.
  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(list.map((s) => s.email).join(', '));
      setCopied('Copied. Paste them into the "Bcc" box of a new email so everyone stays private.');
    } catch (e) {
      setCopied('Your browser blocked copying. Use "Download spreadsheet" instead.');
    }
  };

  return (
    <Panel
      title="Subscribers"
      icon={<MailIcon size={22} />}
      intro="People who signed up for your newsletter at the bottom of the website."
      actions={list.length > 0 && (
        <>
          <button type="button" className="button button-primary button-small" onClick={copyAll}>Copy all emails</button>
          <button type="button" className="button button-secondary button-small" onClick={() => downloadSheet(list)}>Download spreadsheet</button>
        </>
      )}
    >
      {copied && <p className="form-message success" role="status">{copied}</p>}
      {list.length > 0 && (
        <StatTiles items={[
          { label: 'Subscribers', value: list.length, note: 'On your newsletter list' },
          { label: 'New this month', value: thisMonth, note: 'Joined since the 1st' },
        ]} />
      )}
      {list.length > 5 && <SearchBox value={query} onChange={setQuery} placeholder="Search by email" />}
      <Problem>{error}</Problem>
      {!subscribers && !error && <Loading />}
      {subscribers && shown.length === 0 && (
        <EmptyState icon={<MailIcon size={28} />} title={list.length === 0 ? 'No subscribers yet' : 'Nobody matches that search'}>
          {list.length === 0 ? 'When someone joins your newsletter at the bottom of the website, they show up here.' : 'Try part of the email address.'}
        </EmptyState>
      )}
      {shown.length > 0 && (
        <ul className="admin-people">
          {shown.map((s) => (
            <li key={s.id}>
              <Avatar name={s.email} />
              <span className="admin-person">
                <a href={`mailto:${s.email}`}>{s.email}</a>
              </span>
              <span className="admin-person-meta"><small>Joined {formatDate(s.created_at)}</small></span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
