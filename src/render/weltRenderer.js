// Welt-Ansicht: die große Übersichtskarte des Gartens – wie eine gemalte Bilderbuch-Landkarte
// von weit oben. Boden, Bäche, Teich, Wald, Felder, Garten & Co. werden einmal (in reduzierter
// Auflösung) vorgerendert; Wahrzeichen der 19 Orte und die Ameisenhügel sind gecachte Sprites,
// fertige Straßen liegen in der Bildschirm-Ebene. Pro Bild kommen nur Wasser, Tiere, Ameisen-
// Ströme, Botenduft, Gäste, Waren, Wolkenschatten, Licht und die Beschriftungen dazu.
import { WELT, ORTE, ALLE_ORTE, ortById, biom as biomVon } from '../game/welt.js';
import { kolonieIds, aktiveId } from '../game/kolonien.js';
import { kolonieListe, fluesse, BESUCHE } from '../game/zivilisation.js';
import { makeNoise, mulberry32, clamp } from '../util.js';
import { drawEmoji, drawGlow, cached } from './sprites.js';

const { W, H } = WELT;
const HX = WELT.HEIM.x, HY = WELT.HEIM.y, RR = WELT.REVIER_R;
const TAU = Math.PI * 2;
const FONT = 'Fredoka, Nunito, sans-serif';
/** Auflösung des vorgerenderten Bodens (Pixel pro Welt-Einheit) – 0,75 → 2700×1800 ≈ 4,9 Megapixel */
const BS = 0.75;
/** Wahrzeichen: Sprite-Entwurfseinheiten → Welt-Einheiten */
const LS = 1.25;

// ---------- Geometrie der Landschaft ----------
function spline(pts, step = 6) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}
const pathOf = pts => { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (const q of pts) p.lineTo(q[0], q[1]); return p; };

// Wasser: Bach (von links zum Teich), Wasserfall-Bach (von der Felswand zum Teich), Abfluss nach unten
const BACH = spline([[-60, 1400], [180, 1436], [420, 1468], [640, 1500], [860, 1546], [1030, 1596], [1190, 1626], [1330, 1700], [1450, 1834], [1550, 1965], [1615, 2075], [1660, 2120]]);
const STROM = spline([[3330, 2292], [3150, 2326], [2900, 2336], [2650, 2326], [2420, 2306], [2220, 2262], [2080, 2206], [1990, 2176]]);
const ABFLUSS = spline([[1760, 2250], [1740, 2330], [1712, 2460]]);
const BACH_P = pathOf(BACH), STROM_P = pathOf(STROM), ABFLUSS_P = pathOf(ABFLUSS);
const TEICH = { x: 1800, y: 2150, rx: 225, ry: 128 };
// Wege der Menschen
const WEG = spline([[3072, 520], [2960, 574], [2780, 566], [2600, 548], [2420, 566], [2200, 604], [1980, 604], [1760, 566], [1540, 566], [1320, 604], [1160, 616], [1048, 610]]);
const WEG2 = spline([[822, 792], [858, 930], [896, 1100], [880, 1280], [834, 1440], [790, 1545], [742, 1640], [700, 1712]]);
const PFAD = spline([[340, 404], [384, 460], [460, 490], [540, 492]]);
// Flächen
const GARTEN = { x0: 540, y0: 360, x1: 1040, y1: 784 };
const PLATZ = { x0: 170, y0: 1712, x1: 800, y1: 2080 };
const HAUS = { x0: 2985, y1: 495 };
const SAND = { x: 2985, y: 1965, rx: 300, ry: 190 };
const FELD = { x: 360, y: 1050, rx: 300, ry: 205 };
const HEIDE = { x: 270, y: 2290, rx: 330, ry: 170 };
const FELS = { x: 3420, y: 2240, rx: 330, ry: 230 };
const KIES = { x: 1420, y: 1560, rx: 200, ry: 145 };
const PILZ = { x: 3350, y: 1350, rx: 260, ry: 215 };
const OBST = { x0: 1160, y0: 90, x1: 1860, y1: 486 };
const LICHT = { x: 2280, y: 960 };
const WALD = [[3230, 1290, 420, 400], [2930, 1520, 230, 190], [2760, 1640, 190, 230], [3420, 760, 230, 200], [3520, 1800, 160, 190], [2930, 1050, 165, 170]];
const inEll = (x, y, e, m = 1) => ((x - e.x) / (e.rx * m)) ** 2 + ((y - e.y) / (e.ry * m)) ** 2 < 1;
const inWald = (x, y, m = 1) => WALD.some(([cx, cy, rx, ry]) => ((x - cx) / (rx * m)) ** 2 + ((y - cy) / (ry * m)) ** 2 < 1);
const FLAGGEN = ['#4fa3ff', '#ff9f1c', '#a77bff', '#ff6b9b', '#2ec4b6', '#ffd34d', '#5fd068', '#f45b69', '#9b5de5'];
const DIST_FARBE = ['#5fd068', '#5fd068', '#ffc93c', '#ff9f43', '#ff6b6b'];
export const DIST_NAME = ['', 'Nah', 'Mittel', 'Weit', 'Sehr weit'];

// Wahrzeichen: Spritegröße (Entwurf), Abstand nach oben (Plakette) & unten (Namensschild), Platz der Kolonie (Welt-Einheiten)
const LM = {
  heim: { s: 160, top: 64, bot: 56, kol: [0, 0] },
  lichtung: { s: 200, top: 52, bot: 58, kol: [96, 56] },
  blumen: { s: 220, top: 70, bot: 70, kol: [124, 34] },
  bach: { s: 180, top: 40, bot: 52, kol: [96, 54] },
  wald: { s: 220, top: 76, bot: 70, kol: [-120, 40] },
  stumpf: { s: 180, top: 52, bot: 56, kol: [-104, 48] },
  garten: { s: 200, top: 50, bot: 52, kol: [-168, 262] },
  sand: { s: 200, top: 56, bot: 62, kol: [-128, 26] },
  spielplatz: { s: 260, top: 56, bot: 70, kol: [-196, 130] },
  topf: { s: 170, top: 70, bot: 46, kol: [-150, 160] },
  obstwiese: { s: 240, top: 66, bot: 70, kol: [146, 74] },
  kornfeld: { s: 240, top: 66, bot: 70, kol: [156, 62] },
  teich: { s: 300, top: 54, bot: 52, kol: [126, -150] },
  pilzwald: { s: 240, top: 70, bot: 70, kol: [-150, 66] },
  steingarten: { s: 230, top: 60, bot: 66, kol: [136, -66] },
  kompost: { s: 200, top: 58, bot: 62, kol: [-132, 54] },
  heide: { s: 240, top: 64, bot: 66, kol: [156, -36] },
  baumhaus: { s: 270, top: 92, bot: 74, kol: [-150, 70] },
  gewaechshaus: { s: 260, top: 70, bot: 66, kol: [-126, 176] },
  felsen: { s: 280, top: 96, bot: 70, kol: [-196, 34] },
};
const lm = o => LM[o?.biom] ?? LM.lichtung;
const kolPos = o => { if (!o || o.id === 'heim') return [HX, HY]; const k = lm(o).kol; return [o.x + k[0], o.y + k[1]]; };
const posVon = id => kolPos(ortById(id) ?? { id: 'heim' });
/** Hügel-Radius nach Bevölkerung (in 4er-Stufen, damit die Sprites gecacht bleiben) */
function hugelR(pop, heim) {
  const r = heim ? clamp(40 + Math.sqrt(pop || 1) * 1.5, 50, 72) : clamp(16 + Math.sqrt(pop || 1) * 2.4, 20, 56);
  return Math.round(r / 4) * 4;
}

// ---------- kleine Zeichenhelfer ----------
const rgb = (a, f = 0) => { const m = v => Math.round(clamp(f >= 0 ? v + (255 - v) * f : v * (1 + f), 0, 255)); return `rgb(${m(a[0])},${m(a[1])},${m(a[2])})`; };
function blob(c, rnd, x, y, r, col, n = 10, jit = 0.25) {
  c.fillStyle = col; c.beginPath();
  for (let i = 0; i <= n; i++) { const a = (i / n) * TAU, rr = r * (1 - jit / 2 + rnd() * jit); c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fill();
}
function blobPath(e, n, seed, amp = 0.22, rot = 0) {
  const p = new Path2D(), nz = makeNoise(seed);
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * TAU, r = 1 + (nz(Math.cos(a) * 1.6 + 5, Math.sin(a) * 1.6 + 5, 2) - 0.5) * amp * 2;
    const x = Math.cos(a) * e.rx * r, y = Math.sin(a) * e.ry * r;
    p.lineTo(e.x + x * Math.cos(rot) - y * Math.sin(rot), e.y + x * Math.sin(rot) + y * Math.cos(rot));
  }
  p.closePath();
  return p;
}
function blume(c, x, y, s, col, mitte = '#ffe066') {
  c.fillStyle = col;
  for (let k = 0; k < 5; k++) { const a = k * 1.2566 + x; c.beginPath(); c.arc(x + Math.cos(a) * s, y + Math.sin(a) * s, s * 0.78, 0, TAU); c.fill(); }
  c.fillStyle = mitte; c.beginPath(); c.arc(x, y, s * 0.55, 0, TAU); c.fill();
}
function stein(c, x, y, rx, ry, rot = 0, hell = '#eceae4', dunkel = '#8a857c') {
  c.fillStyle = 'rgba(20,30,10,.25)'; c.beginPath(); c.ellipse(x + rx * 0.3, y + ry * 0.4, rx, ry, rot, 0, TAU); c.fill();
  const g = c.createRadialGradient(x - rx * 0.4, y - ry * 0.5, 1, x, y, Math.max(rx, ry));
  g.addColorStop(0, hell); g.addColorStop(1, dunkel);
  c.fillStyle = g; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.fill();
}
/** flache, kantige Steinplatte */
function platte(c, rnd, x, y, r, hell = '#e6e2da', dunkel = '#9a948a') {
  const n = 7 + ((rnd() * 3) | 0), pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU + rnd() * 0.4, rr = r * (0.75 + rnd() * 0.3); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.78]); }
  const pfad = () => { c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath(); };
  c.save(); c.translate(r * 0.16, r * 0.22); c.fillStyle = 'rgba(30,30,20,.3)'; pfad(); c.fill(); c.restore();
  c.save(); c.translate(0, r * 0.1); c.fillStyle = dunkel; pfad(); c.fill(); c.restore();
  const g = c.createLinearGradient(x - r, y - r, x + r, y + r); g.addColorStop(0, hell); g.addColorStop(1, dunkel);
  c.fillStyle = g; pfad(); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = Math.max(1, r * 0.05); c.beginPath(); c.moveTo(pts[n - 2][0], pts[n - 2][1]); c.lineTo(pts[n - 1][0], pts[n - 1][1]); c.lineTo(pts[0][0], pts[0][1]); c.stroke();
  c.fillStyle = 'rgba(90,110,60,.35)'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x + (rnd() - 0.5) * r, y + (rnd() - 0.5) * r * 0.6, r * (0.06 + rnd() * 0.08), 0, TAU); c.fill(); }
}
const LAUB_PAL = [['#7fd66a', '#2f7d32'], ['#8ade6e', '#3a8a34'], ['#66c45c', '#246b2a'], ['#9bd96b', '#3f8a2c'], ['#b5d65a', '#4f8a26']];
function laubBaum(c, rnd, x, y, r, pal = null, teileN = 7) {
  const [hi, lo] = pal ?? LAUB_PAL[(rnd() * (rnd() < 0.1 ? 5 : 4)) | 0];
  const teile = [];
  for (let k = 0; k < teileN; k++) { const a = rnd() * TAU, rr = rnd() * r * 0.48, s = r * (0.42 + rnd() * 0.28); teile.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr, s]); }
  teile.sort((a, b) => (a[1] - a[0] * 0.3) - (b[1] - b[0] * 0.3)).reverse();
  for (const [cx, cy, s] of teile) {
    const g = c.createRadialGradient(cx - s * 0.35, cy - s * 0.45, s * 0.08, cx, cy, s);
    g.addColorStop(0, hi); g.addColorStop(1, lo);
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, s, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(20,60,20,.35)'; c.lineWidth = Math.max(1, r * 0.03); c.stroke();
  }
  c.fillStyle = 'rgba(255,255,210,.22)';
  for (let k = 0; k < 4; k++) { const a = rnd() * TAU, rr = rnd() * r * 0.4; c.beginPath(); c.arc(x - r * 0.2 + Math.cos(a) * rr, y - r * 0.25 + Math.sin(a) * rr, r * 0.12, 0, TAU); c.fill(); }
}
function nadelBaum(c, rnd, x, y, r, cols = ['#1d5230', '#2a6e3c', '#3c8e4a', '#56aa58']) {
  const n = 9 + ((rnd() * 4) | 0), rot = rnd();
  for (let L = 0; L < 4; L++) {
    const rr = r * (1 - L * 0.24);
    c.fillStyle = cols[L]; c.beginPath();
    for (let i = 0; i <= n * 2; i++) { const a = (i / (n * 2)) * TAU + rot + L * 0.25, q = i % 2 ? rr * 0.6 : rr; c.lineTo(x + Math.cos(a) * q - L * r * 0.05, y + Math.sin(a) * q - L * r * 0.07); }
    c.closePath(); c.fill();
    if (!L) { c.strokeStyle = 'rgba(10,40,20,.45)'; c.lineWidth = 1.2; c.stroke(); }
  }
  c.fillStyle = cols[3] === '#56aa58' ? '#7cc46a' : cols[3]; c.beginPath(); c.arc(x - r * 0.18, y - r * 0.24, r * 0.09, 0, TAU); c.fill();
}
function baumSchatten(c, x, y, r) { c.fillStyle = 'rgba(12,40,14,.28)'; c.beginPath(); c.ellipse(x + r * 0.38, y + r * 0.5, r * 1.02, r * 0.92, 0.3, 0, TAU); c.fill(); }
function apfelBaum(c, rnd, x, y, r, frucht = '#e8323c') {
  laubBaum(c, rnd, x, y, r, ['#8ede72', '#2f7d32'], 8);
  for (let k = 0; k < 6 + r / 4; k++) {
    const a = rnd() * TAU, rr = Math.sqrt(rnd()) * r * 0.82, ax = x + Math.cos(a) * rr, ay = y + Math.sin(a) * rr, s = Math.max(2, r * 0.085);
    c.fillStyle = 'rgba(40,20,0,.3)'; c.beginPath(); c.arc(ax + s * 0.3, ay + s * 0.4, s, 0, TAU); c.fill();
    c.fillStyle = frucht; c.beginPath(); c.arc(ax, ay, s, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(ax - s * 0.35, ay - s * 0.35, s * 0.3, 0, TAU); c.fill();
  }
}
function fliegenpilz(c, x, y, r) {
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(x + r * 0.3, y + r * 0.4, r, 0, TAU); c.fill();
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 0.5, x, y, r);
  g.addColorStop(0, '#ff6a5a'); g.addColorStop(1, '#c41e1e');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.fillStyle = '#fff';
  for (const [dx, dy, s] of [[-0.4, -0.3, 0.2], [0.3, -0.4, 0.16], [0.1, 0.25, 0.18], [-0.35, 0.35, 0.12], [0.45, 0.15, 0.12]]) { c.beginPath(); c.arc(x + dx * r, y + dy * r, s * r, 0, TAU); c.fill(); }
}
function steinpilz(c, x, y, r) {
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(x + r * 0.3, y + r * 0.4, r, 0, TAU); c.fill();
  c.fillStyle = '#f0e2c0'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.35, 0.5, x, y, r * 0.92);
  g.addColorStop(0, '#c88a50'); g.addColorStop(0.7, '#8a5224'); g.addColorStop(1, '#6a3a18');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 0.9, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,230,190,.35)'; c.beginPath(); c.ellipse(x - r * 0.3, y - r * 0.35, r * 0.35, r * 0.2, -0.6, 0, TAU); c.fill();
}
function leuchtpilz(c, x, y, r, col = ['#c8fff6', '#4fd8c8', '#1f8a8a']) {
  c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.arc(x + r * 0.25, y + r * 0.35, r, 0, TAU); c.fill();
  const g = c.createRadialGradient(x - r * 0.25, y - r * 0.3, 0.3, x, y, r);
  g.addColorStop(0, col[0]); g.addColorStop(0.55, col[1]); g.addColorStop(1, col[2]);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.75)'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x + Math.cos(k * 2.2) * r * 0.45, y + Math.sin(k * 2.2) * r * 0.45, r * 0.12, 0, TAU); c.fill(); }
}
function schilf(c, rnd, x, y, n, l = 22) {
  c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const bx = x + (rnd() - 0.5) * 22, by = y + (rnd() - 0.5) * 14, a = -Math.PI / 2 - 0.7 + rnd() * 1.4, ll = l * (0.7 + rnd() * 0.6);
    c.strokeStyle = rnd() < 0.5 ? '#4f8a2a' : '#78b04a'; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + Math.cos(a) * ll * 0.6, by + Math.sin(a) * ll * 0.6, bx + Math.cos(a + 0.3) * ll, by + Math.sin(a + 0.3) * ll); c.stroke();
    if (rnd() < 0.3) { c.save(); c.translate(bx + Math.cos(a) * ll * 0.8, by + Math.sin(a) * ll * 0.8); c.rotate(a + Math.PI / 2); c.fillStyle = '#6a3a16'; c.beginPath(); c.roundRect(-2.5, -6, 5, 11, 2.5); c.fill(); c.restore(); }
  }
}
function seerosenBlatt(c, x, y, r, a) {
  c.fillStyle = 'rgba(0,40,60,.25)'; c.beginPath(); c.arc(x + 2, y + 3, r, 0, TAU); c.fill();
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r); g.addColorStop(0, '#7cd468'); g.addColorStop(1, '#3a9a3a');
  c.fillStyle = g; c.beginPath(); c.moveTo(x, y); c.arc(x, y, r, a + 0.3, a + TAU - 0.15); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(30,90,30,.5)'; c.lineWidth = 0.8;
  for (let k = 0; k < 6; k++) { const b = a + 0.5 + k * 0.95; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(b) * r * 0.85, y + Math.sin(b) * r * 0.85); c.stroke(); }
}
function seerose(c, x, y, s, col = '#ff9ac8') {
  for (let L = 0; L < 2; L++) for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU + L * 0.4, rr = s * (L ? 0.55 : 0.95);
    c.fillStyle = L ? '#fff0f6' : col; c.beginPath(); c.ellipse(x + Math.cos(a) * rr * 0.6, y + Math.sin(a) * rr * 0.6, rr * 0.55, rr * 0.25, a, 0, TAU); c.fill();
  }
  c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(x, y, s * 0.25, 0, TAU); c.fill();
}
function lavendel(c, rnd, x, y, r) {
  c.fillStyle = 'rgba(30,30,20,.22)'; c.beginPath(); c.ellipse(x + r * 0.3, y + r * 0.35, r * 1.05, r * 0.9, 0, 0, TAU); c.fill();
  c.fillStyle = '#7f9a76'; c.beginPath(); c.arc(x, y, r * 0.85, 0, TAU); c.fill();
  c.lineCap = 'round';
  for (let i = 0; i < 18 + r; i++) {
    const a = rnd() * TAU, l = r * (0.5 + rnd() * 0.55), ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l;
    c.strokeStyle = 'rgba(110,140,100,.9)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(ex, ey); c.stroke();
    c.fillStyle = ['#8f6ad8', '#a884ee', '#7a52c4', '#b89cf2'][(rnd() * 4) | 0];
    c.beginPath(); c.ellipse(ex, ey, Math.max(1.4, r * 0.1), Math.max(1, r * 0.065), a, 0, TAU); c.fill();
  }
}
function heidekraut(c, rnd, x, y, r) {
  c.fillStyle = 'rgba(40,20,40,.22)'; c.beginPath(); c.arc(x + r * 0.25, y + r * 0.3, r, 0, TAU); c.fill();
  c.fillStyle = '#5a6a3c'; c.beginPath(); c.arc(x, y, r * 0.9, 0, TAU); c.fill();
  for (let i = 0; i < 10 + r * 1.4; i++) {
    const a = rnd() * TAU, rr = Math.sqrt(rnd()) * r;
    c.fillStyle = ['#b061c4', '#d07ad8', '#8e4aa8', '#e2a0ea', '#a050b8'][(rnd() * 5) | 0];
    c.beginPath(); c.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, Math.max(1.2, r * (0.1 + rnd() * 0.08)), 0, TAU); c.fill();
  }
}
function birke(c, rnd, x, y, r) {
  // Stamm (schräg gesehen) + lichte Krone
  c.save(); c.translate(x + r * 0.2, y + r * 0.55); c.rotate(0.5);
  c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(-r * 0.08 + 3, -r * 0.1 + 3, r * 0.16, r * 0.75);
  c.fillStyle = '#f4f2ea'; c.fillRect(-r * 0.08, -r * 0.1, r * 0.16, r * 0.75);
  c.fillStyle = '#2a2a2a'; for (let k = 0; k < 4; k++) c.fillRect(-r * 0.08 + (k % 2) * r * 0.06, r * (0.05 + k * 0.15), r * 0.08, r * 0.035);
  c.restore();
  laubBaum(c, rnd, x, y, r, ['#d4ec8a', '#6aa83a'], 6);
}
function wacholder(c, rnd, x, y, r) { nadelBaum(c, rnd, x, y, r, ['#1e4a40', '#2a6656', '#3a806a', '#5aa088']); }
function huegel(c, rnd, x, y, R, art = 'nadeln', f1 = [150, 98, 52], f2 = [96, 60, 30]) {
  c.fillStyle = 'rgba(30,20,5,.32)'; c.beginPath(); c.ellipse(x + R * 0.18, y + R * 0.24, R * 1.12, R * 1.02, 0, 0, TAU); c.fill();
  c.fillStyle = rgb(f2, -0.2); c.beginPath(); c.arc(x, y, R * 1.08, 0, TAU); c.fill();
  const g = c.createRadialGradient(x - R * 0.35, y - R * 0.42, R * 0.08, x, y, R);
  g.addColorStop(0, rgb(f1, 0.4)); g.addColorStop(0.55, rgb(f1)); g.addColorStop(1, rgb(f2, -0.15));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill();
  c.lineCap = 'round';
  const punkt = () => { const a = rnd() * TAU, r = Math.sqrt(rnd()) * R * 0.96; return [x + Math.cos(a) * r, y + Math.sin(a) * r]; };
  if (art === 'nadeln' || art === 'stroh') {
    const cols = art === 'stroh' ? ['#f2d47a', '#d8b050', '#b8902e', '#fff0b0', '#a07a28'] : [rgb(f2, -0.35), rgb(f2), rgb(f1), rgb(f1, 0.3), rgb(f2, -0.55), rgb(f1, 0.5)];
    c.lineWidth = Math.max(0.8, R * (art === 'stroh' ? 0.028 : 0.022));
    for (let i = 0; i < R * R * (art === 'stroh' ? 0.09 : 0.12); i++) {
      const [px, py] = punkt(), l = R * (art === 'stroh' ? 0.08 + rnd() * 0.12 : 0.04 + rnd() * 0.08), b = rnd() * Math.PI;
      c.strokeStyle = cols[(rnd() * cols.length) | 0];
      c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(b) * l, py + Math.sin(b) * l); c.stroke();
    }
  } else if (art === 'sand') {
    c.strokeStyle = rgb(f2, 0.1); c.lineWidth = Math.max(0.8, R * 0.025);
    for (let i = 1; i < 5; i++) { c.beginPath(); c.arc(x - R * 0.1, y - R * 0.1, R * i * 0.2, 0.3, 2.2); c.stroke(); }
    for (let i = 0; i < R * R * 0.22; i++) { const [px, py] = punkt(); c.fillStyle = rnd() < 0.5 ? rgb(f2, -0.1) : rgb(f1, 0.5); c.beginPath(); c.arc(px, py, Math.max(0.5, R * 0.015), 0, TAU); c.fill(); }
  } else if (art === 'laub') {
    const cols = ['#c8641e', '#e09a2a', '#a8461c', '#d8b040', '#8a5a24', rgb(f1), '#7a8a2a'];
    for (let i = 0; i < R * R * 0.05; i++) { const [px, py] = punkt(); c.fillStyle = cols[(rnd() * cols.length) | 0]; c.beginPath(); c.ellipse(px, py, R * 0.075, R * 0.04, rnd() * Math.PI, 0, TAU); c.fill(); }
  } else if (art === 'holz') {
    const cols = ['#e2b47a', '#b07a40', '#f0d098', '#8a5a2a', '#c8925a'];
    for (let i = 0; i < R * R * 0.06; i++) { const [px, py] = punkt(); c.save(); c.translate(px, py); c.rotate(rnd() * Math.PI); c.fillStyle = cols[(rnd() * cols.length) | 0]; c.fillRect(-R * 0.045, -R * 0.018, R * 0.09, R * 0.036); c.restore(); }
  } else if (art === 'moos') {
    for (let i = 0; i < R * R * 0.045; i++) { const [px, py] = punkt(); c.fillStyle = ['#5a8a3a', '#7aa84a', '#3f6e2a', '#98c060'][(rnd() * 4) | 0]; c.beginPath(); c.arc(px, py, R * (0.04 + rnd() * 0.06), 0, TAU); c.fill(); }
    for (let i = 0; i < 6; i++) { const [px, py] = punkt(); blume(c, px, py, Math.max(1, R * 0.03), '#ffffff'); }
  } else { // erde
    for (let i = 0; i < R * R * 0.08; i++) { const [px, py] = punkt(); c.fillStyle = [rgb(f2, -0.4), rgb(f2), rgb(f1, 0.2), rgb(f1, -0.2)][(rnd() * 4) | 0]; c.beginPath(); c.arc(px, py, R * (0.02 + rnd() * 0.035), 0, TAU); c.fill(); }
  }
  if (art === 'nadeln' || art === 'laub') {
    c.lineWidth = Math.max(1.2, R * 0.04);
    for (let i = 0; i < 4 + R / 8; i++) {
      const [px, py] = punkt(), l = R * (0.14 + rnd() * 0.12), b = rnd() * Math.PI;
      c.strokeStyle = rnd() < 0.5 ? '#6a3f1a' : '#b07a40';
      c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(b) * l, py + Math.sin(b) * l); c.stroke();
    }
  }
  const hl = c.createRadialGradient(x - R * 0.35, y - R * 0.4, 0, x - R * 0.35, y - R * 0.4, R * 0.6);
  hl.addColorStop(0, 'rgba(255,240,190,.35)'); hl.addColorStop(1, 'rgba(255,240,190,0)');
  c.fillStyle = hl; c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill();
  const n = 2 + Math.round(R / 22);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + 0.5, r = i === 0 ? 0 : R * (0.5 + rnd() * 0.15);
    const ex = x + Math.cos(a) * r, ey = y + Math.sin(a) * r, s = Math.max(2.2, R * 0.075);
    c.fillStyle = 'rgba(255,230,170,.5)'; c.beginPath(); c.ellipse(ex - 0.6, ey - 0.8, s * 1.35, s * 1.05, a, 0, TAU); c.fill();
    c.fillStyle = '#1a0c04'; c.beginPath(); c.ellipse(ex, ey, s, s * 0.78, a, 0, TAU); c.fill();
  }
}
function hugelSprite(biomKey, R) {
  const B = biomVon(biomKey), hg = B.huegel ?? {};
  const S = Math.ceil(R * 2.9);
  return cached(`weltHg|${biomKey}|${R}`, S, S, cc => huegel(cc, mulberry32(R * 31 + biomKey.length * 7), S * 0.47, S * 0.47, R, hg.art, hg.farbe, hg.farbe2), 2.5);
}

// Ameise von oben (Kopf nach rechts), winzig
function antTop(c, L, frame) {
  const sw = Math.sin((frame / 4) * TAU);
  c.strokeStyle = '#2a140c'; c.lineWidth = L * 0.07; c.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const x = -L * 0.05 + i * L * 0.12, s = (i % 2 ? 1 : -1) * sw * L * 0.09;
    for (const side of [-1, 1]) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + L * 0.08 + s * side, side * L * 0.22); c.lineTo(x + L * 0.02 + s * side * 1.6, side * L * 0.34); c.stroke(); }
  }
  c.fillStyle = '#3a160c';
  c.beginPath(); c.ellipse(-L * 0.3, 0, L * 0.22, L * 0.16, 0, 0, TAU); c.fill();
  c.fillStyle = '#6a2c18';
  c.beginPath(); c.ellipse(L * 0.02, 0, L * 0.14, L * 0.09, 0, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(L * 0.27, 0, L * 0.12, L * 0.11, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,190,150,.5)'; c.beginPath(); c.arc(-L * 0.36, -L * 0.06, L * 0.06, 0, TAU); c.fill();
}
const ANT_L = 9;
const antSprite = f => cached('weltAnt|' + f, ANT_L * 1.4, ANT_L, c => { c.translate(ANT_L * 0.65, ANT_L * 0.5); antTop(c, ANT_L, f); }, 4);
function drawAnt(ctx, x, y, ang, f, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (s !== 1) ctx.scale(s, s);
  ctx.drawImage(antSprite(f), -ANT_L * 0.65, -ANT_L * 0.5, ANT_L * 1.4, ANT_L);
  ctx.restore();
}

// ---------- Wahrzeichen der Orte (einmal gemalt, Entwurfseinheiten) ----------
function wahrzeichen(biom) {
  const S = LM[biom].s;
  return cached('weltLM|' + biom, S, S, c => {
    c.translate(S / 2, S / 2);
    const rnd = mulberry32(biom.length * 977 + biom.charCodeAt(1) * 13);
    c.lineCap = 'round'; c.lineJoin = 'round';
    switch (biom) {
      case 'lichtung': {
        const g = c.createRadialGradient(0, 0, 8, 0, 0, 92);
        g.addColorStop(0, 'rgba(255,246,170,.5)'); g.addColorStop(0.55, 'rgba(240,240,140,.25)'); g.addColorStop(1, 'rgba(240,240,140,0)');
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, 92, 0, TAU); c.fill();
        for (let i = 0; i < 46; i++) {
          const a = rnd() * TAU, r = 58 + rnd() * 26, x = Math.cos(a) * r, y = Math.sin(a) * r;
          c.strokeStyle = rnd() < 0.5 ? '#3f8a2c' : '#62a83a'; c.lineWidth = 1.8;
          for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + k * 3 + Math.cos(a) * 2, y - 7 - rnd() * 4); c.stroke(); }
        }
        stein(c, -14, 14, 24, 16, -0.2);
        stein(c, 18, 24, 10, 7, 0.4);
        for (let i = 0; i < 16; i++) { const a = rnd() * TAU, r = 22 + rnd() * 44; blume(c, Math.cos(a) * r, Math.sin(a) * r * 0.9, 3 + rnd() * 1.6, '#ffffff', '#ffd23a'); }
        for (let i = 0; i < 5; i++) { const a = rnd() * TAU, r = 30 + rnd() * 30; blume(c, Math.cos(a) * r, Math.sin(a) * r, 3.4, '#ffd23a', '#e08a00'); }
        break;
      }
      case 'blumen': {
        for (let i = 0; i < 60; i++) { const a = rnd() * TAU, r = Math.sqrt(rnd()) * 92; c.fillStyle = rnd() < 0.5 ? '#2f7d32' : '#3f9a3a'; c.beginPath(); c.ellipse(Math.cos(a) * r, Math.sin(a) * r, 9, 4, rnd() * 3, 0, TAU); c.fill(); }
        const pal = ['#ff5c8a', '#ffd34d', '#ffffff', '#b07cff', '#5fb4ff', '#ff9f43', '#ff3d4d', '#ff8ad8'];
        const pts = [];
        for (let i = 0; i < 70; i++) { const a = rnd() * TAU, r = Math.sqrt(rnd()) * 88; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
        pts.sort((a, b) => a[1] - b[1]);
        for (const [x, y] of pts) {
          c.fillStyle = 'rgba(20,50,10,.25)'; c.beginPath(); c.arc(x + 2, y + 3, 6, 0, TAU); c.fill();
          const col = pal[(rnd() * pal.length) | 0];
          if (col === '#ff3d4d') blume(c, x, y, 5.5, col, '#2a1a1a'); else blume(c, x, y, 3.5 + rnd() * 3, col);
        }
        for (const [x, y] of [[-30, -22], [26, 16], [-8, 40]]) {
          c.fillStyle = 'rgba(20,50,10,.3)'; c.beginPath(); c.arc(x + 4, y + 5, 15, 0, TAU); c.fill();
          for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU; c.fillStyle = k % 2 ? '#ffc21a' : '#ffd84a'; c.beginPath(); c.ellipse(x + Math.cos(a) * 10, y + Math.sin(a) * 10, 6, 2.8, a, 0, TAU); c.fill(); }
          c.fillStyle = '#6a3a14'; c.beginPath(); c.arc(x, y, 7, 0, TAU); c.fill();
          c.fillStyle = '#8a5424'; for (let k = 0; k < 8; k++) { c.beginPath(); c.arc(x + (rnd() - 0.5) * 9, y + (rnd() - 0.5) * 9, 1, 0, TAU); c.fill(); }
        }
        break;
      }
      case 'bach': {
        c.fillStyle = 'rgba(232,212,160,.85)'; c.beginPath(); c.ellipse(4, 14, 64, 34, 0.1, 0, TAU); c.fill();
        for (let i = 0; i < 30; i++) { c.fillStyle = ['#b8a27a', '#cfc0a0', '#9a8a6a'][i % 3]; c.beginPath(); c.arc((rnd() - 0.5) * 110, 14 + (rnd() - 0.5) * 50, 1 + rnd() * 1.6, 0, TAU); c.fill(); }
        for (let i = 0; i < 9; i++) stein(c, (rnd() - 0.5) * 100, 4 + (rnd() - 0.5) * 50, 4 + rnd() * 5, 3 + rnd() * 3, rnd());
        schilf(c, rnd, -42, 6, 22, 28);
        for (const [x, y, a] of [[-50, -14, -0.4], [-36, -20, 0.2], [-44, -2, -0.1], [-28, -6, 0.5]]) {
          c.save(); c.translate(x, y); c.rotate(a);
          c.fillStyle = '#6a3a16'; c.beginPath(); c.roundRect(-3, -9, 6, 14, 3); c.fill();
          c.fillStyle = 'rgba(255,220,160,.35)'; c.fillRect(-2, -8, 1.5, 10); c.restore();
        }
        seerosenBlatt(c, 40, -40, 15, 0.2);
        drawEmoji(c, '🐸', 40, -33, 15);
        seerosenBlatt(c, 64, -24, 9, 0.6);
        blume(c, 66, -26, 3, '#ffa6c9', '#ffe066');
        break;
      }
      case 'wald': {
        const g = c.createRadialGradient(0, 0, 10, 0, 0, 100);
        g.addColorStop(0, 'rgba(40,70,30,.55)'); g.addColorStop(1, 'rgba(40,70,30,0)');
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, 100, 0, TAU); c.fill();
        for (let i = 0; i < 26; i++) { c.fillStyle = ['#b07040', '#8a5428', '#c88a50'][i % 3]; c.beginPath(); c.ellipse((rnd() - 0.5) * 150, (rnd() - 0.5) * 120, 2.2, 0.8, rnd() * 3, 0, TAU); c.fill(); }
        const baeume = [[-36, -26, 44, 1], [38, -42, 36, 1], [46, 26, 40, 1], [-40, 40, 32, 0], [4, 62, 22, 1]];
        for (const [x, y, r] of baeume) baumSchatten(c, x, y, r);
        for (const [x, y, r, nadel] of baeume.sort((a, b) => a[1] - b[1])) (nadel ? nadelBaum : laubBaum)(c, rnd, x, y, r);
        fliegenpilz(c, 2, 4, 9); fliegenpilz(c, 16, 14, 6); fliegenpilz(c, -6, 18, 5);
        for (const [x, y] of [[-12, 0], [26, -4]]) {
          c.fillStyle = '#7a4a22'; c.beginPath(); c.ellipse(x, y, 6, 4, 0.5, 0, TAU); c.fill();
          c.strokeStyle = '#4a2a10'; c.lineWidth = 0.8; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(x + k * 3, y - 3); c.lineTo(x + k * 3 + 1, y + 3); c.stroke(); }
        }
        break;
      }
      case 'stumpf': {
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * TAU + rnd() * 0.4, l = 58 + rnd() * 20;
          c.strokeStyle = 'rgba(30,20,5,.25)'; c.lineWidth = 12; c.beginPath(); c.moveTo(6, 8); c.quadraticCurveTo(Math.cos(a + 0.2) * l * 0.6 + 6, Math.sin(a + 0.2) * l * 0.6 + 8, Math.cos(a) * l + 6, Math.sin(a) * l + 8); c.stroke();
          c.strokeStyle = '#6a4220'; c.lineWidth = 11; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(Math.cos(a + 0.2) * l * 0.6, Math.sin(a + 0.2) * l * 0.6, Math.cos(a) * l, Math.sin(a) * l); c.stroke();
          c.strokeStyle = '#8a5a30'; c.lineWidth = 4; c.stroke();
        }
        c.fillStyle = 'rgba(30,20,5,.35)'; c.beginPath(); c.arc(8, 10, 50, 0, TAU); c.fill();
        blob(c, rnd, 0, 0, 48, '#4a2a12', 22, 0.12);
        const g = c.createRadialGradient(-10, -12, 4, 0, 0, 40);
        g.addColorStop(0, '#f0c98a'); g.addColorStop(0.7, '#d29a5a'); g.addColorStop(1, '#a8703a');
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, 39, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(120,70,30,.45)'; c.lineWidth = 1.3;
        for (let r = 5; r < 38; r += 4.5) { c.beginPath(); for (let i = 0; i <= 30; i++) { const a = (i / 30) * TAU, rr = r + Math.sin(a * 3 + r) * 0.8; c.lineTo(Math.cos(a) * rr + 1, Math.sin(a) * rr + 1); } c.stroke(); }
        c.strokeStyle = '#5a3418'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(2, 0); c.lineTo(14, 10); c.lineTo(22, 12); c.lineTo(36, 22); c.stroke();
        for (let i = 0; i < 6; i++) { const a = 2.4 + rnd() * 1.6; blob(c, rnd, Math.cos(a) * 44, Math.sin(a) * 44, 7 + rnd() * 5, rnd() < 0.5 ? '#5aa83a' : '#7cc24a', 8, 0.4); }
        for (const [x, y, s] of [[40, 30, 7], [50, 20, 5], [33, 42, 5]]) {
          c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(x + 2, y + 3, s, 0, TAU); c.fill();
          const mg = c.createRadialGradient(x - s * 0.3, y - s * 0.3, 0.5, x, y, s); mg.addColorStop(0, '#ffb060'); mg.addColorStop(1, '#b85a1a');
          c.fillStyle = mg; c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill();
        }
        break;
      }
      case 'garten': {
        c.strokeStyle = '#3d8a2e'; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(-60, 30); c.bezierCurveTo(-30, 50, 10, -10, 40, -30); c.bezierCurveTo(60, -44, 70, -10, 56, 20); c.stroke();
        for (const [x, y, r] of [[-34, 20, 22], [10, -6, 18], [44, -34, 16], [60, 10, 14], [-58, -10, 16]]) {
          c.fillStyle = 'rgba(0,30,0,.25)'; c.beginPath(); c.arc(x + 3, y + 4, r, 0, TAU); c.fill();
          c.fillStyle = '#3f9a3a'; c.beginPath(); for (let i = 0; i <= 10; i++) { const a = (i / 10) * TAU, rr = r * (i % 2 ? 0.78 : 1); c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.fill();
          c.strokeStyle = 'rgba(200,255,170,.4)'; c.lineWidth = 1; for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8); c.stroke(); }
        }
        const kuerbis = (x, y, r) => {
          c.fillStyle = 'rgba(40,20,0,.3)'; c.beginPath(); c.ellipse(x + r * 0.25, y + r * 0.3, r * 1.05, r * 0.9, 0, 0, TAU); c.fill();
          for (let k = -2; k <= 2; k++) {
            const g = c.createRadialGradient(x + k * r * 0.3 - r * 0.2, y - r * 0.4, r * 0.05, x + k * r * 0.28, y, r * 0.9);
            g.addColorStop(0, '#ffc060'); g.addColorStop(0.6, '#ff8a1c'); g.addColorStop(1, '#c4520a');
            c.fillStyle = g; c.beginPath(); c.ellipse(x + k * r * 0.28, y, r * (0.5 - Math.abs(k) * 0.06), r * 0.86, 0, 0, TAU); c.fill();
          }
          c.fillStyle = '#5a3a14'; c.beginPath(); c.roundRect(x - r * 0.08, y - r * 0.2, r * 0.16, r * 0.3, 2); c.fill();
          c.fillStyle = '#4f9a2e'; c.beginPath(); c.ellipse(x + r * 0.22, y - r * 0.1, r * 0.22, r * 0.1, -0.6, 0, TAU); c.fill();
        };
        kuerbis(-8, 8, 26); kuerbis(38, -20, 16); kuerbis(-48, -30, 12);
        c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(46, 36, 18, 5, -0.4, 0, TAU); c.fill();
        c.fillStyle = '#ff8a1c'; c.beginPath(); c.moveTo(30, 40); c.lineTo(58, 24); c.lineTo(60, 32); c.closePath(); c.fill();
        c.strokeStyle = '#3d9a2e'; c.lineWidth = 2; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(59, 28); c.lineTo(66 + k * 2, 16 + k * 3); c.stroke(); }
        break;
      }
      case 'sand': {
        c.fillStyle = 'rgba(120,80,30,.25)'; c.beginPath(); c.ellipse(10, 12, 72, 58, 0, 0, TAU); c.fill();
        const g = c.createRadialGradient(-22, -24, 6, 0, 0, 72);
        g.addColorStop(0, '#fff2c8'); g.addColorStop(0.5, '#efd393'); g.addColorStop(1, '#d4ad66');
        c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 70, 58, 0, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(160,110,50,.35)'; c.lineWidth = 1.6;
        for (let i = 0; i < 8; i++) { const r = 18 + i * 7; c.beginPath(); c.arc(-6, -6, r, 0.15 + i * 0.05, 1.55 - i * 0.03); c.stroke(); c.beginPath(); c.arc(-6, -6, r, 2.6, 3.4); c.stroke(); }
        for (let i = 0; i < 6; i++) stein(c, (rnd() - 0.5) * 120, (rnd() - 0.5) * 90, 3 + rnd() * 4, 2.5 + rnd() * 3, rnd());
        c.fillStyle = '#fff4ea'; c.beginPath(); c.arc(28, 24, 6, 0, TAU); c.fill();
        c.strokeStyle = '#d89a7a'; c.lineWidth = 1.2; c.beginPath(); for (let a = 0; a < 12; a += 0.3) c.lineTo(28 + Math.cos(a) * a * 0.45, 24 + Math.sin(a) * a * 0.45); c.stroke();
        for (let i = 0; i < 7; i++) {
          const a = rnd() * TAU, x = Math.cos(a) * 66, y = Math.sin(a) * 54;
          c.strokeStyle = '#b8a050'; c.lineWidth = 1.4;
          for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + k * 4, y - 9 - rnd() * 3); c.stroke(); }
        }
        break;
      }
      case 'spielplatz': {
        c.fillStyle = 'rgba(200,170,110,.6)'; c.beginPath(); c.ellipse(0, 10, 118, 60, -0.15, 0, TAU); c.fill();
        c.fillStyle = 'rgba(30,20,5,.28)';
        c.save(); c.translate(14, 18);
        c.fillRect(20, -24, 56, 56);
        c.save(); c.translate(20, 4); c.rotate(Math.PI - 0.32); c.beginPath(); c.roundRect(0, -16, 130, 32, 12); c.fill(); c.restore();
        c.restore();
        c.save(); c.translate(20, 4); c.rotate(Math.PI - 0.32);
        c.fillStyle = '#e8701a'; c.beginPath(); c.roundRect(0, -16, 130, 32, 12); c.fill();
        const rg = c.createLinearGradient(0, -12, 0, 12); rg.addColorStop(0, '#ffe680'); rg.addColorStop(0.5, '#ffcf33'); rg.addColorStop(1, '#f2b01e');
        c.fillStyle = rg; c.beginPath(); c.roundRect(4, -11, 122, 22, 9); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; c.beginPath(); c.moveTo(10, -5); c.lineTo(118, -5); c.stroke();
        c.restore();
        c.strokeStyle = '#4a7fd8'; c.lineWidth = 4;
        c.beginPath(); c.moveTo(76, -14); c.lineTo(112, -14); c.moveTo(76, 22); c.lineTo(112, 22); c.stroke();
        c.lineWidth = 3; c.strokeStyle = '#d0dcf0';
        for (let x = 82; x <= 110; x += 7) { c.beginPath(); c.moveTo(x, -14); c.lineTo(x, 22); c.stroke(); }
        c.fillStyle = '#a8743f'; c.fillRect(20, -24, 56, 56);
        const tri = (x1, y1, x2, y2, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(48, 4); c.lineTo(x1, y1); c.lineTo(x2, y2); c.closePath(); c.fill(); };
        tri(16, -28, 80, -28, '#ff6b5a'); tri(80, -28, 80, 36, '#d83a2c'); tri(80, 36, 16, 36, '#b82a20'); tri(16, 36, 16, -28, '#ff8a6a');
        c.strokeStyle = 'rgba(80,10,0,.4)'; c.lineWidth = 1.5; c.strokeRect(16, -28, 64, 64);
        c.fillStyle = '#ffe066'; c.beginPath(); c.arc(48, 4, 4, 0, TAU); c.fill();
        c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(-60, 50, 9, 0, TAU); c.fill();
        c.fillStyle = '#4fa3ff'; c.beginPath(); c.arc(-64, 46, 9, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(-64, 46, 9, -0.6, 0.9); c.lineTo(-64, 46); c.fill();
        c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(-64, 46, 9, 2.2, 3.3); c.lineTo(-64, 46); c.fill();
        for (let i = 0; i < 6; i++) { c.fillStyle = '#d29a5a'; c.beginPath(); c.arc(-40 + rnd() * 40, 22 + rnd() * 20, 1.5 + rnd() * 1.5, 0, TAU); c.fill(); }
        break;
      }
      case 'topf': {
        c.fillStyle = 'rgba(40,30,20,.3)'; c.beginPath(); c.ellipse(8, 44, 44, 9, 0, 0, TAU); c.fill();
        const pg = c.createLinearGradient(-36, 0, 36, 0);
        pg.addColorStop(0, '#a8482a'); pg.addColorStop(0.35, '#e0784a'); pg.addColorStop(1, '#8a3a20');
        c.fillStyle = pg; c.beginPath(); c.moveTo(-34, 6); c.lineTo(34, 6); c.lineTo(26, 44); c.quadraticCurveTo(0, 50, -26, 44); c.closePath(); c.fill();
        c.fillStyle = '#c86438'; c.beginPath(); c.ellipse(0, 4, 40, 12, 0, 0, TAU); c.fill();
        c.fillStyle = '#4a2a14'; c.beginPath(); c.ellipse(0, 4, 33, 8.5, 0, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(255,220,180,.45)'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 4, 38, 11, 0, Math.PI * 1.05, Math.PI * 1.6); c.stroke();
        c.strokeStyle = '#3d7a26'; c.lineWidth = 2;
        for (const [x, y] of [[-24, -40], [14, -54], [32, -26], [-36, -12]]) { c.beginPath(); c.moveTo(0, 2); c.quadraticCurveTo(x * 0.3, y * 0.6, x, y); c.stroke(); }
        const blatt = (x, y, r) => {
          c.fillStyle = 'rgba(0,30,0,.25)'; c.beginPath(); c.arc(x + 2, y + 3, r, 0, TAU); c.fill();
          c.fillStyle = '#4fae46'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
          c.strokeStyle = 'rgba(120,70,30,.35)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r * 0.55, 0, TAU); c.stroke();
          c.strokeStyle = 'rgba(20,80,20,.5)'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
        };
        for (const [x, y, r] of [[-30, -6, 12], [30, -4, 12], [-14, -18, 13], [16, -22, 13], [0, -6, 12], [-40, -24, 9], [38, -30, 9], [2, -36, 10]]) blatt(x, y, r);
        for (const [x, y] of [[-24, -42], [14, -56], [33, -28], [-38, -14]]) {
          for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU; blume(c, x + Math.cos(a) * 5, y + Math.sin(a) * 5, 2.6, k % 2 ? '#ff3d6a' : '#ff5c84', '#ffd0dc'); }
          blume(c, x, y, 2.6, '#ff4d78', '#ffe066');
        }
        break;
      }
      // ------------------------------------------------ neue Orte
      case 'obstwiese': {
        const g = c.createRadialGradient(0, 0, 10, 0, 0, 115);
        g.addColorStop(0, 'rgba(200,240,140,.45)'); g.addColorStop(1, 'rgba(200,240,140,0)');
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, 115, 0, TAU); c.fill();
        // Fallobst im Gras
        for (let i = 0; i < 22; i++) {
          const a = rnd() * TAU, r = 20 + rnd() * 80, x = Math.cos(a) * r, y = Math.sin(a) * r * 0.85;
          c.fillStyle = 'rgba(40,20,0,.25)'; c.beginPath(); c.arc(x + 1.2, y + 1.5, 3.4, 0, TAU); c.fill();
          c.fillStyle = rnd() < 0.7 ? '#e8323c' : '#ffd24a'; c.beginPath(); c.arc(x, y, 3.4, 0, TAU); c.fill();
          c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(x - 1.1, y - 1.1, 1, 0, TAU); c.fill();
        }
        const baeume = [[-50, -34, 44, '#e8323c'], [54, -18, 40, '#e8323c'], [-6, 50, 36, '#a8102a']];
        for (const [x, y, r] of baeume) baumSchatten(c, x, y, r);
        for (const [x, y, r, f] of baeume) apfelBaum(c, rnd, x, y, r, f);
        // Leiter am Baum
        c.save(); c.translate(84, 44); c.rotate(-2.3);
        c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(4, -5, 60, 16);
        c.strokeStyle = '#a8743f'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(0, -6); c.lineTo(58, -6); c.moveTo(0, 6); c.lineTo(58, 6); c.stroke();
        c.lineWidth = 2.2; for (let x = 6; x < 58; x += 9) { c.beginPath(); c.moveTo(x, -6); c.lineTo(x, 6); c.stroke(); }
        c.restore();
        // Korb voller Äpfel
        c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(-70, 66, 17, 11, 0, 0, TAU); c.fill();
        c.fillStyle = '#b07a40'; c.beginPath(); c.ellipse(-73, 62, 16, 11, 0, 0, TAU); c.fill();
        c.strokeStyle = '#7a4a1e'; c.lineWidth = 1; for (let k = -12; k <= 12; k += 4) { c.beginPath(); c.moveTo(-73 + k, 52); c.lineTo(-73 + k, 72); c.stroke(); }
        c.strokeStyle = '#8a5424'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(-73, 62, 16, 11, 0, 0, TAU); c.stroke();
        for (const [dx, dy] of [[-6, -3], [3, -4], [-1, 3], [7, 2], [-8, 4]]) { c.fillStyle = '#e8323c'; c.beginPath(); c.arc(-73 + dx, 62 + dy, 4.2, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(-74 + dx, 61 + dy, 1.2, 0, TAU); c.fill(); }
        break;
      }
      case 'kornfeld': {
        // goldenes Ährenfeld (Kreis), in der Mitte eine Vogelscheuche
        c.save();
        c.beginPath(); for (let i = 0; i <= 30; i++) { const a = (i / 30) * TAU, r = 96 + Math.sin(a * 5) * 5 + rnd() * 4; c.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.86); } c.closePath();
        c.fillStyle = 'rgba(120,80,10,.25)'; c.save(); c.translate(4, 6); c.fill(); c.restore();
        const g = c.createRadialGradient(-30, -30, 10, 0, 0, 110); g.addColorStop(0, '#ffe58a'); g.addColorStop(1, '#d9a83a');
        c.fillStyle = g; c.fill(); c.clip();
        c.strokeStyle = 'rgba(170,110,20,.35)'; c.lineWidth = 3;
        for (let y = -110; y < 110; y += 9) { c.beginPath(); c.moveTo(-110, y + 14); c.lineTo(110, y - 14); c.stroke(); }
        for (let i = 0; i < 520; i++) {
          const x = (rnd() - 0.5) * 210, y = (rnd() - 0.5) * 190, a = -1.2 + rnd() * 0.5;
          c.strokeStyle = rnd() < 0.5 ? '#f6dc8a' : '#c8922c'; c.lineWidth = 1.6;
          c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5); c.stroke();
        }
        c.restore();
        for (let i = 0; i < 24; i++) { const a = rnd() * TAU, r = 70 + rnd() * 30; blume(c, Math.cos(a) * r, Math.sin(a) * r * 0.86, 3.2, i % 4 ? '#ff2e3a' : '#4f7aff', i % 4 ? '#2a1010' : '#ffffff'); }
        // trampelpfad zur Vogelscheuche
        c.strokeStyle = 'rgba(150,100,30,.45)'; c.lineWidth = 9; c.beginPath(); c.moveTo(0, 10); c.quadraticCurveTo(30, 50, 40, 96); c.stroke();
        // Vogelscheuche
        c.fillStyle = 'rgba(60,40,0,.3)'; c.beginPath(); c.ellipse(12, 14, 44, 12, 0.3, 0, TAU); c.fill();
        c.strokeStyle = '#7a4a1e'; c.lineWidth = 5; c.beginPath(); c.moveTo(-40, -2); c.lineTo(40, -2); c.stroke();
        c.lineWidth = 6; c.beginPath(); c.moveTo(0, -8); c.lineTo(0, 30); c.stroke();
        // Hemd
        c.fillStyle = '#3d7ad8'; c.beginPath(); c.roundRect(-20, -12, 40, 24, 6); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; for (let k = -16; k <= 16; k += 8) { c.beginPath(); c.moveTo(k, -12); c.lineTo(k, 12); c.stroke(); }
        c.strokeStyle = 'rgba(200,40,40,.6)'; c.beginPath(); c.moveTo(-20, 0); c.lineTo(20, 0); c.stroke();
        c.fillStyle = '#e8323c'; c.beginPath(); c.roundRect(-34, -7, 15, 10, 3); c.fill(); c.beginPath(); c.roundRect(19, -7, 15, 10, 3); c.fill();
        // Stroh an den Ärmeln
        c.strokeStyle = '#f2cf6a'; c.lineWidth = 1.6;
        for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(sx * 34, -3); c.lineTo(sx * (40 + rnd() * 6), -8 + k * 3); c.stroke(); }
        // Hut von oben
        c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.arc(4, -2, 19, 0, TAU); c.fill();
        c.fillStyle = '#e8c068'; c.beginPath(); c.arc(0, -6, 18, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(150,100,30,.5)'; c.lineWidth = 1; for (let r = 4; r < 18; r += 3) { c.beginPath(); c.arc(0, -6, r, 0, TAU); c.stroke(); }
        c.fillStyle = '#d8a848'; c.beginPath(); c.arc(0, -6, 10, 0, TAU); c.fill();
        c.strokeStyle = '#c4302a'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, -6, 10.5, 0, TAU); c.stroke();
        c.fillStyle = '#f2d890'; c.beginPath(); c.arc(-3, -9, 5, 0, TAU); c.fill();
        // Krähe auf dem Arm
        c.fillStyle = '#2a2a34'; c.beginPath(); c.ellipse(30, -4, 7, 4.5, -0.3, 0, TAU); c.fill(); c.beginPath(); c.arc(36, -7, 3.4, 0, TAU); c.fill();
        c.fillStyle = '#ffb02e'; c.beginPath(); c.moveTo(39, -8); c.lineTo(43, -7); c.lineTo(39, -5.5); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(37, -8, 0.9, 0, TAU); c.fill();
        break;
      }
      case 'teich': {
        // Der Teich selbst liegt im Boden – hier Blätter, Seerosen, Frosch, Schilf & Libelle
        for (const [x, y, r] of [[-96, -10, 16], [-70, 30, 12], [-30, -46, 14], [40, -44, 11], [86, 6, 17], [62, 42, 12], [-20, 54, 13], [20, 30, 9], [104, -32, 9], [-112, 34, 9]]) seerosenBlatt(c, x, y, r, rnd() * TAU);
        seerose(c, -92, -12, 8); seerose(c, 84, 4, 9, '#ffb6d8'); seerose(c, -22, 52, 7, '#ffffff'); seerose(c, 38, -44, 6, '#ffd0e6');
        // großes Blatt mit Frosch
        seerosenBlatt(c, 10, -6, 26, 1.2);
        c.fillStyle = 'rgba(0,30,0,.3)'; c.beginPath(); c.ellipse(13, 0, 13, 10, 0, 0, TAU); c.fill();
        // Frosch (von oben)
        c.fillStyle = '#3f9a3a';
        for (const [dx, dy, a] of [[-12, 7, 0.6], [12, 7, -0.6], [-9, -6, -0.6], [9, -6, 0.6]]) { c.beginPath(); c.ellipse(10 + dx, -6 + dy, 6, 2.6, a, 0, TAU); c.fill(); }
        const fg = c.createRadialGradient(6, -10, 1, 10, -6, 12); fg.addColorStop(0, '#8ee070'); fg.addColorStop(1, '#2f8a34');
        c.fillStyle = fg; c.beginPath(); c.ellipse(10, -4, 9, 11, 0, 0, TAU); c.fill();
        for (const dx of [-5, 5]) { c.fillStyle = '#d8f8a0'; c.beginPath(); c.arc(10 + dx, -13, 3.6, 0, TAU); c.fill(); c.fillStyle = '#1a1a1a'; c.beginPath(); c.arc(10 + dx, -13.5, 1.8, 0, TAU); c.fill(); }
        c.fillStyle = 'rgba(30,80,20,.6)'; for (const [dx, dy] of [[-3, -2], [4, 2], [-2, 5]]) { c.beginPath(); c.arc(10 + dx, -4 + dy, 1.4, 0, TAU); c.fill(); }
        // Schilf an den Ufern
        schilf(c, rnd, -128, -28, 14, 30); schilf(c, rnd, 122, 34, 12, 28); schilf(c, rnd, -60, -78, 9, 24); schilf(c, rnd, 96, -70, 8, 22);
        // Libelle
        c.save(); c.translate(-50, 8); c.rotate(-0.5);
        c.fillStyle = 'rgba(200,235,255,.75)'; c.strokeStyle = 'rgba(80,140,200,.7)'; c.lineWidth = 0.6;
        for (const [wx, wy, a] of [[-2, -7, -0.25], [-2, 7, 0.25], [4, -6, -0.1], [4, 6, 0.1]]) { c.beginPath(); c.ellipse(wx, wy, 3, 8, a, 0, TAU); c.fill(); c.stroke(); }
        c.fillStyle = '#2a8af0'; c.fillRect(-14, -1.2, 22, 2.4); c.beginPath(); c.arc(9, 0, 2.6, 0, TAU); c.fill();
        c.restore();
        break;
      }
      case 'pilzwald': {
        const g = c.createRadialGradient(0, 0, 10, 0, 0, 118);
        g.addColorStop(0, 'rgba(40,70,40,.65)'); g.addColorStop(0.7, 'rgba(50,80,50,.35)'); g.addColorStop(1, 'rgba(50,80,50,0)');
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, 118, 0, TAU); c.fill();
        for (let i = 0; i < 40; i++) { const a = rnd() * TAU, r = Math.sqrt(rnd()) * 100; c.fillStyle = ['#6a9a4a', '#4f7a3a', '#86b05a'][i % 3]; c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r, 3 + rnd() * 5, 0, TAU); c.fill(); }
        for (let i = 0; i < 30; i++) { c.fillStyle = ['#b07040', '#8a5428', '#c88a50', '#d8a040'][i % 4]; c.beginPath(); c.ellipse((rnd() - 0.5) * 190, (rnd() - 0.5) * 170, 3, 1.4, rnd() * 3, 0, TAU); c.fill(); }
        // Farn
        for (const [x, y, a] of [[-80, -40, 0.4], [70, 56, -2.4], [86, -50, -0.9]]) {
          c.save(); c.translate(x, y); c.rotate(a);
          c.strokeStyle = '#4f9a3a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 0); c.lineTo(30, 0); c.stroke();
          c.fillStyle = '#5aae44'; for (let k = 2; k < 30; k += 4) for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(k, sd * (7 - k * 0.15), 1.6, 6 - k * 0.15, sd * 0.4, 0, TAU); c.fill(); }
          c.restore();
        }
        // riesige Pilze
        fliegenpilz(c, -34, -26, 30); steinpilz(c, 40, -34, 25); fliegenpilz(c, 28, 34, 20); steinpilz(c, -46, 42, 18); fliegenpilz(c, 64, 10, 11);
        // leuchtende Pilzgruppen
        for (const [x, y] of [[0, 4], [-74, 6], [52, 66], [-10, 70], [76, -70], [-20, -76]]) {
          for (let k = 0; k < 4; k++) leuchtpilz(c, x + Math.cos(k * 1.7) * 7, y + Math.sin(k * 1.7) * 6, 3.4 + (k % 2) * 1.6, k % 2 ? ['#ffe0ff', '#c88aff', '#7a3ac8'] : ['#c8fff6', '#4fd8c8', '#1f8a8a']);
        }
        // Nebelschwaden
        for (let i = 0; i < 6; i++) { const ng = c.createRadialGradient(0, 0, 0, 0, 0, 40); ng.addColorStop(0, 'rgba(235,245,255,.3)'); ng.addColorStop(1, 'rgba(235,245,255,0)'); c.save(); c.translate((rnd() - 0.5) * 160, (rnd() - 0.5) * 140); c.scale(1.8, 0.7); c.fillStyle = ng; c.beginPath(); c.arc(0, 0, 40, 0, TAU); c.fill(); c.restore(); }
        break;
      }
      case 'steingarten': {
        const g = c.createRadialGradient(0, 0, 10, 0, 0, 110);
        g.addColorStop(0, 'rgba(230,226,215,.75)'); g.addColorStop(0.75, 'rgba(220,214,200,.5)'); g.addColorStop(1, 'rgba(220,214,200,0)');
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, 110, 0, TAU); c.fill();
        for (let i = 0; i < 160; i++) { const a = rnd() * TAU, r = Math.sqrt(rnd()) * 95; c.fillStyle = ['#b8b2a6', '#d8d2c6', '#9a948a', '#eae6dc'][i % 4]; c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r, 0.8 + rnd() * 1.6, 0, TAU); c.fill(); }
        lavendel(c, rnd, -70, -40, 18); lavendel(c, rnd, 66, 46, 20); lavendel(c, rnd, -54, 60, 14); lavendel(c, rnd, 80, -36, 13);
        platte(c, rnd, -12, -6, 34); platte(c, rnd, 36, -40, 22, '#ece6dc', '#a09484'); platte(c, rnd, -48, 20, 20, '#e2dcd2', '#8e887e'); platte(c, rnd, 22, 34, 24); platte(c, rnd, -26, -56, 16, '#f0ece2', '#a8a296');
        // Steinmännchen
        for (const [dy, rx] of [[0, 11], [-8, 8.5], [-15, 6.5], [-21, 4.5]]) stein(c, 58, 4 + dy, rx, rx * 0.72, 0.1, '#f2efe8', '#8a857c');
        // Hauswurz-Rosetten
        for (const [x, y] of [[-30, 38], [8, 64], [-80, 8], [44, -72]]) {
          for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU; c.fillStyle = k % 2 ? '#6aa860' : '#80c070'; c.beginPath(); c.ellipse(x + Math.cos(a) * 4.5, y + Math.sin(a) * 4.5, 4.5, 2.2, a, 0, TAU); c.fill(); c.fillStyle = '#c4505a'; c.beginPath(); c.arc(x + Math.cos(a) * 8.5, y + Math.sin(a) * 8.5, 0.9, 0, TAU); c.fill(); }
          c.fillStyle = '#a8e090'; c.beginPath(); c.arc(x, y, 2.6, 0, TAU); c.fill();
        }
        break;
      }
      case 'kompost': {
        c.fillStyle = 'rgba(70,45,25,.55)'; c.beginPath(); c.ellipse(4, 8, 92, 74, 0, 0, TAU); c.fill();
        for (let i = 0; i < 40; i++) { const a = rnd() * TAU, r = 60 + rnd() * 34; c.fillStyle = ['#5a3a20', '#7a5a2a', '#a8742a', '#6a8a2a'][i % 4]; c.beginPath(); c.ellipse(Math.cos(a) * r, Math.sin(a) * r * 0.8, 3.2, 1.6, rnd() * 3, 0, TAU); c.fill(); }
        // Holzkiste (von oben, Latten)
        const bx = -48, by = -40, bw = 96, bh = 80;
        c.fillStyle = 'rgba(20,10,0,.4)'; c.fillRect(bx + 8, by + 10, bw, bh);
        c.fillStyle = '#3a2616'; c.fillRect(bx, by, bw, bh);
        // Komposterde mit Resten
        for (let i = 0; i < 120; i++) { c.fillStyle = ['#2a1a10', '#4a3220', '#5a4028', '#3a5a20'][(rnd() * 4) | 0]; c.beginPath(); c.arc(bx + 8 + rnd() * (bw - 16), by + 8 + rnd() * (bh - 16), 1 + rnd() * 2.6, 0, TAU); c.fill(); }
        // Apfelgriebsch
        c.fillStyle = '#f2e0a0'; c.beginPath(); c.ellipse(-20, -12, 5, 9, 0.4, 0, TAU); c.fill(); c.fillStyle = '#e8323c'; c.beginPath(); c.arc(-23, -20, 4, 0, TAU); c.fill(); c.beginPath(); c.arc(-17, -4, 4, 0, TAU); c.fill();
        c.fillStyle = '#4a2a14'; c.beginPath(); c.arc(-20, -12, 1.2, 0, TAU); c.fill();
        // Bananenschale
        c.fillStyle = '#ffd84a'; c.strokeStyle = '#8a6a1a'; c.lineWidth = 0.8;
        for (const a of [-0.4, 0.9, 2.3]) { c.save(); c.translate(18, 8); c.rotate(a); c.beginPath(); c.ellipse(9, 0, 10, 3.4, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); }
        c.fillStyle = '#6a4a1a'; c.beginPath(); c.arc(18, 8, 3, 0, TAU); c.fill();
        // Eierschalen
        for (const [x, y, a] of [[-26, 18, 0.3], [-16, 24, 2], [30, -22, 1]]) { c.fillStyle = '#fff8ea'; c.beginPath(); c.arc(x, y, 5, a, a + 2.6); c.closePath(); c.fill(); c.strokeStyle = '#d8c8a8'; c.stroke(); }
        // Salatblatt & Karottengrün
        c.fillStyle = '#7cc84e'; c.beginPath(); c.ellipse(4, -22, 11, 6, -0.4, 0, TAU); c.fill();
        c.strokeStyle = '#5aa83a'; c.lineWidth = 1.4; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(-6, 28); c.lineTo(2 + k * 4, 20 + k); c.stroke(); }
        c.fillStyle = '#ff8a1c'; c.beginPath(); c.arc(-6, 29, 3, 0, TAU); c.fill();
        // Latten-Rahmen
        for (const [x, y, w, h] of [[bx - 4, by - 6, bw + 8, 8], [bx - 4, by + bh - 2, bw + 8, 8], [bx - 6, by - 4, 8, bh + 8], [bx + bw - 2, by - 4, 8, bh + 8]]) {
          const lg = c.createLinearGradient(x, y, x + w, y + h); lg.addColorStop(0, '#c8925a'); lg.addColorStop(1, '#9a6434');
          c.fillStyle = lg; c.fillRect(x, y, w, h);
          c.strokeStyle = 'rgba(70,40,15,.55)'; c.lineWidth = 1; c.strokeRect(x, y, w, h);
        }
        c.fillStyle = '#5a3a1a'; for (const [x, y] of [[bx - 2, by - 2], [bx + bw, by - 2], [bx - 2, by + bh], [bx + bw, by + bh]]) { c.fillRect(x - 2, y - 2, 6, 6); }
        // Sonnenblume daneben
        c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(72, -52, 22, 0, TAU); c.fill();
        c.fillStyle = '#3f9a3a'; c.beginPath(); c.ellipse(60, -38, 12, 6, 0.8, 0, TAU); c.fill();
        for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; c.fillStyle = k % 2 ? '#ffc21a' : '#ffd84a'; c.beginPath(); c.ellipse(68 + Math.cos(a) * 13, -56 + Math.sin(a) * 13, 8, 3.4, a, 0, TAU); c.fill(); }
        c.fillStyle = '#5a3414'; c.beginPath(); c.arc(68, -56, 9.5, 0, TAU); c.fill();
        c.fillStyle = '#8a5424'; for (let k = 0; k < 12; k++) { c.beginPath(); c.arc(68 + (rnd() - 0.5) * 13, -56 + (rnd() - 0.5) * 13, 1.1, 0, TAU); c.fill(); }
        // Regenwurm
        c.strokeStyle = '#e88a9a'; c.lineWidth = 3.4; c.beginPath(); for (let k = 0; k <= 12; k++) c.lineTo(-66 + k * 3, 58 + Math.sin(k * 0.9) * 3); c.stroke();
        c.fillStyle = '#d06a7a'; c.beginPath(); c.arc(-66, 58, 1.8, 0, TAU); c.fill();
        break;
      }
      case 'heide': {
        const g = c.createRadialGradient(0, 0, 10, 0, 0, 118);
        g.addColorStop(0, 'rgba(190,120,210,.4)'); g.addColorStop(1, 'rgba(190,120,210,0)');
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, 118, 0, TAU); c.fill();
        // sandiger Pfad
        c.strokeStyle = 'rgba(230,210,170,.85)'; c.lineWidth = 10; c.beginPath(); c.moveTo(-110, 40); c.bezierCurveTo(-40, 10, 10, 60, 110, 20); c.stroke();
        const pts = [];
        for (let i = 0; i < 26; i++) { const a = rnd() * TAU, r = 20 + Math.sqrt(rnd()) * 84; pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.85, 8 + rnd() * 9]); }
        pts.sort((a, b) => a[1] - b[1]);
        for (const [x, y, r] of pts) heidekraut(c, rnd, x, y, r);
        wacholder(c, rnd, 70, -50, 16); wacholder(c, rnd, -84, 2, 13);
        const bs = [[-34, -42, 30], [28, -14, 26], [-8, 50, 22]];
        for (const [x, y, r] of bs) baumSchatten(c, x, y, r);
        for (const [x, y, r] of bs) birke(c, rnd, x, y, r);
        // Bienchen
        for (const [x, y] of [[56, 40], [-60, 70]]) {
          c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.ellipse(x - 1, y - 3, 2.6, 1.5, -0.5, 0, TAU); c.fill(); c.beginPath(); c.ellipse(x + 1, y - 3, 2.6, 1.5, 0.5, 0, TAU); c.fill();
          c.fillStyle = '#ffc21a'; c.beginPath(); c.ellipse(x, y, 3.4, 2.4, 0, 0, TAU); c.fill();
          c.fillStyle = '#2a1a0a'; c.fillRect(x - 1.2, y - 2.3, 1, 4.6); c.fillRect(x + 1, y - 2.3, 1, 4.6);
        }
        break;
      }
      case 'baumhaus': {
        // Schatten des großen Baums
        c.fillStyle = 'rgba(12,40,14,.3)'; c.beginPath(); c.ellipse(26, 30, 104, 90, 0.3, 0, TAU); c.fill();
        // Wurzeln
        c.strokeStyle = '#6a4220'; c.lineWidth = 7;
        for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.4; c.beginPath(); c.moveTo(Math.cos(a) * 60, Math.sin(a) * 60); c.quadraticCurveTo(Math.cos(a + 0.2) * 90, Math.sin(a + 0.2) * 90, Math.cos(a) * 112, Math.sin(a) * 104); c.stroke(); }
        laubBaum(c, rnd, 0, 0, 96, ['#86d86a', '#2a742c'], 12);
        // Plattform mit Hütte
        c.save(); c.translate(-6, -8); c.rotate(-0.12);
        c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(-36 + 8, -30 + 10, 72, 62);
        for (let k = 0; k < 9; k++) { c.fillStyle = k % 2 ? '#c88a50' : '#b07440'; c.fillRect(-36 + k * 8, -30, 7.4, 62); }
        c.strokeStyle = 'rgba(70,40,15,.5)'; c.lineWidth = 1; c.strokeRect(-36, -30, 72, 62);
        // Geländer
        c.strokeStyle = '#8a5428'; c.lineWidth = 3; c.strokeRect(-38, -32, 76, 66);
        // Dach (Satteldach von oben)
        c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(-24 + 5, -26 + 6, 48, 40);
        const d1 = c.createLinearGradient(0, -26, 0, -6); d1.addColorStop(0, '#ff7a5a'); d1.addColorStop(1, '#d84a32');
        c.fillStyle = d1; c.fillRect(-24, -26, 48, 20);
        const d2 = c.createLinearGradient(0, -6, 0, 14); d2.addColorStop(0, '#b8321f'); d2.addColorStop(1, '#9a2a1a');
        c.fillStyle = d2; c.fillRect(-24, -6, 48, 20);
        c.strokeStyle = 'rgba(80,10,0,.35)'; c.lineWidth = 1; for (let x = -20; x < 24; x += 6) { c.beginPath(); c.moveTo(x, -26); c.lineTo(x, 14); c.stroke(); }
        c.fillStyle = '#ffd34d'; c.fillRect(-26, -8, 52, 4);
        c.restore();
        // Wimpelkette
        const wim = ['#ff5c8a', '#ffd34d', '#4fa3ff', '#5fd068', '#a77bff', '#ff9f1c'];
        c.strokeStyle = 'rgba(80,60,40,.8)'; c.lineWidth = 1; c.beginPath(); c.moveTo(32, -38); c.quadraticCurveTo(62, -20, 84, -46); c.stroke();
        for (let k = 0; k < 6; k++) { const u = (k + 0.5) / 6, x = (1 - u) ** 2 * 32 + 2 * (1 - u) * u * 62 + u * u * 84, y = (1 - u) ** 2 * -38 + 2 * (1 - u) * u * -20 + u * u * -46; c.fillStyle = wim[k]; c.beginPath(); c.moveTo(x - 3.5, y); c.lineTo(x + 3.5, y); c.lineTo(x, y + 8); c.fill(); }
        // Strickleiter bis zum Boden
        c.save(); c.translate(26, 24); c.rotate(0.55);
        c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(-6 + 6, 0, 18, 88);
        c.strokeStyle = '#d8b880'; c.lineWidth = 2; c.beginPath(); c.moveTo(-6, 0); c.lineTo(-6, 88); c.moveTo(6, 0); c.lineTo(6, 88); c.stroke();
        c.strokeStyle = '#a8743f'; c.lineWidth = 3; for (let y = 8; y < 88; y += 11) { c.beginPath(); c.moveTo(-6, y); c.lineTo(6, y); c.stroke(); }
        c.restore();
        // Spielzeug am Boden
        c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(-82, 82, 7, 0, TAU); c.fill();
        c.fillStyle = '#ff5c5c'; c.beginPath(); c.arc(-84, 80, 7, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-84, 80, 7, 0.4, 1.4); c.lineTo(-84, 80); c.fill();
        c.save(); c.translate(84, 96); c.rotate(-0.6); c.fillStyle = '#3d95f5'; c.fillRect(-12, -2, 24, 4); c.fillStyle = '#ffd34d'; c.fillRect(12, -2, 4, 4); c.restore();
        break;
      }
      case 'gewaechshaus': {
        const gw = 176, gh = 118, gx = -gw / 2, gy = -gh / 2 - 6;
        c.fillStyle = 'rgba(30,40,30,.3)'; c.fillRect(gx + 10, gy + 12, gw, gh);
        // Boden & Pflanzen innen
        c.fillStyle = '#6a4a30'; c.fillRect(gx, gy, gw, gh);
        c.fillStyle = '#c8b898'; c.fillRect(gx, gy + gh / 2 - 7, gw, 14);
        for (const ry of [gy + 22, gy + gh - 22]) for (let x = gx + 16; x < gx + gw - 8; x += 19) {
          c.fillStyle = '#2f7d32'; c.beginPath(); c.arc(x, ry, 10, 0, TAU); c.fill();
          c.fillStyle = '#5ab84a'; c.beginPath(); c.arc(x - 2, ry - 2, 6.5, 0, TAU); c.fill();
          c.fillStyle = '#e8323c'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x + Math.cos(k * 2.1 + x) * 6, ry + Math.sin(k * 2.1 + x) * 6, 2.4, 0, TAU); c.fill(); }
        }
        // Glas
        const glas = c.createLinearGradient(gx, gy, gx + gw, gy + gh);
        glas.addColorStop(0, 'rgba(210,245,255,.55)'); glas.addColorStop(0.5, 'rgba(170,225,240,.28)'); glas.addColorStop(1, 'rgba(200,240,255,.5)');
        c.fillStyle = glas; c.fillRect(gx, gy, gw, gh / 2);
        c.fillStyle = 'rgba(160,215,235,.36)'; c.fillRect(gx, gy + gh / 2, gw, gh / 2);
        // Spiegelungen
        c.fillStyle = 'rgba(255,255,255,.45)';
        for (const x of [gx + 24, gx + 96]) { c.beginPath(); c.moveTo(x, gy + gh / 2 - 2); c.lineTo(x + 26, gy + 2); c.lineTo(x + 38, gy + 2); c.lineTo(x + 12, gy + gh / 2 - 2); c.fill(); }
        // Streben
        c.strokeStyle = '#f6f8f4'; c.lineWidth = 3; c.strokeRect(gx, gy, gw, gh);
        c.lineWidth = 2.4; c.beginPath(); c.moveTo(gx, gy + gh / 2); c.lineTo(gx + gw, gy + gh / 2); c.stroke();
        c.lineWidth = 1.6; for (let x = gx + 22; x < gx + gw; x += 22) { c.beginPath(); c.moveTo(x, gy); c.lineTo(x, gy + gh); c.stroke(); }
        c.strokeStyle = 'rgba(120,140,140,.6)'; c.lineWidth = 1; c.strokeRect(gx - 1.5, gy - 1.5, gw + 3, gh + 3);
        // Tropfen an der Scheibe
        c.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 26; i++) { c.beginPath(); c.arc(gx + 6 + rnd() * (gw - 12), gy + 6 + rnd() * (gh - 12), 0.8 + rnd() * 1.2, 0, TAU); c.fill(); }
        // Tür (unten)
        c.fillStyle = 'rgba(80,110,100,.6)'; c.fillRect(-12, gy + gh - 2, 24, 8);
        // Gießkanne
        c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(72, 70, 14, 9, 0, 0, TAU); c.fill();
        c.fillStyle = '#3cae5a'; c.beginPath(); c.ellipse(68, 66, 13, 9, 0, 0, TAU); c.fill();
        c.strokeStyle = '#2a8a44'; c.lineWidth = 3; c.beginPath(); c.moveTo(76, 62); c.lineTo(94, 52); c.stroke();
        c.fillStyle = '#2a8a44'; c.beginPath(); c.arc(95, 51, 3.4, 0, TAU); c.fill();
        c.strokeStyle = '#2a8a44'; c.lineWidth = 2; c.beginPath(); c.arc(64, 66, 6, Math.PI, TAU); c.stroke();
        // Töpfchen mit Setzlingen
        for (const [x, y] of [[-76, 72], [-62, 78], [-48, 72], [-90, 80]]) {
          c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.arc(x + 1.5, y + 2, 6, 0, TAU); c.fill();
          c.fillStyle = '#d0703a'; c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fill(); c.fillStyle = '#4a2a14'; c.beginPath(); c.arc(x, y, 4.4, 0, TAU); c.fill();
          c.fillStyle = '#6ad050'; c.beginPath(); c.ellipse(x - 2, y - 1, 2.8, 1.4, 0.5, 0, TAU); c.fill(); c.beginPath(); c.ellipse(x + 2, y - 1, 2.8, 1.4, -0.5, 0, TAU); c.fill();
        }
        break;
      }
      case 'felsen': {
        // Hohe graue Felswand (von vorn, wie das Haus): Felsplatten in Reihen, oben Gras, Wasserfall ins Becken
        c.fillStyle = 'rgba(20,20,30,.32)'; c.beginPath(); c.ellipse(12, 46, 138, 60, 0, 0, TAU); c.fill();
        const top = x => Math.min(34, -106 + (Math.abs(x) / 122) ** 3 * 118 + Math.abs(Math.sin(x * 0.05)) * 12 + Math.sin(x * 0.13) * 4);
        const kontur = new Path2D();
        kontur.moveTo(-134, 40);
        for (let x = -134; x <= 134; x += 4) kontur.lineTo(x, top(x));
        kontur.lineTo(134, 40); kontur.quadraticCurveTo(0, 56, -134, 40); kontur.closePath();
        const wg = c.createLinearGradient(0, -110, 0, 50); wg.addColorStop(0, '#9c9aa6'); wg.addColorStop(1, '#4e4c58');
        c.fillStyle = wg; c.fill(kontur);
        c.save(); c.clip(kontur);
        const cols = [['#d8d6de', '#8e8c98'], ['#cac8d2', '#7e7c88'], ['#e2e0e6', '#9a98a4'], ['#bebcc6', '#74727e']];
        for (let row = 0; row < 5; row++) {
          const y0 = -104 + row * 30, hh = 30;
          let x = -136 + (row % 2) * 18;
          while (x < 136) {
            const w = 30 + rnd() * 22;
            if (!(x + w > -18 && x < 18)) {
              const j = () => (rnd() - 0.5) * 6, [hi, lo] = cols[(rnd() * 4) | 0];
              const pts = [[x + 3 + j(), y0 + 2 + j()], [x + w - 3 + j(), y0 + 1 + j()], [x + w + j(), y0 + hh * 0.5], [x + w - 4 + j(), y0 + hh - 1], [x + 4 + j(), y0 + hh], [x + j(), y0 + hh * 0.5]];
              const g = c.createLinearGradient(0, y0, 0, y0 + hh); g.addColorStop(0, hi); g.addColorStop(1, lo);
              c.fillStyle = g; c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath(); c.fill();
              c.strokeStyle = 'rgba(40,38,50,.55)'; c.lineWidth = 1.4; c.stroke();
              c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(pts[0][0] + 2, pts[0][1] + 2); c.lineTo(pts[1][0] - 2, pts[1][1] + 2); c.stroke();
              if (rnd() < 0.4) { c.strokeStyle = 'rgba(40,38,50,.45)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + w * 0.5, y0 + 4); c.lineTo(x + w * 0.45 + j(), y0 + hh * 0.6); c.stroke(); }
            }
            x += w;
          }
          // Vorsprung mit Moos
          for (let k = 0; k < 4; k++) { const mx = -120 + rnd() * 240; if (Math.abs(mx) < 26) continue; blob(c, rnd, mx, y0 + hh - 2, 5 + rnd() * 5, rnd() < 0.5 ? '#6a9a4a' : '#86b05a', 8, 0.5); }
        }
        // Schatten unten an der Wand
        const sg = c.createLinearGradient(0, 10, 0, 50); sg.addColorStop(0, 'rgba(20,20,40,0)'); sg.addColorStop(1, 'rgba(20,20,40,.45)');
        c.fillStyle = sg; c.fillRect(-140, 10, 280, 50);
        c.restore();
        c.strokeStyle = 'rgba(30,28,40,.6)'; c.lineWidth = 2; c.stroke(kontur);
        // Gras & Büsche oben auf der Kante
        c.lineCap = 'round';
        for (let x = -126; x <= 126; x += 5) { const y = top(x); if (y > 26) continue; c.strokeStyle = rnd() < 0.5 ? '#5aa83a' : '#7cc24a'; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y + 1); c.lineTo(x + (rnd() - 0.5) * 4, y - 5 - rnd() * 4); c.stroke(); }
        for (const x of [-96, -58, 50, 90]) { const y = top(x); laubBaum(c, rnd, x, y - 4, 12, ['#8ade6e', '#2f7d32'], 5); }
        // Edelweiß & Enzian auf Vorsprüngen
        for (let i = 0; i < 12; i++) { const x = -110 + rnd() * 220; if (Math.abs(x) < 26) continue; const y = -70 + ((rnd() * 4) | 0) * 30 + 26; if (i % 2) blume(c, x, y, 2.6, '#ffffff', '#f2e080'); else blume(c, x, y, 2.4, '#2a5ae8', '#ffffff'); }
        // Wasserfall
        const wf = c.createLinearGradient(-16, 0, 16, 0); wf.addColorStop(0, '#5aaee8'); wf.addColorStop(0.5, '#e6f8ff'); wf.addColorStop(1, '#5aaee8');
        c.fillStyle = wf; c.beginPath(); c.moveTo(-11, top(0) + 2); c.quadraticCurveTo(-13, -40, -16, 46); c.lineTo(16, 46); c.quadraticCurveTo(13, -40, 11, top(0) + 2); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.5; for (let x = -9; x <= 9; x += 4.5) { c.beginPath(); c.moveTo(x, top(0) + 4); c.lineTo(x * 1.35, 44); c.stroke(); }
        // Becken mit Gischt
        c.fillStyle = '#b8b2a4'; c.beginPath(); c.ellipse(0, 62, 54, 24, 0, 0, TAU); c.fill();
        const pb = c.createRadialGradient(-10, 56, 4, 0, 62, 48); pb.addColorStop(0, '#7ac8f4'); pb.addColorStop(1, '#2a7ab4');
        c.fillStyle = pb; c.beginPath(); c.ellipse(0, 62, 47, 19, 0, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,.88)'; for (let i = 0; i < 20; i++) { c.beginPath(); c.arc((rnd() - 0.5) * 36, 47 + rnd() * 12, 1.5 + rnd() * 3.2, 0, TAU); c.fill(); }
        // Felsbrocken am Fuß
        for (const [x, y, r] of [[-74, 58, 14], [-108, 46, 10], [-50, 76, 7], [66, 60, 13], [104, 48, 10], [40, 82, 6]]) stein(c, x, y, r, r * 0.75, rnd(), '#dcdae0', '#5e5c68');
        break;
      }
    }
  }, 2);
}

// ---------- Boden (einmal vorgerendert, reduzierte Auflösung) ----------
function makeBase() {
  const cv = document.createElement('canvas');
  cv.width = Math.round(W * BS); cv.height = Math.round(H * BS);
  const c = cv.getContext('2d');
  c.scale(BS, BS);
  const rnd = mulberry32(4242);
  const n = makeNoise(77);
  // Belegt-Raster (10er Zellen): hier keine Blumen/Bäume streuen
  const GW = W / 10, GH = H / 10, belegt = new Uint8Array(GW * GH);
  const markiere = (x, y, r) => {
    for (let gy = Math.max(0, Math.floor((y - r) / 10)); gy <= Math.min(GH - 1, Math.floor((y + r) / 10)); gy++)
      for (let gx = Math.max(0, Math.floor((x - r) / 10)); gx <= Math.min(GW - 1, Math.floor((x + r) / 10)); gx++)
        if (Math.hypot(gx * 10 + 5 - x, gy * 10 + 5 - y) < r) belegt[gy * GW + gx] = 1;
  };
  const frei = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !belegt[((y / 10) | 0) * GW + ((x / 10) | 0)];
  for (const P of [BACH, STROM, ABFLUSS]) for (let i = 0; i < P.length; i += 3) markiere(P[i][0], P[i][1], 42);
  for (const P of [WEG, WEG2]) for (let i = 0; i < P.length; i += 3) markiere(P[i][0], P[i][1], 26);
  for (let i = 0; i < PFAD.length; i += 2) markiere(PFAD[i][0], PFAD[i][1], 16);
  for (let y = 0; y < H; y += 10) for (let x = 0; x < W; x += 10) {
    if ((x > GARTEN.x0 - 20 && x < GARTEN.x1 + 20 && y > GARTEN.y0 - 20 && y < GARTEN.y1 + 20) ||
      (x > PLATZ.x0 && x < PLATZ.x1 && y > PLATZ.y0 && y < PLATZ.y1) || (x > HAUS.x0 - 20 && y < HAUS.y1 + 40) ||
      inEll(x, y, TEICH, 1.2) || inEll(x, y, FELD, 1.04) || inEll(x, y, SAND, 0.75) || inEll(x, y, FELS, 0.9) || inEll(x, y, KIES, 0.85)) belegt[(y / 10) * GW + x / 10] = 1;
  }

  // Wiese mit weichen Farbwolken (in niedriger Auflösung gerechnet, weich hochskaliert)
  const sc = 8, lw = Math.ceil(W / sc), lh = Math.ceil(H / sc);
  const low = document.createElement('canvas'); low.width = lw; low.height = lh;
  const lc = low.getContext('2d'); const img = lc.createImageData(lw, lh);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const v = n(x * 0.033, y * 0.033, 4), v2 = n(x * 0.12 + 40, y * 0.12, 3), v3 = n(x * 0.016 + 90, y * 0.016 + 20, 2);
    const i = (y * lw + x) * 4;
    img.data[i] = 74 + v * 72 + v2 * 18 + v3 * 30;
    img.data[i + 1] = 138 + v * 64 + v2 * 14;
    img.data[i + 2] = 48 + v * 34 - v3 * 10;
    img.data[i + 3] = 255;
  }
  lc.putImageData(img, 0, 0);
  c.imageSmoothingQuality = 'high';
  c.drawImage(low, 0, 0, W, H);

  const glanz = (x, y, r, col, a) => { const g = c.createRadialGradient(x, y, r * 0.1, x, y, r); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); };
  // Sonnige Lichtung, gemähte Wiese ums Revier, helle Obstwiese
  glanz(LICHT.x, LICHT.y, 240, '255,240,140', 0.5);
  glanz(HX, HY, RR * 1.15, '190,230,120', 0.35);
  glanz(1510, 290, 380, '210,240,140', 0.35);
  glanz(1290, 840, 300, '240,250,170', 0.22);

  // Waldboden
  for (const [cx, cy, rx, ry] of WALD) {
    const g = c.createRadialGradient(cx, cy, 10, cx, cy, Math.max(rx, ry) * 1.1);
    g.addColorStop(0, 'rgba(30,60,25,.85)'); g.addColorStop(0.75, 'rgba(40,80,30,.6)'); g.addColorStop(1, 'rgba(40,80,30,0)');
    c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy, rx * 1.1, ry * 1.1, 0, 0, TAU); c.fill();
  }
  // Pilzwald: dunkler, moosiger, leicht violett
  {
    const g = c.createRadialGradient(PILZ.x, PILZ.y, 20, PILZ.x, PILZ.y, PILZ.rx * 1.1);
    g.addColorStop(0, 'rgba(34,44,40,.9)'); g.addColorStop(0.7, 'rgba(40,56,44,.6)'); g.addColorStop(1, 'rgba(40,56,44,0)');
    c.fillStyle = g; c.beginPath(); c.ellipse(PILZ.x, PILZ.y, PILZ.rx * 1.1, PILZ.ry * 1.1, 0, 0, TAU); c.fill();
    for (let i = 0; i < 260; i++) { const a = rnd() * TAU, r = Math.sqrt(rnd()) * PILZ.rx; c.fillStyle = ['rgba(110,160,90,.5)', 'rgba(80,130,70,.5)', 'rgba(150,120,190,.25)'][i % 3]; c.beginPath(); c.arc(PILZ.x + Math.cos(a) * r, PILZ.y + Math.sin(a) * r * 0.82, 3 + rnd() * 6, 0, TAU); c.fill(); }
  }
  // Komposthaufen-Erde
  glanz(2350, 405, 150, '70,46,26', 0.6);

  // Sandhügel-Gebiet
  {
    const s = blobPath(SAND, 0, 9, 0.25);
    c.save(); c.filter = 'blur(10px)'; c.fillStyle = 'rgba(200,170,100,.6)'; c.fill(s); c.restore();
    const g = c.createRadialGradient(SAND.x - 60, SAND.y - 50, 20, SAND.x, SAND.y, SAND.rx);
    g.addColorStop(0, '#f7e2a8'); g.addColorStop(1, '#dcbc7c');
    c.fillStyle = g; c.fill(s);
    c.save(); c.clip(s);
    c.strokeStyle = 'rgba(170,120,60,.22)'; c.lineWidth = 2; c.lineCap = 'round';
    for (let i = 0; i < 80; i++) { const x = SAND.x + (rnd() - 0.5) * SAND.rx * 2, y = SAND.y + (rnd() - 0.5) * SAND.ry * 2, l = 20 + rnd() * 30; c.beginPath(); c.moveTo(x - l, y); c.quadraticCurveTo(x, y - 6, x + l, y + 2); c.stroke(); }
    for (let i = 0; i < 300; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(150,110,50,.35)' : 'rgba(255,250,220,.5)'; c.beginPath(); c.arc(SAND.x + (rnd() - 0.5) * SAND.rx * 2, SAND.y + (rnd() - 0.5) * SAND.ry * 2, 1 + rnd() * 1.5, 0, TAU); c.fill(); }
    c.restore();
  }
  // Felsiger Boden an der Felswand
  {
    const s = blobPath(FELS, 0, 31, 0.28);
    c.save(); c.filter = 'blur(12px)'; c.fillStyle = 'rgba(110,110,110,.5)'; c.fill(s); c.restore();
    const g = c.createRadialGradient(FELS.x + 60, FELS.y + 40, 20, FELS.x, FELS.y, FELS.rx);
    g.addColorStop(0, '#a8a49c'); g.addColorStop(1, '#8a8a7e');
    c.fillStyle = g; c.fill(s);
    c.save(); c.clip(s);
    for (let i = 0; i < 500; i++) { c.fillStyle = ['rgba(70,70,70,.35)', 'rgba(220,220,215,.45)', 'rgba(110,140,80,.35)'][i % 3]; c.beginPath(); c.arc(FELS.x + (rnd() - 0.5) * FELS.rx * 2, FELS.y + (rnd() - 0.5) * FELS.ry * 2, 1 + rnd() * 2.2, 0, TAU); c.fill(); }
    c.restore();
    for (let i = 0; i < 24; i++) { const a = rnd() * TAU, r = (0.55 + rnd() * 0.45) * 1, x = FELS.x + Math.cos(a) * FELS.rx * r, y = FELS.y + Math.sin(a) * FELS.ry * r; if (Math.hypot(x - 3350, y - 2200) > 190) stein(c, x, y, 8 + rnd() * 16, 6 + rnd() * 11, rnd(), '#dcdad6', '#6e6c70'); }
  }
  // Kies im Steingarten
  {
    const s = blobPath(KIES, 0, 17, 0.2);
    c.save(); c.filter = 'blur(6px)'; c.fillStyle = 'rgba(150,150,140,.5)'; c.fill(s); c.restore();
    c.fillStyle = '#cfc8bc'; c.fill(s);
    c.save(); c.clip(s);
    for (let i = 0; i < 1100; i++) { c.fillStyle = ['#b8b2a6', '#e2ddd2', '#9a948a', '#f2efe8'][i % 4]; c.beginPath(); c.arc(KIES.x + (rnd() - 0.5) * KIES.rx * 2, KIES.y + (rnd() - 0.5) * KIES.ry * 2, 0.8 + rnd() * 1.8, 0, TAU); c.fill(); }
    c.restore();
    for (let i = 0; i < 10; i++) { const a = rnd() * TAU, x = KIES.x + Math.cos(a) * KIES.rx * 0.95, y = KIES.y + Math.sin(a) * KIES.ry * 0.95; if (rnd() < 0.55) lavendel(c, rnd, x, y, 12 + rnd() * 8); else platte(c, rnd, x, y, 10 + rnd() * 10); }
  }
  // Heide: lila Kraut so weit das Auge reicht
  {
    const s = blobPath(HEIDE, 0, 23, 0.25);
    c.save(); c.filter = 'blur(14px)'; c.fillStyle = 'rgba(140,90,150,.55)'; c.fill(s); c.restore();
    c.fillStyle = '#8a6a7e'; c.fill(s);
    c.save(); c.clip(s);
    const HC = ['#b061c4', '#d07ad8', '#8e4aa8', '#c890e0', '#6a7a40', '#a050b8'], hp = HC.map(() => new Path2D());
    for (let i = 0; i < 2600; i++) {
      const x = HEIDE.x + (rnd() - 0.5) * HEIDE.rx * 2.2, y = HEIDE.y + (rnd() - 0.5) * HEIDE.ry * 2.2, r = 2 + rnd() * 3.2, p = hp[(rnd() * 6) | 0];
      p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU);
    }
    HC.forEach((col, i) => { c.fillStyle = col; c.fill(hp[i]); });
    c.restore();
    for (let i = 0; i < 2600; i += 10) { const x = HEIDE.x + (rnd() - 0.5) * HEIDE.rx * 1.6, y = HEIDE.y + (rnd() - 0.5) * HEIDE.ry * 1.6; if (inEll(x, y, HEIDE, 0.9)) markiere(x, y, 14); }
  }
  // Kornfeld
  {
    const s = blobPath(FELD, 0, 13, 0.08, -0.1);
    c.save(); c.filter = 'blur(8px)'; c.fillStyle = 'rgba(160,120,40,.5)'; c.fill(s); c.restore();
    const g = c.createLinearGradient(FELD.x - FELD.rx, FELD.y - FELD.ry, FELD.x + FELD.rx, FELD.y + FELD.ry);
    g.addColorStop(0, '#f2d27a'); g.addColorStop(0.5, '#e2b856'); g.addColorStop(1, '#cfa040');
    c.fillStyle = g; c.fill(s);
    c.save(); c.clip(s);
    c.strokeStyle = 'rgba(160,110,30,.35)'; c.lineWidth = 5; c.lineCap = 'round';
    for (let k = -30; k < 30; k++) { const y0 = FELD.y + k * 14; c.beginPath(); c.moveTo(FELD.x - 360, y0 + 36); c.lineTo(FELD.x + 360, y0 - 36); c.stroke(); }
    const ae = [new Path2D(), new Path2D()];
    for (let i = 0; i < 4200; i++) {
      const x = FELD.x + (rnd() - 0.5) * FELD.rx * 2.1, y = FELD.y + (rnd() - 0.5) * FELD.ry * 2.1, a = -1.3 + rnd() * 0.5, p = ae[rnd() < 0.5 ? 0 : 1];
      p.moveTo(x, y); p.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6);
    }
    c.lineWidth = 1.8; c.strokeStyle = '#fbe49a'; c.stroke(ae[0]); c.strokeStyle = '#b8862a'; c.stroke(ae[1]);
    c.restore();
    for (let i = 0; i < 70; i++) { const a = rnd() * TAU, x = FELD.x + Math.cos(a) * FELD.rx * (0.96 + rnd() * 0.1), y = FELD.y + Math.sin(a) * FELD.ry * (0.96 + rnd() * 0.1); blume(c, x, y, 3, i % 5 ? '#ff2e3a' : '#4f7aff', i % 5 ? '#2a1010' : '#fff'); }
  }
  // Kiesfläche ums Gewächshaus
  c.fillStyle = 'rgba(60,50,30,.25)'; c.beginPath(); c.roundRect(150, 196, 312, 230, 26); c.fill();
  c.fillStyle = '#d8d0bc'; c.beginPath(); c.roundRect(144, 188, 312, 230, 26); c.fill();
  for (let i = 0; i < 500; i++) { c.fillStyle = ['#b8b0a0', '#ece6d8', '#a8a090'][i % 3]; c.beginPath(); c.arc(150 + rnd() * 300, 194 + rnd() * 218, 0.8 + rnd() * 1.4, 0, TAU); c.fill(); }

  // Wasser: Bach, Wasserfall-Bach, Abfluss und Seerosenteich
  c.lineCap = 'round'; c.lineJoin = 'round';
  const teichP = w => { const p = new Path2D(); p.ellipse(TEICH.x, TEICH.y, TEICH.rx + w / 2, TEICH.ry + w / 2, -0.06, 0, TAU); return p; };
  const wasser = (w, col, ws = 1) => {
    c.strokeStyle = col; c.lineWidth = w; c.stroke(BACH_P);
    c.lineWidth = w * 0.85 * ws; c.stroke(STROM_P); c.lineWidth = w * 0.8 * ws; c.stroke(ABFLUSS_P);
    c.fillStyle = col; c.fill(teichP(w - 36));
  };
  wasser(68, 'rgba(60,90,30,.35)');
  wasser(56, '#cdb886');
  wasser(46, '#9a8a5a');
  wasser(40, '#2f7fb4');
  c.save(); c.translate(-3, -3); wasser(27, '#4aa2d8'); c.restore();
  // Teich: tiefere Mitte
  { const g = c.createRadialGradient(TEICH.x + 20, TEICH.y + 10, 10, TEICH.x, TEICH.y, TEICH.rx); g.addColorStop(0, 'rgba(20,70,120,.55)'); g.addColorStop(1, 'rgba(20,70,120,0)'); c.fillStyle = g; c.fill(teichP(-30)); }
  c.save(); c.translate(-6, -6); wasser(9, 'rgba(170,225,255,.55)', 0.8); c.restore();
  // Seerosen im Teich (zusätzlich zum Wahrzeichen)
  for (let i = 0; i < 12; i++) {
    const a = rnd() * TAU, r = 0.62 + rnd() * 0.3, x = TEICH.x + Math.cos(a) * TEICH.rx * r, y = TEICH.y + Math.sin(a) * TEICH.ry * r;
    seerosenBlatt(c, x, y, 8 + rnd() * 7, rnd() * TAU);
    if (rnd() < 0.35) seerose(c, x + 2, y - 2, 4.5);
  }
  // Uferkiesel & Schilf
  for (const P of [BACH, STROM]) for (let i = 0; i < P.length; i += 2) {
    const [x, y] = P[i];
    if (rnd() < 0.5) { const a = rnd() * TAU; c.fillStyle = ['#a89878', '#c8bca0', '#8a7a5a'][(rnd() * 3) | 0]; c.beginPath(); c.arc(x + Math.cos(a) * 26, y + Math.sin(a) * 26, 1.5 + rnd() * 2.5, 0, TAU); c.fill(); }
    if (rnd() < 0.07) {
      const side = rnd() < 0.5 ? -1 : 1;
      for (let k = 0; k < 8; k++) { const bx = x + (rnd() - 0.5) * 16, by = y + side * (26 + rnd() * 6); c.strokeStyle = rnd() < 0.5 ? '#4f8a2a' : '#7ab04a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + (rnd() - 0.5) * 8, by - 12 - rnd() * 8); c.stroke(); }
    }
  }
  for (let i = 0; i < 26; i++) { const a = rnd() * TAU; schilf(c, rnd, TEICH.x + Math.cos(a) * (TEICH.rx + 14), TEICH.y + Math.sin(a) * (TEICH.ry + 12), 5, 22); }

  // Wege
  const weg = (P, w) => {
    const p = pathOf(P);
    c.strokeStyle = 'rgba(90,70,30,.3)'; c.lineWidth = w + 7; c.stroke(p);
    c.strokeStyle = '#d9c491'; c.lineWidth = w; c.stroke(p);
    c.strokeStyle = 'rgba(255,245,215,.45)'; c.lineWidth = w * 0.36; c.stroke(p);
    for (let i = 0; i < P.length; i++) for (let k = 0; k < 2; k++) {
      const [x, y] = P[i]; c.fillStyle = rnd() < 0.5 ? 'rgba(140,110,60,.45)' : 'rgba(255,255,240,.6)';
      c.beginPath(); c.arc(x + (rnd() - 0.5) * w * 0.8, y + (rnd() - 0.5) * w * 0.8, 0.8 + rnd() * 1.4, 0, TAU); c.fill();
    }
  };
  weg(WEG, 26); weg(WEG2, 24);
  // Trittsteine vom Gewächshaus zum Garten
  for (let i = 0; i < PFAD.length; i += 6) stein(c, PFAD[i][0], PFAD[i][1], 9, 7, i * 0.3, '#f2eee4', '#a8a090');
  // Holzbrücke dort, wo der Gartenweg den Bach kreuzt
  {
    let bi = 0, bd = 1e9;
    for (let i = 2; i < WEG2.length - 2; i++) for (let j = 0; j < BACH.length; j += 2) { const d = Math.hypot(WEG2[i][0] - BACH[j][0], WEG2[i][1] - BACH[j][1]); if (d < bd) { bd = d; bi = i; } }
    const [bx, by] = WEG2[bi], ang = Math.atan2(WEG2[bi + 2][1] - WEG2[bi - 2][1], WEG2[bi + 2][0] - WEG2[bi - 2][0]);
    c.save(); c.translate(bx, by); c.rotate(ang);
    c.fillStyle = 'rgba(0,20,30,.35)'; c.fillRect(-48 + 6, -20 + 9, 96, 40);
    for (let i = -7; i <= 6; i++) {
      c.fillStyle = i % 2 ? '#b98048' : '#a56d3a'; c.fillRect(i * 7.3, -18, 6.6, 36);
      c.strokeStyle = 'rgba(70,40,15,.5)'; c.lineWidth = 0.8; c.strokeRect(i * 7.3, -18, 6.6, 36);
    }
    c.fillStyle = '#6a4422'; c.fillRect(-52, -22, 104, 5); c.fillRect(-52, 17, 104, 5);
    c.fillStyle = 'rgba(255,220,170,.4)'; c.fillRect(-52, -22, 104, 1.5); c.fillRect(-52, 17, 104, 1.5);
    for (const px of [-52, -2, 46]) for (const py of [-23, 16]) { c.fillStyle = '#4a2e14'; c.fillRect(px, py, 6, 7); }
    c.restore();
  }
  // Trittsteine über den Bach am Bachufer
  for (let k = 0; k < 4; k++) stein(c, 1000 + k * 10, 1560 + k * 22, 9, 7, 0.4, '#e8e4dc', '#8a857c');

  // Gemüsegarten mit Beeten und Zaun
  {
    const { x0, y0, x1, y1 } = GARTEN;
    const LX = 780, LY = 570;
    c.fillStyle = 'rgba(40,30,10,.3)'; c.beginPath(); c.roundRect(x0 + 6, y0 + 8, x1 - x0, y1 - y0, 14); c.fill();
    const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, '#9a6638'); g.addColorStop(1, '#7a4e28');
    c.fillStyle = g; c.beginPath(); c.roundRect(x0, y0, x1 - x0, y1 - y0, 14); c.fill();
    const reihen = Math.floor((y1 - y0 - 30) / 36);
    for (let r = 0; r < reihen; r++) {
      const y = y0 + 34 + r * 36;
      c.fillStyle = 'rgba(60,35,15,.45)'; c.beginPath(); c.roundRect(x0 + 18, y - 11, x1 - x0 - 36, 22, 11); c.fill();
      c.fillStyle = 'rgba(200,150,100,.25)'; c.fillRect(x0 + 24, y - 10, x1 - x0 - 48, 3);
      const typ = r % 4;
      for (let x = x0 + 32; x < x1 - 24; x += typ === 1 ? 24 : 18) {
        if (Math.hypot((x - LX) / 1.25, y - LY) < 100) continue;
        if (typ === 0) {
          c.strokeStyle = '#4fae3a'; c.lineWidth = 1.6;
          for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x, y + 2); c.lineTo(x + k * 3, y - 9); c.stroke(); }
          c.fillStyle = '#ff8a1c'; c.beginPath(); c.arc(x, y + 3, 2.6, 0, TAU); c.fill();
        } else if (typ === 1) {
          for (let k = 3; k >= 1; k--) { c.fillStyle = ['', '#d8f59a', '#a8e070', '#7cc84e'][k]; c.beginPath(); c.arc(x, y, k * 3.4, 0, TAU); c.fill(); }
        } else if (typ === 2) {
          c.fillStyle = '#5a9a7a'; c.beginPath(); c.arc(x, y, 8, 0, TAU); c.fill();
          c.strokeStyle = '#a8d8c0'; c.lineWidth = 1; for (let k = 0; k < 5; k++) { const a = k * 1.25; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); c.stroke(); }
          c.fillStyle = '#8fc8a8'; c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill();
        } else {
          c.fillStyle = '#3f9a3a'; for (let k = 0; k < 3; k++) { const a = k * 2.1; c.beginPath(); c.ellipse(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 4.5, 3, a, 0, TAU); c.fill(); }
          c.fillStyle = '#e8323c'; c.beginPath(); c.arc(x + 3, y + 3, 2.6, 0, TAU); c.fill(); c.beginPath(); c.arc(x - 4, y + 1, 2.2, 0, TAU); c.fill();
        }
      }
    }
    // Bohnenstangen
    for (const [bx, by] of [[x1 - 40, y0 + 30], [x1 - 40, y1 - 40], [x0 + 40, y1 - 40]]) for (let k = 0; k < 3; k++) {
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(bx + k * 10 + 3, by + 4, 6, 0, TAU); c.fill();
      c.fillStyle = '#4fae3a'; c.beginPath(); c.arc(bx + k * 10, by, 6, 0, TAU); c.fill();
      c.fillStyle = '#8a5a2a'; c.beginPath(); c.arc(bx + k * 10, by, 2, 0, TAU); c.fill();
    }
    // Zaun mit zwei offenen Toren (rechts zum Weg, unten zum Spielplatz)
    const gateR = [586, 636], gateU = [796, 848], gateL = [466, 514];
    c.strokeStyle = '#f2e6cc'; c.lineWidth = 3;
    const seg = (ax, ay, bx, by) => { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); };
    const zaun = () => {
      seg(x0 - 6, y0 - 6, x1 + 6, y0 - 6);
      seg(x1 + 6, y0 - 6, x1 + 6, gateR[0]); seg(x1 + 6, gateR[1], x1 + 6, y1 + 6);
      seg(x1 + 6, y1 + 6, gateU[1], y1 + 6); seg(gateU[0], y1 + 6, x0 - 6, y1 + 6);
      seg(x0 - 6, y1 + 6, x0 - 6, gateL[1]); seg(x0 - 6, gateL[0], x0 - 6, y0 - 6);
    };
    zaun(); c.strokeStyle = 'rgba(90,60,30,.35)'; c.lineWidth = 1; zaun();
    const post = (x, y) => { c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x - 1, y + 1, 7, 7); c.fillStyle = '#fff6e0'; c.fillRect(x - 3.5, y - 3.5, 7, 7); c.strokeStyle = '#a89070'; c.lineWidth = 1; c.strokeRect(x - 3.5, y - 3.5, 7, 7); };
    for (let x = x0; x <= x1; x += 40) { post(x, y0 - 6); if (x < gateU[0] - 4 || x > gateU[1] + 4) post(x, y1 + 6); }
    for (let y = y0 + 34; y < y1; y += 40) { if (y < gateL[0] - 4 || y > gateL[1] + 4) post(x0 - 6, y); if (y < gateR[0] - 4 || y > gateR[1] + 4) post(x1 + 6, y); }
    for (const y of gateR) post(x1 + 6, y);
    for (const x of gateU) post(x, y1 + 6);
    for (const y of gateL) post(x0 - 6, y);
  }

  // Spielplatz der Menschen
  {
    const { x0, y0, x1, y1 } = PLATZ;
    const p = new Path2D(); p.roundRect(x0, y0, x1 - x0, y1 - y0, 60);
    c.save(); c.filter = 'blur(6px)'; c.fillStyle = 'rgba(160,140,80,.55)'; c.fill(p); c.restore();
    c.fillStyle = 'rgba(214,196,140,.55)'; c.fill(p);
    for (let i = 0; i < 700; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(150,120,70,.3)' : 'rgba(255,250,220,.35)'; c.beginPath(); c.arc(x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0), 1 + rnd(), 0, TAU); c.fill(); }
    // Sandkasten
    const sx = 214, sy = 1900, sw = 140, sh = 120;
    c.fillStyle = 'rgba(30,20,5,.3)'; c.fillRect(sx + 8, sy + 10, sw, sh);
    c.fillStyle = '#b07a42'; c.fillRect(sx, sy, sw, sh);
    c.fillStyle = 'rgba(255,220,170,.35)'; c.fillRect(sx, sy, sw, 3); c.fillRect(sx, sy, 3, sh);
    let g = c.createRadialGradient(sx + 50, sy + 40, 5, sx + sw / 2, sy + sh / 2, 80); g.addColorStop(0, '#fbe6ad'); g.addColorStop(1, '#e5c682');
    c.fillStyle = g; c.fillRect(sx + 10, sy + 10, sw - 20, sh - 20);
    for (let i = 0; i < 80; i++) { c.fillStyle = 'rgba(170,130,70,.4)'; c.beginPath(); c.arc(sx + 12 + rnd() * (sw - 24), sy + 12 + rnd() * (sh - 24), 0.8 + rnd() * 1.2, 0, TAU); c.fill(); }
    c.fillStyle = 'rgba(120,80,30,.3)'; c.beginPath(); c.arc(sx + 48, sy + 50, 22, 0, TAU); c.fill();
    c.fillStyle = '#e2b866'; c.fillRect(sx + 28, sy + 30, 36, 36);
    for (const [dx, dy] of [[28, 30], [64, 30], [28, 66], [64, 66]]) { c.fillStyle = '#d8a850'; c.beginPath(); c.arc(sx + dx, sy + dy, 8, 0, TAU); c.fill(); c.fillStyle = '#f0cc80'; c.beginPath(); c.arc(sx + dx - 2, sy + dy - 2, 4, 0, TAU); c.fill(); }
    c.strokeStyle = '#666'; c.lineWidth = 1; c.beginPath(); c.moveTo(sx + 46, sy + 48); c.lineTo(sx + 46, sy + 30); c.stroke();
    c.fillStyle = '#e8323c'; c.beginPath(); c.moveTo(sx + 46, sy + 30); c.lineTo(sx + 56, sy + 34); c.lineTo(sx + 46, sy + 38); c.fill();
    c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.arc(sx + 103, sy + 86, 12, 0, TAU); c.fill();
    c.fillStyle = '#e8323c'; c.beginPath(); c.arc(sx + 100, sy + 82, 12, 0, TAU); c.fill();
    c.fillStyle = '#b81e28'; c.beginPath(); c.arc(sx + 100, sy + 82, 8.5, 0, TAU); c.fill();
    c.strokeStyle = '#ffd34d'; c.lineWidth = 1.5; c.beginPath(); c.arc(sx + 100, sy + 82, 13, 3.6, 5.8); c.stroke();
    c.save(); c.translate(sx + 96, sy + 32); c.rotate(0.7);
    c.fillStyle = '#3d95f5'; c.fillRect(-2, -16, 4, 22); c.beginPath(); c.ellipse(0, 10, 7, 9, 0, 0, TAU); c.fill(); c.restore();
    // Schaukel
    const kx = 300, ky = 1770;
    c.fillStyle = 'rgba(110,80,40,.35)'; c.beginPath(); c.ellipse(kx - 24, ky + 6, 14, 22, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(kx + 24, ky + 6, 14, 22, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(30,20,5,.3)'; c.lineWidth = 9; c.beginPath(); c.moveTo(kx - 66, ky + 10); c.lineTo(kx + 74, ky + 10); c.stroke();
    c.strokeStyle = '#3d7ad8'; c.lineWidth = 4;
    for (const ex of [-62, 62]) { c.beginPath(); c.moveTo(kx + ex, ky - 24); c.lineTo(kx + ex, ky); c.lineTo(kx + ex, ky + 24); c.stroke(); }
    c.strokeStyle = '#2a5ab8'; c.lineWidth = 7; c.beginPath(); c.moveTo(kx - 64, ky); c.lineTo(kx + 64, ky); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(kx - 60, ky - 2); c.lineTo(kx + 60, ky - 2); c.stroke();
    for (const ex of [-24, 24]) {
      c.strokeStyle = '#999'; c.lineWidth = 1; c.beginPath(); c.moveTo(kx + ex - 8, ky); c.lineTo(kx + ex - 8, ky + 6); c.moveTo(kx + ex + 8, ky); c.lineTo(kx + ex + 8, ky + 6); c.stroke();
      c.fillStyle = ex < 0 ? '#ff6b5a' : '#5fd068'; c.beginPath(); c.roundRect(kx + ex - 11, ky + 3, 22, 9, 3); c.fill();
    }
    // Wippe
    c.save(); c.translate(700, 2010); c.rotate(-0.3);
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(-46 + 5, -5 + 6, 92, 10);
    c.fillStyle = '#ff9f1c'; c.fillRect(-46, -5, 92, 10);
    c.fillStyle = '#e8323c'; c.fillRect(-48, -8, 10, 16); c.fillRect(38, -8, 10, 16);
    c.fillStyle = '#555'; c.beginPath(); c.arc(0, 0, 5, 0, TAU); c.fill();
    c.restore();
    // Bank
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(615, 1755, 90, 26);
    c.fillStyle = '#9a6030'; for (let k = 0; k < 4; k++) c.fillRect(610, 1748 + k * 6.5, 90, 5);
    c.fillStyle = '#555'; c.fillRect(616, 1746, 5, 26); c.fillRect(690, 1746, 5, 26);
  }

  // Das Haus der Menschen mit Fensterbrett (oben rechts) – im alten Maßstab gezeichnet und vergrößert
  c.save(); c.scale(1.5, 1.5);
  {
    const W0 = 2400, x0 = 1990, y1 = 330, dy = 192;
    let g = c.createLinearGradient(0, y1, 0, y1 + 40); g.addColorStop(0, 'rgba(20,30,10,.4)'); g.addColorStop(1, 'rgba(20,30,10,0)');
    c.fillStyle = g; c.fillRect(x0, y1, W0 - x0, 40);
    for (let x = x0 + 100; x < W0; x += 22) { if (x > 2085 && x < 2275) continue; c.fillStyle = '#3f8a34'; c.beginPath(); c.arc(x, y1 + 10, 11, 0, TAU); c.fill(); blume(c, x + 2, y1 + 6, 2.8, ['#ff5c8a', '#ffd34d', '#b07cff'][(x / 22) % 3 | 0]); }
    g = c.createLinearGradient(0, dy, 0, y1); g.addColorStop(0, '#e9d8b4'); g.addColorStop(1, '#f7ead0');
    c.fillStyle = g; c.fillRect(x0, dy, W0 - x0, y1 - dy);
    c.strokeStyle = 'rgba(160,130,90,.25)'; c.lineWidth = 1;
    for (let y = dy + 14; y < y1; y += 14) { c.beginPath(); c.moveTo(x0, y); c.lineTo(W0, y); c.stroke(); }
    c.fillStyle = 'rgba(120,90,50,.25)'; c.fillRect(x0, dy, 10, y1 - dy);
    g = c.createLinearGradient(0, 0, 0, dy); g.addColorStop(0, '#9a3424'); g.addColorStop(1, '#c4553a');
    c.fillStyle = g; c.fillRect(x0 - 12, 0, W0 - x0 + 12, dy);
    for (let r = 0, y = 4; y < dy; r++, y += 17) {
      for (let x = x0 - 12 + (r % 2) * 13; x < W0; x += 26) {
        c.fillStyle = (x * 7 + r * 3) % 5 < 1 ? '#b04a32' : '#cc5c40'; c.beginPath(); c.arc(x + 13, y + 6, 13, 0, Math.PI); c.fill();
        c.strokeStyle = 'rgba(80,20,10,.4)'; c.lineWidth = 1; c.stroke();
      }
    }
    c.fillStyle = '#6a2416'; c.fillRect(x0 - 14, dy - 6, W0 - x0 + 14, 10);
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x0 - 14, dy + 4, W0 - x0 + 14, 6);
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(2296, 52, 52, 46);
    c.fillStyle = '#9a4a3a'; c.fillRect(2288, 44, 50, 44);
    c.fillStyle = '#7a3428'; for (let y = 50; y < 88; y += 9) c.fillRect(2288, y, 50, 1.5);
    c.fillStyle = '#2a1a14'; c.fillRect(2296, 52, 34, 26);
    c.fillStyle = '#8a5a30'; c.beginPath(); c.roundRect(2018, 218, 58, y1 - 218, [26, 26, 0, 0]); c.fill();
    c.strokeStyle = '#5a3418'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = 'rgba(60,30,10,.45)'; c.lineWidth = 1.5; for (const x of [2032, 2047, 2062]) { c.beginPath(); c.moveTo(x, 232); c.lineTo(x, y1 - 4); c.stroke(); }
    c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(2066, 280, 3, 0, TAU); c.fill();
    c.fillStyle = '#bdb6a8'; c.fillRect(2010, y1, 74, 14); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(2010, y1, 74, 3);
    c.fillStyle = '#3f8a5a'; c.fillRect(2084, 204, 24, 78); c.fillRect(2252, 204, 24, 78);
    c.strokeStyle = '#2a6a40'; c.lineWidth = 1; for (const sx of [2084, 2252]) for (let y = 210; y < 280; y += 8) { c.beginPath(); c.moveTo(sx + 3, y); c.lineTo(sx + 21, y); c.stroke(); }
    c.fillStyle = '#ffffff'; c.fillRect(2108, 200, 144, 84);
    g = c.createLinearGradient(2112, 204, 2248, 280); g.addColorStop(0, '#bfe6ff'); g.addColorStop(1, '#6aaee0');
    c.fillStyle = g; c.fillRect(2114, 206, 132, 72);
    c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.moveTo(2120, 270); c.lineTo(2160, 210); c.lineTo(2176, 210); c.lineTo(2136, 270); c.fill();
    c.fillStyle = '#ffffff'; c.fillRect(2177, 206, 6, 72); c.fillRect(2114, 239, 132, 5);
    c.fillStyle = '#d8d4cc'; c.fillRect(2094, 280, 172, 16); c.fillStyle = '#a8a29a'; c.fillRect(2094, 293, 172, 5);
    c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(2094, 280, 172, 2);
  }
  c.restore();

  // Grashalme, Klee, Blumen, Steine
  c.lineCap = 'round';
  {
    const halme = [new Path2D(), new Path2D()];
    for (let i = 0; i < 34000; i++) {
      const x = rnd() * W, y = rnd() * H;
      if (!frei(x, y) && rnd() < 0.85) continue;
      const a = -Math.PI / 2 + (rnd() - 0.5) * 1.4, l = 3 + rnd() * 6, p = halme[rnd() < 0.55 ? 0 : 1];
      p.moveTo(x, y); p.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    }
    c.lineWidth = 1.3;
    c.strokeStyle = 'rgba(40,100,30,.32)'; c.stroke(halme[0]);
    c.strokeStyle = 'rgba(190,240,130,.28)'; c.stroke(halme[1]);
  }
  for (let i = 0; i < 360; i++) {
    const x = rnd() * W, y = rnd() * H;
    if (!frei(x, y)) continue;
    for (let k = 0; k < 3; k++) { c.fillStyle = 'rgba(60,140,50,.55)'; c.beginPath(); c.arc(x + Math.cos(k * 2.1) * 4, y + Math.sin(k * 2.1) * 4, 4, 0, TAU); c.fill(); }
  }
  const farben = ['#ff6b8b', '#ffd34d', '#ffffff', '#b07cff', '#5fb4ff', '#ff9f43'];
  for (let i = 0; i < 3200; i++) {
    let x, y;
    if (i < 900) { const a = rnd() * TAU, r = Math.sqrt(rnd()) * 270; x = 1290 + Math.cos(a) * r * 1.2; y = 840 + Math.sin(a) * r * 0.85; }
    else if (i < 1100) { const a = rnd() * TAU, r = Math.sqrt(rnd()) * 230; x = LICHT.x + Math.cos(a) * r; y = LICHT.y + Math.sin(a) * r; }
    else { x = rnd() * W; y = rnd() * H; if (rnd() < 0.4) continue; }
    if (!frei(x, y)) continue;
    blume(c, x, y, 1.8 + rnd() * 1.8, i < 1100 && i >= 900 && rnd() < 0.6 ? '#ffffff' : farben[(rnd() * farben.length) | 0]);
  }
  for (let i = 0; i < 90; i++) { const x = rnd() * W, y = rnd() * H; if (frei(x, y) && Math.hypot(x - HX, y - HY) > RR) stein(c, x, y, 4 + rnd() * 9, 3 + rnd() * 7, rnd()); }
  // Kleine Büsche
  const nahOrt = (x, y, d) => ORTE.some(o => Math.hypot(o.x - x, o.y - y) < d);
  for (let i = 0; i < 170; i++) {
    const x = rnd() * W, y = rnd() * H;
    if (!frei(x, y) || inWald(x, y, 1.15) || inEll(x, y, HEIDE, 1.1) || Math.hypot(x - HX, y - HY) < RR + 40 || nahOrt(x, y, 150)) continue;
    const r = 12 + rnd() * 12;
    c.fillStyle = 'rgba(12,40,14,.25)'; c.beginPath(); c.arc(x + r * 0.35, y + r * 0.45, r, 0, TAU); c.fill();
    for (let k = 0; k < 4; k++) { const a = rnd() * TAU, s = r * (0.5 + rnd() * 0.3); const gg = c.createRadialGradient(x + Math.cos(a) * r * 0.3 - s * 0.3, y + Math.sin(a) * r * 0.3 - s * 0.4, 1, x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, s); gg.addColorStop(0, '#78c860'); gg.addColorStop(1, '#2f6e2c'); c.fillStyle = gg; c.beginPath(); c.arc(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, s, 0, TAU); c.fill(); }
    if (rnd() < 0.4) for (let k = 0; k < 4; k++) { c.fillStyle = '#e8323c'; c.beginPath(); c.arc(x + (rnd() - 0.5) * r, y + (rnd() - 0.5) * r, 1.8, 0, TAU); c.fill(); }
    markiere(x, y, r);
  }

  // Bäume (zuerst alle Schatten, dann die Kronen von hinten nach vorn)
  const baeume = []; // [x, y, r, art]  art: 0 Laub, 1 Nadel, 2 Apfel, 3 Birke
  const ok = (x, y, r) => !baeume.some(b => Math.hypot(b[0] - x, b[1] - y) < (b[2] + r) * 0.62);
  const ortFrei = (x, y, r, m = 95) => !ALLE_ORTE.some(o => Math.hypot(o.x - x, o.y - y) < (o.id === 'heim' ? RR + 70 : lm(o).s * LS * 0.42 + m * 0.4) + r);
  // Wald
  for (let i = 0; i < 6000 && baeume.length < 520; i++) {
    const x = 2600 + rnd() * 1000, y = 520 + rnd() * 1500, r = 26 + rnd() * 28;
    if (!inWald(x, y) || y < HAUS.y1 + 60 || inEll(x, y, SAND, 1.05) || !ortFrei(x, y, r) || !ok(x, y, r)) continue;
    if (inEll(x, y, PILZ, 0.95) && rnd() < 0.6) continue;
    baeume.push([x, y, r, rnd() < 0.55 ? 1 : 0]);
  }
  // Baumring um die Lichtung (zum Heimatnest hin offen)
  for (let i = 0; i < 400; i++) {
    const a = rnd() * TAU, d = 215 + rnd() * 110, x = LICHT.x + Math.cos(a) * d, y = LICHT.y + Math.sin(a) * d, r = 28 + rnd() * 22;
    const zuHeim = Math.atan2(HY - LICHT.y, HX - LICHT.x);
    if (Math.abs(((a - zuHeim + Math.PI * 3) % TAU) - Math.PI) < 0.55) continue;
    if (!frei(x, y) || !ortFrei(x, y, r, 60) || Math.hypot(x - HX, y - HY) < RR + 80 || !ok(x, y, r)) continue;
    baeume.push([x, y, r, rnd() < 0.3 ? 1 : 0]);
  }
  // Obstwiese: Apfelbäume in lockeren Reihen
  for (let gy = OBST.y0 + 40; gy < OBST.y1; gy += 118) for (let gx = OBST.x0 + 40; gx < OBST.x1; gx += 128) {
    const x = gx + (rnd() - 0.5) * 40 + ((gy / 118) % 2) * 50, y = gy + (rnd() - 0.5) * 30, r = 30 + rnd() * 8;
    if (!frei(x, y) || !ortFrei(x, y, r, 30) || !ok(x, y, r)) continue;
    baeume.push([x, y, r, 2]);
  }
  // Birken & Wacholder in der Heide
  for (let i = 0; i < 300 && baeume.filter(b => b[3] === 3).length < 9; i++) {
    const x = HEIDE.x + (rnd() - 0.5) * HEIDE.rx * 1.8, y = HEIDE.y + (rnd() - 0.5) * HEIDE.ry * 1.8, r = 20 + rnd() * 12;
    if (!inEll(x, y, HEIDE, 0.92) || !ortFrei(x, y, r, 40) || !ok(x, y, r)) continue;
    baeume.push([x, y, r, rnd() < 0.65 ? 3 : 4]);
  }
  // Einzelbäume am Kartenrand und auf der Wiese
  const rand = (x, y) => x < 130 || y < 130 || y > H - 130 || x > W - 130;
  for (let i = 0; i < 5000 && baeume.length < 760; i++) {
    const x = rnd() * W, y = rnd() * H, r = 30 + rnd() * 32;
    if (!rand(x, y) && rnd() < 0.97) continue;
    if (!frei(x, y) || inWald(x, y, 1.05) || inEll(x, y, HEIDE, 1.1) || inEll(x, y, PILZ, 1.2) || Math.hypot(x - HX, y - HY) < RR + 110 || !ortFrei(x, y, r) || !ok(x, y, r)) continue;
    if (x > PLATZ.x0 - 40 && x < PLATZ.x1 + 40 && y > PLATZ.y0 - 40 && y < PLATZ.y1 + 40) continue;
    if (x > GARTEN.x0 - 50 && x < GARTEN.x1 + 50 && y > GARTEN.y0 - 50 && y < GARTEN.y1 + 50) continue;
    if (x > HAUS.x0 - 60 && y < HAUS.y1 + 80) continue;
    if (x < 480 && y < 450) continue; // Gewächshaus
    baeume.push([x, y, r, rnd() < 0.25 ? 1 : 0]);
  }
  for (const [x, y, r] of baeume) baumSchatten(c, x, y, r);
  baeume.sort((a, b) => a[1] - b[1]);
  for (const [x, y, r, art] of baeume) {
    if (art === 1) nadelBaum(c, rnd, x, y, r);
    else if (art === 2) apfelBaum(c, rnd, x, y, r, rnd() < 0.25 ? '#a8102a' : '#e8323c');
    else if (art === 3) birke(c, rnd, x, y, r);
    else if (art === 4) wacholder(c, rnd, x, y, r * 0.7);
    else laubBaum(c, rnd, x, y, r);
  }
  // Pilze im Pilzwald und am Waldrand
  for (let i = 0; i < 150; i++) {
    const a = rnd() * TAU, d = Math.sqrt(rnd()), x = PILZ.x + Math.cos(a) * PILZ.rx * d * 1.05, y = PILZ.y + Math.sin(a) * PILZ.ry * d * 1.05;
    if (Math.hypot(x - 3350, y - 1350) < 150 || baeume.some(b => Math.hypot(b[0] - x, b[1] - y) < b[2] * 0.85)) continue;
    const u = rnd();
    if (u < 0.3) fliegenpilz(c, x, y, 7 + rnd() * 9);
    else if (u < 0.5) steinpilz(c, x, y, 7 + rnd() * 8);
    else leuchtpilz(c, x, y, 3 + rnd() * 3, rnd() < 0.5 ? ['#c8fff6', '#4fd8c8', '#1f8a8a'] : ['#ffe0ff', '#c88aff', '#7a3ac8']);
  }
  for (let i = 0; i < 30; i++) { const x = 2700 + rnd() * 900, y = 700 + rnd() * 1200; if (inWald(x, y, 1.12) && !inWald(x, y, 0.92)) fliegenpilz(c, x, y, 4 + rnd() * 3); }
  return cv;
}

// Leuchtpilze (Welt-Koordinaten) – leuchten nachts, tagsüber nur zart
const LEUCHT = (() => {
  const o = ORTE.find(x => x.id === 'pilzwald') ?? { x: 3350, y: 1350 };
  const out = [];
  for (const [x, y] of [[0, 4], [-74, 6], [52, 66], [-10, 70], [76, -70], [-20, -76]]) out.push([o.x + x * LS, o.y + y * LS, ((x + y) & 1) ? '200,140,255' : '120,255,230']);
  const r = mulberry32(99);
  for (let i = 0; i < 14; i++) { const a = r() * TAU, d = 0.5 + r() * 0.5; out.push([PILZ.x + Math.cos(a) * PILZ.rx * d, PILZ.y + Math.sin(a) * PILZ.ry * d, i % 2 ? '200,140,255' : '120,255,230']); }
  return out;
})();
const FELS_ORT = ORTE.find(x => x.id === 'felsen') ?? { x: 3350, y: 2200 };

// ---------- Routen-Geometrie ----------
const geoCache = new Map();
function hash(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
/** Gekrümmte Linie zwischen zwei Kolonien (Straßen leicht, Botenlinien stärker und auf der anderen Seite gebogen). */
function routeGeo(art, a, b) {
  const [x, y] = a < b ? [a, b] : [b, a];
  const key = `${art}|${x}|${y}`;
  let g = geoCache.get(key);
  if (g) return g;
  const [ax, ay] = posVon(x), [bx, by] = posVon(y);
  const len0 = Math.hypot(bx - ax, by - ay) || 1;
  const nx = -(by - ay) / len0, ny = (bx - ax) / len0;
  const sd = (hash(x + y) & 1 ? 1 : -1) * (art === 'boten' ? -1 : 1);
  const k = (art === 'boten' ? 0.16 : 0.08) * len0 * sd;
  const cx = (ax + bx) / 2 + nx * k, cy = (ay + by) / 2 + ny * k;
  const N = Math.max(8, Math.ceil(len0 / 12));
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, w = Math.sin(t * Math.PI * 3 + hash(key) % 7) * Math.min(14, len0 * 0.012) * (art === 'strasse' ? 1 : 0);
    let px = (1 - t) ** 2 * ax + 2 * (1 - t) * t * cx + t * t * bx, py = (1 - t) ** 2 * ay + 2 * (1 - t) * t * cy + t * t * by;
    px += nx * w; py += ny * w;
    pts.push([px, py]);
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  g = { a: x, b: y, pts, cum, len: cum[cum.length - 1], path: pathOf(pts), minX: Math.min(ax, bx, cx) - 40, maxX: Math.max(ax, bx, cx) + 40, minY: Math.min(ay, by, cy) - 40, maxY: Math.max(ay, by, cy) + 40 };
  geoCache.set(key, g);
  return g;
}
/** Punkt bei Anteil u (0 = a, 1 = b) mit seitlichem Versatz; gibt [x, y, Winkel] */
function geoAt(g, u, lane = 0) {
  const n = g.pts.length - 1, f = clamp(u, 0, 1) * n, i = Math.min(n - 1, Math.floor(f)), t = f - i;
  const [x0, y0] = g.pts[i], [x1, y1] = g.pts[i + 1];
  const ang = Math.atan2(y1 - y0, x1 - x0);
  return [x0 + (x1 - x0) * t - Math.sin(ang) * lane, y0 + (y1 - y0) * t + Math.cos(ang) * lane, ang];
}
function teilPfad(g, von, bis) {
  const p = new Path2D(), n = g.pts.length - 1;
  const [sx, sy] = geoAt(g, von); p.moveTo(sx, sy);
  for (let i = Math.ceil(von * n); i <= Math.floor(bis * n); i++) p.lineTo(g.pts[i][0], g.pts[i][1]);
  const [ex, ey] = geoAt(g, bis); p.lineTo(ex, ey);
  return p;
}
/** Steinchen am Rand einer gepflasterten Straße (einmal pro Route berechnet) */
function steine(g, w) {
  if (g.steine?.w === w) return g.steine.l;
  const r = mulberry32(g.pts.length * 13 + (g.a.length << 4)), l = [];
  for (let d = 4; d < g.len - 4; d += 7) for (const sd of [-1, 1]) {
    const [x, y] = geoAt(g, d / g.len, sd * (w / 2 - 1.5 + (r() - 0.5) * 1.5));
    l.push([x, y, 1.6 + r() * 1.4, (r() * 3) | 0]);
  }
  g.steine = { w, l };
  return l;
}
function strasseZeichnen(c, g, stufe, path = g.path) {
  if (stufe <= 1) {
    c.strokeStyle = 'rgba(70,45,10,.25)'; c.lineWidth = 15; c.stroke(path);
    c.strokeStyle = 'rgba(196,158,96,.92)'; c.lineWidth = 10; c.stroke(path);
    c.setLineDash([3, 9]); c.strokeStyle = 'rgba(120,80,30,.45)'; c.lineWidth = 2.4; c.stroke(path); c.setLineDash([]);
    return;
  }
  const w = stufe === 2 ? 14 : 18;
  if (stufe >= 3) { c.strokeStyle = 'rgba(140,255,225,.22)'; c.lineWidth = 36; c.stroke(path); c.strokeStyle = 'rgba(140,255,225,.25)'; c.lineWidth = 26; c.stroke(path); }
  c.strokeStyle = 'rgba(50,30,5,.35)'; c.lineWidth = w + 6; c.stroke(path);
  c.strokeStyle = stufe >= 3 ? '#6a5a44' : '#8a6a3c'; c.lineWidth = w + 3; c.stroke(path);
  c.strokeStyle = stufe >= 3 ? '#f4e8c4' : '#e6d29e'; c.lineWidth = w; c.stroke(path);
  if (path === g.path) {
    const cols = ['#b8b0a4', '#e8e2d6', '#9a8a70'];
    for (const [x, y, r, k] of steine(g, w)) { c.fillStyle = cols[k]; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  }
  c.setLineDash(stufe >= 3 ? [10, 8] : [6, 10]);
  c.strokeStyle = stufe >= 3 ? 'rgba(90,230,210,.95)' : 'rgba(255,255,255,.6)'; c.lineWidth = stufe >= 3 ? 2.6 : 1.8; c.stroke(path);
  c.setLineDash([]);
}

// ---------- Renderer ----------
export class WeltRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cam = { x: 0, y: 0, z: 0.6 };
    this.t = 0;
    this.hover = null;         // ORT unter dem Zeiger (auch das Heimatnest)
    this.selected = null;      // ORT-id ('heim' = Heimatnest)
    this.flugBereit = false;   // geflügelte Prinzessin kreist ums Nest
    this.vorschauRoute = null; // { art: 'strasse'|'boten', a, b } – Vorschau einer geplanten Verbindung
    this.maxDpr = 1.5;
    this.cache = null;
    this.cacheKey = '';
    this.regenA = 0;
    this.regen = [];
    this.kListe = [];
    this.flussListe = [];
    this.listeT = -1;
    this.besuchP = new Map();
    for (let i = 0; i < 160; i++) this.regen.push([Math.random(), Math.random(), 0.6 + Math.random() * 0.8]);
    document.fonts?.ready?.then(() => { this.cacheKey = ''; });
  }

  get vw() { return this.canvas.clientWidth || window.innerWidth; }
  get vh() { return this.canvas.clientHeight || window.innerHeight; }

  setState(state) {
    this.state = state;
    if (!this.base) this.base = makeBase();
    this.cacheKey = '';
    this.listeT = -1;
    this.focusNest();
  }

  focusNest() {
    this.cam.z = Math.max(this.vw / W, this.vh / H) * 1.06;
    this.centerOn(HX, HY);
  }
  centerOn(wx, wy) { this.cam.x = wx - this.vw / 2 / this.cam.z; this.cam.y = wy - this.vh / 2 / this.cam.z; this.clampCam(); }
  clampCam() {
    const minZ = Math.max(this.vw / W, this.vh / H, 0.12);
    this.cam.z = clamp(this.cam.z, minZ, Math.max(minZ, 2));
    const vw = this.vw / this.cam.z, vh = this.vh / this.cam.z;
    this.cam.x = clamp(this.cam.x, 0, Math.max(0, W - vw));
    this.cam.y = clamp(this.cam.y, 0, Math.max(0, H - vh));
  }
  zoomAt(sx, sy, f) {
    const b = this.screenToWorld(sx, sy);
    this.cam.z *= f; this.clampCam();
    const a = this.screenToWorld(sx, sy);
    this.cam.x += b[0] - a[0]; this.cam.y += b[1] - a[1]; this.clampCam();
  }
  pan(dx, dy) { this.cam.x -= dx / this.cam.z; this.cam.y -= dy / this.cam.z; this.clampCam(); }
  screenToWorld(sx, sy) { return [sx / this.cam.z + this.cam.x, sy / this.cam.z + this.cam.y]; }
  worldToScreen(wx, wy) { return [(wx - this.cam.x) * this.cam.z, (wy - this.cam.y) * this.cam.z]; }
  cellAt(sx, sy) { return this.screenToWorld(sx, sy); }
  nestScreen() { return this.worldToScreen(HX, HY); }

  /** Größe der Beschriftungen (Bildschirm-Pixel-Faktor) */
  get ui() { return clamp(0.8 + this.cam.z * 0.3, 0.86, 1.2); }
  badgePos(o) {
    const [sx, sy] = this.worldToScreen(o.x, o.y);
    return [sx, sy - lm(o).top * LS * this.cam.z - 24 * this.ui];
  }

  /** Ort unter dem Zeiger (großzügige Trefferzone: Wahrzeichen, Plakette, Hügel oder Namensschild) */
  ortAt(sx, sy) {
    let best = null, bd = Infinity;
    const z = this.cam.z;
    for (const o of ALLE_ORTE) {
      const heim = o.id === 'heim';
      const r = Math.max(34, (heim ? 86 : lm(o).s * LS * 0.36) * z);
      const [ox, oy] = this.worldToScreen(o.x, o.y);
      let d = Math.hypot(ox - sx, oy - sy) / r;
      if (!heim) { const [bx, by] = this.badgePos(o); d = Math.min(d, Math.hypot(bx - sx, by - sy) / (26 * this.ui)); }
      const [lx, ly] = this.worldToScreen(o.x, o.y + lm(o).bot * LS + (heim ? 10 : 0));
      if (Math.abs(lx - sx) < 70 * this.ui && sy > ly && sy < ly + 36 * this.ui) d = Math.min(d, 0.9);
      if (d < 1 && d < bd) { bd = d; best = o; }
    }
    return best;
  }

  /** Kolonien-Übersicht (gepuffert, alle 0,5 s neu) */
  aktualisiereListe(d) {
    const st = this.state;
    if (this.t - this.listeT < 0.5 && this.listeT >= 0) return;
    this.listeT = this.t;
    const dd = d && d.pop != null ? d : null;
    try { this.kListe = kolonieListe(st, dd); } catch { this.kListe = kolonieIds(st).map(id => ({ id, pop: 10, x: ortById(id)?.x ?? HX, y: ortById(id)?.y ?? HY, biom: ortById(id)?.biom ?? 'heim', aktiv: id === aktiveId(st) })); }
    try { this.flussListe = fluesse(st, dd); } catch { this.flussListe = []; }
    for (const k of this.kListe) k.R = hugelR(k.pop, k.id === 'heim');
  }

  staticSig() {
    const W0 = this.state.welt ?? {};
    const hg = this.kListe.map(k => `${k.id}:${k.R}`).join(',');
    const rs = (W0.strassen ?? []).map(r => `${r.id}:${(r.bau ?? 1) >= 1 ? r.stufe : r.stufe - 1}`).join(',');
    return hg + '|' + rs;
  }

  staticLayer() {
    const cw = this.canvas.width, ch = this.canvas.height;
    if (!this.cache || this.cache.width !== cw || this.cache.height !== ch) {
      this.cache = document.createElement('canvas'); this.cache.width = cw; this.cache.height = ch; this.cacheKey = '';
    }
    const key = `${this.cam.x.toFixed(2)}|${this.cam.y.toFixed(2)}|${this.cam.z.toFixed(4)}|${this.staticSig()}`;
    if (key === this.cacheKey) return this.cache;
    this.cacheKey = key;
    const c = this.cache.getContext('2d');
    const z = this.cam.z, k = cw / this.vw;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#3d6e2c'; c.fillRect(0, 0, cw, ch);
    c.setTransform(k * z, 0, 0, k * z, -this.cam.x * z * k, -this.cam.y * z * k);
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    const x0 = clamp(Math.floor(this.cam.x), 0, W), y0 = clamp(Math.floor(this.cam.y), 0, H);
    const x1 = clamp(Math.ceil(this.cam.x + this.vw / z), 0, W), y1 = clamp(Math.ceil(this.cam.y + this.vh / z), 0, H);
    if (x1 > x0 && y1 > y0) c.drawImage(this.base, x0 * BS, y0 * BS, (x1 - x0) * BS, (y1 - y0) * BS, x0, y0, x1 - x0, y1 - y0);
    const sicht = (ax, ay, bx, by) => bx > x0 && ax < x1 && by > y0 && ay < y1;
    // Unser Revier: leuchtender Kreis
    const g = c.createRadialGradient(HX, HY, RR * 0.55, HX, HY, RR);
    g.addColorStop(0, 'rgba(255,240,170,0)'); g.addColorStop(0.85, 'rgba(255,236,150,.16)'); g.addColorStop(1, 'rgba(255,236,150,.32)');
    c.fillStyle = g; c.beginPath(); c.arc(HX, HY, RR, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,240,170,.28)'; c.lineWidth = 12; c.stroke();
    c.strokeStyle = 'rgba(255,244,190,.9)'; c.lineWidth = 2.5; c.setLineDash([10, 9]); c.stroke(); c.setLineDash([]);
    // Fertige Ameisenstraßen (unter den Wahrzeichen)
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const r of this.state.welt?.strassen ?? []) {
      const stufe = (r.bau ?? 1) >= 1 ? r.stufe : r.stufe - 1;
      if (stufe < 1) continue;
      const geo = routeGeo('strasse', r.a, r.b);
      if (sicht(geo.minX, geo.minY, geo.maxX, geo.maxY)) strasseZeichnen(c, geo, stufe);
    }
    // Wahrzeichen
    for (const o of ORTE) {
      const S = lm(o).s * LS;
      if (!sicht(o.x - S / 2, o.y - S / 2, o.x + S / 2, o.y + S / 2)) continue;
      c.drawImage(wahrzeichen(o.biom), o.x - S / 2, o.y - S / 2, S, S);
    }
    // Ameisenhügel aller Kolonien – ihr Aussehen verrät die Gegend
    for (const kol of this.kListe) {
      const o = ortById(kol.id) ?? { id: 'heim' }, [kx, ky] = kolPos(o), R = kol.R;
      const spr = hugelSprite(kol.id === 'heim' ? 'heim' : o.biom, R), S = spr.width / 2.5;
      c.drawImage(spr, kx - S * 0.47, ky - S * 0.47, S, S);
    }
    // „Unser Revier" als Bogenschrift
    c.setTransform(k, 0, 0, k, 0, 0);
    const u = this.ui, fs = 14 * u;
    c.font = `700 ${fs}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const txt = 'Unser Revier', [cx, cy] = this.worldToScreen(HX, HY), rad = RR * z + fs * 0.9;
    const breite = [...txt].map(ch => c.measureText(ch).width + 1.2 * u), ges = breite.reduce((a, b) => a + b, 0);
    let a = -Math.PI / 2 - ges / rad / 2;
    c.lineJoin = 'round';
    [...txt].forEach((ch, i) => {
      const m = a + breite[i] / rad / 2;
      c.save(); c.translate(cx + Math.cos(m) * rad, cy + Math.sin(m) * rad); c.rotate(m + Math.PI / 2);
      c.strokeStyle = 'rgba(70,45,10,.75)'; c.lineWidth = 4 * u; c.strokeText(ch, 0, 0);
      c.fillStyle = '#fff3c0'; c.fillText(ch, 0, 0);
      c.restore();
      a += breite[i] / rad;
    });
    return this.cache;
  }

  // ---------- Pro Bild ----------
  frame(dt, d = {}) {
    const st = this.state;
    if (!st) return;
    this.t += dt;
    this.aktualisiereListe(d);
    const t = this.t, ctx = this.ctx;
    const dpr = this.canvas.width / this.vw, z = this.cam.z;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.staticLayer(), 0, 0);
    const welt = () => ctx.setTransform(dpr * z, 0, 0, dpr * z, -this.cam.x * z * dpr, -this.cam.y * z * dpr);
    welt();
    const view = { x0: this.cam.x - 80, y0: this.cam.y - 80, x1: this.cam.x + this.vw / z + 80, y1: this.cam.y + this.vh / z + 80 };
    const inView = (x, y, m = 0) => x > view.x0 - m && x < view.x1 + m && y > view.y0 - m && y < view.y1 + m;
    const geoSicht = g => g.maxX > view.x0 && g.minX < view.x1 && g.maxY > view.y0 && g.minY < view.y1;
    const ph = d?.tagPhase ?? 0.3;
    const night = ph > 0.7 ? clamp((ph - 0.7) / 0.08, 0, 1) * (ph > 0.96 ? clamp((1 - ph) / 0.04, 0, 1) : 1) : ph < 0.04 ? 0.3 * (1 - ph / 0.04) : 0;
    const dusk = ph > 0.6 && ph < 0.74 ? Math.sin(((ph - 0.6) / 0.14) * Math.PI) : 0;
    const W0 = st.welt ?? {};
    const f = i => Math.floor(t * 10 + i) % 4;
    const fern = z < 0.5; // weit herausgezoomt: Kleinigkeiten etwas größer zeichnen
    this.markierungen = [];

    // Wasser fließt & glitzert
    ctx.lineCap = 'round';
    ctx.setLineDash([5, 26]);
    for (const [P, sp] of [[BACH_P, 34], [STROM_P, 30], [ABFLUSS_P, 26]]) {
      ctx.strokeStyle = 'rgba(220,245,255,.38)'; ctx.lineWidth = 2.2; ctx.lineDashOffset = -t * sp; ctx.stroke(P);
      ctx.lineDashOffset = -t * sp * 0.75 + 13; ctx.strokeStyle = 'rgba(220,245,255,.2)';
      ctx.save(); ctx.translate(5, 6); ctx.stroke(P); ctx.restore();
    }
    ctx.setLineDash([]);
    ctx.globalCompositeOperation = 'lighter';
    for (const P of [BACH, STROM]) for (let i = 4; i < P.length; i += 9) {
      const [x, y] = P[i];
      if (!inView(x, y)) continue;
      const s = Math.sin(t * 2.6 + i * 1.37);
      if (s > 0.55) drawGlow(ctx, '255,255,255', x + Math.sin(i) * 8, y + Math.cos(i * 1.3) * 6, 5 + (s - 0.55) * 14, (s - 0.55) * 1.6);
    }
    if (inView(TEICH.x, TEICH.y, TEICH.rx)) for (let i = 0; i < 9; i++) {
      const s = Math.sin(t * 2.1 + i * 2.3);
      if (s > 0.5) drawGlow(ctx, '255,255,255', TEICH.x + Math.cos(i * 2.4) * TEICH.rx * 0.7, TEICH.y + Math.sin(i * 1.9) * TEICH.ry * 0.6, 6 + (s - 0.5) * 14, (s - 0.5) * 1.6);
    }
    ctx.globalCompositeOperation = 'source-over';
    // Wasserfall rauscht
    if (inView(FELS_ORT.x, FELS_ORT.y, 200)) {
      const wx = FELS_ORT.x, wy = FELS_ORT.y;
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2.2; ctx.setLineDash([8, 14]);
      for (let k = -2; k <= 2; k++) { ctx.lineDashOffset = -t * 90 - k * 7; ctx.beginPath(); ctx.moveTo(wx + k * 5 * LS, wy - 98 * LS); ctx.lineTo(wx + k * 6.5 * LS, wy + 42 * LS); ctx.stroke(); }
      ctx.setLineDash([]);
      for (let i = 0; i < 7; i++) { const p = (t * 0.9 + i / 7) % 1; drawGlow(ctx, '255,255,255', wx + (i - 3) * 9, wy + 52 * LS + p * 10, 8 + p * 14, 0.7 * (1 - p)); }
    }
    // Sonnenflecken auf der Lichtung
    if (night < 0.5) drawGlow(ctx, '255,244,170', LICHT.x + Math.sin(t * 0.4) * 10, LICHT.y + Math.cos(t * 0.3) * 8, 170, (0.16 + 0.05 * Math.sin(t * 1.3)) * (1 - night * 2));

    // ---------- Verbindungen: Straßen im Bau, Duft-Autobahn-Licht, Botenlinien ----------
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const selId = this.selected;
    for (const r of W0.strassen ?? []) {
      const g = routeGeo('strasse', r.a, r.b);
      if (!geoSicht(g)) continue;
      const fertig = (r.bau ?? 1) >= 1, vorwaerts = r.a === g.a;
      const hl = selId && (r.a === selId || r.b === selId);
      if (hl) { ctx.strokeStyle = `rgba(255,236,150,${0.3 + 0.15 * Math.sin(t * 3)})`; ctx.lineWidth = 34; ctx.stroke(g.path); }
      if (!fertig) {
        const p = clamp(r.bau ?? 0, 0, 1);
        const von = vorwaerts ? 0 : 1 - p, bis = vorwaerts ? p : 1;
        if (r.stufe <= 1) {
          ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t * 8;
          ctx.strokeStyle = 'rgba(70,45,10,.4)'; ctx.lineWidth = 15; ctx.stroke(g.path);
          ctx.strokeStyle = 'rgba(255,246,214,.8)'; ctx.lineWidth = 10; ctx.stroke(g.path);
          ctx.setLineDash([]);
        }
        if (p > 0.005) strasseZeichnen(ctx, g, r.stufe, teilPfad(g, von, bis));
        const [hx, hy, ang] = geoAt(g, vorwaerts ? p : 1 - p);
        for (let i = 0; i < 4; i++) drawAnt(ctx, hx + Math.cos(t * 2 + i * 1.6) * 12, hy + Math.sin(t * 2 + i * 1.6) * 9, ang + t * 2 + i, f(i), fern ? 1.6 : 1.2);
        this.markierungen.push({ x: hx, y: hy, text: `🚧 ${Math.round(p * 100)} %`, art: 'bau' });
        continue;
      }
      // Ameisen-Ströme (beide Richtungen, eigene Spuren)
      const L = g.len, n = Math.min(16, Math.round(L / 110 * (0.6 + 0.4 * r.stufe)) + 2);
      const v = 26 * (1 + 0.35 * (r.stufe - 1));
      for (let i = 0; i < n; i++) {
        const dir = i % 2 ? 1 : -1;
        let u = ((t * v) / L + i / n + (i % 3) * 0.07) % 1; if (dir < 0) u = 1 - u;
        const [ax, ay, ang] = geoAt(g, u, dir * (r.stufe >= 2 ? 4 : 2.5));
        if (!inView(ax, ay)) continue;
        drawAnt(ctx, ax, ay, ang + (dir < 0 ? Math.PI : 0), f(i), fern ? 1.5 : 1.05);
      }
      if (r.stufe >= 3) {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) { const [x, y] = geoAt(g, ((t * 0.12) + i / 4) % 1); if (inView(x, y)) drawGlow(ctx, '120,255,230', x, y, 22, 0.55); }
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    // Waren fließen über die Straßen (🍯 wird von Ameisen getragen)
    for (const fl of this.flussListe) {
      if (!fl.ware) continue;
      const g = routeGeo('strasse', fl.a, fl.b);
      if (!geoSicht(g)) continue;
      const vorwaerts = fl.ware.von === g.a;
      for (let k = 0; k < 3; k++) {
        let u = ((t * 30) / g.len + k / 3) % 1; if (!vorwaerts) u = 1 - u;
        const [x, y, ang] = geoAt(g, u, vorwaerts ? 4 : -4);
        if (!inView(x, y)) continue;
        drawAnt(ctx, x, y, ang + (vorwaerts ? 0 : Math.PI), f(k), fern ? 1.6 : 1.2);
        drawEmoji(ctx, fl.ware.icon ?? '🍯', x, y - 3, Math.max(14, 11 / z));
      }
    }
    // Botenlinien: zart leuchtende, gepunktete Duftspuren mit bunten Duftteilchen
    const DUFT = ['255,140,200', '190,140,255', '120,230,255', '255,220,120'];
    for (const r of W0.boten ?? []) {
      const g = routeGeo('boten', r.a, r.b);
      if (!geoSicht(g)) continue;
      const fertig = (r.bau ?? 1) >= 1, p = fertig ? 1 : clamp(r.bau ?? 0, 0, 1), vorwaerts = r.a === g.a;
      const path = fertig ? g.path : teilPfad(g, vorwaerts ? 0 : 1 - p, vorwaerts ? p : 1);
      const hl = selId && (r.a === selId || r.b === selId);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(200,150,255,${(fertig ? 0.16 : 0.08) + (hl ? 0.14 : 0) + 0.04 * Math.sin(t * 2 + r.id)})`; ctx.lineWidth = fern ? 26 : 18; ctx.stroke(path);
      ctx.globalCompositeOperation = 'source-over';
      if (!fertig) { ctx.setLineDash([2, 12]); ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 3; ctx.stroke(g.path); }
      ctx.setLineDash([0.5, fern ? 18 : 13]); ctx.lineDashOffset = -t * 22;
      ctx.strokeStyle = fertig ? 'rgba(244,228,255,.95)' : 'rgba(230,210,255,.8)'; ctx.lineWidth = fern ? 8 : 5.5; ctx.stroke(path);
      ctx.setLineDash([]);
      if (fertig) {
        ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 6; k++) {
          const u = ((t * 0.05 * (k % 2 ? 1 : -1) + k / 6) % 1 + 1) % 1, [x, y] = geoAt(g, u, Math.sin(t * 1.7 + k * 2) * 12);
          if (inView(x, y)) drawGlow(ctx, DUFT[k % 4], x, y, fern ? 22 : 15, 0.55 + 0.25 * Math.sin(t * 3 + k));
        }
        ctx.globalCompositeOperation = 'source-over';
        // Botin mit Briefchen
        const u = ((t * 40) / g.len + r.id * 0.37) % 1, [bx, by, ang] = geoAt(g, u);
        if (inView(bx, by)) { drawAnt(ctx, bx, by, ang, f(r.id), fern ? 1.6 : 1.2); drawEmoji(ctx, '✉️', bx, by - 4, Math.max(11, 9 / z)); }
      } else {
        const [hx, hy] = geoAt(g, vorwaerts ? p : 1 - p);
        this.markierungen.push({ x: hx, y: hy, text: `📨 ${Math.round(p * 100)} %`, art: 'boten' });
      }
    }
    // Gäste auf Reisen (kleine Ameisen mit dem Symbol ihres Besuchs)
    const strassen = W0.strassen ?? [];
    const gesehen = new Set();
    for (const b of W0.besuche ?? []) {
      const r = strassen.find(x => x.id === b.route) ?? { a: b.von, b: b.nach };
      const g = routeGeo('strasse', r.a, r.b);
      gesehen.add(b.id);
      // weich nachführen: zwischen den Spiel-Ticks mit der Reisegeschwindigkeit weiterlaufen
      let p = this.besuchP.get(b.id) ?? b.p;
      p += dt / Math.max(1, b.dauer ?? 20);
      if (Math.abs(p - b.p) > 0.04) p = b.p + (p - b.p) * 0.5;
      p = clamp(p, 0, 1);
      this.besuchP.set(b.id, p);
      const u = b.von === g.a ? p : 1 - p;
      const [x, y, ang] = geoAt(g, u, b.von === g.a ? 6 : -6);
      if (!inView(x, y)) continue;
      const B = BESUCHE[b.art] ?? { icon: '🐜', farbe: '#ffffff' };
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, hexRgb(B.farbe), x, y, fern ? 30 : 20, 0.7);
      ctx.globalCompositeOperation = 'source-over';
      drawAnt(ctx, x, y, ang + (b.von === g.a ? 0 : Math.PI), f(b.id), fern ? 2 : 1.5);
      this.markierungen.push({ x, y, icon: B.icon, farbe: B.farbe, art: 'gast' });
    }
    for (const id of this.besuchP.keys()) if (!gesehen.has(id)) this.besuchP.delete(id);

    // Vorschau einer geplanten Verbindung
    const vr = this.vorschauRoute;
    if (vr && vr.a && vr.b && vr.a !== vr.b) {
      const g = routeGeo(vr.art === 'boten' ? 'boten' : 'strasse', vr.a, vr.b);
      const col = vr.art === 'boten' ? '200,150,255' : '255,190,60';
      ctx.strokeStyle = `rgba(${col},.35)`; ctx.lineWidth = fern ? 34 : 24; ctx.stroke(g.path);
      ctx.setLineDash([14, 12]); ctx.lineDashOffset = -t * 40;
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = fern ? 9 : 6; ctx.stroke(g.path);
      ctx.setLineDash([]);
      for (const id of [vr.a, vr.b]) {
        const [x, y] = posVon(id), p = (t * 1.2) % 1;
        ctx.strokeStyle = `rgba(${col},${0.9 * (1 - p)})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, 40 + p * 50, 0, TAU); ctx.stroke();
      }
      const [mx, my] = geoAt(g, 0.5);
      this.markierungen.push({ x: mx, y: my, text: vr.art === 'boten' ? (vr.vorhanden ? '📨 Botenlinie' : '📨 Neue Botenlinie') : (vr.vorhanden ? '🛣️ Ameisenstraße' : '🛣️ Neue Ameisenstraße'), art: 'vorschau', farbe: vr.art === 'boten' ? '#7a4ad8' : '#d07a00' });
    }

    // Flugroute zum gewählten / überfahrenen (noch freien) Ort
    const frei = o => o && o.id !== 'heim' && !this.kListe.some(k => k.id === o.id);
    const sel = ALLE_ORTE.find(o => o.id === this.selected) ?? null;
    const routen = [];
    if (frei(sel)) routen.push([sel, 1]);
    if (frei(this.hover) && this.hover !== sel) routen.push([this.hover, 0.6]);
    this.routeLabels = [];
    for (const [o, a] of routen) {
      const mx = (HX + o.x) / 2, my = (HY + o.y) / 2, len = Math.hypot(o.x - HX, o.y - HY);
      let nx = -(o.y - HY) / len, ny = (o.x - HX) / len;
      if (ny > 0) { nx = -nx; ny = -ny; }
      const cx = mx + nx * len * 0.22, cy = my + ny * len * 0.22;
      ctx.strokeStyle = `rgba(30,20,0,${0.22 * a})`; ctx.lineWidth = fern ? 8 : 5;
      ctx.setLineDash([2, 13]); ctx.lineDashOffset = -t * 30;
      ctx.beginPath(); ctx.moveTo(HX + 4, HY + 6); ctx.quadraticCurveTo(cx + 4, cy + 6, o.x + 4, o.y + 6); ctx.stroke();
      ctx.strokeStyle = `rgba(255,248,215,${0.95 * a})`; ctx.lineWidth = fern ? 7 : 4.5;
      ctx.beginPath(); ctx.moveTo(HX, HY); ctx.quadraticCurveTo(cx, cy, o.x, o.y); ctx.stroke();
      ctx.setLineDash([]);
      const u = ((t * 0.18) % 1);
      const px = (1 - u) ** 2 * HX + 2 * (1 - u) * u * cx + u * u * o.x, py = (1 - u) ** 2 * HY + 2 * (1 - u) * u * cy + u * u * o.y;
      const ang = Math.atan2(2 * (1 - u) * (cy - HY) + 2 * u * (o.y - cy), 2 * (1 - u) * (cx - HX) + 2 * u * (o.x - cx));
      if (a === 1) this.drawFlieger(ctx, px, py, ang, t, fern ? 2 : 1.3, Math.sin(u * Math.PI));
      this.routeLabels.push([o, 0.49 * HX + 0.42 * cx + 0.09 * o.x, 0.49 * HY + 0.42 * cy + 0.09 * o.y, a]);
    }

    // Ausgewählter Ort: pulsierender Ring
    const ring = o => (o.id === 'heim' ? 90 : lm(o).s * LS * 0.38);
    if (sel) {
      const p = (t * 0.8) % 1, R0 = ring(sel);
      ctx.strokeStyle = `rgba(255,214,90,${0.75 + 0.25 * Math.sin(t * 4)})`; ctx.lineWidth = fern ? 6 : 4;
      ctx.setLineDash([12, 8]); ctx.lineDashOffset = -t * 14;
      ctx.beginPath(); ctx.arc(sel.x, sel.y, R0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = `rgba(255,236,150,${0.7 * (1 - p)})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sel.x, sel.y, R0 + p * 50, 0, TAU); ctx.stroke();
    } else if (this.hover) {
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = fern ? 5 : 3;
      ctx.beginPath(); ctx.arc(this.hover.x, this.hover.y, ring(this.hover), 0, TAU); ctx.stroke();
    }

    // Wimmelnde Ameisen um jede Kolonie + Fahnen
    const kolonien = W0.kolonien ?? [];
    for (const kol of this.kListe) {
      const heim = kol.id === 'heim', o = ortById(kol.id) ?? { id: 'heim' }, [kx, ky] = kolPos(o), R = kol.R;
      if (!inView(kx, ky, R + 80)) continue;
      const anz = heim ? 18 : 4 + Math.round(R / 7);
      if (heim) {
        for (let i = 0; i < anz; i++) {
          const a0 = i * 2.39996, v = 0.08 + (i % 5) * 0.012;
          let u = (t * v + i * 0.37) % 2; const zurueck = u > 1; if (zurueck) u = 2 - u;
          const r = R + 6 + u * (RR - R - 22), a = a0 + Math.sin(u * 3 + i) * 0.12;
          drawAnt(ctx, HX + Math.cos(a) * r, HY + Math.sin(a) * r, a + (zurueck ? Math.PI : 0), f(i));
        }
      }
      for (let i = 0; i < (heim ? 8 : anz); i++) {
        const dir = i % 2 ? 1 : -1, vv = (0.5 + (i % 3) * 0.15) * dir;
        const a = t * vv * (14 / (R + 10)) + (i / anz) * TAU, r = R + 6 + (i % 3) * 6 + Math.sin(t * 0.7 + i) * 3;
        drawAnt(ctx, kx + Math.cos(a) * r, ky + Math.sin(a) * r, a + (dir > 0 ? Math.PI / 2 : -Math.PI / 2), f(i), 0.95);
      }
      if (heim) this.drawFlagge(ctx, HX + 8, HY - 10, '#e8323c', t, 1.15 * (R / 58), true);
      else { const ki = kolonien.findIndex(k => k.ort === kol.id); this.drawFlagge(ctx, kx + R * 0.15, ky - R * 0.2, FLAGGEN[(ki < 0 ? 0 : ki) % FLAGGEN.length], t + ki, 0.55 + R * 0.012); }
    }

    // Schmetterlinge & Libellen
    const BF = [[1290, 820, '#ff9ad5', '#ff5ca8'], [1340, 780, '#ffd34d', '#ff9f1c'], [1230, 880, '#8fd3ff', '#3d95f5'], [2280, 960, '#ffffff', '#ffd34d'], [2240, 1000, '#ffb36b', '#ff6b3d'],
      [780, 470, '#d6b6ff', '#9a6cff'], [540, 1880, '#8fffd0', '#2ec4b6'], [1500, 330, '#fff3a0', '#ffc93c'], [300, 2250, '#ffd6f6', '#d070e0'], [1420, 1560, '#ffffff', '#b89cf2']];
    BF.forEach(([bx, by, c1, c2], i) => {
      const x = bx + Math.sin(t * 0.37 + i * 2) * 80 + Math.sin(t * 1.7 + i) * 14, y = by + Math.cos(t * 0.29 + i * 1.3) * 60 + Math.cos(t * 2.1 + i) * 10;
      if (!inView(x, y)) return;
      const flap = Math.abs(Math.sin(t * 13 + i * 1.7)), ang = Math.atan2(Math.cos(t * 0.29 + i * 1.3) * -14, Math.cos(t * 0.37 + i * 2) * 26) + Math.PI / 2;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (fern) ctx.scale(1.5, 1.5);
      ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(6, 10, 7 * flap + 2, 5, 0, 0, TAU); ctx.fill();
      for (const sd of [-1, 1]) {
        ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(sd * (4 * flap + 1), -2, 4.8 * flap + 0.8, 4.2, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = c2; ctx.beginPath(); ctx.ellipse(sd * (3 * flap + 1), 3.5, 3.4 * flap + 0.6, 3, 0, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#2a1a10'; ctx.fillRect(-0.8, -5, 1.6, 10);
      ctx.restore();
    });
    for (let i = 0; i < 2; i++) {
      const x = TEICH.x + Math.sin(t * 0.5 + i * 3) * 160, y = TEICH.y + Math.sin(t * 0.8 + i) * 70;
      if (!inView(x, y)) continue;
      const ang = Math.atan2(Math.cos(t * 0.8 + i) * 0.8 * 70, Math.cos(t * 0.5 + i * 3) * 0.5 * 160);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (fern) ctx.scale(1.5, 1.5);
      const fl = 0.6 + 0.4 * Math.abs(Math.sin(t * 30 + i));
      ctx.fillStyle = 'rgba(210,240,255,.75)';
      for (const [wx, sd] of [[-1, 1], [-1, -1], [3, 1], [3, -1]]) { ctx.beginPath(); ctx.ellipse(wx, sd * 6 * fl, 2.4, 6 * fl, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = i ? '#2a8af0' : '#e0402a'; ctx.fillRect(-12, -1, 18, 2); ctx.beginPath(); ctx.arc(7, 0, 2.2, 0, TAU); ctx.fill();
      ctx.restore();
    }

    // Geflügelte Prinzessin kreist ums Nest, wenn der Hochzeitsflug bereit ist
    if (this.flugBereit) {
      const u = t * 0.7;
      const x = HX + Math.cos(u) * 120, y = HY - 20 + Math.sin(2 * u) * 50;
      const dx = -Math.sin(u) * 120, dy = Math.cos(2 * u) * 100;
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 1; k <= 5; k++) {
        const uu = u - k * 0.09;
        drawGlow(ctx, '255,220,120', HX + Math.cos(uu) * 120, HY - 20 + Math.sin(2 * uu) * 50, 10 - k, 0.5 - k * 0.08);
      }
      drawGlow(ctx, '255,226,140', x, y, 40, 0.55 + 0.15 * Math.sin(t * 5));
      ctx.globalCompositeOperation = 'source-over';
      this.drawFlieger(ctx, x, y, Math.atan2(dy, dx), t, 2, 1);
    }

    // Wolkenschatten
    for (let i = 0; i < 9; i++) {
      const x = ((t * 11 + i * 640) % (W + 900)) - 450, y = (i * 337 + 140) % H;
      if (inView(x, y, 300)) {
        drawGlow(ctx, '10,30,10', x, y, 230 + (i % 3) * 50, 0.16);
        drawGlow(ctx, '10,30,10', x + 140, y + 40, 160 + (i % 2) * 40, 0.12);
      }
    }
    // Rauch aus dem Schornstein
    for (let i = 0; i < 5; i++) {
      const p = (t * 0.25 + i / 5) % 1;
      drawGlow(ctx, '235,235,240', 3470 + p * 80 + Math.sin(p * 6 + t) * 10, 96 - p * 56, 16 + p * 36, 0.5 * (1 - p));
    }
    // Vögel (mit Schatten)
    for (let fl = 0; fl < 3; fl++) {
      const sp = [60, 46, 52][fl], lx = ((t * sp + fl * 1400) % (W + 800)) - 400, ly = [420, 1500, 2050][fl] + Math.sin(t * 0.2 + fl) * 60 - lx * [0.12, 0.25, 0.08][fl];
      for (let i = 0; i < (fl === 1 ? 3 : 5); i++) {
        const row = Math.ceil(i / 2), sd = i % 2 ? -1 : 1;
        const x = lx - row * 34, y = ly + sd * row * 26;
        if (!inView(x, y, 100)) continue;
        const span = 0.45 + 0.55 * Math.abs(Math.cos(t * 7 + i * 0.8 + fl * 2)), ang = Math.atan2(-[0.12, 0.25, 0.08][fl], 1);
        for (const sh of [1, 0]) {
          ctx.save(); ctx.translate(x + (sh ? 60 : 0), y + (sh ? 80 : 0)); ctx.rotate(ang); ctx.scale(1.3, 1.3);
          ctx.fillStyle = sh ? 'rgba(0,25,0,.15)' : '#3b3a4c';
          ctx.beginPath(); ctx.ellipse(0, 0, 7, 2.6, 0, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-11, -3); ctx.lineTo(-11, 3); ctx.fill();
          for (const s2 of [-1, 1]) {
            ctx.beginPath(); ctx.moveTo(3, 0); ctx.quadraticCurveTo(2, s2 * 9 * span, -5, s2 * 18 * span); ctx.quadraticCurveTo(-3, s2 * 8 * span, -3, 0); ctx.fill();
          }
          if (!sh) { ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.moveTo(7, -1); ctx.lineTo(10, 0); ctx.lineTo(7, 1); ctx.fill(); }
          ctx.restore();
        }
      }
    }

    // Leuchtpilze schimmern (auch am Tag ein wenig)
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, col] of LEUCHT) {
      if (!inView(x, y)) continue;
      drawGlow(ctx, col, x, y, 16 + night * 22, (0.18 + night * 0.7) * (0.75 + 0.25 * Math.sin(t * 1.8 + x)));
    }
    ctx.globalCompositeOperation = 'source-over';

    // Tag/Nacht
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (dusk > 0.02) { ctx.fillStyle = `rgba(255,120,60,${dusk * 0.14})`; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); }
    if (night > 0.02) {
      ctx.fillStyle = `rgba(8,14,48,${night * 0.52})`; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      welt();
      ctx.globalCompositeOperation = 'lighter';
      for (const kol of this.kListe) { const [kx, ky] = posVon(kol.id); drawGlow(ctx, '255,170,80', kx, ky, kol.R * 2.4, night * (kol.id === 'heim' ? 0.4 : 0.3)); }
      // Licht im Fenster der Menschen und im Baumhaus
      ctx.globalAlpha = night * 0.55; ctx.fillStyle = 'rgb(255,200,90)'; ctx.fillRect(3171, 309, 198, 108); ctx.globalAlpha = 1;
      drawGlow(ctx, '255,200,110', 3270, 450, 280, night * 0.4);
      const bh = ORTE.find(o => o.id === 'baumhaus'); if (bh) drawGlow(ctx, '255,200,110', bh.x - 6 * LS, bh.y - 10 * LS, 90, night * 0.45);
      // Duftstraßen & Botenlinien leuchten nachts stärker
      for (const r of [...(W0.boten ?? []), ...(W0.strassen ?? []).filter(x => x.stufe >= 3 && (x.bau ?? 1) >= 1)]) {
        const g = routeGeo(r.art === 'boten' ? 'boten' : 'strasse', r.a, r.b);
        if (!geoSicht(g)) continue;
        ctx.strokeStyle = r.art === 'boten' ? `rgba(200,150,255,${night * 0.22})` : `rgba(120,255,230,${night * 0.25})`; ctx.lineWidth = 22; ctx.stroke(g.path);
      }
      // Glühwürmchen
      for (let i = 0; i < 70; i++) {
        const x = ((i * 271.7 + Math.sin(t * 0.3 + i) * 70) % W + W) % W, y = ((i * 163.3 + Math.cos(t * 0.25 + i) * 60) % H + H) % H;
        if (inView(x, y)) drawGlow(ctx, '230,255,140', x, y, fern ? 18 : 12, night * (0.5 + 0.5 * Math.sin(t * 3 + i * 1.7)));
      }
      for (const [x, y, col] of LEUCHT) if (inView(x, y)) drawGlow(ctx, col, x, y, 34, night * 0.45);
      ctx.globalCompositeOperation = 'source-over';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // Regen
    this.regenA = clamp(this.regenA + (d?.regen ? dt : -dt) / 2.5, 0, 1);
    if (this.regenA > 0.01) {
      const a = this.regenA;
      ctx.fillStyle = `rgba(40,60,90,${0.22 * a})`; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.strokeStyle = `rgba(200,225,255,${0.45 * a})`; ctx.lineWidth = 1.2 * dpr;
      ctx.beginPath();
      const CW = this.canvas.width, CH = this.canvas.height;
      for (const [rx, ry, s] of this.regen) {
        const y = ((ry + t * 1.4 * s) % 1) * CH, x = ((rx + t * 0.15 * s) % 1) * CW;
        ctx.moveTo(x, y); ctx.lineTo(x - 5 * dpr, y + 18 * dpr * s);
      }
      ctx.stroke();
    }

    // ---------- Beschriftungen (Bildschirmkoordinaten) ----------
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawLabels(ctx, t, night);
  }

  drawFlagge(ctx, x, y, col, t, s = 1, gross = false) {
    const h = 34 * s, fw = 22 * s, fh = 14 * s;
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + 2 + h * 0.35, y + 2 + h * 0.2); ctx.stroke();
    ctx.strokeStyle = '#f2ead8'; ctx.lineWidth = 2.2 * s;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y - h);
    for (let i = 0; i <= 6; i++) { const u = i / 6; ctx.lineTo(x + u * fw, y - h + Math.sin(t * 5 - u * 4) * 2.4 * s * u); }
    for (let i = 6; i >= 0; i--) { const u = i / 6; ctx.lineTo(x + u * fw, y - h + fh + Math.sin(t * 5 - u * 4) * 2.4 * s * u); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.stroke();
    if (gross) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + fw * 0.45, y - h + fh / 2 + Math.sin(t * 5 - 1.8) * 1.1 * s, fh * 0.26, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(x, y - h, 2.4 * s, 0, TAU); ctx.fill();
  }

  /** Geflügelte Jungkönigin von oben (mit Schatten) */
  drawFlieger(ctx, x, y, ang, t, s = 1, hoch = 1) {
    const L = 14 * s;
    ctx.save(); ctx.translate(x + 10 + 18 * hoch, y + 14 + 26 * hoch); ctx.rotate(ang);
    ctx.fillStyle = 'rgba(0,20,0,.18)'; ctx.beginPath(); ctx.ellipse(0, 0, L * 0.5, L * 0.5, 0, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const fl = 0.35 + 0.65 * Math.abs(Math.sin(t * 22));
    ctx.fillStyle = 'rgba(225,240,255,.75)'; ctx.strokeStyle = 'rgba(120,150,190,.8)'; ctx.lineWidth = 0.8;
    for (const sd of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(-L * 0.05, sd * L * 0.42 * fl, L * 0.42, L * 0.2 * fl + 1, sd * 0.35, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-L * 0.22, sd * L * 0.3 * fl, L * 0.28, L * 0.13 * fl + 1, sd * 0.7, 0, TAU); ctx.fill(); ctx.stroke();
    }
    antTop(ctx, L, Math.floor(t * 10) % 4);
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(L * 0.3, 0, L * 0.06, 0, TAU); ctx.fill();
    ctx.restore();
  }

  pill(ctx, x, y, zeilen, stil) {
    const u = this.ui;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    let w = 0;
    for (const z of zeilen) { ctx.font = z.font; z.w = ctx.measureText(z.text).width + (z.extra ?? 0); w = Math.max(w, z.w); }
    const lh = 17 * u, ph = 7 * u, hh = zeilen.length * lh + 8 * u, ww = w + ph * 2;
    const rad = hh / 2 > 14 * u ? 12 * u : hh / 2;
    ctx.fillStyle = 'rgba(40,25,5,.28)'; ctx.beginPath(); ctx.roundRect(x - ww / 2 + 1, y + 2.5, ww, hh, rad); ctx.fill();
    ctx.fillStyle = stil.bg; ctx.beginPath(); ctx.roundRect(x - ww / 2, y, ww, hh, rad); ctx.fill();
    ctx.strokeStyle = stil.rand; ctx.lineWidth = stil.dick ?? 1.5; ctx.stroke();
    zeilen.forEach((z, i) => {
      ctx.font = z.font; ctx.fillStyle = z.col;
      const lx = x - z.w / 2, ly = y + 4 * u + lh * (i + 0.5);
      if (z.bg) { ctx.fillStyle = z.bg; ctx.beginPath(); ctx.roundRect(x - ww / 2 + 3 * u, ly - lh / 2 + 1, ww - 6 * u, lh - 2, 7 * u); ctx.fill(); ctx.fillStyle = z.col; }
      ctx.fillText(z.text, lx, ly + 0.5);
      z.nach?.(lx + z.w - (z.extra ?? 0), ly);
    });
    return hh;
  }

  drawLabels(ctx, t) {
    const u = this.ui, z = this.cam.z, st = this.state;
    const vw = this.vw, vh = this.vh;
    const byId = Object.fromEntries(this.kListe.map(k => [k.id, k]));
    const aktiv = aktiveId(st);
    const kompakt = z < 0.42; // ganz weit draußen: nur das Nötigste beschriften
    // Bau-Fortschritt, Gäste, Vorschau
    for (const m of this.markierungen ?? []) {
      const [sx, sy] = this.worldToScreen(m.x, m.y);
      if (sx < -40 || sy < -40 || sx > vw + 40 || sy > vh + 40) continue;
      if (m.art === 'gast') {
        const r = 11 * u, by = sy - 16 * u - Math.abs(Math.sin(t * 4 + m.x)) * 3;
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(sx + 1, by + 2, r, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx, by, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = m.farbe; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(sx - 4 * u, by + r - 1); ctx.lineTo(sx, by + r + 5 * u); ctx.lineTo(sx + 4 * u, by + r - 1); ctx.fill();
        drawEmoji(ctx, m.icon, sx, by + 5 * u, 14 * u);
      } else {
        const stil = m.art === 'vorschau' ? { bg: m.farbe, rand: 'rgba(255,255,255,.9)', dick: 2 } : m.art === 'boten' ? { bg: 'rgba(122,74,216,.92)', rand: 'rgba(255,255,255,.6)' } : { bg: 'rgba(255,200,60,.96)', rand: 'rgba(120,70,0,.5)' };
        this.pill(ctx, sx, sy - 34 * u, [{ text: m.text, font: `700 ${12 * u}px ${FONT}`, col: m.art === 'bau' ? '#3b2300' : '#fff' }], stil);
      }
    }
    // Heimatnest
    {
      const k = byId.heim, R = k?.R ?? 58;
      const [sx, sy] = this.worldToScreen(HX, HY);
      const name = st.spieler?.koloniename ?? 'Unser Nest';
      const an = this.selected === 'heim', hv = this.hover?.id === 'heim';
      const zeilen = [{ text: '👑 ' + name, font: `700 ${14 * u}px ${FONT}`, col: '#3b2300' }];
      if (k && !kompakt) zeilen.push({ text: `🐜 ${k.pop ?? '?'} · 😊 ${Math.round(k.zufriedenheit ?? 0)} %`, font: `700 ${11.5 * u}px ${FONT}`, col: '#6a4200' });
      this.pill(ctx, sx, sy + (R + 10) * z + 4 * u, zeilen, { bg: an ? 'rgba(255,236,150,.99)' : 'rgba(255,214,94,.96)', rand: an || hv ? '#ff8a00' : 'rgba(160,100,0,.6)', dick: an ? 3 : 1.5 });
    }
    // Flugrouten-Schild
    for (const [o, mx, my, a] of this.routeLabels ?? []) {
      const [sx, sy] = this.worldToScreen(mx, my);
      ctx.globalAlpha = a;
      this.pill(ctx, sx, sy - 12 * u, [{ text: `🪽 ${DIST_NAME[o.entfernung]}`, font: `700 ${12 * u}px ${FONT}`, col: '#fff' }], { bg: 'rgba(60,45,120,.88)', rand: 'rgba(255,255,255,.5)' });
      ctx.globalAlpha = 1;
    }
    ORTE.forEach((o, i) => {
      const [sx, sy] = this.worldToScreen(o.x, o.y);
      if (sx < -140 || sy < -140 || sx > vw + 140 || sy > vh + 180) return;
      const kol = byId[o.id];
      const L = lm(o);
      const an = this.selected === o.id, hv = this.hover?.id === o.id;
      const s = u * (an ? 1.18 : hv ? 1.1 : 1);
      // Namensschild mit Entfernungspunkten (Kolonien: grünes Banner mit Name & Bevölkerung)
      const e = o.entfernung, dotR = 2.8 * u;
      const zeilen = [{
        text: o.name, font: `700 ${(kompakt ? 12 : 13) * u}px ${FONT}`, col: '#3a2614', extra: kol || kompakt ? 0 : 8 * u + 4 * dotR * 2.6,
        nach: kol || kompakt ? null : (x, y) => { for (let k = 0; k < 4; k++) { ctx.fillStyle = k < e ? DIST_FARBE[e] : 'rgba(80,50,20,.18)'; ctx.beginPath(); ctx.arc(x + 8 * u + dotR + k * dotR * 2.6, y, dotR, 0, TAU); ctx.fill(); } },
      }];
      if (kol) zeilen.push({ text: kompakt ? `🚩 ${kol.name}` : `🚩 ${kol.name} · 🐜 ${kol.pop ?? '?'}`, font: `700 ${12 * u}px ${FONT}`, col: '#fff', bg: '#2f9e48' });
      this.pill(ctx, sx, sy + L.bot * LS * z + 2 * u, zeilen, an ? { bg: 'rgba(255,240,180,.98)', rand: '#ffb52e', dick: 2.5 } : kol ? { bg: 'rgba(240,255,236,.96)', rand: 'rgba(40,140,60,.7)', dick: 2 } : { bg: 'rgba(255,250,236,.93)', rand: 'rgba(110,70,20,.3)' });
      // Plakette mit Symbol
      const [bx, by0] = this.badgePos(o), by = by0 + Math.sin(t * 2 + i * 1.3) * 3 * u;
      const r = (kompakt ? 16 : 19) * s;
      ctx.fillStyle = 'rgba(30,20,5,.3)'; ctx.beginPath(); ctx.ellipse(bx + 2, by0 + r + 9 * u, r * 0.6, r * 0.22, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = an ? '#ffb52e' : '#fffaf0';
      ctx.beginPath(); ctx.moveTo(bx - r * 0.42, by + r * 0.8); ctx.lineTo(bx, by + r + 9 * s); ctx.lineTo(bx + r * 0.42, by + r * 0.8); ctx.fill();
      if (an) { ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, '255,210,90', bx, by, r * 2.4, 0.5 + 0.2 * Math.sin(t * 4)); ctx.globalCompositeOperation = 'source-over'; }
      ctx.fillStyle = an ? '#ffb52e' : '#fffaf0'; ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fill();
      ctx.lineWidth = 3.2 * s; ctx.strokeStyle = kol ? '#3cc455' : DIST_FARBE[e]; ctx.beginPath(); ctx.arc(bx, by, r - 1.6 * s, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, r - 4 * s, 0, TAU); ctx.fill();
      drawEmoji(ctx, o.icon, bx, by + r * 0.4, r * 1.1);
      if (kol) {
        const cx = bx + r * 0.75, cy = by - r * 0.75;
        ctx.fillStyle = '#3cc455'; ctx.beginPath(); ctx.arc(cx, cy, 8 * s, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2 * s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(cx - 3.6 * s, cy); ctx.lineTo(cx - 1 * s, cy + 2.8 * s); ctx.lineTo(cx + 3.8 * s, cy - 2.8 * s); ctx.stroke();
      }
    });
    // „📍 Du bist hier" an der gerade gezeigten Kolonie
    const ak = byId[aktiv];
    if (ak) {
      const [kx, ky] = posVon(aktiv);
      const [sx, sy0] = this.worldToScreen(kx, ky);
      const hop = Math.abs(Math.sin(t * 3)) * 7 * u;
      const sy = sy0 - ak.R * z - 18 * u - hop;
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, '255,90,90', sx, sy0, Math.max(30, ak.R * z * 1.6), 0.25 + 0.1 * Math.sin(t * 3));
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(sx, sy0 - ak.R * z * 0.2, 9 * u, 3.5 * u, 0, 0, TAU); ctx.fill();
      drawEmoji(ctx, '📍', sx, sy + 4 * u, 30 * u);
      const ph = this.pill(ctx, sx, sy - 52 * u, [{ text: 'Du bist hier', font: `800 ${12.5 * u}px ${FONT}`, col: '#fff' }], { bg: 'rgba(226,52,72,.96)', rand: 'rgba(255,255,255,.95)', dick: 2 });
      ctx.fillStyle = 'rgba(226,52,72,.96)'; ctx.beginPath(); ctx.moveTo(sx - 5 * u, sy - 52 * u + ph - 1); ctx.lineTo(sx, sy - 52 * u + ph + 6 * u); ctx.lineTo(sx + 5 * u, sy - 52 * u + ph - 1); ctx.fill();
    }
  }
}

function hexRgb(hex) {
  const v = parseInt((hex ?? '#ffffff').slice(1), 16);
  return `${(v >> 16) & 255},${(v >> 8) & 255},${v & 255}`;
}
