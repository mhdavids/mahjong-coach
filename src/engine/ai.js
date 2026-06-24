// ---------------------------------------------------------------------------
// Computer opponents. Deliberately a "good club player," not a shark — it
// pursues its closest hand, keeps jokers, passes its junk in the Charleston,
// and calls a discard only when it clearly helps. Strong enough to be a real
// game; gentle enough to learn against.
// ---------------------------------------------------------------------------
import { rankHands, usefulIndices, coverage } from './match.js';

// Score every tile by how useful it is across the player's three closest hands.
export function usefulnessScores(tiles, opts = {}) {
  const ranked = rankHands(tiles, opts).slice(0, 3);
  const scores = new Array(tiles.length).fill(0);
  ranked.forEach(({ hand }, r) => {
    const weight = 3 - r; // closest hand counts most
    usefulIndices(tiles, hand).forEach((i) => (scores[i] += weight));
  });
  tiles.forEach((t, i) => { if (t === 'jk') scores[i] += 100; }); // never toss jokers
  return scores;
}

// Choose `n` tiles (default 3) to pass in the Charleston: the least useful.
export function chooseCharlestonPass(hand, n = 3) {
  const scores = usefulnessScores(hand);
  const order = hand.map((t, i) => i).sort((a, b) => scores[a] - scores[b]);
  const picks = [];
  for (const i of order) {
    if (hand[i] === 'jk') continue; // keep jokers
    picks.push(i);
    if (picks.length === n) break;
  }
  while (picks.length < n) { // forced to give jokers only if nothing else
    const i = order.find((k) => !picks.includes(k));
    if (i === undefined) break;
    picks.push(i);
  }
  return picks.map((i) => hand[i]);
}

// Pick a tile to discard (called after drawing). Returns a tile id from the
// concealed hand.
export function chooseDiscard(game, idx) {
  const p = game.players[idx];
  const tiles = game.allTiles(p);
  const scores = usefulnessScores(tiles, { hasExposures: p.exposures.length > 0 });
  let worst = -1, worstScore = Infinity;
  for (let i = 0; i < p.hand.length; i++) {
    if (p.hand[i] === 'jk') continue;
    if (scores[i] < worstScore) { worstScore = scores[i]; worst = i; }
  }
  if (worst < 0) worst = 0; // hand somehow all jokers
  return p.hand[worst];
}

// Decide what to do with a discard this AI could claim.
// Returns null | {type:'win'} | {type:'expose', size, jokerCount}
export function decideClaim(game, opp) {
  const p = game.players[opp.playerIdx];
  if (opp.canWin) return { type: 'win' };
  if (!opp.canExpose || opp.reals < 2) return null; // want a real Pung, not a joker burn
  const tiles = game.allTiles(p);
  const ranked = rankHands(tiles, { hasExposures: p.exposures.length > 0 });
  const best = ranked[0];
  if (!best || best.hand.concealed || best.away === 0) return null;
  const before = coverage(tiles, best.hand);
  const after = coverage([...tiles, opp.tile], best.hand);
  if (after > before) return { type: 'expose', size: 3, jokerCount: 0 };
  return null;
}

// Optional: redeem an exposed joker if the AI happens to hold the real tile and
// doesn't need that exact tile elsewhere. Keeps games lively.
export function maybeJokerSwap(game, idx) {
  const swaps = game.jokerSwaps(idx);
  if (!swaps.length) return null;
  const p = game.players[idx];
  const tiles = game.allTiles(p);
  const scores = usefulnessScores(tiles, { hasExposures: p.exposures.length > 0 });
  // only grab a joker if the real tile we'd give up is low-value to us
  for (const s of swaps) {
    const i = p.hand.indexOf(s.naturalId);
    if (i >= 0 && scores[i] <= 1) return s;
  }
  return null;
}
