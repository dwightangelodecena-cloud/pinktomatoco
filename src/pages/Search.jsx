import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ProductGrid } from '../components/ProductCard.jsx';
import { SearchIcon } from '../components/Icons.jsx';
import { useProducts } from '../lib/useProducts.js';

export default function Search() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const raw = params.get('q') || '';
  const q = raw.trim().toLowerCase();
  const [input, setInput] = useState(raw);
  const inputRef = useRef(null);
  const products = useProducts();

  useEffect(() => setInput(raw), [raw]);
  useEffect(() => {
    if (!raw) inputRef.current?.focus();
  }, [raw]);

  const results = (products || []).filter(
    (p) => q && (p.name.toLowerCase().includes(q) || (p.description_html || '').toLowerCase().includes(q))
  );

  const submit = (e) => {
    e.preventDefault();
    navigate(input.trim() ? `/search?q=${encodeURIComponent(input.trim())}` : '/search');
  };

  return (
    <div className="container page">
      <form className="search-page-form" onSubmit={submit} role="search">
        <SearchIcon />
        <label className="sr-only" htmlFor="search-page-input">Search the store</label>
        <input
          id="search-page-input"
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          placeholder="Search candles, wax melts, scents…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="button button-primary button-small" type="submit">Search</button>
      </form>

      {q ? (
        <>
          <h1 className="page-heading">
            {results.length} result{results.length === 1 ? '' : 's'} for '{raw}'
          </h1>
          {products && results.length === 0 ? <p className="cart-empty">Sorry, nothing matched your search.</p> : <ProductGrid products={results} showSummary />}
        </>
      ) : (
        <h1 className="page-heading">Search</h1>
      )}
    </div>
  );
}
