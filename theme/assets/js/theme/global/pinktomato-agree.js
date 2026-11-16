// Sign up only goes ahead once the Terms of Use and Privacy Policy box is ticked.
// Runs first (capture), before BigCommerce's own checks, and shows a friendly message under the box
// instead of the browser's own "tick this box" bubble.
function initAgree(form) {
    const box = form.querySelector('[data-pt-agree] input');
    const error = form.querySelector('[data-pt-agree-error]');
    if (!box) return;
    box.addEventListener('change', () => { if (box.checked && error) error.hidden = true; });
    const remind = () => {
        if (error) {
            error.hidden = false;
            error.classList.remove('shake');
            error.getBoundingClientRect();
            error.classList.add('shake');
        }
        box.closest('[data-pt-agree]').scrollIntoView({ behavior: 'smooth', block: 'center' });
        box.focus({ preventScroll: true });
    };
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
