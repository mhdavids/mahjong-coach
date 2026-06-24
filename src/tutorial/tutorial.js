// ---------------------------------------------------------------------------
// Teaching: a paged "Learn" walkthrough, a quick rules reference, and a card
// viewer (which doubles as a live "how close am I?" board during play).
// ---------------------------------------------------------------------------
import { el, clear, mount } from '../ui/dom.js';
import { tileRow, tileEl } from '../ui/tile.js';
import { activeCard } from '../data/cards.js';
import { exampleGroups, handPlan } from '../engine/match.js';
import { tileInfo } from '../data/tiles.js';

// group-separated example tiles for a hand
function handExample(hand, opts = {}) {
  return el('div', { class: 'handex' },
    exampleGroups(hand).map((g) => el('div', { class: 'grp' }, tileRow(g.ids, { tiny: true, label: false }))),
  );
}

function diffBadge(d) { return el('span', { class: 'diff d-' + d.toLowerCase() }, d); }

// ----- shared overlay shell ------------------------------------------------
function overlay(title, contentNode, { wide = false } = {}) {
  const root = document.getElementById('modal-root');
  const ov = el('div', { class: 'overlay' },
    el('div', { class: 'card scroll' + (wide ? ' wide' : '') },
      el('div', { class: 'ovhead' }, el('h2', {}, title), el('button', { class: 'btn ghost sm', onClick: () => ov.remove() }, '✕ Close')),
      contentNode,
    ),
  );
  root.append(ov);
  return ov;
}

// ===========================================================================
// CARD VIEWER  (also used live during play; pass current tiles for progress)
// ===========================================================================
export function cardContent(tiles = null, hasExposures = false) {
  const card = activeCard();
  const hands = card.hands;
  const wrap = el('div', { class: 'cardview' });
  wrap.append(el('p', { class: 'note' }, card.builtin
    ? '⚠️ This is a PRACTICE card — original hands in the NMJL style, not the official League card (which is copyrighted and changes every April). Learn the skills here; read the real hands off the card you buy for game night.'
    : `📋 Your card: “${card.name}”. Entered for private practice and stored only in this browser. Manage it under “My Cards.”`));

  const cats = [...new Set(hands.map((h) => h.cat || 'Hands'))];
  if (!hands.length) wrap.append(el('p', { class: 'muted' }, 'This card has no hands yet — add some in the Card Editor.'));
  for (const cat of cats) {
    wrap.append(el('h3', { class: 'cat' }, cat));
    for (const h of hands.filter((x) => (x.cat || 'Hands') === cat)) {
      const plan = tiles ? handPlan(tiles, h) : null;
      wrap.append(el('div', { class: 'handcard' },
        el('div', { class: 'hctop' },
          el('span', { class: 'hcname' }, h.name || '(unnamed)'),
          h.difficulty ? diffBadge(h.difficulty) : null,
          el('span', { class: 'hcval' }, `${h.value} pts`),
          h.concealed ? el('span', { class: 'tag c' }, 'Concealed') : el('span', { class: 'tag x' }, 'Exposable'),
          plan ? el('span', { class: 'tag away' + (plan.away <= 3 ? ' close' : '') }, `${plan.away} away`) : null,
        ),
        h.pattern ? el('div', { class: 'hcpat' }, h.pattern) : null,
        handExample(h),
        h.tip ? el('div', { class: 'hctip' }, h.tip) : null,
      ));
    }
  }
  return wrap;
}

export function openCardOverlay(tiles = null, hasExposures = false) {
  overlay(`🃏 ${activeCard().name}` + (tiles ? ' — your progress' : ''), cardContent(tiles, hasExposures), { wide: true });
}

// ===========================================================================
// QUICK RULES REFERENCE
// ===========================================================================
export function rulesContent() {
  const wrap = el('div', { class: 'rules' });
  const sec = (title, html) => { wrap.append(el('h3', {}, title)); wrap.append(el('div', { class: 'muted', html })); };
  sec('The goal', 'Four players race to be first to build a 14-tile <b>hand</b> that matches one of the patterns on the card. First to complete a hand and call <b>“Mahjong!”</b> wins the round.');
  sec('The tiles (152)', '3 suits — <b>Bam</b>, <b>Crak</b>, <b>Dot</b> (1–9, four of each) · 4 <b>Winds</b> (N/E/W/S) · 3 <b>Dragons</b> (Red, Green, Soap/White) · 8 <b>Flowers</b> (all the same) · 8 <b>Jokers</b>.');
  sec('Groups', '<b>Single</b> = 1 · <b>Pair</b> = 2 · <b>Pung</b> = 3 of a kind · <b>Kong</b> = 4 · <b>Quint</b> = 5. Every card hand is built from these, always totaling 14 tiles.');
  sec('Jokers', 'A Joker can stand in for any tile inside a <b>Pung, Kong, or Quint</b> (groups of 3+). It can <b>never</b> be a Single or part of a Pair. If a Joker sits in someone’s exposed group, on your turn you may swap the real tile from your hand for it (“redeem the joker”).');
  sec('Soap = 0', 'The White Dragon is nicknamed <b>Soap</b> and doubles as the digit <b>0</b> — that’s how year hands like 2026 are spelled.');
  sec('The Charleston', 'Before play, everyone passes tiles to sharpen their hands.<br>• <b>First Charleston (required):</b> pass 3 Right, 3 Across, 3 Left.<br>• <b>Second Charleston (optional):</b> 3 Left, 3 Across, 3 Right — only if everyone agrees.<br>You pass tiles you don’t want and receive others’ castoffs.');
  sec('A turn', 'On your turn you <b>draw</b> a tile, then <b>discard</b> one — your hand stays at 13 between turns. American Mahjong has <b>no “runs” (chows)</b> — only identical-tile groups.');
  sec('Calling a discard', 'When another player discards, anyone may <b>call</b> it (even out of turn) to either:<br>• <b>Expose a group</b> — show a Pung/Kong/Quint using that tile + matching tiles (jokers allowed), then discard; or<br>• <b>Win</b> — if it completes your hand, call Mahjong. A win beats an exposure claim.<br>Singles and Pairs can never be called for — only completed by your own draw (or the final winning tile).');
  sec('Concealed vs Exposable', 'Hands marked <b>X</b> let you call and expose tiles. Hands marked <b>C</b> are <b>Concealed</b> — you must build them entirely from your own draws, no exposing.');
  sec('Scoring', 'Each hand is worth the points printed on the card.<br>• <b>Won off a discard:</b> the discarder pays double; the other two pay the face value.<br>• <b>Self-drawn:</b> all three opponents pay double.<br>If the wall runs out with no winner, it’s a <b>Wall Game</b> — no one pays.');
  sec('Game-night reality check', 'These practice hands are for learning. At your real game night you’ll use the official NMJL card — same rules, different list of hands. Bring your card, and you’ll be ready.');
  return wrap;
}

export function openRulesOverlay() { overlay('📖 Rules Reference', rulesContent(), { wide: true }); }

// ===========================================================================
// LEARN — paged walkthrough
// ===========================================================================
const LESSONS = [
  {
    title: 'Welcome — what is Mahjong?',
    tiles: ['b1', 'c5', 'd9', 'we', 'dr', 'dg', 'dw', 'fl', 'jk'],
    html: `Mahjong is a game for <b>four players</b> using 152 tiles. Think of it like rummy: you’re collecting tiles to build a winning <b>hand</b> — a specific 14-tile pattern from a list called <b>the card</b>.<br><br>You and your wife will play together against two computer players. Take your time — this trainer explains every step, and the in-game <b>Coach</b> will whisper suggestions while you play.`,
  },
  {
    title: 'The three suits',
    tiles: ['b1', 'b5', 'b9', 'c1', 'c5', 'c9', 'd1', 'd5', 'd9'],
    html: `There are three suits, each numbered 1–9, with four copies of every tile:<br>• <b>Bam</b> (bamboo, green)<br>• <b>Crak</b> (characters, red)<br>• <b>Dot</b> (circles, blue)<br><br>Every tile here is labeled with both its number and its suit, so you never have to memorize the artwork.`,
  },
  {
    title: 'Winds, Dragons, Flowers',
    tiles: ['wn', 'we', 'ww', 'ws', 'dr', 'dg', 'dw', 'fl'],
    html: `Beyond the suits there are honor tiles:<br>• <b>Winds</b> — North, East, West, South.<br>• <b>Dragons</b> — Red, Green, and White (nicknamed <b>“Soap”</b>). Soap also stands for the number <b>0</b>.<br>• <b>Flowers</b> — eight of them, and in the American game they’re all interchangeable.`,
  },
  {
    title: 'The Joker — your best friend',
    tiles: ['jk', 'jk', 'b5', 'b5', 'b5'],
    html: `There are 8 <b>Jokers</b>. A Joker can replace any tile inside a group of <b>three or more</b> (Pung, Kong, or Quint). Above, two real 5-Bams plus a Joker make a Pung of 5-Bam.<br><br><b>The one rule to remember:</b> a Joker can <i>never</i> be a Single or part of a Pair. Guard your jokers — they’re gold.`,
  },
  {
    title: 'Reading the card',
    tiles: ['b2', 'b2', 'b2', 'b2', 'c2', 'c2', 'c2', 'd2', 'd2'],
    html: `A card hand is split into groups that total 14 tiles. Letters <b>A, B, C</b> mean “any suit, but each a <i>different</i> one.” For example a hand might read <b>2222 222 222 FFFF</b> — a Kong and two Pungs of the number 2 across three suits, plus a Kong of Flowers.<br><br>Tap <b>🃏 Card</b> any time to browse the practice hands.`,
  },
  {
    title: 'The Charleston',
    tiles: ['fl', 'wn', 'dr'],
    html: `Before play begins, everyone passes tiles to improve their hands — the <b>Charleston</b>:<br><br><b>First (required):</b> pass 3 tiles to the <b>Right</b>, then 3 <b>Across</b>, then 3 <b>Left</b>.<br><b>Second (optional):</b> 3 Left, 3 Across, 3 Right — only if everyone agrees.<br><br>Pass tiles that don’t fit your plan; keep jokers, pairs, and anything matching the hand you’re chasing.`,
  },
  {
    title: 'Taking a turn',
    tiles: ['b3', 'b4', 'b5'],
    html: `On your turn you <b>draw</b> one tile from the wall, then <b>discard</b> one — staying at 13 tiles between turns. Slowly your hand takes the shape of your target.<br><br><b>Important:</b> unlike Chinese mahjong, American mahjong has <b>no runs</b> (no 3-4-5 sequences). Every group is identical tiles.`,
  },
  {
    title: 'Calling a discard',
    tiles: ['c7', 'c7', 'c7'],
    html: `When an opponent discards a tile you need, you can <b>call</b> it — even when it isn’t your turn:<br>• <b>Expose</b> a Pung/Kong by showing your matching tiles, then discard.<br>• <b>Win</b> if it completes your hand — shout “Mahjong!”<br><br>Calling speeds you up but reveals your plan, and you can’t call for Singles or Pairs. The Coach will tell you when a call is worth it.`,
  },
  {
    title: 'Winning & scoring',
    tiles: ['jk', 'b5', 'b5', 'b5', 'b5'],
    html: `Complete any hand on the card and declare <b>Mahjong</b> to win the round. You score the points printed on that hand.<br><br>• Win off someone’s <b>discard</b> → that player pays double.<br>• <b>Self-draw</b> the winning tile → everyone pays double.<br><br>No winner before the wall runs out? It’s a friendly <b>Wall Game</b> — nobody pays.`,
  },
  {
    title: 'You’re ready to practice!',
    tiles: ['jk', 'fl', 'dr', 'dg', 'dw'],
    html: `That’s the whole game. Best way to learn is to play with the <b>Coach ON</b> — it shows your closest hands, what to keep, and what to toss.<br><br>Start a practice game whenever you’re ready. You can revisit these lessons or the rules from the menu any time.`,
  },
];

export function buildLearnScreen(onPlay, onBack) {
  let page = 0;
  const host = el('div', { class: 'screen learn' });
  const render = () => {
    const L = LESSONS[page];
    const node = el('div', { class: 'learnwrap' },
      el('div', { class: 'lhead' },
        el('button', { class: 'btn ghost sm', onClick: onBack }, '← Menu'),
        el('div', { class: 'lprog' }, LESSONS.map((_, i) => el('span', { class: 'dot' + (i === page ? ' on' : (i < page ? ' done' : '')) }))),
        el('div', { class: 'lpgnum' }, `${page + 1} / ${LESSONS.length}`),
      ),
      el('div', { class: 'lesson' },
        el('h2', {}, L.title),
        L.tiles ? el('div', { class: 'lessontiles' }, tileRow(L.tiles, { small: true })) : null,
        el('div', { class: 'lbody', html: L.html }),
      ),
      el('div', { class: 'lnav' },
        el('button', { class: 'btn' + (page === 0 ? ' disabled' : ''), onClick: () => { if (page > 0) { page--; render(); } } }, '← Back'),
        page < LESSONS.length - 1
          ? el('button', { class: 'btn primary', onClick: () => { page++; render(); } }, 'Next →')
          : el('button', { class: 'btn primary big', onClick: onPlay }, '▶ Start a practice game'),
      ),
    );
    mount(host, node);
  };
  render();
  return host;
}

export function buildCardScreen(onBack) {
  return el('div', { class: 'screen' },
    el('div', { class: 'lhead' },
      el('button', { class: 'btn ghost sm', onClick: onBack }, '← Menu'),
      el('h2', { class: 'screentitle' }, `🃏 ${activeCard().name}`),
      el('button', { class: 'btn ghost sm', onClick: () => openRulesOverlay() }, '📖 Rules'),
    ),
    cardContent(),
  );
}
