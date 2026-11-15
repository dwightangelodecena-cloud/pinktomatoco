// Homepage hero (components/pinktomato/home-showcase.html). Choosing a candle thumbnail swaps the big
// faded name, the candle, the words and the floating scent-note ingredients with an animation; it also
// moves on by itself every few seconds until the shopper picks one. Styles: scss/pinktomato/_showcase.scss.
import CUTOUTS, { LABEL_NOTES } from './pinktomato-cutouts';
import { artFor, notesFromText, storyText } from './pinktomato-notes';

// Warm tints only, in the site's palette (espresso, amber, tomato-rose, caramel, blush).
const TINTS = [
    { glow: 'rgba(232, 150, 80, .55)', bg: '#251a14' }, // amber
    { glow: 'rgba(200, 71, 79, .5)', bg: '#28171a' }, // tomato rose
    { glow: 'rgba(214, 150, 110, .5)', bg: '#261b15' }, // caramel
    { glow: 'rgba(236, 186, 120, .5)', bg: '#241c13' }, // honey
    { glow: 'rgba(240, 170, 160, .45)', bg: '#2a1b1c' }, // blush
];
const AUTOPLAY_MS = 7000;
// Where the ingredients float, as % of the stage (kept clear of the words and thumbnails).
const SPOTS = [
    { x: 36, y: 16, s: 58, r: -18 }, { x: 62, y: 12, s: 46, r: 24 }, { x: 31, y: 70, s: 50, r: 12 },
    { x: 68, y: 74, s: 62, r: -28 }, { x: 46, y: 6, s: 34, r: 40 }, { x: 57, y: 88, s: 38, r: -8 },
    { x: 4, y: 88, s: 44, r: 18 }, { x: 95, y: 10, s: 48, r: -22 },
];

const QUERY = `query Showcase($ids: [Int!]) {
  site { products(entityIds: $ids, first: 5) { edges { node {
    entityId name path plainTextDescription(characterLimit: 2000)
    defaultImage { zoom: url(width: 1000) thumb: url(width: 300) }
  } } } }
}`;

async function fetchProducts(token, ids) {
    const response = await fetch('/graphql', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: QUERY, variables: { ids } }),
    });
    const { data } = await response.json();
    const byId = new Map(data.site.products.edges.map((e) => [e.node.entityId, e.node]));
    return ids.map((id) => byId.get(id)).filter(Boolean);
}

const escapeHtml = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Story band: the admin's wording (or hidden), and scent ingredients drifting around the candles.
function initStory() {
    const story = document.querySelector('[data-pt-story]');
    if (!story) return;
    const copy = story.querySelector('[data-pt-story-copy]');
    if (copy) {
        if (copy.dataset.show === '0') { story.hidden = true; return; }
        ['eyebrow', 'title', 'text', 'button'].forEach((k) => {
            const el = story.querySelector(`[data-pt-story-${k}]`);
            if (el && copy.dataset[k]) el.textContent = copy.dataset[k];
        });
    }
    const layer = story.querySelector('[data-pt-story-notes]');
    if (!layer) return;
    const art = artFor(['Peony', 'Bergamot', 'Vanilla', 'Honey', 'Earl Grey Tea']);
    [[56, 14, 40, -20], [74, 8, 30, 30], [95, 24, 46, 12], [60, 88, 34, -30], [97, 80, 38, 18], [52, 52, 26, -8]].forEach(([x, y, size, r], n) => {
        const el = document.createElement('span');
        el.className = 'showcase-note';
        el.style.cssText = `left:${x}%;top:${y}%;--s:${size}px;--r:${r}deg;--d:${n * 120}ms;--f:${6 + (n % 3) * 1.4}s`;
        el.innerHTML = art[n % art.length];
        layer.appendChild(el);
    });
}

export default function pinkTomatoShowcase(context) {
    initStory();
    const root = document.querySelector('[data-pt-showcase]');
    if (!root) return;
    const $ = (sel) => root.querySelector(sel);
    const word = $('[data-pt-showcase-word]');
    const title = $('[data-pt-showcase-title]');
    const text = $('[data-pt-showcase-text]');
    const chips = $('[data-pt-showcase-chips]');
    const link = $('[data-pt-showcase-link]');
    const figure = $('[data-pt-showcase-figure]');
    const arch = $('[data-pt-showcase-arch]');
    const notesLayer = $('[data-pt-showcase-notes]');
    const thumbsList = $('[data-pt-showcase-thumbs]');
    const indexEl = $('[data-pt-showcase-index]');
    const totalEl = $('[data-pt-showcase-total]');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!thumbsList || !arch) return;
    const cutoutUrl = (d) => d.cutout || (CUTOUTS.includes(Number(d.id)) ? root.dataset.cutoutUrl.replace('ID.webp', `${d.id}.webp`) : '');
    const list = (json) => { try { const v = JSON.parse(json || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
    // Scent notes: typed in the admin, else the description's "Scent Notes:" line, else the label, else the name.
    const notesOf = (d) => {
        const typed = list(d.notes);
        if (typed.length) return typed;
        const fromText = notesFromText(d.description || '');
        if (fromText.length) return fromText;
        if (LABEL_NOTES[Number(d.id)]) return LABEL_NOTES[Number(d.id)];
        return String(d.name || '').split(/s+/);
    };

    // Wording saved in the admin (Content → Hero & Banners).
    const copy = root.querySelector('[data-pt-showcase-copy]');
    if (copy) {
        const set = (sel, value) => { const el = $(sel); if (el && value) el.textContent = value; };
        set('[data-pt-showcase-eyebrow]', copy.dataset.eyebrow);
        set('[data-pt-showcase-tagline]', copy.dataset.tagline);
        set('[data-pt-showcase-side-text]', copy.dataset.text);
        set('[data-pt-showcase-all]', copy.dataset.button);
    }

    let thumbs = Array.from(thumbsList.querySelectorAll('.showcase-thumb'));
    let current = 0;
    let timer = null;
    const pad = (n) => String(n).padStart(2, '0');

    // A colour chosen in the admin wins; otherwise the warm tints take turns.
    const fromHex = (hex) => {
        const n = parseInt(hex.slice(1), 16);
        const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        const dark = (v) => Math.round(v * 0.16 + 14);
        return { glow: `rgba(${r}, ${g}, ${b}, .55)`, bg: `rgb(${dark(r)}, ${dark(g)}, ${dark(b)})` };
    };
    const tint = (i) => {
        const chosen = thumbs[i] && thumbs[i].dataset.color;
        const t = chosen ? fromHex(chosen) : TINTS[i % TINTS.length];
        root.style.setProperty('--showcase-glow', t.glow);
        root.style.setProperty('--showcase-bg', t.bg);
    };

    // Scent-note ingredients float in, scatter out on change.
    const showNotes = (d) => {
        if (!notesLayer) return;
        // Uploaded ingredient pictures come first, then the drawn ingredients for each scent note.
        const pictures = list(d.images).map((src) => `<img src="${escapeHtml(src)}" alt="">`);
        const art = [...pictures, ...artFor(notesOf(d))];
        // Same ingredients already floating (e.g. the descriptions just loaded): keep them as they are.
        const key = `${d.id}|${notesOf(d).join(',')}|${list(d.images).join(',')}`;
        if (notesLayer.dataset.key === key) return;
        notesLayer.dataset.key = key;
        Array.from(notesLayer.children).forEach((el) => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 700); });
        SPOTS.forEach((spot, n) => {
            const el = document.createElement('span');
            el.className = 'showcase-note';
            el.style.cssText = `left:${spot.x}%;top:${spot.y}%;--s:${spot.s + 10}px;--r:${spot.r}deg;--d:${n * 90}ms;--f:${6 + (n % 3) * 1.5}s`;
            el.innerHTML = art[n % art.length];
            notesLayer.appendChild(el);
        });
    };

    const showChips = (d) => {
        if (!chips) return;
        const notes = notesOf(d).filter((n) => n.length > 2 && !/^(wax|melt|wick|wooden|candle)$/i.test(n)).slice(0, 4);
        chips.innerHTML = notes.map((n) => `<li>${escapeHtml(n)}</li>`).join('');
        chips.hidden = !notes.length;
    };

    const showCandle = (d, { instant = false } = {}) => {
        const cut = cutoutUrl(d);
        const src = cut || d.image;
        const shown = arch.querySelector('.showcase-img.is-current:not(.is-leaving)');
        // Same candle already showing (for example after the descriptions load): leave it alone.
        if (shown && !shown.classList.contains('is-server') && shown.getAttribute('src') === src) return;
        // Already loading this picture (first visit, slow connection): don't start a second copy.
        if (arch.dataset.pending === src) return;
        arch.dataset.pending = src;
        // First paint: the page's own photo is the right one when there's no cut-out, so just show it.
        if (shown && shown.classList.contains('is-server') && !cut) {
            figure.classList.remove('is-cutout');
            shown.classList.remove('is-server');
            return;
        }
        const img = new Image();
        img.className = 'showcase-img is-entering';
        img.alt = d.name;
        img.src = src;
        const old = Array.from(arch.querySelectorAll('.showcase-img'));
        const place = () => {
            // Switch the frame style only once the new picture is ready, so the old one never shows in the wrong frame.
            figure.classList.toggle('is-cutout', Boolean(cut));
            if (arch.dataset.pending === src) delete arch.dataset.pending;
            if (instant) img.classList.remove('is-entering');
            arch.appendChild(img);
            old.forEach((o) => o.classList.add('is-leaving'));
            requestAnimationFrame(() => requestAnimationFrame(() => img.classList.add('is-current')));
            setTimeout(() => { old.forEach((o) => o.remove()); img.classList.remove('is-entering'); }, reduced ? 0 : 1200);
        };
        if (img.complete) place(); else { img.onload = place; img.onerror = place; }
    };

    const select = (i, { user = false, first = false } = {}) => {
        if (i === current && !user && !first) return;
        const thumb = thumbs[i];
        if (!thumb) return;
        const d = thumb.dataset;
        thumbs.forEach((t, n) => {
            t.classList.toggle('is-active', n === i);
            t.setAttribute('aria-selected', String(n === i));
        });
        const forward = i >= current || (current === thumbs.length - 1 && i === 0);
        current = i;
        tint(i);
        if (indexEl) indexEl.textContent = pad(i + 1);
        showCandle(d, { instant: first });
        showNotes(d);

        // Words: slide the old ones out, then the new ones in.
        root.classList.remove('is-in', 'is-back');
        root.classList.add('is-switching');
        if (!forward) root.classList.add('is-back');
        setTimeout(() => {
            if (word) word.textContent = d.name;
            if (title) title.textContent = d.name;
            if (text) text.textContent = storyText(d.description);
            showChips(d);
            if (link) link.href = d.url;
            root.classList.remove('is-switching');
            void root.offsetWidth; // restart the entrance animation
            root.classList.add('is-in');
        }, reduced || first ? 0 : 320);
    };

    const schedule = () => {
        clearTimeout(timer);
        if (reduced || thumbs.length < 2) return;
        root.style.setProperty('--showcase-autoplay', `${AUTOPLAY_MS}ms`);
        timer = setTimeout(() => select((current + 1) % thumbs.length), AUTOPLAY_MS);
    };

    const bind = () => {
        thumbs.forEach((t, i) => t.addEventListener('click', () => { select(i, { user: true }); schedule(); }));
        if (totalEl) totalEl.textContent = pad(thumbs.length);
        root.classList.toggle('is-single', thumbs.length < 2);
    };

    // Pause while the shopper is reading or hovering.
    root.addEventListener('mouseenter', () => { clearTimeout(timer); root.classList.add('is-paused'); });
    root.addEventListener('mouseleave', () => { root.classList.remove('is-paused'); schedule(); });
    root.addEventListener('focusin', () => { clearTimeout(timer); root.classList.add('is-paused'); });
    thumbsList.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const next = (current + (e.key === 'ArrowRight' ? 1 : thumbs.length - 1)) % thumbs.length;
        select(next, { user: true });
        thumbs[next].focus();
    });

    // A gentle depth effect: ingredients and candle drift with the pointer (computers only).
    if (!reduced && window.matchMedia('(pointer: fine)').matches) {
        root.addEventListener('pointermove', (e) => {
            const r = root.getBoundingClientRect();
            root.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
            root.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
        });
    }

    bind();
    tint(0);
    select(0, { first: true });
    root.classList.add('is-ready');
    schedule();

    // Descriptions (story, scent notes) and the admin's homepage picks come from GraphQL.
    const token = context.storefrontApiToken;
    const slides = list(copy ? copy.dataset.slides : '').filter((x) => x && Number(x.id) > 0).slice(0, 5);
    const marker = document.querySelector('[data-pt-featured]');
    const picked = slides.length ? slides.map((x) => Number(x.id))
        : (marker ? marker.dataset.ptFeatured.split(',').map(Number).filter(Boolean).slice(0, 5) : []);
    const ids = picked.length ? picked : thumbs.map((t) => Number(t.dataset.id)).filter(Boolean);
    if (!token || !ids.length) return;
    fetchProducts(token, ids).then((products) => {
        if (!products.length) return;
        if (picked.length) {
            thumbsList.innerHTML = products.map((p, i) => `<li role="presentation"><button type="button" role="tab" class="showcase-thumb${i === 0 ? ' is-active' : ''}" aria-selected="${i === 0}">
                <img src="" alt="" loading="lazy"><span class="showcase-thumb-bar" aria-hidden="true"></span></button></li>`).join('');
            thumbs = Array.from(thumbsList.querySelectorAll('.showcase-thumb'));
            products.forEach((p, i) => {
                thumbs[i].setAttribute('aria-label', p.name);
                Object.assign(thumbs[i].dataset, { id: String(p.entityId), name: p.name, url: p.path, image: p.defaultImage ? p.defaultImage.zoom : '' });
                thumbs[i].querySelector('img').src = p.defaultImage ? p.defaultImage.thumb : '';
            });
            bind();
        }
        products.forEach((p) => {
            const t = thumbs.find((x) => Number(x.dataset.id) === p.entityId);
            if (!t) return;
            t.dataset.description = p.plainTextDescription || '';
            const slide = slides.find((x) => Number(x.id) === p.entityId);
            if (slide) {
                if (slide.cutout) t.dataset.cutout = slide.cutout;
                t.dataset.notes = JSON.stringify(slide.notes || []);
                t.dataset.images = JSON.stringify(slide.images || []);
                if (slide.color) t.dataset.color = slide.color;
            }
        });
        select(picked.length ? 0 : current, { first: true });
        schedule();
    }).catch(() => { /* keep what the page rendered */ });
}
