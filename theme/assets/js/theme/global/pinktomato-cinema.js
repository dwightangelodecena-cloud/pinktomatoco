// Cinematic motion (ideas from designspells / contra references):
//  1. Shared-element page transition: the photo you click grows into the product page's photo
//     (cross-document View Transitions; browsers without them just change page normally).
//  2. Film-title reveals: big headings come in word by word out of a soft blur.
//  3. Curtain reveals + slow "camera drift" on photos, and scroll depth (parallax) in night bands.
//  4. The 404 candle can be relit with a tap.
// Reduced motion: none of this runs; everything shows at once.
const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const HERO_KEY = 'pt-hero-photo';

// ---------- 1. Photo that flies into the product page ----------
function sharedPhoto() {
    // Leaving a list: name the photo that was clicked, and remember which product it was.
    document.addEventListener('click', (e) => {
        const link = e.target.closest && e.target.closest('.product-item a[href], .category-tile[href]');
        if (!link || e.defaultPrevented || e.metaKey || e.ctrlKey || e.button !== 0) return;
        const card = link.closest('.product-item') || link;
        const img = card.querySelector('.product-item-image img, .category-tile-img, img');
        if (!img) return;
        document.querySelectorAll('[data-pt-vt]').forEach((el) => { el.style.viewTransitionName = ''; el.removeAttribute('data-pt-vt'); });
        img.style.viewTransitionName = 'pt-photo';
        img.setAttribute('data-pt-vt', '1');
        try { sessionStorage.setItem(HERO_KEY, link.pathname); } catch (err) { /* private mode */ }
    }, true);
    // Arriving on the product page from that card: the main photo takes the same name.
    let from = null;
    try { from = sessionStorage.getItem(HERO_KEY); sessionStorage.removeItem(HERO_KEY); } catch (err) { /* private mode */ }
    if (from && from === window.location.pathname) {
        const main = document.querySelector('.product-page .product-image-frame img, .product-page .product-images img');
        if (main) main.style.viewTransitionName = 'pt-photo';
    }
}

// ---------- 2. Film-title reveal ----------
function splitWords(heading) {
    if (heading.dataset.ptSplit) return;
    heading.dataset.ptSplit = '1';
    let n = 0;
    const walk = (node) => {
        Array.prototype.slice.call(node.childNodes).forEach((child) => {
            if (child.nodeType === 3) {
                const parts = child.textContent.split(/(\s+)/);
                const frag = document.createDocumentFragment();
                parts.forEach((part) => {
                    if (!part) return;
                    if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
                    const w = document.createElement('span');
                    w.className = 'pt-word';
                    w.style.setProperty('--w', String(n++));
                    w.textContent = part;
                    frag.appendChild(w);
                });
                child.parentNode.replaceChild(frag, child);
            } else if (child.nodeType === 1 && !child.classList.contains('pt-word')) {
                walk(child);
            }
        });
    };
    walk(heading);
    heading.classList.add('pt-film');
}

const FILM_TITLES = '.pt-night .page-heading, .pt-night h1, .product-page .productView-title, .product-page h1.page-heading, .pt-404 .page-heading, .section-title';

// ---------- 3. Curtain reveals, camera drift, scroll depth ----------
const CURTAIN = '.product-page .product-image-frame, .promo-card-photo, .story-band img';

// Cards (category tiles, product cards): the whole card rises in, one after another along the row.
const CARDS = '.category-tile, .product-grid .product-item';
function cardsIn() {
    const cards = Array.prototype.slice.call(document.querySelectorAll(CARDS)).filter((c) => !c.dataset.ptCard);
    if (!cards.length) return;
    cards.forEach((card) => {
        card.dataset.ptCard = '1';
        const siblings = Array.prototype.slice.call(card.parentElement.children);
        card.style.setProperty('--ci', String(siblings.indexOf(card) % 4));
        card.classList.add('pt-card');
    });
    if (!('IntersectionObserver' in window)) { cards.forEach((c) => c.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
    }), { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
    cards.forEach((c) => io.observe(c));
}

function watch() {
    cardsIn();
    const titles = Array.prototype.slice.call(document.querySelectorAll(FILM_TITLES));
    titles.forEach(splitWords);
    const curtains = Array.prototype.slice.call(document.querySelectorAll(CURTAIN)).filter((el) => !el.dataset.ptCurtain);
    curtains.forEach((el) => { el.dataset.ptCurtain = '1'; el.classList.add('pt-curtain'); });
    const targets = titles.concat(curtains).filter((el) => !el.classList.contains('is-rolling'));
    if (!('IntersectionObserver' in window)) { targets.forEach((el) => el.classList.add('is-rolling')); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-rolling');
        io.unobserve(e.target);
    }), { threshold: 0.2, rootMargin: '0px 0px -6% 0px' });
    targets.forEach((el) => io.observe(el));
}

function scrollDepth() {
    let frame = 0;
    const update = () => {
        frame = 0;
        const vh = window.innerHeight;
        document.querySelectorAll('.pt-night, .story-band, .mood-finder').forEach((band) => {
            const r = band.getBoundingClientRect();
            if (r.bottom < 0 || r.top > vh) return;
            // -1 when the band enters at the bottom, +1 when it leaves at the top
            const p = ((vh - r.top) / (vh + r.height)) * 2 - 1;
            band.style.setProperty('--sy', p.toFixed(3));
        });
    };
    window.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(update); }, { passive: true });
    update();
}

// ---------- 4. Relight the 404 candle ----------
function relight404() {
    const candle = document.querySelector('.pt-404-candle');
    if (!candle) return;
    candle.setAttribute('role', 'button');
    candle.setAttribute('tabindex', '0');
    candle.setAttribute('aria-label', 'Relight the candle');
    candle.removeAttribute('aria-hidden');
    const toggle = () => {
        const lit = candle.classList.toggle('is-relit');
        candle.setAttribute('aria-label', lit ? 'Blow out the candle' : 'Relight the candle');
    };
    candle.addEventListener('click', toggle);
    candle.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    const hint = document.createElement('p');
    hint.className = 'pt-404-hint';
    hint.textContent = 'Tap the candle to light it again.';
    candle.insertAdjacentElement('afterend', hint);
}

export default function pinkTomatoCinema() {
    relight404();
    if (reduced()) return;
    document.documentElement.classList.add('pt-cinema');
    sharedPhoto();
    watch();
    scrollDepth();
    // Cards added later (load more, quick view) get the same treatment.
    if ('MutationObserver' in window) {
        let queued = false;
        new MutationObserver(() => {
            if (queued) return;
            queued = true;
            setTimeout(() => { queued = false; watch(); }, 120);
        }).observe(document.body, { childList: true, subtree: true });
    }
}
