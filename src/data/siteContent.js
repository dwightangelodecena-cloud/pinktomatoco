// The site's built-in wording and photos. Anything saved in the admin Content tab replaces these.
export const DEFAULT_CONTENT = {
  announcement: {
    items: [
      { text: 'Hand-poured in North Dakota', visible: true },
      { text: 'Clean-burning coconut soy wax', visible: true },
      { text: 'Toxic-free & vegan fragrances', visible: true },
    ],
  },
  home: {
    heroEyebrow: 'Hand-poured in North Dakota',
    heroTitle: 'Candles & wax melts made to linger',
    heroButton: 'Shop All',
    heroImages: ['/images/hero/hero-1.jpg', '/images/hero/hero-2.jpg', '/images/hero/hero-3.jpg', '/images/hero/hero-4.jpg'],
    showValueProps: true,
    valueProps: [
      { title: 'Hand-poured in North Dakota', text: 'Small batches, made by hand in Watford City.' },
      { title: 'Coconut soy wax', text: 'Burns clean with minimal soot and no smoke.' },
      { title: 'Toxic-free fragrance', text: 'Paraben free, phthalate free, cruelty free & vegan.' },
      { title: 'Crackling wooden wicks', text: 'A soft fireside crackle in a reusable glass vessel.' },
    ],
    productsEyebrow: 'Just poured',
    productsTitle: 'New Products',
    showMood: true,
    moodEyebrow: 'Find your mood',
    moodTitle: 'How do you want to feel tonight?',
    showProcess: true,
    processEyebrow: 'From pour to glow',
    processTitle: 'What goes into every candle',
    processSteps: [
      { title: 'Coconut soy wax', text: 'A clean-burning blend with minimal soot, no smoke and an easy-to-trim wick.' },
      { title: 'Toxic-free fragrance', text: 'Paraben free, phthalate free, cruelty free and vegan scent oils.' },
      { title: 'Wooden wick', text: 'A soft crackle like a fireplace, set in a glass vessel you can reuse.' },
      { title: 'Hand-poured', text: 'Every candle is poured by hand in small batches in North Dakota.' },
    ],
    showJournal: true,
    journalEyebrow: 'Journal',
    journalTitle: 'Blog',
    journalText: 'Scent notes, candle care tips and stories from our studio are coming soon.',
    journalButton: 'Shop the collection',
  },
  shipping: {
    title: 'Shipping & Returns',
    sections: [
      {
        heading: 'Returns Policy',
        body: `You may return most new, unopened items within 30 days of delivery for a full refund. We'll also pay the return shipping costs if the return is a result of our error (you received an incorrect or defective item, etc.).

You should expect to receive your refund within four weeks of giving your package to the return shipper, however, in many cases you will receive a refund more quickly. This time period includes the transit time for us to receive your return from the shipper (5 to 10 business days), the time it takes us to process your return once we receive it (3 to 5 business days), and the time it takes your bank to process our refund request (5 to 10 business days).

If you need to return an item, please Contact Us with your order number and details about the product you would like to return. We will respond quickly with instructions for how to return items from your order.`,
      },
      {
        heading: 'Shipping',
        body: `We can ship to virtually any address in the world. Note that there are restrictions on some products, and some products cannot be shipped to international destinations.

When you place an order, we will estimate shipping and delivery dates for you based on the availability of your items and the shipping options you choose. Depending on the shipping provider you choose, shipping date estimates may appear on the shipping quotes page.

Please also note that the shipping rates for many items we sell are weight-based. The weight of any such item can be found on its detail page. To reflect the policies of the shipping companies we use, all weights will be rounded up to the next full pound.`,
      },
    ],
  },
  contact: {
    title: 'Contact Us',
    intro: "We're happy to answer questions or help you with returns.",
  },
  blog: {
    title: 'Blog',
    intro: '',
  },
  footer: {
    heading: 'Join our candle club',
    text: 'New scents and restocks, straight to your inbox.',
    address: 'Watford City, ND, United States, 5884',
    copyright: 'Pink Tomato Enterprises',
  },
};
