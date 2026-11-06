import { useSearchParams } from 'react-router-dom';
import { ProductGrid } from '../components/ProductCard.jsx';
import { useProducts } from '../lib/useProducts.js';

export default function Search() {
  const [params] = useSearchParams();
  const q = (params.get('q') || '').trim().toLowerCase();
  const products = useProducts();
  const results = (products || []).filter(
    (p) => q && (p.name.toLowerCase().includes(q) || (p.description_html || '').toLowerCase().includes(q))
  );

  return (
    <div className="container page">
      <h1 className="page-heading">
        {results.length} result{results.length === 1 ? '' : 's'} for '{params.get('q') || ''}'
      </h1>
      {products && results.length === 0 ? <p>Sorry, nothing matched your search.</p> : <ProductGrid products={results} showSummary />}
    </div>
  );
}
