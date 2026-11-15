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
        if (wishBody && !wishBody.hidden) showTab('cart');
        load();
    };
    window.ptOpenCart = open;

    // Wishlist tab: the shopper's saved candles, read from their account's wishlist pages.
    const wishBody = drawer.querySelector('[data-pt-wishlist-body]');
    const tabs = Array.from(drawer.querySelectorAll('[data-pt-drawer-tab]'));
    const esc = (t) => String(t || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    const parse = (html) => new DOMParser().parseFromString(html, 'text/html');
    const loadWishlist = async () => {
        if (drawer.dataset.signedIn !== '1') {
            wishBody.innerHTML = `<div class="wish-empty"><p><strong>Save candles you love</strong>Log in to see your wishlist here.</p><a class="button button-primary" href="${esc(drawer.dataset.loginUrl)}?from=index.php">Log in</a></div>`;
            return;
        }
        wishBody.classList.add('is-loading');
        try {
            const list = parse(await (await fetch(drawer.dataset.wishlistUrl, { credentials: 'same-origin' })).text());
            const links = Array.from(list.querySelectorAll('.wishlist-card-main')).map((a) => a.getAttribute('href'));
            const items = [];
            for (const href of links.slice(0, 3)) {
                const page = parse(await (await fetch(href, { credentials: 'same-origin' })).text());
                page.querySelectorAll('.wishlist-grid-item').forEach((it) => {
                    const a = it.querySelector('.product-item-title a');
                    if (!a) return;
                    items.push({ name: a.textContent.trim(), url: a.getAttribute('href'), img: (it.querySelector('.product-item-image img') || {}).src || '', price: (it.querySelector('.product-item-price') || {}).textContent || '' });
                });
            }
            wishBody.innerHTML = items.length
                ? `<ul class="wish-list">${items.map((i) => `<li><a href="${esc(i.url)}"><img src="${esc(i.img)}" alt=""><span><strong>${esc(i.name)}</strong><small>${esc(i.price.trim())}</small></span></a><a class="button button-primary button-small" href="${esc(i.url)}">View</a></li>`).join('')}</ul><a class="cart-preview-link" href="${esc(drawer.dataset.wishlistUrl)}">Manage my wishlists</a>`
                : `<div class="wish-empty"><p><strong>Your wishlist is empty</strong>Tap the heart on any candle to save it here.</p><a class="button button-primary" href="/shop-all/">Browse candles</a></div>`;
        } catch (e) {
            wishBody.innerHTML = `<div class="wish-empty"><p>Your wishlist could not load.</p><a class="button button-primary" href="${esc(drawer.dataset.wishlistUrl)}">Open my wishlist</a></div>`;
        }
        wishBody.classList.remove('is-loading');
    };
    const showTab = (name) => {
        tabs.forEach((t) => { const on = t.dataset.ptDrawerTab === name; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', String(on)); });
        body.hidden = name !== 'cart';
        wishBody.hidden = name !== 'wishlist';
        if (name === 'wishlist') loadWishlist();
    };
    tabs.forEach((t) => t.addEventListener('click', () => showTab(t.dataset.ptDrawerTab)));
    window.ptOpenWishlist = () => { setOpen(true); showTab('wishlist'); };

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
