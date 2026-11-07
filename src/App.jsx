import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import ShopAll from './pages/ShopAll.jsx';
import Product from './pages/Product.jsx';
import ShippingReturns from './pages/ShippingReturns.jsx';
import ContactUs from './pages/ContactUs.jsx';
import Blog from './pages/Blog.jsx';
import Login from './pages/Login.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Wishlist from './pages/Wishlist.jsx';
import Search from './pages/Search.jsx';
import Sitemap from './pages/Sitemap.jsx';
import NotFound from './pages/NotFound.jsx';

const Admin = lazy(() => import('./pages/Admin.jsx'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="shop-all" element={<ShopAll />} />
          <Route path="categories" element={<ShopAll />} />
          <Route path="shipping-returns" element={<ShippingReturns />} />
          <Route path="contact-us" element={<ContactUs />} />
          <Route path="blog" element={<Blog />} />
          <Route path="login" element={<Login />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="search" element={<Search />} />
          <Route path="sitemap" element={<Sitemap />} />
          <Route path="admin" element={<Suspense fallback={null}><Admin /></Suspense>} />
          <Route path=":slug" element={<Product />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
