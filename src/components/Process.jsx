import { FlameIcon, LeafIcon, MapPinIcon, ShieldCheckIcon } from './Icons.jsx';
import Reveal from './Reveal.jsx';
import { useContent } from '../context/SiteContentContext.jsx';
import { useInView } from '../lib/useInView.js';

const ICONS = [LeafIcon, ShieldCheckIcon, FlameIcon, MapPinIcon];

export default function Process() {
  const [ref, inView] = useInView({ rootMargin: '0px 0px -20% 0px' });
  const home = useContent('home');
  return (
    <section className="process container">
      <Reveal className="process-head">
        <p className="eyebrow">{home.processEyebrow}</p>
        <h2 className="section-title">{home.processTitle}</h2>
      </Reveal>
      <ol className={`process-steps ${inView ? 'is-in' : ''}`} ref={ref}>
        <span className="process-line" aria-hidden="true" />
        {home.processSteps.map(({ title, text }, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
          <li key={i} className="process-step" style={{ '--d': `${200 + i * 220}ms` }}>
            <span className="process-icon">
              <Icon size={24} />
              <span className="process-num">{i + 1}</span>
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
          </li>
          );
        })}
      </ol>
    </section>
  );
}
