import { AdminError } from './admin.js';
import { CHANNEL_ID, bigcommerce } from './bigcommerce.js';

const SHOP_ALL_CATEGORY = 23;
const FIELDS = 'id,name,sku,description,custom_url,is_visible,availability,inventory_tracking,inventory_level,weight';

// Turns a BigCommerce refusal into a message the admin can act on.
async function send(path, options) {
  const response = await bigcommerce(path, options);
  if (response.status === 204) return null;
  const body = await response.json().catch(() => null);
  if (response.status === 409 || response.status === 422) {
    const detail = body?.errors ? Object.values(body.errors).join(' ') : '';
    throw new AdminError(detail || body?.title || 'BigCommerce refused that change.');
  }
  if (!response.ok) throw new Error(`BigCommerce request failed: ${response.status} ${path}`);
  return body;
}

const json = (method, body) => ({ method, body: JSON.stringify(body) });

function toAdminProduct(p) {
  const images = [...p.images].sort((a, b) => Number(b.is_thumbnail) - Number(a.is_thumbnail) || a.sort_order - b.sort_order);
  return {
    id: p.id,
    slug: p.custom_url.url.replace(/^\/|\/$/g, ''),
    name: p.name,
    sku: p.sku,
    description_html: p.description,
    images: images.map((i) => i.url_zoom),
    is_visible: p.is_visible,
    weight: p.weight,
    inventory_tracking: p.inventory_tracking,
    inventory_level: p.inventory_level,
    product_variants: p.variants.map((v, sort) => {
      const stock = p.inventory_tracking === 'variant' ? v.inventory_level : p.inventory_tracking === 'product' ? p.inventory_level : null;
      return {
        id: v.id,
        label: v.option_values.map((o) => o.label).join(' / '),
        price: v.calculated_price,
        sku: v.sku,
        sort,
        stock,
        purchasing_disabled: v.purchasing_disabled,
        available: !v.purchasing_disabled && (stock === null || stock > 0),
      };
    }),
  };
}

export async function listAdminProducts() {
  const products = [];
  for (let page = 1, pages = 1; page <= pages; page++) {
    const { data, meta } = await send(`/v3/catalog/products?limit=250&page=${page}&include=variants,images&include_fields=${FIELDS}`);
    products.push(...data);
    pages = meta.pagination.total_pages;
  }
  return products.map(toAdminProduct).sort((a, b) => b.id - a.id);
}

const getProduct = (id) => send(`/v3/catalog/products/${id}?include=variants,images&include_fields=${FIELDS}`).then((r) => r.data);

function validate(input) {
  if (!input?.name?.trim()) throw new AdminError('Give the product a name.');
  if (!(Number(input.weight) > 0)) throw new AdminError('Enter a weight above 0, so shipping can be worked out.');
  if (!Array.isArray(input.sizes) || input.sizes.length === 0) throw new AdminError('Add at least one size.');
  for (const s of input.sizes) {
    if (!s.id && !s.label?.trim()) throw new AdminError('Every new size needs a name.');
    if (!(Number(s.price) >= 0) || s.price === '' || s.price === null) throw new AdminError('Every size needs a price.');
    if (s.stock != null && !(Number.isInteger(s.stock) && s.stock >= 0)) throw new AdminError('Stock must be a whole number.');
  }
}

export async function createProduct(input) {
  validate(input);
  const sizes = input.sizes;
  const created = await send('/v3/catalog/products', json('POST', {
    name: input.name.trim(),
    type: 'physical',
    weight: Number(input.weight),
    price: Number(sizes[0].price),
    description: input.description_html,
    is_visible: Boolean(input.is_visible),
    categories: [SHOP_ALL_CATEGORY],
    inventory_tracking: 'variant',
    images: input.images.map((image_url, i) => ({ image_url, is_thumbnail: i === 0 })),
    variants: sizes.map((s) => ({
      sku: s.sku?.trim() || undefined,
      price: Number(s.price),
      inventory_level: s.stock ?? 0,
      purchasing_disabled: Boolean(s.purchasing_disabled),
      option_values: [{ option_display_name: 'Size', label: s.label.trim() }],
    })),
  }));
  const { id } = created.data;
  await send('/v3/catalog/products/channel-assignments', json('PUT', [{ product_id: id, channel_id: CHANNEL_ID }]));
  return toAdminProduct(await getProduct(id));
}

function optionKey(variant) {
  const values = variant.option_values;
  if (values.length !== 1) throw new AdminError('This product has more than one option, so its sizes must be changed in BigCommerce.');
  return values[0];
}

async function saveSizes(current, sizes) {
  const existing = new Map(current.variants.map((v) => [v.id, v]));
  const kept = new Set(sizes.filter((s) => s.id).map((s) => s.id));
  const tracksVariants = current.inventory_tracking === 'variant';

  for (const s of sizes.filter((x) => x.id)) {
    const v = existing.get(s.id);
    if (!v) throw new AdminError('One of the sizes no longer exists. Reload and try again.');
    // Only real changes are sent, so sizes that borrow the product's price keep doing so.
    const change = {};
    if (Number(s.price) !== Number(v.calculated_price)) change.price = Number(s.price);
    if ((s.sku ?? '') !== (v.sku ?? '')) change.sku = s.sku;
    if (Boolean(s.purchasing_disabled) !== Boolean(v.purchasing_disabled)) change.purchasing_disabled = Boolean(s.purchasing_disabled);
    if (tracksVariants && s.stock != null && s.stock !== v.inventory_level) change.inventory_level = s.stock;
    if (Object.keys(change).length) await send(`/v3/catalog/products/${current.id}/variants/${s.id}`, json('PUT', change));
  }

  for (const v of current.variants.filter((x) => !kept.has(x.id))) {
    const { option_id, id } = optionKey(v);
    await send(`/v3/catalog/products/${current.id}/options/${option_id}/values/${id}`, { method: 'DELETE' });
  }

  const newSizes = sizes.filter((x) => !x.id);
  if (newSizes.length === 0) return;
  if (current.variants.length === 0) throw new AdminError('New sizes for this product must be added in BigCommerce.');
  const { option_id } = optionKey(current.variants[0]);
  for (const [i, s] of newSizes.entries()) {
    const value = await send(`/v3/catalog/products/${current.id}/options/${option_id}/values`, json('POST', { label: s.label.trim(), sort_order: current.variants.length + i }));
    await send(`/v3/catalog/products/${current.id}/variants`, json('POST', {
      sku: s.sku?.trim() || undefined,
      price: Number(s.price),
      purchasing_disabled: Boolean(s.purchasing_disabled),
      ...(tracksVariants ? { inventory_level: s.stock ?? 0 } : {}),
      option_values: [{ id: value.data.id, option_id }],
    }));
  }
}

async function saveImages(current, images) {
  const byUrl = new Map(current.images.map((i) => [i.url_zoom, i]));
  for (const image of current.images.filter((i) => !images.includes(i.url_zoom))) {
    await send(`/v3/catalog/products/${current.id}/images/${image.id}`, { method: 'DELETE' });
  }
  for (const [i, url] of images.entries()) {
    const image = byUrl.get(url);
    if (!image) await send(`/v3/catalog/products/${current.id}/images`, json('POST', { image_url: url, is_thumbnail: i === 0 }));
    else if (i === 0 && !image.is_thumbnail) await send(`/v3/catalog/products/${current.id}/images/${image.id}`, json('PUT', { is_thumbnail: true }));
  }
}

export async function updateProduct(id, input) {
  validate(input);
  const current = await getProduct(id);
  const change = {
    name: input.name.trim(),
    description: input.description_html,
    is_visible: Boolean(input.is_visible),
    weight: Number(input.weight),
  };
  if ((input.sku ?? '') !== (current.sku ?? '')) change.sku = input.sku;
  if (current.inventory_tracking === 'product' && input.inventory_level != null) change.inventory_level = input.inventory_level;

  await send(`/v3/catalog/products/${id}`, json('PUT', change));
  await saveSizes(current, input.sizes);
  await saveImages(current, input.images);
  return toAdminProduct(await getProduct(id));
}

export const setProductVisible = (id, isVisible) => send(`/v3/catalog/products/${id}`, json('PUT', { is_visible: Boolean(isVisible) }));
export const deleteProduct = (id) => send(`/v3/catalog/products/${id}`, { method: 'DELETE' });
