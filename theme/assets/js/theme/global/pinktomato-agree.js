// Sign up: "I agree to the Terms of Use and Privacy Policy".
// The two links open the documents in a pop-up on the same page (loaded from the store's own pages, so
// edits to those pages show here too). The box can only be ticked once both have been opened, and the
// account is only sent once it is ticked. Opened documents are remembered for this tab, so a reload after
// a BigCommerce error doesn't make the shopper open them again.
const READ_KEY = 'pt-agree-read';
const DOCS = { terms: 'Terms of Use', privacy: 'Privacy Policy' };

const readSet = () => {
    try { return new Set(JSON.parse(sessionStorage.getItem(READ_KEY) || '[]')); } catch (e) { return new Set(); }
};
const saveRead = (set) => {
    try { sessionStorage.setItem(READ_KEY, JSON.stringify(Array.from(set))); } catch (e) { /* private mode */ }
};

let dialog = null;
function getDialog() {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'pt-doc-dialog';
    dialog.innerHTML = `
        <div class="pt-doc-card">
            <header class="pt-doc-head">
                <h2 class="pt-doc-title"></h2>
                <button type="button" class="pt-doc-close" aria-label="Close">&times;</button>
            </header>
            <div class="pt-doc-body" tabindex="0" autofocus></div>
            <footer class="pt-doc-foot">
                <button type="button" class="button button-primary pt-doc-done">I've read it</button>
            </footer>
        </div>`;
    document.body.appendChild(dialog);
    const close = () => dialog.close();
    dialog.querySelector('.pt-doc-close').addEventListener('click', close);
    dialog.querySelector('.pt-doc-done').addEventListener('click', close);
    // Clicking the dark area outside the card closes it too.
    dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
    dialog.addEventListener('close', () => document.documentElement.classList.remove('pt-doc-open'));
    return dialog;
}

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

function openDoc(link, onOpened) {
    const box = getDialog();
    if (typeof box.showModal !== 'function') {
        // Very old browsers: open the page in a new tab instead.
        window.open(link.href, '_blank', 'noopener');
        onOpened();
        return;
    }
    box.querySelector('.pt-doc-title').textContent = DOCS[link.dataset.ptDoc] || link.textContent;
    const body = box.querySelector('.pt-doc-body');
    body.innerHTML = '<p class="pt-doc-loading">Loading…</p>';
    body.scrollTop = 0;
    box.showModal();
    document.documentElement.classList.add('pt-doc-open');
    loadDoc(link.href).then((html) => {
        body.innerHTML = html;
        body.scrollTop = 0;
        onOpened();
    }).catch(() => {
        body.innerHTML = `<p>This page couldn't load. <a href="${link.href}" target="_blank" rel="noopener">Open it in a new tab</a>.</p>`;
        body.querySelector('a').addEventListener('click', onOpened);
    });
}

function initAgree(form) {
    const label = form.querySelector('[data-pt-agree]');
    const box = label && label.querySelector('input');
    const error = form.querySelector('[data-pt-agree-error]');
    const hint = form.querySelector('[data-pt-agree-hint]');
    if (!box) return;
    const links = Array.prototype.slice.call(label.querySelectorAll('[data-pt-doc]'));
    const read = readSet();

    const say = (text) => {
        if (!error) return;
        error.textContent = text;
        error.hidden = false;
        error.classList.remove('shake');
        error.getBoundingClientRect();
        error.classList.add('shake');
    };
    const refresh = () => {
        links.forEach((a) => a.classList.toggle('is-read', read.has(a.dataset.ptDoc)));
        const ready = links.every((a) => read.has(a.dataset.ptDoc));
        const wasLocked = label.classList.contains('is-locked');
        label.classList.toggle('is-locked', !ready);
        box.disabled = !ready;
        if (hint) {
            const left = links.filter((a) => !read.has(a.dataset.ptDoc)).map((a) => DOCS[a.dataset.ptDoc]);
            hint.textContent = ready ? 'Thanks for reading. You can tick the box now.' : `Open the ${left.join(' and the ')} to tick the box.`;
            hint.classList.toggle('is-ready', ready);
        }
        if (ready && wasLocked) {
            label.classList.add('is-unlocked');
            if (error) error.hidden = true;
        }
    };

    links.forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            openDoc(link, () => {
                read.add(link.dataset.ptDoc);
                saveRead(read);
                refresh();
            });
        });
    });

    // Trying to tick the box before opening both documents.
    label.addEventListener('click', (event) => {
        if (!box.disabled || event.target.closest('[data-pt-doc]')) return;
        event.preventDefault();
        say('Please open the Terms of Use and Privacy Policy first, then tick the box.');
    });
    box.addEventListener('change', () => { if (box.checked && error) error.hidden = true; });

    const remind = () => {
        say(box.disabled ? 'Please open the Terms of Use and Privacy Policy first, then tick the box.' : 'Please tick the box to agree to the Terms of Use and Privacy Policy.');
        label.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (!box.disabled) box.focus({ preventScroll: true });
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

    refresh();
}

export default function pinkTomatoAgree() {
    const signup = document.querySelector('form[data-create-account-form]');
    if (signup) initAgree(signup);
}
