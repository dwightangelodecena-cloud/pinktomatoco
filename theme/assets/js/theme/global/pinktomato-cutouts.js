// Product ids that have a transparent cut-out photo in assets/img/cutouts/<id>.webp, used by the
// homepage hero. Made from each product's main photo with a background-removal tool; products not
// listed (new ones, or Brown Sugar whose photo didn't cut out cleanly) show their photo in an arch.
// The admin's hero editor (Content → Hero & Banners) can replace these with new uploads.
export default [112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 125, 126, 127, 128, 129, 130, 132, 133];

// Scent notes printed on each candle's label, used for the floating ingredients until notes are
// entered in the admin's hero editor (or the description has a "Scent Notes:" line).
export const LABEL_NOTES = {
    112: ['Taro', 'Milk', 'Brown Sugar'],
    113: ['Grapefruit', 'Lemon', 'Orange'],
    114: ['Yuzu', 'Cane Sugar', 'Pomelo'],
    115: ['Bergamot', 'Earl Grey Tea', 'Cucumber'],
    116: ['Cypress', 'Cedar', 'Pine'],
    117: ['Hickory', 'Suede', 'Amber'],
    118: ['Orange Blossom', 'Musk', 'Amber'],
    119: ['Vanilla', 'Cinnamon', 'Brown Sugar'],
    120: ['Sampaguita', 'Honeysuckle', 'Dewy Greens'],
    121: ['Sea Moss', 'Orchid', 'Violet'],
    122: ['Eucalyptus', 'Cotton', 'Gardenia'],
    123: ['Bergamot', 'Orange', 'Blue Lily'],
    124: ['Brown Sugar', 'Vanilla', 'Cinnamon'],
    125: ['Tobacco', 'Vanilla', 'Amber'],
    126: ['Smokey Vetiver', 'Amber', 'Tinder'],
    127: ['Oak Moss', 'Smoky Incense', 'Cedar Leaves'],
    128: ['Pink Peony', 'Honey', 'White Musk'],
    129: ['Apple', 'Sage'],
    130: ['Sweet Cedar Wood', 'White Musk', 'Bergamot'],
    132: ['Rose'],
    133: ['Taro Root', 'Black Tea', 'Heavy Milk'],
};
