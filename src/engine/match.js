// ---------------------------------------------------------------------------
// The rules engine: given 14 tiles, does this hand match a card hand?
// Also computes "coverage" (how close a set of tiles is to a hand), which the
// AI and the on-screen coach both use.
// ---------------------------------------------------------------------------
import { SUITS, SUIT_PREFIX, DRAGON_OF_SUIT } from '../data/tiles.js';
import { CARD } from '../data/card.js';

// distinct-suit assignments for the slots a hand uses
function suitAssignments(slots) {
  if (slots.length === 0) return [{}];
  const out = [];
  const perm = (chosen, remaining) => {
    if (chosen.length === slots.length) {
      const a = {};
      slots.forEach((s, i) => (a[s] = chosen[i]));
      out.push(a);
      return;
    }
    for (let i = 0; i < remaining.length; i++) {
      perm([...chosen, remaining[i]], remaining.filter((_, j) => j !== i));
    }
  };
  perm([], SUITS);
  return out;
}

// resolve a group spec to a concrete tile id under a suit assignment
function resolveId(spec, assign) {
  switch (spec.type) {
    case 'num': return SUIT_PREFIX[assign[spec.slot]] + spec.n;
    case 'wind': return spec.id;
    case 'dragon': return spec.id;
    case 'dragonOf': return DRAGON_OF_SUIT[assign[spec.slot]];
    case 'flower': return 'fl';
    default: return '?';
  }
}

function tally(tiles) {
  const m = new Map();
  for (const t of tiles) m.set(t, (m.get(t) || 0) + 1);
  return m;
}

// Concrete groups for one assignment: {id, c, joker} where joker means
// "jokers may substitute" (group size >= 3).
function concreteGroups(hand, assign) {
  return hand.groups.map((grp) => ({ id: resolveId(grp.t, assign), c: grp.c, joker: grp.c >= 3 }));
}

// Does an exact 14-tile set complete `hand`? Returns the winning assignment or null.
export function matchHand(tiles, hand) {
  if (tiles.length !== 14) return null;
  for (const assign of suitAssignments(hand.slots)) {
    const groups = concreteGroups(hand, assign);
    const counts = tally(tiles);
    let jokers = counts.get('jk') || 0;
    counts.delete('jk');
    let ok = true;

    // Singles & pairs first — they demand real tiles (no jokers).
    for (const grp of groups) {
      if (grp.joker) continue;
      const have = counts.get(grp.id) || 0;
      if (have < grp.c) { ok = false; break; }
      counts.set(grp.id, have - grp.c);
    }
    if (!ok) continue;

    // Pungs/Kongs/Quints: use real tiles where possible, fill the rest with jokers.
    for (const grp of groups) {
      if (!grp.joker) continue;
      const have = counts.get(grp.id) || 0;
      const useReal = Math.min(have, grp.c);
      counts.set(grp.id, have - useReal);
      const short = grp.c - useReal;
      jokers -= short;
      if (jokers < 0) { ok = false; break; }
    }
    if (!ok) continue;

    // A complete hand uses ALL 14 tiles: no jokers left over, no real tiles left over.
    if (jokers !== 0) continue;
    let leftover = false;
    for (const v of counts.values()) if (v > 0) { leftover = true; break; }
    if (leftover) continue;

    return { hand, assign };
  }
  return null;
}

// Best (highest value) winning hand for a 14-tile set. `hasExposures` rules
// out Concealed hands.
export function bestWin(tiles, { hasExposures = false } = {}) {
  let best = null;
  for (const hand of CARD) {
    if (hand.concealed && hasExposures) continue;
    const m = matchHand(tiles, hand);
    if (m && (!best || hand.value > best.hand.value)) best = m;
  }
  return best;
}

// How many of these tiles can usefully go toward `hand` (max over suit
// assignments). 14 = complete. Used for AI targeting and coach hints.
export function coverage(tiles, hand) {
  let best = { filled: -1, assign: null, jokersUsed: 0 };
  for (const assign of suitAssignments(hand.slots)) {
    const groups = concreteGroups(hand, assign);
    const counts = tally(tiles);
    let jokers = counts.get('jk') || 0;
    counts.delete('jk');
    let filled = 0;

    for (const grp of groups) {
      if (grp.joker) continue; // pairs/singles need reals
      const have = counts.get(grp.id) || 0;
      const use = Math.min(grp.c, have);
      counts.set(grp.id, have - use);
      filled += use;
    }
    let needJoker = 0;
    for (const grp of groups) {
      if (!grp.joker) continue;
      const have = counts.get(grp.id) || 0;
      const use = Math.min(grp.c, have);
      counts.set(grp.id, have - use);
      filled += use;
      needJoker += grp.c - use;
    }
    const useJ = Math.min(jokers, needJoker);
    filled += useJ;
    if (filled > best.filled) best = { filled, assign, jokersUsed: useJ };
  }
  return best.filled; // 0..14
}

// Rank every hand by closeness to `tiles`. Returns sorted [{hand, cover, away}].
export function rankHands(tiles, { hasExposures = false } = {}) {
  const ranked = CARD
    .filter((h) => !(h.concealed && hasExposures))
    .map((h) => {
      const cover = coverage(tiles, h);
      return { hand: h, cover, away: 14 - cover };
    });
  ranked.sort((a, b) => a.away - b.away || b.hand.value - a.hand.value);
  return ranked;
}

// A full plan for pursuing `hand` from `tiles`: the best suit assignment, how
// many tiles are placed (`filled`), which tile indices are "wanted" (keep
// these), and what real tiles are still missing (`need`). Powers the AI, the
// coach, and the card progress display.
export function handPlan(tiles, hand) {
  let best = null;
  for (const assign of suitAssignments(hand.slots)) {
    const groups = concreteGroups(hand, assign);
    const counts = tally(tiles);
    let jokers = counts.get('jk') || 0;
    counts.delete('jk');
    let filled = 0, jokersUsed = 0;
    const want = new Map();   // real id -> count of reals placed
    const need = new Map();   // real id -> count still missing

    for (const grp of groups) {
      if (grp.joker) continue; // singles/pairs: reals only
      const have = counts.get(grp.id) || 0;
      const use = Math.min(grp.c, have);
      counts.set(grp.id, have - use);
      want.set(grp.id, (want.get(grp.id) || 0) + use);
      filled += use;
      if (use < grp.c) need.set(grp.id, (need.get(grp.id) || 0) + (grp.c - use));
    }
    for (const grp of groups) {
      if (!grp.joker) continue; // pungs/kongs/quints: reals then jokers
      const have = counts.get(grp.id) || 0;
      const use = Math.min(grp.c, have);
      counts.set(grp.id, have - use);
      want.set(grp.id, (want.get(grp.id) || 0) + use);
      filled += use;
      let short = grp.c - use;
      const uj = Math.min(jokers, short);
      jokers -= uj; jokersUsed += uj; filled += uj; short -= uj;
      if (short > 0) need.set(grp.id, (need.get(grp.id) || 0) + short);
    }
    if (!best || filled > best.filled) best = { assign, filled, want, need, jokersUsed };
  }

  const remaining = new Map(best.want);
  const usedIndices = new Set();
  tiles.forEach((t, i) => {
    if (t === 'jk') { usedIndices.add(i); return; }
    const left = remaining.get(t) || 0;
    if (left > 0) { usedIndices.add(i); remaining.set(t, left - 1); }
  });

  return { hand, assign: best.assign, filled: best.filled, away: 14 - best.filled, usedIndices, need: best.need, jokersUsed: best.jokersUsed };
}

// Which of `tiles` are wanted by `hand` (indices). The rest can be discarded.
export function usefulIndices(tiles, hand) {
  return handPlan(tiles, hand).usedIndices;
}

// A concrete example of a hand (for display), using Bam/Crak/Dot for slots
// A/B/C. Returns one entry per group: { ids:[...], size }.
export function exampleGroups(hand) {
  const assign = {};
  hand.slots.forEach((s, i) => (assign[s] = ['bam', 'crak', 'dot'][i]));
  return hand.groups.map((grp) => {
    const id = resolveId(grp.t, assign);
    return { ids: new Array(grp.c).fill(id), size: grp.c };
  });
}
