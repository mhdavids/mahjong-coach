// Headless full-game simulation: all four seats played by the AI, mirroring the
// controller's turn/claim loop. Proves games terminate and stay consistent.
import { Game } from './src/engine/game.js';
import { chooseCharlestonPass, chooseDiscard, decideClaim, maybeJokerSwap } from './src/engine/ai.js';

const remove = (a, id) => { const i = a.indexOf(id); if (i >= 0) a.splice(i, 1); };

function charleston(game, dirs) {
  for (const direction of dirs) {
    const picks = [];
    for (let i = 0; i < 4; i++) picks[i] = chooseCharlestonPass(game.players[i].hand, 3);
    const target = (i) => direction === 'right' ? (i + 1) % 4 : direction === 'left' ? (i + 3) % 4 : (i + 2) % 4;
    for (let i = 0; i < 4; i++) for (const t of picks[i]) remove(game.players[i].hand, t);
    for (let i = 0; i < 4; i++) game.players[target(i)].hand.push(...picks[i]);
  }
}

function resolveDiscard(game) {
  let guard = 0;
  while (true) {
    if (++guard > 40) throw new Error('runaway claim chain');
    const opps = game.claimOpportunities();
    const w = opps.find((o) => o.canWin);
    if (w) { game.claimWin(w.playerIdx); return 'over'; }
    let exposed = null;
    for (const o of opps) {
      if (!o.canExpose) continue;
      const dec = decideClaim(game, o);
      if (dec && dec.type === 'win') { game.claimWin(o.playerIdx); return 'over'; }
      if (dec && dec.type === 'expose') { game.exposeFromDiscard(o.playerIdx, dec.size, dec.jokerCount); exposed = o.playerIdx; break; }
    }
    if (exposed == null) return 'pass';
    const tile = chooseDiscard(game, exposed);
    game.discard(tile);
  }
}

function playGame(secondCharleston) {
  const game = new Game([0, 1, 2, 3].map((i) => ({ name: 'P' + i, isAI: true })), 0);
  game.deal();
  charleston(game, ['right', 'across', 'left']);
  if (secondCharleston) charleston(game, ['left', 'across', 'right']);
  game.phase = 'play';
  let steps = 0;
  while (game.phase === 'play') {
    if (++steps > 4000) throw new Error('runaway turn loop');
    if (game.wallCount() === 0) { game.declareDraw(); break; }
    const idx = game.turn;
    const sw = maybeJokerSwap(game, idx);
    if (sw) game.doJokerSwap(idx, sw.ownerIdx, sw.expIdx);
    const drew = game.draw();
    if (drew == null) { game.declareDraw(); break; }
    const win = game.checkSelfWin(idx);
    if (win) { game.finishWin(idx, win, { selfDraw: true }); break; }
    const tile = chooseDiscard(game, idx);
    game.discard(tile);
    const outcome = resolveDiscard(game);
    if (game.phase !== 'play') break;
    if (outcome === 'pass') game.advanceTurn();
  }
  return game;
}

const N = 400;
let wins = 0, walls = 0, selfDraws = 0, errors = 0, zeroSumFail = 0;
const handTally = {};
for (let n = 0; n < N; n++) {
  try {
    const g = playGame(n % 2 === 0);
    const r = g.result;
    if (r.draw) walls++;
    else {
      wins++;
      if (r.selfDraw) selfDraws++;
      handTally[r.hand.name] = (handTally[r.hand.name] || 0) + 1;
      const sum = r.points.reduce((a, b) => a + b, 0);
      if (sum !== 0) zeroSumFail++;
    }
  } catch (e) {
    errors++;
    if (errors <= 3) console.log('  ✗', e.message);
  }
}
console.log(`\nGames: ${N}`);
console.log(`  Completed wins: ${wins}  (self-draw: ${selfDraws}, off discard: ${wins - selfDraws})`);
console.log(`  Wall games:     ${walls}`);
console.log(`  Errors:         ${errors}`);
console.log(`  Zero-sum fails: ${zeroSumFail}`);
console.log('  Winning hands:', JSON.stringify(handTally));
console.log(errors === 0 && zeroSumFail === 0 ? '\n✅ Simulation healthy' : '\n❌ Problems found');
