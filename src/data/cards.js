// ---------------------------------------------------------------------------
// Card registry. The built-in "Practice Card" plus any number of CUSTOM cards
// the user types in (e.g. their official NMJL card). Custom cards live ONLY in
// this browser's localStorage — they are never uploaded or committed, which is
// the correct way to use a card you physically own for private practice.
// ---------------------------------------------------------------------------
import { CARD as PRACTICE_HANDS } from './card.js';

const PRACTICE = { id: 'practice', name: 'Practice Card (NMJL-style)', builtin: true, hands: PRACTICE_HANDS };

const LS_CARDS = 'mahjong.cards.v1';
const LS_ACTIVE = 'mahjong.activeCard.v1';

// Node-safe storage shim (tests / headless sims have no localStorage).
const LS = (typeof localStorage !== 'undefined') ? localStorage : { getItem: () => null, setItem: () => {} };

let _cache = null;
function customCards() {
  if (_cache) return _cache;
  try { _cache = JSON.parse(LS.getItem(LS_CARDS)) || []; }
  catch { _cache = []; }
  return _cache;
}
function persist(list) { _cache = list; LS.setItem(LS_CARDS, JSON.stringify(list)); }

export function allCards() { return [PRACTICE, ...customCards()]; }
export function getCard(id) { return allCards().find((c) => c.id === id) || PRACTICE; }

export function activeCardId() {
  const id = LS.getItem(LS_ACTIVE) || 'practice';
  return allCards().some((c) => c.id === id) ? id : 'practice';
}
export function setActiveCard(id) { LS.setItem(LS_ACTIVE, id); }
export function activeCard() { return getCard(activeCardId()); }
export function activeHands() { return activeCard().hands; }

export function upsertCard(card) {
  const list = customCards().slice();
  const i = list.findIndex((c) => c.id === card.id);
  if (i >= 0) list[i] = card; else list.push(card);
  persist(list);
}
export function deleteCard(id) {
  persist(customCards().filter((c) => c.id !== id));
  if (activeCardId() === id) setActiveCard('practice');
}
export function duplicateCard(id, newName) {
  const src = getCard(id);
  const copy = { id: newId(), name: newName || src.name + ' (copy)', hands: JSON.parse(JSON.stringify(src.hands)) };
  upsertCard(copy);
  return copy;
}

export const newId = () => 'card_' + Math.random().toString(36).slice(2, 9);
export const newHandId = () => 'h_' + Math.random().toString(36).slice(2, 9);

// JSON export/import for personal backup or moving between your own devices.
export function exportCard(id) {
  const c = getCard(id);
  return JSON.stringify({ name: c.name, hands: c.hands }, null, 2);
}
export function importCard(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  if (!data || !Array.isArray(data.hands)) throw new Error('Not a valid card file.');
  const card = { id: newId(), name: data.name || 'Imported Card', hands: data.hands };
  upsertCard(card);
  return card;
}

// Share a card as a copy-paste CODE (so it can move between your own devices
// without a file). Still 100% local — nothing leaves the device until you
// choose to copy/paste it yourself.
function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64decode(b64) {
  const bin = atob(b64.trim());
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
export function cardToCode(id) {
  const c = getCard(id);
  return 'MJC1:' + b64encode(JSON.stringify({ name: c.name, hands: c.hands }));
}
export function cardFromCode(code) {
  const raw = String(code).trim().replace(/^MJC1:/, '');
  return importCard(b64decode(raw));
}
