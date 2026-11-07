import Reveal from './Reveal.jsx';
import { useContent } from '../context/SiteContentContext.jsx';
import { FlameIcon, LeafIcon, MapPinIcon, ShieldCheckIcon } from './Icons.jsx';

const ICONS = [MapPinIcon, LeafIcon, ShieldCheckIcon, FlameIcon];

export default function ValueProps() {
  const { valueProps } = useContent('home');
  return (
    <section className="value-props container" aria-label="Why Pink Tomato">
      <ul className="value-props-list">
        {valueProps.map(({ title, text }, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
          <Reveal as="li" key={i} delay={i * 90} className="value-prop">
            <span className="value-prop-icon"><Icon size={24} /></span>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </Reveal>
          );
        })}
      </ul>
    </section>
  );
}
