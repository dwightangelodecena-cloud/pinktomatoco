export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="product-grid" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="product-item skeleton-card">
          <div className="skeleton skeleton-image" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
      ))}
    </div>
  );
}

export function ProductPageSkeleton() {
  return (
    <div className="container page" aria-busy="true">
      <div className="product-top">
        <div className="skeleton skeleton-image" />
        <div>
          <div className="skeleton skeleton-line tall" />
          <div className="skeleton skeleton-line short" />
          <div className="skeleton skeleton-block" />
          <div className="skeleton skeleton-block" />
        </div>
      </div>
    </div>
  );
}
