import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import { ProductGrid } from '../components/ProductCard.jsx';
import { useProducts } from '../lib/useProducts.js';
import { defaultVariant } from '../lib/pricing.js';

const PER_PAGE = 12;

const sorters = {
  featured: () => 0,
  newest: (a, b) => b.id - a.id,
  'alpha-asc': (a, b) => a.name.localeCompare(b.name),
  'alpha-desc': (a, b) => b.name.localeCompare(a.name),
  'price-asc': (a, b) => minPrice(a) - minPrice(b),
  'price-desc': (a, b) => minPrice(b) - minPrice(a),
};
function minPrice(p) {
  const prices = (p.variants || []).map((v) => Number(v.price));
  return prices.length ? Math.min(...prices) : Number(defaultVariant(p)?.price ?? p.price);
}

export default function ShopAll() {
  const products = useProducts();
  const [params, setParams] = useSearchParams();
  const sort = params.get('sort') || 'featured';
  const page = Math.max(1, parseInt(params.get('page') || '1', 10));

  const sorted = useMemo(() => (products ? [...products].sort(sorters[sort] || sorters.featured) : []), [products, sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const shown = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const pageLink = (n) => {
    const p = new URLSearchParams(params);
    p.set('page', n);
    return `?${p.toString()}`;
  };

  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: 'Shop All', to: '/shop-all' }]} />
      <h1 className="page-heading">Shop All</h1>

      <div className="catalog-toolbar">
        <label>
          <span className="form-field-title">Sort By:</span>
          <select
            className="form-input form-select"
            value={sort}
            onChange={(e) => setParams({ sort: e.target.value })}
          >
            <option value="featured">Featured Items</option>
            <option value="newest">Newest Items</option>
            <option value="alpha-asc">A to Z</option>
            <option value="alpha-desc">Z to A</option>
            <option value="price-asc">Price: Ascending</option>
            <option value="price-desc">Price: Descending</option>
          </select>
        </label>
      </div>

      {products ? <ProductGrid products={shown} showSummary /> : <p className="loading">Loading…</p>}

      {pages > 1 && (
        <nav className="pagination" aria-label="Pagination">
          <ul>
            {page > 1 && <li><Link to={pageLink(page - 1)}>Previous</Link></li>}
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <li key={n} className={n === page ? 'pagination-current' : ''}>
                {n === page ? <span>{n}</span> : <Link to={pageLink(n)}>{n}</Link>}
              </li>
            ))}
            {page < pages && <li><Link to={pageLink(page + 1)}>Next</Link></li>}
          </ul>
        </nav>
      )}
    </div>
  );
}
