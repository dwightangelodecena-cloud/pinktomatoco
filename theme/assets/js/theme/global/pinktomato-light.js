// "Light up on enter": every section the shop is built from catches light as it scrolls into view.
// Each watched section gets .pt-light, a .pt-halo (amber bloom + three embers) and, once visible,
// .is-lit. Children of [data-pt-stagger] get an index (--i) so they light one after another.
// Styles: assets/scss/pinktomato/_atelier.scss. Reduced motion: everything is lit at once, no movement.

// Sections marked in templates, plus the shop's known section classes (so the admin's CMS versions
// of a section, which keep the same classes, light up too).
const SECTIONS = [
    '[data-pt-light]',
    '.value-props', '.home-categories', '.promo-section', '.products-home', '.story-band', '.wick-guide',
    '.mood-finder', '.process', '.care-tips', '.home-reviews', '.home-faq', '.latest-blog-posts',
    '.products-related', '.product-tabs', '.product-reviews',
].join(',');

const EMBERS = '<i class="pt-ember"></i><i class="pt-ember"></i><i class="pt-ember"></i>';

function addHalo(section) {
    const children = Array.prototype.slice.call(section.children);
    if (children.some((c) => c.classList.contains('pt-halo'))) return;
    const halo = document.createElement('span');
    halo.className = 'pt-halo';
    halo.setAttribute('aria-hidden', 'true');
    halo.innerHTML = EMBERS;
    section.appendChild(halo);
}

function indexStagger(root) {
    Array.prototype.slice.call(root.querySelectorAll('[data-pt-stagger]')).forEach((group) => {
        Array.prototype.slice.call(group.children).forEach((child, i) => child.style.setProperty('--i', String(i)));
    });
}

export function lightUp(root) {
    const scope = root || document;
    const sections = Array.prototype.slice.call(scope.querySelectorAll(SECTIONS))
        // a section inside another watched section lights with its parent
        .filter((s) => !s.parentElement || !s.parentElement.closest(SECTIONS));
    if (!sections.length) return;

    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    sections.forEach((section) => {
        section.classList.add('pt-light');
        addHalo(section);
        indexStagger(section);
    });

    if (reduced || !('IntersectionObserver' in window)) {
        sections.forEach((s) => s.classList.add('is-lit'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const section = entry.target;
            addHalo(section); // a script may have rewritten the section since (e.g. Offers)
            indexStagger(section);
            section.classList.add('is-lit');
            observer.unobserve(section);
        });
    }, { rootMargin: '0px 0px -16% 0px' });
    sections.forEach((s) => observer.observe(s));

    // Safety net: anything already above the fold when the page loads, or reached by a jump link,
    // is lit even if the observer never reports it (e.g. a section shown after being hidden).
    window.setTimeout(() => {
        sections.forEach((s) => {
            const r = s.getBoundingClientRect();
            if (r.top < window.innerHeight && r.bottom > 0) s.classList.add('is-lit');
        });
    }, 2500);
}

export default function pinkTomatoLight() {
    lightUp(document);
}
