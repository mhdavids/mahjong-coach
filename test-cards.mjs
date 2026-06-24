// Checks for user-entered card hands (validation + helpers).
import { validateHand, slotsFromGroups, groupsToPattern, matchHand } from './src/engine/match.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };

const num = (n, slot) => ({ c: undefined, t: { type: 'num', n, slot } });
const g = (c, t) => ({ c, t });
const N = (n, slot) => g(undefined, { type: 'num', n, slot });
const wind = (id) => ({ type: 'wind', id });
const flower = () => ({ type: 'flower' });
const dragon = (id) => ({ type: 'dragon', id });
const dof = (slot) => ({ type: 'dragonOf', slot });

// 1) a valid hand: NNNN SSSS FFF 111  (value 30)
{
  const groups = [g(4, wind('wn')), g(4, wind('ws')), g(3, flower()), g(3, { type: 'num', n: 1, slot: 'A' })];
  const v = validateHand({ groups, value: 30, concealed: false });
  ok(v.ok, '4N 4S 3F 3×1 should be valid: ' + v.errors.join('; '));
  ok(v.tiles.length === 14, 'valid hand has 14 tiles');
  ok(JSON.stringify(slotsFromGroups(groups)) === '["A"]', 'slots = [A]');
  ok(groupsToPattern(groups) === 'NNNN SSSS FFF 111', 'pattern string: ' + groupsToPattern(groups));
}

// 2) three-suit hand: 555 555 555 FFF 00
{
  const groups = [g(3, { type: 'num', n: 5, slot: 'A' }), g(3, { type: 'num', n: 5, slot: 'B' }), g(3, { type: 'num', n: 5, slot: 'C' }), g(3, flower()), g(2, dragon('dw'))];
  const v = validateHand({ groups, value: 30, concealed: false });
  ok(v.ok, 'three-suit 5s valid: ' + v.errors.join('; '));
  ok(JSON.stringify(v.slots) === '["A","B","C"]', 'slots = [A,B,C]');
}

// 3) wrong tile count -> invalid
{
  const groups = [g(4, { type: 'num', n: 2, slot: 'A' }), g(4, { type: 'num', n: 4, slot: 'A' }), g(4, { type: 'num', n: 6, slot: 'A' })]; // 12 tiles
  const v = validateHand({ groups, value: 25, concealed: false });
  ok(!v.ok, '12-tile hand should be invalid');
  ok(v.errors.some((e) => /14/.test(e)), 'error mentions 14');
}

// 4) missing value -> invalid
{
  const groups = [g(4, wind('wn')), g(4, wind('ws')), g(3, flower()), g(3, { type: 'num', n: 1, slot: 'A' })];
  const v = validateHand({ groups, value: 0, concealed: false });
  ok(!v.ok && v.errors.some((e) => /value/i.test(e)), 'zero value flagged');
}

// 5) three pairs of the SAME tile can't be built (pairs take no jokers)
{
  const groups = [g(2, { type: 'num', n: 1, slot: 'A' }), g(2, { type: 'num', n: 1, slot: 'A' }), g(2, { type: 'num', n: 1, slot: 'A' }),
    g(4, { type: 'num', n: 5, slot: 'A' }), g(4, { type: 'num', n: 9, slot: 'A' })]; // 14 tiles but needs six 1s
  const v = validateHand({ groups, value: 50, concealed: true });
  ok(!v.ok, 'six 1-tiles across three pairs should be invalid (only four exist)');
}

// 6) a quint forces jokers but is still valid (<=8)
{
  const groups = [g(5, { type: 'num', n: 3, slot: 'A' }), g(5, { type: 'num', n: 6, slot: 'A' }), g(4, { type: 'num', n: 9, slot: 'A' })];
  const v = validateHand({ groups, value: 40, concealed: false });
  ok(v.ok, 'quint hand valid: ' + v.errors.join('; '));
}

console.log(`\n${fail === 0 ? '✅ card-builder checks pass' : '❌ failures'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
