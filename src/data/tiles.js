// ---------------------------------------------------------------------------
// Tile definitions for American (NMJL-style) Mahjong.
// A full set is 152 tiles:
//   108 suited  (Bam / Crak / Dot, numbers 1-9, x4 each)
//    16 winds   (North East West South, x4)
//    12 dragons (Red / Green / White-"Soap", x4)
//     8 flowers (all interchangeable in the American game)
//     8 jokers
// Tile ids:  b1..b9  c1..c9  d1..d9   wn we ww ws   dr dg dw   fl   jk
// ---------------------------------------------------------------------------

export const SUITS = ['bam', 'crak', 'dot'];
export const SUIT_LABEL = { bam: 'Bam', crak: 'Crak', dot: 'Dot' };
export const SUIT_PREFIX = { bam: 'b', crak: 'c', dot: 'd' };

// The dragon that "belongs" to each suit (a real NMJL convention).
//   Green dragon  ↔ Bams      Red dragon ↔ Craks      White/Soap ↔ Dots
export const DRAGON_OF_SUIT = { bam: 'dg', crak: 'dr', dot: 'dw' };

export const WIND_ID = { N: 'wn', E: 'we', W: 'ww', S: 'ws' };

export function buildDeck() {
  const deck = [];
  for (const s of SUITS) {
    const p = SUIT_PREFIX[s];
    for (let n = 1; n <= 9; n++) for (let k = 0; k < 4; k++) deck.push(`${p}${n}`);
  }
  for (const w of ['wn', 'we', 'ww', 'ws']) for (let k = 0; k < 4; k++) deck.push(w);
  for (const d of ['dr', 'dg', 'dw']) for (let k = 0; k < 4; k++) deck.push(d);
  for (let k = 0; k < 8; k++) deck.push('fl');
  for (let k = 0; k < 8; k++) deck.push('jk');
  return deck; // 152
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const isJoker = (id) => id === 'jk';
export const isFlower = (id) => id === 'fl';

// Rich metadata used for rendering and for the rules engine.
export function tileInfo(id) {
  if (id === 'jk') return { id, kind: 'joker', label: 'Joker', short: 'JOKER', glyph: '★', color: 'joker' };
  if (id === 'fl') return { id, kind: 'flower', label: 'Flower', short: 'Flower', glyph: '❀', color: 'flower' };
  if (id[0] === 'w') {
    const name = { wn: 'North', we: 'East', ww: 'West', ws: 'South' }[id];
    const letter = { wn: 'N', we: 'E', ww: 'W', ws: 'S' }[id];
    return { id, kind: 'wind', label: `${name} Wind`, short: name, glyph: letter, color: 'wind' };
  }
  if (id[0] === 'd' && isNaN(Number(id[1]))) {
    const m = {
      dr: { l: 'Red Dragon', s: 'Red', g: '中', c: 'dragon-red' },
      dg: { l: 'Green Dragon', s: 'Green', g: '發', c: 'dragon-green' },
      dw: { l: 'Soap (White Dragon)', s: 'Soap', g: '▢', c: 'dragon-white' },
    }[id];
    return { id, kind: 'dragon', label: m.l, short: m.s, glyph: m.g, color: m.c };
  }
  const suit = { b: 'bam', c: 'crak', d: 'dot' }[id[0]];
  const n = Number(id.slice(1));
  return { id, kind: 'suit', suit, n, label: `${n} ${SUIT_LABEL[suit]}`, short: `${n}${SUIT_LABEL[suit][0]}`, glyph: String(n), color: suit };
}

// Small bamboo / dot decorations are drawn from the glyph; suited tiles also
// get a suit word so a true beginner is never guessing what they hold.
export function suitWord(id) {
  const info = tileInfo(id);
  return info.kind === 'suit' ? SUIT_LABEL[info.suit] : '';
}
