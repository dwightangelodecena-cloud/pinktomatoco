import { FlameIcon, LeafIcon, MapPinIcon, ShieldCheckIcon } from './Icons.jsx';
import Reveal from './Reveal.jsx';
import { useInView } from '../lib/useInView.js';

// Taken from "What is our candle constructed with?" on every product page.
const STEPS = [
  { Icon: LeafIcon, title: 'Coconut soy wax', text: 'A clean-burning blend with minimal soot, no smoke and an easy-to-trim wick.' },
  { Icon: ShieldCheckIcon, title: 'Toxic-free fragrance', text: 'Paraben free, phthalate free, cruelty free and vegan scent oils.' },
  { Icon: FlameIcon, title: 'Wooden wick', text: 'A soft crackle like a fireplace, set in a glass vessel you can reuse.' },
  { Icon: MapPinIcon, title: 'Hand-poured', text: 'Every candle is poured by hand in small batches in North Dakota.' },
];

export default function Process() {
  const [ref, inView] = useInView({ rootMargin: '0px 0px -20% 0px' });
  return (
    <section className="process container">
      <Reveal className="process-head">
        <p className="eyebrow">From pour to glow</p>
        <h2 className="section-title">What goes into every candle</h2>
      </Reveal>
      <ol className={`process-steps ${inView ? 'is-in' : ''}`} ref={ref}>
        <span className="process-line" aria-hidden="true" />
        {STEPS.map(({ Icon, title, text }, i) => (
          <li key={title} className="process-step" style={{ '--d': `${200 + i * 220}ms` }}>
            <span className="process-icon">
              <Icon size={24} />
              <span className="process-num">{i + 1}</span>
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
