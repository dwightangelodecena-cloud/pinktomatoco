import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { useContent } from '../context/SiteContentContext.jsx';

// The words "Contact Us" in the policy text link to the contact page.
function Paragraph({ text }) {
  const parts = text.split('Contact Us');
  return (
    <p>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <Link to="/contact-us">Contact Us</Link>}
          {part}
        </Fragment>
      ))}
    </p>
  );
}

export default function ShippingReturns() {
  const { title, sections } = useContent('shipping');
  return (
    <div className="container page page-narrow rte">
      <h1 className="page-heading">{title}</h1>
      {sections.map((s, i) => (
        <Fragment key={i}>
          <p><strong>{s.heading}</strong></p>
          {s.body.split(/\n\s*\n/).filter((p) => p.trim()).map((p, n) => <Paragraph key={n} text={p} />)}
        </Fragment>
      ))}
    </div>
  );
}
