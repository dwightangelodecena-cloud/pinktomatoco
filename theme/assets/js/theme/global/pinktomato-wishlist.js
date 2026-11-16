// Wishlist hearts: tapping a heart saves the candle to the shopper's wishlist in the background
// (no page change) and turns the heart red. Saved candles stay red on every page.
const KEY = 'pt-wishlisted';
// The saved hearts belong to whoever is signed in; when that changes, start fresh.
(function resetForNewAccount() {
    try {
        const me = String(Number(window.ptCustomerId) || 0);
        if (localStorage.getItem('pt-wishlisted-owner') !== me) {
            localStorage.removeItem(KEY);
            localStorage.setItem('pt-wishlisted-owner', me);
        }
    } catch (e) { /* private mode */ }
}());
const read = () => { try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (e) { return new Set(); } };
const write = (set) => { try { localStorage.setItem(KEY, JSON.stringify(Array.from(set))); } catch (e) { /* private mode */ } };
const idOf = (form) => { const m = (form.getAttribute('action') || '').match(/product_id=(\d+)/); return m ? m[1] : null; };
const isWishForm = (form) => /wishlist\.php\?action=add/.test(form.getAttribute('action') || '');

function paint(root = document) {
    const saved = read();
    Array.from(root.querySelectorAll('form')).filter(isWishForm).forEach((form) => {
        const on = saved.has(idOf(form));
        const btn = form.querySelector('button, [type=submit]');
        if (!btn) return;
        if (btn.classList.contains('is-wished') === on && btn.dataset.ptPainted) return;
        btn.dataset.ptPainted = '1';
        btn.classList.toggle('is-active', on);
        btn.classList.toggle('is-wished', on);
        btn.setAttribute('aria-pressed', String(on));
        if (btn.classList.contains('wishlist-button')) {
            const label = btn.querySelector('[data-pt-wish-label]') || (() => { const s = document.createElement('span'); s.dataset.ptWishLabel = ''; Array.from(btn.childNodes).filter((n) => n.nodeType === 3).forEach((n) => n.remove()); btn.appendChild(s); return s; })();
            const text = on ? ' Saved to wishlist' : ' Wishlist';
            if (label.textContent !== text) label.textContent = text;
        }
    });
}

function toast(text, link) {
    let t = document.querySelector('.wish-toast');
    if (!t) { t = document.createElement('div'); t.className = 'wish-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = '';
    t.append(text);
    if (link) { const a = document.createElement('button'); a.type = 'button'; a.textContent = 'View'; a.addEventListener('click', link); t.appendChild(a); }
    t.classList.add('is-on');
    clearTimeout(t.timer);
    t.timer = setTimeout(() => t.classList.remove('is-on'), 2600);
}

export default function pinkTomatoWishlist() {
    const drawer = document.querySelector('[data-pt-cart]');
    const signedIn = drawer && drawer.dataset.signedIn === '1';
    paint();
    // Product cards loaded later (homepage picks, quick view, "You may also like").
    // (batched to one repaint per frame, and the repaint itself only touches hearts that changed)
    let queued = false;
    new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; paint(); });
    }).observe(document.body, { childList: true, subtree: true });

    document.addEventListener('submit', async (event) => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement) || !isWishForm(form)) return;
        event.preventDefault();
        if (!signedIn) {
            window.location.href = `${drawer ? drawer.dataset.loginUrl : '/login.php'}?from=index.php`;
            return;
        }
        const id = idOf(form);
        const saved = read();
        if (saved.has(id)) {
            toast('Already in your wishlist', () => window.ptOpenWishlist && window.ptOpenWishlist());
            return;
        }
        const btn = form.querySelector('button, [type=submit]');
        if (btn) btn.classList.add('is-busy');
        try {
            const res = await fetch(form.action, { method: 'POST', credentials: 'same-origin', body: new FormData(form) });
            if (!res.ok) throw new Error(String(res.status));
            saved.add(id);
            write(saved);
            paint();
            if (btn) { btn.classList.remove('is-pop'); void btn.offsetWidth; btn.classList.add('is-pop'); }
            toast('Saved to your wishlist ♥', () => window.ptOpenWishlist && window.ptOpenWishlist());
        } catch (e) {
            toast('Could not save. Please try again.');
        }
        if (btn) btn.classList.remove('is-busy');
    }, true);
}
