// Generate PNG app icons (no image deps — hand-rolled PNG encoder).
// Design: green gradient background + an ivory mahjong tile with the three
// suit colors (red / green / blue) as dots.
import zlib from 'node:zlib';
import fs from 'node:fs';

const crcTable = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (buf) => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function px(x, y, S) {
  const t = y / S;
  let r = Math.round(20 + (12 - 20) * t), g = Math.round(84 + (59 - 84) * t), b = Math.round(63 + (46 - 63) * t);
  const m = S * 0.18, x0 = m, x1 = S - m, y0 = m, y1 = S - m, rad = S * 0.12;
  if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
    let inside = true;
    if (x < x0 + rad && y < y0 + rad) { if ((x - (x0 + rad)) ** 2 + (y - (y0 + rad)) ** 2 > rad * rad) inside = false; }
    else if (x > x1 - rad && y < y0 + rad) { if ((x - (x1 - rad)) ** 2 + (y - (y0 + rad)) ** 2 > rad * rad) inside = false; }
    else if (x < x0 + rad && y > y1 - rad) { if ((x - (x0 + rad)) ** 2 + (y - (y1 - rad)) ** 2 > rad * rad) inside = false; }
    else if (x > x1 - rad && y > y1 - rad) { if ((x - (x1 - rad)) ** 2 + (y - (y1 - rad)) ** 2 > rad * rad) inside = false; }
    if (inside) {
      r = 246; g = 239; b = 221;
      const cy = S * 0.5, dotR = S * 0.062;
      const dots = [[S * 0.355, [192, 57, 43]], [S * 0.5, [47, 143, 87]], [S * 0.645, [43, 111, 179]]];
      for (const [cx, col] of dots) if ((x - cx) ** 2 + (y - cy) ** 2 <= dotR * dotR) { [r, g, b] = col; }
    }
  }
  return [r, g, b];
}

function genIcon(S) {
  const raw = Buffer.alloc(S * (S * 3 + 1));
  let p = 0;
  for (let y = 0; y < S; y++) { raw[p++] = 0; for (let x = 0; x < S; x++) { const [r, g, b] = px(x, y, S); raw[p++] = r; raw[p++] = g; raw[p++] = b; } }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const out = new URL('../public/', import.meta.url);
for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  fs.writeFileSync(new URL(name, out), genIcon(size));
  console.log('wrote', name, size + 'px');
}
