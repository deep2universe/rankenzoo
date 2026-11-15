// Kulissen der Gegenden (biome.js): Himmel-Tönung, ferner Hintergrund (Parallaxe-Panoramen),
// nahe Wahrzeichen hinter dem Hügel, Bewuchs & Dinge auf der Wiese und kleine Animationen.
//
// Alles Teure wird beim Wechsel der Kolonie EINMAL in Offscreen-Canvas gemalt:
//   fern / mitte  Panoramen (Bildschirmraum, Parallaxe 0.15 / 0.3) – je eine Tag- und Nachtfassung
//   nah           Weltraum-Bild hinter dem Gelände (wird im staticLayer des Renderers mitkopiert)
//   bewuchs       Grasnarbe & Pflanzen vor dem Hügel (ersetzt das Gras-Bild; wird neu gebaut,
//                 wenn der Hügel wächst oder Oberflächen-Gebäude dazukommen)
// Pro Bild läuft nur `anim` (ein paar Linien, Punkte & Lichtscheine).
import { TILE as T, COLS, GROUND } from '../game/config.js';
import { mulberry32, clamp } from '../util.js';
import { biom } from '../game/biome.js';
import { drawGlow } from './sprites.js';

const W = COLS * T, GY = GROUND * T, TAU = Math.PI * 2;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const hell = (c, k) => (k > 0 ? mix(c, [255, 255, 255], k) : mix(c, [0, 0, 0], -k));
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const col = c => (typeof c === 'string' ? hex(c) : c);

// ---------------------------------------------------------------------------
// Gemeinsame Daten für Gelände & Kulisse
// ---------------------------------------------------------------------------
/** Wo große Pflanzen stehen – deren Wurzeln zeichnet terrain.js in den Boden. */
const WURZELN = {
  lichtung: [{ x: 330, n: 8, len: 40, dicke: 6 }, { x: 1660, n: 8, len: 40, dicke: 6 }],
  wald: [{ x: 120, n: 7, len: 55, dicke: 8 }, { x: 560, n: 7, len: 55, dicke: 8 }, { x: 1440, n: 7, len: 55, dicke: 8 }, { x: 1800, n: 5, len: 40, dicke: 6 }],
  stumpf: [{ x: 1440, n: 9, len: 60, dicke: 11, breite: 340, farbe: 'rgba(120,80,48,.85)' }],
  obstwiese: [{ x: 330, n: 9, len: 46, dicke: 7 }, { x: 1640, n: 9, len: 46, dicke: 7 }],
  baumhaus: [{ x: 1480, n: 11, len: 70, dicke: 15, breite: 220, farbe: 'rgba(150,104,62,.95)' }, { x: 1480, n: 10, len: 40, dicke: 5, breite: 600 }],
  heide: [{ x: 300, n: 6, len: 36, dicke: 5 }, { x: 1660, n: 6, len: 36, dicke: 5 }],
  topf: [{ x: 1500, n: 14, len: 40, dicke: 4, breite: 160 }, { x: 480, n: 8, len: 30, dicke: 3, breite: 100 }],
  kompost: [{ x: 1800, n: 4, len: 30, dicke: 4 }],
  gewaechshaus: [{ x: 380, n: 6, len: 26, dicke: 3, breite: 160 }, { x: 1500, n: 6, len: 26, dicke: 3, breite: 160 }],
};
export const biomWurzeln = key => WURZELN[key] ?? [];

/** Karotten & Radieschen im Gemüsegarten (oben das Grün, unten im Boden die Rübe). */
let beeteCache = null;
export function gartenBeete() {
  if (beeteCache) return beeteCache;
  const rnd = mulberry32(777);
  const out = [];
  for (let x = 24; x < W - 20; x += 34 + rnd() * 30) {
    const art = rnd() < 0.62 ? 'karotte' : 'radieschen';
    out.push({ x, art, s: 0.8 + rnd() * 0.4 });
  }
  return (beeteCache = out);
}

// ---------------------------------------------------------------------------
// Malwerkzeuge
// ---------------------------------------------------------------------------
function lg(o, x0, y0, x1, y1, ...stops) {
  const g = o.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), typeof c === 'string' ? c : rgb(c)));
  return g;
}
function kreis(o, x, y, r, c) { o.fillStyle = c; o.beginPath(); o.arc(x, y, r, 0, TAU); o.fill(); }
function oval(o, x, y, a, b, c, rot = 0) { o.fillStyle = c; o.beginPath(); o.ellipse(x, y, Math.max(0.1, a), Math.max(0.1, b), rot, 0, TAU); o.fill(); }
function linie(o, c, w, ...p) { o.strokeStyle = c; o.lineWidth = w; o.beginPath(); o.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) o.lineTo(p[i], p[i + 1]); o.stroke(); }
function kurve(o, c, w, x0, y0, cx, cy, x1, y1) { o.strokeStyle = c; o.lineWidth = w; o.beginPath(); o.moveTo(x0, y0); o.quadraticCurveTo(cx, cy, x1, y1); o.stroke(); }

/** Laubbaum: s=1 → ca. 420 hoch. opt: laub (Farben), dunkel, frucht, fruchtN, kirsche, stamm */
function laubbaum(o, x, gy, s, rnd, opt = {}) {
  const laub = opt.laub ?? ['#2f7d32', '#3d9a3a', '#4cb04a', '#5fc957', '#2a6b2c'];
  const st = opt.stamm ?? ['#5a3a22', '#3a2414'];
  o.save(); o.translate(x, gy); o.scale(s, s);
  o.fillStyle = lg(o, -20, 0, 20, 0, st[0], st[1]);
  o.beginPath(); o.moveTo(-24, 0); o.quadraticCurveTo(-12, -160, -18, -250); o.lineTo(18, -250); o.quadraticCurveTo(12, -160, 26, 0); o.fill();
  o.fillStyle = 'rgba(0,0,0,.18)'; for (let k = 0; k < 7; k++) o.fillRect(-10 + rnd() * 20, -20 - rnd() * 200, 1.6, 14 + rnd() * 20);
  o.strokeStyle = st[0]; o.lineCap = 'round'; o.lineWidth = 10;
  o.beginPath(); o.moveTo(-2, -190); o.quadraticCurveTo(-50, -230, -70, -270); o.stroke();
  o.beginPath(); o.moveTo(2, -210); o.quadraticCurveTo(50, -250, 70, -290); o.stroke();
  const n = opt.n ?? 34;
  for (let k = 0; k < n; k++) {
    const a = rnd() * TAU, rr = rnd() * 105;
    const bx = Math.cos(a) * rr * 1.15, by = -285 + Math.sin(a) * rr * 0.8;
    const r = 30 + rnd() * 28;
    const g = o.createRadialGradient(bx - r * 0.3, by - r * 0.4, r * 0.2, bx, by, r);
    g.addColorStop(0, laub[(rnd() * laub.length) | 0]); g.addColorStop(1, opt.dunkel ?? '#1f5a22');
    o.fillStyle = g; o.beginPath(); o.arc(bx, by, r, 0, TAU); o.fill();
  }
  const fn = opt.fruchtN ?? 0;
  for (let k = 0; k < fn; k++) {
    const fx = -110 + rnd() * 220, fy = -380 + rnd() * 180;
    if (((fx / 125) ** 2 + ((fy + 285) / 95) ** 2) > 1) continue;
    if (opt.kirsche) {
      linie(o, '#4a6a2a', 1.4, fx, fy - 9, fx - 4, fy, fx, fy - 9, fx + 5, fy + 1);
      kreis(o, fx - 4, fy + 2, 5, opt.frucht); kreis(o, fx + 5, fy + 3, 5, opt.frucht);
      kreis(o, fx - 5.5, fy, 1.6, 'rgba(255,255,255,.6)'); kreis(o, fx + 3.5, fy + 1, 1.6, 'rgba(255,255,255,.6)');
    } else {
      const r = opt.fruchtR ?? 9;
      kreis(o, fx, fy, r, opt.frucht ?? '#e8463c');
      oval(o, fx - r * 0.35, fy - r * 0.35, r * 0.35, r * 0.25, 'rgba(255,255,255,.45)', -0.5);
      linie(o, '#5a3a22', 1.5, fx, fy - r + 1, fx + 1, fy - r - 4);
      oval(o, fx + 4, fy - r - 3, 4, 2, '#4cb04a', -0.4);
    }
  }
  o.restore();
}
/** Tanne mit hängenden Zweig-Etagen. */
function tanne(o, x, gy, h, c, rnd, stamm = true) {
  c = col(c);
  if (stamm) { o.fillStyle = lg(o, x - h * 0.03, 0, x + h * 0.03, 0, '#6a4428', '#3a2414'); o.fillRect(x - h * 0.028, gy - h * 0.2, h * 0.056, h * 0.2); }
  const n = 8;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const yb = gy - h * 0.1 - t * h * 0.84, yt = yb - h * 0.2;
    const bw = h * 0.34 * (1 - t * 0.85) + h * 0.03;
    const cc = hell(c, -0.12 + t * 0.12);
    o.fillStyle = lg(o, x - bw, 0, x + bw, 0, rgb(hell(cc, 0.12)), rgb(cc), rgb(hell(cc, -0.3)));
    o.beginPath(); o.moveTo(x, yt);
    o.quadraticCurveTo(x - bw * 0.45, yb - h * 0.08, x - bw, yb + h * 0.012);
    for (let k = 1; k <= 6; k++) o.quadraticCurveTo(x - bw + (k - 0.5) * bw / 3, yb - h * 0.02 * (rnd() + 0.3), x - bw + k * bw / 3, yb + h * 0.012 * (k % 2 ? 0.2 : 1));
    o.quadraticCurveTo(x + bw * 0.45, yb - h * 0.08, x, yt);
    o.fill();
  }
}
/** Birke: weißer Stamm mit schwarzen Flecken, helles Laub. */
function birke(o, x, gy, h, rnd, laub = ['#8fcf5a', '#a8dc6a', '#74b84a', '#c0e888']) {
  const sw = h * 0.045;
  o.fillStyle = lg(o, x - sw, 0, x + sw, 0, '#ffffff', '#ece8e0', '#bdb6ac');
  o.beginPath(); o.moveTo(x - sw, gy); o.quadraticCurveTo(x - sw * 0.6, gy - h * 0.5, x - sw * 0.3, gy - h * 0.92); o.lineTo(x + sw * 0.3, gy - h * 0.92); o.quadraticCurveTo(x + sw * 0.6, gy - h * 0.5, x + sw, gy); o.fill();
  for (let k = 0; k < 16; k++) { const yy = gy - rnd() * h * 0.85, ww = sw * (0.5 + rnd() * 0.9); o.fillStyle = '#2a2622'; o.fillRect(x - ww / 2 + (rnd() - 0.5) * sw, yy, ww, 1.5 + rnd() * 2.5); }
  o.strokeStyle = '#d8d2c8'; o.lineCap = 'round';
  for (let k = 0; k < 7; k++) {
    const yy = gy - h * (0.45 + k * 0.07), d = k % 2 ? 1 : -1;
    o.lineWidth = Math.max(1, sw * 0.35); o.beginPath(); o.moveTo(x, yy); o.quadraticCurveTo(x + d * h * 0.1, yy - h * 0.05, x + d * h * 0.18, yy + h * 0.02); o.stroke();
  }
  for (let k = 0; k < 40; k++) {
    const a = rnd() * TAU, rr = Math.sqrt(rnd());
    const bx = x + Math.cos(a) * rr * h * 0.24, by = gy - h * 0.72 + Math.sin(a) * rr * h * 0.24;
    const r = h * (0.035 + rnd() * 0.045);
    oval(o, bx, by, r, r * 0.85, laub[(rnd() * laub.length) | 0]);
  }
  // hängende Zweige
  o.strokeStyle = 'rgba(90,140,60,.6)'; o.lineWidth = 1;
  for (let k = 0; k < 10; k++) { const bx = x + (rnd() - 0.5) * h * 0.4, by = gy - h * (0.6 + rnd() * 0.2); o.beginPath(); o.moveTo(bx, by); o.quadraticCurveTo(bx + 3, by + h * 0.08, bx + 1, by + h * 0.14); o.stroke(); }
}
function wacholder(o, x, gy, h, c = [46, 84, 52], rnd) {
  c = col(c);
  o.fillStyle = lg(o, x - h * 0.2, 0, x + h * 0.2, 0, rgb(hell(c, 0.15)), rgb(c), rgb(hell(c, -0.35)));
  o.beginPath(); o.moveTo(x, gy - h);
  o.bezierCurveTo(x + h * 0.2, gy - h * 0.7, x + h * 0.24, gy - h * 0.2, x + h * 0.12, gy);
  o.lineTo(x - h * 0.12, gy);
  o.bezierCurveTo(x - h * 0.24, gy - h * 0.2, x - h * 0.2, gy - h * 0.7, x, gy - h);
  o.fill();
  for (let k = 0; k < 30; k++) { const yy = gy - rnd() * h * 0.95, ww = h * 0.18 * Math.sin((1 - (gy - yy) / h) * Math.PI) + 2; oval(o, x + (rnd() - 0.5) * ww * 1.6, yy, 3, 6, rgb(hell(c, rnd() < 0.5 ? 0.2 : -0.25), 0.6), rnd()); }
  for (let k = 0; k < 8; k++) kreis(o, x + (rnd() - 0.5) * h * 0.2, gy - rnd() * h * 0.8, 1.8, '#5a6a9a');
}
function busch(o, x, gy, r, c, rnd, n = 12) {
  c = col(c);
  for (let k = 0; k < n; k++) {
    const a = Math.PI + rnd() * Math.PI, rr = rnd() * r * 0.7;
    const bx = x + Math.cos(a) * rr * 1.4, by = gy - r * 0.45 + Math.sin(a) * rr * 0.6;
    const br = r * (0.35 + rnd() * 0.3);
    const g = o.createRadialGradient(bx - br * 0.3, by - br * 0.4, br * 0.1, bx, by, br);
    g.addColorStop(0, rgb(hell(c, 0.22))); g.addColorStop(1, rgb(hell(c, -0.2)));
    o.fillStyle = g; o.beginPath(); o.arc(bx, by, br, 0, TAU); o.fill();
  }
}
/** Pilz: art 'fliegen' | 'stein' | 'leucht' | 'klein' */
function pilz(o, x, gy, s, art = 'fliegen', rnd = Math.random) {
  const sh = 60 * s, sw = 13 * s, cw = 46 * s, ch = 30 * s;
  const stiel = art === 'stein' ? ['#f2e6cc', '#cdb48a'] : art === 'leucht' ? ['#e8fff8', '#9ad8c8'] : ['#fffaf0', '#d8ccb8'];
  const bauch = art === 'stein' ? 1.5 : 1;
  o.fillStyle = lg(o, x - sw, 0, x + sw, 0, stiel[0], stiel[1]);
  o.beginPath(); o.moveTo(x - sw * 0.8, gy - sh); o.quadraticCurveTo(x - sw * bauch * 1.1, gy - sh * 0.3, x - sw, gy); o.lineTo(x + sw, gy); o.quadraticCurveTo(x + sw * bauch * 1.1, gy - sh * 0.3, x + sw * 0.8, gy - sh); o.fill();
  if (art === 'fliegen') { oval(o, x, gy - sh * 0.62, sw * 1.15, 3.5 * s, '#fff8ea'); oval(o, x, gy - sh * 0.6, sw * 1.15, 2 * s, 'rgba(200,180,150,.6)'); }
  const kappe = { fliegen: ['#ff6a50', '#d8262a', '#8e1418'], stein: ['#b07a46', '#7a4a26', '#4a2a14'], leucht: ['#b0fff0', '#40d8c0', '#1a8a90'], klein: ['#e89a5a', '#b05a2a', '#7a3414'] }[art];
  o.fillStyle = 'rgba(0,0,0,.22)'; o.beginPath(); o.ellipse(x, gy - sh + 2 * s, cw * 0.92, 6 * s, 0, 0, TAU); o.fill();
  o.fillStyle = lg(o, x - cw * 0.6, gy - sh - ch, x + cw * 0.6, gy - sh, kappe[0], kappe[1], kappe[2]);
  o.beginPath(); o.moveTo(x - cw, gy - sh + 2 * s); o.bezierCurveTo(x - cw, gy - sh - ch * 1.3, x + cw, gy - sh - ch * 1.3, x + cw, gy - sh + 2 * s);
  o.quadraticCurveTo(x, gy - sh + 8 * s, x - cw, gy - sh + 2 * s); o.fill();
  oval(o, x - cw * 0.35, gy - sh - ch * 0.62, cw * 0.32, ch * 0.18, 'rgba(255,255,255,.28)', -0.3);
  if (art === 'fliegen') {
    for (let k = 0; k < 9; k++) {
      const a = Math.PI + 0.25 + (k / 8) * (Math.PI - 0.5), rr = 0.45 + (k % 3) * 0.2;
      oval(o, x + Math.cos(a) * cw * rr, gy - sh - ch * 0.35 + Math.sin(a) * ch * rr * 0.9, 4.5 * s * (0.7 + (k % 2) * 0.4), 3.5 * s, '#fffaf0');
    }
  }
}
function blume(o, x, y, r, c, mitte = '#ffd84a', n = 5, rot = 0) {
  o.fillStyle = c;
  for (let k = 0; k < n; k++) { const a = rot + k * TAU / n; o.beginPath(); o.ellipse(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.55, r * 0.36, a, 0, TAU); o.fill(); }
  kreis(o, x, y, r * 0.38, mitte);
}
function margerite(o, x, y, r) {
  o.fillStyle = '#ffffff';
  for (let k = 0; k < 14; k++) { const a = k * TAU / 14; o.beginPath(); o.ellipse(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.5, r * 0.15, a, 0, TAU); o.fill(); }
  kreis(o, x, y, r * 0.32, '#ffcf2a'); kreis(o, x - r * 0.08, y - r * 0.08, r * 0.14, '#ffe680');
}
function mohn(o, x, y, r) {
  o.fillStyle = '#e8262a';
  for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + 0.4; o.beginPath(); o.ellipse(x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42, r * 0.62, r * 0.5, a, 0, TAU); o.fill(); }
  o.fillStyle = 'rgba(255,120,100,.6)'; o.beginPath(); o.ellipse(x - r * 0.3, y - r * 0.35, r * 0.35, r * 0.2, -0.4, 0, TAU); o.fill();
  kreis(o, x, y, r * 0.22, '#1a1416');
}
function kornblume(o, x, y, r) {
  o.fillStyle = '#3a6ee8';
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8; o.beginPath(); o.moveTo(x, y); o.lineTo(x + Math.cos(a - 0.25) * r, y + Math.sin(a - 0.25) * r); o.lineTo(x + Math.cos(a + 0.25) * r, y + Math.sin(a + 0.25) * r); o.fill(); }
  kreis(o, x, y, r * 0.3, '#5a3ab0');
}
function stiel(o, x, gy, h, c = '#3e8e2e', w = 1.4, bieg = 4) { kurve(o, c, w, x, gy, x + bieg, gy - h * 0.5, x + bieg * 0.4, gy - h); return [x + bieg * 0.4, gy - h]; }
function halm(o, x, gy, h, c, w = 1.2, bieg = 6) { o.strokeStyle = c; o.lineWidth = w; o.beginPath(); o.moveTo(x, gy); o.quadraticCurveTo(x + bieg * 0.3, gy - h * 0.6, x + bieg, gy - h); o.stroke(); }
function grasbueschel(o, x, gy, h, c, rnd, n = 9) {
  c = col(c);
  o.lineCap = 'round';
  for (let k = 0; k < n; k++) halm(o, x + (rnd() - 0.5) * 6, gy, h * (0.5 + rnd() * 0.6), rgb(hell(c, (rnd() - 0.5) * 0.4)), 1 + rnd(), (rnd() - 0.5) * h * 0.7);
}
function aehre(o, x, gy, h, c, rnd, bieg = 6) {
  c = col(c);
  halm(o, x, gy, h, rgb(hell(c, -0.12)), 1.2, bieg);
  const tx = x + bieg, ty = gy - h, a = Math.atan2(-h * 0.4, bieg * 0.7) + Math.PI / 2;
  o.save(); o.translate(tx, ty); o.rotate(a * 0.3);
  for (let k = 0; k < 6; k++) {
    for (const d of [-1, 1]) {
      oval(o, d * 2, -k * 3.4, 1.9, 3, rgb(hell(c, (k % 2) * 0.12)), d * 0.4);
      linie(o, rgb(hell(c, 0.15), 0.8), 0.5, d * 2.2, -k * 3.4 - 2, d * 5, -k * 3.4 - 9);
    }
  }
  o.restore();
}
function rohrkolben(o, x, gy, h, bieg = 3) {
  halm(o, x, gy, h, '#5a8a3a', 2, bieg);
  const tx = x + bieg, ty = gy - h;
  o.fillStyle = lg(o, tx - 4, 0, tx + 4, 0, '#8a5a32', '#5a3418'); o.beginPath(); o.roundRect(tx - 4, ty + 4, 8, h * 0.18, 4); o.fill();
  linie(o, '#5a8a3a', 1.2, tx, ty + 4, tx, ty - 8);
}
function schilf(o, x, gy, h, rnd, c = [90, 150, 70]) {
  c = col(c);
  for (let k = 0; k < 5; k++) {
    const b = (rnd() - 0.5) * h * 0.5, hh = h * (0.6 + rnd() * 0.5);
    o.fillStyle = rgb(hell(c, (rnd() - 0.5) * 0.3));
    o.beginPath(); o.moveTo(x - 2 + k, gy); o.quadraticCurveTo(x + b * 0.3, gy - hh * 0.6, x + b, gy - hh); o.quadraticCurveTo(x + b * 0.3 + 3, gy - hh * 0.6, x + 3 + k, gy); o.fill();
  }
}
function stein(o, x, gy, w, h, c1, c2, moos = false) {
  o.fillStyle = 'rgba(20,15,10,.25)'; o.beginPath(); o.ellipse(x + w * 0.08, gy, w * 0.55, h * 0.12, 0, 0, TAU); o.fill();
  o.fillStyle = lg(o, 0, gy - h, 0, gy, c1, c2);
  o.beginPath(); o.moveTo(x - w / 2, gy); o.bezierCurveTo(x - w / 2, gy - h * 0.8, x - w * 0.25, gy - h, x, gy - h); o.bezierCurveTo(x + w * 0.3, gy - h, x + w / 2, gy - h * 0.7, x + w / 2, gy); o.fill();
  oval(o, x - w * 0.15, gy - h * 0.72, w * 0.18, h * 0.1, 'rgba(255,255,255,.3)', -0.2);
  if (moos) { o.fillStyle = 'rgba(110,160,70,.8)'; o.beginPath(); o.ellipse(x - w * 0.05, gy - h * 0.93, w * 0.28, h * 0.12, 0, Math.PI, TAU); o.fill(); }
}
/** Lichtstrahlen schräg von oben. */
function strahlen(o, x0, x1, y0, y1, n, rnd, a = 0.16) {
  for (let k = 0; k < n; k++) {
    const x = x0 + rnd() * (x1 - x0), w = 30 + rnd() * 60, d = 160 + rnd() * 120;
    o.fillStyle = lg(o, 0, y0, 0, y1, `rgba(255,246,200,${a})`, 'rgba(255,246,200,0)');
    o.beginPath(); o.moveTo(x, y0); o.lineTo(x + w, y0); o.lineTo(x + w + d + w, y1); o.lineTo(x + d, y1); o.fill();
  }
}
function nebel(o, x, y, w, h, a = 0.35) {
  const g = o.createRadialGradient(x, y, 0, x, y, w);
  g.addColorStop(0, `rgba(240,244,255,${a})`); g.addColorStop(1, 'rgba(240,244,255,0)');
  o.save(); o.translate(x, y); o.scale(1, h / w); o.translate(-x, -y);
  o.fillStyle = g; o.beginPath(); o.arc(x, y, w, 0, TAU); o.fill(); o.restore();
}

// ---------------------------------------------------------------------------
// Panorama-Werkzeuge (Koordinaten: u = Panorama-x, Boden bei P.G, Höhe nach oben)
// ---------------------------------------------------------------------------
const PU0 = -140, PW = 2960, PH = 600, PG = 560;
function kamm(o, P, fn, c1, c2, schritt = 8) {
  o.fillStyle = lg(o, 0, P.G - 300, 0, P.G + 40, c1, c2 ?? c1);
  o.beginPath(); o.moveTo(PU0, PH);
  for (let u = PU0; u <= PU0 + PW; u += schritt) o.lineTo(u, P.G - fn(u));
  o.lineTo(PU0 + PW, PH); o.fill();
}
const welle = (base, amp, f, ph = 0) => u => base + Math.sin(u * f + ph) * amp * 0.6 + Math.sin(u * f * 2.3 + 1 + ph) * amp * 0.4;
function baumreihe(o, P, yfn, r, c, rnd, opt = {}) {
  c = col(c);
  const step = opt.step ?? r * 0.7;
  for (let u = PU0 - r; u < PU0 + PW + r; u += step * (0.6 + rnd() * 0.8)) {
    if (opt.luecke && opt.luecke(u)) continue;
    const y = P.G - yfn(u), rr = r * (0.7 + rnd() * 0.6);
    const cc = hell(c, (rnd() - 0.5) * 0.12);
    if (opt.stamm) { o.fillStyle = rgb(hell(cc, -0.35)); o.fillRect(u - rr * 0.08, y - rr * 0.2, rr * 0.16, P.G - y + rr * 0.2 + 40); }
    const top = y - (opt.hoch ?? rr * 1.1);
    o.fillStyle = rgb(cc); o.beginPath(); o.ellipse(u, top, rr, rr * (opt.oval ?? 0.95), 0, 0, TAU); o.fill();
    o.fillStyle = rgb(hell(cc, 0.1)); o.beginPath(); o.ellipse(u - rr * 0.25, top - rr * 0.25, rr * 0.55, rr * 0.45, 0, 0, TAU); o.fill();
    if (!opt.stamm) { o.fillStyle = rgb(cc); o.fillRect(u - rr, top, rr * 2, P.G - top + 40); }
  }
}
function tannenreihe(o, P, yfn, h, c, rnd, dichte = 0.32) {
  c = col(c);
  for (let u = PU0 - 40; u < PU0 + PW + 40; u += h * dichte * (0.5 + rnd())) {
    const hh = h * (0.65 + rnd() * 0.6), y = P.G - yfn(u);
    const cc = hell(c, (rnd() - 0.5) * 0.14);
    o.fillStyle = rgb(cc);
    o.beginPath(); o.moveTo(u, y - hh);
    for (let k = 1; k <= 5; k++) { const t = k / 5; o.lineTo(u + hh * 0.2 * t + 3, y - hh + hh * t * 0.95 - hh * 0.06); o.lineTo(u + hh * 0.11 * t, y - hh + hh * t * 0.95); }
    for (let k = 5; k >= 1; k--) { const t = k / 5; o.lineTo(u - hh * 0.11 * t, y - hh + hh * t * 0.95); o.lineTo(u - hh * 0.2 * t - 3, y - hh + hh * t * 0.95 - hh * 0.06); }
    o.lineTo(u, y - hh); o.fill();
    o.fillRect(u - hh * 0.2, y - 2, hh * 0.4, P.G - y + 42);
  }
}
/** Punkte (Blüten etc.) auf einer Fläche unterhalb von fn verteilen. */
function tupfen(o, P, fn, n, farben, rnd, r0, r1, tiefe = 120) {
  for (let i = 0; i < n; i++) {
    const u = PU0 + rnd() * PW, top = P.G - fn(u), y = top + 4 + rnd() * Math.max(4, Math.min(tiefe, P.G - top));
    const k = clamp((y - top) / 160, 0, 1);
    kreis(o, u, y, r0 + (r1 - r0) * (0.4 + k * 0.6) * rnd(), farben[(rnd() * farben.length) | 0]);
  }
}

// ---------------------------------------------------------------------------
// Die Gegenden
// ---------------------------------------------------------------------------
// Jede Gegend: fern(o,P) / mitte(o,P) im Panorama, nah(o,N) im Weltraum hinter dem Gelände,
// vorne(o,V) Pflanzen/Dinge auf der Wiese, gras: Feinheiten der Grasnarbe, anim(ctx,t,nacht,A)
// P/N/V: { rnd, B, dunst(c,k) }   V zusätzlich: frei(x, breite) → darf hier etwas Großes stehen?
const GEGEND = {};

// ----- Sonnige Lichtung -----
GEGEND.lichtung = {
  fern(o, P) {
    kamm(o, P, welle(110, 50, 0.004), P.dunst([130, 190, 110], 0.5), P.dunst([110, 170, 90], 0.45));
    baumreihe(o, P, welle(110, 50, 0.004), 30, P.dunst([70, 130, 70], 0.5), P.rnd);
  },
  mitte(o, P) {
    const f = welle(40, 16, 0.006, 2);
    baumreihe(o, P, u => f(u) + 60 + Math.sin(u * 0.013) * 30, 46, P.dunst([52, 112, 52], 0.18), P.rnd, { step: 34 });
    tannenreihe(o, P, u => f(u) + 30, 210, P.dunst([40, 92, 54], 0.18), P.rnd, 1.6);
    baumreihe(o, P, f, 38, P.dunst([62, 128, 56], 0.1), P.rnd, { step: 30, hoch: 10 });
    kamm(o, P, u => f(u) - 6, P.dunst([120, 180, 70], 0.05), [100, 160, 60]);
  },
  nah(o, N) {
    laubbaum(o, -40, GY, 1.1, N.rnd, { laub: ['#4a9a3a', '#5fb447', '#74c450', '#3d8a32'] });
    laubbaum(o, 330, GY, 1.25, N.rnd, { laub: ['#4a9a3a', '#5fb447', '#74c450', '#3d8a32'] });
    laubbaum(o, 1660, GY, 1.15, N.rnd, { laub: ['#4a9a3a', '#5fb447', '#74c450', '#3d8a32'] });
    strahlen(o, -200, 1500, -330, GY, 8, N.rnd, 0.17);
    for (const [x, w] of [[560, 46], [1400, 60], [1480, 34]]) stein(o, x, GY + 4, w, w * 0.55, '#d8c8b0', '#9a8a74');
  },
  vorne(o, V) {
    const { rnd } = V;
    for (let i = 0; i < 70; i++) { const x = rnd() * W; aehre(o, x, V.gy, V.frei(x, 6) ? 30 + rnd() * 26 : 14 + rnd() * 6, [214, 182, 96], rnd, (rnd() - 0.3) * 8); }
    for (let i = 0; i < 46; i++) { const x = rnd() * W, h = V.frei(x, 10) ? 18 + rnd() * 20 : 8 + rnd() * 8; const [bx, by] = stiel(o, x, V.gy, h); margerite(o, bx, by, 4 + rnd() * 2.5); }
    for (let i = 0; i < 6; i++) { const x = rnd() * W; if (V.frei(x, 30)) stein(o, x, V.gy + 3, 20 + rnd() * 18, 12 + rnd() * 8, '#dccdb6', '#a0907a'); }
  },
  insekten: 'falter',
};

// ----- Bunte Blumenwiese -----
const BLUETEN = ['#ff6b8b', '#ffd34d', '#ffffff', '#b07cff', '#5fb4ff', '#ff9f43', '#ff4a5a'];
GEGEND.blumen = {
  fern(o, P) {
    const f = welle(100, 60, 0.0045);
    kamm(o, P, f, P.dunst([120, 186, 110], 0.45), P.dunst([100, 170, 90], 0.4));
    tupfen(o, P, f, 2600, ['#ffb0c8', '#ffe28a', '#ffffff', '#d8b8ff', '#ff9a9a'].map(c => rgb(P.dunst(hex(c), 0.35))), P.rnd, 0.8, 2.4, 160);
    baumreihe(o, P, f, 18, P.dunst([70, 130, 70], 0.5), P.rnd, { luecke: u => Math.sin(u * 0.01) > -0.3, step: 22 });
  },
  mitte(o, P) {
    const f = welle(46, 22, 0.007, 1.3);
    kamm(o, P, f, P.dunst([96, 176, 80], 0.12), [80, 156, 64]);
    tupfen(o, P, f, 3400, BLUETEN.concat(['#e8262a', '#e8262a']), P.rnd, 1.2, 4.2, 140);
    for (let i = 0; i < 70; i++) { const u = PU0 + P.rnd() * PW; mohn(o, u, P.G - f(u) + 6 + P.rnd() * 30, 5 + P.rnd() * 3); }
  },
  nah(o, N) {
    const { rnd } = N;
    // riesige Blumen am Rand
    const riesen = [[60, 280, 'kornblume'], [200, 330, 'mohn'], [380, 300, 'mohn'], [480, 230, 'kornblume'], [570, 330, 'margerite'], [650, 190, 'loewenzahn'],
      [1320, 210, 'kornblume'], [1420, 320, 'mohn'], [1530, 260, 'margerite'], [1640, 340, 'pusteblume'], [1780, 290, 'mohn'], [1900, 240, 'loewenzahn']];
    for (const [x, h, art] of riesen) {
      const [bx, by] = stiel(o, x, GY, h, '#3e8e2e', 5, (rnd() - 0.5) * 40);
      for (let k = 0; k < 3; k++) { const ly = GY - h * (0.2 + k * 0.2), d = k % 2 ? 1 : -1; oval(o, x + d * 16, ly, 20, 6, '#4aa83a', d * 0.5); }
      if (art === 'mohn') { mohn(o, bx, by, 40); kreis(o, bx, by, 9, '#2a1a20'); for (let k = 0; k < 10; k++) kreis(o, bx + Math.cos(k) * 13, by + Math.sin(k) * 13, 2, '#1a1416'); }
      else if (art === 'kornblume') kornblume(o, bx, by, 30);
      else if (art === 'margerite') margerite(o, bx, by, 38);
      else if (art === 'loewenzahn') { o.fillStyle = '#ffd21f'; for (let k = 0; k < 30; k++) { const a = k * TAU / 30; oval(o, bx + Math.cos(a) * 14, by + Math.sin(a) * 14, 14, 3.5, k % 2 ? '#ffd21f' : '#ffc000', a); } kreis(o, bx, by, 10, '#f2b000'); }
      else { kreis(o, bx, by, 5, '#c8c0a8'); o.strokeStyle = 'rgba(255,255,255,.85)'; o.lineWidth = 0.9; for (let k = 0; k < 40; k++) { const a = k * TAU / 40; linie(o, 'rgba(255,255,255,.8)', 0.8, bx, by, bx + Math.cos(a) * 34, by + Math.sin(a) * 34); kreis(o, bx + Math.cos(a) * 34, by + Math.sin(a) * 34, 2.4, 'rgba(255,255,255,.75)'); } }
    }
  },
  vorne(o, V) {
    const { rnd } = V;
    for (let i = 0; i < 220; i++) {
      const x = rnd() * W, gross = V.frei(x, 8), h = gross ? 16 + rnd() * 26 : 7 + rnd() * 9;
      const [bx, by] = stiel(o, x, V.gy, h, '#3e8e2e', 1.1, (rnd() - 0.5) * 6);
      const art = (rnd() * 5) | 0, r = gross ? 3.5 + rnd() * 2.5 : 2.4;
      if (art === 0) mohn(o, bx, by, r * 1.2); else if (art === 1) kornblume(o, bx, by, r * 1.1); else if (art === 2) margerite(o, bx, by, r * 1.1);
      else if (art === 3) blume(o, bx, by, r, '#ffd21f', '#f2a000', 8); else blume(o, bx, by, r, BLUETEN[(rnd() * BLUETEN.length) | 0]);
    }
  },
  insekten: 'bienen',
};

// ----- Am Bachufer -----
GEGEND.bach = {
  fern(o, P) {
    const f = welle(120, 50, 0.004, 0.5);
    kamm(o, P, f, P.dunst([120, 180, 140], 0.5), P.dunst([100, 160, 120], 0.45));
    baumreihe(o, P, f, 28, P.dunst([80, 140, 100], 0.45), P.rnd, { oval: 1.3 });
  },
  mitte(o, P) {
    const f = welle(54, 14, 0.006, 3);
    // Trauerweiden am anderen Ufer
    for (let u = PU0 + 80; u < PU0 + PW; u += 260 + P.rnd() * 220) {
      const y = P.G - f(u), c = P.dunst([110, 160, 76], 0.2);
      o.fillStyle = rgb(hell(c, -0.45)); o.fillRect(u - 6, y - 120, 12, 120);
      for (let k = 0; k < 9; k++) kreis(o, u + (P.rnd() - 0.5) * 120, y - 150 - P.rnd() * 40, 36 + P.rnd() * 18, rgb(hell(c, (P.rnd() - 0.6) * 0.18)));
      // lange hängende Zweige
      for (let k = 0; k < 90; k++) {
        const x = u + (P.rnd() - 0.5) * 170, top = y - 150 - P.rnd() * 30 + Math.abs(x - u) * 0.35;
        o.strokeStyle = rgb(hell(c, (P.rnd() - 0.2) * 0.3)); o.lineWidth = 2 + P.rnd() * 1.5;
        o.beginPath(); o.moveTo(x, top); o.quadraticCurveTo(x + (x - u) * 0.08, top + 60, x + (x - u) * 0.15, y - 20 - P.rnd() * 50); o.stroke();
      }
    }
    kamm(o, P, f, P.dunst([84, 156, 84], 0.12), [70, 140, 70]);
    for (let u = PU0; u < PU0 + PW; u += 14 + P.rnd() * 30) schilf(o, u, P.G - f(u) + 8, 30 + P.rnd() * 36, P.rnd, P.dunst([80, 140, 70], 0.15));
  },
  nah(o, N) {
    const { rnd } = N;
    // der Bach fließt hinter dem Hügel vorbei
    const y0 = GY - 34;
    o.fillStyle = lg(o, 0, y0, 0, GY, '#bfe6f8', '#5aaee0', '#3a86c0');
    o.beginPath(); o.moveTo(-330, GY + 4); o.lineTo(-330, y0 + 4);
    for (let x = -330; x <= W + 330; x += 20) o.lineTo(x, y0 + Math.sin(x * 0.01) * 2);
    o.lineTo(W + 330, GY + 4); o.fill();
    o.fillStyle = 'rgba(70,110,60,.6)'; o.fillRect(-330, y0 - 3, W + 660, 4);
    for (let i = 0; i < 90; i++) { const x = -300 + rnd() * (W + 600), y = y0 + 6 + rnd() * 24; linie(o, 'rgba(255,255,255,.6)', 1.2, x, y, x + 8 + rnd() * 18, y); }
    for (let i = 0; i < 14; i++) { const x = -300 + rnd() * (W + 600); stein(o, x, y0 + 16 + rnd() * 12, 16 + rnd() * 20, 10 + rnd() * 6, '#b8c0bc', '#7a8480'); }
    for (const [x0, x1] of [[-320, 600], [1360, 2240]]) for (let x = x0; x < x1; x += 22 + rnd() * 30) {
      if (rnd() < 0.4) rohrkolben(o, x, GY, 130 + rnd() * 110, (rnd() - 0.5) * 20);
      else schilf(o, x, GY, 90 + rnd() * 120, rnd);
    }
  },
  vorne(o, V) {
    const { rnd } = V;
    for (let i = 0; i < 40; i++) { const x = rnd() * W; if (V.frei(x, 12)) schilf(o, x, V.gy, 34 + rnd() * 40, rnd); }
    for (let i = 0; i < 80; i++) { const x = rnd() * W, h = 8 + rnd() * 10; const [bx, by] = stiel(o, x, V.gy, h, '#4a8a3a', 1); for (let k = 0; k < 3; k++) blume(o, bx + (k - 1) * 3, by + (k % 2) * 2, 1.8, '#7ab8ff', '#ffe680'); }
    for (let i = 0; i < 30; i++) { const x = rnd() * W; stein(o, x, V.gy + 3, 9 + rnd() * 12, 6 + rnd() * 5, '#d0d4d0', '#8a9290'); }
  },
  anim(ctx, t, nacht) {
    const y0 = GY - 34;
    ctx.strokeStyle = `rgba(255,255,255,${0.7 - nacht * 0.4})`; ctx.lineWidth = 1.4;
    for (let i = 0; i < 26; i++) {
      const x = ((i * 157 + t * 34) % (W + 200)) - 100, y = y0 + 8 + (i % 5) * 5;
      const a = Math.sin(t * 2 + i) * 0.5 + 0.5;
      ctx.globalAlpha = a; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
  insekten: 'libellen',
};

// ----- Am Waldrand -----
GEGEND.wald = {
  fern(o, P) {
    kamm(o, P, welle(80, 30, 0.004), P.dunst([90, 130, 120], 0.55));
    tannenreihe(o, P, welle(80, 30, 0.004), 200, P.dunst([60, 100, 90], 0.5), P.rnd, 0.22);
  },
  mitte(o, P) {
    tannenreihe(o, P, welle(20, 12, 0.006), 330, P.dunst([36, 80, 56], 0.2), P.rnd, 0.24);
    const f = welle(14, 8, 0.01, 2);
    kamm(o, P, f, P.dunst([50, 96, 50], 0.1), [40, 80, 40]);
    for (let u = PU0; u < PU0 + PW; u += 12 + P.rnd() * 18) grasbueschel(o, u, P.G - f(u) + 6, 22 + P.rnd() * 20, P.dunst([70, 130, 60], 0.12), P.rnd, 5);
  },
  nah(o, N) {
    const { rnd } = N;
    strahlen(o, 100, 1500, -330, GY, 6, rnd, 0.13);
    for (const [x, h] of [[-200, 900], [1800, 860], [120, 980], [560, 840], [1440, 920]]) tanne(o, x, GY, h, [40, 96, 56], rnd);
    for (const [x, s] of [[380, 0.7], [1560, 0.9], [1620, 0.55]]) pilz(o, x, GY + 2, s, 'stein', rnd);
    for (let i = 0; i < 12; i++) { const x = [260, 470, 640, 1330, 1520, 1700][i % 6] + rnd() * 60; farn(o, x, GY, 60 + rnd() * 50, rnd); }
  },
  vorne(o, V) {
    const { rnd } = V;
    for (let i = 0; i < 24; i++) { const x = rnd() * W; if (V.frei(x, 24)) farn(o, x, V.gy, 26 + rnd() * 26, rnd); }
    for (let i = 0; i < 18; i++) { const x = rnd() * W; zapfen(o, x, V.gy - 2, 0.8 + rnd() * 0.5, rnd() * 3); }
    for (let i = 0; i < 16; i++) { const x = rnd() * W; pilz(o, x, V.gy + 1, V.frei(x, 10) ? 0.2 + rnd() * 0.15 : 0.12, rnd() < 0.3 ? 'fliegen' : 'klein', rnd); }
  },
  insekten: 'falter',
};
function farn(o, x, gy, h, rnd) {
  o.lineCap = 'round';
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k - 2) * 0.42 + (rnd() - 0.5) * 0.2, l = h * (0.7 + rnd() * 0.4);
    const ex = x + Math.cos(a) * l, ey = gy + Math.sin(a) * l * 0.9;
    const mx = x + Math.cos(a) * l * 0.5 - Math.sin(a) * l * 0.12, my = gy + Math.sin(a) * l * 0.5;
    kurve(o, '#3f7d2a', 1.6, x, gy, mx, my, ex, ey);
    for (let s = 0.15; s < 0.95; s += 0.08) {
      const px = (1 - s) * (1 - s) * x + 2 * (1 - s) * s * mx + s * s * ex, py = (1 - s) * (1 - s) * gy + 2 * (1 - s) * s * my + s * s * ey;
      const fl = l * 0.16 * (1 - s * 0.8);
      for (const d of [-1, 1]) oval(o, px + Math.cos(a + d * 1.2) * fl * 0.5, py + Math.sin(a + d * 1.2) * fl * 0.5, fl * 0.55, fl * 0.2, s < 0.5 ? '#4f9a36' : '#62b444', a + d * 1.2);
    }
  }
}
function zapfen(o, x, y, s, rot) {
  o.save(); o.translate(x, y); o.rotate(rot); o.scale(s, s);
  oval(o, 0, 0, 9, 4.5, '#6a4022');
  for (let k = -6; k <= 6; k += 3) for (const d of [-1, 1]) oval(o, k, d * 1.8, 2, 1.5, '#9a6232');
  o.restore();
}

// ----- Alter Baumstumpf -----
GEGEND.stumpf = {
  fern(o, P) {
    const f = welle(100, 40, 0.004, 1);
    kamm(o, P, f, P.dunst([120, 170, 120], 0.5));
    baumreihe(o, P, f, 34, P.dunst([70, 120, 70], 0.45), P.rnd);
  },
  mitte(o, P) {
    const f = welle(40, 18, 0.006, 2);
    baumreihe(o, P, u => f(u) + 40, 52, P.dunst([60, 110, 56], 0.2), P.rnd, { step: 40 });
    kamm(o, P, f, P.dunst([96, 150, 70], 0.1), [80, 130, 60]);
    for (let u = PU0; u < PU0 + PW; u += 120 + P.rnd() * 140) busch(o, u, P.G - f(u) + 10, 30 + P.rnd() * 20, P.dunst([70, 130, 60], 0.1), P.rnd, 8);
  },
  nah(o, N) {
    const { rnd } = N;
    // umgefallener, bemooster Ast links
    o.fillStyle = lg(o, 0, GY - 46, 0, GY, '#8a5a34', '#4a2e18');
    o.beginPath(); o.roundRect(-200, GY - 44, 820, 44, 22); o.fill();
    oval(o, 620, GY - 22, 14, 22, '#c89a62'); oval(o, 620, GY - 22, 8, 14, '#a8784a');
    for (let k = 2; k < 12; k += 3) { o.strokeStyle = 'rgba(120,80,40,.6)'; o.lineWidth = 1; o.beginPath(); o.ellipse(620, GY - 22, k, k * 1.6, 0, 0, TAU); o.stroke(); }
    o.fillStyle = 'rgba(110,160,70,.85)'; o.beginPath(); o.ellipse(260, GY - 42, 260, 9, 0, Math.PI, TAU); o.fill();
    for (let k = 0; k < 4; k++) pilz(o, 380 + k * 40, GY - 40, 0.25 + rnd() * 0.12, 'klein', rnd);
    // der riesige Stumpf
    const x = 1440, w = 400, h = 310, top = GY - h;
    o.fillStyle = 'rgba(0,0,0,.25)'; o.beginPath(); o.ellipse(x + 20, GY, w * 0.62, 18, 0, 0, TAU); o.fill();
    // Wurzelansätze
    o.fillStyle = '#5a3a20';
    for (const d of [-1, 1]) { o.beginPath(); o.moveTo(x + d * w * 0.3, GY - 80); o.quadraticCurveTo(x + d * w * 0.55, GY - 20, x + d * w * 0.72, GY + 4); o.lineTo(x + d * w * 0.4, GY + 4); o.fill(); }
    o.fillStyle = lg(o, x - w / 2, 0, x + w / 2, 0, '#6a4426', '#8a5a34', '#5a3820', '#3a2414');
    o.beginPath(); o.moveTo(x - w / 2, top); o.quadraticCurveTo(x - w * 0.54, GY - h * 0.4, x - w * 0.6, GY); o.lineTo(x + w * 0.6, GY); o.quadraticCurveTo(x + w * 0.54, GY - h * 0.4, x + w / 2, top); o.fill();
    o.strokeStyle = 'rgba(30,16,6,.5)'; o.lineCap = 'round';
    for (let k = 0; k < 26; k++) { const bx = x - w / 2 + 10 + rnd() * (w - 20); o.lineWidth = 2 + rnd() * 3; o.beginPath(); o.moveTo(bx, top + 20 + rnd() * 30); o.quadraticCurveTo(bx + (rnd() - 0.5) * 16, GY - h * 0.4, bx + (bx - x) * 0.15, GY - rnd() * 20); o.stroke(); }
    o.strokeStyle = 'rgba(200,150,100,.18)'; o.lineWidth = 2;
    for (let k = 0; k < 14; k++) { const bx = x - w / 2 + 14 + rnd() * (w - 28); o.beginPath(); o.moveTo(bx, top + 30); o.lineTo(bx + 2, GY - 30); o.stroke(); }
    // Jahresringe oben
    o.fillStyle = '#d8b07a'; o.beginPath(); o.ellipse(x, top, w / 2, 34, 0, 0, TAU); o.fill();
    o.strokeStyle = '#5a3a20'; o.lineWidth = 6; o.stroke();
    for (let k = 1; k < 14; k++) { o.strokeStyle = k % 3 ? 'rgba(140,90,46,.55)' : 'rgba(110,64,30,.75)'; o.lineWidth = 1.4 + (k % 3 === 0); o.beginPath(); o.ellipse(x + 6, top + 1, (w / 2 - 6) * (k / 14), 32 * (k / 14), 0, 0, TAU); o.stroke(); }
    kreis(o, x + 6, top + 1, 4, '#8a5a30');
    linie(o, 'rgba(60,30,10,.6)', 2, x + 30, top - 4, x + 90, top + 10, x + 120, top + 4);
    o.fillStyle = 'rgba(110,160,70,.9)'; o.beginPath(); o.ellipse(x - w * 0.3, top + 6, 60, 10, 0.1, 0, Math.PI); o.fill();
    // Baumpilze (Konsolen)
    for (const [bx, by, s] of [[x + w * 0.46, top + 90, 1], [x + w * 0.5, top + 130, 0.8], [x - w * 0.52, top + 170, 0.9], [x + w * 0.52, top + 200, 0.7]]) {
      const d = bx > x ? 1 : -1;
      for (let k = 0; k < 3; k++) {
        const yy = by + k * 8 * s;
        o.fillStyle = ['#e8c890', '#d8a868', '#c08848'][k]; o.beginPath(); o.ellipse(bx + d * 10 * s, yy, 30 * s, 9 * s, 0, d > 0 ? -Math.PI / 2 : Math.PI / 2, d > 0 ? Math.PI / 2 : Math.PI * 1.5); o.fill();
      }
    }
    // kleine Pilze & Efeu
    for (let k = 0; k < 6; k++) pilz(o, x - w * 0.45 + k * 22, GY + 2, 0.22 + rnd() * 0.1, 'klein', rnd);
    efeu(o, x - w * 0.35, GY, top + 40, rnd); efeu(o, x + w * 0.2, GY, top + 120, rnd);
  },
  vorne(o, V) {
    const { rnd } = V;
    for (let i = 0; i < 160; i++) { const x = rnd() * W; o.save(); o.translate(x, V.gy - rnd() * 3); o.rotate(rnd() * 3); o.fillStyle = ['#d8b07a', '#c08a52', '#e8c896'][i % 3]; o.fillRect(-4, -1.5, 8, 3); o.restore(); }
    for (let i = 0; i < 30; i++) { const x = rnd() * W; oval(o, x, V.gy, 6 + rnd() * 8, 4 + rnd() * 3, '#5f9a3e'); oval(o, x - 2, V.gy - 2, 4, 2, '#86c457'); }
    for (let i = 0; i < 18; i++) { const x = rnd() * W; pilz(o, x, V.gy + 1, V.frei(x, 8) ? 0.16 + rnd() * 0.14 : 0.1, 'klein', rnd); }
  },
  insekten: 'falter',
};
function efeu(o, x, y0, y1, rnd) {
  o.strokeStyle = '#3a5a22'; o.lineWidth = 2;
  o.beginPath(); o.moveTo(x, y0);
  const pts = [];
  for (let y = y0; y > y1; y -= 12) { const xx = x + Math.sin(y * 0.05) * 10; o.lineTo(xx, y); pts.push([xx, y]); }
  o.stroke();
  for (const [px, py] of pts) for (const d of [-1, 1]) {
    if (rnd() < 0.3) continue;
    const lx = px + d * 8, ly = py - 2;
    o.fillStyle = rnd() < 0.5 ? '#2f6a2a' : '#3f8a34';
    o.beginPath(); o.moveTo(lx, ly + 6); o.lineTo(lx - 6, ly); o.lineTo(lx - 2, ly - 2); o.lineTo(lx, ly - 7); o.lineTo(lx + 2, ly - 2); o.lineTo(lx + 6, ly); o.closePath(); o.fill();
  }
}

// ----- Im Gemüsegarten -----
GEGEND.garten = {
  fern(o, P) {
    const f = welle(100, 40, 0.004, 2);
    kamm(o, P, f, P.dunst([130, 180, 120], 0.5));
    baumreihe(o, P, f, 30, P.dunst([80, 130, 80], 0.45), P.rnd, { luecke: u => Math.sin(u * 0.008) > 0.4 });
    // Gartenhäuschen
    for (const u of [520, 1900]) { const y = P.G - f(u); o.fillStyle = rgb(P.dunst([170, 110, 70], 0.45)); o.fillRect(u - 40, y - 60, 80, 60); o.fillStyle = rgb(P.dunst([170, 60, 50], 0.45)); o.beginPath(); o.moveTo(u - 50, y - 58); o.lineTo(u, y - 95); o.lineTo(u + 50, y - 58); o.fill(); }
  },
  mitte(o, P) {
    const f = u => 22 + Math.sin(u * 0.003) * 4;
    kamm(o, P, f, P.dunst([110, 76, 50], 0.15), [90, 60, 40]);
    // Beete in Reihen mit Kohl, Salat & Lauch
    for (let u = PU0 + 20; u < PU0 + PW; u += 240) {
      const y = P.G - f(u);
      o.fillStyle = rgb(P.dunst([150, 100, 60], 0.15)); o.fillRect(u, y - 14, 200, 14);
      o.fillStyle = rgb(P.dunst([90, 60, 36], 0.15)); o.fillRect(u + 4, y - 16, 192, 5);
      for (let x = u + 14; x < u + 194; x += 22) {
        const art = ((u / 240) | 0) % 3;
        if (art === 0) busch(o, x, y - 14, 16, P.dunst([110, 170, 110], 0.15), P.rnd, 5);
        else if (art === 1) { oval(o, x, y - 22, 11, 9, rgb(P.dunst([140, 210, 90], 0.15))); oval(o, x - 3, y - 25, 5, 4, rgb(P.dunst([180, 230, 130], 0.15))); }
        else for (let k = -1; k <= 1; k++) linie(o, rgb(P.dunst([80, 150, 90], 0.15)), 3, x + k * 3, y - 14, x + k * 6, y - 46);
      }
    }
  },
  nah(o, N) {
    const { rnd } = N;
    // Holzzaun
    o.fillStyle = '#b88a58'; o.fillRect(-330, GY - 62, W + 660, 8); o.fillRect(-330, GY - 28, W + 660, 8);
    for (let x = -320; x < W + 330; x += 34) {
      o.fillStyle = lg(o, x, 0, x + 22, 0, '#d8aa74', '#b88a58', '#94683c');
      o.beginPath(); o.moveTo(x, GY); o.lineTo(x, GY - 84); o.lineTo(x + 11, GY - 96); o.lineTo(x + 22, GY - 84); o.lineTo(x + 22, GY); o.fill();
      kreis(o, x + 11, GY - 55, 1.6, '#5a4a3a'); kreis(o, x + 11, GY - 21, 1.6, '#5a4a3a');
    }
    // Bohnenstangen
    for (const bx of [420, 1520]) {
      for (const d of [-40, 0, 40]) linie(o, '#8a6034', 5, bx + d, GY, bx + d * 0.15, GY - 330);
      for (let k = 0; k < 3; k++) {
        const d = [-40, 0, 40][k];
        o.strokeStyle = '#3f8a2e'; o.lineWidth = 2; o.beginPath();
        for (let s = 0; s <= 1; s += 0.02) { const px = bx + d * (1 - s * 0.85) + Math.sin(s * 30 + k) * 6, py = GY - s * 320; s ? o.lineTo(px, py) : o.moveTo(px, py); }
        o.stroke();
        for (let s = 0.08; s < 0.95; s += 0.07) {
          const px = bx + d * (1 - s * 0.85) + Math.sin(s * 30 + k) * 6, py = GY - s * 320, sd = Math.sin(s * 30 + k) > 0 ? 1 : -1;
          oval(o, px + sd * 9, py, 10, 6, s % 0.14 < 0.07 ? '#4fa83a' : '#3f9032', sd * 0.6);
          if (rnd() < 0.35) { linie(o, '#6ab84a', 2.2, px - sd * 3, py + 2, px - sd * 5, py + 24); }
          if (rnd() < 0.2) blume(o, px + sd * 4, py - 6, 3, '#ff5a3a', '#ffd34d');
        }
      }
    }
    // Kürbisse
    for (const [x, s] of [[600, 1], [1340, 1.25], [1700, 0.8], [140, 1.1]]) kuerbis(o, x, GY + 2, s);
  },
  gras: 'keins',
  vorne(o, V) {
    const { rnd } = V;
    for (const b of gartenBeete()) {
      if (!V.frei(b.x, 4) && rnd() < 0.5) continue;
      if (b.art === 'karotte') {
        oval(o, b.x, V.gy + 1, 6 * b.s, 3, '#f08a3a');
        for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.28, l = (V.frei(b.x, 12) ? 34 : 18) * b.s; const ex = b.x + Math.cos(a) * l, ey = V.gy + Math.sin(a) * l; kurve(o, '#3f9a32', 1.2, b.x, V.gy, b.x + Math.cos(a) * l * 0.5, V.gy + Math.sin(a) * l * 0.6, ex, ey); for (let s = 0.3; s < 1; s += 0.15) kreis(o, b.x + (ex - b.x) * s + 2, V.gy + (ey - V.gy) * s, 2.2, '#5fb447'); }
      } else {
        kreis(o, b.x, V.gy + 2, 6 * b.s, '#d8324e');
        for (const d of [-1, 1]) oval(o, b.x + d * 6, V.gy - 12 * b.s, 5 * b.s, 9 * b.s, '#4fa83a', d * 0.5);
      }
    }
    for (let i = 0; i < 9; i++) { const x = rnd() * W; if (!V.frei(x, 30)) continue; salat(o, x, V.gy, 16 + rnd() * 8); }
  },
  insekten: 'falter',
};
function kuerbis(o, x, gy, s) {
  const w = 56 * s, h = 40 * s;
  for (const [d, c] of [[-0.5, '#d86a1a'], [0.5, '#d86a1a'], [-0.2, '#f08a2a'], [0.2, '#f08a2a'], [0, '#f8a040']]) oval(o, x + d * w * 0.6, gy - h / 2, w * 0.32, h / 2, c);
  oval(o, x - w * 0.15, gy - h * 0.75, w * 0.12, h * 0.1, 'rgba(255,255,255,.35)');
  linie(o, '#4a6a2a', 4 * s, x, gy - h + 2, x + 3 * s, gy - h - 9 * s);
  oval(o, x + 14 * s, gy - h - 2, 12 * s, 6 * s, '#3f8a2e', -0.3);
}
function salat(o, x, gy, r) {
  for (let k = 0; k < 9; k++) { const a = Math.PI + (k / 8) * Math.PI; oval(o, x + Math.cos(a) * r * 0.6, gy - r * 0.4 + Math.sin(a) * r * 0.4, r * 0.5, r * 0.35, k % 2 ? '#8ad050' : '#a8e070', a); }
  oval(o, x, gy - r * 0.5, r * 0.45, r * 0.4, '#c8f090');
}

// ----- Der Sandhügel -----
function duene(o, x, gy, w, h, hellC, schattenC) {
  o.fillStyle = hellC;
  o.beginPath(); o.moveTo(x - w * 0.6, gy); o.bezierCurveTo(x - w * 0.3, gy - h * 0.2, x - w * 0.1, gy - h, x + w * 0.08, gy - h);
  o.bezierCurveTo(x + w * 0.2, gy - h * 0.6, x + w * 0.35, gy - h * 0.1, x + w * 0.5, gy); o.fill();
  o.fillStyle = schattenC;
  o.beginPath(); o.moveTo(x + w * 0.08, gy - h); o.bezierCurveTo(x + w * 0.2, gy - h * 0.6, x + w * 0.35, gy - h * 0.1, x + w * 0.5, gy);
  o.lineTo(x + w * 0.16, gy); o.bezierCurveTo(x + w * 0.12, gy - h * 0.4, x + w * 0.1, gy - h * 0.8, x + w * 0.08, gy - h); o.fill();
}
function strandhafer(o, x, gy, h, rnd, c = [150, 176, 120]) {
  c = col(c);
  o.lineCap = 'round';
  for (let k = 0; k < 12; k++) { const b = (rnd() - 0.35) * h * 0.9; halm(o, x + (rnd() - 0.5) * 8, gy, h * (0.5 + rnd() * 0.6), rgb(hell(c, (rnd() - 0.5) * 0.35)), 1.4 + rnd(), b); }
}
GEGEND.sand = {
  fern(o, P) {
    const rnd = P.rnd;
    for (let u = PU0 - 200; u < PU0 + PW + 200; u += 220 + rnd() * 180) duene(o, u, P.G + 20, 420 + rnd() * 260, 90 + rnd() * 70, rgb(P.dunst([240, 216, 166], 0.4)), rgb(P.dunst([210, 176, 124], 0.4)));
  },
  mitte(o, P) {
    const rnd = P.rnd;
    for (let u = PU0 - 200; u < PU0 + PW + 200; u += 300 + rnd() * 220) {
      const w = 520 + rnd() * 300, h = 90 + rnd() * 90;
      duene(o, u, P.G + 26, w, h, rgb(P.dunst([236, 206, 150], 0.1)), rgb(P.dunst([204, 164, 108], 0.1)));
      for (let k = 0; k < 4; k++) strandhafer(o, u - w * 0.2 + k * 30 + rnd() * 20, P.G + 26 - h * (0.4 + rnd() * 0.3), 34 + rnd() * 20, rnd, P.dunst([140, 170, 110], 0.1));
    }
    kamm(o, P, () => 4, P.dunst([226, 196, 140], 0.05));
  },
  nah(o, N) {
    const { rnd } = N;
    duene(o, 260, GY + 8, 900, 210, '#ecd29c', '#cfa86e');
    duene(o, 1700, GY + 8, 860, 180, '#ecd29c', '#cfa86e');
    for (const [x, y] of [[60, 120], [230, 170], [380, 140], [1500, 120], [1640, 150], [1790, 110]]) strandhafer(o, x, GY + 8 - y * 0.8, 80 + rnd() * 50, rnd);
    // Treibholz
    o.fillStyle = lg(o, 0, GY - 18, 0, GY, '#d8ccb8', '#9a8a74'); o.beginPath(); o.roundRect(1360, GY - 16, 150, 16, 8); o.fill();
    linie(o, '#9a8a74', 4, 1480, GY - 12, 1530, GY - 40);
  },
  gras: 'duenn',
  vorne(o, V) {
    const { rnd } = V;
    for (let i = 0; i < 26; i++) { const x = rnd() * W; strandhafer(o, x, V.gy, V.frei(x, 16) ? 34 + rnd() * 30 : 12 + rnd() * 6, rnd); }
    for (let i = 0; i < 30; i++) {
      const x = rnd() * W, r = 4 + rnd() * 3, c = ['#fbe8d8', '#f4c0b0', '#fff4e0', '#e8d0f0'][i % 4];
      o.save(); o.translate(x, V.gy - 1); o.rotate((rnd() - 0.5) * 0.6);
      if (i % 3) { o.fillStyle = c; o.beginPath(); o.moveTo(0, 2); o.arc(0, 2, r, Math.PI * 1.1, Math.PI * 1.9); o.closePath(); o.fill(); o.strokeStyle = 'rgba(150,90,70,.4)'; o.lineWidth = 0.5; for (let k = -2; k <= 2; k++) linie(o, 'rgba(150,90,70,.4)', 0.5, 0, 2, Math.sin(k * 0.3) * r, 2 - Math.cos(k * 0.3) * r); }
      else { o.fillStyle = c; o.beginPath(); for (let k = 0; k < 30; k++) { const a = k * 0.5, rr = 0.25 * k * r / 7; o.lineTo(Math.cos(a) * rr, -2 + Math.sin(a) * rr); } o.fill(); }
      o.restore();
    }
  },
  anim(ctx, t, nacht) {
    if (nacht > 0.3) return;
    ctx.strokeStyle = 'rgba(255,250,235,.18)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 7; i++) {
      const y = GY - 40 - i * 26, x0 = ((i * 331 + t * 10) % (W + 300)) - 150;
      ctx.beginPath();
      for (let x = 0; x < 120; x += 8) ctx.lineTo(x0 + x, y + Math.sin(x * 0.12 + t * 4 + i) * 2);
      ctx.stroke();
    }
  },
  insekten: 'falter',
};

// ----- Am Spielplatz -----
GEGEND.spielplatz = {
  fern(o, P) {
    const rnd = P.rnd, f = welle(60, 20, 0.004, 1);
    kamm(o, P, f, P.dunst([140, 190, 140], 0.5));
    // Häuser der Stadt
    for (let u = PU0; u < PU0 + PW; u += 120 + rnd() * 120) {
      const w = 60 + rnd() * 50, h = 50 + rnd() * 70, y = P.G - f(u) + 20;
      const wand = P.dunst([[240, 220, 190], [230, 200, 200], [210, 220, 240], [250, 240, 210]][(rnd() * 4) | 0], 0.45);
      o.fillStyle = rgb(wand); o.fillRect(u, y - h, w, h + 40);
      o.fillStyle = rgb(P.dunst([190, 80, 60], 0.45)); o.beginPath(); o.moveTo(u - 8, y - h); o.lineTo(u + w / 2, y - h - w * 0.45); o.lineTo(u + w + 8, y - h); o.fill();
      o.fillStyle = rgb(P.dunst([120, 160, 200], 0.45));
      for (let wy = y - h + 12; wy < y - 14; wy += 22) for (let wx = u + 9; wx < u + w - 14; wx += 20) o.fillRect(wx, wy, 9, 11);
    }
    baumreihe(o, P, u => f(u) - 10, 26, P.dunst([90, 150, 90], 0.45), P.rnd, { luecke: u => Math.sin(u * 0.011) > 0, stamm: true, hoch: 50 });
  },
  mitte(o, P) {
    const f = () => 10;
    // Hecke und Parkbank
    for (let u = PU0; u < PU0 + PW; u += 40) busch(o, u, P.G - 8, 48, P.dunst([70, 140, 70], 0.12), P.rnd, 4);
    kamm(o, P, f, P.dunst([110, 190, 90], 0.1), [100, 180, 80]);
    for (const u of [700, 1700, 2500]) {
      const y = P.G - 10;
      o.fillStyle = rgb(P.dunst([170, 100, 60], 0.12)); for (let k = 0; k < 3; k++) o.fillRect(u, y - 32 - k * 7, 110, 5);
      o.fillRect(u, y - 16, 110, 5);
      o.fillStyle = rgb(P.dunst([60, 60, 70], 0.12)); o.fillRect(u + 10, y - 16, 5, 16); o.fillRect(u + 95, y - 16, 5, 16);
    }
  },
  nah(o, N) {
    // Rutsche
    const lx = 280, px = 460, py = GY - 330;
    for (const d of [0, 46]) linie(o, '#3a7ad8', 8, lx + d, GY, lx + d + 40, py);
    for (let k = 1; k < 10; k++) { const s = k / 10; linie(o, '#5a9af0', 5, lx + s * 40, GY - s * 330, lx + 46 + s * 40, GY - s * 330); }
    o.fillStyle = '#ffcf3a'; o.fillRect(lx + 30, py - 10, 130, 16);
    linie(o, '#ffcf3a', 6, lx + 34, py - 10, lx + 34, py - 60, lx + 156, py - 60, lx + 156, py - 10);
    for (let k = 0; k < 5; k++) linie(o, '#ffcf3a', 3, lx + 54 + k * 22, py - 10, lx + 54 + k * 22, py - 60);
    o.fillStyle = '#e8463c'; o.beginPath(); o.moveTo(lx + 20, py - 60); o.lineTo(lx + 95, py - 130); o.lineTo(lx + 170, py - 60); o.fill();
    // Rutschbahn
    o.lineCap = 'round';
    for (const [c, w, dy] of [['#a82020', 30, 4], ['#e8463c', 26, 0], ['#ff7a6a', 8, -8]]) {
      o.strokeStyle = c; o.lineWidth = w; o.beginPath(); o.moveTo(px - 10, py + dy); o.bezierCurveTo(px + 160, py + 30 + dy, px + 160, GY - 60 + dy, px + 320, GY - 18 + dy); o.lineTo(px + 360, GY - 16 + dy); o.stroke();
    }
    linie(o, '#3a7ad8', 7, px + 140, GY, px + 140, py + 150); linie(o, '#3a7ad8', 7, px + 260, GY, px + 260, GY - 40);
    // Schaukel-Gestell (Sitze schwingen in anim)
    for (const [x, d] of [[SCHAUKEL.x0, 1], [SCHAUKEL.x1, -1]]) { linie(o, '#2f9a5a', 10, x - d * 70, GY, x, SCHAUKEL.y); linie(o, '#2f9a5a', 10, x + d * 10, GY, x, SCHAUKEL.y); }
    o.fillStyle = lg(o, 0, SCHAUKEL.y - 8, 0, SCHAUKEL.y + 8, '#ffcf3a', '#e8a020'); o.beginPath(); o.roundRect(SCHAUKEL.x0 - 20, SCHAUKEL.y - 8, SCHAUKEL.x1 - SCHAUKEL.x0 + 40, 16, 8); o.fill();
    // Sandkasten mit Eimer & Schaufel
    const sx = 1680, sw = 300;
    o.fillStyle = '#ead29a'; o.beginPath(); o.ellipse(sx + sw / 2, GY - 34, sw / 2 - 6, 26, 0, Math.PI, TAU); o.fill();
    o.fillStyle = lg(o, 0, GY - 40, 0, GY, '#d88a4a', '#a8602e'); o.fillRect(sx, GY - 36, sw, 36);
    for (let k = 0; k < 4; k++) linie(o, 'rgba(90,40,10,.4)', 1, sx, GY - 27 + k * 9, sx + sw, GY - 27 + k * 9);
    o.fillStyle = '#3a8ae8'; o.beginPath(); o.moveTo(sx + 80, GY - 90); o.lineTo(sx + 130, GY - 90); o.lineTo(sx + 122, GY - 38); o.lineTo(sx + 88, GY - 38); o.fill();
    oval(o, sx + 105, GY - 90, 25, 6, '#2a6ac8'); kurve(o, '#2a6ac8', 3, sx + 82, GY - 86, sx + 105, GY - 130, sx + 128, GY - 86);
    linie(o, '#ffcf3a', 6, sx + 170, GY - 40, sx + 220, GY - 120);
    o.fillStyle = '#ffcf3a'; o.beginPath(); o.ellipse(sx + 160, GY - 38, 16, 10, -1, 0, TAU); o.fill();
  },
  gras: 'rasen',
  vorne(o, V) {
    const { rnd } = V;
    for (let i = 0; i < 70; i++) { const x = rnd() * W, [bx, by] = stiel(o, x, V.gy, 6 + rnd() * 8, '#3e8e2e', 1); margerite(o, bx, by, 2.6); }
    for (const [x, c] of [[W * 0.33, '#3fa0ff'], [W * 0.62, '#ff5a8a'], [W * 0.82, '#7ad46a']]) {
      const g = o.createRadialGradient(x - 2.5, V.gy - 9.5, 1, x, V.gy - 7, 7); g.addColorStop(0, '#fff'); g.addColorStop(0.35, c); g.addColorStop(1, rgb(hell(hex(c), -0.5)));
      kreis(o, x, V.gy - 7, 7, g); kurve(o, 'rgba(255,255,255,.7)', 1.2, x - 4, V.gy - 6, x, V.gy - 11, x + 4, V.gy - 6);
    }
    for (let i = 0; i < 26; i++) { const x = rnd() * W; o.fillStyle = ['#d8a868', '#c08848', '#e8c890'][i % 3]; o.beginPath(); o.moveTo(x, V.gy); o.lineTo(x + 3 + rnd() * 3, V.gy - 2 - rnd() * 3); o.lineTo(x + 5 + rnd() * 3, V.gy); o.fill(); if (i % 4 === 0) kreis(o, x + 3, V.gy - 1.5, 0.8, '#5a3014'); }
  },
  anim(ctx, t) {
    // Schaukelsitze schwingen
    for (const [k, x] of [[0, SCHAUKEL.x0 + 55], [1, SCHAUKEL.x1 - 55]]) {
      const a = Math.sin(t * 1.6 + k * 2.2) * (k ? 0.35 : 0.18), L = SCHAUKEL.L;
      const ex = x + Math.sin(a) * L, ey = SCHAUKEL.y + Math.cos(a) * L;
      ctx.strokeStyle = '#8a8a90'; ctx.lineWidth = 2;
      for (const d of [-14, 14]) { ctx.beginPath(); ctx.moveTo(x + d, SCHAUKEL.y + 6); ctx.lineTo(ex + d * Math.cos(a), ey - d * Math.sin(a)); ctx.stroke(); }
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(-a);
      ctx.fillStyle = k ? '#e8463c' : '#3a8ae8'; ctx.beginPath(); ctx.roundRect(-20, -3, 40, 8, 3); ctx.fill();
      ctx.restore();
    }
  },
  insekten: 'falter',
};
const SCHAUKEL = { x0: 1360, x1: 1580, y: GY - 360, L: 300 };

// ----- Blumentopf am Fenster -----
const FENSTER = { x0: 100, x1: 1830, y0: -250, y1: GY - 70, rahmen: 26 };
GEGEND.topf = {
  fern(o, P) {
    const f = welle(130, 50, 0.004);
    kamm(o, P, f, P.dunst([150, 196, 150], 0.5));
    baumreihe(o, P, f, 34, P.dunst([90, 150, 100], 0.45), P.rnd, { stamm: true, hoch: 60, luecke: u => Math.sin(u * 0.009) > 0.3 });
  },
  mitte(o, P) {
    const f = welle(70, 16, 0.005, 1);
    for (let u = PU0; u < PU0 + PW; u += 50) busch(o, u, P.G - f(u) + 20, 60, P.dunst([80, 150, 80], 0.25), P.rnd, 4);
    kamm(o, P, f, P.dunst([110, 180, 90], 0.2));
    // Gartenzaun draußen
    for (let u = PU0; u < PU0 + PW; u += 26) { o.fillStyle = rgb(P.dunst([250, 250, 245], 0.3)); o.fillRect(u, P.G - f(u) - 40, 12, 44); }
  },
  nah(o, N) {
    const { rnd } = N;
    const F = FENSTER, r = F.rahmen;
    // Wand rund ums Fenster (Tapete)
    o.save();
    o.beginPath(); o.rect(-330, -340, W + 660, GY + 380); o.rect(F.x1, F.y0, F.x0 - F.x1, F.y1 - F.y0);
    o.clip('evenodd');
    o.fillStyle = lg(o, 0, -340, 0, GY, '#f6ead2', '#ecdcc0'); o.fillRect(-330, -340, W + 660, GY + 380);
    for (let x = -330; x < W + 330; x += 36) { o.fillStyle = 'rgba(214,180,140,.18)'; o.fillRect(x, -340, 14, GY + 380); }
    for (let x = -312; x < W + 330; x += 72) for (let y = -320; y < GY; y += 60) blume(o, x + ((y / 60) % 2) * 36, y, 5, 'rgba(230,150,150,.35)', 'rgba(240,200,120,.5)');
    o.restore();
    // Fensterrahmen
    o.fillStyle = 'rgba(0,0,0,.12)'; o.fillRect(F.x0 - r + 6, F.y0 - r + 8, F.x1 - F.x0 + r * 2, F.y1 - F.y0 + r * 2);
    o.fillStyle = '#fbfaf6';
    o.fillRect(F.x0 - r, F.y0 - r, F.x1 - F.x0 + r * 2, r); o.fillRect(F.x0 - r, F.y1, F.x1 - F.x0 + r * 2, r);
    o.fillRect(F.x0 - r, F.y0 - r, r, F.y1 - F.y0 + r * 2); o.fillRect(F.x1, F.y0 - r, r, F.y1 - F.y0 + r * 2);
    const mx = (F.x0 + F.x1) / 2;
    o.fillRect(mx - r / 2, F.y0, r, F.y1 - F.y0);
    o.fillRect(F.x0, F.y0 + (F.y1 - F.y0) * 0.36 - r / 2, F.x1 - F.x0, r * 0.8);
    o.fillStyle = lg(o, mx - r / 2, 0, mx + r / 2, 0, '#ffffff', '#ece6da', '#c8c0b2'); o.fillRect(mx - r / 2, F.y0, r, F.y1 - F.y0);
    o.strokeStyle = '#d8d4cc'; o.lineWidth = 2; o.strokeRect(F.x0, F.y0, F.x1 - F.x0, F.y1 - F.y0);
    o.strokeRect(mx - r / 2, F.y0, r, F.y1 - F.y0);
    // Fenstergriff
    o.fillStyle = '#c8c8c8'; o.beginPath(); o.roundRect(mx + r / 2 - 4, F.y1 - 170, 8, 18, 3); o.fill(); o.beginPath(); o.roundRect(mx + r / 2 - 2, F.y1 - 158, 5, 40, 2); o.fill();
    // Glasspiegelungen
    o.save(); o.beginPath(); o.rect(F.x0, F.y0, F.x1 - F.x0, F.y1 - F.y0); o.clip();
    o.fillStyle = 'rgba(220,240,255,.12)'; o.fillRect(F.x0, F.y0, F.x1 - F.x0, F.y1 - F.y0);
    for (let k = 0; k < 6; k++) { const x = F.x0 + 120 + k * 290 + rnd() * 60, w = 30 + rnd() * 50; o.fillStyle = 'rgba(255,255,255,.22)'; o.beginPath(); o.moveTo(x, F.y0); o.lineTo(x + w, F.y0); o.lineTo(x + w - 260, F.y1); o.lineTo(x - 260, F.y1); o.fill(); }
    for (let k = 0; k < 40; k++) { const x = F.x0 + rnd() * (F.x1 - F.x0), y = F.y0 + rnd() * (F.y1 - F.y0) * 0.6; kreis(o, x, y, 1.5 + rnd() * 2.5, 'rgba(255,255,255,.35)'); }
    o.restore();
    // Fensterbank, auf der der Topf steht
    o.fillStyle = lg(o, 0, F.y1 + r - 4, 0, F.y1 + r + 20, '#ffffff', '#ddd8ce'); o.fillRect(-330, F.y1 + r - 4, W + 660, 24);
    // hintere Innenwand des Blumentopfs mit dickem Rand
    const ty = GY - 58;
    o.fillStyle = lg(o, 0, ty, 0, GY, '#b8603a', '#8a4424', '#6a321a'); o.fillRect(-330, ty, W + 660, GY - ty + 40);
    for (let k = 0; k < 500; k++) { o.fillStyle = rnd() < 0.5 ? 'rgba(255,200,160,.2)' : 'rgba(80,30,10,.2)'; o.fillRect(-330 + rnd() * (W + 660), ty + rnd() * 60, 2, 2); }
    o.fillStyle = lg(o, 0, ty - 22, 0, ty + 4, '#f0a070', '#d07a4c', '#a8562e'); o.beginPath(); o.roundRect(-330, ty - 22, W + 660, 26, 8); o.fill();
    o.fillStyle = 'rgba(255,230,200,.45)'; o.fillRect(-330, ty - 19, W + 660, 4);
    o.fillStyle = 'rgba(60,20,5,.3)'; o.fillRect(-330, ty + 4, W + 660, 6);
    // Vorhang links
    o.fillStyle = '#d8b84a'; o.fillRect(-330, -300, 720, 10);
    for (let k = 0; k < 10; k++) {
      const x = -320 + k * 60, xb = -320 + k * 34;
      o.fillStyle = lg(o, x, 0, x + 60, 0, '#f2d0d8', '#e8a8b8', '#f6dce2');
      o.beginPath(); o.moveTo(x, -292); o.lineTo(x + 62, -292); o.quadraticCurveTo(x + 50, GY * 0.3, xb + 40, GY - 10); o.lineTo(xb, GY - 10); o.quadraticCurveTo(x, GY * 0.3, x, -292); o.fill();
    }
    for (let k = 0; k < 6; k++) kreis(o, -310 + k * 120, -296, 7, '#c89a2a');
    o.fillStyle = '#c8507a'; o.beginPath(); o.roundRect(-40, GY * 0.45, 26, 60, 8); o.fill();
    // Topfrand (Terrakotta) an beiden Seiten
    for (const [x0, d] of [[0, 1], [W, -1]]) {
      o.fillStyle = lg(o, x0 - d * 40, 0, x0 + d * 30, 0, '#8a4424', '#d0784a', '#c06a3c');
      o.fillRect(Math.min(x0 - d * 40, x0 + d * 30), GY - 70, 70, 120);
      o.fillStyle = lg(o, 0, GY - 92, 0, GY - 62, '#e08a5a', '#a85a32'); o.beginPath(); o.roundRect(Math.min(x0 - d * 52, x0 + d * 40), GY - 92, 92, 26, 6); o.fill();
      o.fillStyle = 'rgba(255,220,190,.35)'; o.fillRect(Math.min(x0 - d * 50, x0 + d * 38), GY - 90, 88, 4);
    }
    // große Geranie
    geranie(o, 1500, GY, rnd);
    geranie(o, 480, GY, rnd, 0.6);
  },
  gras: 'keins',
  vorne(o, V) {
    const { rnd } = V;
    for (let i = 0; i < 260; i++) { const x = rnd() * W, r = 1 + rnd() * 2.4; kreis(o, x, V.gy - rnd() * 3, r, 'rgba(245,245,240,.95)'); kreis(o, x + r * 0.3, V.gy - rnd() * 3 + r * 0.3, r * 0.4, 'rgba(160,160,160,.4)'); }
    for (let i = 0; i < 10; i++) { const x = rnd() * W; o.save(); o.translate(x, V.gy - 2); o.rotate(rnd() * 3); oval(o, 0, 0, 5, 3.5, '#e8263a'); o.restore(); }
  },
  insekten: 'keine',
};
function geranie(o, x, gy, rnd, s = 1) {
  o.save(); o.translate(x, gy); o.scale(s, s);
  const stiele = [[-120, -300], [-50, -400], [40, -460], [110, -330], [170, -250], [-170, -220]];
  for (const [ex, ey] of stiele) kurve(o, '#4a8a32', 7, 0, 0, ex * 0.3, ey * 0.6, ex, ey);
  // runde Blätter mit dunklem Ring
  for (let k = 0; k < 16; k++) {
    const a = -Math.PI / 2 + (rnd() - 0.5) * 2.6, rr = 80 + rnd() * 200;
    const bx = Math.cos(a) * rr * 0.9, by = -60 + Math.sin(a) * rr * 0.75, r = 34 + rnd() * 18;
    kurve(o, '#4a8a32', 3, 0, -20, bx * 0.5, by * 0.6, bx, by);
    o.fillStyle = '#4f9a3a'; o.beginPath();
    for (let j = 0; j < 14; j++) { const aa = j * TAU / 14, rj = r * (j % 2 ? 0.92 : 1); o.lineTo(bx + Math.cos(aa) * rj, by + Math.sin(aa) * rj * 0.8); }
    o.fill();
    o.strokeStyle = 'rgba(110,70,30,.16)'; o.lineWidth = 5; o.beginPath(); o.ellipse(bx, by, r * 0.55, r * 0.44, 0, 0, TAU); o.stroke();
    o.strokeStyle = 'rgba(40,90,30,.35)'; o.lineWidth = 1; for (let j = 0; j < 7; j++) { const aa = j * TAU / 7; o.beginPath(); o.moveTo(bx, by); o.lineTo(bx + Math.cos(aa) * r * 0.85, by + Math.sin(aa) * r * 0.68); o.stroke(); }
    oval(o, bx - r * 0.3, by - r * 0.3, r * 0.3, r * 0.16, 'rgba(255,255,255,.18)', -0.3);
  }
  // rote Blütendolden
  for (const [ex, ey] of stiele) {
    for (let j = 0; j < 16; j++) {
      const a = rnd() * TAU, rr = Math.sqrt(rnd()) * 42;
      blume(o, ex + Math.cos(a) * rr, ey + Math.sin(a) * rr * 0.8, 11, j % 3 ? '#e8263a' : '#ff4a5a', '#ffd0d4', 5, rnd() * 3);
    }
    for (let j = 0; j < 4; j++) kreis(o, ex + (rnd() - 0.5) * 50, ey - 30 + (rnd() - 0.5) * 30, 5, '#a81830');
  }
  o.restore();
}

// ----- Obstwiese -----
GEGEND.obstwiese = {
  fern(o, P) {
    const f = welle(100, 46, 0.004, 0.3);
    kamm(o, P, f, P.dunst([140, 190, 120], 0.5));
    for (let u = PU0; u < PU0 + PW; u += 70 + P.rnd() * 40) {
      const y = P.G - f(u) + 10, c = P.dunst([80, 140, 70], 0.45);
      o.fillStyle = rgb(P.dunst([90, 70, 50], 0.45)); o.fillRect(u - 2, y - 26, 4, 26);
      kreis(o, u, y - 34, 18, rgb(c));
      for (let k = 0; k < 4; k++) kreis(o, u + (P.rnd() - 0.5) * 24, y - 34 + (P.rnd() - 0.5) * 20, 1.8, rgb(P.dunst([220, 70, 60], 0.45)));
    }
  },
  mitte(o, P) {
    const f = welle(36, 12, 0.006, 1);
    for (let u = PU0 + 60; u < PU0 + PW; u += 180 + P.rnd() * 70) {
      const y = P.G - f(u) + 6, c = P.dunst([70, 140, 60], 0.15);
      o.fillStyle = rgb(P.dunst([100, 70, 40], 0.15)); o.fillRect(u - 4, y - 60, 8, 60);
      busch(o, u, y - 44, 56, c, P.rnd, 10);
      for (let k = 0; k < 9; k++) kreis(o, u + (P.rnd() - 0.5) * 80, y - 80 + (P.rnd() - 0.5) * 50, 3.2, rgb(P.dunst(P.rnd() < 0.7 ? [226, 60, 50] : [240, 200, 60], 0.15)));
    }
    kamm(o, P, f, P.dunst([110, 180, 80], 0.1));
  },
  nah(o, N) {
    const { rnd } = N;
    laubbaum(o, -60, GY, 0.9, rnd, { laub: ['#4caa3a', '#5fc04a', '#74c450'], frucht: '#f0c030', fruchtN: 30, fruchtR: 8 });
    laubbaum(o, 1880, GY, 0.85, rnd, { laub: ['#4caa3a', '#5fc04a', '#74c450'], frucht: '#e8342c', fruchtN: 30, fruchtR: 8 });
    laubbaum(o, 330, GY, 1.3, rnd, { laub: ['#3d8a32', '#4caa3a', '#5fc04a', '#2f7a2a'], frucht: '#e8342c', fruchtN: 60, fruchtR: 11 });
    laubbaum(o, 1640, GY, 1.2, rnd, { laub: ['#3d8a32', '#4caa3a', '#5fc04a', '#2f7a2a'], frucht: '#a8122a', fruchtN: 70, kirsche: true });
    // Leiter am Apfelbaum
    const lx = 450;
    for (const d of [0, 34]) linie(o, '#c08a4e', 6, lx + d, GY, lx - 90 + d, GY - 330);
    for (let k = 1; k < 10; k++) { const s = k / 10; linie(o, '#d8a468', 4, lx - s * 90, GY - s * 330, lx + 34 - s * 90, GY - s * 330); }
    // Korb mit Äpfeln
    const kx = 540;
    o.fillStyle = lg(o, 0, GY - 40, 0, GY, '#d8a060', '#9a6430'); o.beginPath(); o.moveTo(kx, GY - 40); o.lineTo(kx + 80, GY - 40); o.lineTo(kx + 70, GY); o.lineTo(kx + 10, GY); o.fill();
    for (let k = 0; k < 5; k++) linie(o, 'rgba(90,50,20,.4)', 1, kx + 2, GY - 32 + k * 7, kx + 78, GY - 32 + k * 7);
    kurve(o, '#9a6430', 4, kx + 6, GY - 40, kx + 40, GY - 90, kx + 74, GY - 40);
    for (let k = 0; k < 6; k++) kreis(o, kx + 12 + k * 11, GY - 42 - (k % 2) * 4, 8, k % 3 ? '#e8342c' : '#9ad040');
  },
  vorne(o, V) {
    const { rnd } = V;
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W, r = V.frei(x, 12) ? 8 + rnd() * 4 : 5, c = ['#e8342c', '#d82a24', '#9ad040', '#f0c030'][i % 4];
      kreis(o, x, V.gy - r * 0.8, r, c); oval(o, x - r * 0.35, V.gy - r * 1.1, r * 0.3, r * 0.2, 'rgba(255,255,255,.45)');
      linie(o, '#5a3a22', 1.4, x, V.gy - r * 1.7, x + 1, V.gy - r * 2.2);
      if (i % 5 === 0) { oval(o, x + r * 0.5, V.gy - r * 0.9, r * 0.4, r * 0.5, '#fff4d8'); }
    }
    for (let i = 0; i < 120; i++) { const x = rnd() * W, [bx, by] = stiel(o, x, V.gy, 8 + rnd() * 14, '#3e8e2e', 1); blume(o, bx, by, 2.4, BLUETEN[(rnd() * BLUETEN.length) | 0]); }
  },
  insekten: 'bienen',
};

// ----- Am Kornfeld -----
GEGEND.kornfeld = {
  fern(o, P) {
    const f = welle(80, 30, 0.003, 2);
    kamm(o, P, f, P.dunst([236, 200, 110], 0.4), P.dunst([220, 176, 80], 0.35));
    for (let k = 0; k < 40; k++) { o.strokeStyle = rgb(P.dunst([200, 160, 70], 0.4), 0.4); o.lineWidth = 1; o.beginPath(); for (let u = PU0; u < PU0 + PW; u += 30) o.lineTo(u, P.G - f(u) + 6 + k * 4 + Math.sin(u * 0.002 + k) * 3); o.stroke(); }
    // Bauernhof
    const u = 1300, y = P.G - f(1300) + 4;
    o.fillStyle = rgb(P.dunst([190, 70, 50], 0.45)); o.fillRect(u, y - 46, 90, 46); o.beginPath(); o.moveTo(u - 8, y - 44); o.lineTo(u + 45, y - 80); o.lineTo(u + 98, y - 44); o.fill();
    o.fillStyle = rgb(P.dunst([230, 220, 200], 0.45)); o.fillRect(u + 100, y - 70, 18, 70);
    baumreihe(o, P, f, 20, P.dunst([90, 140, 70], 0.45), P.rnd, { luecke: u2 => Math.abs(u2 - 1360) > 160 && Math.abs(u2 - 400) > 120 });
  },
  mitte(o, P) {
    const f = welle(60, 10, 0.005, 1);
    kamm(o, P, f, P.dunst([232, 196, 96], 0.1), [210, 170, 70]);
    for (let u = PU0; u < PU0 + PW; u += 3 + P.rnd() * 4) {
      const y = P.G - f(u) + 4 + P.rnd() * 8;
      aehre(o, u, y, 12 + P.rnd() * 10, P.dunst([226 + P.rnd() * 20, 186, 90], 0.1), P.rnd, 3);
    }
    for (let i = 0; i < 160; i++) { const u = PU0 + P.rnd() * PW; mohn(o, u, P.G - f(u) + 8 + P.rnd() * 40, 3 + P.rnd() * 2.5); }
    for (let i = 0; i < 70; i++) { const u = PU0 + P.rnd() * PW; kornblume(o, u, P.G - f(u) + 10 + P.rnd() * 40, 2.6); }
  },
  nah(o, N) {
    const { rnd } = N;
    // Vogelscheuche
    const x = 1390, h = 330;
    linie(o, '#7a5a34', 10, x, GY, x, GY - h);
    linie(o, '#7a5a34', 8, x - 120, GY - h + 90, x + 120, GY - h + 90);
    o.fillStyle = '#c8402e'; o.beginPath(); o.moveTo(x - 110, GY - h + 80); o.lineTo(x + 110, GY - h + 80); o.lineTo(x + 70, GY - h + 112); o.lineTo(x + 50, GY - h + 200); o.lineTo(x - 50, GY - h + 200); o.lineTo(x - 70, GY - h + 112); o.closePath(); o.fill();
    o.strokeStyle = 'rgba(255,230,200,.5)'; o.lineWidth = 2;
    for (let k = -100; k <= 100; k += 16) linie(o, 'rgba(120,20,10,.5)', 2, x + k, GY - h + 82, x + k * 0.5, GY - h + 198);
    for (let k = 0; k < 7; k++) linie(o, 'rgba(255,220,190,.35)', 2, x - 104 + k * 2, GY - h + 88 + k * 16, x + 104 - k * 2, GY - h + 88 + k * 16);
    oval(o, x + 30, GY - h + 150, 16, 18, '#6a8ac8');
    for (const d of [-1, 1]) for (let k = 0; k < 6; k++) linie(o, '#e8c868', 2, x + d * 112, GY - h + 88, x + d * (124 + k * 2), GY - h + 98 + k * 4);
    for (let k = 0; k < 8; k++) linie(o, '#e8c868', 2, x - 30 + k * 8, GY - h + 198, x - 36 + k * 9, GY - h + 222);
    // Kopf
    kreis(o, x, GY - h + 50, 32, '#e8d4a8');
    for (const d of [-12, 12]) { linie(o, '#3a2a1a', 3, x + d - 5, GY - h + 40, x + d + 5, GY - h + 50); linie(o, '#3a2a1a', 3, x + d + 5, GY - h + 40, x + d - 5, GY - h + 50); }
    kurve(o, '#3a2a1a', 2.5, x - 14, GY - h + 62, x, GY - h + 70, x + 14, GY - h + 62);
    o.fillStyle = '#8a6a3a'; o.beginPath(); o.ellipse(x, GY - h + 22, 52, 9, 0, 0, TAU); o.fill();
    o.beginPath(); o.roundRect(x - 26, GY - h - 18, 52, 40, [14, 14, 2, 2]); o.fill();
    o.fillStyle = '#c8402e'; o.fillRect(x - 26, GY - h + 10, 52, 7);
    for (let k = 0; k < 8; k++) linie(o, '#e8c868', 2, x - 30 + k * 9, GY - h + 76, x - 34 + k * 10, GY - h + 88);
    // Krähe auf dem Arm
    const kx = x + 96, ky = GY - h + 84;
    oval(o, kx, ky - 12, 16, 11, '#2a2a34'); kreis(o, kx + 12, ky - 22, 8, '#2a2a34');
    o.fillStyle = '#f2b000'; o.beginPath(); o.moveTo(kx + 18, ky - 24); o.lineTo(kx + 28, ky - 21); o.lineTo(kx + 18, ky - 19); o.fill();
    kreis(o, kx + 14, ky - 24, 1.8, '#fff'); oval(o, kx - 16, ky - 8, 12, 5, '#1a1a24', 0.3);
    // hohe Halme an den Rändern
    for (const [x0, x1] of [[-330, 560], [1560, 2250]]) for (let xx = x0; xx < x1; xx += 7 + rnd() * 6) aehre(o, xx, GY + 4, 120 + rnd() * 90, [226 + rnd() * 20, 190, 96], rnd, (rnd() - 0.4) * 30);
    for (let i = 0; i < 16; i++) { const xx = [-200, 100, 300, 1700, 1900, 2100][i % 6] + rnd() * 80; const [bx, by] = stiel(o, xx, GY, 90 + rnd() * 100, '#4a8a32', 2); mohn(o, bx, by, 13); }
  },
  gras: 'aehren',
  vorne(o, V) {
    const { rnd } = V;
    for (let i = 0; i < 30; i++) { const x = rnd() * W, [bx, by] = stiel(o, x, V.gy, V.frei(x, 8) ? 26 + rnd() * 24 : 12 + rnd() * 6, '#4a8a32', 1.1); mohn(o, bx, by, 5); }
    for (let i = 0; i < 24; i++) { const x = rnd() * W, [bx, by] = stiel(o, x, V.gy, V.frei(x, 8) ? 22 + rnd() * 20 : 10 + rnd() * 6, '#4a8a32', 1.1); kornblume(o, bx, by, 4.5); }
  },
  insekten: 'falter',
};

// ----- Am Seerosenteich -----
const TEICH = { y0: GY - 40 };
GEGEND.teich = {
  fern(o, P) {
    const f = welle(110, 40, 0.004, 2);
    kamm(o, P, f, P.dunst([120, 180, 150], 0.5));
    baumreihe(o, P, f, 30, P.dunst([70, 130, 100], 0.45), P.rnd, { oval: 1.2 });
  },
  mitte(o, P) {
    const f = welle(46, 10, 0.006);
    kamm(o, P, f, P.dunst([80, 150, 100], 0.12));
    for (let u = PU0; u < PU0 + PW; u += 10 + P.rnd() * 22) { if (P.rnd() < 0.3) rohrkolben(o, u, P.G - f(u) + 8, 50 + P.rnd() * 40); else schilf(o, u, P.G - f(u) + 8, 40 + P.rnd() * 40, P.rnd, P.dunst([80, 140, 80], 0.12)); }
  },
  nah(o, N) {
    const { rnd } = N;
    const y0 = TEICH.y0;
    o.fillStyle = lg(o, 0, y0, 0, GY, '#a8e0e0', '#4aa0b0', '#2a7088');
    o.beginPath(); o.moveTo(-330, GY + 4); o.lineTo(-330, y0);
    for (let x = -330; x <= W + 330; x += 20) o.lineTo(x, y0 + Math.sin(x * 0.008) * 1.5);
    o.lineTo(W + 330, GY + 4); o.fill();
    o.fillStyle = 'rgba(80,120,60,.7)'; o.fillRect(-330, y0 - 3, W + 660, 4);
    // Spiegelung des Himmels
    for (let i = 0; i < 70; i++) { const x = -300 + rnd() * (W + 600), y = y0 + 4 + rnd() * 34; linie(o, 'rgba(255,255,255,.45)', 1.2, x, y, x + 10 + rnd() * 20, y); }
    // Seerosenblätter und Blüten
    for (let i = 0; i < 30; i++) {
      const x = -300 + rnd() * (W + 600), y = y0 + 8 + rnd() * 26, r = 16 + rnd() * 16;
      seerosenblatt(o, x, y, r);
      if (rnd() < 0.4) seerose(o, x + (rnd() - 0.5) * r, y - 2, 8 + rnd() * 5);
    }
    // Frosch auf dem Blatt
    seerosenblatt(o, FROSCH.x, FROSCH.y + 4, 40);
    frosch(o, FROSCH.x, FROSCH.y, 1);
    for (const [x0, x1] of [[-320, 560], [1560, 2240]]) for (let x = x0; x < x1; x += 20 + rnd() * 26) { if (rnd() < 0.4) rohrkolben(o, x, GY, 140 + rnd() * 100, (rnd() - 0.5) * 20); else schilf(o, x, GY, 100 + rnd() * 120, rnd, [80, 150, 80]); }
  },
  vorne(o, V) {
    const { rnd } = V;
    for (let i = 0; i < 36; i++) { const x = rnd() * W; if (V.frei(x, 12)) schilf(o, x, V.gy, 34 + rnd() * 40, rnd); }
    for (let i = 0; i < 40; i++) { const x = rnd() * W, [bx, by] = stiel(o, x, V.gy, V.frei(x, 8) ? 16 + rnd() * 14 : 8 + rnd() * 5, '#3e8e2e', 1.2); oval(o, bx - 4, by + 5, 5, 3, '#4aa83a', 0.4); blume(o, bx, by, 4, '#ffd21f', '#f2a000', 5); }
    for (let i = 0; i < 24; i++) { const x = rnd() * W; stein(o, x, V.gy + 3, 8 + rnd() * 12, 5 + rnd() * 5, '#c8ccc4', '#808a84'); }
  },
  anim(ctx, t, nacht) {
    // Wellenringe & Glitzern
    for (let i = 0; i < 6; i++) {
      const p = (t * 0.25 + i / 6) % 1, x = (i * 397 + 140) % W, y = TEICH.y0 + 14 + (i % 3) * 7;
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - p)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(x, y, 4 + p * 26, 1 + p * 4, 0, 0, TAU); ctx.stroke();
    }
    // Frosch blinzelt und bläht die Schallblase
    const blase = Math.max(0, Math.sin(t * 1.3)) ** 6;
    if (blase > 0.02) { ctx.fillStyle = `rgba(250,240,200,${0.9})`; ctx.beginPath(); ctx.ellipse(FROSCH.x + 14, FROSCH.y - 14, 6 + blase * 9, 5 + blase * 7, 0, 0, TAU); ctx.fill(); }
    if ((t % 4) < 0.15) for (const d of [-9, 9]) { ctx.fillStyle = '#5aa83a'; ctx.beginPath(); ctx.ellipse(FROSCH.x + d, FROSCH.y - 34, 6.5, 6.5, 0, 0, TAU); ctx.fill(); }
    if (nacht > 0.3) for (let i = 0; i < 5; i++) drawGlow(ctx, '230,255,160', (i * 431 + Math.sin(t + i) * 40) % W, TEICH.y0 - 20 - (i % 3) * 18, 8, nacht * (0.5 + 0.5 * Math.sin(t * 3 + i)));
  },
  insekten: 'libellen',
};
const FROSCH = { x: 1400, y: GY - 22 };
function seerosenblatt(o, x, y, r) {
  o.fillStyle = '#3f8a3a'; o.beginPath(); o.ellipse(x, y, r, r * 0.32, 0, 0.25, TAU - 0.05); o.lineTo(x, y); o.fill();
  o.fillStyle = '#5fb44a'; o.beginPath(); o.ellipse(x, y - 1.5, r * 0.94, r * 0.27, 0, 0.25, TAU - 0.05); o.lineTo(x, y - 1.5); o.fill();
  o.strokeStyle = 'rgba(40,90,30,.5)'; o.lineWidth = 0.8;
  for (let k = 1; k < 6; k++) { const a = k * TAU / 6; o.beginPath(); o.moveTo(x, y - 1.5); o.lineTo(x + Math.cos(a) * r * 0.85, y - 1.5 + Math.sin(a) * r * 0.24); o.stroke(); }
}
function seerose(o, x, y, r) {
  for (let ring = 0; ring < 2; ring++) for (let k = 0; k < 7; k++) {
    const a = Math.PI + (k / 6) * Math.PI, rr = r * (1 - ring * 0.35);
    o.fillStyle = ring ? '#ffd0e0' : '#ff9ac0';
    o.beginPath(); o.ellipse(x + Math.cos(a) * rr * 0.6, y + Math.sin(a) * rr * 0.75, rr * 0.22, rr * 0.55, a + Math.PI / 2, 0, TAU); o.fill();
  }
  kreis(o, x, y - r * 0.2, r * 0.22, '#ffd84a');
}
function frosch(o, x, y, s) {
  o.save(); o.translate(x, y); o.scale(s, s);
  oval(o, 0, -12, 26, 18, '#4a9a32');
  oval(o, -18, -2, 12, 7, '#3f8a2a', -0.3); oval(o, 18, -2, 12, 7, '#3f8a2a', 0.3);
  oval(o, 0, -6, 16, 10, '#e8f0b0');
  for (const d of [-9, 9]) { kreis(o, d, -32, 7.5, '#5aa83a'); kreis(o, d, -33, 5, '#fff'); kreis(o, d + 1, -33, 2.6, '#1a1a1a'); kreis(o, d + 2, -34, 0.9, '#fff'); }
  kurve(o, '#1f4a14', 1.8, -12, -20, 0, -14, 12, -20);
  for (let k = 0; k < 5; k++) kreis(o, -14 + k * 6, -18 - (k % 2) * 4, 1.8, 'rgba(30,80,20,.5)');
  oval(o, -10, -26, 6, 3, 'rgba(255,255,255,.3)', -0.4);
  o.restore();
}

// ----- Im Pilzwald -----
const LEUCHTPILZE = [[600, GY, 0.5], [700, GY, 0.32], [1300, GY, 0.42], [1720, GY, 0.55], [1760, GY, 0.3], [180, GY, 0.5], [1640, GY, 0.28]];
GEGEND.pilzwald = {
  fern(o, P) {
    kamm(o, P, welle(90, 30, 0.004), P.dunst([110, 130, 150], 0.5));
    for (let u = PU0; u < PU0 + PW; u += 40 + P.rnd() * 60) { o.fillStyle = rgb(P.dunst([70, 86, 110], 0.5)); o.fillRect(u, P.G - 380, 10 + P.rnd() * 14, 400); }
    tannenreihe(o, P, welle(80, 20, 0.004), 220, P.dunst([60, 80, 100], 0.5), P.rnd, 0.3);
    for (let k = 0; k < 8; k++) nebel(o, PU0 + P.rnd() * PW, P.G - 60 - P.rnd() * 80, 300, 40, 0.4);
  },
  mitte(o, P) {
    const f = welle(20, 8, 0.008);
    for (let u = PU0; u < PU0 + PW; u += 70 + P.rnd() * 90) { o.fillStyle = rgb(P.dunst([50, 54, 66], 0.2)); o.fillRect(u, P.G - 600, 16 + P.rnd() * 20, 620); }
    for (let u = PU0; u < PU0 + PW; u += 180 + P.rnd() * 200) pilz(o, u, P.G - f(u) + 8, 1 + P.rnd() * 0.8, P.rnd() < 0.5 ? 'fliegen' : 'stein', P.rnd);
    kamm(o, P, f, P.dunst([60, 100, 64], 0.15));
    for (let k = 0; k < 10; k++) nebel(o, PU0 + P.rnd() * PW, P.G - 30 - P.rnd() * 60, 240, 30, 0.35);
  },
  nah(o, N) {
    const { rnd } = N;
    pilz(o, -150, GY + 4, 2.6, 'stein', rnd);
    pilz(o, 1820, GY + 4, 2.2, 'fliegen', rnd);
    pilz(o, 420, GY + 4, 4.2, 'fliegen', rnd);
    pilz(o, 1480, GY + 4, 3.6, 'stein', rnd);
    pilz(o, 640, GY + 4, 1.4, 'klein', rnd);
    pilz(o, 1660, GY + 4, 1.3, 'fliegen', rnd);
    for (const [x, y, s] of LEUCHTPILZE) pilz(o, x, y + 2, s, 'leucht', rnd);
    for (let k = 0; k < 7; k++) nebel(o, -200 + rnd() * (W + 400), GY - 30 - rnd() * 90, 260 + rnd() * 160, 40, 0.3);
    for (let i = 0; i < 24; i++) { const x = -300 + rnd() * (W + 600); oval(o, x, GY + 2, 30 + rnd() * 30, 9, '#5a8a4a'); oval(o, x - 6, GY - 3, 18, 4, '#7ab060'); }
  },
  vorne(o, V) {
    const { rnd } = V;
    for (let i = 0; i < 40; i++) { const x = rnd() * W; oval(o, x, V.gy, 8 + rnd() * 10, 4 + rnd() * 4, '#5f9a4e'); oval(o, x - 2, V.gy - 2, 5, 2, '#86c46a'); }
    for (let i = 0; i < 26; i++) { const x = rnd() * W, art = ['fliegen', 'klein', 'leucht', 'stein'][i % 4]; pilz(o, x, V.gy + 1, V.frei(x, 10) ? 0.2 + rnd() * 0.2 : 0.12, art, rnd); }
    for (let i = 0; i < 40; i++) { const x = rnd() * W; o.save(); o.translate(x, V.gy - 1); o.rotate(rnd() * 3); oval(o, 0, 0, 6, 3, ['#c0662a', '#d88c34', '#8a6a2a'][i % 3]); o.restore(); }
  },
  anim(ctx, t, nacht) {
    const k = 0.35 + nacht * 0.6;
    for (const [i, [x, y, s]] of LEUCHTPILZE.entries()) drawGlow(ctx, '120,255,220', x, y - 72 * s, 60 * s + 10, k * (0.7 + 0.3 * Math.sin(t * 1.4 + i)));
    for (let i = 0; i < 14; i++) {
      const p = (t * 0.06 + i * 0.071) % 1, x = (i * 173 + Math.sin(t * 0.7 + i) * 30) % W, y = GY - 10 - p * 260;
      drawGlow(ctx, i % 2 ? '160,255,230' : '220,180,255', x, y, 4, k * Math.sin(p * Math.PI));
    }
  },
  insekten: 'keine',
};

// ----- Im Steingarten -----
function platte(o, x, y, w, h, c1 = '#d6d0c4', c2 = '#958d80') {
  o.fillStyle = 'rgba(30,25,20,.3)'; o.beginPath(); o.roundRect(x - w / 2 + 3, y - h / 2 + 4, w, h, h * 0.45); o.fill();
  o.fillStyle = lg(o, 0, y - h / 2, 0, y + h / 2, c1, c2); o.beginPath(); o.roundRect(x - w / 2, y - h / 2, w, h, h * 0.45); o.fill();
  o.fillStyle = 'rgba(255,255,255,.3)'; o.fillRect(x - w / 2 + h * 0.4, y - h / 2 + 2, w - h * 0.8, 2);
}
function lavendel(o, x, gy, h, rnd) {
  for (let k = 0; k < 14; k++) {
    const b = (rnd() - 0.5) * h * 0.7, hh = h * (0.6 + rnd() * 0.5);
    halm(o, x + (rnd() - 0.5) * 10, gy, hh, '#7a9a6a', 1.2, b);
    for (let j = 0; j < 7; j++) oval(o, x + b - j * b * 0.04, gy - hh + j * 3.5, 2.6, 2, j % 2 ? '#8a6ad8' : '#a888f0');
  }
  for (let k = 0; k < 8; k++) oval(o, x + (rnd() - 0.5) * 18, gy - 4, 6, 2, '#9ab08a', (rnd() - 0.5));
}
function hauswurz(o, x, gy, r) {
  for (let ring = 0; ring < 3; ring++) for (let k = 0; k < 8; k++) {
    const a = Math.PI + (k / 7) * Math.PI, rr = r * (1 - ring * 0.3);
    o.fillStyle = ring === 0 ? '#5a9a5a' : ring === 1 ? '#7ab86a' : '#a8d890';
    o.beginPath(); o.ellipse(x + Math.cos(a) * rr * 0.6, gy - 2 + Math.sin(a) * rr * 0.5, rr * 0.18, rr * 0.45, a + Math.PI / 2, 0, TAU); o.fill();
    kreis(o, x + Math.cos(a) * rr * 1.02, gy - 2 + Math.sin(a) * rr * 0.92, 1.2, '#c0405a');
  }
}
GEGEND.steingarten = {
  fern(o, P) {
    const f = welle(100, 40, 0.004, 3);
    kamm(o, P, f, P.dunst([140, 180, 130], 0.5));
    for (let u = PU0; u < PU0 + PW; u += 9) for (let k = 0; k < 3; k++) { const y = P.G - f(u) + 30 + k * 9; o.fillStyle = rgb(P.dunst([180, 176, 166], 0.45)); o.beginPath(); o.roundRect(u + (k % 2) * 4, y, 8, 7, 2); o.fill(); }
  },
  mitte(o, P) {
    const f = welle(30, 10, 0.006, 1);
    kamm(o, P, f, P.dunst([120, 170, 100], 0.12));
    for (let u = PU0; u < PU0 + PW; u += 120 + P.rnd() * 150) {
      const y = P.G - f(u) + 8;
      stein(o, u, y, 80 + P.rnd() * 80, 40 + P.rnd() * 40, rgb(P.dunst([210, 204, 192], 0.15)), rgb(P.dunst([140, 134, 124], 0.15)));
      lavendel(o, u + 70, y, 40, P.rnd);
    }
  },
  nah(o, N) {
    const { rnd } = N;
    // Steinbeet aus gestapelten Platten links
    for (let k = 0; k < 9; k++) { const y = GY - 10 - k * 22, w = 400 - k * 34; platte(o, 360 + (rnd() - 0.5) * 30, y, w, 22 + rnd() * 6); }
    for (let k = 0; k < 6; k++) lavendel(o, 240 + k * 50, GY - 200 + Math.abs(k - 2.5) * 30, 50, rnd);
    for (let k = 0; k < 5; k++) hauswurz(o, 220 + k * 70, GY - 30 - k * 22, 12);
    for (let k = 0; k < 4; k++) lavendel(o, 600 + k * 34, GY, 60 + rnd() * 20, rnd);
    // Steinmännchen
    for (const [x, n, s] of [[1380, 6, 1.1], [1600, 5, 0.9], [1300, 4, 0.7]]) {
      let y = GY;
      for (let k = 0; k < n; k++) { const w = (70 - k * 9) * s, h = (24 - k * 1.5) * s; platte(o, x + (rnd() - 0.5) * 6, y - h / 2, w, h, '#e0dad0', '#9a9284'); y -= h - 2; }
    }
    stein(o, 1880, GY + 6, 200, 110, '#d0cabe', '#8a8478', true);
    for (let k = 0; k < 4; k++) lavendel(o, 1460 + k * 36, GY, 60 + rnd() * 20, rnd);
  },
  gras: 'duenn',
  vorne(o, V) {
    const { rnd } = V;
    for (let i = 0; i < 18; i++) { const x = rnd() * W; hauswurz(o, x, V.gy, V.frei(x, 10) ? 9 + rnd() * 5 : 6); }
    for (let i = 0; i < 18; i++) { const x = rnd() * W; o.fillStyle = '#6a9a4a'; o.beginPath(); o.ellipse(x, V.gy, 12, 7, 0, Math.PI, TAU); o.fill(); for (let k = 0; k < 10; k++) kreis(o, x + (rnd() - 0.5) * 20, V.gy - rnd() * 6, 1.5, ['#ff8ac8', '#ffffff', '#c890ff'][i % 3]); }
    for (let i = 0; i < 60; i++) { const x = rnd() * W, g = 150 + rnd() * 70; stein(o, x, V.gy + 2, 6 + rnd() * 8, 4 + rnd() * 4, `rgb(${g},${g * 0.97},${g * 0.92})`, `rgb(${g * 0.7},${g * 0.68},${g * 0.64})`); }
  },
  insekten: 'bienen',
};

// ----- Am Komposthaufen -----
const KOMPOST = { x: 1300, w: 360, h: 210 };
GEGEND.kompost = {
  fern(o, P) {
    const f = welle(100, 40, 0.004, 1.5);
    kamm(o, P, f, P.dunst([130, 180, 120], 0.5));
    baumreihe(o, P, f, 32, P.dunst([80, 130, 80], 0.45), P.rnd, { luecke: u => Math.sin(u * 0.007) > 0.5 });
  },
  mitte(o, P) {
    const f = welle(30, 10, 0.006, 2);
    for (let u = PU0; u < PU0 + PW; u += 36) busch(o, u, P.G - f(u) + 10, 56, P.dunst([60, 120, 60], 0.15), P.rnd, 4);
    kamm(o, P, f, P.dunst([96, 160, 70], 0.1));
  },
  nah(o, N) {
    const { rnd } = N;
    // Sonnenblumen
    for (const [x, h] of [[1740, 420], [1840, 340], [420, 380], [540, 300], [300, 440], [1680, 300]]) sonnenblume(o, x, GY, h, rnd);
    const { x, w, h } = KOMPOST, top = GY - h;
    // Haufen oben
    o.fillStyle = '#4a3420'; o.beginPath(); o.ellipse(x + w / 2, top + 10, w / 2 - 8, 50, 0, Math.PI, TAU); o.fill();
    for (let i = 0; i < 70; i++) { const a = Math.PI + rnd() * Math.PI, r = rnd(); o.save(); o.translate(x + w / 2 + Math.cos(a) * r * (w / 2 - 20), top + 8 + Math.sin(a) * r * 44); o.rotate(rnd() * 6); oval(o, 0, 0, 9, 4, ['#8a6a2a', '#c0662a', '#6a7a2a', '#a07030'][i % 4]); o.restore(); }
    // Apfelgriebsch, Bananenschale, Eierschale
    const gx = x + 90, gy = top - 22;
    o.fillStyle = '#f4e4b0'; o.beginPath(); o.moveTo(gx - 9, gy - 14); o.quadraticCurveTo(gx - 3, gy, gx - 9, gy + 14); o.lineTo(gx + 9, gy + 14); o.quadraticCurveTo(gx + 3, gy, gx + 9, gy - 14); o.fill();
    oval(o, gx, gy - 15, 12, 5, '#e8342c'); oval(o, gx, gy + 15, 12, 5, '#e8342c'); linie(o, '#5a3a22', 2, gx, gy - 19, gx + 2, gy - 27);
    o.fillStyle = '#f2d23a'; o.beginPath(); o.moveTo(x + 200, top - 10); o.quadraticCurveTo(x + 240, top - 50, x + 280, top - 20); o.quadraticCurveTo(x + 240, top - 36, x + 200, top - 10); o.fill();
    for (const d of [-1, 1]) { o.beginPath(); o.moveTo(x + 280, top - 20); o.quadraticCurveTo(x + 290 + d * 10, top - 6, x + 284 + d * 18, top + 2); o.lineTo(x + 280, top - 16); o.fill(); }
    kreis(o, x + 200, top - 10, 3, '#5a4a20');
    o.fillStyle = '#fbf6ea'; o.beginPath(); o.arc(x + 150, top - 8, 14, Math.PI, TAU); o.lineTo(x + 160, top - 6); o.lineTo(x + 150, top - 12); o.lineTo(x + 140, top - 6); o.fill();
    // Holzkiste aus Latten
    for (let k = 0; k < 6; k++) {
      const y = top + 14 + k * ((h - 14) / 6);
      o.fillStyle = lg(o, 0, y, 0, y + 26, '#c8935a', '#94643a'); o.fillRect(x - 6, y, w + 12, 26);
      o.fillStyle = 'rgba(40,24,12,.6)'; o.fillRect(x - 6, y + 26, w + 12, (h - 14) / 6 - 26);
      for (let j = 0; j < 4; j++) linie(o, 'rgba(90,50,20,.3)', 1, x + rnd() * w, y + 4 + rnd() * 18, x + rnd() * w, y + 4 + rnd() * 18);
    }
    for (const px of [x - 14, x + w / 2 - 8, x + w - 2]) { o.fillStyle = lg(o, px, 0, px + 16, 0, '#a87440', '#7a4e28'); o.fillRect(px, top - 6, 16, h + 6); }
    o.fillStyle = '#f4f0e0'; o.font = 'bold 22px Fredoka, sans-serif'; o.textAlign = 'center'; o.fillText('♻', x + w / 2, top + 66);
    // Grabegabel
    linie(o, '#8a6034', 6, x - 70, GY, x - 30, top - 120); for (let k = -1; k <= 1; k++) linie(o, '#9aa4ae', 3, x - 70 + k * 7, GY - 2, x - 64 + k * 7, GY - 50);
    o.fillStyle = '#9aa4ae'; o.fillRect(x - 82, GY - 54, 28, 5);
  },
  vorne(o, V) {
    const { rnd } = V;
    for (let i = 0; i < 18; i++) { const x = rnd() * W; o.fillStyle = '#fbf6ea'; o.beginPath(); o.arc(x, V.gy, 6 + rnd() * 3, Math.PI, TAU); o.lineTo(x + 3, V.gy - 2); o.lineTo(x, V.gy - 5); o.lineTo(x - 3, V.gy - 2); o.fill(); o.strokeStyle = 'rgba(180,160,120,.6)'; o.lineWidth = 0.7; o.stroke(); }
    for (let i = 0; i < 60; i++) { const x = rnd() * W; o.save(); o.translate(x, V.gy - 1); o.rotate(rnd() * 3); oval(o, 0, 0, 7, 3.5, ['#c0662a', '#d88c34', '#8a6a2a', '#a04a24'][i % 4]); o.restore(); }
    for (const x of [W * 0.27, W * 0.71]) { o.lineCap = 'round'; o.strokeStyle = '#b45a64'; o.lineWidth = 6; o.beginPath(); for (let k = 0; k <= 10; k++) o.lineTo(x + k * 4, V.gy - 3 - Math.max(0, Math.sin(k * 0.6)) * 8); o.stroke(); o.strokeStyle = '#e8909a'; o.lineWidth = 4; o.stroke(); kreis(o, x + 40, V.gy - 3, 2.6, '#e8909a'); }
  },
  anim(ctx, t) {
    const { x, w, h } = KOMPOST;
    for (let i = 0; i < 5; i++) {
      const p = (t * 0.18 + i / 5) % 1, bx = x + 60 + i * 60;
      ctx.fillStyle = `rgba(255,255,255,${0.22 * Math.sin(p * Math.PI)})`;
      ctx.beginPath(); ctx.arc(bx + Math.sin(p * 6 + i) * 10, GY - h - 30 - p * 90, 8 + p * 14, 0, TAU); ctx.fill();
    }
  },
  insekten: 'falter',
};
function sonnenblume(o, x, gy, h, rnd) {
  linie(o, '#4a8a32', 7, x, gy, x + 6, gy - h);
  for (let k = 0; k < 5; k++) { const y = gy - h * (0.2 + k * 0.15), d = k % 2 ? 1 : -1; o.fillStyle = '#4f9a3a'; o.beginPath(); o.ellipse(x + d * 26, y, 30, 14, d * 0.5, 0, TAU); o.fill(); }
  const cx = x + 6, cy = gy - h;
  for (let k = 0; k < 22; k++) { const a = k * TAU / 22; oval(o, cx + Math.cos(a) * 38, cy + Math.sin(a) * 38, 22, 8, k % 2 ? '#ffc21f' : '#ffd84a', a); }
  kreis(o, cx, cy, 30, '#6a3a14');
  for (let k = 0; k < 60; k++) { const a = k * 2.4, r = Math.sqrt(k) * 3.8; kreis(o, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.6, '#3a2008'); }
}

// ----- In der Heide -----
function heidekraut(o, x, gy, h, rnd, c = [170, 110, 190]) {
  c = col(c);
  for (let k = 0; k < 8; k++) {
    const b = (rnd() - 0.5) * h * 0.8, hh = h * (0.5 + rnd() * 0.6);
    halm(o, x + (rnd() - 0.5) * 6, gy, hh, '#5a4a3a', 1, b);
    for (let j = 0; j < 6; j++) { const s = 0.45 + j * 0.1; kreis(o, x + b * s * s, gy - hh * s, 1.6 + rnd(), rgb(hell(c, (rnd() - 0.5) * 0.4))); }
  }
}
GEGEND.heide = {
  fern(o, P) {
    const f = welle(100, 40, 0.004, 0.5);
    kamm(o, P, f, P.dunst([186, 130, 196], 0.45), P.dunst([150, 100, 160], 0.4));
    tupfen(o, P, f, 1600, ['#d8a0e0', '#b880c8', '#e8c0f0'].map(c => rgb(P.dunst(hex(c), 0.45))), P.rnd, 0.8, 2.2, 140);
    for (let i = 0; i < 40; i++) { const u = PU0 + P.rnd() * PW; wacholder(o, u, P.G - f(u) + 14, 30 + P.rnd() * 20, P.dunst([46, 84, 52], 0.45), P.rnd); }
  },
  mitte(o, P) {
    const f = welle(40, 16, 0.006, 2);
    for (let u = PU0 + 100; u < PU0 + PW; u += 260 + P.rnd() * 260) birke(o, u, P.G - f(u) + 10, 200 + P.rnd() * 80, P.rnd, ['#9ad468', '#b0dc78', '#84c058'].map(c => rgb(P.dunst(hex(c), 0.12))));
    kamm(o, P, f, P.dunst([160, 100, 176], 0.12), P.dunst([130, 80, 140], 0.1));
    tupfen(o, P, f, 2600, ['#c070d8', '#e0a0f0', '#a050c0', '#f0c8f8'], P.rnd, 1, 2.8, 140);
    for (let i = 0; i < 22; i++) { const u = PU0 + P.rnd() * PW; wacholder(o, u, P.G - f(u) + 14, 60 + P.rnd() * 40, P.dunst([46, 84, 52], 0.12), P.rnd); }
  },
  nah(o, N) {
    const { rnd } = N;
    birke(o, 300, GY, 640, rnd); birke(o, 1660, GY, 560, rnd); birke(o, -140, GY, 520, rnd);
    wacholder(o, 560, GY, 220, [46, 84, 52], rnd); wacholder(o, 1420, GY, 260, [40, 78, 48], rnd); wacholder(o, 1860, GY, 170, [46, 84, 52], rnd);
    for (let x = -320; x < W + 320; x += 30) if (x < 700 || x > 1280) heidekraut(o, x, GY + 4, 40 + rnd() * 40, rnd);
  },
  gras: 'heide',
  vorne(o, V) {
    const { rnd } = V;
    for (let i = 0; i < 30; i++) { const x = rnd() * W; if (V.frei(x, 20)) heidekraut(o, x, V.gy, 26 + rnd() * 20, rnd); }
    for (let i = 0; i < 4; i++) { const x = rnd() * W; if (V.frei(x, 30)) wacholder(o, x, V.gy + 2, 50 + rnd() * 30, [46, 84, 52], rnd); }
  },
  insekten: 'bienen',
};

// ----- Unter dem Baumhaus -----
const BAUM = { x: 1480, hausY: GY - 250 };
GEGEND.baumhaus = {
  fern(o, P) {
    const f = welle(110, 40, 0.004, 1);
    kamm(o, P, f, P.dunst([130, 186, 130], 0.5));
    baumreihe(o, P, f, 30, P.dunst([80, 140, 80], 0.45), P.rnd);
  },
  mitte(o, P) {
    const f = welle(36, 14, 0.006, 2.5);
    baumreihe(o, P, u => f(u) + 30, 50, P.dunst([60, 120, 56], 0.18), P.rnd, { step: 50 });
    kamm(o, P, f, P.dunst([100, 170, 76], 0.1));
  },
  nah(o, N) {
    const { rnd } = N;
    const x = BAUM.x, hy = BAUM.hausY;
    // Krone hinten
    for (let k = 0; k < 60; k++) {
      const a = rnd() * TAU, rr = Math.sqrt(rnd());
      const bx = x + Math.cos(a) * rr * 520, by = -150 + Math.sin(a) * rr * 200, r = 60 + rnd() * 60;
      const g = o.createRadialGradient(bx - r * 0.3, by - r * 0.4, r * 0.2, bx, by, r);
      g.addColorStop(0, ['#3d9a3a', '#4cb04a', '#5fc957', '#2f7d32'][k % 4]); g.addColorStop(1, '#1f5a22');
      o.fillStyle = g; o.beginPath(); o.arc(bx, by, r, 0, TAU); o.fill();
    }
    // mächtiger Stamm mit Ästen
    o.fillStyle = lg(o, x - 90, 0, x + 90, 0, '#6a4428', '#8a5a34', '#5a3820', '#3a2414');
    o.beginPath(); o.moveTo(x - 160, GY + 4); o.quadraticCurveTo(x - 70, GY - 60, x - 72, GY - 300); o.lineTo(x - 60, -100); o.lineTo(x + 60, -100); o.lineTo(x + 72, GY - 300); o.quadraticCurveTo(x + 70, GY - 60, x + 170, GY + 4); o.fill();
    o.strokeStyle = 'rgba(30,16,6,.45)'; o.lineCap = 'round';
    for (let k = 0; k < 18; k++) { const bx = x - 60 + rnd() * 120; o.lineWidth = 2 + rnd() * 3; o.beginPath(); o.moveTo(bx, -60 + rnd() * 100); o.quadraticCurveTo(bx + (rnd() - 0.5) * 20, GY - 200, bx + (bx - x) * 0.4, GY - rnd() * 30); o.stroke(); }
    o.strokeStyle = '#5a3a22'; o.lineWidth = 26;
    o.beginPath(); o.moveTo(x - 30, hy - 40); o.quadraticCurveTo(x - 220, hy - 120, x - 360, -120); o.stroke();
    o.lineWidth = 20; o.beginPath(); o.moveTo(x + 30, hy - 80); o.quadraticCurveTo(x + 220, hy - 160, x + 330, -150); o.stroke();
    kreis(o, x + 20, GY - 210, 14, '#3a2414'); kreis(o, x + 20, GY - 210, 9, '#1a0e06');
    // Wurzeln an der Oberfläche
    for (const [d, l] of [[-1, 220], [1, 240], [-1, 120], [1, 140]]) {
      o.fillStyle = '#6a4428'; o.beginPath(); o.moveTo(x + d * 60, GY - 30); o.quadraticCurveTo(x + d * l * 0.6, GY - 26, x + d * l, GY + 4); o.lineTo(x + d * 50, GY + 4); o.fill();
    }
    // Plattform & Baumhaus
    o.fillStyle = lg(o, 0, hy, 0, hy + 16, '#c8935a', '#8a5a30'); o.fillRect(x - 200, hy, 400, 16);
    linie(o, '#8a5a30', 9, x - 180, hy + 16, x - 60, hy + 130); linie(o, '#8a5a30', 9, x + 180, hy + 16, x + 60, hy + 130);
    for (let k = 0; k < 9; k++) linie(o, '#a8743f', 4, x - 196 + k * 49, hy, x - 196 + k * 49, hy - 34);
    linie(o, '#a8743f', 5, x - 200, hy - 34, x + 200, hy - 34);
    const hx = x - 110, hw = 200, hh = 140;
    o.fillStyle = lg(o, hx, 0, hx + hw, 0, '#e0b070', '#c08850'); o.fillRect(hx, hy - hh, hw, hh);
    for (let k = 1; k < 7; k++) linie(o, 'rgba(90,50,20,.35)', 1.5, hx, hy - hh + k * 20, hx + hw, hy - hh + k * 20);
    o.fillStyle = '#d8463c'; o.beginPath(); o.moveTo(hx - 26, hy - hh + 4); o.lineTo(hx + hw / 2, hy - hh - 90); o.lineTo(hx + hw + 26, hy - hh + 4); o.fill();
    o.fillStyle = 'rgba(0,0,0,.18)'; for (let k = 0; k < 5; k++) o.fillRect(hx - 10 + k * 46, hy - hh - 20 + Math.abs(k - 2) * 18, 30, 3);
    // Fenster mit Vorhang & Tür
    o.fillStyle = '#5a3a20'; o.fillRect(hx + 22, hy - hh + 30, 56, 48); o.fillStyle = '#ffe9a0'; o.fillRect(hx + 26, hy - hh + 34, 48, 40);
    o.fillStyle = '#e8507a'; o.beginPath(); o.moveTo(hx + 26, hy - hh + 34); o.lineTo(hx + 44, hy - hh + 34); o.quadraticCurveTo(hx + 34, hy - hh + 56, hx + 26, hy - hh + 74); o.fill();
    o.beginPath(); o.moveTo(hx + 74, hy - hh + 34); o.lineTo(hx + 56, hy - hh + 34); o.quadraticCurveTo(hx + 66, hy - hh + 56, hx + 74, hy - hh + 74); o.fill();
    linie(o, '#5a3a20', 3, hx + 50, hy - hh + 34, hx + 50, hy - hh + 74);
    o.fillStyle = '#7a4a24'; o.beginPath(); o.roundRect(hx + 118, hy - 96, 54, 96, [26, 26, 0, 0]); o.fill(); kreis(o, hx + 160, hy - 46, 4, '#ffd34d');
    o.fillStyle = '#fff'; o.beginPath(); o.roundRect(hx + 108, hy - hh + 14, 74, 22, 4); o.fill();
    o.fillStyle = '#3a6ad8'; o.font = 'bold 14px Fredoka, sans-serif'; o.textAlign = 'center'; o.fillText('BAUMHAUS', hx + 145, hy - hh + 30);
    // Wimpelkette
    const wx0 = hx - 26, wx1 = x + 330, wy = hy - hh + 4;
    o.strokeStyle = '#eee'; o.lineWidth = 1.5; o.beginPath(); o.moveTo(wx0, wy); o.quadraticCurveTo((wx0 + wx1) / 2, wy + 90, wx1, -150); o.stroke();
    for (let k = 1; k < 14; k++) {
      const s = k / 14, px = (1 - s) * (1 - s) * wx0 + 2 * (1 - s) * s * ((wx0 + wx1) / 2) + s * s * wx1, py = (1 - s) * (1 - s) * wy + 2 * (1 - s) * s * (wy + 90) + s * s * -150;
      o.fillStyle = ['#ff5a5a', '#ffd34d', '#4fa8ff', '#7ad46a', '#c48bff'][k % 5]; o.beginPath(); o.moveTo(px - 10, py); o.lineTo(px + 10, py); o.lineTo(px, py + 22); o.fill();
    }
    // Strickleiter
    for (const d of [-20, 20]) { o.strokeStyle = '#d8b878'; o.lineWidth = 3; o.beginPath(); o.moveTo(x - 160 + d, hy + 16); o.quadraticCurveTo(x - 170 + d, GY - 160, x - 150 + d * 1.2, GY - 12); o.stroke(); }
    for (let k = 1; k < 13; k++) { const s = k / 13, y = hy + 16 + s * (GY - 28 - hy), dx = -160 - 10 * Math.sin(s * Math.PI) + s * 10; linie(o, '#a8743f', 5, x + dx - 22, y, x + dx + 22, y); }
  },
  gras: 'rasen',
  vorne(o, V) {
    const { rnd } = V;
    // verlorener Buntstift
    const sx = BAUM.x - 330;
    if (V.frei(sx, 70)) {
      o.save(); o.translate(sx, V.gy - 6); o.rotate(-0.06);
      o.fillStyle = '#ffcf3a'; o.fillRect(-60, -6, 100, 12); o.fillStyle = '#e8a020'; o.fillRect(-60, 0, 100, 3);
      o.fillStyle = '#f4d8b0'; o.beginPath(); o.moveTo(40, -6); o.lineTo(62, 0); o.lineTo(40, 6); o.fill();
      o.fillStyle = '#3a6ad8'; o.beginPath(); o.moveTo(55, -2); o.lineTo(62, 0); o.lineTo(55, 2); o.fill();
      o.fillStyle = '#ff8aa8'; o.fillRect(-70, -6, 10, 12); o.fillStyle = '#c8c8c8'; o.fillRect(-62, -6, 4, 12);
      o.restore();
    }
    for (let i = 0; i < 40; i++) { const x = rnd() * W; o.save(); o.translate(x, V.gy - 2); o.rotate(rnd() * 3); oval(o, 0, 0, 7, 3.5, ['#4caa3a', '#6abf4a', '#c0a030', '#c0662a'][i % 4]); linie(o, 'rgba(0,0,0,.25)', 0.6, -7, 0, 7, 0); o.restore(); }
    for (let i = 0; i < 10; i++) { const x = rnd() * W; oval(o, x, V.gy - 3, 4, 5, '#a8763f'); oval(o, x, V.gy - 7, 5, 2.5, '#6a4626'); }
  },
  insekten: 'falter',
};

// ----- Im Gewächshaus -----
GEGEND.gewaechshaus = {
  fern(o, P) {
    const f = welle(100, 40, 0.004);
    kamm(o, P, f, P.dunst([150, 200, 160], 0.55));
    baumreihe(o, P, f, 30, P.dunst([100, 160, 110], 0.55), P.rnd);
  },
  mitte(o, P) {
    // Pflanztische mit Töpfchen hinten
    const y = P.G - 60;
    o.fillStyle = rgb(P.dunst([150, 120, 90], 0.2)); o.fillRect(PU0, y, PW, 10);
    for (let u = PU0 + 20; u < PU0 + PW; u += 160) { o.fillRect(u, y, 8, 66); }
    for (let u = PU0 + 10; u < PU0 + PW; u += 26 + P.rnd() * 10) {
      o.fillStyle = rgb(P.dunst([200, 110, 70], 0.2)); o.beginPath(); o.moveTo(u - 9, y - 16); o.lineTo(u + 9, y - 16); o.lineTo(u + 7, y); o.lineTo(u - 7, y); o.fill();
      busch(o, u, y - 18, 16 + P.rnd() * 10, P.dunst([80, 170, 80], 0.2), P.rnd, 4);
    }
    kamm(o, P, () => 4, P.dunst([120, 100, 80], 0.2));
  },
  nah(o, N) {
    const { rnd } = N;
    // Tomatenpflanzen an Stäben
    for (const x0 of [300, 460, 1420, 1590]) {
      linie(o, '#c8a070', 5, x0, GY, x0, GY - 330);
      o.strokeStyle = '#4a8a32'; o.lineWidth = 4; o.beginPath();
      for (let y = GY; y > GY - 320; y -= 10) o.lineTo(x0 + Math.sin(y * 0.04) * 12, y);
      o.stroke();
      for (let y = GY - 30; y > GY - 320; y -= 26) {
        for (const d of [-1, 1]) { o.fillStyle = '#4f9a3a'; for (let k = 0; k < 4; k++) oval(o, x0 + d * (14 + k * 9), y - k * 3, 8, 5, k % 2 ? '#5fb447' : '#4f9a3a', d * 0.4); }
        if (rnd() < 0.7) for (let k = 0; k < 3; k++) { const tx = x0 + (rnd() - 0.5) * 34, ty = y + 10 + k * 6; kreis(o, tx, ty, 9, k === 2 ? '#f0a030' : '#e8342c'); oval(o, tx - 3, ty - 3, 3, 2, 'rgba(255,255,255,.5)'); for (let j = 0; j < 5; j++) linie(o, '#3f8a2e', 1.2, tx, ty - 8, tx + Math.cos(j * 1.25) * 4, ty - 8 + Math.sin(j * 1.25) * 2); }
      }
    }
    // Glasdach mit Streben
    const st = '#e8eef0';
    o.fillStyle = 'rgba(220,250,240,.12)'; o.fillRect(-330, -340, W + 660, GY + 340);
    for (let x = -320; x <= W + 320; x += 300) { o.fillStyle = lg(o, x, 0, x + 12, 0, '#ffffff', '#b8c4c8'); o.fillRect(x, -340, 12, GY + 340); }
    for (let k = 0; k < 2; k++) { const y = -60 + k * 260; o.fillStyle = lg(o, 0, y, 0, y + 10, '#ffffff', '#b8c4c8'); o.fillRect(-330, y, W + 660, 10); }
    o.strokeStyle = st; o.lineWidth = 8;
    for (let x = -320; x <= W + 320; x += 600) { o.beginPath(); o.moveTo(x, -60); o.lineTo(x + 300, -340); o.lineTo(x + 600, -60); o.stroke(); }
    // Spiegelungen & Wassertropfen an der Scheibe
    for (let k = 0; k < 10; k++) { const x = -300 + k * 300 + rnd() * 100; o.fillStyle = 'rgba(255,255,255,.14)'; o.beginPath(); o.moveTo(x, -340); o.lineTo(x + 40, -340); o.lineTo(x - 160, GY - 100); o.lineTo(x - 200, GY - 100); o.fill(); }
    for (let k = 0; k < 160; k++) {
      const x = -320 + rnd() * (W + 640), y = -330 + rnd() * 600, r = 1.5 + rnd() * 3;
      kreis(o, x, y, r, 'rgba(210,240,255,.35)'); kreis(o, x - r * 0.3, y - r * 0.3, r * 0.35, 'rgba(255,255,255,.8)');
      if (rnd() < 0.15) linie(o, 'rgba(210,240,255,.25)', r * 0.8, x, y - r * 4, x, y);
    }
    // Gießkanne
    const gx = 1860;
    o.fillStyle = lg(o, gx - 60, 0, gx + 60, 0, '#5ad08a', '#2fa060', '#1f7a48'); o.beginPath(); o.roundRect(gx - 60, GY - 120, 120, 120, [10, 10, 4, 4]); o.fill();
    o.fillStyle = '#2fa060'; o.beginPath(); o.moveTo(gx - 50, GY - 80); o.lineTo(gx - 150, GY - 170); o.lineTo(gx - 140, GY - 180); o.lineTo(gx - 40, GY - 100); o.fill();
    oval(o, gx - 148, GY - 178, 16, 8, '#1f7a48', -0.8);
    o.strokeStyle = '#2fa060'; o.lineWidth = 12; o.beginPath(); o.arc(gx + 20, GY - 120, 50, Math.PI * 1.1, Math.PI * 1.95); o.stroke();
    oval(o, gx - 30, GY - 90, 10, 30, 'rgba(255,255,255,.25)');
  },
  gras: 'rasen',
  vorne(o, V) {
    const { rnd } = V;
    for (let i = 0; i < 12; i++) {
      const x = rnd() * W; if (!V.frei(x, 14)) continue;
      o.fillStyle = '#c86a3a'; o.beginPath(); o.moveTo(x - 10, V.gy - 18); o.lineTo(x + 10, V.gy - 18); o.lineTo(x + 8, V.gy); o.lineTo(x - 8, V.gy); o.fill();
      o.fillStyle = '#d8805a'; o.fillRect(x - 11, V.gy - 20, 22, 4);
      linie(o, '#4a9a3a', 1.4, x, V.gy - 19, x, V.gy - 32); oval(o, x - 5, V.gy - 32, 5, 2.5, '#6ac04a', 0.3); oval(o, x + 5, V.gy - 33, 5, 2.5, '#6ac04a', -0.3);
    }
    for (let i = 0; i < 8; i++) { const x = rnd() * W; kreis(o, x, V.gy - 6, 6, '#e8342c'); oval(o, x - 2, V.gy - 8, 2, 1.4, 'rgba(255,255,255,.5)'); linie(o, '#3f8a2e', 1, x - 3, V.gy - 12, x + 3, V.gy - 12); }
  },
  insekten: 'falter',
};

// ----- An der Felswand -----
const FALL = { x: 470, y0: -160, y1: GY - 20 };
GEGEND.felsen = {
  fern(o, P) {
    const rnd = P.rnd;
    for (let u = PU0 - 200; u < PU0 + PW + 200; u += 260 + rnd() * 200) {
      const h = 220 + rnd() * 160, w = 320 + rnd() * 200, y = P.G + 20;
      o.fillStyle = rgb(P.dunst([120, 130, 160], 0.45)); o.beginPath(); o.moveTo(u - w / 2, y); o.lineTo(u - w * 0.1, y - h); o.lineTo(u + w / 2, y); o.fill();
      o.fillStyle = rgb(P.dunst([96, 104, 136], 0.45)); o.beginPath(); o.moveTo(u - w * 0.1, y - h); o.lineTo(u + w / 2, y); o.lineTo(u + w * 0.05, y); o.fill();
      o.fillStyle = 'rgba(255,255,255,.85)'; o.beginPath(); o.moveTo(u - w * 0.1, y - h); o.lineTo(u - w * 0.1 - w * 0.12, y - h + h * 0.22); o.lineTo(u - w * 0.05, y - h + h * 0.17); o.lineTo(u + w * 0.03, y - h + h * 0.25); o.fill();
    }
  },
  mitte(o, P) {
    const f = welle(90, 50, 0.005, 1);
    kamm(o, P, u => f(u) + Math.abs(Math.sin(u * 0.013)) * 60, P.dunst([130, 130, 136], 0.15), P.dunst([100, 100, 110], 0.15), 14);
    kamm(o, P, welle(26, 10, 0.006), P.dunst([110, 160, 90], 0.1));
    tannenreihe(o, P, welle(26, 10, 0.006), 90, P.dunst([50, 90, 60], 0.12), P.rnd, 0.6);
  },
  nah(o, N) {
    const { rnd } = N;
    // hohe graue Felswand links
    const pts = [[-330, -340], [520, -340], [560, -200], [500, -60], [600, 80], [560, 240], [660, 360], [700, GY + 6], [-330, GY + 6]];
    o.fillStyle = lg(o, -330, 0, 700, 0, '#6c707c', '#9aa0ac', '#80868f', '#5c606c');
    o.beginPath(); pts.forEach(([x, y], i) => (i ? o.lineTo(x, y) : o.moveTo(x, y))); o.fill();
    for (let k = 0; k < 26; k++) { // Schichten & Spalten
      const y = -320 + k * 32, x1 = 460 + Math.sin(k) * 60;
      linie(o, 'rgba(40,40,50,.35)', 2, -330, y + rnd() * 10, x1, y + rnd() * 14);
      linie(o, 'rgba(255,255,255,.12)', 2, -330, y + 3, x1 - 20, y + 5);
    }
    for (let k = 0; k < 18; k++) { const x = -300 + rnd() * 760, y = -300 + rnd() * 760; linie(o, 'rgba(30,30,40,.45)', 2.5, x, y, x + (rnd() - 0.5) * 30, y + 30 + rnd() * 40, x + (rnd() - 0.5) * 40, y + 70 + rnd() * 50); }
    // Felsvorsprünge mit Enzian & Edelweiß
    for (const [x, y] of [[240, 40], [80, 200], [380, 300], [150, 400]]) {
      o.fillStyle = '#8a909a'; o.beginPath(); o.ellipse(x, y, 70, 12, 0, 0, Math.PI); o.fill();
      o.fillStyle = '#6aa04a'; o.beginPath(); o.ellipse(x, y, 66, 7, 0, Math.PI, TAU); o.fill();
      for (let k = 0; k < 4; k++) { const fx = x - 50 + k * 30 + rnd() * 10; if (k % 2) enzian(o, fx, y - 3, 1); else edelweiss(o, fx, y - 6, 1); }
    }
    // Wasserfall in einer Rinne
    o.fillStyle = 'rgba(40,50,60,.5)'; o.fillRect(FALL.x - 24, FALL.y0, 48, FALL.y1 - FALL.y0);
    o.fillStyle = lg(o, FALL.x - 18, 0, FALL.x + 18, 0, '#bfe6ff', '#ffffff', '#a8d8f8'); o.fillRect(FALL.x - 18, FALL.y0, 36, FALL.y1 - FALL.y0);
    o.fillStyle = lg(o, 0, GY - 30, 0, GY, '#9fd8f8', '#3a8ac0'); o.beginPath(); o.ellipse(FALL.x + 20, GY - 8, 140, 26, 0, Math.PI, TAU); o.fill();
    // Felsbrocken rechts
    stein(o, 1540, GY + 6, 260, 190, '#a8aeb8', '#686e7a', true);
    stein(o, 1760, GY + 6, 180, 130, '#9aa0aa', '#60666f');
    stein(o, 1380, GY + 6, 90, 60, '#b0b6c0', '#70767f', true);
    for (const [x, y] of [[1500, GY - 192], [1560, GY - 186]]) edelweiss(o, x, y, 1.4);
  },
  gras: 'duenn',
  vorne(o, V) {
    const { rnd } = V;
    for (let i = 0; i < 14; i++) { const x = rnd() * W, big = V.frei(x, 24); stein(o, x, V.gy + 3, big ? 30 + rnd() * 26 : 14, big ? 20 + rnd() * 14 : 8, '#b4bac4', '#70767f', rnd() < 0.5); }
    for (let i = 0; i < 26; i++) { const x = rnd() * W, [bx, by] = stiel(o, x, V.gy, V.frei(x, 8) ? 14 + rnd() * 10 : 7, '#7a9a6a', 1.1); edelweiss(o, bx, by, 0.7); }
    for (let i = 0; i < 20; i++) { const x = rnd() * W; enzian(o, x, V.gy - 1, 0.8); }
    for (let i = 0; i < 30; i++) { const x = rnd() * W; oval(o, x, V.gy, 7 + rnd() * 6, 3 + rnd() * 2, '#6aa04a'); }
  },
  anim(ctx, t) {
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const L = FALL.y1 - FALL.y0;
    for (let i = 0; i < 9; i++) {
      const p = (t * 0.9 + i / 9) % 1, x = FALL.x - 14 + (i % 5) * 7, y = FALL.y0 + p * L;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 26); ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const p = (t * 1.3 + i / 8) % 1;
      ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - p)})`;
      ctx.beginPath(); ctx.arc(FALL.x + (i - 3.5) * 8 * p * 2, FALL.y1 - 6 - Math.sin(p * Math.PI) * 18, 2 + p * 3, 0, TAU); ctx.fill();
    }
  },
  insekten: 'falter',
};
function enzian(o, x, y, s) {
  o.save(); o.translate(x, y); o.scale(s, s);
  oval(o, -5, 0, 5, 2, '#4a8a3a', 0.3); oval(o, 5, 0, 5, 2, '#4a8a3a', -0.3);
  o.fillStyle = '#2a4ad8'; o.beginPath(); o.moveTo(-5, -14); o.lineTo(-3, -1); o.lineTo(3, -1); o.lineTo(5, -14); o.lineTo(2.5, -11); o.lineTo(0, -15); o.lineTo(-2.5, -11); o.fill();
  o.fillStyle = 'rgba(160,190,255,.5)'; o.fillRect(-2.5, -11, 1.2, 8);
  o.restore();
}
function edelweiss(o, x, y, s) {
  o.save(); o.translate(x, y); o.scale(s, s);
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8; oval(o, Math.cos(a) * 5, Math.sin(a) * 5, 4.5, 1.8, '#f6f6ee', a); }
  kreis(o, 0, 0, 2.6, '#e8e0a0'); kreis(o, 0, 0, 1.2, '#d0c070');
  o.restore();
}

// ---------------------------------------------------------------------------
// Bauen
// ---------------------------------------------------------------------------
const cache = new Map();
const NX0 = -330, NX1 = W + 330, NY0 = -340, NY1 = GY + 40;

function panorama(key, B, art, par, nacht) {
  const g = GEGEND[key];
  if (!g?.[art]) return null;
  const PS = art === 'fern' ? 0.8 : 1;
  const cv = document.createElement('canvas');
  cv.width = Math.round(PW * PS); cv.height = Math.round(PH * PS);
  const o = cv.getContext('2d');
  o.setTransform(PS, 0, 0, PS, -PU0 * PS, 0);
  const horizont = B.himmel.unten;
  const P = { G: PG, rnd: mulberry32(key.length * 131 + (art === 'fern' ? 1 : 2)), B, dunst: (c, k) => mix(col(c), horizont, k) };
  g[art](o, P);
  // Nachtfassung: abgedunkelt & bläulich
  const n = document.createElement('canvas');
  n.width = cv.width; n.height = cv.height;
  const nc = n.getContext('2d');
  nc.drawImage(cv, 0, 0);
  nc.globalCompositeOperation = 'source-atop';
  nc.fillStyle = nacht; nc.fillRect(0, 0, n.width, n.height);
  // Farbe ganz unten (für Flächen unter dem Panorama außerhalb der Welt)
  const px = o.getImageData(Math.round(cv.width / 2), cv.height - 2, 1, 1).data;
  return { tag: cv, nacht: n, par, u0: PU0, w: PW, h: PH, G: PG, boden: [px[0], px[1], px[2]] };
}

/** Baut (oder holt aus dem Zwischenspeicher) die Kulisse einer Gegend. */
export function baueKulisse(key) {
  if (cache.has(key)) return cache.get(key);
  const B = biom(key);
  const g = GEGEND[key];
  if (!g) return null;
  const NS = Math.min(1.5, Math.max(1.25, window.devicePixelRatio || 1));
  const nah = document.createElement('canvas');
  nah.width = Math.round((NX1 - NX0) * NS); nah.height = Math.round((NY1 - NY0) * NS);
  const o = nah.getContext('2d');
  o.setTransform(NS, 0, 0, NS, -NX0 * NS, -NY0 * NS);
  o.lineCap = 'round';
  g.nah?.(o, { rnd: mulberry32(key.length * 977 + 3), B });
  const K = {
    key, B,
    fern: panorama(key, B, 'fern', 0.15, 'rgba(10,14,44,.66)'),
    mitte: panorama(key, B, 'mitte', 0.3, 'rgba(10,14,44,.58)'),
    nah: { img: nah, x0: NX0, y0: NY0, x1: NX1, y1: NY1, s: NS },
    anim: g.anim ?? null,
    insekten: g.insekten ?? 'falter',
    himmel: B.himmel,
  };
  if (cache.size >= 3) cache.delete(cache.keys().next().value);
  cache.set(key, K);
  return K;
}

/**
 * Grasnarbe + Bewuchs einer Gegend (Weltbreite × h). Gibt { img, h } zurück.
 * blockiert: Liste [x0, x1] in Weltpixeln, wo nichts Großes stehen darf.
 */
export function baueBewuchs(key, seed, RES, blockiert) {
  const B = biom(key), g = GEGEND[key] ?? {};
  const rnd = mulberry32(seed + 5);
  const h = 130;
  const cv = document.createElement('canvas');
  cv.width = Math.round(W * RES); cv.height = Math.round(h * RES);
  const c = cv.getContext('2d');
  c.scale(RES, RES);
  c.lineCap = 'round';
  const gy = h - 4;
  const art = B.gras.art;
  const gc = B.gras.farbe, hoehe = B.gras.hoehe ?? 0.7;
  const boden = B.erde.schichten[0];
  // Grasnarbe / Bodenstreifen
  const gruen = ['wiese', 'rasen', 'moos'].includes(art);
  const s1 = gruen ? hell(gc, 0.05) : art === 'heide' ? mix(boden, [90, 80, 60], 0.4) : art === 'aehren' ? mix(boden, [200, 170, 100], 0.4) : hell(boden, 0.12);
  const s2 = gruen ? hell(gc, -0.35) : hell(boden, -0.15);
  c.fillStyle = lg(c, 0, gy - 6, 0, h, s1, s2); c.fillRect(0, gy - 4, W, 10);
  if (!gruen) for (let i = 0; i < 900; i++) { const x = rnd() * W; oval(c, x, gy - 1 + rnd() * 4, 1 + rnd() * 3, 1 + rnd() * 2, rgb(hell(boden, (rnd() - 0.5) * 0.5), 0.9)); }
  const halme = (n, lmin, lmax, farbe, breit = 1) => {
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, len = lmin + rnd() * rnd() * (lmax - lmin);
      c.strokeStyle = rgb(farbe.map(v => v * (0.75 + rnd() * 0.45)));
      c.lineWidth = breit * (1 + rnd() * 1.2);
      c.beginPath(); c.moveTo(x, gy + 2); c.quadraticCurveTo(x + (rnd() - 0.5) * 6, gy - len * 0.5, x + (rnd() - 0.5) * 8, gy - len); c.stroke();
    }
  };
  if (art === 'wiese') halme(2600, 5, 5 + 22 * hoehe / 0.7, gc);
  else if (art === 'rasen') halme(4200, 3, 4 + 8 * hoehe, gc, 0.9);
  else if (art === 'duenn') for (let i = 0; i < 120; i++) grasbueschel(c, rnd() * W, gy + 1, 8 + rnd() * 16 * hoehe / 0.4, gc, rnd, 6);
  else if (art === 'moos') {
    for (let i = 0; i < 700; i++) { const x = rnd() * W, r = 3 + rnd() * 6; oval(c, x, gy - 1, r, r * 0.6 + 1, rgb(hell(gc, (rnd() - 0.3) * 0.4))); }
    for (let i = 0; i < 1600; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(200,240,140,.6)' : 'rgba(40,80,30,.5)'; c.fillRect(rnd() * W, gy - 4 - rnd() * 4, 1, 1.5); }
    halme(500, 4, 14, gc);
  } else if (art === 'aehren') {
    halme(1400, 4, 14, mix(gc, [180, 150, 70], 0.4));
    for (let i = 0; i < 260; i++) { const x = rnd() * W, frei = !blockiert.some(([a, b]) => x > a - 6 && x < b + 6); aehre(c, x, gy + 2, frei ? 34 + rnd() * 50 : 14 + rnd() * 8, gc.map(v => v * (0.85 + rnd() * 0.25)), rnd, (rnd() - 0.4) * 10); }
  } else if (art === 'heide') {
    halme(600, 4, 12, [110, 130, 70]);
    for (let i = 0; i < 380; i++) heidekraut(c, rnd() * W, gy + 2, 10 + rnd() * 12, rnd, gc);
  }
  const V = { rnd, B, gy: gy + 1, frei: (x, r = 0) => !blockiert.some(([a, b]) => x + r > a && x - r < b) };
  g.vorne?.(c, V);
  return { img: cv, h };
}

// ---------------------------------------------------------------------------
// Insekten pro Bild (statt Schmetterlingen)
// ---------------------------------------------------------------------------
export function zeichneInsekten(ctx, art, t) {
  if (art === 'libellen') {
    for (let i = 0; i < 3; i++) {
      const x = ((i * 610 + t * (40 + i * 12)) % (W + 300)) - 150 + Math.sin(t * 0.9 + i) * 30;
      const y = GY - 60 - i * 30 + Math.sin(t * 1.7 + i * 2) * 14;
      ctx.save(); ctx.translate(x, y);
      const f = Math.sin(t * 40 + i) * 0.3;
      ctx.fillStyle = 'rgba(220,240,255,.6)';
      for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(-1, d * 5, 9, 2.4, d * (0.25 + f), 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(4, d * 4.5, 8, 2.2, -d * (0.3 + f), 0, TAU); ctx.fill(); }
      ctx.fillStyle = ['#2a8ad8', '#3ac0a0', '#d84a6a'][i]; ctx.fillRect(-14, -1, 18, 2.2);
      ctx.beginPath(); ctx.arc(5, 0, 2.6, 0, TAU); ctx.fill();
      ctx.restore();
    }
  } else if (art === 'bienen') {
    for (let i = 0; i < 5; i++) {
      const x = ((i * 397 + t * (22 + i * 5)) % (W + 200)) - 100 + Math.sin(t * 3 + i) * 12;
      const y = GY - 30 - (i % 3) * 26 + Math.sin(t * 2.3 + i * 2) * 10;
      ctx.save(); ctx.translate(x, y);
      const f = Math.abs(Math.sin(t * 50 + i));
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(-1, -4, 3, 2 + f * 1.5, -0.5, 0, TAU); ctx.ellipse(2, -4, 3, 2 + f * 1.5, 0.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffc21f'; ctx.beginPath(); ctx.ellipse(0, 0, 5, 3.6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a2018'; ctx.fillRect(-1.6, -3.4, 1.4, 6.8); ctx.fillRect(1.4, -3.2, 1.4, 6.4);
      ctx.beginPath(); ctx.arc(5, -0.5, 2, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
}
