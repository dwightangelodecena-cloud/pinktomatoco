import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import CartPreview from './CartPreview.jsx';

export default function Layout() {
  return (
    <div className="site-frame">
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
      <CartPreview />
    </div>
  );
}
