import { Link } from 'react-router-dom';
import { ProductGrid } from '../components/ProductCard.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useProducts } from '../lib/useProducts.js';

export default function Wishlist() {
  const products = useProducts();
  const { ids } = useWishlist();
  const saved = (products || []).filter((p) => ids.includes(p.id));

  return (
    <div className="container page">
      <h1 className="page-heading">Wishlist</h1>
      {products && saved.length === 0 ? (
        <p>You haven't added any items to your wishlist yet. <Link to="/shop-all">Shop All</Link></p>
      ) : (
        <ProductGrid products={saved} />
      )}
    </div>
  );
}
