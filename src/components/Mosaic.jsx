const images = ['/images/hero/hero-1.jpg', '/images/hero/hero-2.jpg', '/images/hero/hero-3.jpg', '/images/hero/hero-4.jpg'];

// Same 4-tile mosaic as the original home page: one large tile on the left,
// two small tiles top-right and one wide tile bottom-right.
export default function Mosaic() {
  return (
    <section className={`mosaic mosaic-count-${images.length}`}>
      {images.map((src, i) => (
        <div key={src} className={`mosaic-item mosaic-item-${i}`} style={{ backgroundImage: `url(${src})` }}>
          <img className="mosaic-item-image" src={src} alt="" />
        </div>
      ))}
    </section>
  );
}
