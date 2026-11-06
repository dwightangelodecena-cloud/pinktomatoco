import { Link } from 'react-router-dom';

export default function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        <li><Link to="/">Home</Link></li>
        {items.map((item) => (
          <li key={item.label}>{item.to ? <Link to={item.to}>{item.label}</Link> : <span>{item.label}</span>}</li>
        ))}
      </ol>
    </nav>
  );
}
