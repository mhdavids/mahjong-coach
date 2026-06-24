// ---------------------------------------------------------------------------
// PRACTICE CARD  —  original hands written in the National Mah Jongg League
// style. These are NOT the official NMJL card (which is copyrighted and
// reissued every April). They exist purely so you can learn how to read a
// card and how the hands feel. At a real game night, read hands off the
// official card you buy from nationalmahjonggleague.org instead.
//
// HOW TO READ A HAND
//   • A hand is always exactly 14 tiles, split into groups.
//   • Group sizes:  Single(1)  Pair(2)  Pung(3)  Kong(4)  Quint(5)
//   • Jokers may fill any spot in a group of 3 or more (Pung/Kong/Quint).
//     Jokers may NEVER be used for a Single or a Pair.
//   • A,B,C are "suit slots" — each must be a DIFFERENT suit (Bam/Crak/Dot),
//     your choice, but consistent across the whole hand.
//   • "Soap" = the White Dragon, and it doubles as the digit 0 (as in 2026).
//   • Concealed (C) hands must be made entirely from your own tiles — you may
//     not expose melds. Exposable (X) hands let you call tiles from discards.
// ---------------------------------------------------------------------------

const A = 'A', B = 'B', C = 'C';

// group spec builders
const num = (n, slot) => ({ type: 'num', n, slot });
const wind = (x) => ({ type: 'wind', id: { N: 'wn', E: 'we', W: 'ww', S: 'ws' }[x] });
const drg = (id) => ({ type: 'dragon', id });
const dof = (slot) => ({ type: 'dragonOf', slot });
const soap = () => ({ type: 'dragon', id: 'dw' });
const fl = () => ({ type: 'flower' });
const g = (c, t) => ({ c, t });

export const CARD = [
  // ----- LIKE NUMBERS ------------------------------------------------------
  {
    id: 'evens',
    name: 'All in the Family',
    cat: 'Like Numbers',
    value: 25,
    concealed: false,
    difficulty: 'Beginner',
    slots: [A],
    groups: [g(4, num(2, A)), g(4, num(4, A)), g(4, num(6, A)), g(2, num(8, A))],
    pattern: '2222 4444 6666 88  (one suit)',
    tip: 'All even numbers in a single suit. Three Kongs means jokers do a lot of the work here — a friendly first goal.',
  },
  {
    id: 'odds',
    name: 'Odd Couple',
    cat: 'Like Numbers',
    value: 25,
    concealed: false,
    difficulty: 'Beginner',
    slots: [A],
    groups: [g(4, num(1, A)), g(4, num(3, A)), g(4, num(5, A)), g(2, dof(A))],
    pattern: '1111 3333 5555 DD  (one suit; D = that suit’s dragon)',
    tip: 'Low odd numbers in one suit, finished with that suit’s matching dragon pair. Lots of jokers welcome.',
  },
  {
    id: 'same5',
    name: 'High Five',
    cat: 'Like Numbers',
    value: 30,
    concealed: false,
    difficulty: 'Beginner',
    slots: [A, B, C],
    groups: [g(3, num(5, A)), g(3, num(5, B)), g(3, num(5, C)), g(3, fl()), g(2, drg('dw'))],
    pattern: '555 555 555 FFF  Soap-Soap  (three suits)',
    tip: 'The number 5 as a Pung in every suit, plus a Pung of Flowers and a pair of Soaps. Great for seeing all three suits at once.',
  },
  {
    id: 'flowers2',
    name: 'Flower Power',
    cat: 'Like Numbers',
    value: 30,
    concealed: false,
    difficulty: 'Beginner',
    slots: [A, B, C],
    groups: [g(4, fl()), g(3, num(2, A)), g(3, num(2, B)), g(4, num(2, C))],
    pattern: 'FFFF 222 222 2222  (three suits)',
    tip: 'A Kong of Flowers and the number 2 across all three suits. Jokers fit everywhere except… well, everywhere here is 3+, so load up.',
  },
  {
    id: '369',
    name: 'Three Six Nine',
    cat: 'Like Numbers',
    value: 35,
    concealed: false,
    difficulty: 'Intermediate',
    slots: [A, B, C],
    groups: [g(4, num(3, A)), g(4, num(6, B)), g(4, num(9, C)), g(2, drg('dr'))],
    pattern: '3333 6666 9999 DD  (one number per suit)',
    tip: 'Multiples of three, each in its own suit, plus a Red Dragon pair. A classic "math" hand.',
  },

  // ----- CONSECUTIVE RUN ---------------------------------------------------
  {
    id: 'steps',
    name: 'Five Steps',
    cat: 'Consecutive Run',
    value: 30,
    concealed: false,
    difficulty: 'Intermediate',
    slots: [A],
    groups: [g(2, num(1, A)), g(2, num(2, A)), g(3, num(3, A)), g(3, num(4, A)), g(4, num(5, A))],
    pattern: '11 22 333 444 5555  (one suit)',
    tip: 'Five numbers in a row, climbing in group size. Pairs (1 and 2) can’t take jokers, but 3/4/5 can.',
  },

  // ----- QUINTS ------------------------------------------------------------
  {
    id: 'quints',
    name: 'Quint Essential',
    cat: 'Quints',
    value: 40,
    concealed: false,
    difficulty: 'Intermediate',
    slots: [A],
    groups: [g(5, num(3, A)), g(5, num(6, A)), g(4, num(9, A))],
    pattern: '33333 66666 9999  (one suit)',
    tip: 'A Quint is FIVE of a kind — impossible without jokers, since only four of each tile exist. This hand forces you to collect jokers.',
  },

  // ----- WINDS & DRAGONS ---------------------------------------------------
  {
    id: 'winds',
    name: 'Winds of Change',
    cat: 'Winds & Dragons',
    value: 30,
    concealed: false,
    difficulty: 'Beginner',
    slots: [],
    groups: [g(3, wind('N')), g(3, wind('E')), g(3, wind('W')), g(3, wind('S')), g(2, drg('dr'))],
    pattern: 'NNN EEE WWW SSS  DD',
    tip: 'A Pung of every wind plus a Dragon pair. No suits to juggle — easy to picture, and jokers help the Pungs.',
  },
  {
    id: 'dragons',
    name: 'Dragon’s Hoard',
    cat: 'Winds & Dragons',
    value: 35,
    concealed: false,
    difficulty: 'Intermediate',
    slots: [],
    groups: [g(4, drg('dr')), g(4, drg('dg')), g(4, drg('dw')), g(2, wind('N'))],
    pattern: 'Red-Kong  Green-Kong  Soap-Kong  NN',
    tip: 'A Kong of each dragon, finished with a North pair. Watch the joker supply — everyone wants jokers for Kongs.',
  },
  {
    id: 'world',
    name: 'Around the World',
    cat: 'Winds & Dragons',
    value: 45,
    concealed: false,
    difficulty: 'Advanced',
    slots: [],
    groups: [g(1, wind('N')), g(1, wind('E')), g(1, wind('W')), g(1, wind('S')), g(4, drg('dr')), g(4, drg('dg')), g(2, drg('dw'))],
    pattern: 'N E W S  Red-Kong  Green-Kong  Soap-Soap',
    tip: 'Single winds (no jokers allowed on Singles!) plus two Dragon Kongs. Harder — you must draw the exact winds.',
  },

  // ----- 2026 (year hands) -------------------------------------------------
  {
    id: 'year',
    name: 'This Year — 2026',
    cat: '2026',
    value: 50,
    concealed: false,
    difficulty: 'Advanced',
    slots: [A, B, C],
    groups: [
      g(2, fl()),
      g(1, num(2, A)), g(1, soap()), g(1, num(2, A)), g(1, num(6, A)),
      g(1, num(2, B)), g(1, soap()), g(1, num(2, B)), g(1, num(6, B)),
      g(1, num(2, C)), g(1, soap()), g(1, num(2, C)), g(1, num(6, C)),
    ],
    pattern: 'FF  2026  2026  2026   (Soap = 0; three suits)',
    tip: 'Spell the year in three suits using Soap for the 0. Every tile is a Single — NO jokers anywhere. High value, high difficulty.',
  },

  // ----- SINGLES & PAIRS ---------------------------------------------------
  {
    id: 'pairs',
    name: 'Seven Sisters',
    cat: 'Singles & Pairs',
    value: 50,
    concealed: true,
    difficulty: 'Advanced',
    slots: [A],
    groups: [g(2, num(1, A)), g(2, num(3, A)), g(2, num(5, A)), g(2, num(7, A)), g(2, num(9, A)), g(2, wind('N')), g(2, wind('E'))],
    pattern: '11 33 55 77 99  NN EE   (Concealed)',
    tip: 'Seven pairs — odds in one suit plus two winds. Pairs never take jokers, and this hand is Concealed, so no calling. The purist’s hand.',
  },

  // ----- extra practice hands (more chances to complete a hand) -------------
  {
    id: 'big3',
    name: 'Big Threes',
    cat: 'Like Numbers', value: 30, concealed: false, difficulty: 'Beginner',
    slots: [A, B, C],
    groups: [g(4, num(3, A)), g(4, num(3, B)), g(3, num(3, C)), g(3, fl())],
    pattern: '3333 3333 333 FFF  (three suits)',
    tip: 'The number 3 in all three suits, plus a Pung of Flowers. Every group takes jokers — a very forgiving hand.',
  },
  {
    id: 'lucky8',
    name: 'Lucky Eights',
    cat: 'Like Numbers', value: 30, concealed: false, difficulty: 'Beginner',
    slots: [A, B, C],
    groups: [g(3, num(8, A)), g(3, num(8, B)), g(3, num(8, C)), g(3, fl()), g(2, drg('dw'))],
    pattern: '888 888 888 FFF  Soap-Soap',
    tip: 'Eights across all suits with a Flower Pung and a Soap pair. Eight is the lucky number — chase it!',
  },
  {
    id: 'evensteven',
    name: 'Even Steven',
    cat: 'Like Numbers', value: 30, concealed: false, difficulty: 'Beginner',
    slots: [A],
    groups: [g(3, num(2, A)), g(3, num(4, A)), g(3, num(6, A)), g(3, num(8, A)), g(2, dof(A))],
    pattern: '222 444 666 888 DD  (one suit)',
    tip: 'All the evens as Pungs in a single suit, finished with that suit’s dragon pair. Lots of jokers welcome.',
  },
  {
    id: 'oddsquad',
    name: 'Odd Squad',
    cat: 'Like Numbers', value: 30, concealed: false, difficulty: 'Beginner',
    slots: [A],
    groups: [g(3, num(1, A)), g(3, num(5, A)), g(3, num(9, A)), g(3, fl()), g(2, drg('dw'))],
    pattern: '111 555 999 FFF  Soap-Soap',
    tip: 'Low, middle, high odd — 1, 5, 9 — plus Flowers and a Soap pair. Easy to picture, easy to build.',
  },
  {
    id: 'flowergarden',
    name: 'Flower Garden',
    cat: 'Like Numbers', value: 30, concealed: false, difficulty: 'Beginner',
    slots: [A, B, C],
    groups: [g(4, fl()), g(4, num(5, A)), g(3, num(5, B)), g(3, num(5, C))],
    pattern: 'FFFF 5555 555 555  (three suits)',
    tip: 'A Kong of Flowers and the number 5 spread across the suits. Stockpile flowers and jokers.',
  },
  {
    id: 'kongquartet',
    name: 'Kong Quartet',
    cat: 'Like Numbers', value: 35, concealed: false, difficulty: 'Intermediate',
    slots: [A, B, C],
    groups: [g(4, num(4, A)), g(4, num(4, B)), g(4, num(4, C)), g(2, dof(A))],
    pattern: '4444 4444 4444 DD  (same number, three suits)',
    tip: 'Three Kongs of the same number across the suits plus a dragon pair. Jokers do heavy lifting.',
  },
  {
    id: 'climb',
    name: 'Climbing Pungs',
    cat: 'Consecutive Run', value: 35, concealed: false, difficulty: 'Intermediate',
    slots: [A],
    groups: [g(3, num(1, A)), g(3, num(2, A)), g(3, num(3, A)), g(3, num(4, A)), g(2, num(5, A))],
    pattern: '111 222 333 444 55  (one suit)',
    tip: 'Five numbers in a row as Pungs, topped with a pair. A clean consecutive-run hand that loves jokers.',
  },
  {
    id: 'dragongate',
    name: 'Dragon Gate',
    cat: 'Winds & Dragons', value: 30, concealed: false, difficulty: 'Beginner',
    slots: [],
    groups: [g(3, drg('dr')), g(3, drg('dg')), g(3, drg('dw')), g(3, fl()), g(2, wind('E'))],
    pattern: 'Red Green Soap (Pungs)  FFF  EE',
    tip: 'A Pung of each dragon, a Flower Pung, and an East pair. A friendly way to learn the dragons.',
  },
  {
    id: 'northsouth',
    name: 'North & South',
    cat: 'Winds & Dragons', value: 30, concealed: false, difficulty: 'Beginner',
    slots: [A],
    groups: [g(4, wind('N')), g(4, wind('S')), g(3, fl()), g(3, num(1, A))],
    pattern: 'NNNN SSSS FFF 111',
    tip: 'Kongs of North and South, a Flower Pung, and a Pung of ones. Plenty of room for jokers.',
  },
  {
    id: 'twinquints',
    name: 'Twin Quints',
    cat: 'Quints', value: 40, concealed: false, difficulty: 'Intermediate',
    slots: [A, B],
    groups: [g(5, num(5, A)), g(4, num(5, B)), g(3, fl()), g(2, drg('dr'))],
    pattern: '55555 5555 FFF DD  (two suits)',
    tip: 'A Quint (needs at least one joker) and a Kong of fives, plus Flowers and a Red pair. A joker magnet.',
  },
];

export const CATEGORIES = ['Like Numbers', 'Consecutive Run', 'Quints', 'Winds & Dragons', '2026', 'Singles & Pairs'];

export function handById(id) {
  return CARD.find((h) => h.id === id);
}
