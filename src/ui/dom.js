// tiny hyperscript helper so the rest of the UI reads cleanly
export function el(tag, props = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return e;
}
export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
export function mount(node, child) { clear(node); node.append(child); }
export const $ = (sel) => document.querySelector(sel);
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
