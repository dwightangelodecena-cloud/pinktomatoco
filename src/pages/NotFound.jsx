import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container page page-narrow">
      <h1 className="page-heading">404 Error - Page not found</h1>
      <p>The page you were looking for does not exist.</p>
      <Link to="/" className="button button-primary">Continue Shopping</Link>
    </div>
  );
}
