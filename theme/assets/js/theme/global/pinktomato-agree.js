// Sign up: "I agree to the Terms of Use and Privacy Policy".
// Ticking the box, or clicking either link, opens one pop-up with both documents (loaded from the
// store's own pages, so edits to those pages show here too). The box is ticked from the pop-up's
// "I agree" button, and the account is only sent once it is ticked.
const DOCS = [
    { id: 'terms', title: 'Terms of Use', url: '/terms-of-use/' },
    { id: 'privacy', title: 'Privacy Policy', url: '/privacy-policy/' },
];

// "I agree" needs both: scrolled to the end, and the pop-up open long enough to read (in total).
const MIN_READ_MS = 30000;

const cache = {};
function loadDoc(url) {
    if (!cache[url]) {
        cache[url] = fetch(url, { credentials: 'same-origin' })
            .then((r) => (r.ok ? r.text() : Promise.reject(new Error('missing'))))
            .then((html) => {
                const page = new DOMParser().parseFromString(html, 'text/html').querySelector('.page.rte, .page-content, main');
                if (!page) throw new Error('missing');
                const heading = page.querySelector('h1');
                if (heading) heading.remove();
                page.querySelectorAll('script, iframe, form').forEach((el) => el.remove());
                page.querySelectorAll('a[href]').forEach((a) => { a.target = '_blank'; a.rel = 'noopener'; });
                return page.innerHTML;
            });
        cache[url].catch(() => { delete cache[url]; });
    }
    return cache[url];
}

function buildDialog(onAgree) {
    const dialog = document.createElement('dialog');
    dialog.className = 'pt-doc-dialog';
    dialog.innerHTML = `
        <div class="pt-doc-card">
            <header class="pt-doc-head">
                <div>
                    <p class="pt-doc-eyebrow">Before you join</p>
                    <h2 class="pt-doc-title">Terms of Use &amp; Privacy Policy</h2>
                </div>
                <button type="button" class="pt-doc-close" aria-label="Close">&times;</button>
            </header>
            <nav class="pt-doc-tabs" aria-label="Jump to">
                ${DOCS.map((d) => `<button type="button" data-pt-jump="${d.id}">${d.title}</button>`).join('')}
            </nav>
            <div class="pt-doc-body" tabindex="0" autofocus>
                ${DOCS.map((d) => `<section class="pt-doc-section" id="pt-doc-${d.id}"><h3>${d.title}</h3><div data-pt-doc-text="${d.id}"><p class="pt-doc-loading">Loading…</p></div></section>`).join('')}
            </div>
            <div class="pt-doc-progress" aria-hidden="true"><span></span></div>
            <footer class="pt-doc-foot">
                <button type="button" class="button button-secondary pt-doc-cancel">Not now</button>
                <button type="button" class="button button-primary pt-doc-agree" disabled>Read to the end</button>
            </footer>
        </div>`;
    document.body.appendChild(dialog);

    const body = dialog.querySelector('.pt-doc-body');
    const tabs = Array.prototype.slice.call(dialog.querySelectorAll('[data-pt-jump]'));
    const close = () => dialog.close();
    dialog.querySelector('.pt-doc-close').addEventListener('click', close);
    dialog.querySelector('.pt-doc-cancel').addEventListener('click', close);
    dialog.querySelector('.pt-doc-agree').addEventListener('click', () => { onAgree(); close(); });
    dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
    dialog.addEventListener('close', () => {
        document.documentElement.classList.remove('pt-doc-open');
        if (openedAt) { readMs += Date.now() - openedAt; openedAt = 0; }
        clearInterval(ticker);
    });

    // The tab for whichever document is in view is highlighted; tapping a tab jumps to it.
    const markTab = () => {
        const second = dialog.querySelector('#pt-doc-privacy');
        const inSecond = second && second.offsetTop - body.offsetTop <= body.scrollTop + 40;
        tabs.forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.ptJump === (inSecond ? 'privacy' : 'terms'))));
    };
    tabs.forEach((tab) => tab.addEventListener('click', () => {
        const section = dialog.querySelector(`#pt-doc-${tab.dataset.ptJump}`);
        body.scrollTo({ top: section.offsetTop - body.offsetTop, behavior: 'smooth' });
    }));
    // "I agree" only works once the reader has scrolled to the end of both documents.
    const agreeButton = dialog.querySelector('.pt-doc-agree');
    const bar = dialog.querySelector('.pt-doc-progress span');
    let loaded = 0;
    let atEnd = false;
    let ready = false;
    let readMs = 0;
    let openedAt = 0;
    let ticker = null;
    const timeRead = () => readMs + (openedAt ? Date.now() - openedAt : 0);
    const checkEnd = () => {
        if (ready) return;
        const room = body.scrollHeight - body.clientHeight;
        const done = room <= 0 ? 1 : Math.min(1, body.scrollTop / room);
        bar.style.width = (done * 100) + '%';
        if (loaded === DOCS.length && (room <= 0 || body.scrollTop >= room - 24)) atEnd = true;
        const left = Math.ceil((MIN_READ_MS - timeRead()) / 1000);
        if (atEnd && left <= 0) {
            ready = true;
            clearInterval(ticker);
            bar.style.width = '100%';
            agreeButton.disabled = false;
            agreeButton.textContent = 'I agree';
            agreeButton.classList.add('is-ready');
        } else if (atEnd) {
            agreeButton.textContent = `Keep reading · 0:${String(left).padStart(2, '0')}`;
        } else {
            agreeButton.textContent = 'Read to the end';
        }
    };
    body.addEventListener('scroll', () => { markTab(); checkEnd(); }, { passive: true });

    DOCS.forEach((d) => {
        const holder = dialog.querySelector(`[data-pt-doc-text="${d.id}"]`);
        loadDoc(d.url).then((html) => { holder.innerHTML = html; }).catch(() => {
            holder.innerHTML = `<p>This couldn't load. <a href="${d.url}" target="_blank" rel="noopener">Open the ${d.title} in a new tab</a>.</p>`;
        }).then(() => { loaded += 1; checkEnd(); });
    });

    return {
        open(jumpTo) {
            if (typeof dialog.showModal !== 'function') {
                window.open(DOCS[0].url, '_blank', 'noopener');
                return;
            }
            dialog.showModal();
            document.documentElement.classList.add('pt-doc-open');
            openedAt = Date.now();
            clearInterval(ticker);
            if (!ready) ticker = setInterval(checkEnd, 1000);
            const section = jumpTo && dialog.querySelector(`#pt-doc-${jumpTo}`);
            body.scrollTop = section ? section.offsetTop - body.offsetTop : 0;
            markTab();
            checkEnd();
        },
    };
}

function initAgree(form) {
    const label = form.querySelector('[data-pt-agree]');
    const box = label && label.querySelector('input');
    const error = form.querySelector('[data-pt-agree-error]');
    if (!box) return;

    const agree = () => {
        box.checked = true;
        box.dispatchEvent(new Event('change', { bubbles: true }));
        label.classList.remove('is-just-agreed');
        label.getBoundingClientRect();
        label.classList.add('is-just-agreed');
    };
    let popup = null;
    const openPopup = (jumpTo) => {
        if (!popup) popup = buildDialog(agree);
        popup.open(jumpTo);
    };

    // Clicking either link opens the pop-up at that document.
    label.querySelectorAll('[data-pt-doc]').forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            openPopup(link.dataset.ptDoc);
        });
    });
    // Ticking the box opens the pop-up; it gets ticked from "I agree". Unticking works as usual.
    label.addEventListener('click', (event) => {
        if (event.target.closest('[data-pt-doc]')) return;
        if (event.target === box) {
            // The browser has already flipped the box: a click that ticks it is undone and opens the pop-up.
            if (!box.checked) return; // unticking works as usual
            event.preventDefault();
            openPopup('terms');
            return;
        }
        if (box.checked) return; // clicking the words of a ticked row lets it untick as usual
        event.preventDefault();
        openPopup('terms');
    });
    box.addEventListener('keydown', (event) => {
        if ((event.key === ' ' || event.key === 'Enter') && !box.checked) {
            event.preventDefault();
            openPopup('terms');
        }
    });
    box.addEventListener('change', () => { if (box.checked && error) error.hidden = true; });

    const remind = () => {
        if (error) {
            error.hidden = false;
            error.classList.remove('shake');
            error.getBoundingClientRect();
            error.classList.add('shake');
        }
        label.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    // The browser's own "tick this box" bubble is replaced by the message under the box.
    box.addEventListener('invalid', (event) => {
        event.preventDefault();
        remind();
    });
    form.addEventListener('submit', (event) => {
        if (box.checked) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        remind();
    }, true);
}

export default function pinkTomatoAgree() {
    const signup = document.querySelector('form[data-create-account-form]');
    if (signup) initAgree(signup);
}
