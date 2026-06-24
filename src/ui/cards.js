// ---------------------------------------------------------------------------
// Card manager + visual hand editor. Lets the user type in their own official
// card (or any card) and use it everywhere in the app. Everything saves to
// localStorage only — never uploaded or committed.
// ---------------------------------------------------------------------------
import { el, mount } from './dom.js';
import { tileEl, tileRow } from './tile.js';
import { confirmBox, chooseBox, toast } from './modal.js';
import {
  allCards, getCard, activeCardId, setActiveCard, upsertCard, deleteCard,
  duplicateCard, newId, newHandId, exportCard, importCard, cardToCode, cardFromCode,
} from '../data/cards.js';
import { validateHand, slotsFromGroups, groupsToPattern, exampleGroups } from '../engine/match.js';

const deep = (x) => JSON.parse(JSON.stringify(x));
const SECTIONS = ['2026', '2468', 'Like Numbers', 'Addition Hands', 'Quints', 'Consecutive Run', '13579', 'Winds - Dragons', '369', 'Singles and Pairs'];
const SLOT_SUIT = { A: 'b', B: 'c', C: 'd' };          // preview suit per color slot
const SLOT_LABEL = { A: '1st suit', B: '2nd suit', C: '3rd suit' };

// small input dialog returning a string (or null)
function promptBox({ title, label, value = '' }) {
  return new Promise((res) => {
    const inp = el('input', { class: 'inp', value, maxlength: '40' });
    const ov = el('div', { class: 'overlay' },
      el('div', { class: 'card' },
        el('h2', {}, title),
        label ? el('p', { class: 'muted' }, label) : null,
        inp,
        el('div', { class: 'row gap mt' },
          el('button', { class: 'btn', onClick: () => { ov.remove(); res(null); } }, 'Cancel'),
          el('button', { class: 'btn primary', onClick: () => { ov.remove(); res(inp.value.trim()); } }, 'OK'),
        ),
      ),
    );
    document.getElementById('modal-root').append(ov);
    setTimeout(() => inp.focus(), 30);
  });
}

function download(filename, text) {
  const a = el('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: filename });
  document.body.append(a); a.click(); a.remove();
}

function shareCodeModal(name, code) {
  const ta = el('textarea', { class: 'inp codearea', readonly: true }, code);
  const ov = el('div', { class: 'overlay' },
    el('div', { class: 'card' },
      el('h2', {}, `Share “${name}”`),
      el('p', { class: 'muted' }, 'Copy this code, then on your other device open My Cards → “Load from code.” It stays private — nothing is uploaded; you’re just moving text you control.'),
      ta,
      el('div', { class: 'row gap mt' },
        el('button', { class: 'btn', onClick: () => ov.remove() }, 'Close'),
        el('button', { class: 'btn primary', onClick: async () => { try { await navigator.clipboard.writeText(code); toast('Code copied'); } catch { ta.select(); toast('Select-all + copy the code'); } } }, 'Copy code'),
      ),
    ),
  );
  document.getElementById('modal-root').append(ov);
  setTimeout(() => { ta.focus(); ta.select(); }, 30);
}

function loadCodeModal(after) {
  const ta = el('textarea', { class: 'inp codearea', placeholder: 'Paste a card code here…' });
  const ov = el('div', { class: 'overlay' },
    el('div', { class: 'card' },
      el('h2', {}, 'Load card from code'),
      el('p', { class: 'muted' }, 'Paste a code you copied from another device.'),
      ta,
      el('div', { class: 'row gap mt' },
        el('button', { class: 'btn', onClick: () => ov.remove() }, 'Cancel'),
        el('button', { class: 'btn primary', onClick: () => { try { const c = cardFromCode(ta.value); ov.remove(); toast(`Loaded “${c.name}”`); after && after(); } catch { toast('Could not read that code', 2400); } } }, 'Load'),
      ),
    ),
  );
  document.getElementById('modal-root').append(ov);
  setTimeout(() => ta.focus(), 30);
}

// ===========================================================================
// MANAGER SCREEN
// ===========================================================================
export function buildCardsScreen(app, onBack) {
  const render = () => {
    const activeId = activeCardId();
    const node = el('div', { class: 'screen cardsmgr' },
      el('div', { class: 'lhead' },
        el('button', { class: 'btn ghost sm', onClick: onBack }, '← Menu'),
        el('h2', { class: 'screentitle' }, '🛠 My Cards'),
        el('span', {}),
      ),
      el('p', { class: 'muted' }, 'Use the built-in practice card, or type in your own official card. Custom cards are saved only on this device — they are never uploaded.'),
      el('div', { class: 'row gap mt' },
        el('button', { class: 'btn primary', onClick: async () => {
          const name = await promptBox({ title: 'New card', label: 'Name it (e.g. “NMJL 2025”).', value: 'My Card' });
          if (name == null) return;
          const card = { id: newId(), name: name || 'My Card', hands: [] };
          upsertCard(card); editCard(app, card.id, () => buildCardsScreen(app, onBack));
        } }, '＋ New card'),
        el('button', { class: 'btn', onClick: () => loadCodeModal(render) }, '🔑 Load from code'),
        el('button', { class: 'btn', onClick: () => importFile(render) }, '⬆ Import (.json)'),
      ),
      el('div', { class: 'cardlist' }, allCards().map((c) => el('div', { class: 'cardrow' + (c.id === activeId ? ' active' : '') },
        el('div', { class: 'crinfo' },
          el('div', { class: 'crname' }, c.name, c.id === activeId ? el('span', { class: 'tag away close' }, 'ACTIVE') : null, c.builtin ? el('span', { class: 'tag x' }, 'Built-in') : null),
          el('div', { class: 'crsub' }, `${c.hands.length} hand${c.hands.length === 1 ? '' : 's'}`),
        ),
        el('div', { class: 'cractions' },
          c.id === activeId ? el('span', { class: 'muted sm' }, 'In use') : el('button', { class: 'btn sm primary', onClick: () => { setActiveCard(c.id); toast(`Now playing with “${c.name}”`); render(); } }, 'Use this'),
          c.builtin ? null : el('button', { class: 'btn sm', onClick: () => editCard(app, c.id, () => buildCardsScreen(app, onBack)) }, 'Edit'),
          el('button', { class: 'btn sm', onClick: async () => { const n = await promptBox({ title: 'Duplicate card', label: 'Name for the copy:', value: c.name + ' (copy)' }); if (n == null) return; duplicateCard(c.id, n); render(); } }, 'Duplicate'),
          el('button', { class: 'btn sm', onClick: () => shareCodeModal(c.name, cardToCode(c.id)) }, 'Share'),
          el('button', { class: 'btn sm', onClick: () => download(c.name.replace(/\s+/g, '-') + '.json', exportCard(c.id)) }, 'Export'),
          c.builtin ? null : el('button', { class: 'btn sm danger', onClick: async () => { if (await confirmBox({ title: `Delete “${c.name}”?`, body: 'This removes the card from this device. Export it first if you want a backup.', yes: 'Delete', no: 'Keep', icon: '🗑' })) { deleteCard(c.id); render(); } } }, 'Delete'),
        ),
      ))),
    );
    mount(app, node);
  };

  function importFile(after) {
    const inp = el('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
    inp.addEventListener('change', async () => {
      const f = inp.files[0]; if (!f) return;
      try { const c = importCard(await f.text()); toast(`Imported “${c.name}”`); after(); }
      catch (e) { toast('Import failed: ' + e.message, 2600); }
    });
    document.body.append(inp); inp.click(); inp.remove();
  }

  render();
}

// ===========================================================================
// EDIT ONE CARD (list of hands)
// ===========================================================================
function editCard(app, cardId, onBack) {
  const render = () => {
    const card = getCard(cardId);
    const cats = [...new Set(card.hands.map((h) => h.cat || 'Hands'))];
    const node = el('div', { class: 'screen' },
      el('div', { class: 'lhead' },
        el('button', { class: 'btn ghost sm', onClick: onBack }, '← Cards'),
        el('h2', { class: 'screentitle' }, card.name),
        el('button', { class: 'btn ghost sm', onClick: async () => { const n = await promptBox({ title: 'Rename card', value: card.name }); if (n) { card.name = n; upsertCard(card); render(); } } }, '✎ Rename'),
      ),
      el('div', { class: 'row gap' },
        el('button', { class: 'btn primary', onClick: () => openHandEditor(card, null, render) }, '＋ Add hand'),
        activeCardId() === card.id ? el('span', { class: 'muted sm' }, '✓ This is your active card') : el('button', { class: 'btn sm', onClick: () => { setActiveCard(card.id); toast('Now your active card'); render(); } }, 'Make active'),
      ),
      card.hands.length === 0 ? el('p', { class: 'muted mt' }, 'No hands yet. Tap “Add hand” and build your first one — copy it straight off your physical card.') : null,
      ...cats.map((cat) => el('div', {},
        el('h3', { class: 'cat' }, cat),
        ...card.hands.filter((h) => (h.cat || 'Hands') === cat).map((h) => el('div', { class: 'handcard' },
          el('div', { class: 'hctop' },
            el('span', { class: 'hcname' }, h.name || '(unnamed)'),
            el('span', { class: 'hcval' }, `${h.value} pts`),
            h.concealed ? el('span', { class: 'tag c' }, 'C') : el('span', { class: 'tag x' }, 'X'),
            el('span', { class: 'spacer' }),
            el('button', { class: 'btn sm', onClick: () => openHandEditor(card, h, render) }, 'Edit'),
            el('button', { class: 'btn sm danger', onClick: () => { card.hands = card.hands.filter((x) => x !== h); upsertCard(card); render(); } }, '✕'),
          ),
          h.pattern ? el('div', { class: 'hcpat' }, h.pattern) : null,
          el('div', { class: 'handex' }, exampleGroups({ ...h, slots: slotsFromGroups(h.groups) }).map((g) => el('div', { class: 'grp' }, tileRow(g.ids, { tiny: true, label: false })))),
        )),
      )),
    );
    mount(app, node);
  };
  render();
}

// ===========================================================================
// HAND EDITOR (visual group builder)
// ===========================================================================
function openHandEditor(card, existing, onClose) {
  const state = existing ? deep(existing) : { name: '', cat: '', value: 25, concealed: false, groups: [] };
  const draft = { c: 3, kind: 'num', n: 1, slot: 'A', dragonId: 'dr', windId: 'wn', triple: false };
  const root = document.getElementById('modal-root');
  const ov = el('div', { class: 'overlay' });
  root.append(ov);

  const close = () => ov.remove();

  const mkSpec = (slot) => {
    switch (draft.kind) {
      case 'num': return { c: draft.c, t: { type: 'num', n: draft.n, slot } };
      case 'dragonOf': return { c: draft.c, t: { type: 'dragonOf', slot } };
      case 'flower': return { c: draft.c, t: { type: 'flower' } };
      case 'soap': return { c: draft.c, t: { type: 'dragon', id: 'dw' } };
      case 'wind': return { c: draft.c, t: { type: 'wind', id: draft.windId } };
      case 'dragon': return { c: draft.c, t: { type: 'dragon', id: draft.dragonId } };
    }
  };
  const addGroup = () => {
    if (draft.triple && (draft.kind === 'num' || draft.kind === 'dragonOf')) {
      for (const s of ['A', 'B', 'C']) state.groups.push(mkSpec(s));
    } else state.groups.push(mkSpec(draft.slot));
    render();
  };

  const usesColor = () => draft.kind === 'num' || draft.kind === 'dragonOf';

  function render() {
    const v = validateHand(state);
    const ex = state.groups.length ? exampleGroups({ ...state, slots: v.slots }) : [];

    const numPad = el('div', { class: 'numpad' }, [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) =>
      el('button', { class: 'tilebtn' + (draft.kind === 'num' && draft.n === n ? ' on' : ''), onClick: () => { draft.kind = 'num'; draft.n = n; render(); } },
        tileEl(SLOT_SUIT[draft.slot] + n, { tiny: true }))));

    const specials = [
      { kind: 'flower', tile: 'fl', label: 'Flower' },
      { kind: 'soap', tile: 'dw', label: 'Soap (0)' },
      { kind: 'dragon', dragonId: 'dr', tile: 'dr', label: 'Red' },
      { kind: 'dragon', dragonId: 'dg', tile: 'dg', label: 'Green' },
      { kind: 'dragonOf', tile: 'dr', label: 'Dragon (color)' },
      { kind: 'wind', windId: 'wn', tile: 'wn', label: 'North' },
      { kind: 'wind', windId: 'we', tile: 'we', label: 'East' },
      { kind: 'wind', windId: 'ww', tile: 'ww', label: 'West' },
      { kind: 'wind', windId: 'ws', tile: 'ws', label: 'South' },
    ];
    const isSel = (s) => draft.kind === s.kind && (s.dragonId ? draft.dragonId === s.dragonId : true) && (s.windId ? draft.windId === s.windId : true);
    const specRow = el('div', { class: 'specialrow' }, specials.map((s) =>
      el('button', { class: 'tilebtn wide' + (isSel(s) ? ' on' : ''), onClick: () => { draft.kind = s.kind; if (s.dragonId) draft.dragonId = s.dragonId; if (s.windId) draft.windId = s.windId; render(); } },
        tileEl(s.tile, { tiny: true }), el('span', { class: 'tbl' }, s.label))));

    const counts = el('div', { class: 'segmented' }, [['Single', 1], ['Pair', 2], ['Pung', 3], ['Kong', 4], ['Quint', 5], ['Sextet', 6]].map(([lbl, n]) =>
      el('button', { class: 'segbtn sm' + (draft.c === n ? ' on' : ''), onClick: () => { draft.c = n; render(); } }, `${lbl} ${n}`)));

    const swatches = usesColor() ? el('div', { class: 'swatchrow' },
      ['A', 'B', 'C'].map((s) => el('button', { class: 'swatch sw-' + s + (draft.slot === s ? ' on' : ''), onClick: () => { draft.slot = s; render(); } }, SLOT_LABEL[s])),
      el('label', { class: 'triple' }, el('input', { type: 'checkbox', checked: draft.triple || null, onChange: (e) => { draft.triple = e.target.checked; } }), ' add to all 3 suits at once'),
    ) : el('div', { class: 'muted sm' }, 'This tile has no suit color.');

    const node = el('div', { class: 'card wide scroll handeditor' },
      el('div', { class: 'ovhead' }, el('h2', {}, existing ? 'Edit hand' : 'New hand'), el('button', { class: 'btn ghost sm', onClick: close }, '✕ Close')),

      // meta fields
      el('div', { class: 'hemeta' },
        el('div', { class: 'field' }, el('label', {}, 'Name (optional)'), el('input', { class: 'inp', value: state.name, placeholder: 'e.g. 2026a', oninput: (e) => (state.name = e.target.value) })),
        el('div', { class: 'field' }, el('label', {}, 'Section'), el('input', { class: 'inp', value: state.cat, placeholder: 'e.g. Like Numbers', list: 'sections', oninput: (e) => (state.cat = e.target.value) }),
          el('datalist', { id: 'sections' }, SECTIONS.map((s) => el('option', { value: s })))),
        el('div', { class: 'field narrow' }, el('label', {}, 'Value'), el('input', { class: 'inp', type: 'number', min: '10', max: '99', value: state.value, oninput: (e) => (state.value = Number(e.target.value)) })),
        el('div', { class: 'field narrow' }, el('label', {}, 'Type'),
          el('div', { class: 'segmented' },
            el('button', { class: 'segbtn sm' + (!state.concealed ? ' on' : ''), onClick: () => { state.concealed = false; render(); } }, 'X'),
            el('button', { class: 'segbtn sm' + (state.concealed ? ' on' : ''), onClick: () => { state.concealed = true; render(); } }, 'C'))),
      ),

      // current hand preview
      el('div', { class: 'helabel' }, 'Your hand so far'),
      el('div', { class: 'hepreview' }, state.groups.length
        ? ex.map((g, i) => el('div', { class: 'grp del', title: 'Remove group' },
            tileRow(g.ids, { tiny: true, label: false }),
            el('button', { class: 'grpdel', onClick: () => { state.groups.splice(i, 1); render(); } }, '✕')))
        : el('span', { class: 'muted' }, 'Empty — add groups below.')),
      el('div', { class: 'hestatus ' + (v.ok ? 'ok' : 'bad') }, v.ok ? `✓ Valid — 14 tiles` : v.errors.join('  •  ')),

      // group builder
      el('div', { class: 'helabel' }, 'Add a group'),
      el('div', { class: 'builder' },
        el('div', { class: 'brow' }, el('span', { class: 'blab' }, 'Size'), counts),
        el('div', { class: 'brow' }, el('span', { class: 'blab' }, 'Tile'), el('div', {}, numPad, specRow)),
        el('div', { class: 'brow' }, el('span', { class: 'blab' }, 'Suit'), swatches),
        el('button', { class: 'btn primary', onClick: addGroup }, '＋ Add this group'),
      ),

      // footer
      el('div', { class: 'row gap mt' },
        el('button', { class: 'btn primary big' + (v.ok ? '' : ' disabled'), onClick: () => {
          if (!v.ok) return;
          const hand = {
            id: existing?.id || newHandId(),
            name: state.name.trim(),
            cat: state.cat.trim() || 'Hands',
            value: state.value,
            concealed: state.concealed,
            slots: v.slots,
            groups: state.groups,
            pattern: groupsToPattern(state.groups),
          };
          if (existing) { const i = card.hands.findIndex((x) => x.id === existing.id); card.hands[i] = hand; }
          else card.hands.push(hand);
          upsertCard(card); close(); toast('Hand saved'); onClose();
        } }, '✓ Save hand'),
        el('button', { class: 'btn', onClick: close }, 'Cancel'),
      ),
    );
    ov.replaceChildren(node);
  }
  render();
}
