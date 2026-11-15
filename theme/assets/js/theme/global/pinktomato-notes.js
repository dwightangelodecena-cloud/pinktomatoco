// Ingredient illustrations for the homepage hero, one per scent note (Rose → a rose, Bergamot → a
// bergamot slice, Cedar Wood → a wood slice…). Each is a small SVG (viewBox 0 0 100 100) in warm,
// natural colours. Also used by the admin's hero editor to preview the notes.

let uid = 0;
const id = (name) => `pt-${name}-${(uid += 1)}`;
const deg = (i, n) => (360 / n) * i;

// A flower: petals around a centre. Layers add inner rings (rose, peony).
function flower({ petal, edge, center, petals = 5, rx = 14, ry = 26, layers = 1, pointed = false }) {
    const g = id('fl');
    let out = `<defs><radialGradient id="${g}" cx="50%" cy="85%" r="90%"><stop offset="0" stop-color="${edge}"/><stop offset="1" stop-color="${petal}"/></radialGradient></defs>`;
    for (let l = 0; l < layers; l += 1) {
        const scale = 1 - l * 0.28;
        const shift = l * (180 / petals);
        for (let i = 0; i < petals; i += 1) {
            const shape = pointed
                ? `<path d="M50 50 C ${50 - rx * scale} ${50 - ry * scale * 0.6}, ${50 - rx * 0.4 * scale} ${50 - ry * scale * 1.5}, 50 ${50 - ry * scale * 1.7} C ${50 + rx * 0.4 * scale} ${50 - ry * scale * 1.5}, ${50 + rx * scale} ${50 - ry * scale * 0.6}, 50 50Z"`
                : `<ellipse cx="50" cy="${50 - ry * scale * 0.85}" rx="${rx * scale}" ry="${ry * scale}"`;
            out += `${shape} fill="url(#${g})" transform="rotate(${deg(i, petals) + shift} 50 50)" opacity="${0.92 - l * 0.08}"/>`;
        }
    }
    return `${out}<circle cx="50" cy="50" r="${layers > 1 ? 7 : 6}" fill="${center}"/>`;
}

// A rose seen from above: a spiral of rounded petals.
function rose(petal, dark) {
    const g = id('rose');
    let out = `<defs><radialGradient id="${g}" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="${dark}"/><stop offset="1" stop-color="${petal}"/></radialGradient></defs><circle cx="50" cy="50" r="44" fill="url(#${g})"/>`;
    [36, 28, 20, 12].forEach((r, i) => {
        out += `<path d="M${50 - r} 50 A ${r} ${r} 0 1 1 ${50 + r * 0.6} ${50 + r * 0.8}" fill="none" stroke="${dark}" stroke-width="${3 - i * 0.4}" opacity=".55" transform="rotate(${i * 70} 50 50)"/>`;
    });
    return out;
}

// A citrus slice.
function citrus(rind, flesh, pith = '#fff6dc') {
    const g = id('cit');
    let seg = '';
    for (let i = 0; i < 9; i += 1) {
        const a = (Math.PI * 2 * i) / 9;
        seg += `<line x1="50" y1="50" x2="${50 + 33 * Math.cos(a)}" y2="${50 + 33 * Math.sin(a)}"/>`;
    }
    return `<defs><radialGradient id="${g}"><stop offset="0" stop-color="${pith}"/><stop offset=".85" stop-color="${flesh}"/></radialGradient></defs><circle cx="50" cy="50" r="45" fill="${rind}"/><circle cx="50" cy="50" r="39" fill="${pith}"/><circle cx="50" cy="50" r="35" fill="url(#${g})"/><g stroke="${pith}" stroke-width="2.6">${seg}</g><circle cx="50" cy="50" r="4" fill="${pith}"/>`;
}

// A leaf, with a vein. Round leaves (sage, eucalyptus) are wider.
function leaf(light, dark, { round = false, vein = '#eef3dc' } = {}) {
    const g = id('leaf');
    const d = round ? 'M50 6C80 22 86 58 50 94 14 58 20 22 50 6Z' : 'M14 86C10 46 40 12 88 12 90 58 58 90 14 86Z';
    const v = round ? '<path d="M50 14V88" stroke-width="2" fill="none"/>' : '<path d="M16 84C40 62 60 40 84 16" stroke-width="2" fill="none"/>';
    return `<defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs><path d="${d}" fill="url(#${g})"/><g stroke="${vein}" opacity=".6">${v}</g>`;
}

function drop(light, mid, dark, shine = true) {
    const g = id('drop');
    return `<defs><radialGradient id="${g}" cx="38%" cy="40%" r="70%"><stop offset="0" stop-color="${light}"/><stop offset=".6" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></radialGradient></defs><path d="M50 6C62 30 80 46 80 64 80 82 66 94 50 94S20 82 20 64C20 46 38 30 50 6Z" fill="url(#${g})"/>${shine ? '<ellipse cx="40" cy="60" rx="6" ry="10" fill="#fff" opacity=".45"/>' : ''}`;
}

const ART = {
    rose: () => rose('#e4606f', '#9e2238'),
    whiterose: () => rose('#fbeee6', '#d9b9a8'),
    peony: () => flower({ petal: '#f6a7b8', edge: '#fde3ea', center: '#f3cf6b', petals: 8, rx: 15, ry: 20, layers: 3 }),
    jasmine: () => flower({ petal: '#fffaf0', edge: '#f4e6c8', center: '#f2c94c', petals: 5, rx: 12, ry: 24, pointed: true }),
    lily: () => flower({ petal: '#fbe6ef', edge: '#ffffff', center: '#d9864b', petals: 6, rx: 11, ry: 26, pointed: true }),
    orchid: () => flower({ petal: '#c58ad6', edge: '#f1d9f7', center: '#f2d06b', petals: 5, rx: 15, ry: 22 }),
    violet: () => flower({ petal: '#8a6cc8', edge: '#c7b6ee', center: '#f2d06b', petals: 5, rx: 14, ry: 20 }),
    blossom: () => flower({ petal: '#f9c6d3', edge: '#fff0f4', center: '#e98aa0', petals: 5, rx: 15, ry: 20 }),
    orangeblossom: () => flower({ petal: '#fffaf0', edge: '#ffe9c7', center: '#f5a623', petals: 5, rx: 13, ry: 22, pointed: true }),
    lavender: () => `<path d="M48 96C50 70 52 44 56 14" stroke="#7d8f5c" stroke-width="3" fill="none" stroke-linecap="round"/>${Array.from({ length: 7 }, (_, i) => `<ellipse cx="${52 + (i % 2 ? 6 : -4) + i * 0.6}" cy="${20 + i * 8}" rx="6" ry="4.5" fill="${i % 2 ? '#b9a0d6' : '#9a7cc0'}" transform="rotate(${i % 2 ? 30 : -30} ${52 + i * 0.6} ${20 + i * 8})"/>`).join('')}`,
    lemon: () => citrus('#f2c230', '#ffe27a'),
    lime: () => citrus('#6fa83a', '#c9e98a', '#f1f8dc'),
    bergamot: () => citrus('#9fbf3b', '#e9ef8a', '#fbfbe6'),
    orange: () => citrus('#f08a24', '#ffb85c'),
    grapefruit: () => citrus('#f0805a', '#ff9e86', '#fff0e8'),
    yuzu: () => citrus('#f4c430', '#ffe48a'),
    apple: () => {
        const g = id('apple');
        return `<defs><radialGradient id="${g}" cx="35%" cy="35%" r="70%"><stop offset="0" stop-color="#ff8a7a"/><stop offset=".6" stop-color="#d8342f"/><stop offset="1" stop-color="#8e1a1a"/></radialGradient></defs><path d="M50 30C38 18 14 22 14 50 14 76 32 94 44 92 48 91 52 91 56 92 68 94 86 76 86 50 86 22 62 18 50 30Z" fill="url(#${g})"/><path d="M50 30C50 22 52 14 56 8" stroke="#6b3b1f" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M54 18C62 6 78 8 80 12 74 22 62 24 54 18Z" fill="#7aa64a"/><ellipse cx="32" cy="44" rx="6" ry="10" fill="#fff" opacity=".35"/>`;
    },
    pear: () => drop('#f3f0a0', '#cdd56a', '#97a83e', true),
    cherry: () => `<path d="M30 56C34 30 48 14 66 8M66 8C68 30 70 44 70 56" stroke="#6b8e3a" stroke-width="3" fill="none"/>${['30,66', '70,66'].map((p) => { const [x, y] = p.split(','); const g = id('ch'); return `<defs><radialGradient id="${g}" cx="35%" cy="35%" r="70%"><stop offset="0" stop-color="#ff7a85"/><stop offset="1" stop-color="#8e0f22"/></radialGradient></defs><circle cx="${x}" cy="${y}" r="17" fill="url(#${g})"/>`; }).join('')}`,
    berry: () => { const g = id('berry'); return `<defs><radialGradient id="${g}" cx="35%" cy="35%" r="70%"><stop offset="0" stop-color="#ff8a95"/><stop offset="1" stop-color="#a51f35"/></radialGradient></defs><circle cx="38" cy="58" r="20" fill="url(#${g})"/><circle cx="64" cy="62" r="17" fill="url(#${g})"/><circle cx="52" cy="38" r="15" fill="url(#${g})"/><path d="M52 24c2-8 8-14 16-16" stroke="#6f8b4e" stroke-width="3" fill="none" stroke-linecap="round"/>`; },
    tea: () => leaf('#8fae5a', '#4f6e2e'),
    blacktea: () => leaf('#6b7d3a', '#33401b'),
    mint: () => leaf('#a6dc7a', '#4c9a3c'),
    sage: () => leaf('#c4cfbf', '#8a9c88', { round: true, vein: '#f2f5ef' }),
    eucalyptus: () => leaf('#b9cfc9', '#7a9a92', { round: true, vein: '#eef6f3' }),
    basil: () => leaf('#8fd46a', '#3f8a2c', { round: true }),
    pine: () => `<path d="M50 96V14" stroke="#6b4a2c" stroke-width="3"/>${Array.from({ length: 9 }, (_, i) => `<path d="M50 ${22 + i * 8}l-${18 - i} -10M50 ${22 + i * 8}l${18 - i} -10" stroke="${i % 2 ? '#3f6e3a' : '#5a8a46'}" stroke-width="3.5" stroke-linecap="round"/>`).join('')}`,
    cucumber: () => citrus('#3f7a35', '#cfe8a8', '#eef7de'),
    taro: () => {
        const g = id('taro');
        let dots = '';
        for (let i = 0; i < 14; i += 1) dots += `<circle cx="${50 + 24 * Math.cos(i * 2.4) * ((i % 3) / 3 + 0.3)}" cy="${50 + 24 * Math.sin(i * 2.4) * ((i % 3) / 3 + 0.3)}" r="1.8" fill="#7a4f9a" opacity=".7"/>`;
        return `<defs><radialGradient id="${g}"><stop offset="0" stop-color="#f3e8fb"/><stop offset=".8" stop-color="#cdb3e6"/><stop offset="1" stop-color="#a582c6"/></radialGradient></defs><ellipse cx="50" cy="50" rx="44" ry="40" fill="#7b5a43"/><ellipse cx="50" cy="50" rx="38" ry="34" fill="url(#${g})"/>${dots}`;
    },
    milk: () => `${drop('#ffffff', '#f6f1ea', '#d9cfc2', false)}<path d="M34 64c6 4 12 4 18 0" stroke="#e8ded0" stroke-width="2" fill="none"/>`,
    // A golden honey drop with a little dipper resting on it.
    honey: () => `${drop('#ffe7a8', '#f2a93b', '#b8661a')}<g transform="rotate(-35 62 30)"><rect x="58" y="-4" width="7" height="40" rx="3.5" fill="#c69261"/>${[0, 1, 2].map((i) => `<rect x="52" y="${30 + i * 7}" width="19" height="5.5" rx="2.7" fill="${i % 2 ? '#d7a873' : '#a8743f'}"/>`).join('')}</g>`,
    vanilla: () => `<path d="M22 92C30 60 52 28 80 6" stroke="#5a3420" stroke-width="9" stroke-linecap="round" fill="none"/>${flower({ petal: '#fff6dc', edge: '#ffffff', center: '#e9c46a', petals: 5, rx: 7, ry: 12 }).replace(/cx="50"/g, 'cx="50"')}`,
    cinnamon: () => `<g transform="rotate(-35 50 50)"><rect x="18" y="38" width="64" height="24" rx="11" fill="#a0522d"/><rect x="18" y="38" width="64" height="9" rx="4.5" fill="#c46d3b"/><ellipse cx="82" cy="50" rx="6" ry="12" fill="#7a3c1e"/></g>`,
    clove: () => `<rect x="47" y="30" width="6" height="60" rx="3" fill="#5a2e17"/>${flower({ petal: '#6b3820', edge: '#8a4a2a', center: '#4a2412', petals: 4, rx: 7, ry: 9 })}`,
    coffee: () => `<g transform="rotate(25 50 50)"><ellipse cx="50" cy="50" rx="26" ry="38" fill="#5b3420"/><path d="M50 14C40 34 60 66 50 86" stroke="#2e170c" stroke-width="4" fill="none" stroke-linecap="round"/></g>`,
    wood: () => {
        let rings = '';
        [36, 28, 20, 12, 5].forEach((r, i) => { rings += `<ellipse cx="50" cy="50" rx="${r}" ry="${r * 0.92}" fill="none" stroke="#a8743f" stroke-width="${1.6 - i * 0.15}" opacity=".7"/>`; });
        return `<ellipse cx="50" cy="50" rx="44" ry="41" fill="#7a4a24"/><ellipse cx="50" cy="50" rx="39" ry="36" fill="#d9a86c"/>${rings}<path d="M50 50L82 30" stroke="#7a4a24" stroke-width="1.5" opacity=".5"/>`;
    },
    musk: () => { const g = id('musk'); return `<defs><radialGradient id="${g}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e6ddd4"/></radialGradient></defs>${[[34, 56, 22], [58, 50, 24], [46, 36, 20], [64, 68, 18], [36, 72, 16]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${g})"/>`).join('')}`; },
    amber: () => { const g = id('amber'); return `<defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd08a"/><stop offset=".5" stop-color="#e08a2c"/><stop offset="1" stop-color="#9c4f14"/></linearGradient></defs><path d="M50 8 84 30 78 74 44 92 14 66 20 26Z" fill="url(#${g})"/>`; },
    tobacco: () => leaf('#c08a4a', '#7a4a1e', { vein: '#e9c896' }),
    smoke: () => `<path d="M40 92C30 72 58 64 46 46 36 32 58 22 52 6" stroke="#cfc4bb" stroke-width="8" fill="none" stroke-linecap="round" opacity=".7"/><path d="M58 90C50 74 70 66 62 50" stroke="#e8e0d8" stroke-width="5" fill="none" stroke-linecap="round" opacity=".6"/>`,
    coconut: () => `<circle cx="50" cy="54" r="40" fill="#6b4226"/><circle cx="50" cy="54" r="33" fill="#fffaf0"/><circle cx="50" cy="54" r="26" fill="#f4ede0"/>`,
    sugar: () => `<path d="M20 36 50 22 80 36 80 70 50 84 20 70Z" fill="#fffaf2"/><path d="M20 36 50 50 80 36M50 50V84" stroke="#e7dccd" stroke-width="2" fill="none"/>`,
    brownsugar: () => `<path d="M20 36 50 22 80 36 80 70 50 84 20 70Z" fill="#c98b4f"/><path d="M20 36 50 50 80 36M50 50V84" stroke="#a46a35" stroke-width="2" fill="none"/>`,
    shell: () => `<path d="M50 14C78 14 92 46 86 74 70 88 30 88 14 74 8 46 22 14 50 14Z" fill="#f6d9c7"/>${[0, 1, 2, 3, 4].map((i) => `<path d="M50 84L${22 + i * 14} 22" stroke="#e2b49c" stroke-width="2"/>`).join('')}`,
    moss: () => `${[[30, 60], [50, 52], [70, 62], [40, 72], [62, 76]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="#6f8f47"/>`).join('')}<circle cx="46" cy="54" r="6" fill="#a7c178"/>`,
    wax: () => drop('#fffaf2', '#f1e2cf', '#d9c3a6'),
};

// Note words → illustration. More specific phrases come first.
const MATCH = [
    [/white rose/i, 'whiterose'], [/rose/i, 'rose'], [/peon/i, 'peony'], [/jasmine|sampaguita|honeysuckle/i, 'jasmine'],
    [/orange blossom|neroli/i, 'orangeblossom'], [/lily|gardenia|magnolia/i, 'lily'], [/orchid/i, 'orchid'], [/violet|iris/i, 'violet'],
    [/blossom|sakura|floral|flower/i, 'blossom'], [/lavender|lilac/i, 'lavender'],
    [/bergamot/i, 'bergamot'], [/grapefruit|pomelo/i, 'grapefruit'], [/lime/i, 'lime'], [/lemon/i, 'lemon'], [/yuzu|citron/i, 'yuzu'],
    [/orange|mandarin|tangerine|clementine/i, 'orange'], [/citrus/i, 'lemon'],
    [/apple/i, 'apple'], [/pear/i, 'pear'], [/cherry/i, 'cherry'], [/berry|currant|pomegranate|fig|plum|grape/i, 'berry'],
    [/black tea|earl grey/i, 'blacktea'], [/tea|matcha/i, 'tea'], [/mint/i, 'mint'], [/sage/i, 'sage'], [/eucalyptus/i, 'eucalyptus'],
    [/basil|herb|green/i, 'basil'], [/pine|fir|spruce|cypress|christmas|evergreen|balsam/i, 'pine'], [/cucumber/i, 'cucumber'],
    [/taro/i, 'taro'], [/milk|cream/i, 'milk'], [/brown sugar|cane sugar|caramel|maple/i, 'brownsugar'], [/sugar/i, 'sugar'], [/honey/i, 'honey'],
    [/vanilla|tonka/i, 'vanilla'], [/cinnamon|chai|nutmeg|spice|ginger/i, 'cinnamon'], [/clove/i, 'clove'],
    [/coffee|espresso|cocoa|chocolate|mocha/i, 'coffee'], [/coconut/i, 'coconut'],
    [/cedar|wood|sandal|oak|hickory|birch|suede|oud/i, 'wood'], [/musk/i, 'musk'], [/amber|resin|beeswax|frankincense/i, 'amber'],
    [/tobacco|leather|vetiver|patchouli/i, 'tobacco'], [/smok|incense|fire/i, 'smoke'], [/moss|earth/i, 'moss'],
    [/sea|ocean|salt|marine|island|beach/i, 'shell'],
];

export function noteKind(note) {
    const hit = MATCH.find(([re]) => re.test(note));
    return hit ? hit[1] : '';
}

export function notesFromText(text) {
    const m = String(text || '').match(/scent notes?\s*:\s*([^\n]+?)(?:\s*(?:burn time|mood)\s*:|$)/i);
    if (!m) return [];
    return m[1].split(/[,/·]|\band\b/).map((x) => x.trim().replace(/\.$/, '')).filter(Boolean).slice(0, 8);
}

// SVG markup for each recognised note (in order, no repeats). Wax drops when nothing is recognised.
export function artFor(notes) {
    const kinds = [];
    notes.forEach((n) => {
        const k = noteKind(n);
        if (k && !kinds.includes(k)) kinds.push(k);
    });
    if (!kinds.length) kinds.push('wax');
    return kinds.slice(0, 6).map((k) => `<svg viewBox="0 0 100 100" aria-hidden="true">${ART[k]()}</svg>`);
}

// The story part of a description: the first sentence or two before "Mood:" / "Scent Notes:",
// skipping lines like "All candles are hand-poured…" and "What is our candle constructed with?".
export function storyText(text) {
    const before = String(text || '').split(/\b(?:mood|scent notes?|burn time)\s*:/i)[0];
    const sentences = (before.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+/g) || [])
        .map((s) => s.trim())
        .filter((s) => s.length > 25 && !/^all (our )?candles|constructed with|^-|\?$/i.test(s));
    let out = '';
    for (const s of sentences) {
        if ((out + s).length > 170 && out) break;
        out += `${s} `;
    }
    out = out.trim();
    if (out.length > 190) out = `${out.slice(0, 180).replace(/\s+\S*$/, '')}…`;
    return out || 'Hand-poured in small batches with coconut soy wax and toxic-free fragrance.';
}

