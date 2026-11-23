// Keep the shop smooth: decorative animations only run while their section is on screen.
// Sections that leave the screen get .pt-paused (every animation inside stops), and get it removed
// as soon as they scroll back in. A hidden browser tab pauses everything.
const WATCH = [
    '.announcement-bar', '.showcase', '.pt-light', '.pt-night', '.has-aurora', '.story-band', '.mood-finder',
    '.category-tile', '.product-page .product-images', '.main-footer', '.pt-404', '.promo-section', '.home-categories',
].join(',');

// Light mode for slow devices: measure the frame rate for about a second after the page settles.
// Under 45 frames a second (or with Data Saver on), the looping decorations hold still from then on
// (remembered for the visit). Entrances, hovers and the scrolling message bar still move.
function lightModeCheck() {
    const root = document.documentElement;
    let saved = null;
    try { saved = sessionStorage.getItem('pt-lite'); } catch (e) { /* private mode */ }
    const conn = navigator.connection;
    if (saved === '1' || (conn && conn.saveData)) { root.classList.add('pt-lite'); return; }
    setTimeout(() => {
        let frames = 0;
        const start = performance.now();
        const count = (now) => {
            frames += 1;
            if (now - start < 1200) { requestAnimationFrame(count); return; }
            const fps = frames / ((now - start) / 1000);
            const lite = fps < 24;
            root.classList.toggle('pt-lite', lite);
            if (lite) { try { sessionStorage.setItem('pt-lite', '1'); } catch (e) { /* private mode */ } }
        };
        requestAnimationFrame(count);
    }, 3500);
}

export default function pinkTomatoPerf() {
    lightModeCheck();
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
        e.target.classList.toggle('pt-paused', !e.isIntersecting);
    }), { rootMargin: '120px 0px' });
    const seen = new WeakSet();
    const scan = () => {
        Array.prototype.slice.call(document.querySelectorAll(WATCH)).forEach((el) => {
            if (seen.has(el)) return;
            seen.add(el);
            io.observe(el);
        });
    };
    // Decorations are added a moment after load (fx, atmosphere), so look again shortly after.
    scan();
    setTimeout(scan, 400);
    setTimeout(scan, 1500);
    // While the page is scrolling, decorative motion holds still so the scroll gets the full frame budget.
    const root = document.documentElement;
    let timer = 0;
    window.addEventListener('scroll', () => {
        if (!timer) root.classList.add('pt-scrolling');
        clearTimeout(timer);
        timer = setTimeout(() => { timer = 0; root.classList.remove('pt-scrolling'); }, 180);
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
        document.documentElement.classList.toggle('pt-tab-hidden', document.hidden);
    });
}
