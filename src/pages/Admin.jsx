import { useCallback, useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getCounts } from '../lib/adminApi.js';
import NotFound from './NotFound.jsx';
import OverviewTab from '../components/admin/OverviewTab.jsx';
import OrdersTab from '../components/admin/OrdersTab.jsx';
import ProductsTab from '../components/admin/ProductsTab.jsx';
import ReviewsTab from '../components/admin/ReviewsTab.jsx';
import MessagesTab from '../components/admin/MessagesTab.jsx';
import SubscribersTab from '../components/admin/SubscribersTab.jsx';
import { GridIcon, HeartIcon, HomeIcon, MailIcon, PackageIcon, Star, TagIcon } from '../components/Icons.jsx';
import '../admin.css';

const TABS = [
  { id: 'overview', label: 'Overview', Icon: HomeIcon, Panel: OverviewTab },
  { id: 'orders', label: 'Orders', Icon: PackageIcon, Panel: OrdersTab, badge: 'pendingOrders' },
  { id: 'products', label: 'Products', Icon: TagIcon, Panel: ProductsTab },
  { id: 'reviews', label: 'Reviews', Icon: Star, Panel: ReviewsTab, badge: 'waitingReviews' },
  { id: 'messages', label: 'Messages', Icon: MailIcon, Panel: MessagesTab, badge: 'openMessages' },
  { id: 'subscribers', label: 'Subscribers', Icon: HeartIcon, Panel: SubscribersTab },
];

function Dashboard() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.id === params.get('tab')) || TABS[0];
  const [counts, setCounts] = useState(null);

  const refreshCounts = useCallback(() => {
    getCounts().then(setCounts).catch(() => {});
  }, []);
  useEffect(refreshCounts, [refreshCounts]);

  return (
    <div className="container page admin-page">
      <header className="admin-header">
        <p className="eyebrow"><GridIcon size={14} /> Store admin</p>
        <h1>Pink Tomato admin</h1>
      </header>

      <nav className="admin-tabs" aria-label="Admin sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={t.id === tab.id ? 'page' : undefined}
            onClick={() => setParams({ tab: t.id })}
          >
            <t.Icon size={17} /> {t.label}
            {t.badge && counts?.[t.badge] > 0 && <span className="admin-badge">{counts[t.badge]}</span>}
          </button>
        ))}
      </nav>

      <tab.Panel key={tab.id} counts={counts} onChange={refreshCounts} />
    </div>
  );
}

export default function Admin() {
  const { user, isAdmin, ready } = useAuth();

  if (!ready) return <div className="container page"><div className="skeleton skeleton-block" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <NotFound />;
  return <Dashboard />;
}
