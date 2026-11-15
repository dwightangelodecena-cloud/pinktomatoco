// Little ingredient illustrations for the homepage hero, picked from each candle's "Scent Notes:" line.
// Each is a self-contained SVG (viewBox 0 0 100 100) in the site's warm palette.
const ART = {
    petal: `<svg viewBox="0 0 100 100"><defs><radialGradient id="g-petal" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#ffe3e6"/><stop offset=".55" stop-color="#f3a9b3"/><stop offset="1" stop-color="#d9707f"/></radialGradient></defs><path d="M50 8C70 22 84 44 78 66 72 86 56 94 50 94S28 86 22 66C16 44 30 22 50 8Z" fill="url(#g-petal)"/><path d="M50 20C50 46 50 70 50 90" stroke="#d07583" stroke-width="1.5" fill="none" opacity=".45"/></svg>`,
    citrus: `<svg viewBox="0 0 100 100"><defs><radialGradient id="g-cit" cx="50%" cy="50%" r="55%"><stop offset="0" stop-color="#fff6c9"/><stop offset=".8" stop-color="#ffd25e"/><stop offset="1" stop-color="#f2b134"/></radialGradient></defs><circle cx="50" cy="50" r="44" fill="#f2b134"/><circle cx="50" cy="50" r="38" fill="#fff4d6"/><circle cx="50" cy="50" r="34" fill="url(#g-cit)"/><g stroke="#fff4d6" stroke-width="3">${Array.from({ length: 8 }, (_, i) => `<line x1="50" y1="50" x2="${50 + 34 * Math.cos((i * Math.PI) / 4)}" y2="${50 + 34 * Math.sin((i * Math.PI) / 4)}"/>`).join('')}</g><circle cx="50" cy="50" r="5" fill="#fff4d6"/></svg>`,
    leaf: `<svg viewBox="0 0 100 100"><defs><linearGradient id="g-leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b8c98a"/><stop offset="1" stop-color="#6f8b4e"/></linearGradient></defs><path d="M14 86C10 46 40 12 88 12 90 58 58 90 14 86Z" fill="url(#g-leaf)"/><path d="M16 84C40 62 60 40 84 16" stroke="#e9f0d6" stroke-width="2" fill="none" opacity=".7"/></svg>`,
    honey: `<svg viewBox="0 0 100 100"><defs><radialGradient id="g-honey" cx="38%" cy="38%" r="70%"><stop offset="0" stop-color="#ffe2a3"/><stop offset=".6" stop-color="#f0a83c"/><stop offset="1" stop-color="#b8661a"/></radialGradient></defs><path d="M50 6C62 30 80 46 80 64 80 82 66 94 50 94S20 82 20 64C20 46 38 30 50 6Z" fill="url(#g-honey)"/><ellipse cx="40" cy="58" rx="7" ry="11" fill="#fff" opacity=".45"/></svg>`,
    vanilla: `<svg viewBox="0 0 100 100"><defs><linearGradient id="g-van" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a3420"/><stop offset=".5" stop-color="#8a5a35"/><stop offset="1" stop-color="#4a2a18"/></linearGradient></defs><path d="M22 92C30 60 52 28 80 6" stroke="url(#g-van)" stroke-width="9" stroke-linecap="round" fill="none"/><path d="M26 84C34 58 54 32 76 12" stroke="#c49a6c" stroke-width="1.5" fill="none" opacity=".5"/></svg>`,
    cinnamon: `<svg viewBox="0 0 100 100"><g transform="rotate(-35 50 50)"><rect x="18" y="38" width="64" height="24" rx="11" fill="#a0522d"/><rect x="18" y="38" width="64" height="9" rx="4.5" fill="#c46d3b"/><ellipse cx="82" cy="50" rx="6" ry="12" fill="#7a3c1e"/><path d="M80 44c4 2 4 10 0 12" stroke="#d98a52" stroke-width="2" fill="none"/></g></svg>`,
    berry: `<svg viewBox="0 0 100 100"><defs><radialGradient id="g-berry" cx="35%" cy="35%" r="70%"><stop offset="0" stop-color="#ff8a95"/><stop offset="1" stop-color="#a51f35"/></radialGradient></defs><circle cx="38" cy="58" r="20" fill="url(#g-berry)"/><circle cx="64" cy="62" r="17" fill="url(#g-berry)"/><circle cx="52" cy="38" r="15" fill="url(#g-berry)"/><path d="M52 24c2-8 8-14 16-16" stroke="#6f8b4e" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="32" cy="52" r="4" fill="#fff" opacity=".5"/></svg>`,
    amber: `<svg viewBox="0 0 100 100"><defs><linearGradient id="g-amber" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd08a"/><stop offset=".5" stop-color="#e08a2c"/><stop offset="1" stop-color="#9c4f14"/></linearGradient></defs><path d="M50 8 84 30 78 74 44 92 14 66 20 26Z" fill="url(#g-amber)"/><path d="M50 8 44 52 84 30M44 52 14 66M44 52 44 92" stroke="#ffe5bd" stroke-width="1.5" fill="none" opacity=".55"/></svg>`,
    bean: `<svg viewBox="0 0 100 100"><g transform="rotate(25 50 50)"><ellipse cx="50" cy="50" rx="26" ry="38" fill="#5b3420"/><ellipse cx="44" cy="42" rx="8" ry="14" fill="#8a5a3a" opacity=".6"/><path d="M50 14C40 34 60 66 50 86" stroke="#2e170c" stroke-width="4" fill="none" stroke-linecap="round"/></g></svg>`,
    lavender: `<svg viewBox="0 0 100 100"><path d="M48 96C50 70 52 44 56 14" stroke="#7d8f5c" stroke-width="3" fill="none" stroke-linecap="round"/>${Array.from({ length: 7 }, (_, i) => `<ellipse cx="${52 + (i % 2 ? 6 : -4) + i * 0.6}" cy="${20 + i * 8}" rx="6" ry="4.5" fill="${i % 2 ? '#b9a0d6' : '#9a7cc0'}" transform="rotate(${i % 2 ? 30 : -30} ${52 + i * 0.6} ${20 + i * 8})"/>`).join('')}</svg>`,
    wax: `<svg viewBox="0 0 100 100"><defs><radialGradient id="g-wax" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fffaf2"/><stop offset="1" stop-color="#ead6bd"/></radialGradient></defs><path d="M50 10C64 34 76 48 76 64 76 80 64 92 50 92S24 80 24 64C24 48 36 34 50 10Z" fill="url(#g-wax)"/></svg>`,
};

// Words in a scent note, mapped to an illustration.
const MATCH = [
    [/rose|peony|floral|jasmine|blossom|lily|gardenia|magnolia|orchid|violet|petal|sakura|cherry blossom/i, 'petal'],
    [/lemon|lime|orange|bergamot|grapefruit|yuzu|pomelo|citrus|mandarin|tangerine|neroli/i, 'citrus'],
    [/lavender|lilac/i, 'lavender'],
    [/tea|mint|eucalyptus|basil|sage|cucumber|green|pine|cypress|cedar|fir|leaf|herb|grass|bamboo|matcha/i, 'leaf'],
    [/honey|caramel|sugar|maple|butter|cream|milk/i, 'honey'],
    [/vanilla|tonka/i, 'vanilla'],
    [/cinnamon|clove|spice|nutmeg|ginger|chai|pepper|cardamom/i, 'cinnamon'],
    [/berry|cherry|raspberry|strawberry|cranberry|fig|plum|pomegranate|currant|apple|pear|peach/i, 'berry'],
    [/coffee|cocoa|chocolate|espresso|mocha/i, 'bean'],
    [/amber|musk|wood|sandal|oud|tobacco|smoke|leather|patchouli|vetiver|resin|beeswax/i, 'amber'],
    // Candle names without notes: words that suggest a scent family.
    [/earl|grey|spa|sea|island|christmas|forest|garden|apple sage/i, 'leaf'],
    [/sunny|morning|summer|jeju|sunshine/i, 'citrus'],
    [/hickory|suede|manhattan|luxe|starry|night|cabin/i, 'amber'],
    [/grandma|home|house|cozy|snow|bakery|cookie/i, 'cinnamon'],
];

export function notesFromText(text) {
    const m = String(text || '').match(/scent notes?\s*:\s*([^\n]+?)(?:\s*(?:burn time|mood)\s*:|$)/i);
    if (!m) return [];
    return m[1].split(/[,/·]/).map((x) => x.trim().replace(/\.$/, '')).filter(Boolean).slice(0, 8);
}

// Up to five different illustrations for a candle's notes (wax drops when nothing matches).
export function artFor(notes) {
    const kinds = [];
    notes.forEach((n) => {
        const hit = MATCH.find(([re]) => re.test(n));
        if (hit && !kinds.includes(hit[1])) kinds.push(hit[1]);
    });
    if (!kinds.length) kinds.push('wax', 'amber');
    return kinds.slice(0, 5).map((k) => ART[k]);
}
