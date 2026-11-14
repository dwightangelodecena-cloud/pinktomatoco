// Products, options (Vessel, Size, Wick...), variants, stock, photos and categories.
// A product's options make a grid: every combination of option values is one variant with its own
// price, SKU, stock and photo. A product without options is sold as a single item.
import { AdminError } from './bigcommerce.js';

const SHOP_ALL_CATEGORY = 23;
const FIELDS = 'id,name,sku,description,custom_url,is_visible,is_featured,availability,inventory_tracking,inventory_level,weight,price,categories';
// The free Cloudflare plan allows 50 calls to BigCommerce per save, so the grid is capped.
const MAX_VARIANTS = 40;

const keyOf = (values) => Object.keys(values).sort().map((k) => `${k}=${values[k]}`).join('|');

function toAdminProduct(p) {
  const images = [...p.images].sort((a, b) => Number(b.is_thumbnail) - Number(a.is_thumbnail) || a.sort_order - b.sort_order);
  const options = [...(p.options || [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((o) => ({ id: o.id, name: o.display_name, values: [...o.option_values].sort((a, b) => a.sort_order - b.sort_order).map((v) => v.label) }));
  const stockOf = (v) => (p.inventory_tracking === 'variant' ? v.inventory_level : p.inventory_tracking === 'product' ? p.inventory_level : null);
  const variants = p.variants.map((v, sort) => {
    const stock = stockOf(v);
    return {
      id: v.id,
      values: Object.fromEntries(v.option_values.map((o) => [o.option_display_name, o.label])),
      label: v.option_values.map((o) => o.label).join(' / '),
      price: v.calculated_price,
      // No price of its own: it borrows the product's base price.
      inherited: v.price === null,
      sku: v.sku,
      sort,
      stock,
      image_url: v.image_url || '',
      purchasing_disabled: v.purchasing_disabled,
      available: !v.purchasing_disabled && (stock === null || stock > 0),
    };
  });
  return {
    id: p.id,
    slug: p.custom_url.url.replace(/^\/|\/$/g, ''),
    name: p.name,
    sku: p.sku,
    description_html: p.description,
    images: images.map((i) => i.url_zoom),
    is_visible: p.is_visible,
    is_featured: p.is_featured,
    weight: p.weight,
    categories: p.categories || [],
    inventory_tracking: p.inventory_tracking,
    inventory_level: p.inventory_level,
    options,
    variants,
    // Older screens (homepage picks, preview, price ranges) read this name.
    product_variants: variants,
  };
}

export async function listAdminProducts(bc) {
  const products = [];
  for (let page = 1, pages = 1; page <= pages; page++) {
    const { data, meta } = await bc.get(`/v3/catalog/products?limit=250&page=${page}&include=variants,images,options&include_fields=${FIELDS}`);
    products.push(...data);
    pages = meta.pagination.total_pages;
  }
  return products.map(toAdminProduct).sort((a, b) => b.id - a.id);
}

const getProduct = (bc, id) => bc.get(`/v3/catalog/products/${id}?include=variants,images,options&include_fields=${FIELDS}`).then((r) => r.data);

// BigCommerce needs a SKU on every variant. When the SKU box is left empty, make a unique one
// from the product and option names, e.g. "LAVENDER-CANDLE-TIN-8OZ-K3F9".
function skuFor(variant, productName) {
  if (variant.sku?.trim()) return variant.sku.trim();
  const part = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  const tail = Math.random().toString(36).slice(2, 6).toUpperCase();
  const values = Object.values(variant.values || {}).map((v) => part(v).slice(0, 10));
  return [part(productName).slice(0, 24), ...values, tail].filter(Boolean).join('-');
}

function clean(input) {
  const options = (input.options || [])
    .map((o) => ({ name: String(o.name || '').trim(), values: [...new Set((o.values || []).map((v) => String(v).trim()).filter(Boolean))] }))
    .filter((o) => o.name || o.values.length);
  return { ...input, options, variants: input.variants || [], trackStock: input.trackStock !== false };
}

function validate(input) {
  if (!input?.name?.trim()) throw new AdminError('Give the product a name.');
  if (!(Number(input.weight) > 0)) throw new AdminError('Enter a weight above 0, so shipping can be worked out.');
  const names = input.options.map((o) => o.name.toLowerCase());
  for (const o of input.options) {
    if (!o.name) throw new AdminError('Every option needs a name, like Vessel or Size.');
    if (o.values.length === 0) throw new AdminError(`Add at least one choice to ${o.name}.`);
  }
  if (new Set(names).size !== names.length) throw new AdminError('Two options have the same name.');
  if (input.variants.length === 0) throw new AdminError('Add at least one price.');
  if (input.variants.length > MAX_VARIANTS) throw new AdminError(`That makes ${input.variants.length} combinations. Please keep it to ${MAX_VARIANTS} or fewer, or split it into two products.`);
  for (const v of input.variants) {
    if (v.price === '' || v.price === null || !(Number(v.price) >= 0)) throw new AdminError('Every combination needs a price.');
    if (v.stock != null && v.stock !== '' && !(Number.isInteger(Number(v.stock)) && Number(v.stock) >= 0)) throw new AdminError('Stock must be a whole number.');
    for (const o of input.options) {
      if (!o.values.includes(v.values?.[o.name])) throw new AdminError('The price list is out of date. Reload the product and try again.');
    }
  }
}

const categoriesOf = (input) => [...new Set([SHOP_ALL_CATEGORY, ...(input.categories || []).map(Number).filter(Boolean)])];

export async function createProduct(bc, env, raw) {
  const input = clean(raw);
  validate(input);
  const hasOptions = input.options.length > 0;
  const first = input.variants[0];
  const created = await bc.post('/v3/catalog/products', {
    name: input.name.trim(),
    type: 'physical',
    weight: Number(input.weight),
    price: Number(first.price),
    description: input.description_html,
    is_visible: Boolean(input.is_visible),
    categories: categoriesOf(input),
    images: input.images.map((image_url, i) => ({ image_url, is_thumbnail: i === 0 })),
    ...(hasOptions
      ? {
          inventory_tracking: input.trackStock ? 'variant' : 'none',
          variants: input.variants.map((v) => ({
            sku: skuFor(v, input.name),
            price: Number(v.price),
            ...(input.trackStock ? { inventory_level: Number(v.stock) || 0 } : {}),
            purchasing_disabled: Boolean(v.purchasing_disabled),
            ...(v.image_url ? { image_url: v.image_url } : {}),
            option_values: input.options.map((o) => ({ option_display_name: o.name, label: v.values[o.name] })),
          })),
        }
      : { inventory_tracking: input.trackStock ? 'product' : 'none', ...(input.trackStock ? { inventory_level: Number(first.stock) || 0 } : {}), sku: skuFor({ sku: input.sku || first.sku }, input.name) }),
  });
  const { id } = created.data;
  // Inline variants make plain options; put each option's choices in the order they were typed.
  if (hasOptions) await sortOptionValues(bc, id, input.options);
  await bc.put('/v3/catalog/products/channel-assignments', [{ product_id: id, channel_id: Number(env.CHANNEL_ID) }]);
  return toAdminProduct(await getProduct(bc, id));
}

async function sortOptionValues(bc, productId, wanted) {
  const { data: options } = await bc.get(`/v3/catalog/products/${productId}/options`);
  for (const [sort, w] of wanted.entries()) {
    const o = options.find((x) => x.display_name === w.name);
    if (!o) continue;
    await bc.put(`/v3/catalog/products/${productId}/options/${o.id}`, {
      sort_order: sort,
      option_values: o.option_values.map((v) => ({ id: v.id, label: v.label, sort_order: Math.max(0, w.values.indexOf(v.label)) })),
    });
  }
}

// Brings the product's options and variants in line with the editor's grid.
async function saveVariants(bc, current, input) {
  const pid = current.id;
  const sameOptionNames = keyOf(Object.fromEntries(current.options.map((o) => [o.display_name, 1]))) === keyOf(Object.fromEntries(input.options.map((o) => [o.name, 1])));
  let options = current.options;
  let variants = current.variants.filter((v) => v.option_values.length > 0);

  if (!sameOptionNames) {
    // An option was added, removed or renamed: rebuild the options. Prices, SKUs and stock come from the grid.
    for (const o of current.options) await bc.delete(`/v3/catalog/products/${pid}/options/${o.id}`);
    options = [];
    variants = [];
    for (const [sort, o] of input.options.entries()) {
      const made = await bc.post(`/v3/catalog/products/${pid}/options`, {
        display_name: o.name,
        type: 'dropdown',
        sort_order: sort,
        option_values: o.values.map((label, i) => ({ label, sort_order: i })),
      });
      options.push(made.data);
    }
    // Every option taken away: the product is now sold as one item (price and stock saved on the product).
    if (input.options.length === 0) return;
  } else {
    // Same options: add new choices, keep their order, and drop the ones taken away.
    for (const o of input.options) {
      const opt = options.find((x) => x.display_name === o.name);
      const missing = o.values.filter((label) => !opt.option_values.some((v) => v.label === label));
      const removed = opt.option_values.filter((v) => !o.values.includes(v.label));
      // Variants that use a removed choice go first, then the choice itself.
      for (const v of variants.filter((x) => x.option_values.some((ov) => removed.some((r) => r.id === ov.id)))) {
        await bc.delete(`/v3/catalog/products/${pid}/variants/${v.id}`);
      }
      variants = variants.filter((x) => !x.option_values.some((ov) => removed.some((r) => r.id === ov.id)));
      for (const r of removed) await bc.delete(`/v3/catalog/products/${pid}/options/${opt.id}/values/${r.id}`);
      opt.option_values = opt.option_values.filter((v) => o.values.includes(v.label));
      for (const label of missing) {
        const made = await bc.post(`/v3/catalog/products/${pid}/options/${opt.id}/values`, { label, sort_order: o.values.indexOf(label) });
        opt.option_values.push(made.data);
      }
      const reorder = opt.option_values.some((v) => v.sort_order !== o.values.indexOf(v.label));
      if (reorder && missing.length === 0) {
        await bc.put(`/v3/catalog/products/${pid}/options/${opt.id}`, {
          option_values: opt.option_values.map((v) => ({ id: v.id, label: v.label, sort_order: o.values.indexOf(v.label) })),
        });
      }
    }
  }

  const valueRef = (name, label) => {
    const opt = options.find((x) => x.display_name === name);
    const val = opt?.option_values.find((v) => v.label === label);
    if (!val) throw new AdminError('One of the choices could not be saved. Reload the product and try again.');
    return { id: val.id, option_id: opt.id };
  };
  const existing = new Map(variants.map((v) => [keyOf(Object.fromEntries(v.option_values.map((o) => [o.option_display_name, o.label]))), v]));
  const wanted = new Set(input.variants.map((v) => keyOf(v.values)));

  // Combinations no longer in the grid.
  for (const [key, v] of existing) {
    if (!wanted.has(key)) await bc.delete(`/v3/catalog/products/${pid}/variants/${v.id}`);
  }

  const updates = [];
  for (const w of input.variants) {
    const v = existing.get(keyOf(w.values));
    if (v) {
      // Only real changes are sent, so combinations that borrow the product's price keep doing so.
      const change = {};
      if (Number(w.price) !== Number(v.calculated_price)) change.price = Number(w.price);
      if (w.sku?.trim() && w.sku.trim() !== (v.sku ?? '')) change.sku = w.sku.trim();
      if (Boolean(w.purchasing_disabled) !== Boolean(v.purchasing_disabled)) change.purchasing_disabled = Boolean(w.purchasing_disabled);
      if (input.trackStock && w.stock != null && w.stock !== '' && Number(w.stock) !== v.inventory_level) change.inventory_level = Number(w.stock);
      if ((w.image_url || '') !== (v.image_url || '') && w.image_url) change.image_url = w.image_url;
      if (Object.keys(change).length) updates.push({ id: v.id, ...change });
    } else {
      await bc.post(`/v3/catalog/products/${pid}/variants`, {
        sku: skuFor(w, current.name),
        price: Number(w.price),
        ...(input.trackStock ? { inventory_level: Number(w.stock) || 0 } : {}),
        purchasing_disabled: Boolean(w.purchasing_disabled),
        ...(w.image_url ? { image_url: w.image_url } : {}),
        option_values: input.options.map((o) => valueRef(o.name, w.values[o.name])),
      });
    }
  }
  for (let i = 0; i < updates.length; i += 50) await bc.put('/v3/catalog/variants', updates.slice(i, i + 50));
}

async function saveImages(bc, current, images) {
  const byUrl = new Map(current.images.map((i) => [i.url_zoom, i]));
  for (const image of current.images.filter((i) => !images.includes(i.url_zoom))) {
    await bc.delete(`/v3/catalog/products/${current.id}/images/${image.id}`);
  }
  for (const [i, url] of images.entries()) {
    const image = byUrl.get(url);
    if (!image) await bc.post(`/v3/catalog/products/${current.id}/images`, { image_url: url, is_thumbnail: i === 0 });
    else if (i === 0 && !image.is_thumbnail) await bc.put(`/v3/catalog/products/${current.id}/images/${image.id}`, { is_thumbnail: true });
  }
}

export async function updateProduct(bc, id, raw) {
  const input = clean(raw);
  validate(input);
  const current = await getProduct(bc, id);
  const hasOptions = input.options.length > 0;
  const change = {
    name: input.name.trim(),
    description: input.description_html,
    is_visible: Boolean(input.is_visible),
    weight: Number(input.weight),
    categories: categoriesOf(input),
  };
  // Stock not counted ('none') means the product never sells out.
  if (hasOptions) {
    change.inventory_tracking = input.trackStock ? 'variant' : 'none';
  } else {
    // Sold as one item: price, SKU and stock belong to the product.
    const only = input.variants[0];
    change.inventory_tracking = input.trackStock ? 'product' : 'none';
    change.price = Number(only.price);
    if (input.trackStock && only.stock !== '' && only.stock != null) change.inventory_level = Number(only.stock) || 0;
    const sku = (input.sku ?? only.sku ?? '').trim();
    if (sku && sku !== (current.sku ?? '')) change.sku = sku;
  }
  await bc.put(`/v3/catalog/products/${id}`, change);
  if (hasOptions || current.options.length > 0) await saveVariants(bc, current, input);
  await saveImages(bc, current, input.images);
  return toAdminProduct(await getProduct(bc, id));
}

export const setProductVisible = (bc, id, isVisible) => bc.put(`/v3/catalog/products/${id}`, { is_visible: Boolean(isVisible) });
export const deleteProduct = (bc, id) => bc.delete(`/v3/catalog/products/${id}`);

// Categories: the groups in the shop's menu (Shop All, Wax Melts...). Shop All holds every product.
const toCategory = (c) => ({
  id: c.id,
  name: c.name,
  parent_id: c.parent_id,
  description: c.description || '',
  is_visible: c.is_visible,
  sort_order: c.sort_order,
  image_url: c.image_url || '',
  url: c.custom_url?.url || '',
  locked: c.id === SHOP_ALL_CATEGORY,
});

export async function listCategories(bc) {
  const { data } = await bc.get('/v3/catalog/categories?limit=250&include_fields=id,name,parent_id,description,is_visible,sort_order,image_url,custom_url');
  return data.map(toCategory).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

export async function saveCategory(bc, input) {
  const name = String(input?.name || '').trim();
  if (!name) throw new AdminError('Give the category a name.');
  const body = {
    name,
    description: input.description || '',
    is_visible: Boolean(input.is_visible),
    sort_order: Number(input.sort_order) || 0,
    image_url: input.image_url || '',
  };
  if (input.id) {
    if (Number(input.id) === SHOP_ALL_CATEGORY && body.name !== 'Shop All') throw new AdminError('Shop All keeps its name, because the menu links to it.');
    return toCategory((await bc.put(`/v3/catalog/categories/${Number(input.id)}`, body)).data);
  }
  return toCategory((await bc.post('/v3/catalog/categories', { ...body, parent_id: 0 })).data);
}

export async function deleteCategory(bc, id) {
  if (Number(id) === SHOP_ALL_CATEGORY) throw new AdminError('Shop All cannot be deleted. It holds every product.');
  await bc.delete(`/v3/catalog/categories/${Number(id)}`);
}
