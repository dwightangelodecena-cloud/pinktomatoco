// Scroll reveals and the homepage mood finder.
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const money = (n) => `$${Number(n).toFixed(2)}`;

function plainText(html) {
    const box = document.createElement('textarea');
    box.innerHTML = (html || '').replace(/<br[^>]*>/g, '\n').replace(/<\/p>/g, '\n').replace(/<[^>]+>/g, '');
    return box.value;
}

const field = (text, label) => {
    const match = text.match(new RegExp(`${label}:\\s*([^\\n]+)`));
    return match ? match[1].trim().replace(/\.$/, '') : null;
};

function scentProfile(html) {
    const text = plainText(html);
    const mood = field(text, 'Mood');
    const notes = field(text, 'Scent Notes');
    if (!mood || !notes) return null;
    return {
        moods: mood.split(',').map((s) => s.trim()).filter(Boolean),
        notes: notes.replace(/\band\b/g, ',').split(',').map((s) => s.trim()).filter(Boolean),
        burnTime: field(text, 'Burn Time'),
        intro: text.split('\n').map((s) => s.trim()).find((s) => s.length > 60) || '',
    };
}

const icon = (name, size) => `<svg class="pt-i" width="${size}" height="${size}" aria-hidden="true"><use href="#pt-${name}"></use></svg>`;

function initReveals() {
    const items = document.querySelectorAll('[data-pt-reveal]');
    const show = (el) => {
        el.style.transitionDelay = `${el.dataset.ptReveal || 0}ms`;
        el.classList.add('is-visible');
    };
    if (!('IntersectionObserver' in window)) {
        items.forEach(show);
        return;
    }
    const observer = new IntersectionObserver((entries) => {
        entries.filter((e) => e.isIntersecting).forEach((e) => {
            show(e.target);
            observer.unobserve(e.target);
        });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach((el) => observer.observe(el));

    const steps = document.querySelector('[data-pt-process]');
    if (steps) {
        const stepObserver = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) return;
            steps.classList.add('is-in');
            stepObserver.disconnect();
        }, { rootMargin: '0px 0px -20% 0px' });
        stepObserver.observe(steps);
    }
}

const QUERY = `query MoodProducts {
  site { products(first: 50) { edges { node {
    entityId name path description
    defaultImage { url(width: 800) altText }
    prices { price { value } priceRange { min { value } max { value } } }
  } } } }
}`;

async function loadProducts(token) {
    const response = await fetch('/graphql', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: QUERY }),
    });
    if (!response.ok) throw new Error(`Mood products failed: ${response.status}`);
    const { data } = await response.json();
    return data.site.products.edges.map((e) => e.node).sort((a, b) => b.entityId - a.entityId);
}

async function initMoodFinder(token) {
    const section = document.querySelector('[data-pt-mood]');
    if (!section || !token) return;

    let products;
    try {
        products = await loadProducts(token);
    } catch (err) {
        return;
    }

    const used = new Set();
    const items = products
        .map((product) => ({ product, profile: scentProfile(product.description) }))
        .filter((x) => x.profile)
        .map((x) => {
            const mood = x.profile.moods.find((m) => !used.has(m)) || x.profile.moods[0];
            used.add(mood);
            return { ...x, mood };
        });
    if (!items.length) return;

    const chips = section.querySelector('[data-pt-mood-chips]');
    const stage = section.querySelector('[data-pt-mood-stage]');
    let active = 0;
    let touched = false;

    const price = ({ prices }) => {
        const { min, max } = prices.priceRange;
        return min.value === max.value ? money(prices.price.value) : `${money(min.value)} - ${money(max.value)}`;
    };

    const render = () => {
        const { product, profile } = items[active];
        const href = escapeHtml(product.path);
        const name = escapeHtml(product.name);
        Array.from(chips.children).forEach((chip, i) => {
            chip.classList.toggle('is-active', i === active);
            chip.setAttribute('aria-selected', String(i === active));
        });
        stage.innerHTML = `
            <a href="${href}" class="mood-image">
                <img src="${escapeHtml(product.defaultImage ? product.defaultImage.url : '')}" alt="${name}">
                <span class="mood-image-glow" aria-hidden="true"></span>
            </a>
            <div class="mood-copy">
                <div class="mood-tags">${profile.moods.map((m) => `<span>${escapeHtml(m)}</span>`).join('')}</div>
                <h3 class="mood-name">${name}</h3>
                <p class="mood-intro">${escapeHtml(profile.intro)}</p>
                <p class="mood-label">Scent notes</p>
                <ul class="mood-notes">${profile.notes.map((n, i) => `<li style="--d: ${i * 45}ms">${escapeHtml(n)}</li>`).join('')}</ul>
                <div class="mood-foot">
                    <span class="mood-price">${price(product)}</span>
                    ${profile.burnTime ? `<span class="mood-burn">${icon('flame', 15)} ${escapeHtml(profile.burnTime)}</span>` : ''}
                </div>
                <a href="${href}" class="button button-primary">Shop ${name} ${icon('arrow-right', 16)}</a>
            </div>`;
    };

    chips.innerHTML = items.map((it, i) => `<button type="button" role="tab" class="mood-chip" data-index="${i}">${escapeHtml(it.mood)}</button>`).join('');
    chips.addEventListener('click', (event) => {
        const chip = event.target.closest('.mood-chip');
        if (!chip) return;
        active = Number(chip.dataset.index);
        touched = true;
        render();
    });
    section.hidden = false;
    render();

    // Gently cycle through moods until the visitor picks one.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || items.length < 2 || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const timer = setInterval(() => {
            if (touched) {
                clearInterval(timer);
                return;
            }
            active = (active + 1) % items.length;
            render();
        }, 5000);
    }, { rootMargin: '0px 0px -10% 0px' });
    observer.observe(section);
}

const FEATURED_QUERY = `query Featured($ids: [Int!]) {
  site { products(entityIds: $ids, first: 50) { edges { node {
    entityId name path
    defaultImage { url(width: 640) }
    prices { price { value } priceRange { min { value } max { value } } }
  } } } }
}`;

const card = (p, i) => {
    const name = escapeHtml(p.name);
    const href = escapeHtml(p.path);
    const { min, max } = p.prices.priceRange;
    const price = min.value === max.value ? money(p.prices.price.value) : `${money(min.value)} - ${money(max.value)}`;
    return `<article class="reveal product-item is-visible" style="transition-delay:${(i % 4) * 90}ms">
        <div class="product-item-thumbnail">
            <a href="${href}" class="product-item-image" tabindex="-1" aria-hidden="true"><img src="${escapeHtml(p.defaultImage ? p.defaultImage.url : '')}" alt="" loading="lazy"></a>
            <span class="product-badge">New</span>
            <form action="/wishlist.php?action=add&amp;product_id=${p.entityId}" method="post">
                <button type="submit" class="card-wishlist" aria-label="Add ${name} to wishlist">${icon('heart', 18)}</button>
            </form>
            <button type="button" class="quick-view-button quickview" data-product-id="${p.entityId}">${icon('eye', 16)} Quick View</button>
        </div>
        <div class="product-item-details">
            <h3 class="product-item-title"><a href="${href}">${name}</a></h3>
            <div class="product-item-price">${price}</div>
            <a href="${href}" class="product-item-action">Pick Options ${icon('arrow-right', 16)}</a>
        </div>
    </article>`;
};

// The admin's Content tab can choose the homepage products. Its saved list arrives as
// data-pt-featured="12,7,3"; without one, the newest products the theme rendered stay.
async function initFeatured(token) {
    const marker = document.querySelector('[data-pt-featured]');
    const grid = document.querySelector('[data-pt-product-grid]');
    const ids = marker ? marker.dataset.ptFeatured.split(',').map(Number).filter(Boolean) : [];
    if (!grid || !ids.length || !token) return;
    try {
        const response = await fetch('/graphql', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ query: FEATURED_QUERY, variables: { ids } }),
        });
        const { data } = await response.json();
        const byId = new Map(data.site.products.edges.map((e) => [e.node.entityId, e.node]));
        const chosen = ids.map((id) => byId.get(id)).filter(Boolean);
        if (chosen.length) grid.innerHTML = chosen.map(card).join('');
    } catch (err) {
        // Keep the newest products if the list can't load.
    }
}

export default function pinkTomatoHome(context) {
    initReveals();
    // A saved "hide the mood finder" choice arrives as a marker in its content slot.
    if (!document.querySelector('[data-pt-hide-mood]')) initMoodFinder(context.storefrontApiToken);
    initFeatured(context.storefrontApiToken);
}
