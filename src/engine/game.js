// ---------------------------------------------------------------------------
// Game state + legal operations for one hand of American Mahjong.
// This module is "pure": it knows the rules but never touches the DOM, timers,
// or AI. A controller drives it (draw → discard → resolve claims → next turn).
// ---------------------------------------------------------------------------
import { buildDeck, shuffle, tileInfo } from '../data/tiles.js';
import { bestWin } from './match.js';

export const SEATS = ['E', 'S', 'W', 'N'];
export const SEAT_NAME = { E: 'East', S: 'South', W: 'West', N: 'North' };

// stable ordering for a hand: suits by number, then winds, dragons, flower, joker
const SORT = { bam: 0, crak: 1, dot: 2 };
export function tileSortKey(id) {
  const info = tileInfo(id);
  if (info.kind === 'suit') return SORT[info.suit] * 100 + info.n;
  if (info.kind === 'wind') return 300 + { wn: 0, we: 1, ww: 2, ws: 3 }[id];
  if (info.kind === 'dragon') return 400 + { dr: 0, dg: 1, dw: 2 }[id];
  if (info.kind === 'flower') return 500;
  return 600; // joker
}
export const sortHand = (hand) => hand.sort((a, b) => tileSortKey(a) - tileSortKey(b));

function count(arr, id) { return arr.reduce((n, t) => n + (t === id ? 1 : 0), 0); }
function removeOne(arr, id) {
  const i = arr.indexOf(id);
  if (i >= 0) arr.splice(i, 1);
  return i >= 0;
}

export class Game {
  // seatPlayers: [{name, isAI}] in order E,S,W,N
  constructor(seatPlayers, dealerIndex = 0) {
    this.players = seatPlayers.map((p, i) => ({
      seat: SEATS[i], name: p.name, isAI: p.isAI,
      hand: [], exposures: [], // exposures: {tiles:[], naturalId, jokers}
    }));
    this.dealerIndex = dealerIndex;
    this.wall = [];
    this.discards = [];
    this.lastDiscard = null; // {tile, by}
    this.turn = dealerIndex;
    this.phase = 'setup';
    this.result = null;
    this.log = [];
  }

  logMsg(m) { this.log.push(m); }

  deal() {
    const deck = shuffle(buildDeck());
    for (const p of this.players) { p.hand = deck.splice(0, 13); sortHand(p.hand); p.exposures = []; }
    this.wall = deck; // 100 tiles
    this.turn = this.dealerIndex;
    this.phase = 'charleston';
    this.lastDiscard = null;
    this.discards = [];
  }

  player(i) { return this.players[i]; }
  current() { return this.players[this.turn]; }
  allTiles(p) { return [...p.hand, ...p.exposures.flatMap((e) => e.tiles)]; }
  wallCount() { return this.wall.length; }

  // ----- turn actions ------------------------------------------------------
  draw() {
    if (this.wall.length === 0) return null;
    const t = this.wall.shift();
    this.current().hand.push(t);
    return t;
  }

  discard(tileId) {
    const p = this.current();
    if (!removeOne(p.hand, tileId)) return false;
    sortHand(p.hand);
    this.lastDiscard = { tile: tileId, by: this.turn };
    this.discards.push({ tile: tileId, by: this.turn });
    return true;
  }

  advanceTurn() { this.turn = (this.turn + 1) % 4; this.lastDiscard = null; }

  // ----- self-drawn win ----------------------------------------------------
  checkSelfWin(playerIdx) {
    const p = this.players[playerIdx];
    const tiles = this.allTiles(p); // 14 after a draw
    if (tiles.length !== 14) return null;
    return bestWin(tiles, { hasExposures: p.exposures.length > 0 });
  }

  // ----- claiming a discard ------------------------------------------------
  // For the current lastDiscard, what can each other player do?
  claimOpportunities() {
    if (!this.lastDiscard) return [];
    const { tile, by } = this.lastDiscard;
    const out = [];
    for (let i = 0; i < 4; i++) {
      if (i === by) continue;
      const p = this.players[i];
      // win?
      const winTiles = [...this.allTiles(p), tile];
      let win = null;
      if (winTiles.length === 14) win = bestWin(winTiles, { hasExposures: p.exposures.length > 0 });
      // exposure? need (real matches in hand) + jokers + the discard >= 3
      const reals = count(p.hand, tile);
      const jokers = count(p.hand, 'jk');
      const maxGroup = reals + jokers + 1;
      const sizes = [];
      for (let s = 3; s <= Math.min(maxGroup, 6); s++) sizes.push(s);
      out.push({ playerIdx: i, tile, canWin: !!win, win, canExpose: sizes.length > 0, sizes, reals, jokers });
    }
    // order by seat distance after the discarder (nearest first)
    out.sort((a, b) => ((a.playerIdx - by + 4) % 4) - ((b.playerIdx - by + 4) % 4));
    return out;
  }

  // Player claims the discard to EXPOSE a group of `size`, using `jokerCount`
  // jokers from hand (the rest are real matches). The claimer then holds the turn.
  exposeFromDiscard(playerIdx, size, jokerCount) {
    const p = this.players[playerIdx];
    const { tile } = this.lastDiscard;
    const reals = size - 1 - jokerCount; // real matches taken from hand
    const group = [tile];
    for (let k = 0; k < reals; k++) removeOne(p.hand, tile) && group.push(tile);
    for (let k = 0; k < jokerCount; k++) removeOne(p.hand, 'jk') && group.push('jk');
    p.exposures.push({ tiles: group, naturalId: tile, jokers: jokerCount });
    sortHand(p.hand);
    this.turn = playerIdx;
    this.lastDiscard = null; // consumed
    return group;
  }

  // Player claims the discard to WIN.
  claimWin(playerIdx) {
    const p = this.players[playerIdx];
    const tiles = [...this.allTiles(p), this.lastDiscard.tile];
    const win = bestWin(tiles, { hasExposures: p.exposures.length > 0 });
    if (!win) return null;
    return this.finishWin(playerIdx, win, { selfDraw: false, by: this.lastDiscard.by, winningTile: this.lastDiscard.tile });
  }

  finishWin(winnerIdx, win, { selfDraw, by, winningTile }) {
    const base = win.hand.value;
    const points = [0, 0, 0, 0];
    if (selfDraw) {
      for (let i = 0; i < 4; i++) if (i !== winnerIdx) { points[i] = -2 * base; points[winnerIdx] += 2 * base; }
    } else {
      for (let i = 0; i < 4; i++) {
        if (i === winnerIdx) continue;
        const pay = i === by ? 2 * base : base;
        points[i] = -pay; points[winnerIdx] += pay;
      }
    }
    this.phase = 'over';
    this.result = { winnerIdx, hand: win.hand, assign: win.assign, selfDraw, by, winningTile, base, points };
    return this.result;
  }

  declareDraw() {
    this.phase = 'over';
    this.result = { draw: true, points: [0, 0, 0, 0] };
    return this.result;
  }

  // ----- joker rob / redemption -------------------------------------------
  // Which exposed jokers can `playerIdx` swap for, using a real tile in hand?
  jokerSwaps(playerIdx) {
    const p = this.players[playerIdx];
    const swaps = [];
    this.players.forEach((owner, oi) => {
      owner.exposures.forEach((e, ei) => {
        if (e.jokers > 0 && count(p.hand, e.naturalId) > 0) {
          swaps.push({ ownerIdx: oi, expIdx: ei, naturalId: e.naturalId });
        }
      });
    });
    return swaps;
  }

  doJokerSwap(playerIdx, ownerIdx, expIdx) {
    const p = this.players[playerIdx];
    const e = this.players[ownerIdx].exposures[expIdx];
    if (e.jokers <= 0 || !removeOne(p.hand, e.naturalId)) return false;
    // replace one joker in the exposure with the real tile
    removeOne(e.tiles, 'jk');
    e.tiles.push(e.naturalId);
    e.jokers -= 1;
    p.hand.push('jk');
    sortHand(p.hand);
    return true;
  }
}
