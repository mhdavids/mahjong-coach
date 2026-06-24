# 🀄 Mahjong Coach

Learn **American (NMJL-style) Mahjong** from absolute zero, then play **pass-and-play**
on one device with a partner against two computer opponents. Built for a real
couples' game night.

## What it does

- **Learn to Play** — a 10-page illustrated walkthrough (tiles, jokers, the
  Charleston, calling, scoring) for people who know nothing.
- **Play a Game** — two humans share the device (pass-and-play handoffs hide each
  hand until it's that player's turn) plus two AI players named Sage & Pixel.
- **The Coach** — an optional in-game tutor that shows your closest hands, what
  you still need, which tiles to keep, and which to toss, with explanations.
- **The Card / Rules** — a browsable practice card and a full rules reference,
  reachable any time.

## ⚠️ About the hands

The National Mah Jongg League's official card is **copyrighted and reissued every
April**, so this app does **not** reproduce it. Instead it ships **original
practice hands written in the NMJL style** so you can learn how to *read* a card
and how the game *feels*. The mechanics — Charleston, jokers, calling/exposing,
win detection, scoring — are the real thing. At your actual game night, read the
hands off the official card you buy from
[nationalmahjonggleague.org](https://www.nationalmahjonggleague.org/).

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

## Tests

The rules engine and a 400-game self-play simulation are covered by headless
checks:

```bash
node test-engine.mjs   # hand-matching, jokers, scoring eligibility
node test-sim.mjs      # full AI-vs-AI games terminate, scoring is zero-sum
```

## Tech

Vanilla JS + [Vite](https://vitejs.dev/). No backend — everything runs in the
browser. Tiles are DOM elements with both a symbol and a plain-English label so a
true beginner is never guessing.
