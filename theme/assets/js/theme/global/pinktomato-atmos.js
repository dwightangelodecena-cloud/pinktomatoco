// Atmosphere for the dark bands and the whole page (references: grainient.supply, horizonx.so, landonorris.com):
//  - Grainy aurora: slow drifting candle-coloured light blobs with film grain and twinkling stars
//    behind every dark band (night headers, story band, mood finder, footer).
//  - Ember streams: fine flowing light lines drawn on a canvas, like HorizonX "Silver Stream" in amber.
//  - Scramble labels: small eyebrow labels decode letter by letter when they come into view ("Pixel Scan").
//  - Ember cursor: a soft glowing dot that trails the mouse and swells over links (desktop only).
// Everything pauses when off-screen; nothing runs with reduced motion.
const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = () => window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const DARK_BANDS = '.pt-night, .story-band, .mood-finder, .main-footer';

// ---------- Grainy aurora + stars ----------
function aurora(band) {
    if (band.querySelector(':scope > .pt-aurora')) return;
    const el = document.createElement('span');
    el.className = 'pt-aurora';
    el.setAttribute('aria-hidden', 'true');
    let stars = '';
    const count = window.innerWidth < 700 ? 10 : 22;
    for (let i = 0; i < count; i++) {
        stars += `<i style="left:${(i * 47 + 13) % 100}%;top:${(i * 29 + 7) % 100}%;--tw:${2.4 + ((i * 7) % 5) * 0.6}s;--td:${(i * 0.37) % 3}s;--ts:${0.6 + ((i * 3) % 4) * 0.25}"></i>`;
    }
    el.innerHTML = `<b class="pt-blob pt-blob-1"></b><b class="pt-blob pt-blob-2"></b><b class="pt-blob pt-blob-3"></b><span class="pt-stars">${stars}</span><span class="pt-grain"></span>`;
    band.insertBefore(el, band.firstChild);
    band.classList.add('has-aurora');
}

// ---------- Ember streams (canvas) ----------
function streams(band) {
    if (band.querySelector(':scope > .pt-streams')) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'pt-streams';
    canvas.setAttribute('aria-hidden', 'true');
    band.insertBefore(canvas, band.firstChild);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let running = false;
    let frame = 0;
    let t = Math.random() * 1000;
    const LINES = window.innerWidth < 700 ? 16 : 34;

    const size = () => {
        const r = band.getBoundingClientRect();
        w = Math.max(1, Math.round(r.width));
        h = Math.max(1, Math.round(r.height));
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    // Each line is a soft wave flowing across the band, bent by slow noise-like sines.
    const draw = () => {
        ctx.clearRect(0, 0, w, h);
        ctx.lineWidth = 1;
        for (let i = 0; i < LINES; i++) {
            const k = i / LINES;
            const base = h * (0.15 + k * 0.85);
            const amp = h * (0.08 + 0.1 * Math.sin(k * 6 + t * 0.15));
            const alpha = 0.05 + 0.12 * Math.pow(Math.sin(k * Math.PI), 2);
            const grad = ctx.createLinearGradient(0, 0, w, 0);
            grad.addColorStop(0, 'rgba(245,166,90,0)');
            grad.addColorStop(0.45, `rgba(255,200,140,${alpha})`);
            grad.addColorStop(1, `rgba(200,71,79,${alpha * 0.6})`);
            ctx.strokeStyle = grad;
            ctx.beginPath();
            for (let x = 0; x <= w; x += 14) {
                const u = x / w;
                const y = base
                    + Math.sin(u * 3.2 + t * 0.35 + k * 4) * amp
                    + Math.sin(u * 7.1 - t * 0.22 + k * 9) * amp * 0.35
                    - u * h * 0.25;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    };
    const loop = () => {
        if (!running) return;
        t += 0.016;
        draw();
        frame = requestAnimationFrame(loop);
    };
    size();
    draw();
    window.addEventListener('resize', () => { size(); draw(); });
    if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => entries.forEach((e) => {
            running = e.isIntersecting;
            cancelAnimationFrame(frame);
            if (running) loop();
        })).observe(band);
    }
}

// ---------- Scramble labels ----------
const GLYPHS = '·•✦*+=/<>01ABCDEFGHJKLMNPRSTUVWXYZ';
function scramble(el) {
    if (el.dataset.ptScramble) return;
    el.dataset.ptScramble = '1';
    const finalText = el.textContent;
    // Only plain-text labels (never ones holding an icon or a link).
    if (el.children.length || !finalText.trim() || finalText.length > 60) return;
    let frame = 0;
    const total = 22;
    const run = () => {
        frame += 1;
        let out = '';
        for (let i = 0; i < finalText.length; i++) {
            const ch = finalText[i];
            const settleAt = (i / finalText.length) * total * 0.8 + 4;
            out += ch === ' ' || frame >= settleAt ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        el.textContent = out;
        if (frame < total + 4) requestAnimationFrame(run); else el.textContent = finalText;
    };
    const go = () => requestAnimationFrame(run);
    if (!('IntersectionObserver' in window)) { go(); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        setTimeout(go, 200);
    }), { threshold: 0.6 });
    io.observe(el);
}

// ---------- Ember cursor ----------
function emberCursor() {
    if (!finePointer() || document.querySelector('.pt-cursor')) return;
    const dot = document.createElement('span');
    dot.className = 'pt-cursor';
    dot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot);
    let x = -100;
    let y = -100;
    let cx = x;
    let cy = y;
    let moving = false;
    const tick = () => {
        cx += (x - cx) * 0.18;
        cy += (y - cy) * 0.18;
        dot.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
        if (Math.abs(x - cx) > 0.3 || Math.abs(y - cy) > 0.3) requestAnimationFrame(tick); else moving = false;
    };
    document.addEventListener('pointermove', (e) => {
        x = e.clientX;
        y = e.clientY;
        dot.classList.add('is-on');
        const hot = e.target.closest && e.target.closest('a, button, [role="button"], .product-item, .category-tile, input, select, textarea, label');
        dot.classList.toggle('is-hot', Boolean(hot));
        dot.classList.toggle('is-dark', Boolean(e.target.closest && e.target.closest(DARK_BANDS)));
        if (!moving) { moving = true; requestAnimationFrame(tick); }
    }, { passive: true });
    document.addEventListener('pointerleave', () => dot.classList.remove('is-on'));
    document.addEventListener('pointerdown', () => { dot.classList.add('is-press'); setTimeout(() => dot.classList.remove('is-press'), 260); });
}

function decorate() {
    Array.prototype.slice.call(document.querySelectorAll(DARK_BANDS)).forEach((band) => {
        aurora(band);
        if (!band.classList.contains('main-footer')) streams(band);
    });
    Array.prototype.slice.call(document.querySelectorAll('.eyebrow, .product-scents-label, .dash-section')).forEach(scramble);
}

export default function pinkTomatoAtmos() {
    if (reduced()) return;
    // Night bands are created by pinktomato-fx.js on load; run after it.
    setTimeout(decorate, 60);
    emberCursor();
}
