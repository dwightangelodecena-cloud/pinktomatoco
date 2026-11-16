import { card } from './pinktomato-home';
// Product page and Quick View extras: sold-out sizes, price pop, "Added" state, zoom origin, sticky buy bar.

const VARIANTS_QUERY = `query ProductVariants($id: Int!) {
  site { product(entityId: $id) { variants(first: 250) { edges { node {
    isPurchasable
    inventory { isInStock }
    options { edges { node { values { edges { node { entityId } } } } } }
  } } } } }
}`;

// Option value ids that every variant using them can't be bought (switched off or out of stock).
async function soldOutValues(productId, token) {
    const response = await fetch('/graphql', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: VARIANTS_QUERY, variables: { id: Number(productId) } }),
    });
    if (!response.ok) return new Set();
    const { data } = await response.json();
    const buyable = new Map();
    data.site.product.variants.edges.forEach(({ node }) => {
        const ok = node.isPurchasable && (!node.inventory || node.inventory.isInStock);
        node.options.edges.forEach((option) => option.node.values.edges.forEach((value) => {
            const id = value.node.entityId;
            buyable.set(id, (buyable.get(id) || false) || ok);
        }));
    });
    // Array.from, not spread: the theme's loose Babel build breaks spreading a Map.
    return new Set(Array.from(buyable).filter(([, ok]) => !ok).map(([id]) => id));
}

// Greys out sizes that can't be bought, the way the React site did.
async function markSoldOut(form, token) {
    if (!token) return;
    const productId = form.querySelector('[name="product_id"]').value;
    let off;
    try {
        off = await soldOutValues(productId, token);
    } catch (err) {
        return;
    }
    form.querySelectorAll('[data-product-attribute="set-select"] option[data-product-attribute-value]').forEach((option) => {
        if (!off.has(Number(option.value))) return;
        option.disabled = true;
        option.textContent = `${option.textContent.replace(/ \(Sold out\)$/, '')} (Sold out)`;
        if (option.selected) {
            const select = option.parentElement;
            select.selectedIndex = 0;
            $(select).trigger('change');
        }
    });
}

let storefrontToken = '';

function initForm(form) {
    if (form.dataset.ptReady) return;
    form.dataset.ptReady = 'true';
    markSoldOut(form, storefrontToken);

    let pending = false;
    form.addEventListener('submit', () => {
        pending = true;
    });
    $('body').on('cart-quantity-update', () => {
        if (!pending) return;
        pending = false;
        const button = form.querySelector('.add-to-cart');
        if (!button) return;
        button.classList.add('is-added');
        setTimeout(() => button.classList.remove('is-added'), 1600);
    });
}

function initZoom() {
    document.querySelectorAll('[data-pt-zoom]').forEach((link) => {
        link.addEventListener('mousemove', (event) => {
            const box = link.getBoundingClientRect();
            const img = link.querySelector('img');
            img.style.transformOrigin = `${((event.clientX - box.left) / box.width) * 100}% ${((event.clientY - box.top) / box.height) * 100}%`;
        });
    });
}

function priceText(scope) {
    const price = Array.from(scope.querySelectorAll('.product-price')).find((el) => el.style.display !== 'none');
    return price ? price.textContent.trim() : '';
}

// Phone-only bar that appears once the main Add To Cart button scrolls out of view.
function initStickyBar() {
    const bar = document.querySelector('[data-pt-sticky-buy]');
    const form = document.getElementById('product-options-form');
    if (!bar || !form) return;
    const price = bar.querySelector('[data-pt-sticky-price]');
    const add = bar.querySelector('[data-pt-sticky-add]');
    const scope = document.querySelector('.product-details');
    price.textContent = priceText(scope);

    if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => {
            const show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
            bar.classList.toggle('is-visible', show);
            bar.setAttribute('aria-hidden', String(!show));
            add.tabIndex = show ? 0 : -1;
        }).observe(form);
    }

    add.addEventListener('click', () => {
        const select = form.querySelector('select');
        if (select && !select.value) {
            form.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        form.requestSubmit();
    });

    document.addEventListener('onProductOptionsChanged', () => {
        price.textContent = priceText(scope);
    });
}

const svgIcon = (name, size) => `<svg class="pt-i" width="${size}" height="${size}" aria-hidden="true"><use href="#pt-${name}"></use></svg>`;
const esc = (t) => String(t || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const splitList = (t) => t.split(/[,/·]/).map((x) => x.trim().replace(/\.$/, '')).filter(Boolean);

// Product descriptions follow a pattern: a story, then "Mood:", "Scent Notes:" and "Burn Time:" lines,
// a "What is our candle constructed with?" list and "All candles are made in North Dakota".
// Those parts become an "At a glance" card beside the story. Descriptions that don't follow the
// pattern (or contain links, images or tables) are left exactly as written.
function initProductStory() {
    const section = document.querySelector('[data-pt-product-story]');
    const desc = section && section.querySelector('[data-pt-description]');
    if (!desc || desc.querySelector('img, a, table, iframe, video')) return;
    const lines = desc.innerText.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const facts = { mood: [], notes: [], burn: '', made: [], origin: '' };
    const story = [];
    let inList = false;
    lines.forEach((line) => {
        const m = line.match(/^(mood|scent notes?|notes|burn time)\s*:\s*(.+)$/i);
        if (m) {
            inList = false;
            const key = m[1].toLowerCase();
            if (key === 'mood') facts.mood = splitList(m[2]);
            else if (key === 'burn time') facts.burn = m[2].trim();
            else facts.notes = splitList(m[2]);
            return;
        }
        if (/constructed with|made with\?|what('s| is) (in|inside)/i.test(line) && line.endsWith('?')) { inList = true; return; }
        if (inList && /^[-•*]\s*/.test(line)) { facts.made.push(line.replace(/^[-•*]\s*/, '')); return; }
        if (/^all (our )?candles are (hand[- ]?poured|made) in /i.test(line)) { inList = false; facts.origin = line.replace(/\.$/, ''); return; }
        inList = false;
        story.push(line);
    });
    if (!facts.mood.length && !facts.notes.length && !facts.burn) return;

    const card = [
        '<aside class="glance-card" aria-label="At a glance">',
        '<p class="eyebrow">At a glance</p>',
        facts.mood.length ? `<div class="glance-row"><span class="glance-label">${svgIcon('heart', 16)} Mood</span><div class="glance-chips">${facts.mood.map((x) => `<span class="glance-chip">${esc(x)}</span>`).join('')}</div></div>` : '',
        facts.notes.length ? `<div class="glance-row"><span class="glance-label">${svgIcon('leaf', 16)} Scent notes</span><div class="glance-tags">${facts.notes.map((x) => `<span class="glance-tag">${esc(x)}</span>`).join('')}</div></div>` : '',
        facts.burn ? `<div class="glance-row"><span class="glance-label">${svgIcon('clock', 16)} Burn time</span><p class="glance-burn">${esc(facts.burn)}</p></div>` : '',
        facts.made.length ? `<div class="glance-row"><span class="glance-label">${svgIcon('flame', 16)} Made with</span><ul class="glance-made">${facts.made.map((x) => `<li>${svgIcon('check', 14)}${esc(x)}</li>`).join('')}</ul></div>` : '',
        facts.origin ? `<p class="glance-origin">${svgIcon('map-pin', 16)} ${esc(facts.origin)}</p>` : '',
        '</aside>',
    ].join('');
    desc.innerHTML = story.map((p) => `<p>${esc(p)}</p>`).join('');
    desc.insertAdjacentHTML('afterend', card);
    section.classList.add('has-glance');
}

const OTHERS_QUERY = `query Others {
  site { products(first: 12) { edges { node {
    entityId name path
    defaultImage { url(width: 640) }
    prices { price { value } priceRange { min { value } max { value } } }
  } } } }
}`;

// "You may also like": BigCommerce's related products, or four other candles when it has none.
async function initAlsoLike(productId) {
    const section = document.querySelector('[data-pt-also-like]');
    const grid = section && section.querySelector('[data-pt-also-like-grid]');
    const have = grid ? grid.children.length : 0;
    if (!grid || have >= 4 || !storefrontToken) return;
    try {
        const response = await fetch('/graphql', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${storefrontToken}` },
            body: JSON.stringify({ query: OTHERS_QUERY }),
        });
        const { data } = await response.json();
        const shown = new Set(Array.from(grid.querySelectorAll('[data-product-id]')).map((el) => Number(el.dataset.productId)));
        const others = data.site.products.edges.map((e) => e.node).filter((p) => p.entityId !== Number(productId) && !shown.has(p.entityId)).slice(0, 4 - have);
        if (!others.length) return;
        grid.insertAdjacentHTML('beforeend', others.map((p, i) => card(p, have + i, { badge: false })).join(''));
        section.hidden = false;
    } catch (err) {
        // Leave the row out if it can't load.
    }
}

export default function pinkTomatoProduct(context) {
    storefrontToken = context.storefrontApiToken;
    document.querySelectorAll('form[data-cart-item-add]').forEach(initForm);
    initZoom();
    initStickyBar();
    initProductStory();
    initAlsoLike(context.productId);

    document.addEventListener('onProductOptionsChanged', (event) => {
        const form = event.target.closest ? event.target.closest('form[data-cart-item-add]') : null;
        const scope = form ? form.closest('.productView') : document;
        scope.querySelectorAll('.product-price').forEach((el) => {
            el.classList.remove('price-pop');
            void el.offsetWidth; // restart the animation
            el.classList.add('price-pop');
        });
    });

    // Quick View content arrives later, so pick up its form when it appears.
    new MutationObserver(() => {
        document.querySelectorAll('#modal form[data-cart-item-add]').forEach(initForm);
    }).observe(document.body, { childList: true, subtree: true });
}
