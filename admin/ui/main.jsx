import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { api, setSession, takeSession } from './api.js';
import Admin from './Admin.jsx';
import './site.css';
import './admin.css';
import './extra.css';

function App() {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    const session = takeSession();
    if (!session) {
      setState({ status: 'signed-out' });
      return;
    }
    setSession(session);
    api('/api/me')
      .then((me) => setState({ status: 'ready', me }))
      .catch((err) => setState({ status: 'error', message: err.message }));
  }, []);

  if (state.status === 'loading') return <div className="admin-gate"><div className="skeleton skeleton-block" aria-label="Loading" /></div>;
  if (state.status !== 'ready') {
    return (
      <div className="admin-gate">
        <img src="/logo.webp" alt="Pink Tomato" />
        <h1>Pink Tomato admin</h1>
        <p>{state.status === 'error' ? state.message : 'Please open the admin from Apps in the BigCommerce control panel.'}</p>
        {['localhost', '127.0.0.1'].includes(window.location.hostname) && (
          <a className="button button-primary" href="/dev-login">Open the local admin</a>
        )}
      </div>
    );
  }
  return <BrowserRouter><Admin me={state.me} /></BrowserRouter>;
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
