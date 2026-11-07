export const money = (n) => `$${Number(n).toFixed(2)}`;

export function sortedVariants(product) {
  return [...(product.variants || [])].sort((a, b) => a.sort - b.sort);
}

// Older saved products have no stock details, so they count as available.
export const isAvailable = (variant) => variant.available !== false;

export function defaultVariant(product) {
  const vs = sortedVariants(product);
  return vs.find((v) => v.is_default) || vs.find(isAvailable) || vs[0] || null;
}

// Listing price, e.g. "$3.00 - $38.00" or "$6.00" (matches the original store).
export function priceRange(product) {
  const all = product.variants || [];
  const buyable = all.filter(isAvailable);
  const prices = (buyable.length ? buyable : all).map((v) => Number(v.price));
  if (!prices.length) return money(product.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? money(min) : `${money(min)} - ${money(max)}`;
}

