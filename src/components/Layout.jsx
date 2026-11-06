import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import CartPreview from './CartPreview.jsx';
import BackToTop from './BackToTop.jsx';
import MobileTabBar from './MobileTabBar.jsx';

export default function Layout() {
  const { pathname } = useLocation();
  return (
    <div className="site-frame">
      <Header />
      <main className="main-content">
        <div key={pathname} className="page-transition">
          <Outlet />
        </div>
      </main>
      <Footer />
      <CartPreview />
      <BackToTop />
      <MobileTabBar />
    </div>
  );
}
