import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getCounts } from '../lib/adminApi.js';
import OverviewTab from '../components/admin/OverviewTab.jsx';
import OrdersTab from '../components/admin/OrdersTab.jsx';
import CustomersTab from '../components/admin/CustomersTab.jsx';
import SalesTab from '../components/admin/SalesTab.jsx';
import ProductsTab from '../components/admin/ProductsTab.jsx';
import ReviewsTab from '../components/admin/ReviewsTab.jsx';
import MessagesTab from '../components/admin/MessagesTab.jsx';
import SubscribersTab from '../components/admin/SubscribersTab.jsx';
import AccountTab from '../components/admin/AccountTab.jsx';
import {
  BarChartIcon, CloseIcon, GridIcon, HeartIcon, LogOutIcon, MailIcon, MenuIcon, PackageIcon,
  Star, StoreIcon, TagIcon, UserIcon, UsersIcon,
} from '../components/Icons.jsx';
import '../admin.css';

const GROUPS = [
  {
    label: 'Store',
    tabs: [
      { id: 'dashboard', label: 'Dashboard', Icon: GridIcon, Panel: OverviewTab },
      { id: 'orders', label: 'Orders', Icon: PackageIcon, Panel: OrdersTab, badge: 'pendingOrders' },
      { id: 'customers', label: 'Customers', Icon: UsersIcon, Panel: CustomersTab },
      { id: 'sales', label: 'Sales', Icon: BarChartIcon, Panel: SalesTab },
    ],
  },
  {
    label: 'Catalog',
    tabs: [
      { id: 'products', label: 'Products', Icon: TagIcon, Panel: ProductsTab },
      { id: 'reviews', label: 'Reviews', Icon: Star, Panel: ReviewsTab, badge: 'waitingReviews' },
    ],
  },
  {
    label: 'Audience',
    tabs: [
      { id: 'messages', label: 'Messages', Icon: MailIcon, Panel: MessagesTab, badge: 'openMessages' },
      { id: 'subscribers', label: 'Subscribers', Icon: HeartIcon, Panel: SubscribersTab },
    ],
  },
  {
    label: 'Settings',
    tabs: [{ id: 'account', label: 'Account', Icon: UserIcon, Panel: AccountTab }],
  },
];
const TABS = GROUPS.flatMap((g) => g.tabs);

function Dashboard({ signOut }) {
  const [params] = useSearchParams();
  const tab = TABS.find((t) => t.id === params.get('tab')) || TABS[0];
  const [counts, setCounts] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const refreshCounts = useCallback(() => {
    getCounts().then(setCounts).catch(() => {});
  }, []);
  useEffect(refreshCounts, [refreshCounts]);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
    document.title = `${tab.label} - Pink Tomato admin`;
    return () => {
      document.title = 'Pink Tomato Candle & Bath Co.';
    };
  }, [tab]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="admin-shell">
      <div className="admin-topbar">
        <button className="icon-button" aria-label="Open admin menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><MenuIcon /></button>
        <span>{tab.label}</span>
      </div>

      <div className={`admin-backdrop ${menuOpen ? 'is-open' : ''}`} onClick={() => setMenuOpen(false)} />

      <aside className={`admin-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="admin-brand">
          <Link to="?tab=dashboard"><img src="/images/logo.png" alt="Pink Tomato admin" /></Link>
          <button className="icon-button admin-menu-close" aria-label="Close admin menu" onClick={() => setMenuOpen(false)}><CloseIcon /></button>
        </div>

        <nav className="admin-nav" aria-label="Admin sections">
          {GROUPS.map((g) => (
            <div key={g.label}>
              <p>{g.label}</p>
              {g.tabs.map((t) => (
                <Link key={t.id} to={`?tab=${t.id}`} aria-current={t.id === tab.id ? 'page' : undefined}>
                  <t.Icon size={18} /> {t.label}
                  {t.badge && counts?.[t.badge] > 0 && <span className="admin-badge">{counts[t.badge]}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          <Link to="/"><StoreIcon size={18} /> View store</Link>
          <button type="button" onClick={signOut}><LogOutIcon size={18} /> Log out</button>
        </div>
      </aside>

      <main className="admin-main">
        <tab.Panel key={tab.id} counts={counts} onChange={refreshCounts} />
      </main>
    </div>
  );
}

export default function Admin() {
  const { user, isAdmin, ready, signOut } = useAuth();

  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Dashboard signOut={signOut} />;
}
