// Sign-in candle: tap the wick to light it and bring in the form; tap the flame to blow it out.
// Markup: components/pinktomato/auth-candle.html. Styles: scss/pinktomato/_candle.scss.
const LIT_KEY = 'pt-candle-lit';

const store = {
    get: () => { try { return sessionStorage.getItem(LIT_KEY) === '1'; } catch (e) { return false; } },
    set: (on) => { try { if (on) sessionStorage.setItem(LIT_KEY, '1'); else sessionStorage.removeItem(LIT_KEY); } catch (e) { /* private mode */ } },
};

// Short, quiet sounds made in the browser (no files): a match-strike whoosh and a soft breath.
let audio;
function sound(kind) {
    try {
        audio = audio || new (window.AudioContext || window.webkitAudioContext)();
        const now = audio.currentTime;
        const length = kind === 'light' ? 0.55 : 0.6;
        const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * length), audio.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const noise = audio.createBufferSource();
        noise.buffer = buffer;
        const filter = audio.createBiquadFilter();
        const gain = audio.createGain();
        if (kind === 'light') {
            // Strike: bright crackle that settles into a low whoosh.
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(2600, now);
            filter.frequency.exponentialRampToValueAtTime(500, now + 0.45);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(0.09, now + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
            // A warm low hum as the flame catches.
            const hum = audio.createOscillator();
            const humGain = audio.createGain();
            hum.type = 'sine';
            hum.frequency.setValueAtTime(140, now + 0.08);
            humGain.gain.setValueAtTime(0.0001, now);
            humGain.gain.linearRampToValueAtTime(0.035, now + 0.14);
            humGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
            hum.connect(humGain).connect(audio.destination);
            hum.start(now + 0.05);
            hum.stop(now + 0.55);
        } else {
            // Blow: soft, low breath.
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(900, now);
            filter.frequency.exponentialRampToValueAtTime(250, now + 0.55);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(0.07, now + 0.12);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);
        }
        noise.connect(filter).connect(gain).connect(audio.destination);
        noise.start(now);
        noise.stop(now + length);
    } catch (e) { /* no sound is fine */ }
}

export default function pinkTomatoCandle() {
    const room = document.querySelector('[data-pt-candle-room]');
    const scene = room && room.querySelector('[data-pt-candle]');
    const card = room && room.querySelector('[data-pt-candle-card]');
    if (!scene || !card) return;

    const wick = scene.querySelector('[data-pt-candle-light]');
    const flame = scene.querySelector('[data-pt-candle-out]');
    const hint = scene.querySelector('[data-pt-candle-hint]');
    const title = scene.querySelector('[data-pt-candle-title]');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let busy = false;

    // The room's light is centred on the flame, wherever the layout puts it.
    const aim = () => {
        const r = room.getBoundingClientRect();
        const f = wick.getBoundingClientRect();
        room.style.setProperty('--fx', `${f.left + f.width / 2 - r.left}px`);
        room.style.setProperty('--fy', `${f.top - r.top - 18}px`);
    };
    aim();
    window.addEventListener('resize', aim);
    // The candle slides aside as it lights, so keep the light on the flame while it moves.
    const follow = (ms) => {
        const end = performance.now() + ms;
        const step = () => { aim(); if (performance.now() < end) requestAnimationFrame(step); };
        requestAnimationFrame(step);
    };

    const setCard = (shown) => {
        card.hidden = false;
        card.inert = !shown;
        card.setAttribute('aria-hidden', shown ? 'false' : 'true');
        wick.tabIndex = shown ? -1 : 0;
        flame.tabIndex = shown ? 0 : -1;
        hint.textContent = shown ? hint.dataset.lit : hint.dataset.unlit;
        if (title) title.textContent = shown ? title.dataset.lit : title.dataset.unlit;
    };

    const light = ({ instant = false, focus = true } = {}) => {
        if (busy || room.classList.contains('is-lit')) return;
        busy = true;
        room.classList.remove('is-out', 'is-closing');
        if (instant || reduced) room.classList.add('is-instant');
        room.classList.add('is-lit');
        setCard(true);
        store.set(true);
        follow(1300);
        if (!instant && !reduced) sound('light');
        const done = () => {
            busy = false;
            room.classList.remove('is-instant');
            if (!focus) return;
            const first = card.querySelector('input:not([type="hidden"]), select, textarea');
            if (first) first.focus({ preventScroll: true });
            // On phones the form sits under the candle, so bring it into view below the sticky header.
            if (window.innerWidth < 992) {
                const header = document.querySelector('[data-pt-header]');
                const offset = (header ? header.getBoundingClientRect().height : 70) + 12;
                // Layout position (offsetTop), not the on-screen one: the card is still mid-animation.
                let top = 0;
                for (let el = card; el; el = el.offsetParent) top += el.offsetTop;
                window.scrollTo({ top: top - offset, behavior: reduced ? 'auto' : 'smooth' });
            }
        };
        if (instant || reduced) done(); else setTimeout(done, 900);
    };

    const blowOut = () => {
        if (busy || !room.classList.contains('is-lit')) return;
        busy = true;
        if (!reduced) sound('out');
        room.classList.add('is-closing', 'is-out');
        room.classList.remove('is-lit');
        store.set(false);
        setTimeout(() => {
            room.classList.remove('is-closing');
            setCard(false);
            follow(1300);
            busy = false;
            wick.focus({ preventScroll: true });
        }, reduced ? 0 : 650);
        // The smoke drifts off on its own.
        setTimeout(() => room.classList.remove('is-out'), 2200);
    };

    wick.addEventListener('click', () => light());
    flame.addEventListener('click', blowOut);
    // Escape blows the candle out too, when focus isn't in a field.
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && room.classList.contains('is-lit') && !e.target.closest('input, textarea, select')) blowOut();
    });

    // Start lit when the shopper was sent here to sign in (checkout, wishlist...), after an error,
    // when moving between Sign in and Create account with the candle already lit, or when a form message shows.
    const params = new URLSearchParams(window.location.search);
    const from = params.get('from');
    const sentHere = from && from !== 'index.php';
    const hasMessage = card.querySelector('.auth-error, .form-message, .alertBox');
    if (scene.hasAttribute('data-pt-candle-autolight') || sentHere || hasMessage || store.get() || reduced) {
        light({ instant: true, focus: false });
    } else {
        setCard(false);
    }
    room.classList.add('is-ready');
}
