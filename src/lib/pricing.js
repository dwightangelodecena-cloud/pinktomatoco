export const money = (n) => `$${Number(n).toFixed(2)}`;

export function sortedVariants(product) {
  return [...(product.variants || [])].sort((a, b) => a.sort - b.sort);
}

export function defaultVariant(product) {
  const vs = sortedVariants(product);
  return vs.find((v) => v.is_default) || vs[0] || null;
}

// Listing price, e.g. "$3.00 - $38.00" or "$6.00" (matches the original store).
export function priceRange(product) {
  const prices = (product.variants || []).map((v) => Number(v.price));
  if (!prices.length) return money(product.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? money(min) : `${money(min)} - ${money(max)}`;
}

function matchingTier(tiers, qty) {
  return (tiers || []).find((t) => qty >= t.min && (t.max == null || qty <= t.max));
}

// Same rules as public.bulk_unit_price() in the database.
export function unitPrice(basePrice, tiers, qty) {
  const base = Number(basePrice);
  const t = matchingTier(tiers, qty);
  if (!t) return base;
  if (t.type === 'percent') return Math.round(base * (1 - t.value / 100) * 100) / 100;
  if (t.type === 'price') return Math.max(base - t.value, 0);
  if (t.type === 'fixed') return Number(t.value);
  return base;
}

export function bulkTierText(t) {
  const range = t.max == null ? `Buy ${t.min} or above` : `Buy ${t.min} - ${t.max}`;
  if (t.type === 'percent') return `${range} and get ${t.value}% off`;
  if (t.type === 'price') return `${range} and get ${money(t.value)} off`;
  return `${range} and pay only ${money(t.value)} each`;
}
