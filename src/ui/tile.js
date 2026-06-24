import { tileInfo } from '../data/tiles.js';
import { el } from './dom.js';

// Render one tile. Beginner-friendly: every tile shows a big symbol AND a short
// word label so you never have to guess what you're holding.
export function tileEl(id, opts = {}) {
  const info = tileInfo(id);
  const cls = ['tile', `c-${info.color}`];
  if (opts.small) cls.push('small');
  if (opts.tiny) cls.push('tiny');
  if (opts.selected) cls.push('sel');
  if (opts.dim) cls.push('dim');
  if (opts.glow) cls.push('glow');
  if (opts.faceDown) {
    return el('div', { class: cls.concat('down').join(' ') }, el('div', { class: 'tback' }, el('span', {}, '🀄')));
  }
  const kids = [el('div', { class: 'tglyph' }, info.glyph)];
  if (opts.label !== false) kids.push(el('div', { class: 'tlabel' }, info.short));
  const t = el('div', { class: cls.join(' '), title: info.label }, ...kids);
  if (opts.badge) t.append(el('div', { class: 'tbadge' }, opts.badge));
  if (opts.onClick) { t.classList.add('click'); t.addEventListener('click', () => opts.onClick(id)); }
  return t;
}

export function tileRow(tiles, opts = {}) {
  const each = typeof opts.each === 'function' ? opts.each : () => opts;
  return el('div', { class: 'tilerow' + (opts.wrap ? ' wrap' : '') }, tiles.map((id, i) => tileEl(id, each(id, i))));
}
