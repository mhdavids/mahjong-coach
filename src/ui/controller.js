import { Game, sortHand, SEAT_NAME } from '../engine/game.js';
import { tileInfo } from '../data/tiles.js';
import { chooseCharlestonPass, chooseDiscard, decideClaim, maybeJokerSwap } from '../engine/ai.js';
import { coachAdvice, callAdvice } from './coach.js';
import { el, mount, clear, wait } from './dom.js';
import { tileEl, tileRow } from './tile.js';
import { handoff, confirmBox, chooseBox, toast } from './modal.js';
import { openRulesOverlay, openCardOverlay } from '../tutorial/tutorial.js';

const removeOne = (arr, id) => { const i = arr.indexOf(id); if (i >= 0) arr.splice(i, 1); return i >= 0; };

export class GameController {
  constructor(appEl, config, onExit) {
    this.app = appEl;
    this.cfg = config; // {seats:[{name,isAI}], coachOn, callMode:'ask'|'auto', speed}
    this.onExit = onExit;
    this.game = new Game(config.seats, 0);
    this.speed = config.speed ?? 850;
    this.viewer = null;          // seat index whose hand is revealed
    this.status = '';
    this.drawnTile = null;       // most recent self-draw, to highlight
    this.coachData = null;
    this.mode = 'idle';          // 'idle' | 'discard' | 'pickN'
    this.selected = null;        // discard selection (hand index)
    this.pickN = null;           // {n, chosen:Set, prompt, resolve}
    this.discardResolve = null;
    this.totals = [0, 0, 0, 0];
    this.round = 1;
    try { window.__ctrl = this; } catch { /* non-browser */ }
  }

  // ----- lifecycle ---------------------------------------------------------
  async run() {
    this.game.deal();
    this.renderGame();
    await this.runCharleston();
    this.game.phase = 'play';
    this.status = `Round ${this.round}. ${this.game.current().name} (East) starts.`;
    await this.turnLoop();
  }

  async restart() {
    this.round += 1;
    this.game = new Game(this.cfg.seats, (this.round - 1) % 4); // rotate dealer
    this.viewer = null; this.drawnTile = null; this.status = ''; this.mode = 'idle';
    await this.run();
  }

  // ----- Charleston --------------------------------------------------------
  async runCharleston() {
    this.status = 'The Charleston — passing tiles to sharpen everyone\'s hand.';
    this.renderGame();
    await this.charlestonRound(['right', 'across', 'left'], 'First Charleston');
    const again = await confirmBox({
      icon: '🔁',
      title: 'Second Charleston?',
      body: 'Optional: pass three more times (Left, Across, Right) to improve hands. You two decide together — skipping is totally fine.',
      yes: 'Pass again', no: 'Start playing',
    });
    if (again) await this.charlestonRound(['left', 'across', 'right'], 'Second Charleston');
    toast('Charleston done — game on!');
  }

  async charlestonRound(dirs, label) {
    const DIR = { right: 'RIGHT', across: 'ACROSS', left: 'LEFT' };
    for (let d = 0; d < dirs.length; d++) {
      const direction = dirs[d];
      const picks = [];
      for (let i = 0; i < 4; i++) {
        const p = this.game.players[i];
        if (p.isAI) { picks[i] = chooseCharlestonPass(p.hand, 3); continue; }
        this.viewer = i; this.status = `${label} — pass ${d + 1} of 3`; this.renderGame();
        await handoff(p.name, `${label}: choose 3 tiles to pass to your ${DIR[direction]}.`);
        picks[i] = await this.humanPickN(i, 3, `Pick 3 tiles to pass ${DIR[direction]} →`);
      }
      const targetOf = (i) => direction === 'right' ? (i + 1) % 4 : direction === 'left' ? (i + 3) % 4 : (i + 2) % 4;
      for (let i = 0; i < 4; i++) for (const t of picks[i]) removeOne(this.game.players[i].hand, t);
      for (let i = 0; i < 4; i++) this.game.players[targetOf(i)].hand.push(...picks[i]);
      this.game.players.forEach((p) => sortHand(p.hand));
      this.viewer = null; this.renderGame();
    }
  }

  humanPickN(i, n, prompt) {
    return new Promise((res) => {
      this.mode = 'pickN';
      this.pickN = { n, chosen: new Set(), prompt, resolve: res };
      this.renderGame();
    });
  }

  // ----- main loop ---------------------------------------------------------
  async turnLoop() {
    while (this.game.phase === 'play') {
      if (this.game.wallCount() === 0) return this.endInDraw();
      const idx = this.game.turn;
      await this.takeTurn(idx);
      if (this.game.phase !== 'play') return;
      const outcome = await this.resolveDiscard();
      if (this.game.phase !== 'play') return;
      if (outcome === 'pass') this.game.advanceTurn();
    }
  }

  async takeTurn(idx) {
    return this.game.players[idx].isAI ? this.aiTurn(idx) : this.humanTurn(idx);
  }

  async aiTurn(idx) {
    const p = this.game.players[idx];
    this.viewer = null; this.drawnTile = null;
    this.status = `${p.name} (computer) is thinking…`; this.renderGame();
    await wait(this.speed);

    const sw = maybeJokerSwap(this.game, idx);
    if (sw) {
      this.game.doJokerSwap(idx, sw.ownerIdx, sw.expIdx);
      this.status = `${p.name} grabbed an exposed Joker with a ${tileInfo(sw.naturalId).short}.`;
      this.renderGame(); await wait(this.speed);
    }
    const drew = this.game.draw();
    if (drew == null) return this.endInDraw();
    const win = this.game.checkSelfWin(idx);
    if (win) { this.game.finishWin(idx, win, { selfDraw: true }); return this.showResult(); }
    const tile = chooseDiscard(this.game, idx);
    this.game.discard(tile);
    this.status = `${p.name} discarded the ${tileInfo(tile).short}.`;
    this.renderGame(); await wait(this.speed);
  }

  async humanTurn(idx) {
    const p = this.game.players[idx];
    this.viewer = idx; this.drawnTile = null; this.status = `${p.name}'s turn`;
    this.renderGame();
    await handoff(p.name, 'Your turn — draw a tile, then discard one.');
    const drew = this.game.draw();
    if (drew == null) return this.endInDraw();
    this.drawnTile = drew;
    this.refreshCoach(idx);
    this.renderGame();

    const win = this.game.checkSelfWin(idx);
    if (win) {
      const yes = await confirmBox({
        icon: '🏆', title: 'You can declare Mahjong!',
        body: `Your hand completes “${win.hand.name}” for ${win.hand.value} points. Declare it?`,
        yes: 'MAHJONG! 🏆', no: 'Keep playing',
      });
      if (yes) { this.game.finishWin(idx, win, { selfDraw: true }); return this.showResult(); }
    }
    const tile = await this.humanPickDiscard(idx);
    this.game.discard(tile);
    this.drawnTile = null; this.viewer = null;
    this.status = `${p.name} discarded the ${tileInfo(tile).short}.`;
    this.renderGame(); await wait(300);
  }

  humanPickDiscard(idx) {
    return new Promise((res) => {
      this.mode = 'discard'; this.selected = null; this.discardResolve = res;
      this.renderGame();
    });
  }

  // ----- claiming a discard ------------------------------------------------
  async resolveDiscard() {
    while (true) {
      const opps = this.game.claimOpportunities();
      if (await this.tryWins(opps)) return 'over';
      const exposer = await this.tryExposures(opps);
      if (exposer == null) return 'pass';
      await this.discardAfterExpose(exposer);
      if (this.game.phase !== 'play') return 'over';
    }
  }

  async tryWins(opps) {
    for (const o of opps.filter((x) => x.canWin)) {
      const p = this.game.players[o.playerIdx];
      if (p.isAI) { this.game.claimWin(o.playerIdx); await this.showResult(); return true; }
      this.viewer = null; this.renderGame();
      await handoff(p.name, 'A tile you can win on was discarded!');
      const yes = await confirmBox({
        icon: '🏆', title: 'You can WIN!',
        body: `The discarded ${tileInfo(o.tile).label} completes “${o.win.hand.name}” (${o.win.hand.value} pts). Call Mahjong?`,
        yes: 'MAHJONG! 🏆', no: 'Pass',
      });
      if (yes) { this.game.claimWin(o.playerIdx); await this.showResult(); return true; }
    }
    return false;
  }

  async tryExposures(opps) {
    for (const o of opps.filter((x) => x.canExpose)) {
      const p = this.game.players[o.playerIdx];
      if (p.isAI) {
        const dec = decideClaim(this.game, o);
        if (dec && dec.type === 'expose') {
          this.game.exposeFromDiscard(o.playerIdx, dec.size, dec.jokerCount);
          this.status = `${p.name} called the ${tileInfo(o.tile).short} and exposed a Pung.`;
          this.renderGame(); await wait(this.speed);
          return o.playerIdx;
        }
        continue;
      }
      if (this.cfg.callMode === 'auto') continue;
      const adv = callAdvice(this.game, o);
      if (!adv.recommend) continue; // only interrupt for genuinely useful calls
      this.viewer = null; this.renderGame();
      await handoff(p.name, 'You have the option to call this tile.');
      const opts = o.sizes.map((s) => {
        const jok = Math.max(0, (s - 1) - o.reals);
        const nm = { 3: 'Pung', 4: 'Kong', 5: 'Quint', 6: 'Sextet' }[s];
        return { label: `Call ${nm} (${s})${jok ? ` — uses ${jok} joker${jok > 1 ? 's' : ''}` : ''}`, value: { s, jok }, primary: s === 3 };
      });
      opts.push({ label: 'Pass — draw instead', value: null });
      const pick = await chooseBox({ title: `Call the ${tileInfo(o.tile).label}?`, body: adv.text, options: opts });
      if (pick) { this.game.exposeFromDiscard(o.playerIdx, pick.s, pick.jok); return o.playerIdx; }
    }
    return null;
  }

  async discardAfterExpose(idx) {
    const p = this.game.players[idx];
    if (p.isAI) {
      const tile = chooseDiscard(this.game, idx);
      this.game.discard(tile);
      this.status = `${p.name} discarded the ${tileInfo(tile).short}.`;
      this.renderGame(); await wait(this.speed);
      return;
    }
    this.viewer = idx; this.refreshCoach(idx);
    this.status = 'You called — now discard a tile to finish your turn.';
    this.renderGame();
    const tile = await this.humanPickDiscard(idx);
    this.game.discard(tile);
    this.viewer = null; this.status = `${p.name} discarded the ${tileInfo(tile).short}.`;
    this.renderGame(); await wait(250);
  }

  refreshCoach(idx) { this.coachData = this.cfg.coachOn ? coachAdvice(this.game, idx) : null; }

  // ----- endings -----------------------------------------------------------
  async endInDraw() {
    this.game.declareDraw();
    await this.showResult();
  }

  async showResult() {
    const r = this.game.result;
    if (r.points) for (let i = 0; i < 4; i++) this.totals[i] += r.points[i];
    this.viewer = null; this.mode = 'idle'; this.renderGame();

    let node;
    if (r.draw) {
      node = el('div', { class: 'card result' },
        el('div', { class: 'hbig' }, '🀄'),
        el('h2', {}, 'Wall Game — no winner'),
        el('p', { class: 'muted' }, 'The wall ran out before anyone completed a hand. No points change. It happens to everyone!'),
      );
    } else {
      const w = this.game.players[r.winnerIdx];
      const wt = r.selfDraw ? [] : [r.winningTile];
      const tiles = sortHand([...this.game.allTiles(w), ...wt]);
      node = el('div', { class: 'card result' },
        el('div', { class: 'hbig' }, '🏆'),
        el('h2', {}, w.name === 'You' ? 'You win! 🎉' : `${w.name} wins!`),
        el('div', { class: 'wonhand' }, `“${r.hand.name}” · ${r.hand.value} points · ${r.selfDraw ? 'self-drawn' : 'off a discard'}`),
        tileRow(tiles, { small: true }),
        this.scoreTable(r),
      );
    }
    node.append(el('div', { class: 'row gap mt' },
      el('button', { class: 'btn primary', onClick: async () => { clear(document.getElementById('modal-root')); await this.restart(); } }, 'Next round ▸'),
      el('button', { class: 'btn', onClick: () => this.onExit() }, 'Back to menu'),
    ));
    const ov = el('div', { class: 'overlay' }, node);
    document.getElementById('modal-root').append(ov);
  }

  scoreTable(r) {
    return el('table', { class: 'scores' },
      el('tr', {}, el('th', {}, 'Player'), el('th', {}, 'This hand'), el('th', {}, 'Total')),
      ...this.game.players.map((p, i) => el('tr', { class: i === r.winnerIdx ? 'win' : '' },
        el('td', {}, `${p.name} (${p.seat})`),
        el('td', { class: r.points[i] >= 0 ? 'pos' : 'neg' }, (r.points[i] >= 0 ? '+' : '') + r.points[i]),
        el('td', {}, this.totals[i]),
      )),
    );
  }

  // ----- rendering ---------------------------------------------------------
  positions() {
    const base = this.viewer != null ? this.viewer : this.game.turn;
    return { bottom: base, right: (base + 1) % 4, top: (base + 2) % 4, left: (base + 3) % 4 };
  }

  renderGame() {
    const g = this.game;
    const pos = this.positions();
    const screen = el('div', { class: 'gamescreen' });

    // top bar
    screen.append(el('div', { class: 'topbar' },
      el('div', { class: 'brand' }, '🀄 Mahjong Coach'),
      el('div', { class: 'tbbtns' },
        el('button', { class: 'btn ghost sm', onClick: () => openCardOverlay(this.viewer != null ? g.allTiles(g.players[this.viewer]) : null, this.viewer != null && g.players[this.viewer].exposures.length > 0) }, '🃏 Card'),
        el('button', { class: 'btn ghost sm', onClick: () => openRulesOverlay() }, '📖 Rules'),
        el('button', { class: 'btn ghost sm' + (this.cfg.coachOn ? ' on' : ''), onClick: () => { this.cfg.coachOn = !this.cfg.coachOn; if (this.viewer != null) this.refreshCoach(this.viewer); this.renderGame(); } }, this.cfg.coachOn ? '🎓 Coach: ON' : '🎓 Coach: OFF'),
        el('button', { class: 'btn ghost sm', onClick: () => this.onExit() }, '✕ Menu'),
      ),
    ));

    // table
    const table = el('div', { class: 'table' });
    table.append(this.seatBox(pos.top, 'top'));
    table.append(this.seatBox(pos.left, 'left'));
    table.append(this.seatBox(pos.right, 'right'));
    table.append(this.centerBox());
    table.append(this.seatBox(pos.bottom, 'bottom'));
    screen.append(table);

    // action / coach dock
    screen.append(this.dock());

    mount(this.app, screen);
  }

  seatBox(idx, where) {
    const g = this.game;
    const p = g.players[idx];
    const isViewer = this.viewer === idx && where === 'bottom';
    const isTurn = g.turn === idx;
    const box = el('div', { class: `seat seat-${where}` + (isTurn ? ' turn' : '') });

    const head = el('div', { class: 'seathead' },
      el('span', { class: 'wind' }, p.seat),
      el('span', { class: 'sname' }, p.name + (p.isAI ? ' 🤖' : '')),
      el('span', { class: 'tcount' }, `${p.hand.length}🀫`),
    );
    box.append(head);

    // exposures (always visible to everyone)
    if (p.exposures.length) {
      box.append(el('div', { class: 'exposures' },
        p.exposures.map((e) => el('div', { class: 'meld' }, tileRow(e.tiles, { tiny: true, label: false }))),
      ));
    }

    if (isViewer) {
      box.append(this.viewerHand(idx));
    } else {
      // hidden hand — compact stack + count, so seats stay small
      box.append(el('div', { class: 'backstack' },
        tileEl('b1', { faceDown: true, small: true }),
        el('span', { class: 'bscount' }, '× ' + p.hand.length),
      ));
    }
    return box;
  }

  viewerHand(idx) {
    const g = this.game;
    const p = g.players[idx];
    const keep = (this.cfg.coachOn && this.coachData) ? this.coachData.keep : null;
    const tossTile = (this.cfg.coachOn && this.coachData) ? this.coachData.discard.tile : null;
    let tossMarked = false;
    const row = el('div', { class: 'tilerow hand' }, p.hand.map((id, i) => {
      const opts = { small: true };
      if (this.mode === 'discard') {
        opts.onClick = () => { this.selected = i; this.renderGame(); };
        if (this.selected === i) opts.selected = true;
        if (keep && !keep.has(i) && id !== 'jk') opts.dim = true;
        if (!tossMarked && tossTile && id === tossTile) { opts.badge = 'toss'; tossMarked = true; }
      } else if (this.mode === 'pickN') {
        opts.onClick = () => {
          const s = this.pickN.chosen;
          s.has(i) ? s.delete(i) : (s.size < this.pickN.n && s.add(i));
          this.renderGame();
        };
        if (this.pickN.chosen.has(i)) opts.selected = true;
      }
      if (id === this.drawnTile && i === p.hand.lastIndexOf(this.drawnTile)) opts.glow = true;
      return tileEl(id, opts);
    }));
    return row;
  }

  centerBox() {
    const g = this.game;
    const last = g.lastDiscard;
    const discards = g.discards.slice(-28);
    return el('div', { class: 'center' },
      el('div', { class: 'wallinfo' }, el('span', { class: 'wnum' }, g.wallCount()), el('span', { class: 'wlbl' }, 'tiles left')),
      el('div', { class: 'status' }, this.status),
      el('div', { class: 'discardpile' }, discards.length
        ? tileRow(discards.map((d) => d.tile), { each: (id, i) => ({ tiny: true, glow: last && i === discards.length - 1 }) })
        : el('span', { class: 'muted' }, 'Discards will appear here')),
    );
  }

  dock() {
    if (this.mode === 'discard') {
      const ready = this.selected != null;
      const sel = ready ? tileInfo(this.game.players[this.viewer].hand[this.selected]).label : '—';
      const dock = el('div', { class: 'dock' });
      if (this.cfg.coachOn && this.coachData) dock.append(this.coachPanel());
      dock.append(el('div', { class: 'actionbar' },
        el('div', { class: 'selinfo' }, 'Selected: ', el('b', {}, sel)),
        el('button', {
          class: 'btn primary big' + (ready ? '' : ' disabled'),
          onClick: () => {
            if (this.selected == null) return;
            const id = this.game.players[this.viewer].hand[this.selected];
            this.mode = 'idle'; const res = this.discardResolve; this.discardResolve = null; this.selected = null;
            res(id);
          },
        }, 'Discard ▸'),
      ));
      return dock;
    }
    if (this.mode === 'pickN') {
      const n = this.pickN.n, got = this.pickN.chosen.size;
      return el('div', { class: 'dock' },
        el('div', { class: 'actionbar' },
          el('div', { class: 'selinfo' }, this.pickN.prompt, '  ', el('b', {}, `${got}/${n}`)),
          el('button', {
            class: 'btn primary big' + (got === n ? '' : ' disabled'),
            onClick: () => {
              if (this.pickN.chosen.size !== n) return;
              const hand = this.game.players[this.viewer].hand;
              const ids = [...this.pickN.chosen].map((i) => hand[i]);
              const res = this.pickN.resolve; this.pickN = null; this.mode = 'idle';
              res(ids);
            },
          }, 'Pass these ▸'),
        ),
      );
    }
    return el('div', { class: 'dock' }, el('div', { class: 'actionbar wait' }, this.status));
  }

  coachPanel() {
    const c = this.coachData;
    const panel = el('div', { class: 'coach' }, el('div', { class: 'coachhead' }, '🎓 Coach'));
    if (c.best) {
      panel.append(el('div', { class: 'ctargets' },
        c.targets.map((t, i) => el('div', { class: 'ctarget' + (i === 0 ? ' top' : '') },
          el('span', { class: 'cname' }, t.hand.name),
          el('span', { class: 'caway' }, `${t.away} away`),
        )),
      ));
      panel.append(el('div', { class: 'cneed' }, c.best.needText));
    }
    panel.append(el('div', { class: 'cadvice' }, `Suggested toss: `, el('b', {}, tileInfo(c.discard.tile).label), ` — ${c.discard.reason}`));
    c.notes.forEach((n) => panel.append(el('div', { class: 'cnote' }, '💡 ' + n)));
    return panel;
  }
}
