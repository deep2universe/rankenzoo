// Kleine Helfer.

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const easeOutBack = t => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
export const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export function fmt(n) {
  n = Math.floor(n);
  return n.toLocaleString('de-DE');
}
/** Zahl mit schmalem Leerzeichen als Tausendertrenner (Schulschreibweise). */
export function zahl(n) {
  const s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (n < 0 ? '−' : '') + s;
}

/** DOM-Helfer: h('div.klasse#id', {attr}, kinder...) */
export function h(sel, attrs, ...kids) {
  const [tag, ...rest] = sel.split(/(?=[.#])/);
  const el = document.createElement(tag || 'div');
  for (const r of rest) {
    if (r[0] === '.') el.classList.add(r.slice(1));
    else if (r[0] === '#') el.id = r.slice(1);
  }
  if (attrs != null && attrs !== false && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
    kids.unshift(attrs); attrs = null;
  }
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') {
        for (const [sk, sv] of Object.entries(v)) {
          if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv;
        }
      }
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}

// Wert-Rauschen für Texturen
export function makeNoise(seed = 1) {
  const r = mulberry32(seed);
  const p = new Float32Array(256 * 256);
  for (let i = 0; i < p.length; i++) p[i] = r();
  const smooth = t => t * t * (3 - 2 * t);
  const at = (x, y) => p[((y & 255) << 8) | (x & 255)];
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = smooth(x - xi), yf = smooth(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return lerp(lerp(a, b, xf), lerp(c, d, xf), yf);
  }
  return function fbm(x, y, oct = 4) {
    let v = 0, amp = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { v += amp * noise(x * f, y * f); f *= 2; amp *= 0.5; }
    return v;
  };
}

export function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
export function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  const m = c => clamp(Math.round(f >= 0 ? c + (255 - c) * f : c * (1 + f)), 0, 255);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

/** Wie el.replaceChildren, ignoriert aber null/false und flacht Arrays ab. */
export function fill(el, ...kids) {
  el.replaceChildren(...kids.flat(Infinity).filter(k => k != null && k !== false));
  return el;
}
