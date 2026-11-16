import { Component, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { STORE_URL, getCounts } from './lib/adminApi.js';
import OverviewTab from './components/OverviewTab.jsx';
import OrdersTab from './components/OrdersTab.jsx';
import CustomersTab from './components/CustomersTab.jsx';
import SalesTab from './components/SalesTab.jsx';
import ShippingTab from './components/ShippingTab.jsx';
import ReviewsTab from './components/ReviewsTab.jsx';
import ContentTab from './components/ContentTab.jsx';
import SubscribersTab from './components/SubscribersTab.jsx';
import { Panel } from './components/shared.jsx';
import { BarChartIcon, CloseIcon, FileIcon, GridIcon, HeartIcon, LogOutIcon, MenuIcon, PackageIcon, Star, StoreIcon, TruckIcon, UserIcon, UsersIcon } from './Icons.jsx';
import ProfileTab from './components/ProfileTab.jsx';
import { endSession } from './api.js';
import { useSlidePill } from './lib/slidePill.js';

// If one tab hits a problem, only that tab shows a message; the menu and other tabs keep working.
class TabSafety extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="admin-empty-state">
        <h3>{this.props.label} couldn't open</h3>
        <p>Something went wrong showing this page. Reload to try again, or pick another tab.</p>
        <button type="button" className="button button-primary button-small" onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }
}

const GROUPS = [
  {
    label: 'Store',
    tabs: [
      { id: 'dashboard', label: 'Dashboard', Icon: GridIcon, Panel: OverviewTab },
      { id: 'orders', label: 'Orders', Icon: PackageIcon, Panel: OrdersTab, badge: 'pendingOrders' },
      { id: 'customers', label: 'Customers', Icon: UsersIcon, Panel: CustomersTab },
      { id: 'sales', label: 'Sales', Icon: BarChartIcon, Panel: SalesTab },
      { id: 'shipping', label: 'Shipping & Payments', Icon: TruckIcon, Panel: ShippingTab },
    ],
  },
  {
    label: 'Website',
    tabs: [
      // Products and categories are edited inside Content (its Products and Categories cards).
      { id: 'content', label: 'Content', Icon: FileIcon, Panel: ContentTab },
      { id: 'reviews', label: 'Reviews', Icon: Star, Panel: ReviewsTab, badge: 'waitingReviews' },
    ],
  },
  {
    label: 'Audience',
    tabs: [{ id: 'subscribers', label: 'Subscribers', Icon: HeartIcon, Panel: SubscribersTab }],
  },
  {
    label: 'You',
    tabs: [{ id: 'profile', label: 'Profile', Icon: UserIcon, Panel: ProfileTab }],
  },
];
const TABS = GROUPS.flatMap((g) => g.tabs);

export default function Admin({ me }) {
  const [params] = useSearchParams();
  // Old links to ?tab=products open Content on its Products card.
  const asked = params.get('tab') === 'products' ? 'content' : params.get('tab');
  const startCard = params.get('tab') === 'products' ? 'products' : params.get('card');
  const tab = TABS.find((t) => t.id === asked) || TABS[0];
  const [counts, setCounts] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const unsaved = useRef(false);
  const navRef = useRef(null);
  useSlidePill(navRef, 'a[aria-current="page"]', [tab.id], 'sidebar');
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

        <nav className="admin-nav" aria-label="Admin sections" ref={navRef}>
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
          <a
            href="/?signed-out=1"
            onClick={(e) => {
              e.preventDefault();
              if (unsaved.current && !window.confirm('You have unsaved changes. Log out without saving?')) return;
              unsaved.current = false;
              endSession();
              window.location.replace('/?signed-out=1');
            }}
          >
            <LogOutIcon size={18} /> Log out
          </a>
          {me?.email && <p className="admin-muted admin-signed-in">Signed in as {me.email}</p>}
        </div>
      </aside>

      <main className="admin-main">
        <TabSafety key={tab.id} label={tab.label}>
          <tab.Panel counts={counts} onChange={refreshCounts} setDirty={setDirty} startCard={startCard} />
        </TabSafety>
      </main>
    </div>
  );
}
