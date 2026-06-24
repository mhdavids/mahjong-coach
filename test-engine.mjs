// Headless correctness checks for the rules engine.
import { buildDeck, tileInfo } from './src/data/tiles.js';
import { CARD } from './src/data/card.js';
import { matchHand, bestWin, coverage, exampleGroups, handPlan } from './src/engine/match.js';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL:', msg); } };

// 1) deck integrity
const deck = buildDeck();
ok(deck.length === 152, `deck is 152 (got ${deck.length})`);
const counts = {};
for (const t of deck) counts[t] = (counts[t] || 0) + 1;
ok(counts['jk'] === 8, 'eight jokers');
ok(counts['fl'] === 8, 'eight flowers');
ok(counts['b5'] === 4 && counts['we'] === 4 && counts['dr'] === 4, 'four of each suited/wind/dragon');

// helper: flatten exampleGroups to 14 tiles
const flat = (h) => exampleGroups(h).flatMap((g) => g.ids);

// 2) every hand: example is exactly 14, matches itself, coverage 14, and is
//    LEGALLY buildable from a real deck (excess reals -> jokers, <= 8 jokers)
for (const h of CARD) {
  const tiles = flat(h);
  ok(tiles.length === 14, `${h.name}: example has 14 tiles (got ${tiles.length})`);
  ok(!!matchHand(tiles, h), `${h.name}: example matches its own hand`);
  ok(coverage(tiles, h) === 14, `${h.name}: coverage of example is 14`);

  // legal build: cap each real id at 4 (flowers 8); overflow -> jokers
  const need = {};
  for (const t of tiles) need[t] = (need[t] || 0) + 1;
  let jokersNeeded = 0;
  const legal = [];
  for (const [id, c] of Object.entries(need)) {
    const cap = id === 'fl' ? 8 : 4;
    const reals = Math.min(c, cap);
    for (let i = 0; i < reals; i++) legal.push(id);
    jokersNeeded += Math.max(0, c - reals);
  }
  // jokers only valid in groups of 3+, but our overflow only happens on Quints
  // (size 5) so that's always allowed.
  for (let i = 0; i < jokersNeeded; i++) legal.push('jk');
  ok(jokersNeeded <= 8, `${h.name}: legally buildable with <=8 jokers (needs ${jokersNeeded})`);
  ok(legal.length === 14, `${h.name}: legal build is 14 tiles`);
  ok(!!matchHand(legal, h), `${h.name}: legal (joker-substituted) build matches`);
}

// 3) joker rules: substituting a joker into a PUNG matches; into a PAIR/SINGLE does not
const winds = CARD.find((h) => h.id === 'winds'); // NNN EEE WWW SSS DD
{
  const tiles = flat(winds);
  // replace one N (part of a pung) with a joker -> should still match
  const i = tiles.indexOf('wn');
  const t2 = tiles.slice(); t2[i] = 'jk';
  ok(!!matchHand(t2, winds), 'joker substitutes into a Pung (winds)');
  // replace one dragon of the PAIR with a joker -> should NOT match
  const j = tiles.indexOf('dr');
  const t3 = tiles.slice(); t3[j] = 'jk';
  ok(!matchHand(t3, winds), 'joker may NOT substitute into a Pair');
}

// 4) singles hand (2026) rejects any joker
const year = CARD.find((h) => h.id === 'year');
{
  const tiles = flat(year);
  const t2 = tiles.slice(); t2[0] = 'jk';
  ok(!matchHand(t2, year), '2026 (all singles/pairs) rejects a joker');
  ok(!!matchHand(tiles, year), '2026 matches with all real tiles');
}

// 5) a random junk hand should not match anything
{
  const junk = ['b1', 'b2', 'b4', 'c3', 'c6', 'd2', 'd7', 'd8', 'we', 'ww', 'dr', 'dg', 'fl', 'b9'];
  ok(bestWin(junk) === null, 'obvious junk hand is not a win');
}

// 6) concealed hand excluded once exposures exist
const pairs = CARD.find((h) => h.id === 'pairs'); // concealed
{
  const tiles = flat(pairs);
  ok(!!bestWin(tiles, { hasExposures: false }), 'concealed hand wins when fully concealed');
  ok(bestWin(tiles, { hasExposures: true }) === null || bestWin(tiles, { hasExposures: true }).hand.id !== 'pairs',
    'concealed hand NOT counted when player has exposures');
}

// 7) handPlan away counts down toward 0
{
  const tiles = flat(winds);
  ok(handPlan(tiles, winds).away === 0, 'handPlan away = 0 for a complete hand');
  const partial = tiles.slice(0, 10).concat(['b1', 'b3', 'c5', 'd9']);
  ok(handPlan(partial, winds).away > 0, 'handPlan away > 0 for a partial hand');
}

console.log(`\n${fail === 0 ? '✅ ALL PASS' : '❌ FAILURES'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
