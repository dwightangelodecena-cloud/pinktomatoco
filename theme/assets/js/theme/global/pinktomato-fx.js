// Decoration and motion for the inner pages (shop, product, cart, contact and the plain pages):
//  - Page headers become candle-lit night bands: a giant background word, drawn ingredients that float
//    and lean away from the mouse, and embers rising.
//  - Cards (products, contact facts, offers, cart items) tilt toward the pointer with a glow under it.
//  - On a product page, that candle's own scent ingredients float around its photo.
// Ingredient drawings come from pinktomato-notes.js (the same art as the homepage showcase).
// Reduced motion: decorations stay, nothing moves.
import { artFor, notesFromText } from './pinktomato-notes';
import { LABEL_NOTES } from './pinktomato-cutouts';

const MIX = ['Rose', 'Bergamot', 'Vanilla', 'Lavender', 'Honey', 'Cedar', 'Peony', 'Apple'];
const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = () => window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// Where floating ingredients sit inside a band (percent), with a depth for the mouse lean.
const SPOTS = [
    { x: 6, y: 18, s: 1, d: 18 }, { x: 88, y: 12, s: .8, d: 28 }, { x: 72, y: 70, s: 1.1, d: 14 },
    { x: 20, y: 78, s: .7, d: 30 }, { x: 94, y: 52, s: .9, d: 22 }, { x: 48, y: 8, s: .6, d: 34 },
];

function floaters(notes, count) {
    const art = artFor(notes);
    return SPOTS.slice(0, count).map((spot, i) => `
        <span class="pt-floater" style="--x:${spot.x}%;--y:${spot.y}%;--s:${spot.s};--d:${spot.d};--i:${i}">
            <span class="pt-floater-inner">${art[i % art.length]}</span>
        </span>`).join('');
}

function sparks(count) {
    let out = '';
    for (let i = 0; i < count; i++) out += `<i style="--l:${(i * 37) % 100}%;--t:${(i * 0.9) % 6}s;--k:${0.7 + ((i * 13) % 7) / 10}"></i>`;
    return `<span class="pt-sparks-rise" aria-hidden="true">${out}</span>`;
}

// The mouse leans the floaters (parallax) and moves the light.
function lean(band) {
    if (!finePointer() || reduced()) return;
    let frame = 0;
    band.addEventListener('pointermove', (e) => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
            frame = 0;
            const r = band.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width - 0.5;
            const py = (e.clientY - r.top) / r.height - 0.5;
            band.style.setProperty('--px', px.toFixed(3));
            band.style.setProperty('--py', py.toFixed(3));
            band.style.setProperty('--lx', `${((px + 0.5) * 100).toFixed(1)}%`);
            band.style.setProperty('--ly', `${((py + 0.5) * 100).toFixed(1)}%`);
        });
    });
    band.addEventListener('pointerleave', () => {
        band.style.setProperty('--px', '0');
        band.style.setProperty('--py', '0');
    });
}

function nightBand(head, word, notes) {
    if (!head || head.classList.contains('pt-night')) return;
    head.classList.add('pt-night');
    const deco = document.createElement('span');
    deco.className = 'pt-night-deco';
    deco.setAttribute('aria-hidden', 'true');
    deco.innerHTML = `<span class="pt-bigword">${String(word || '').replace(/[<>&]/g, '')}</span>${floaters(notes, window.innerWidth < 700 ? 3 : 6)}${sparks(window.innerWidth < 700 ? 8 : 14)}`;
    head.insertBefore(deco, head.firstChild);
    lean(head);
}

// Cards tilt toward the pointer; a soft glow follows it.
function tilt(card) {
    if (card.dataset.ptTilt === 'on') return;
    card.dataset.ptTilt = 'on';
    card.classList.add('pt-tilt');
    if (!finePointer() || reduced()) return;
    let frame = 0;
    card.addEventListener('pointermove', (e) => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
            frame = 0;
            const r = card.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width;
            const y = (e.clientY - r.top) / r.height;
            card.style.setProperty('--rx', `${((0.5 - y) * 7).toFixed(2)}deg`);
            card.style.setProperty('--ry', `${((x - 0.5) * 9).toFixed(2)}deg`);
            card.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
            card.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
            card.classList.add('is-tilting');
        });
    });
    card.addEventListener('pointerleave', () => {
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
    });
}

const TILT_CARDS = '.category-tile, .contact-facts li, .promo-card, .cart-page .cart-item, .cart-summary';
function tiltAll(root) {
    Array.prototype.slice.call((root || document).querySelectorAll(TILT_CARDS)).forEach(tilt);
}

function productNotes() {
    const desc = document.querySelector('[data-pt-description]');
    const fromText = notesFromText(desc ? desc.innerText : '');
    if (fromText.length) return fromText;
    const idInput = document.querySelector('form[data-cart-item-add] [name="product_id"]');
    return (idInput && LABEL_NOTES[Number(idInput.value)]) || MIX;
}

// The candle's own ingredients float around its photo on the product page.
function productStage() {
    const images = document.querySelector('.product-page .product-image-frame') || document.querySelector('.product-page .product-images');
    if (!images || images.querySelector('.pt-stage-float')) return;
    const notes = productNotes();
    const deco = document.createElement('span');
    deco.className = 'pt-stage-float';
    deco.setAttribute('aria-hidden', 'true');
    deco.innerHTML = floaters(notes, 5);
    images.appendChild(deco);
    const page = document.querySelector('.product-page');
    if (page) {
        page.classList.add('pt-product-lit');
        lean(page);
    }
}

// Category tiles: two drawn ingredients that match the category drift over the photo.
const CATEGORY_NOTES = [
    [/floral|flower/i, ['Rose', 'Peony']], [/citrus|fresh/i, ['Lemon', 'Bergamot']],
    [/wood|warm/i, ['Cedar', 'Amber']], [/sweet|cozy|cosy/i, ['Vanilla', 'Honey']],
    [/melt/i, ['Rose', 'Vanilla']], [/candle/i, ['Lavender', 'Apple']],
];
function categoryTiles() {
    Array.prototype.slice.call(document.querySelectorAll('.category-tile')).forEach((tile) => {
        if (tile.querySelector('.pt-tile-float')) return;
        const name = (tile.querySelector('.category-tile-name') || tile).textContent;
        const hit = CATEGORY_NOTES.find(([re]) => re.test(name));
        const art = artFor(hit ? hit[1] : MIX.slice(0, 2));
        const deco = document.createElement('span');
        deco.className = 'pt-tile-float';
        deco.setAttribute('aria-hidden', 'true');
        deco.innerHTML = art.slice(0, 2).map((svg, i) => `<span class="pt-tile-note" style="--i:${i}">${svg}</span>`).join('');
        tile.appendChild(deco);
    });
}

export default function pinkTomatoFx() {
    categoryTiles();
    const title = (sel) => {
        const h = document.querySelector(sel);
        return h ? h.textContent.trim().split(/\s+/)[0] : '';
    };
    nightBand(document.querySelector('.search-page .catalog-head'), 'Search', MIX.slice(2));
    nightBand(document.querySelector('.catalog-head'), title('.catalog-head .page-heading'), MIX);
    nightBand(document.querySelector('.cart-head'), 'Cart', ['Vanilla', 'Honey', 'Rose', 'Cedar']);
    nightBand(document.querySelector('.pt-page-head'), title('.pt-page-head .page-heading'), ['Lavender', 'Rose', 'Bergamot', 'Vanilla']);
    nightBand(document.querySelector('.contact-aside'), 'Hello', ['Peony', 'Rose', 'Honey']);
    productStage();
    tiltAll();
    // Cards added later (Shop All "load more", quick view, cart refresh) tilt too.
    if ('MutationObserver' in window) {
        let queued = false;
        new MutationObserver(() => {
            if (queued) return;
            queued = true;
            requestAnimationFrame(() => { queued = false; categoryTiles(); tiltAll(); });
        }).observe(document.body, { childList: true, subtree: true });
    }
}
