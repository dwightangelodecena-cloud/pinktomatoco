// The Content tab (CMS). Each homepage and footer section is a BigCommerce widget placed in a content
// slot that only the Pink Tomato theme has, so the live Capacity theme is never affected. A widget
// uses the React site's markup, so a saved section looks exactly like the theme's built-in one.
// Shipping & Returns and Contact Us are BigCommerce pages, saved through the Pages API.
// The editor's own copy of each section is kept in KV so the Content tab can reload it.
import { AdminError } from './bigcommerce.js';

const svg = (name, size) => `<svg class="pt-i" width="${size}" height="${size}" aria-hidden="true"><use href="#pt-${name}"></use></svg>`;
// Widgets that save "hidden" still render this, so the slot knows to hide its built-in version.
const HIDDEN = '<span class="pt-widget-hidden" hidden></span>';

// Each slot: its region in the theme and the Handlebars template BigCommerce renders.
const SLOTS = {
  announcement: {
    region: 'pt_announcement--global',
    template: `{{#if show}}<div class="announcement-bar"><p class="sr-only">{{summary}}</p><div class="marquee-viewport" aria-hidden="true"><div class="marquee">{{#each tracks}}<div class="marquee-track">{{#each items}}<span class="marquee-item"><span class="marquee-chip"><svg class="pt-i" width="14" height="14" aria-hidden="true"><use href="#pt-{{icon}}"></use></svg></span>{{text}}<span class="marquee-sep">${svg('flame', 12)}</span></span>{{/each}}</div>{{/each}}</div></div></div>{{else}}${HIDDEN}{{/if}}`,
  },
  hero: {
    region: 'pt_home_hero',
    template: `<section class="mosaic container"><div class="mosaic-item mosaic-item-0" style="--i: 0"><div class="mosaic-item-bg" style="background-image: url('{{image0}}')"></div><div class="mosaic-overlay"><p class="hero-eyebrow">{{eyebrow}}</p><h1 class="hero-title">{{title}}</h1><a href="/shop-all/" class="button button-light">{{button}} ${svg('arrow-right', 16)}</a></div></div><div class="mosaic-item mosaic-item-1" style="--i: 1"><div class="mosaic-item-bg" style="background-image: url('{{image1}}')"></div></div><div class="mosaic-item mosaic-item-2" style="--i: 2"><div class="mosaic-item-bg" style="background-image: url('{{image2}}')"></div></div><div class="mosaic-item mosaic-item-3" style="--i: 3"><div class="mosaic-item-bg" style="background-image: url('{{image3}}')"></div></div></section>`,
  },
  values: {
    region: 'pt_home_values',
    template: `{{#if show}}<section class="value-props container" aria-label="Why Pink Tomato"><ul class="value-props-list">{{#each items}}<li class="reveal value-prop" data-pt-reveal="{{delay}}"><span class="value-prop-icon"><svg class="pt-i" width="24" height="24" aria-hidden="true"><use href="#pt-{{icon}}"></use></svg></span><div><h3>{{title}}</h3><p>{{text}}</p></div></li>{{/each}}</ul></section>{{else}}${HIDDEN}{{/if}}`,
  },
  products: {
    region: 'pt_home_products',
    template: `<div class="reveal section-head" data-pt-reveal="0"><div><p class="eyebrow">{{eyebrow}}</p><h2 class="section-title">{{title}}</h2></div><a href="/shop-all/" class="text-link">View all products ${svg('arrow-right', 16)}</a></div><span data-pt-featured="{{ids}}" hidden></span>`,
  },
  mood: {
    region: 'pt_home_mood',
    template: `{{#if show}}<p class="eyebrow">{{eyebrow}}</p><h2 class="section-title">{{title}}</h2>{{else}}<span data-pt-hide-mood hidden></span>{{/if}}`,
  },
  process: {
    region: 'pt_home_process',
    template: `{{#if show}}<section class="process container"><div class="reveal process-head" data-pt-reveal="0"><p class="eyebrow">{{eyebrow}}</p><h2 class="section-title">{{title}}</h2></div><ol class="process-steps" data-pt-process><span class="process-line" aria-hidden="true"></span>{{#each steps}}<li class="process-step" style="--d: {{delay}}ms"><span class="process-icon"><svg class="pt-i" width="24" height="24" aria-hidden="true"><use href="#pt-{{icon}}"></use></svg><span class="process-num">{{num}}</span></span><h3>{{title}}</h3><p>{{text}}</p></li>{{/each}}</ol></section>{{else}}${HIDDEN}{{/if}}`,
  },
  journal: {
    region: 'pt_home_journal',
    template: `{{#if show}}<section class="latest-blog-posts container"><div class="reveal blog-card" data-pt-reveal="0"><p class="eyebrow">{{eyebrow}}</p><h2 class="section-title">{{title}}</h2><p class="blog-empty">{{text}}</p><a href="/shop-all/" class="button button-primary">{{button}} ${svg('arrow-right', 16)}</a></div></section>{{else}}${HIDDEN}{{/if}}`,
  },
  newsletter: {
    region: 'pt_footer_newsletter--global',
    template: '<h2 class="footer-heading">{{heading}}</h2><p class="footer-sub">{{text}}</p>',
  },
  address: {
    region: 'pt_footer_address--global',
    template: '<address>{{address}}</address>',
  },
  copyright: {
    region: 'pt_footer_copyright--global',
    template: '<span>&copy; <span data-pt-year></span> {{name}}</span>',
  },
};

const ANNOUNCEMENT_ICONS = ['map-pin', 'leaf', 'shield'];
const VALUE_ICONS = ['map-pin', 'leaf', 'shield', 'flame'];
const PROCESS_ICONS = ['leaf', 'shield', 'flame', 'map-pin'];

// Photos left at the React site's built-in paths are served by this Worker from its own files.
const imageUrl = (src, origin) => {
  const value = String(src || '').trim();
  if (value.startsWith('/images/')) return origin + value;
  if (/^https:\/\/[^\s"'()<>]+$/.test(value) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/[^\s"'()<>]*$/.test(value)) return value;
  throw new AdminError('One of the photos has an address that can\'t be used. Please upload it again.');
};

const text = (value, max = 400) => String(value ?? '').trim().slice(0, max);

// The editor's sections, turned into each widget's settings.
function widgetSettings(key, value, origin, featuredIds) {
  if (key === 'announcement') {
    const items = (value.items || []).filter((m) => m.visible !== false && text(m.text)).slice(0, 6)
      .map((m, i) => ({ text: text(m.text, 120), icon: ANNOUNCEMENT_ICONS[i % ANNOUNCEMENT_ICONS.length] }));
    const row = [...items, ...items];
    return { announcement: { show: items.length > 0, summary: items.map((m) => m.text).join('. '), tracks: [{ items: [...row, ...row] }, { items: [...row, ...row] }] } };
  }
  if (key === 'home') {
    const v = value;
    const images = (v.heroImages || []).slice(0, 4).map((src) => imageUrl(src, origin));
    return {
      hero: { eyebrow: text(v.heroEyebrow, 80), title: text(v.heroTitle, 120), button: text(v.heroButton, 40), image0: images[0], image1: images[1], image2: images[2], image3: images[3] },
      values: { show: v.showValueProps !== false, items: (v.valueProps || []).slice(0, 4).map((c, i) => ({ title: text(c.title, 80), text: text(c.text, 200), icon: VALUE_ICONS[i % 4], delay: i * 90 })) },
      products: { eyebrow: text(v.productsEyebrow, 80), title: text(v.productsTitle, 120), ids: featuredIds },
      mood: { show: v.showMood !== false, eyebrow: text(v.moodEyebrow, 80), title: text(v.moodTitle, 120) },
      process: { show: v.showProcess !== false, eyebrow: text(v.processEyebrow, 80), title: text(v.processTitle, 120), steps: (v.processSteps || []).slice(0, 4).map((s, i) => ({ title: text(s.title, 80), text: text(s.text, 240), icon: PROCESS_ICONS[i % 4], num: i + 1, delay: 200 + i * 220 })) },
      journal: { show: v.showJournal !== false, eyebrow: text(v.journalEyebrow, 80), title: text(v.journalTitle, 120), text: text(v.journalText, 400), button: text(v.journalButton, 40) },
    };
  }
  if (key === 'footer') {
    return {
      newsletter: { heading: text(value.heading, 80), text: text(value.text, 200) },
      address: { address: text(value.address, 200) },
      copyright: { name: text(value.copyright, 80) },
    };
  }
  return {};
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Shipping & Returns: the words "Contact Us" link to the contact page, as on the React site.
function shippingHtml(sections) {
  return (sections || []).map((s) => {
    const paragraphs = String(s.body || '').split(/\n\s*\n/).filter((p) => p.trim())
      .map((p) => `<p>${escapeHtml(p.trim()).split('Contact Us').join('<a href="/contact-us/">Contact Us</a>')}</p>`).join('\n');
    return `<p><strong>${escapeHtml(text(s.heading, 120))}</strong></p>\n${paragraphs}`;
  }).join('\n');
}

const NAME = (slot) => `Pink Tomato · ${slot}`;
const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return String(h); };

// Finds or creates the template, widget and placement for one slot, and saves its settings.
async function saveSlot(bc, env, slot, settings) {
  const { template, region } = SLOTS[slot];
  const ref = JSON.parse((await env.STORE.get(`cms:${slot}`)) || '{}');

  if (!ref.template) {
    const existing = (await bc.get('/v3/content/widget-templates?limit=250')).data.find((t) => t.name === NAME(slot));
    ref.template = existing?.uuid || (await bc.post('/v3/content/widget-templates', { name: NAME(slot), template })).data.uuid;
    ref.templateHash = existing ? '' : hash(template);
  }
  if (ref.templateHash !== hash(template)) {
    await bc.put(`/v3/content/widget-templates/${ref.template}`, { name: NAME(slot), template, create_new_version: false });
    ref.templateHash = hash(template);
  }

  if (!ref.widget) {
    const existing = (await bc.get('/v3/content/widgets?limit=250')).data.find((w) => w.name === NAME(slot));
    ref.widget = existing?.uuid;
  }
  if (ref.widget) {
    await bc.put(`/v3/content/widgets/${ref.widget}`, { widget_configuration: settings });
  } else {
    ref.widget = (await bc.post('/v3/content/widgets', { name: NAME(slot), widget_template_uuid: ref.template, widget_configuration: settings, channel_id: Number(env.CHANNEL_ID) })).data.uuid;
  }

  if (!ref.placement) {
    const placed = (await bc.get(`/v3/content/placements?widget_uuid=${ref.widget}&limit=50`)).data;
    ref.placement = placed[0]?.uuid || (await bc.post('/v3/content/placements', {
      widget_uuid: ref.widget, template_file: 'pages/home', region, status: 'active', sort_order: 1, channel_id: Number(env.CHANNEL_ID),
    })).data.uuid;
  }
  await env.STORE.put(`cms:${slot}`, JSON.stringify(ref));
}

async function savePage(bc, type, change) {
  const page = (await bc.get('/v3/content/pages?limit=250')).data.find((p) => p.type === type && (type !== 'page' || p.url === '/shipping-returns/'));
  if (!page) throw new AdminError('That page could not be found in BigCommerce.');
  await bc.put(`/v3/content/pages/${page.id}`, change);
}

// Saved editor copies, keyed like the React site's site_content rows.
export async function getContent(env) {
  const keys = ['announcement', 'home', 'shipping', 'contact', 'blog', 'footer', 'featured'];
  const values = await Promise.all(keys.map((k) => env.STORE.get(`content:${k}`, 'json')));
  return Object.fromEntries(keys.map((k, i) => [k, values[i]]).filter(([, v]) => v));
}

export async function saveContent(bc, env, origin, pages) {
  const saved = await getContent(env);
  const next = { ...saved };
  for (const { key, value } of pages) next[key] = value;
  const featuredIds = (next.featured?.ids || []).filter((n) => Number.isInteger(n) && n > 0).slice(0, 8).join(',');

  for (const { key, value } of pages) {
    if (key === 'shipping') {
      await savePage(bc, 'page', { name: text(value.title, 100) || 'Shipping & Returns', body: shippingHtml(value.sections) });
    } else if (key === 'contact') {
      await savePage(bc, 'contact_form', { name: text(value.title, 100) || 'Contact Us', body: `<p>${escapeHtml(text(value.intro, 1000))}</p>` });
    } else if (key === 'blog') {
      await savePage(bc, 'blog', { name: text(value.title, 100) || 'Blog' });
    } else if (key === 'featured') {
      // The featured list lives in the homepage's products slot, so that slot is saved again.
      const home = next.home || { productsEyebrow: 'Just poured', productsTitle: 'New Products' };
      await saveSlot(bc, env, 'products', widgetSettings('home', home, origin, featuredIds).products);
    } else if (['announcement', 'home', 'footer'].includes(key)) {
      const settings = widgetSettings(key, value, origin, featuredIds);
      for (const [slot, s] of Object.entries(settings)) await saveSlot(bc, env, slot, s);
    } else {
      throw new AdminError('Unknown content section.');
    }
    await env.STORE.put(`content:${key}`, JSON.stringify(value));
  }
  return { ok: true };
}
