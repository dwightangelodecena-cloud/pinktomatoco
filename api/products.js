import { bigcommerce, sendJson } from './_lib/bigcommerce.js';

const FIELDS = 'id,name,sku,price,description,custom_url,is_visible,availability,inventory_tracking,inventory_level,related_products';

async function fetchAll() {
  const products = [];
  for (let page = 1, pages = 1; page <= pages; page++) {
    const response = await bigcommerce(`/v3/catalog/products?is_visible=true&limit=250&page=${page}&include=variants,images&include_fields=${FIELDS}`);
    if (!response.ok) throw new Error(`BigCommerce products request failed: ${response.status}`);
    const { data, meta } = await response.json();
    products.push(...data);
    pages = meta.pagination.total_pages;
  }
  return products;
}

function stockFor(product, variant) {
  if (product.inventory_tracking === 'variant') return variant.inventory_level;
  if (product.inventory_tracking === 'product') return product.inventory_level;
  return null;
}

function toVariant(product, variant, sort) {
  const stock = stockFor(product, variant);
  return {
    id: variant.id,
    label: variant.option_values.map((o) => o.label).join(' / ') || product.name,
    price: variant.calculated_price,
    sku: variant.sku,
    sort,
    stock,
    available: !variant.purchasing_disabled && product.availability === 'available' && (stock === null || stock > 0),
  };
}

// Same shape the shop already uses for products.
function toProduct(product) {
  const variants = product.variants.map((v, i) => toVariant(product, v, i));
  const main = variants.find((v) => v.available && v.sku === product.sku) || variants.find((v) => v.available) || variants[0];
  const images = [...product.images].sort((a, b) => Number(b.is_thumbnail) - Number(a.is_thumbnail) || a.sort_order - b.sort_order);
  return {
    id: product.id,
    slug: product.custom_url.url.replace(/^\/|\/$/g, ''),
    name: product.name,
    sku: main?.sku ?? product.sku,
    price: main?.price ?? product.price,
    description_html: product.description,
    images: images.map((i) => i.url_zoom),
    option_name: product.variants[0]?.option_values[0]?.option_display_name || 'Size',
    related: product.related_products.filter((id) => id > 0),
    variants: variants.map((v) => ({ ...v, is_default: v === main })),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });
  try {
    const products = await fetchAll();
    sendJson(res, 200, products.map(toProduct), { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' });
  } catch (err) {
    console.error(err);
    sendJson(res, 502, { error: 'Products are not available right now.' });
  }
}
