// Slide-out cart drawer, filled by BigCommerce's own cart.
import utils from '@bigcommerce/stencil-utils';

export default function pinkTomatoCart(context) {
    const drawer = document.querySelector('[data-pt-cart]');
    if (!drawer) return;
    const overlay = document.querySelector('[data-pt-cart-overlay]');
    const body = drawer.querySelector('[data-pt-cart-body]');
    const $body = $('body');

    const setOpen = (open) => {
        drawer.classList.toggle('is-open', open);
        overlay.classList.toggle('is-open', open);
        drawer.setAttribute('aria-hidden', String(!open));
        if (open) drawer.querySelector('[data-pt-cart-close]').focus();
    };

    const load = () => {
        body.classList.add('is-loading');
        utils.api.cart.getContent({ template: 'pinktomato/cart-drawer-content', baseUrl: context.secureBaseUrl }, (err, response) => {
            body.classList.remove('is-loading');
            if (err) {
                body.innerHTML = '<p class="cart-preview-empty">Sorry, the cart could not load. Please try again.</p>';
                return;
            }
            body.innerHTML = response;
            const content = body.querySelector('[data-cart-quantity]');
            if (content) $body.trigger('cart-quantity-update', Number(content.dataset.cartQuantity) || 0);
        });
    };

    const open = () => {
        // Adding from Quick View: close it first, as the React site did.
        const quickViewClose = document.querySelector('#modal.open .modal-close');
        if (quickViewClose) quickViewClose.click();
        setOpen(true);
        load();
    };
    window.ptOpenCart = open;

    document.querySelectorAll('[data-pt-cart-open]').forEach((trigger) => {
        trigger.addEventListener('click', (event) => {
            event.preventDefault();
            open();
        });
    });
    drawer.querySelector('[data-pt-cart-close]').addEventListener('click', () => setOpen(false));
    overlay.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && drawer.classList.contains('is-open')) setOpen(false);
    });

    body.addEventListener('click', (event) => {
        const remove = event.target.closest('[data-pt-remove]');
        if (!remove) return;
        remove.disabled = true;
        utils.api.cart.itemRemove(remove.dataset.ptRemove, (err, response) => {
            if (err || (response && response.data && response.data.status !== 'succeed')) {
                remove.disabled = false;
                return;
            }
            load();
        });
    });

    // Bump the header count when it changes, as the React site did.
    let last = null;
    $body.on('cart-quantity-update', (event, quantity) => {
        if (last !== null && quantity !== last) {
            document.querySelectorAll('.cart-quantity').forEach((badge) => {
                badge.classList.remove('bump');
                void badge.offsetWidth; // restart the animation
                badge.classList.add('bump');
            });
        }
        last = quantity;
    });
}
