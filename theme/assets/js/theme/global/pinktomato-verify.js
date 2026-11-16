// Email codes on the sign-up and forgot-password pages.
// Sign up: the form is checked as usual, then a 6-digit code is emailed; the account is only created
// once the right code is typed. Forgot password: email -> code -> new password -> signed in.
// The codes are made, emailed and checked by the Pink Tomato admin app (admin/worker/verify.js).
// Until an email service is connected there, both pages simply work the way BigCommerce does.
import { playSuccess, successCard } from './pinktomato-success';

const API = 'https://pinktomato-admin.pinktomato-admin.workers.dev/verify';
const RESEND_AFTER = 30; // seconds
const VERIFIED_KEY = 'pt-verified-signup';

const icon = (name, size) => `<svg class="pt-i" width="${size}" height="${size}" aria-hidden="true"><use href="#pt-${name}"></use></svg>`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function post(path, body) {
    return fetch(`${API}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).then((r) => r.json().catch(() => ({})).then((data) => {
        if (!r.ok) {
            const err = new Error(data.error || 'Something went wrong. Please try again.');
            err.data = data;
            throw err;
        }
        return data;
    }));
}

let configPromise = null;
function isEnabled() {
    if (!configPromise) {
        configPromise = fetch(`${API}/config`).then((r) => r.json()).then((c) => Boolean(c && c.enabled)).catch(() => null);
        configPromise.then((on) => { if (on === null) configPromise = null; });
    }
    return configPromise;
}

// Remembers (for this tab only) that an email was confirmed, so a page reload after a BigCommerce
// error (an expired reCAPTCHA, say) doesn't make the shopper wait for another code.
const verified = {
    get(email) {
        try {
            const v = JSON.parse(sessionStorage.getItem(VERIFIED_KEY) || 'null');
            return v && v.email === email && v.until > Date.now();
        } catch (e) { return false; }
    },
    set(email) {
        try { sessionStorage.setItem(VERIFIED_KEY, JSON.stringify({ email, until: Date.now() + 14 * 60000 })); } catch (e) { /* private window */ }
    },
};


// The code screen: six glowing boxes over one real input (so paste and phone autofill work).
function codeScreen({ email, purpose, onVerified, onBack }) {
    const el = document.createElement('div');
    el.className = 'pt-code';
    el.innerHTML = `
        <div class="auth-heading">
            <span class="auth-step">${icon('mail', 22)}</span>
            <h1 tabindex="-1">Check your email</h1>
            <p>We sent a 6-digit code to <strong>${esc(email)}</strong>. It works for 10 minutes.</p>
        </div>
        <label class="pt-code-row">
            <span class="sr-only">6-digit code</span>
            <input class="pt-code-input" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="6" spellcheck="false">
            ${'<span class="pt-code-slot"><span class="pt-code-digit"></span><span class="pt-code-wick"></span></span>'.repeat(6)}
        </label>
        <p class="pt-code-status" role="status" aria-live="polite"></p>
        <button type="button" class="pt-code-resend" disabled>
            <svg class="pt-code-timer" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8"/></svg>
            <span>Resend code</span>
        </button>
        <button type="button" class="pt-code-back">Use a different email</button>`;

    const input = el.querySelector('.pt-code-input');
    const slots = Array.prototype.slice.call(el.querySelectorAll('.pt-code-slot'));
    const status = el.querySelector('.pt-code-status');
    const resend = el.querySelector('.pt-code-resend');
    const resendLabel = resend.querySelector('span');
    let busy = false;
    let timer = null;

    const paint = () => {
        const value = input.value;
        slots.forEach((slot, i) => {
            const digit = slot.querySelector('.pt-code-digit');
            const had = digit.textContent;
            digit.textContent = value[i] || '';
            slot.classList.toggle('is-filled', Boolean(value[i]));
            slot.classList.toggle('is-active', document.activeElement === input && i === Math.min(value.length, 5) && !busy);
            if (value[i] && !had) {
                slot.classList.remove('is-lit');
                slot.getBoundingClientRect();
                slot.classList.add('is-lit');
            }
        });
    };

    const countdown = () => {
        let left = RESEND_AFTER;
        resend.disabled = true;
        resend.style.setProperty('--left', '1');
        clearInterval(timer);
        const tick = () => {
            resendLabel.textContent = left > 0 ? `Resend code in 0:${String(left).padStart(2, '0')}` : 'Resend code';
            resend.style.setProperty('--left', String(left / RESEND_AFTER));
            if (left <= 0) { clearInterval(timer); resend.disabled = false; }
            left -= 1;
        };
        tick();
        timer = setInterval(tick, 1000);
    };

    // Wrong code: the digits go grey, crumble down in flakes, and the boxes shake.
    const crumble = (message) => {
        el.classList.add('is-wrong');
        slots.forEach((slot, i) => {
            const digit = slot.querySelector('.pt-code-digit');
            digit.style.animationDelay = `${i * 55}ms`;
            slot.classList.add('is-crumbling');
        });
        status.textContent = message;
        status.className = 'pt-code-status is-error';
        setTimeout(() => {
            slots.forEach((slot) => {
                slot.classList.remove('is-crumbling', 'is-lit');
                slot.querySelector('.pt-code-digit').style.animationDelay = '';
            });
            el.classList.remove('is-wrong');
            input.value = '';
            busy = false;
            input.disabled = false;
            input.focus();
            paint();
        }, reduced() ? 50 : 900);
    };

    const check = () => {
        if (busy || input.value.length !== 6) return;
        busy = true;
        input.disabled = true;
        status.textContent = 'Checking the code…';
        status.className = 'pt-code-status';
        el.classList.add('is-checking');
        post('check', { email, purpose, code: input.value }).then((data) => {
            el.classList.remove('is-checking');
            el.classList.add('is-right');
            status.textContent = '';
            clearInterval(timer);
            setTimeout(() => onVerified(data.token, el), reduced() ? 0 : 650);
        }).catch((err) => {
            el.classList.remove('is-checking');
            if (err.data && err.data.expired) {
                resend.disabled = false;
                clearInterval(timer);
                resendLabel.textContent = 'Send a new code';
            }
            crumble(err.message);
        });
    };

    input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '').slice(0, 6);
        if (status.classList.contains('is-error')) { status.textContent = ''; status.className = 'pt-code-status'; }
        paint();
        if (input.value.length === 6) check();
    });
    input.addEventListener('focus', paint);
    input.addEventListener('blur', paint);
    input.addEventListener('keyup', paint);
    resend.addEventListener('click', () => {
        resend.disabled = true;
        resendLabel.textContent = 'Sending…';
        post('send', { email, purpose }).then(() => {
            status.textContent = 'A new code is on its way.';
            status.className = 'pt-code-status is-good';
            input.value = '';
            paint();
            input.focus();
            countdown();
        }).catch((err) => {
            status.textContent = err.message;
            status.className = 'pt-code-status is-error';
            resend.disabled = false;
            resendLabel.textContent = 'Resend code';
        });
    });
    el.querySelector('.pt-code-back').addEventListener('click', () => { clearInterval(timer); onBack(); });

    countdown();
    return {
        el,
        start() {
            el.querySelector('h1').focus({ preventScroll: true });
            setTimeout(() => input.focus(), 350);
            paint();
        },
    };
}

// Swaps what's inside the card with a soft cross-fade.
function swap(panel, from, to) {
    from.classList.add('pt-step-out');
    setTimeout(() => {
        from.classList.add('pt-gone');
        from.classList.remove('pt-step-out');
        if (!to.parentNode) panel.appendChild(to);
        to.classList.remove('pt-gone');
        to.classList.add('pt-step-in');
        setTimeout(() => to.classList.remove('pt-step-in'), 600);
    }, reduced() ? 0 : 220);
}

function busyButton(button, label) {
    const before = button.value || button.textContent;
    button.disabled = true;
    if (button.tagName === 'INPUT') button.value = label; else button.textContent = label;
    return () => {
        button.disabled = false;
        if (button.tagName === 'INPUT') button.value = before; else button.textContent = before;
    };
}

function showError(form, message) {
    let box = form.querySelector('.pt-verify-error');
    if (!box) {
        box = document.createElement('p');
        box.className = 'auth-error pt-verify-error';
        box.setAttribute('role', 'alert');
        const heading = form.querySelector('.auth-heading');
        if (heading) heading.insertAdjacentElement('afterend', box); else form.prepend(box);
    }
    box.innerHTML = message;
    box.classList.remove('shake');
    box.getBoundingClientRect();
    box.classList.add('shake');
}

// ---------- Sign up ----------
function initSignup(form) {
    const panel = form.closest('.auth-panel');
    const heading = panel.querySelector(':scope > .auth-heading');
    let confirmed = false;

    // Runs after BigCommerce's own checks (they listen on the form; this listens further up).
    document.addEventListener('submit', (event) => {
        if (event.target !== form || confirmed || event.defaultPrevented) return;
        const emailField = form.querySelector('[data-field-type="EmailAddress"]');
        const email = emailField ? emailField.value.trim().toLowerCase() : '';
        if (!email) return;
        if (verified.get(email)) return; // confirmed a moment ago in this tab
        event.preventDefault();
        const submit = form.querySelector('[type="submit"]');
        const done = busyButton(submit, 'Sending your code…');
        isEnabled().then((on) => {
            if (on === false) { confirmed = true; done(); form.submit(); return; }
            if (on === null) {
                done();
                showError(form, 'We couldn\x27t reach our email service to send your code. Please check your connection and try again.');
                return;
            }
            post('send', { email, purpose: 'signup' }).then(() => {
                done();
                const screen = codeScreen({
                    email,
                    purpose: 'signup',
                    onVerified: (token, codeEl) => {
                        verified.set(email);
                        // "Email confirmed" card; Continue creates the account.
                        const card = successCard({
                            title: 'Email confirmed',
                            text: 'Thank you. Tap continue to finish creating your account.',
                            button: 'Continue',
                            onContinue: (btn) => { btn.textContent = 'Creating your account…'; confirmed = true; form.submit(); },
                        });
                        codeEl.replaceWith(card);
                        playSuccess(card);
                        card.querySelector('.pt-success-title').focus({ preventScroll: true });
                    },
                    onBack: () => {
                        swap(panel, screen.el, form);
                        if (heading) heading.classList.remove('pt-gone');
                        setTimeout(() => { screen.el.remove(); emailField.focus(); }, 300);
                    },
                });
                if (heading) heading.classList.add('pt-gone');
                swap(panel, form, screen.el);
                setTimeout(screen.start, 260);
            }).catch((err) => {
                done();
                const signIn = '<a href="/login.php">Sign in</a> or <a href="/login.php?action=reset_password">reset your password</a>.';
                showError(form, esc(err.message).replace('Sign in instead, or reset your password.', signIn));
            });
        });
    });
}

// ---------- Forgot password ----------
function newPasswordScreen({ email, token }) {
    const el = document.createElement('form');
    el.className = 'auth-form pt-newpass';
    el.noValidate = true;
    el.innerHTML = `
        <div class="auth-heading">
            <span class="auth-step">${icon('lock', 22)}</span>
            <h1 tabindex="-1">Choose a new password</h1>
            <p>For <strong>${esc(email)}</strong>. Use at least 7 characters, with letters and numbers.</p>
        </div>
        <label class="auth-field form-field">
            <span class="form-field-title">New password</span>
            <span class="auth-input-wrap">${icon('lock', 18)}
                <input class="auth-input" type="password" name="pt_new" autocomplete="new-password" required placeholder=" ">
                <button type="button" class="auth-eye" aria-label="Show password">${icon('eye', 16)}</button>
            </span>
        </label>
        <label class="auth-field form-field">
            <span class="form-field-title">Type it again</span>
            <span class="auth-input-wrap">${icon('lock', 18)}
                <input class="auth-input" type="password" name="pt_again" autocomplete="new-password" required placeholder=" ">
            </span>
        </label>
        <ul class="pt-pass-rules" aria-live="polite">
            <li data-rule="len">At least 7 characters</li>
            <li data-rule="mix">Letters and numbers</li>
            <li data-rule="same">Both boxes match</li>
        </ul>
        <button type="submit" class="button button-primary auth-submit">Save and sign in</button>`;

    const fields = el.querySelectorAll('.auth-input');
    const pass = fields[0];
    const again = fields[1];
    const rules = {
        len: () => pass.value.length >= 7,
        mix: () => /[a-z]/i.test(pass.value) && /\d/.test(pass.value),
        same: () => pass.value.length > 0 && pass.value === again.value,
    };
    const update = () => Object.keys(rules).forEach((k) => el.querySelector(`[data-rule="${k}"]`).classList.toggle('is-met', rules[k]()));
    pass.addEventListener('input', update);
    again.addEventListener('input', update);
    el.querySelector('.auth-eye').addEventListener('click', (e) => {
        const show = pass.type === 'password';
        pass.type = show ? 'text' : 'password';
        again.type = pass.type;
        e.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });

    el.addEventListener('submit', (event) => {
        event.preventDefault();
        update();
        if (!Object.keys(rules).every((k) => rules[k]())) {
            showError(el, 'Please check the password rules below.');
            return;
        }
        const done = busyButton(el.querySelector('[type="submit"]'), 'Saving…');
        post('reset', { email, purpose: 'reset', token, password: pass.value }).then(() => {
            const card = successCard({
                title: 'Password saved',
                text: 'You\x27re all set. Tap continue and we\x27ll sign you in.',
                button: 'Continue',
                onContinue: (btn) => { btn.textContent = 'Signing you in…'; login.submit(); },
            });
            // Sign in with the new password through the shop's normal sign-in.
            const login = document.createElement('form');
            login.method = 'post';
            login.action = '/login.php?action=check_login';
            login.hidden = true;
            login.innerHTML = '<input name="login_email"><input name="login_pass" type="password">';
            login.querySelector('[name="login_email"]').value = email;
            login.querySelector('[name="login_pass"]').value = pass.value;
            document.body.appendChild(login);
            el.replaceWith(card);
            playSuccess(card);
            card.querySelector('.pt-success-title').focus({ preventScroll: true });
        }).catch((err) => {
            done();
            showError(el, esc(err.message) + (err.data && err.data.expired ? ' <a href="/login.php?action=reset_password">Start again</a>' : ''));
        });
    });
    return el;
}

function initForgot(form) {
    const panel = form.closest('.auth-panel');
    // With codes on, the wording says "code", and the reCAPTCHA box isn't needed (sending is limited).
    isEnabled().then((on) => {
        if (!on) return;
        const intro = form.querySelector('.auth-heading p');
        if (intro) intro.textContent = "Type the email you shop with. We'll email you a 6-digit code, then you can choose a new password.";
        const submit = form.querySelector('[type="submit"]');
        if (submit) submit.value = 'Send my code';
        const captcha = form.querySelector('.g-recaptcha, [data-sitekey]');
        const wrap = captcha && (captcha.closest('.form-field') || captcha);
        if (wrap) wrap.classList.add('pt-gone');
    });
    form.addEventListener('submit', (event) => {
        const emailField = form.querySelector('[name="email"]');
        const email = emailField.value.trim().toLowerCase();
        if (form.dataset.ptPlain || !email) return;
        event.preventDefault();
        if (!emailField.checkValidity()) { emailField.reportValidity(); return; }
        const submit = form.querySelector('[type="submit"]');
        const done = busyButton(submit, 'Sending your code…');
        isEnabled().then((on) => {
            if (!on) { form.dataset.ptPlain = '1'; done(); form.submit(); return; }
            post('send', { email, purpose: 'reset' }).then(() => {
                done();
                const screen = codeScreen({
                    email,
                    purpose: 'reset',
                    onVerified: (token) => {
                        const next = newPasswordScreen({ email, token });
                        swap(panel, screen.el, next);
                        setTimeout(() => { screen.el.remove(); next.querySelector('h1').focus({ preventScroll: true }); next.querySelector('.auth-input').focus(); }, 300);
                    },
                    onBack: () => {
                        swap(panel, screen.el, form);
                        setTimeout(() => { screen.el.remove(); emailField.focus(); }, 300);
                    },
                });
                swap(panel, form, screen.el);
                setTimeout(screen.start, 260);
            }).catch((err) => {
                done();
                showError(form, esc(err.message));
            });
        });
    });
}

export default function pinkTomatoVerify() {
    const signup = document.querySelector('form[data-create-account-form]');
    if (signup) initSignup(signup);
    const forgot = document.querySelector('form.forgot-password-form');
    if (forgot) initForgot(forgot);
    if (signup || forgot) isEnabled();
}
