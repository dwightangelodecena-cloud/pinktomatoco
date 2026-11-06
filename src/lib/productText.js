// Helpers that read structured details out of the original product descriptions.

export function plainText(html) {
  return (html || '')
    .replace(/<br[^>]*>/g, '\n')
    .replace(/<\/p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&mdash;/g, '—')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

const field = (text, label) => {
  const m = text.match(new RegExp(`${label}:\\s*([^\\n]+)`));
  return m ? m[1].trim().replace(/\.$/, '') : null;
};

// { moods: ['Calm', ...], notes: ['Bergamot', ...], burnTime, intro } or null when the
// description has no "Mood:" / "Scent Notes:" lines.
export function scentProfile(product) {
  const text = plainText(product.description_html);
  const mood = field(text, 'Mood');
  const notes = field(text, 'Scent Notes');
  if (!mood || !notes) return null;
  const intro = text.split('\n').map((s) => s.trim()).find((s) => s.length > 60) || '';
  return {
    moods: mood.split(',').map((s) => s.trim()).filter(Boolean),
    notes: notes.replace(/\band\b/g, ',').split(',').map((s) => s.trim()).filter(Boolean),
    burnTime: field(text, 'Burn Time'),
    intro,
  };
}

// Most common price for each size label across candle products.
export function typicalSizePrices(products) {
  const counts = {};
  for (const p of products) {
    for (const v of p.variants || []) {
      const label = v.label.startsWith('Wax Melts') ? 'Wax Melts' : v.label;
      counts[label] ??= {};
      counts[label][v.price] = (counts[label][v.price] || 0) + 1;
    }
  }
  const out = {};
  for (const [label, prices] of Object.entries(counts)) {
    out[label] = Number(Object.entries(prices).sort((a, b) => b[1] - a[1])[0][0]);
  }
  return out;
}
