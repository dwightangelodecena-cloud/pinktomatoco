import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { STORE_URL, getCounts } from './lib/adminApi.js';
import OverviewTab from './components/OverviewTab.jsx';
import OrdersTab from './components/OrdersTab.jsx';
import CustomersTab from './components/CustomersTab.jsx';
import SalesTab from './components/SalesTab.jsx';
import ProductManager from './components/ProductManager.jsx';
import ReviewsTab from './components/ReviewsTab.jsx';
import ContentTab from './components/ContentTab.jsx';
import SubscribersTab from './components/SubscribersTab.jsx';
import { Panel } from './components/shared.jsx';
import { BarChartIcon, CloseIcon, FileIcon, GridIcon, HeartIcon, MenuIcon, PackageIcon, Star, StoreIcon, TagIcon, UsersIcon } from './Icons.jsx';

// Products sits on its own tab here. On the React site it lived inside Content, which comes back with the CMS.
function ProductsTab({ setDirty }) {
  return (
    <Panel title="Products" intro="Names, descriptions, photos, sizes and prices. Changes go live on the store as soon as you save each product.">
      <ProductManager setDirty={setDirty} />
    </Panel>
  );
}

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
    label: 'Website',
    tabs: [
      { id: 'content', label: 'Content', Icon: FileIcon, Panel: ContentTab },
      { id: 'products', label: 'Products', Icon: TagIcon, Panel: ProductsTab },
      { id: 'reviews', label: 'Reviews', Icon: Star, Panel: ReviewsTab, badge: 'waitingReviews' },
    ],
  },
  {
    label: 'Audience',
    tabs: [{ id: 'subscribers', label: 'Subscribers', Icon: HeartIcon, Panel: SubscribersTab }],
  },
];
const TABS = GROUPS.flatMap((g) => g.tabs);

export default function Admin({ me }) {
  const [params] = useSearchParams();
  const tab = TABS.find((t) => t.id === params.get('tab')) || TABS[0];
  const [counts, setCounts] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const unsaved = useRef(false);
  const setDirty = useCallback((value) => {
    unsaved.current = value;
  }, []);

  // Stops an accidental click from losing edits made to a product.
  const guard = (e) => {
    if (unsaved.current && !window.confirm('You have unsaved changes. Leave without saving?')) e.preventDefault();
  };

  useEffect(() => {
    const onLeave = (e) => {
      if (unsaved.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, []);

  const refreshCounts = useCallback(() => {
    getCounts().then(setCounts).catch(() => {});
  }, []);
  useEffect(refreshCounts, [refreshCounts]);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
    document.title = `${tab.label} - Pink Tomato admin`;
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
          <Link to="?tab=dashboard" onClick={guard}><img src="/logo.webp" alt="Pink Tomato admin" /></Link>
          <button className="icon-button admin-menu-close" aria-label="Close admin menu" onClick={() => setMenuOpen(false)}><CloseIcon /></button>
        </div>

        <nav className="admin-nav" aria-label="Admin sections">
          {GROUPS.map((g) => (
            <div key={g.label}>
              <p>{g.label}</p>
              {g.tabs.map((t) => (
                <Link key={t.id} to={`?tab=${t.id}`} aria-current={t.id === tab.id ? 'page' : undefined} onClick={guard}>
                  <t.Icon size={18} /> {t.label}
                  {t.badge && counts?.[t.badge] > 0 && <span className="admin-badge">{counts[t.badge]}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          <a href={STORE_URL} target="_blank" rel="noreferrer" onClick={guard}><StoreIcon size={18} /> View store</a>
          {me?.email && <p className="admin-muted admin-signed-in">Signed in as {me.email}</p>}
        </div>
      </aside>

      <main className="admin-main">
        <tab.Panel key={tab.id} counts={counts} onChange={refreshCounts} setDirty={setDirty} />
      </main>
    </div>
  );
}
