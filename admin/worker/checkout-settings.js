// Shipping, Payments & Tax tab. Shipping and tax rates are edited here; payment providers are only
// listed, because connecting one (Stripe, PayPal...) means signing in to that provider inside BigCommerce.
import { AdminError } from './bigcommerce.js';

const money = (n) => Math.round(Number(n) * 100) / 100;
const METHOD_TYPES = ['perorder', 'peritem', 'free', 'total', 'weight'];

const toZone = (z) => ({
  id: z.id,
  name: z.name,
  type: z.type,
  enabled: z.enabled,
  locations: (z.locations || []).map((l) => ({ country: l.country_iso2, state: l.state_iso2 || '' })),
  freeShipping: { enabled: Boolean(z.free_shipping?.enabled), minimum: money(z.free_shipping?.minimum_sub_total || 0) },
  handlingFee: money(z.handling_fees?.fixed_surcharge || 0),
});

const toMethod = (m) => ({
  id: m.id,
  name: m.name,
  type: m.type,
  enabled: m.enabled,
  rate: m.settings?.rate != null ? money(m.settings.rate) : null,
  ranges: (m.settings?.range || []).map((r) => ({ from: money(r.lower_limit), to: money(r.upper_limit), cost: money(r.shipping_cost) })),
  defaultCost: m.settings?.default_cost != null ? money(m.settings.default_cost) : null,
});

export async function getShipping(bc) {
  const zones = (await bc.list('/v2/shipping/zones')).map(toZone);
  // One call per zone; stores have a handful of zones, well under the plan's 50-call limit.
  for (const z of zones) z.methods = (await bc.list(`/v2/shipping/zones/${z.id}/methods`)).map(toMethod);
  return zones;
}

export async function saveZone(bc, input) {
  const name = String(input?.name || '').trim();
  if (!name) throw new AdminError('Give the shipping area a name, like "United States".');
  const locations = (input.locations || []).filter((l) => l.country);
  if (locations.length === 0) throw new AdminError('Choose at least one country for this shipping area.');
  const hasStates = locations.some((l) => l.state);
  const body = {
    name,
    type: hasStates ? 'state' : 'country',
    locations: locations.map((l) => (hasStates ? { country_iso2: l.country, state_iso2: l.state } : { country_iso2: l.country })),
    enabled: input.enabled !== false,
    free_shipping: {
      enabled: Boolean(input.freeShipping?.enabled),
      minimum_sub_total: String(money(input.freeShipping?.minimum || 0)),
      exclude_fixed_shipping_products: false,
    },
    handling_fees: { display_separately: true, fixed_surcharge: String(money(input.handlingFee || 0)) },
  };
  const saved = input.id ? await bc.put(`/v2/shipping/zones/${Number(input.id)}`, body) : await bc.post('/v2/shipping/zones', body);
  return toZone(saved);
}

export const deleteZone = (bc, id) => bc.delete(`/v2/shipping/zones/${Number(id)}`);

export async function saveMethod(bc, zoneId, input) {
  const name = String(input?.name || '').trim();
  if (!name) throw new AdminError('Give the shipping option a name shoppers will see, like "Standard Shipping".');
  if (!METHOD_TYPES.includes(input.type)) throw new AdminError('Choose how this shipping option is charged.');
  let settings = {};
  if (input.type === 'perorder' || input.type === 'peritem') {
    if (!(Number(input.rate) >= 0) || input.rate === '' || input.rate === null) throw new AdminError('Enter the shipping price.');
    settings = { rate: money(input.rate) };
  }
  if (input.type === 'total' || input.type === 'weight') {
    const ranges = (input.ranges || []).filter((r) => r.to !== '' && r.cost !== '');
    if (ranges.length === 0) throw new AdminError('Add at least one price band.');
    for (const r of ranges) {
      if (!(Number(r.to) > Number(r.from))) throw new AdminError('In each band, the "up to" amount must be more than the "from" amount.');
      if (!(Number(r.cost) >= 0)) throw new AdminError('Every band needs a shipping price.');
    }
    settings = {
      default_cost: money(input.defaultCost || 0),
      default_cost_type: 'fixed_amount',
      range: ranges.map((r) => ({ lower_limit: money(r.from), upper_limit: money(r.to), shipping_cost: money(r.cost) })),
    };
  }
  const body = { name, type: input.type, settings, enabled: input.enabled !== false };
  const path = `/v2/shipping/zones/${Number(zoneId)}/methods`;
  const saved = input.id ? await bc.put(`${path}/${Number(input.id)}`, body) : await bc.post(path, body);
  return toMethod(saved);
}

export const deleteMethod = (bc, zoneId, id) => bc.delete(`/v2/shipping/zones/${Number(zoneId)}/methods/${Number(id)}`);

// The payment methods shoppers can choose at checkout.
export async function getPayments(bc) {
  const methods = await bc.list('/v2/payments/methods');
  return methods.map((m) => ({ code: m.code, name: m.name, testMode: Boolean(m.test_mode) }));
}

// Tax: BigCommerce's zones decide where a rate applies; most small US stores use one rate per state zone.
export async function getTax(bc) {
  const [zones, rates] = await Promise.all([bc.get('/v3/tax/zones'), bc.get('/v3/tax/rates')]);
  return {
    zones: zones.data.map((z) => ({ id: z.id, name: z.name, enabled: z.enabled, locations: (z.shopper_target_settings?.locations || []).map((l) => ({ country: l.country_code, state: (l.subdivision_codes || []).join(', ') })) })),
    rates: rates.data.map((r) => ({ id: r.id, name: r.name, zoneId: r.tax_zone_id, enabled: r.enabled, rate: Number(r.class_rates?.[0]?.rate || 0) })),
  };
}

export async function saveTaxRate(bc, input) {
  const name = String(input?.name || '').trim();
  if (!name) throw new AdminError('Give the tax a name shoppers will see, like "Sales Tax".');
  const rate = Number(input.rate);
  if (!(rate >= 0 && rate <= 100)) throw new AdminError('Enter the tax as a percentage between 0 and 100.');
  if (!input.zoneId) throw new AdminError('Choose where this tax applies.');
  const body = { name, enabled: input.enabled !== false, priority: 1, tax_zone_id: Number(input.zoneId), class_rates: [{ tax_class_id: 0, rate }] };
  const saved = input.id ? await bc.put('/v3/tax/rates', [{ id: Number(input.id), ...body }]) : await bc.post('/v3/tax/rates', [body]);
  const r = saved.data[0];
  return { id: r.id, name: r.name, zoneId: r.tax_zone_id, enabled: r.enabled, rate: Number(r.class_rates?.[0]?.rate || 0) };
}

export const deleteTaxRate = (bc, id) => bc.delete(`/v3/tax/rates?id:in=${Number(id)}`);
