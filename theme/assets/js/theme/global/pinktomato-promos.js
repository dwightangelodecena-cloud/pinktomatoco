// Promotions from the admin (Content > Promotions): a section on the homepage and a short strip on
// every product page. The admin saves them into a hidden marker on every page ([data-pt-promos]).
// The admin's preview imports the same builders, so both always look the same.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeImg = (src) => (/^https:\/\/[^\s"'<>]+$/.test(String(src || '')) || /^\/images\//.test(String(src || '')) ? src : '');
const safeLink = (href) => (/^\/[^\s"'<>]*$/.test(String(href || '')) || /^https:\/\/[^\s"'<>]+$/.test(String(href || '')) ? href : '/shop-all/');
const icon = (name, size) => `<svg class="pt-i" width="${size}" height="${size}" aria-hidden="true"><use href="#pt-${name}"></use></svg>`;

export function activeOffers(data) {
    return ((data && data.items) || []).filter((it) => it && it.on && (it.title || it.badge));
}

function offerCard(it, i) {
    const img = safeImg(it.image);
    const code = it.code ? `
        <div class="promo-code">
            <span>Use code</span>
            <strong>${esc(it.code)}</strong>
            <button type="button" class="promo-copy" data-pt-copy="${esc(it.code)}">Copy</button>
        </div>` : '';
    const btn = it.button ? `<a class="button button-primary promo-btn" href="${esc(safeLink(it.link))}">${esc(it.button)} ${icon('arrow-right', 16)}</a>` : '';
    return `
        <article class="promo-card reveal${img ? ' has-photo' : ''}" data-pt-reveal="${i * 120}">
            ${img ? `<div class="promo-card-photo"><img src="${esc(img)}" alt="" loading="lazy"></div>` : ''}
            <div class="promo-card-body">
                ${it.badge ? `<span class="promo-badge">${esc(it.badge)}</span>` : ''}
                ${it.title ? `<h3>${esc(it.title)}</h3>` : ''}
                ${it.text ? `<p>${esc(it.text)}</p>` : ''}
                ${code}
                ${btn}
            </div>
        </article>`;
}

function bundleCard(b, i) {
    const tiers = (b.tiers || []).filter((t) => t && (t.qty || t.off));
    const img = safeImg(b.image);
    return `
        <article class="promo-card promo-bundle reveal${img ? ' has-photo' : ''}" data-pt-reveal="${i * 120}">
            ${img ? `<div class="promo-card-photo"><img src="${esc(img)}" alt="" loading="lazy"></div>` : ''}
            <div class="promo-card-body">
                <span class="promo-badge is-soft">Buy more, save more</span>
                ${b.title ? `<h3>${esc(b.title)}</h3>` : ''}
                ${b.text ? `<p>${esc(b.text)}</p>` : ''}
                ${tiers.length ? `<ul class="promo-tiers">${tiers.map((t) => `<li><span>${esc(t.qty)}</span><strong>${esc(t.off)}</strong></li>`).join('')}</ul>` : ''}
                ${b.note ? `<p class="promo-small">${esc(b.note)}</p>` : ''}
            </div>
        </article>`;
}

// The homepage section, or '' when there is nothing to show.
export function promoSectionHtml(data) {
    if (!data || data.show === false) return '';
    const offers = activeOffers(data);
    const bundle = data.bundle && data.bundle.on ? data.bundle : null;
    if (!offers.length && !bundle) return '';
    const cards = offers.map(offerCard);
    if (bundle) cards.push(bundleCard(bundle, cards.length));
    return `
        <div class="reveal section-head" data-pt-reveal="0">
            <div>
                ${data.eyebrow ? `<p class="eyebrow">${esc(data.eyebrow)}</p>` : ''}
                ${data.title ? `<h2 class="section-title">${esc(data.title)}</h2>` : ''}
            </div>
        </div>
        <div class="promo-cards is-${Math.min(cards.length, 3)}">${cards.join('')}</div>`;
}

// The short note under Add to Cart, or '' when there is nothing to show.
export function promoStripHtml(data) {
    if (!data || data.showOnProducts === false) return '';
    const offers = activeOffers(data);
    const bundle = data.bundle && data.bundle.on ? data.bundle : null;
    const rows = offers.map((it) => `
        <li>
            <span class="promo-strip-icon">${icon('flame', 14)}</span>
            <span><strong>${esc(it.badge || it.title)}</strong>${it.badge && it.title ? ` ${esc(it.title.toLowerCase())}` : ''}${it.code ? ` · code <b class="promo-strip-code">${esc(it.code)}</b>` : ''}</span>
            ${it.code ? `<button type="button" class="promo-copy" data-pt-copy="${esc(it.code)}">Copy</button>` : ''}
        </li>`);
    if (bundle) {
        const first = (bundle.tiers || []).filter((t) => t && t.off)[0];
        rows.push(`
        <li>
            <span class="promo-strip-icon">${icon('flame', 14)}</span>
            <span><strong>${esc(bundle.title || 'Bundle promotions')}</strong>${first ? ` · from ${esc(first.off)} when you buy ${esc(first.qty)}` : ''}</span>
            <a class="promo-strip-link" href="/#offers">See prices</a>
        </li>`);
    }
    if (!rows.length) return '';
    return `<p class="promo-strip-title">Offers for you</p><ul>${rows.join('')}</ul>`;
}

export function readPromos() {
    const el = document.querySelector('[data-pt-promos]');
    if (!el) return null;
    try {
        const data = JSON.parse(el.getAttribute('data-pt-promos') || 'null');
        return data && typeof data === 'object' ? data : null;
    } catch (e) {
        return null;
    }
}

function wireCopy(root) {
    root.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-pt-copy]');
        if (!btn) return;
        const code = btn.getAttribute('data-pt-copy');
        const done = () => {
            btn.textContent = 'Copied';
            btn.classList.add('is-copied');
            setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('is-copied'); }, 1800);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done).catch(done);
        else done();
    });
}

export default function pinkTomatoPromos() {
    const data = readPromos();
    const home = document.querySelector('[data-pt-promos-home]');
    if (home) {
        const html = promoSectionHtml(data);
        if (html) {
            home.id = 'offers';
            home.innerHTML = html;
            home.hidden = false;
            wireCopy(home);
            // Fade the cards in as they scroll into view (same feel as the other sections).
            const items = Array.prototype.slice.call(home.querySelectorAll('.reveal'));
            if ('IntersectionObserver' in window) {
                const io = new IntersectionObserver((entries) => entries.forEach((e) => {
                    if (!e.isIntersecting) return;
                    const delay = Number(e.target.getAttribute('data-pt-reveal')) || 0;
                    setTimeout(() => e.target.classList.add('is-visible'), delay);
                    io.unobserve(e.target);
                }), { threshold: 0.15 });
                items.forEach((el) => io.observe(el));
            } else {
                items.forEach((el) => el.classList.add('is-visible'));
            }
        }
    }
    document.querySelectorAll('[data-pt-promos-product]').forEach((strip) => {
        const html = promoStripHtml(data);
        if (!html) return;
        strip.innerHTML = html;
        strip.hidden = false;
        wireCopy(strip);
    });
}
