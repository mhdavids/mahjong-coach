import './styles.css';
import { el, mount } from './ui/dom.js';
import { tileEl } from './ui/tile.js';
import { buildLearnScreen, buildCardScreen, openRulesOverlay } from './tutorial/tutorial.js';
import { GameController } from './ui/controller.js';

const app = document.getElementById('app');
const cfg = { name1: 'You', name2: 'Lelan', coachOn: true, callMode: 'ask', speed: 850 };

// ----- menu ----------------------------------------------------------------
function showMenu() {
  mount(app, el('div', { class: 'screen menu' },
    el('div', { class: 'hero' },
      el('div', { class: 'herotiles' }, ['b1', 'c5', 'd9', 'dr', 'jk'].map((id) => tileEl(id, { small: true }))),
      el('h1', {}, 'Mahjong Coach'),
      el('p', { class: 'subtitle' }, 'Learn American Mahjong from zero — then play pass-and-play against two computer opponents.'),
    ),
    el('div', { class: 'menubtns' },
      el('button', { class: 'btn primary big', onClick: showSetup }, '▶  Play a Game'),
      el('button', { class: 'btn big', onClick: showLearn }, '🎓  Learn to Play'),
      el('button', { class: 'btn big', onClick: showCard }, '🃏  Browse the Card'),
      el('button', { class: 'btn big', onClick: () => openRulesOverlay() }, '📖  Rules Reference'),
    ),
    el('p', { class: 'footnote' }, 'Built for a real game night. New to mahjong? Tap “Learn to Play” first. Uses original practice hands in the NMJL style — not the copyrighted League card.'),
  ));
}

function showLearn() { mount(app, buildLearnScreen(() => showSetup(), showMenu)); }
function showCard() { mount(app, buildCardScreen(showMenu)); }

// ----- setup ---------------------------------------------------------------
function showSetup() {
  const seg = (label, opts, current, onPick) => el('div', { class: 'field' },
    el('label', {}, label),
    el('div', { class: 'segmented' }, opts.map((o) =>
      el('button', { class: 'segbtn' + (o.value === current() ? ' on' : ''), onClick: (e) => { onPick(o.value); rerender(); } }, o.label))),
  );

  function rerender() {
    const node = el('div', { class: 'screen setup' },
      el('div', { class: 'lhead' },
        el('button', { class: 'btn ghost sm', onClick: showMenu }, '← Menu'),
        el('h2', { class: 'screentitle' }, 'New Game'),
        el('span', {}),
      ),
      el('div', { class: 'setupcard' },
        el('p', { class: 'muted' }, 'Two of you share this device (pass it at each turn) and play against two computer players. The humans sit across from each other (East & West).'),
        el('div', { class: 'field' },
          el('label', {}, 'Player 1 — East seat'),
          el('input', { id: 'n1', class: 'inp', value: cfg.name1, maxlength: '14', oninput: (e) => (cfg.name1 = e.target.value) }),
        ),
        el('div', { class: 'field' },
          el('label', {}, 'Player 2 — West seat (across)'),
          el('input', { id: 'n2', class: 'inp', value: cfg.name2, maxlength: '14', oninput: (e) => (cfg.name2 = e.target.value) }),
        ),
        el('div', { class: 'aiseats' }, 'Computer players: ', el('b', {}, 'Sage'), ' (South) and ', el('b', {}, 'Pixel'), ' (North).'),
        seg('Coach hints', [{ label: 'On (recommended)', value: true }, { label: 'Off', value: false }], () => cfg.coachOn, (v) => (cfg.coachOn = v)),
        el('p', { class: 'hint' }, cfg.coachOn ? 'The Coach shows your closest hands, what to keep, and what to discard. Great while learning.' : 'No hints — play on your own.'),
        seg('Calling discards', [{ label: 'Ask me', value: 'ask' }, { label: 'Auto-skip', value: 'auto' }], () => cfg.callMode, (v) => (cfg.callMode = v)),
        el('p', { class: 'hint' }, cfg.callMode === 'ask' ? 'You’ll be offered a call when grabbing a discard genuinely helps. (You’re always asked when you can win.)' : 'Optional calls are skipped to keep play quick. You’re still asked when you can win.'),
        seg('Pace', [{ label: 'Calm', value: 1300 }, { label: 'Normal', value: 850 }, { label: 'Brisk', value: 450 }], () => cfg.speed, (v) => (cfg.speed = v)),
        el('button', { class: 'btn primary big full', onClick: startGame }, '▶  Deal & start the Charleston'),
      ),
    );
    mount(app, node);
  }
  rerender();
}

function startGame() {
  const seats = [
    { name: cfg.name1.trim() || 'You', isAI: false },
    { name: 'Sage', isAI: true },
    { name: cfg.name2.trim() || 'Partner', isAI: false },
    { name: 'Pixel', isAI: true },
  ];
  const ctrl = new GameController(app, { seats, coachOn: cfg.coachOn, callMode: cfg.callMode, speed: cfg.speed }, showMenu);
  ctrl.run();
}

showMenu();
