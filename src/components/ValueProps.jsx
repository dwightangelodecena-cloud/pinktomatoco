import Reveal from './Reveal.jsx';

const icon = { width: 34, height: 34, viewBox: '0 0 32 32', fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

// Facts taken from the product descriptions on the original store.
const items = [
  {
    title: 'Hand-poured in North Dakota',
    text: 'Small batches, made by hand in Watford City.',
    svg: (
      <svg {...icon}><path d="M16 4c3 4 5 6.5 5 9.5a5 5 0 0 1-10 0C11 10.5 13 8 16 4z" /><path d="M9 20h14v8H9z" /><path d="M16 18.5V20" /></svg>
    ),
  },
  {
    title: 'Coconut soy wax',
    text: 'Burns clean with minimal soot and no smoke.',
    svg: (
      <svg {...icon}><path d="M7 12h18v13a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3z" /><path d="M7 16h18" /><path d="M16 12V8" /><path d="M16 8c1.5-1.5 1.5-3 0-4.5-1.5 1.5-1.5 3 0 4.5z" /></svg>
    ),
  },
  {
    title: 'Toxic-free fragrance',
    text: 'Paraben free, phthalate free, cruelty free & vegan.',
    svg: (
      <svg {...icon}><path d="M26 6C14 6 7 12 7 20c0 3 1 5 2 6" /><path d="M26 6c0 12-6 19-14 19" /><path d="M9 26l9-11" /></svg>
    ),
  },
  {
    title: 'Crackling wooden wicks',
    text: 'A soft fireside crackle in a reusable glass vessel.',
    svg: (
      <svg {...icon}><path d="M10 28h12" /><path d="M13 28V14h6v14" /><path d="M16 14c-3-2-3-5 0-9 3 4 3 7 0 9z" /><path d="M8 9l2 1M24 9l-2 1M9 15H7M25 15h-2" /></svg>
    ),
  },
];

export default function ValueProps() {
  return (
    <section className="value-props" aria-label="Why Pink Tomato">
      <ul className="container value-props-list">
        {items.map((item, i) => (
          <Reveal as="li" key={item.title} delay={i * 90} className="value-prop">
            <span className="value-prop-icon">{item.svg}</span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
