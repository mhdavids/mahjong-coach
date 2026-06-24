import { el, clear } from './dom.js';

const root = () => document.getElementById('modal-root');

function show(node, { dim = true } = {}) {
  const ov = el('div', { class: 'overlay' + (dim ? '' : ' clear') }, node);
  root().append(ov);
  return ov;
}

export function closeAll() { clear(root()); }

// Pass-and-play handoff: blocks until the next player taps that they're ready.
export function handoff(name, sub) {
  return new Promise((res) => {
    const ov = show(
      el('div', { class: 'card handoff' },
        el('div', { class: 'hbig' }, '🔄'),
        el('div', { class: 'muted' }, 'Pass the device to'),
        el('div', { class: 'pname' }, name),
        sub ? el('p', { class: 'muted' }, sub) : null,
        el('button', { class: 'btn primary big', onClick: () => { ov.remove(); res(); } }, `I'm ${name} — reveal my tiles`),
      ),
    );
  });
}

export function confirmBox({ title, body, yes = 'Yes', no = 'No', icon }) {
  return new Promise((res) => {
    const ov = show(
      el('div', { class: 'card' },
        icon ? el('div', { class: 'hbig' }, icon) : null,
        el('h2', {}, title),
        body ? el('p', { class: 'muted' }, body) : null,
        el('div', { class: 'row gap' },
          el('button', { class: 'btn', onClick: () => { ov.remove(); res(false); } }, no),
          el('button', { class: 'btn primary', onClick: () => { ov.remove(); res(true); } }, yes),
        ),
      ),
    );
  });
}

export function chooseBox({ title, body, options }) {
  return new Promise((res) => {
    const ov = show(
      el('div', { class: 'card' },
        el('h2', {}, title),
        body ? el('p', { class: 'muted' }, typeof body === 'string' ? body : '') : null,
        body && typeof body !== 'string' ? body : null,
        el('div', { class: 'col gap' },
          options.map((o) => el('button', { class: 'btn ' + (o.primary ? 'primary' : '') + (o.danger ? ' danger' : ''), onClick: () => { ov.remove(); res(o.value); } }, o.label)),
        ),
      ),
    );
  });
}

export function infoBox({ title, bodyNode, button = 'Got it' }) {
  return new Promise((res) => {
    const ov = show(
      el('div', { class: 'card scroll' },
        el('h2', {}, title),
        bodyNode,
        el('button', { class: 'btn primary', onClick: () => { ov.remove(); res(); } }, button),
      ),
    );
  });
}

export function toast(msg, ms = 1800) {
  const r = document.getElementById('toast-root');
  const t = el('div', { class: 'toast' }, msg);
  r.append(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, ms);
}
