// ---------------------------------------------------------------------------
// The Coach — translates the engine's math into plain-English guidance for a
// human player. This is the heart of "teach me how to play."
// ---------------------------------------------------------------------------
import { rankHands, handPlan, coverage } from '../engine/match.js';
import { usefulnessScores } from '../engine/ai.js';
import { tileInfo } from '../data/tiles.js';

export function describeNeed(needMap) {
  const parts = [];
  for (const [id, c] of needMap.entries()) parts.push(`${c}× ${tileInfo(id).label}`);
  if (!parts.length) return 'You have every tile you need — just complete the groups!';
  return 'Still need: ' + parts.join(', ');
}

// Full advice packet for the player whose turn it is.
export function coachAdvice(game, idx) {
  const p = game.players[idx];
  const tiles = game.allTiles(p);
  const opts = { hasExposures: p.exposures.length > 0 };

  const targets = rankHands(tiles, opts).slice(0, 3).map((r) => {
    const plan = handPlan(tiles, r.hand);
    return { hand: r.hand, away: r.away, plan, needText: describeNeed(plan.need) };
  });
  const best = targets[0];
  const keep = best ? best.plan.usedIndices : new Set();

  // Discard suggestion: the concealed tile that helps least (never a joker).
  const scores = usefulnessScores(tiles, opts);
  let worst = -1, ws = Infinity;
  for (let i = 0; i < p.hand.length; i++) {
    if (p.hand[i] === 'jk') continue;
    if (scores[i] < ws) { ws = scores[i]; worst = i; }
  }
  const discardTile = worst >= 0 ? p.hand[worst] : p.hand[0];

  const notes = [];
  if (tiles.includes('jk'))
    notes.push('Keep your Joker — it substitutes for any tile in a Pung, Kong, or Quint (never a Single or Pair).');
  if (best && best.hand.concealed)
    notes.push(`${best.hand.name} is Concealed: build it from your own tiles, no calling.`);
  if (best && best.away <= 3)
    notes.push(`You're only ${best.away} tile${best.away === 1 ? '' : 's'} from ${best.hand.name}! ${best.needText}`);

  return {
    targets,
    best,
    keep,
    discard: {
      tile: discardTile,
      reason: best ? `It isn't part of your closest hand, ${best.hand.name}.` : 'Least useful tile in hand.',
    },
    notes,
  };
}

// Should the human call this discard? Mirrors the AI logic but explains it.
export function callAdvice(game, opp) {
  const p = game.players[opp.playerIdx];
  if (opp.canWin) return { recommend: true, strong: true, text: `This tile completes ${opp.win.hand.name} — call MAHJONG!` };
  if (!opp.canExpose) return { recommend: false, text: 'You can\'t use this tile.' };
  const tiles = game.allTiles(p);
  const ranked = rankHands(tiles, { hasExposures: p.exposures.length > 0 });
  const best = ranked[0];
  if (best.hand.concealed)
    return { recommend: false, text: `Your closest hand (${best.hand.name}) is Concealed — calling would forfeit it. Pass.` };
  const before = coverage(tiles, best.hand);
  const after = coverage([...tiles, opp.tile], best.hand);
  if (opp.reals >= 2 && after > before)
    return { recommend: true, text: `Calling locks a Pung toward ${best.hand.name}. Reasonable — but you'll expose your plan and can't change hands easily.` };
  return { recommend: false, text: `This doesn't clearly help your closest hand (${best.hand.name}). Usually better to pass and draw.` };
}

// Progress of `tiles` against every hand on the card (for the in-play card view).
export function cardProgress(tiles, opts = {}) {
  return rankHands(tiles, opts).map((r) => ({ hand: r.hand, away: r.away }));
}
