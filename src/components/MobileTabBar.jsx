import { NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { CartIcon, GridIcon, HeartIcon, HomeIcon, SearchIcon } from './Icons.jsx';

// Bottom navigation shown on phones only (hidden by CSS from 768px up).
export default function MobileTabBar() {
  const { count, openPreview } = useCart();
  const { ids } = useWishlist();

  return (
    <nav className="mobile-tab-bar" aria-label="Quick navigation">
      <NavLink to="/" end className="tab-item">
        <HomeIcon size={22} /><span>Home</span>
      </NavLink>
      <NavLink to="/shop-all" className="tab-item">
        <GridIcon size={22} /><span>Shop</span>
      </NavLink>
      <NavLink to="/search" className="tab-item">
        <SearchIcon size={22} /><span>Search</span>
      </NavLink>
      <NavLink to="/wishlist" className="tab-item">
        <span className="tab-icon">
          <HeartIcon size={22} />
          {ids.length > 0 && <span className="tab-badge">{ids.length}</span>}
        </span>
        <span>Wishlist</span>
      </NavLink>
      <button type="button" className="tab-item" onClick={openPreview} aria-label={`Cart, ${count} items`}>
        <span className="tab-icon">
          <CartIcon size={22} />
          {count > 0 && <span key={count} className="tab-badge bump">{count}</span>}
        </span>
        <span>Cart</span>
      </button>
    </nav>
  );
}
