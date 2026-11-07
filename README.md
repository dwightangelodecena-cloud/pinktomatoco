# Pink Tomato Candle & Bath Co.

Storefront for [pinktomatoco.com](https://pinktomatoco.com), rebuilt from the original BigCommerce store.

- **Frontend:** React 18 + Vite + React Router
- **Store:** BigCommerce runs products, stock, cart, checkout, payment and orders. The keys stay server-side in the Vercel functions in `api/`, and the admin's calls are checked against Supabase's admin list.
- **Accounts:** customers sign in with BigCommerce through `api/customer.js`, using an encrypted cookie. The admin signs in with Supabase through the same form.
- **Database:** Supabase (page content, homepage picks, reviews, messages, subscribers)

## Pages

| Route | Page |
| --- | --- |
| `/` | Home: 4-image mosaic, New Products, Blog |
| `/shop-all` | All products, sort, 12 per page |
| `/:slug` | Product page: size, quantity, add to cart, share, wishlist, reviews, similar items |
| `/cart`, `/checkout` | Cart and checkout (orders saved to Supabase) |
| `/shipping-returns`, `/contact-us`, `/blog`, `/sitemap` | Content pages |
| `/login`, `/wishlist`, `/search?q=` | Account, wishlist, search |
| `/admin` | Store admin dashboard: orders, customers, sales, content editor with live preview, reviews, messages, subscribers, account |

## Local setup

```bash
npm install --include=dev
cp .env.example .env      # add your Supabase URL and anon key
npm run dev
```

Without a `.env` the site still runs and shows the products from `src/data/products.json`. The newsletter, contact form, reviews, login and checkout need Supabase.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run `supabase/migrations/0001_init.sql`, `0002_drop_bulk_pricing.sql`, then `supabase/seed.sql`.
3. Copy **Project Settings → API → Project URL / anon key** into `.env`.
4. Create the admin account on the site, then run `supabase/migrations/0003_admin.sql`. It makes that account an admin and adds the admin permissions.
5. Run `supabase/migrations/0005_cms.sql` to turn on the content editor, photo uploads and full product editing.

Tables: `products`, `product_variants`, `reviews` (need `approved = true` to show), `newsletter_subscribers`, `contact_messages`, `orders`, `order_items`.
Checkout creates a BigCommerce cart in `api/checkout.js`, which works out the prices, then sends the shopper to BigCommerce's checkout.

## Not done yet

- **Original product images** are served from `public/images`. Photos uploaded in the admin go to Supabase Storage.

## Deploy

`npm run build` outputs to `dist/`. `vercel.json` (Vercel) and `public/_redirects` (Netlify) send all routes to `index.html`. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and the `BIGCOMMERCE_*` keys from `.env.example` in Vercel. The `BIGCOMMERCE_*` keys are private and must never start with `VITE_`.
