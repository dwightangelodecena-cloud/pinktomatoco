import { useState } from 'react';
import { getMessages, setMessageHandled } from '../../lib/adminApi.js';
import { Empty, Filter, Loading, Panel, Problem, formatDate, useAdminData } from './shared.jsx';

export default function MessagesTab({ onChange }) {
  const { data: messages, setData, error, setError } = useAdminData(getMessages);
  const [filter, setFilter] = useState('open');

  const mark = async (m, handled) => {
    setError('');
    try {
      await setMessageHandled(m.id, handled);
      setData((list) => list.map((x) => (x.id === m.id ? { ...x, handled } : x)));
      onChange();
    } catch (err) {
      setError(err.message);
    }
  };

  const open = messages?.filter((m) => !m.handled) ?? [];
  const done = messages?.filter((m) => m.handled) ?? [];
  const shown = filter === 'open' ? open : done;

  return (
    <Panel title="Messages" intro="Questions sent through the Contact Us page.">
      <Filter
        label="Filter messages"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'open', label: 'Open', count: open.length },
          { value: 'handled', label: 'Handled', count: done.length },
        ]}
      />
      <Problem>{error}</Problem>
      {!messages && !error && <Loading />}
      {messages && shown.length === 0 && <Empty>{filter === 'open' ? 'No open messages.' : 'Nothing handled yet.'}</Empty>}
      <div className="admin-list">
        {shown.map((m) => {
          const details = [
            m.phone && `Phone ${m.phone}`,
            m.order_number && `Order ${m.order_number}`,
            m.company_name,
            m.rma_number && `RMA ${m.rma_number}`,
          ].filter(Boolean);
          return (
            <article key={m.id} className="admin-card">
              <div className="admin-card-top">
                <h3>{m.full_name}</h3>
                <span className="admin-muted">{formatDate(m.created_at)}</span>
              </div>
              {details.length > 0 && <p className="admin-muted">{details.join(' · ')}</p>}
              <p className="admin-message">{m.comments}</p>
              <div className="admin-actions">
                <a className="button button-primary button-small" href={`mailto:${m.email}?subject=${encodeURIComponent('Your message to Pink Tomato')}`}>Reply to {m.email}</a>
                <button className="link-button" onClick={() => mark(m, !m.handled)}>{m.handled ? 'Reopen' : 'Mark as handled'}</button>
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}
