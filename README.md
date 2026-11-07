# Pink Tomato Candle & Bath Co.

Storefront for [pinktomatoco.com](https://pinktomatoco.com), rebuilt from the original BigCommerce store.

- **Frontend:** React 18 + Vite + React Router
- **Database / auth:** Supabase (Postgres, Row Level Security, email/password auth)

## Pages

| Route | Page |
| --- | --- |
| `/` | Home: 4-image mosaic, New Products, Blog |
| `/shop-all` | All products, sort, 12 per page |
| `/:slug` | Product page: size, quantity, add to cart, share, wishlist, reviews, similar items |
| `/cart`, `/checkout` | Cart and checkout (orders saved to Supabase) |
| `/shipping-returns`, `/contact-us`, `/blog`, `/sitemap` | Content pages |
| `/login`, `/wishlist`, `/search?q=` | Account, wishlist, search |
| `/admin` | Store admin: overview, orders, products, reviews, messages, subscribers |

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

Tables: `products`, `product_variants`, `reviews` (need `approved = true` to show), `newsletter_subscribers`, `contact_messages`, `orders`, `order_items`.
Orders are created through the `create_order` function, which recalculates prices in the database so prices can't be changed from the browser.

## Not done yet

- **Online payment.** Checkout records the order with status `pending`. It doesn't charge a card yet. Stripe or PayPal can be added later.
- **Shipping rates and tax** are not calculated.
- **Product images** are served from `public/images`. They could also be moved to Supabase Storage.

## Deploy

`npm run build` outputs to `dist/`. `vercel.json` (Vercel) and `public/_redirects` (Netlify) send all routes to `index.html`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the host's environment variables.
