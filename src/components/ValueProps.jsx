import Reveal from './Reveal.jsx';
import { FlameIcon, LeafIcon, MapPinIcon, ShieldCheckIcon } from './Icons.jsx';

// Facts taken from the product descriptions on the original store.
const items = [
  { Icon: MapPinIcon, title: 'Hand-poured in North Dakota', text: 'Small batches, made by hand in Watford City.' },
  { Icon: LeafIcon, title: 'Coconut soy wax', text: 'Burns clean with minimal soot and no smoke.' },
  { Icon: ShieldCheckIcon, title: 'Toxic-free fragrance', text: 'Paraben free, phthalate free, cruelty free & vegan.' },
  { Icon: FlameIcon, title: 'Crackling wooden wicks', text: 'A soft fireside crackle in a reusable glass vessel.' },
];

export default function ValueProps() {
  return (
    <section className="value-props container" aria-label="Why Pink Tomato">
      <ul className="value-props-list">
        {items.map(({ Icon, title, text }, i) => (
          <Reveal as="li" key={title} delay={i * 90} className="value-prop">
            <span className="value-prop-icon"><Icon size={24} /></span>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
