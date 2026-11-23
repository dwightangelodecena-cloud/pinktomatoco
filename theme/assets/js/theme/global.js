import 'focus-within-polyfill';

import './global/jquery-migrate';
import './common/select-option-plugin';
import PageManager from './page-manager';
import quickSearch from './global/quick-search';
import currencySelector from './global/currency-selector';
import languageSelector from './global/language-selector';
import mobileMenuToggle from './global/mobile-menu-toggle';
import menu from './global/menu';
import foundation from './global/foundation';
import quickView from './global/quick-view';
import cartPreview from './global/cart-preview';
import carousel from './common/carousel';
import svgInjector from './global/svg-injector';
import pinkTomatoLayout from './global/pinktomato-layout';
import pinkTomatoHome from './global/pinktomato-home';
import pinkTomatoProduct from './global/pinktomato-product';
import pinkTomatoCart from './global/pinktomato-cart';
import pinkTomatoCandle from './global/pinktomato-candle';
import pinkTomatoShowcase from './global/pinktomato-showcase';
import pinkTomatoWishlist from './global/pinktomato-wishlist';
import pinkTomatoAgree from './global/pinktomato-agree';
import pinkTomatoVerify from './global/pinktomato-verify';
import pinkTomatoSuccess from './global/pinktomato-success';
import pinkTomatoPromos from './global/pinktomato-promos';
import pinkTomatoLight from './global/pinktomato-light';

export default class Global extends PageManager {
    onReady() {
        const { cartId, secureBaseUrl } = this.context;
        cartPreview(secureBaseUrl, cartId);
        quickSearch();
        currencySelector(cartId);
        languageSelector();
        foundation($(document));
        quickView(this.context);
        carousel(this.context);
        menu();
        mobileMenuToggle();
        svgInjector();
        pinkTomatoLayout();
        pinkTomatoHome(this.context);
        pinkTomatoProduct(this.context);
        pinkTomatoCart(this.context);
        pinkTomatoCandle();
        pinkTomatoShowcase(this.context);
        pinkTomatoWishlist();
        pinkTomatoAgree();
        pinkTomatoVerify();
        pinkTomatoSuccess();
        pinkTomatoPromos();
        pinkTomatoLight(); // after the scripts that build sections, so they light up too
    }
}
