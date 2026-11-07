import { getSubscribers } from '../../lib/adminApi.js';
import { Empty, Loading, Panel, Problem, formatDate, useAdminData } from './shared.jsx';

function downloadCsv(subscribers) {
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

  return (
    <Panel
      title="Subscribers"
      intro="People who joined the newsletter from the footer."
      actions={subscribers?.length > 0 && (
        <button className="button button-secondary button-small" onClick={() => downloadCsv(subscribers)}>Download CSV</button>
      )}
    >
      <Problem>{error}</Problem>
      {!subscribers && !error && <Loading />}
      {subscribers?.length === 0 && <Empty>No subscribers yet.</Empty>}
      {subscribers?.length > 0 && (
        <ul className="admin-mini-list admin-subscribers">
          {subscribers.map((s) => (
            <li key={s.id}>
              <a href={`mailto:${s.email}`}>{s.email}</a>
              <span className="admin-muted">{formatDate(s.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
