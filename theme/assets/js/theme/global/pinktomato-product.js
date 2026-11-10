// Product page and Quick View extras: sold-out sizes, price pop, "Added" state, zoom origin, sticky buy bar.

const VARIANTS_QUERY = `query ProductVariants($id: Int!) {
  site { product(entityId: $id) { variants(first: 250) { edges { node {
    isPurchasable
    inventory { isInStock }
    options { edges { node { values { edges { node { entityId } } } } } }
  } } } } }
}`;

// Option value ids that every variant using them can't be bought (switched off or out of stock).
async function soldOutValues(productId, token) {
    const response = await fetch('/graphql', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: VARIANTS_QUERY, variables: { id: Number(productId) } }),
    });
    if (!response.ok) return new Set();
    const { data } = await response.json();
    const buyable = new Map();
    data.site.product.variants.edges.forEach(({ node }) => {
        const ok = node.isPurchasable && (!node.inventory || node.inventory.isInStock);
        node.options.edges.forEach((option) => option.node.values.edges.forEach((value) => {
            const id = value.node.entityId;
            buyable.set(id, (buyable.get(id) || false) || ok);
        }));
    });
    // Array.from, not spread: the theme's loose Babel build breaks spreading a Map.
    return new Set(Array.from(buyable).filter(([, ok]) => !ok).map(([id]) => id));
}

// Greys out sizes that can't be bought, the way the React site did.
async function markSoldOut(form, token) {
    if (!token) return;
    const productId = form.querySelector('[name="product_id"]').value;
    let off;
    try {
        off = await soldOutValues(productId, token);
    } catch (err) {
        return;
    }
    form.querySelectorAll('[data-product-attribute="set-select"] option[data-product-attribute-value]').forEach((option) => {
        if (!off.has(Number(option.value))) return;
        option.disabled = true;
        option.textContent = `${option.textContent.replace(/ \(Sold out\)$/, '')} (Sold out)`;
        if (option.selected) {
            const select = option.parentElement;
            select.selectedIndex = 0;
            $(select).trigger('change');
        }
    });
}

let storefrontToken = '';

function initForm(form) {
    if (form.dataset.ptReady) return;
    form.dataset.ptReady = 'true';
    markSoldOut(form, storefrontToken);

    let pending = false;
    form.addEventListener('submit', () => {
        pending = true;
    });
    $('body').on('cart-quantity-update', () => {
        if (!pending) return;
        pending = false;
        const button = form.querySelector('.add-to-cart');
        if (!button) return;
        button.classList.add('is-added');
        setTimeout(() => button.classList.remove('is-added'), 1600);
    });
}

function initZoom() {
    document.querySelectorAll('[data-pt-zoom]').forEach((link) => {
        link.addEventListener('mousemove', (event) => {
            const box = link.getBoundingClientRect();
            const img = link.querySelector('img');
            img.style.transformOrigin = `${((event.clientX - box.left) / box.width) * 100}% ${((event.clientY - box.top) / box.height) * 100}%`;
        });
    });
}

function priceText(scope) {
    const price = Array.from(scope.querySelectorAll('.product-price')).find((el) => el.style.display !== 'none');
    return price ? price.textContent.trim() : '';
}

// Phone-only bar that appears once the main Add To Cart button scrolls out of view.
function initStickyBar() {
    const bar = document.querySelector('[data-pt-sticky-buy]');
    const form = document.getElementById('product-options-form');
    if (!bar || !form) return;
    const price = bar.querySelector('[data-pt-sticky-price]');
    const add = bar.querySelector('[data-pt-sticky-add]');
    const scope = document.querySelector('.product-details');
    price.textContent = priceText(scope);

    if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => {
            const show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
            bar.classList.toggle('is-visible', show);
            bar.setAttribute('aria-hidden', String(!show));
            add.tabIndex = show ? 0 : -1;
        }).observe(form);
    }

    add.addEventListener('click', () => {
        const select = form.querySelector('select');
        if (select && !select.value) {
            form.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        form.requestSubmit();
    });

    document.addEventListener('onProductOptionsChanged', () => {
        price.textContent = priceText(scope);
    });
}

export default function pinkTomatoProduct(context) {
    storefrontToken = context.storefrontApiToken;
    document.querySelectorAll('form[data-cart-item-add]').forEach(initForm);
    initZoom();
    initStickyBar();

    document.addEventListener('onProductOptionsChanged', (event) => {
        const form = event.target.closest ? event.target.closest('form[data-cart-item-add]') : null;
        const scope = form ? form.closest('.productView') : document;
        scope.querySelectorAll('.product-price').forEach((el) => {
            el.classList.remove('price-pop');
            void el.offsetWidth; // restart the animation
            el.classList.add('price-pop');
        });
    });

    // Quick View content arrives later, so pick up its form when it appears.
    new MutationObserver(() => {
        document.querySelectorAll('#modal form[data-cart-item-add]').forEach(initForm);
    }).observe(document.body, { childList: true, subtree: true });
}
