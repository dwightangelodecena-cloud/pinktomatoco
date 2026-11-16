// "You're all set" card: a check that draws itself with a glowing spark running along the line,
// then a Continue button that glows in. Used after an email code is confirmed, after a new password,
// and on the account-created page (cards already in the page are started on load).
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CHECK = 'M22 49 L47 73 L98 22';
const DRAW_MS = 900;
const DELAY_MS = 350;

export function successMarkup({ title, text, button, href }) {
    const action = href
        ? `<a class="button button-primary pt-success-btn" href="${esc(href)}">${esc(button)}</a>`
        : `<button type="button" class="button button-primary pt-success-btn">${esc(button)}</button>`;
    return `
        <span class="pt-success-glow" aria-hidden="true"></span>
        <h2 class="pt-success-title" tabindex="-1">${esc(title)}</h2>
        <p class="pt-success-text">${esc(text)}</p>
        <svg class="pt-success-check" viewBox="0 0 120 96" aria-hidden="true">
            <path class="pt-success-track" d="${CHECK}"/>
            <path class="pt-success-line" d="${CHECK}"/>
            <circle class="pt-success-spark" r="6" cx="22" cy="49"/>
        </svg>
        ${action}`;
}

// The spark rides the tip of the line while it draws, then fades into the glow.
export function playSuccess(card) {
    const line = card.querySelector('.pt-success-line');
    const spark = card.querySelector('.pt-success-spark');
    if (!line || !spark || card.dataset.played) return;
    card.dataset.played = '1';
    const length = line.getTotalLength();
    line.style.strokeDasharray = String(length);
    line.style.strokeDashoffset = String(length);
    if (reduced()) {
        line.style.strokeDashoffset = '0';
        card.classList.add('is-drawn');
        return;
    }
    const start = performance.now() + DELAY_MS;
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const frame = (now) => {
        const t = Math.min(1, Math.max(0, (now - start) / DRAW_MS));
        const done = ease(t) * length;
        line.style.strokeDashoffset = String(length - done);
        const point = line.getPointAtLength(done);
        spark.setAttribute('cx', point.x);
        spark.setAttribute('cy', point.y);
        spark.style.opacity = t > 0 && t < 1 ? '1' : '0';
        if (t < 1) requestAnimationFrame(frame);
        else card.classList.add('is-drawn');
    };
    requestAnimationFrame(frame);
}

export function successCard(options) {
    const card = document.createElement('div');
    card.className = 'pt-success';
    card.setAttribute('role', 'status');
    card.innerHTML = successMarkup(options);
    const btn = card.querySelector('.pt-success-btn');
    if (options.onContinue && btn.tagName === 'BUTTON') {
        btn.addEventListener('click', () => {
            btn.disabled = true;
            btn.classList.add('is-busy');
            options.onContinue(btn);
        });
    }
    return card;
}

export default function pinkTomatoSuccess() {
    document.querySelectorAll('.pt-success').forEach((card) => playSuccess(card));
}
