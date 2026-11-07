import { useContent } from '../context/SiteContentContext.jsx';

export default function Blog() {
  const { title, intro } = useContent('blog');
  return (
    <div className="container page">
      <h1 className="page-heading">{title}</h1>
      {intro && <p>{intro}</p>}
    </div>
  );
}
