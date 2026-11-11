import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api, setSession, takeSession } from './api.js';

// Starter screen: proves the session and the BigCommerce connection. The full admin replaces it.
function App() {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    const session = takeSession();
    if (!session) {
      setState({ status: 'signed-out' });
      return;
    }
    setSession(session);
    Promise.all([api('/api/me'), api('/api/counts')])
      .then(([me, counts]) => setState({ status: 'ready', me, counts }))
      .catch((err) => setState({ status: 'error', message: err.message }));
  }, []);

  if (state.status === 'loading') return <p>Loading…</p>;
  if (state.status === 'signed-out') return <p>Please open the admin from Apps in the BigCommerce control panel.</p>;
  if (state.status === 'error') return <p role="alert">{state.message}</p>;
  return (
    <main>
      <h1>Pink Tomato admin</h1>
      <p>Signed in as {state.me.email}. Orders to handle: {state.counts.pendingOrders}.</p>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
