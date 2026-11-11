// Header, phone menu, search panel, back-to-top and active links for the Pink Tomato layout.
export default function pinkTomatoLayout() {
    const header = document.querySelector('[data-pt-header]');
    if (!header) return;

    const menu = header.querySelector('[data-pt-menu]');
    const backdrop = header.querySelector('[data-pt-backdrop]');
    const toggle = header.querySelector('[data-pt-menu-toggle]');
    const shop = header.querySelector('[data-pt-shop]');
    const shopButton = shop.querySelector('button');
    const search = header.querySelector('[data-pt-search]');
    const searchInput = search.querySelector('input');
    const searchToggle = header.querySelector('[data-pt-search-toggle]');
    const logo = header.querySelector('[data-pt-nav-logo]');
    const backToTop = document.querySelector('[data-pt-back-to-top]');
    const mobile = window.matchMedia('(max-width: 991px)');

    const setMenu = (open) => {
        menu.classList.toggle('is-open', open);
        backdrop.classList.toggle('is-open', open);
        document.body.classList.toggle('menu-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.querySelector('[data-pt-icon-open]').hidden = open;
        toggle.querySelector('[data-pt-icon-close]').hidden = !open;
    };
    const setShop = (open) => {
        shop.classList.toggle('is-open', open);
        shopButton.setAttribute('aria-expanded', String(open));
    };
    const setSearch = (open) => {
        search.classList.toggle('is-open', open);
        searchToggle.setAttribute('aria-expanded', String(open));
        search.querySelectorAll('input, button').forEach((el) => {
            el.tabIndex = open ? 0 : -1;
        });
        if (open) searchInput.focus();
    };

    toggle.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
    backdrop.addEventListener('click', () => setMenu(false));
    shop.addEventListener('mouseenter', () => setShop(true));
    shop.addEventListener('mouseleave', () => setShop(false));
    shopButton.addEventListener('click', () => setShop(!shop.classList.contains('is-open')));
    searchToggle.addEventListener('click', () => setSearch(!search.classList.contains('is-open')));
    search.querySelector('[data-pt-search-close]').addEventListener('click', () => setSearch(false));
    document.querySelectorAll('[data-pt-open-search]').forEach((el) => {
        el.addEventListener('click', (event) => {
            event.preventDefault();
            window.scrollTo({ top: 0 });
            setSearch(true);
        });
    });
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        setMenu(false);
        setSearch(false);
    });

    const showLogo = (scrolled) => {
        const visible = scrolled || mobile.matches;
        logo.classList.toggle('is-visible', visible);
        logo.setAttribute('aria-hidden', String(!visible));
        logo.tabIndex = visible ? 0 : -1;
    };
    const onScroll = () => {
        const scrolled = window.scrollY > 40;
        header.classList.toggle('is-scrolled', scrolled);
        showLogo(scrolled);
        if (backToTop) {
            const show = window.scrollY > 700;
            backToTop.classList.toggle('is-visible', show);
            backToTop.tabIndex = show ? 0 : -1;
        }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    mobile.addEventListener('change', onScroll);

    if (backToTop) {
        backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    // Shop All sort box reloads the page with BigCommerce's own sort.
    const sortSelect = document.querySelector('[data-pt-sort-select]');
    if (sortSelect) sortSelect.addEventListener('change', () => sortSelect.form.submit());

    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    document.querySelectorAll('[data-pt-nav]').forEach((link) => {
        const target = new URL(link.href).pathname.replace(/\/+$/, '') || '/';
        if (target === path) link.classList.add('active');
    });
}
