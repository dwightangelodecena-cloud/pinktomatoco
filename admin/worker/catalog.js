// Products, sizes, stock and photos. Ported from the React site's api/_lib/catalog.js.
import { AdminError } from './bigcommerce.js';

const SHOP_ALL_CATEGORY = 23;
const FIELDS = 'id,name,sku,description,custom_url,is_visible,is_featured,availability,inventory_tracking,inventory_level,weight';

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
    is_featured: p.is_featured,
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

export async function listAdminProducts(bc) {
  const products = [];
  for (let page = 1, pages = 1; page <= pages; page++) {
    const { data, meta } = await bc.get(`/v3/catalog/products?limit=250&page=${page}&include=variants,images&include_fields=${FIELDS}`);
    products.push(...data);
    pages = meta.pagination.total_pages;
  }
  return products.map(toAdminProduct).sort((a, b) => b.id - a.id);
}

const getProduct = (bc, id) => bc.get(`/v3/catalog/products/${id}?include=variants,images&include_fields=${FIELDS}`).then((r) => r.data);

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

export async function createProduct(bc, env, input) {
  validate(input);
  const sizes = input.sizes;
  const created = await bc.post('/v3/catalog/products', {
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
  });
  const { id } = created.data;
  await bc.put('/v3/catalog/products/channel-assignments', [{ product_id: id, channel_id: Number(env.CHANNEL_ID) }]);
  return toAdminProduct(await getProduct(bc, id));
}

function optionKey(variant) {
  const values = variant.option_values;
  if (values.length !== 1) throw new AdminError('This product has more than one option, so its sizes must be changed in BigCommerce.');
  return values[0];
}

async function saveSizes(bc, current, sizes) {
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
    if (Object.keys(change).length) await bc.put(`/v3/catalog/products/${current.id}/variants/${s.id}`, change);
  }

  for (const v of current.variants.filter((x) => !kept.has(x.id))) {
    const { option_id, id } = optionKey(v);
    await bc.delete(`/v3/catalog/products/${current.id}/options/${option_id}/values/${id}`);
  }

  const newSizes = sizes.filter((x) => !x.id);
  if (newSizes.length === 0) return;
  if (current.variants.length === 0) throw new AdminError('New sizes for this product must be added in BigCommerce.');
  const { option_id } = optionKey(current.variants[0]);
  for (const [i, s] of newSizes.entries()) {
    const value = await bc.post(`/v3/catalog/products/${current.id}/options/${option_id}/values`, { label: s.label.trim(), sort_order: current.variants.length + i });
    await bc.post(`/v3/catalog/products/${current.id}/variants`, {
      sku: s.sku?.trim() || undefined,
      price: Number(s.price),
      purchasing_disabled: Boolean(s.purchasing_disabled),
      ...(tracksVariants ? { inventory_level: s.stock ?? 0 } : {}),
      option_values: [{ id: value.data.id, option_id }],
    });
  }
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

export async function updateProduct(bc, id, input) {
  validate(input);
  const current = await getProduct(bc, id);
  const change = {
    name: input.name.trim(),
    description: input.description_html,
    is_visible: Boolean(input.is_visible),
    weight: Number(input.weight),
  };
  if ((input.sku ?? '') !== (current.sku ?? '')) change.sku = input.sku;
  if (current.inventory_tracking === 'product' && input.inventory_level != null) change.inventory_level = input.inventory_level;

  await bc.put(`/v3/catalog/products/${id}`, change);
  await saveSizes(bc, current, input.sizes);
  await saveImages(bc, current, input.images);
  return toAdminProduct(await getProduct(bc, id));
}

export const setProductVisible = (bc, id, isVisible) => bc.put(`/v3/catalog/products/${id}`, { is_visible: Boolean(isVisible) });
export const deleteProduct = (bc, id) => bc.delete(`/v3/catalog/products/${id}`);
