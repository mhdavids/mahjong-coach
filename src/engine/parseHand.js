// ---------------------------------------------------------------------------
// "Quick type" parser: turn a short text line into hand groups, so entering a
// hand is a few keystrokes instead of many taps. You own and type the content;
// this is just a faster keyboard for the editor.
//
// SYNTAX (one hand per line)
//   • Groups are separated by spaces. Repeat a tile to set the count:
//       2=Single  22=Pair  222=Pung  2222=Kong  22222=Quint
//   • Suit colors → add a trailing a / b / c (the 3 card colors):
//       222a 222b 222c   = the number 2 in three different suits
//       222a 444a        = both in the same suit (a)
//   • Flowers: F (FF=pair, FFFF=kong).   Soap / zero: 0 (00=pair).
//   • Winds: N E W S (NN=pair North; NEWS=one of each).
//   • Matching dragon: D + suit letter (DDa = pair of suit-a's dragon).
//       (R = Red dragon, G = Green dragon, 0 = Soap/White, if you need a specific one.)
//   • Value + type at the end with an = sign:  =25x  (X=exposable)  =50c (C=concealed)
//   Example:  FFFF 2222a 4466a 8888a =25x   →  wait, write 44 and 66 separately:
//   Example:  FF 2222a 44a 66a 8888a =25x
// ---------------------------------------------------------------------------

const SUIT = { a: 'A', b: 'B', c: 'C' };
const WIND = { n: 'wn', e: 'we', w: 'ww', s: 'ws' };

export function parseHandLine(line) {
  const raw = (line || '').trim();
  if (!raw) return { error: 'Empty line.' };
  const groups = [];
  let value = null, concealed = false;

  for (const tok of raw.split(/\s+/)) {
    const vm = tok.match(/^=(\d{2,3})([cx])$/i);
    if (vm) { value = parseInt(vm[1], 10); concealed = vm[2].toLowerCase() === 'c'; continue; }

    const t = tok.toLowerCase();
    if (/^f+$/.test(t)) { groups.push({ c: t.length, t: { type: 'flower' } }); continue; }
    if (/^0+$/.test(t)) { groups.push({ c: t.length, t: { type: 'dragon', id: 'dw' } }); continue; }
    if (/^r+$/.test(t)) { groups.push({ c: t.length, t: { type: 'dragon', id: 'dr' } }); continue; }
    if (/^g+$/.test(t)) { groups.push({ c: t.length, t: { type: 'dragon', id: 'dg' } }); continue; }

    const dm = t.match(/^(d+)([abc])?$/);
    if (dm) { groups.push({ c: dm[1].length, t: { type: 'dragonOf', slot: SUIT[dm[2] || 'a'] } }); continue; }

    if (/^[news]+$/.test(t)) {
      if (new Set(t).size === 1) groups.push({ c: t.length, t: { type: 'wind', id: WIND[t[0]] } });
      else for (const ch of t) groups.push({ c: 1, t: { type: 'wind', id: WIND[ch] } });
      continue;
    }

    const nm = t.match(/^(\d+)([abc])?$/);
    if (nm) {
      const digits = nm[1], slot = SUIT[nm[2] || 'a'];
      const mk = (d) => d === '0' ? { type: 'dragon', id: 'dw' } : { type: 'num', n: +d, slot };
      if (new Set(digits).size === 1) groups.push({ c: digits.length, t: mk(digits[0]) });
      else for (const d of digits) groups.push({ c: 1, t: mk(d) });
      continue;
    }

    return { error: `Couldn't read "${tok}". Add unusual tiles with the buttons below.` };
  }

  if (!groups.length) return { error: 'No tiles found.' };
  return { groups, value, concealed };
}
