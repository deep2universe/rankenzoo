// Welt-Ansicht: die große Übersichtskarte rund um das Heimatnest – wie eine gemalte
// Bilderbuch-Landkarte von weit oben. Boden, Bach, Wald, Garten & Co. werden einmal
// vorgerendert; Wahrzeichen der Orte sind gecachte Sprites. Pro Bild kommen nur Wasser-
// glitzern, Tiere, Ameisen, Wolkenschatten, Licht und die Beschriftungen dazu.
import { WELT, ORTE, kolonieAn, kolonieGroesse } from '../game/welt.js';
import { makeNoise, mulberry32, clamp } from '../util.js';
import { drawEmoji, drawGlow, cached } from './sprites.js';

const { W, H } = WELT;
const HX = WELT.HEIM.x, HY = WELT.HEIM.y, RR = WELT.REVIER_R;
const TAU = Math.PI * 2;
const FONT = 'Fredoka, Nunito, sans-serif';

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

const BACH = spline([[-60, 850], [160, 900], [400, 985], [600, 1030], [780, 1046], [960, 1118], [1140, 1238], [1290, 1300], [1470, 1352], [1590, 1450], [1650, 1680]]);
const BACH_P = pathOf(BACH);
const TEICH = { x: 1345, y: 1352, rx: 92, ry: 54 };
const WEG = spline([[500, 1175], [560, 1040], [640, 930], [760, 830], [900, 738], [1040, 655], [1240, 588], [1460, 522], [1680, 444], [1880, 380], [2047, 352]]);
const PFAD = spline([[640, 522], [690, 610], [790, 688], [900, 738]]);
const GARTEN = { x0: 320, y0: 230, x1: 720, y1: 522 };
const PLATZ = { x0: 120, y0: 1120, x1: 620, y1: 1500 };
const HAUS = { x0: 1990, y1: 330, dach: 192 };
const SAND = { x: 1990, y: 1305, rx: 250, ry: 185 };
const WALD = [[2150, 860, 430, 330], [1960, 985, 210, 190], [2300, 575, 210, 190], [2380, 1180, 160, 170]];
const inWald = (x, y, m = 1) => WALD.some(([cx, cy, rx, ry]) => ((x - cx) / (rx * m)) ** 2 + ((y - cy) / (ry * m)) ** 2 < 1);
const FLAGGEN = ['#4fa3ff', '#ff9f1c', '#a77bff', '#ff6b9b', '#2ec4b6', '#ffd34d', '#5fd068', '#f45b69', '#9b5de5'];
const DIST_FARBE = ['#5fd068', '#5fd068', '#ffc93c', '#ff9f43', '#ff6b6b'];
export const DIST_NAME = ['', 'Nah', 'Mittel', 'Weit', 'Sehr weit'];

// Wahrzeichen: Spritegröße, Abstand nach oben (Plakette) & unten (Namensschild), Platz für die Tochterkolonie
const LM = {
  lichtung: { s: 200, top: 52, bot: 58, kol: [70, 30] },
  blumen: { s: 220, top: 70, bot: 70, kol: [92, 18] },
  bach: { s: 180, top: 40, bot: 52, kol: [70, 22] },
  wald: { s: 220, top: 76, bot: 70, kol: [-86, 18] },
  stumpf: { s: 180, top: 52, bot: 56, kol: [-80, 26] },
  garten: { s: 200, top: 50, bot: 52, kol: [124, 82] },
  sand: { s: 200, top: 56, bot: 62, kol: [-92, 10] },
  spielplatz: { s: 260, top: 56, bot: 70, kol: [-10, 112] },
  topf: { s: 170, top: 70, bot: 46, kol: [-178, 60] },
};
const kolPos = o => { const k = LM[o.biom]?.kol ?? [70, 30]; return [o.x + k[0], o.y + k[1]]; };
const kolR = n => 15 + n * 5;

// ---------- kleine Zeichenhelfer ----------
function blob(c, rnd, x, y, r, col, n = 10, jit = 0.25) {
  c.fillStyle = col; c.beginPath();
  for (let i = 0; i <= n; i++) { const a = (i / n) * TAU, rr = r * (1 - jit / 2 + rnd() * jit); c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fill();
}
function blume(c, x, y, s, col, mitte = '#ffe066') {
  c.fillStyle = col;
  for (let k = 0; k < 5; k++) { const a = k * 1.2566 + x; c.beginPath(); c.arc(x + Math.cos(a) * s, y + Math.sin(a) * s, s * 0.78, 0, TAU); c.fill(); }
  c.fillStyle = mitte; c.beginPath(); c.arc(x, y, s * 0.55, 0, TAU); c.fill();
}
function stein(c, x, y, rx, ry, rot = 0) {
  c.fillStyle = 'rgba(20,30,10,.25)'; c.beginPath(); c.ellipse(x + rx * 0.3, y + ry * 0.4, rx, ry, rot, 0, TAU); c.fill();
  const g = c.createRadialGradient(x - rx * 0.4, y - ry * 0.5, 1, x, y, Math.max(rx, ry));
  g.addColorStop(0, '#eceae4'); g.addColorStop(1, '#8a857c');
  c.fillStyle = g; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.fill();
}
function laubBaum(c, rnd, x, y, r) {
  const pal = [['#7fd66a', '#2f7d32'], ['#8ade6e', '#3a8a34'], ['#66c45c', '#246b2a'], ['#9bd96b', '#3f8a2c'], ['#b5d65a', '#4f8a26']];
  const [hi, lo] = pal[(rnd() * (rnd() < 0.1 ? 5 : 4)) | 0];
  const teile = [];
  for (let k = 0; k < 7; k++) { const a = rnd() * TAU, rr = rnd() * r * 0.48, s = r * (0.42 + rnd() * 0.28); teile.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr, s]); }
  teile.sort((a, b) => (a[1] - a[0] * 0.3) - (b[1] - b[0] * 0.3)).reverse();
  for (const [cx, cy, s] of teile) {
    const g = c.createRadialGradient(cx - s * 0.35, cy - s * 0.45, s * 0.08, cx, cy, s);
    g.addColorStop(0, hi); g.addColorStop(1, lo);
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, s, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(20,60,20,.35)'; c.lineWidth = 1.4; c.stroke();
  }
  c.fillStyle = 'rgba(255,255,210,.22)';
  for (let k = 0; k < 4; k++) { const a = rnd() * TAU, rr = rnd() * r * 0.4; c.beginPath(); c.arc(x - r * 0.2 + Math.cos(a) * rr, y - r * 0.25 + Math.sin(a) * rr, r * 0.12, 0, TAU); c.fill(); }
}
function nadelBaum(c, rnd, x, y, r) {
  const n = 9 + ((rnd() * 4) | 0), rot = rnd();
  const cols = ['#1d5230', '#2a6e3c', '#3c8e4a', '#56aa58'];
  for (let L = 0; L < 4; L++) {
    const rr = r * (1 - L * 0.24);
    c.fillStyle = cols[L]; c.beginPath();
    for (let i = 0; i <= n * 2; i++) { const a = (i / (n * 2)) * TAU + rot + L * 0.25, q = i % 2 ? rr * 0.6 : rr; c.lineTo(x + Math.cos(a) * q - L * r * 0.05, y + Math.sin(a) * q - L * r * 0.07); }
    c.closePath(); c.fill();
    if (!L) { c.strokeStyle = 'rgba(10,40,20,.45)'; c.lineWidth = 1.2; c.stroke(); }
  }
  c.fillStyle = '#7cc46a'; c.beginPath(); c.arc(x - r * 0.18, y - r * 0.24, r * 0.09, 0, TAU); c.fill();
}
function baumSchatten(c, x, y, r) { c.fillStyle = 'rgba(12,40,14,.28)'; c.beginPath(); c.ellipse(x + r * 0.38, y + r * 0.5, r * 1.02, r * 0.92, 0.3, 0, TAU); c.fill(); }
function fliegenpilz(c, x, y, r) {
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(x + r * 0.3, y + r * 0.4, r, 0, TAU); c.fill();
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 0.5, x, y, r);
  g.addColorStop(0, '#ff6a5a'); g.addColorStop(1, '#c41e1e');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.fillStyle = '#fff';
  for (const [dx, dy, s] of [[-0.4, -0.3, 0.2], [0.3, -0.4, 0.16], [0.1, 0.25, 0.18], [-0.35, 0.35, 0.12], [0.45, 0.15, 0.12]]) { c.beginPath(); c.arc(x + dx * r, y + dy * r, s * r, 0, TAU); c.fill(); }
}
function huegel(c, rnd, x, y, R, dichte = 1) {
  c.fillStyle = 'rgba(30,20,5,.32)'; c.beginPath(); c.ellipse(x + R * 0.18, y + R * 0.24, R * 1.12, R * 1.02, 0, 0, TAU); c.fill();
  c.fillStyle = '#7a5a32'; c.beginPath(); c.arc(x, y, R * 1.08, 0, TAU); c.fill();
  const g = c.createRadialGradient(x - R * 0.35, y - R * 0.42, R * 0.08, x, y, R);
  g.addColorStop(0, '#dca066'); g.addColorStop(0.55, '#9a6030'); g.addColorStop(1, '#5a3418');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill();
  const cols = ['#5a3518', '#7a4a22', '#9a6030', '#c89050', '#3f2510', '#e0b070'];
  c.lineWidth = Math.max(0.8, R * 0.022); c.lineCap = 'round';
  for (let i = 0; i < R * R * 0.12 * dichte; i++) {
    const a = rnd() * TAU, r = Math.sqrt(rnd()) * R * 0.97, l = R * (0.04 + rnd() * 0.08), b = rnd() * Math.PI;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    c.strokeStyle = cols[(rnd() * 6) | 0];
    c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(b) * l, py + Math.sin(b) * l); c.stroke();
  }
  // Zweiglein
  c.lineWidth = Math.max(1.2, R * 0.04);
  for (let i = 0; i < 4 + R / 8; i++) {
    const a = rnd() * TAU, r = Math.sqrt(rnd()) * R * 0.8, l = R * (0.14 + rnd() * 0.12), b = rnd() * Math.PI;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    c.strokeStyle = rnd() < 0.5 ? '#6a3f1a' : '#b07a40';
    c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(b) * l, py + Math.sin(b) * l); c.stroke();
  }
  // Licht oben links
  const hl = c.createRadialGradient(x - R * 0.35, y - R * 0.4, 0, x - R * 0.35, y - R * 0.4, R * 0.6);
  hl.addColorStop(0, 'rgba(255,230,170,.35)'); hl.addColorStop(1, 'rgba(255,230,170,0)');
  c.fillStyle = hl; c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill();
  // Eingänge
  const n = 2 + Math.round(R / 22);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + 0.5, r = i === 0 ? 0 : R * (0.5 + rnd() * 0.15);
    const ex = x + Math.cos(a) * r, ey = y + Math.sin(a) * r, s = Math.max(2.2, R * 0.075);
    c.fillStyle = 'rgba(240,200,140,.6)'; c.beginPath(); c.ellipse(ex - 0.6, ey - 0.8, s * 1.35, s * 1.05, a, 0, TAU); c.fill();
    c.fillStyle = '#1a0c04'; c.beginPath(); c.ellipse(ex, ey, s, s * 0.78, a, 0, TAU); c.fill();
  }
}

// Ameise von oben (Kopf nach rechts), winzig
function antTop(c, L, frame, wings = 0) {
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

// ---------- Wahrzeichen der Orte (einmal gemalt) ----------
function wahrzeichen(biom) {
  const S = LM[biom].s;
  return cached('weltLM|' + biom, S, S, c => {
    c.translate(S / 2, S / 2);
    const rnd = mulberry32(biom.length * 977 + biom.charCodeAt(1) * 13);
    switch (biom) {
      case 'lichtung': {
        const g = c.createRadialGradient(0, 0, 8, 0, 0, 92);
        g.addColorStop(0, 'rgba(255,246,170,.5)'); g.addColorStop(0.55, 'rgba(240,240,140,.25)'); g.addColorStop(1, 'rgba(240,240,140,0)');
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, 92, 0, TAU); c.fill();
        c.lineCap = 'round';
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
        // Schilf
        c.lineCap = 'round';
        for (let i = 0; i < 22; i++) {
          const x = -42 + (rnd() - 0.5) * 30, y = 6 + (rnd() - 0.5) * 22, a = -Math.PI / 2 - 0.9 + rnd() * 1.2, l = 22 + rnd() * 18;
          c.strokeStyle = rnd() < 0.5 ? '#4f8a2a' : '#78b04a'; c.lineWidth = 2;
          c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * l * 0.6, y + Math.sin(a) * l * 0.6, x + Math.cos(a + 0.3) * l, y + Math.sin(a + 0.3) * l); c.stroke();
        }
        for (const [x, y, a] of [[-50, -14, -0.4], [-36, -20, 0.2], [-44, -2, -0.1], [-28, -6, 0.5]]) {
          c.save(); c.translate(x, y); c.rotate(a);
          c.fillStyle = '#6a3a16'; c.beginPath(); c.roundRect(-3, -9, 6, 14, 3); c.fill();
          c.fillStyle = 'rgba(255,220,160,.35)'; c.fillRect(-2, -8, 1.5, 10); c.restore();
        }
        // Seerose mit Frosch (im Wasser oberhalb)
        c.fillStyle = 'rgba(0,40,60,.25)'; c.beginPath(); c.arc(42, -36, 16, 0, TAU); c.fill();
        c.fillStyle = '#4fae46'; c.beginPath(); c.arc(40, -40, 15, 0.35, TAU - 0.15); c.lineTo(40, -40); c.fill();
        c.strokeStyle = '#3a8a34'; c.lineWidth = 1; c.stroke();
        drawEmoji(c, '🐸', 40, -33, 15);
        c.fillStyle = '#4fae46'; c.beginPath(); c.arc(64, -24, 9, 0.6, TAU); c.lineTo(64, -24); c.fill();
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
        c.lineCap = 'round';
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
        c.lineCap = 'round';
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
        c.strokeStyle = 'rgba(160,110,50,.35)'; c.lineWidth = 1.6; c.lineCap = 'round';
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
        // Schatten
        c.fillStyle = 'rgba(30,20,5,.28)';
        c.save(); c.translate(14, 18);
        c.fillRect(20, -24, 56, 56);
        c.save(); c.translate(20, 4); c.rotate(Math.PI - 0.32); c.beginPath(); c.roundRect(0, -16, 130, 32, 12); c.fill(); c.restore();
        c.restore();
        // Rutschbahn
        c.save(); c.translate(20, 4); c.rotate(Math.PI - 0.32);
        c.fillStyle = '#e8701a'; c.beginPath(); c.roundRect(0, -16, 130, 32, 12); c.fill();
        const rg = c.createLinearGradient(0, -12, 0, 12); rg.addColorStop(0, '#ffe680'); rg.addColorStop(0.5, '#ffcf33'); rg.addColorStop(1, '#f2b01e');
        c.fillStyle = rg; c.beginPath(); c.roundRect(4, -11, 122, 22, 9); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; c.beginPath(); c.moveTo(10, -5); c.lineTo(118, -5); c.stroke();
        c.restore();
        // Leiter
        c.strokeStyle = '#4a7fd8'; c.lineWidth = 4;
        c.beginPath(); c.moveTo(76, -14); c.lineTo(112, -14); c.moveTo(76, 22); c.lineTo(112, 22); c.stroke();
        c.lineWidth = 3; c.strokeStyle = '#d0dcf0';
        for (let x = 82; x <= 110; x += 7) { c.beginPath(); c.moveTo(x, -14); c.lineTo(x, 22); c.stroke(); }
        // Turm mit Dach
        c.fillStyle = '#a8743f'; c.fillRect(20, -24, 56, 56);
        const tri = (x1, y1, x2, y2, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(48, 4); c.lineTo(x1, y1); c.lineTo(x2, y2); c.closePath(); c.fill(); };
        tri(16, -28, 80, -28, '#ff6b5a'); tri(80, -28, 80, 36, '#d83a2c'); tri(80, 36, 16, 36, '#b82a20'); tri(16, 36, 16, -28, '#ff8a6a');
        c.strokeStyle = 'rgba(80,10,0,.4)'; c.lineWidth = 1.5; c.strokeRect(16, -28, 64, 64);
        c.fillStyle = '#ffe066'; c.beginPath(); c.arc(48, 4, 4, 0, TAU); c.fill();
        // Ball
        c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(-60, 50, 9, 0, TAU); c.fill();
        c.fillStyle = '#4fa3ff'; c.beginPath(); c.arc(-64, 46, 9, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(-64, 46, 9, -0.6, 0.9); c.lineTo(-64, 46); c.fill();
        c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(-64, 46, 9, 2.2, 3.3); c.lineTo(-64, 46); c.fill();
        // Krümel!
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
        // Geranie
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
    }
  }, 2);
}

// ---------- Boden (einmal vorgerendert) ----------
function makeBase() {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
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
  for (let i = 0; i < BACH.length; i += 3) markiere(BACH[i][0], BACH[i][1], 40);
  for (let i = 0; i < WEG.length; i += 3) markiere(WEG[i][0], WEG[i][1], 24);
  for (let i = 0; i < PFAD.length; i += 3) markiere(PFAD[i][0], PFAD[i][1], 14);
  for (let y = 0; y < H; y += 10) for (let x = 0; x < W; x += 10) {
    if ((x > GARTEN.x0 - 20 && x < GARTEN.x1 + 20 && y > GARTEN.y0 - 20 && y < GARTEN.y1 + 20) ||
      (x > PLATZ.x0 && x < PLATZ.x1 && y > PLATZ.y0 && y < PLATZ.y1) || (x > HAUS.x0 - 10 && y < HAUS.y1 + 30) ||
      ((x - TEICH.x) / (TEICH.rx + 30)) ** 2 + ((y - TEICH.y) / (TEICH.ry + 30)) ** 2 < 1) belegt[(y / 10) * GW + x / 10] = 1;
  }

  // Wiese mit weichen Farbwolken
  const sc = 6, lw = Math.ceil(W / sc), lh = Math.ceil(H / sc);
  const low = document.createElement('canvas'); low.width = lw; low.height = lh;
  const lc = low.getContext('2d'); const img = lc.createImageData(lw, lh);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const v = n(x * 0.025, y * 0.025, 4), v2 = n(x * 0.09 + 40, y * 0.09, 3), v3 = n(x * 0.012 + 90, y * 0.012 + 20, 2);
    const i = (y * lw + x) * 4;
    img.data[i] = 74 + v * 72 + v2 * 18 + v3 * 30;
    img.data[i + 1] = 138 + v * 64 + v2 * 14;
    img.data[i + 2] = 48 + v * 34 - v3 * 10;
    img.data[i + 3] = 255;
  }
  lc.putImageData(img, 0, 0);
  c.imageSmoothingQuality = 'high';
  c.drawImage(low, 0, 0, W, H);

  // Sonnige Flecken (Lichtung) und gemähte Wiese ums Revier
  let g = c.createRadialGradient(1520, 640, 20, 1520, 640, 190);
  g.addColorStop(0, 'rgba(255,240,140,.45)'); g.addColorStop(1, 'rgba(255,240,140,0)');
  c.fillStyle = g; c.fillRect(1300, 420, 440, 440);
  g = c.createRadialGradient(HX, HY, RR * 0.4, HX, HY, RR * 1.15);
  g.addColorStop(0, 'rgba(190,230,120,.35)'); g.addColorStop(1, 'rgba(190,230,120,0)');
  c.fillStyle = g; c.fillRect(HX - RR * 1.2, HY - RR * 1.2, RR * 2.4, RR * 2.4);

  // Waldboden
  for (const [cx, cy, rx, ry] of WALD) {
    g = c.createRadialGradient(cx, cy, 10, cx, cy, Math.max(rx, ry) * 1.1);
    g.addColorStop(0, 'rgba(30,60,25,.85)'); g.addColorStop(0.75, 'rgba(40,80,30,.6)'); g.addColorStop(1, 'rgba(40,80,30,0)');
    c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy, rx * 1.1, ry * 1.1, 0, 0, TAU); c.fill();
  }

  // Sandhügel-Gebiet
  {
    const s = new Path2D();
    for (let i = 0; i <= 40; i++) { const a = (i / 40) * TAU, r = 1 + (n(Math.cos(a) * 2 + 9, Math.sin(a) * 2 + 9, 2) - 0.5) * 0.5; s.lineTo(SAND.x + Math.cos(a) * SAND.rx * r, SAND.y + Math.sin(a) * SAND.ry * r); }
    s.closePath();
    c.save(); c.filter = 'blur(10px)'; c.fillStyle = 'rgba(200,170,100,.6)'; c.fill(s); c.restore();
    g = c.createRadialGradient(SAND.x - 60, SAND.y - 50, 20, SAND.x, SAND.y, SAND.rx);
    g.addColorStop(0, '#f7e2a8'); g.addColorStop(1, '#dcbc7c');
    c.fillStyle = g; c.fill(s);
    c.save(); c.clip(s);
    c.strokeStyle = 'rgba(170,120,60,.22)'; c.lineWidth = 2; c.lineCap = 'round';
    for (let i = 0; i < 70; i++) { const x = SAND.x + (rnd() - 0.5) * SAND.rx * 2, y = SAND.y + (rnd() - 0.5) * SAND.ry * 2, l = 20 + rnd() * 30; c.beginPath(); c.moveTo(x - l, y); c.quadraticCurveTo(x, y - 6, x + l, y + 2); c.stroke(); }
    for (let i = 0; i < 260; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(150,110,50,.35)' : 'rgba(255,250,220,.5)'; c.beginPath(); c.arc(SAND.x + (rnd() - 0.5) * SAND.rx * 2, SAND.y + (rnd() - 0.5) * SAND.ry * 2, 1 + rnd() * 1.5, 0, TAU); c.fill(); }
    c.restore();
    for (let i = 0; i < 40; i++) markiere(SAND.x + Math.cos(i / 40 * TAU) * SAND.rx * 0.6, SAND.y + Math.sin(i / 40 * TAU) * SAND.ry * 0.6, SAND.ry * 0.7);
  }

  // Bach mit Ufer, Teich
  c.lineCap = 'round'; c.lineJoin = 'round';
  const teich = new Path2D(); teich.ellipse(TEICH.x, TEICH.y, TEICH.rx, TEICH.ry, -0.12, 0, TAU);
  const wasser = (w, col) => { c.strokeStyle = col; c.lineWidth = w; c.stroke(BACH_P); c.save(); c.fillStyle = col; c.translate(TEICH.x, TEICH.y); c.scale(1 + w / (2 * TEICH.rx), 1 + w / (2 * TEICH.ry)); c.translate(-TEICH.x, -TEICH.y); c.fill(teich); c.restore(); };
  wasser(64, 'rgba(60,90,30,.35)');
  wasser(52, '#cdb886');
  wasser(42, '#9a8a5a');
  wasser(36, '#2f7fb4');
  c.save(); c.translate(-3, -3); wasser(24, '#4aa2d8'); c.restore();
  c.save(); c.translate(-6, -6); wasser(8, 'rgba(170,225,255,.55)'); c.restore();
  // Seerosen im Teich
  for (let i = 0; i < 9; i++) {
    const a = rnd() * TAU, r = Math.sqrt(rnd()) * 0.75, x = TEICH.x + Math.cos(a) * TEICH.rx * r, y = TEICH.y + Math.sin(a) * TEICH.ry * r, s = 7 + rnd() * 6;
    c.fillStyle = rnd() < 0.5 ? '#4fae46' : '#62c050'; c.beginPath(); c.arc(x, y, s, a, a + TAU - 0.5); c.lineTo(x, y); c.fill();
    if (rnd() < 0.35) blume(c, x + 2, y - 2, 2.6, '#ffb6d4', '#ffe680');
  }
  // Uferkiesel & Schilf
  for (let i = 0; i < BACH.length; i += 2) {
    const [x, y] = BACH[i];
    if (rnd() < 0.5) { const a = rnd() * TAU; c.fillStyle = ['#a89878', '#c8bca0', '#8a7a5a'][(rnd() * 3) | 0]; c.beginPath(); c.arc(x + Math.cos(a) * 24, y + Math.sin(a) * 24, 1.5 + rnd() * 2.5, 0, TAU); c.fill(); }
    if (rnd() < 0.07) {
      const side = rnd() < 0.5 ? -1 : 1;
      for (let k = 0; k < 8; k++) { const bx = x + (rnd() - 0.5) * 16, by = y + side * (24 + rnd() * 6); c.strokeStyle = rnd() < 0.5 ? '#4f8a2a' : '#7ab04a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + (rnd() - 0.5) * 8, by - 12 - rnd() * 8); c.stroke(); }
    }
  }

  // Wege
  const weg = pathOf(WEG), pfad = pathOf(PFAD);
  c.strokeStyle = 'rgba(90,70,30,.3)'; c.lineWidth = 32; c.stroke(weg);
  c.strokeStyle = '#d9c491'; c.lineWidth = 25; c.stroke(weg);
  c.strokeStyle = 'rgba(255,245,215,.45)'; c.lineWidth = 9; c.stroke(weg);
  for (let i = 0; i < WEG.length; i++) for (let k = 0; k < 2; k++) {
    const [x, y] = WEG[i]; c.fillStyle = rnd() < 0.5 ? 'rgba(140,110,60,.45)' : 'rgba(255,255,240,.6)';
    c.beginPath(); c.arc(x + (rnd() - 0.5) * 20, y + (rnd() - 0.5) * 20, 0.8 + rnd() * 1.4, 0, TAU); c.fill();
  }
  c.strokeStyle = 'rgba(90,60,25,.3)'; c.lineWidth = 14; c.stroke(pfad);
  c.strokeStyle = '#b8935c'; c.lineWidth = 9; c.stroke(pfad);
  // Holzbrücke dort, wo der Weg den Bach kreuzt
  {
    let bi = 0, bd = 1e9;
    for (let i = 2; i < WEG.length - 2; i++) for (let j = 0; j < BACH.length; j += 2) { const d = Math.hypot(WEG[i][0] - BACH[j][0], WEG[i][1] - BACH[j][1]); if (d < bd) { bd = d; bi = i; } }
    const [bx, by] = WEG[bi], ang = Math.atan2(WEG[bi + 2][1] - WEG[bi - 2][1], WEG[bi + 2][0] - WEG[bi - 2][0]);
    c.save(); c.translate(bx, by); c.rotate(ang);
    c.fillStyle = 'rgba(0,20,30,.35)'; c.fillRect(-44 + 6, -19 + 9, 88, 38);
    for (let i = -6; i <= 5; i++) {
      c.fillStyle = i % 2 ? '#b98048' : '#a56d3a'; c.fillRect(i * 7.3, -17, 6.6, 34);
      c.strokeStyle = 'rgba(70,40,15,.5)'; c.lineWidth = 0.8; c.strokeRect(i * 7.3, -17, 6.6, 34);
    }
    c.fillStyle = '#6a4422'; c.fillRect(-46, -21, 92, 5); c.fillRect(-46, 16, 92, 5);
    c.fillStyle = 'rgba(255,220,170,.4)'; c.fillRect(-46, -21, 92, 1.5); c.fillRect(-46, 16, 92, 1.5);
    for (const px of [-46, 0, 42]) for (const py of [-22, 15]) { c.fillStyle = '#4a2e14'; c.fillRect(px, py, 6, 7); }
    c.restore();
  }

  // Gemüsegarten mit Beeten und Zaun
  {
    const { x0, y0, x1, y1 } = GARTEN;
    c.fillStyle = 'rgba(40,30,10,.3)'; c.beginPath(); c.roundRect(x0 + 6, y0 + 8, x1 - x0, y1 - y0, 14); c.fill();
    g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, '#9a6638'); g.addColorStop(1, '#7a4e28');
    c.fillStyle = g; c.beginPath(); c.roundRect(x0, y0, x1 - x0, y1 - y0, 14); c.fill();
    const reihen = Math.floor((y1 - y0 - 30) / 34);
    for (let r = 0; r < reihen; r++) {
      const y = y0 + 32 + r * 34;
      c.fillStyle = 'rgba(60,35,15,.45)'; c.beginPath(); c.roundRect(x0 + 18, y - 10, x1 - x0 - 36, 20, 10); c.fill();
      c.fillStyle = 'rgba(200,150,100,.25)'; c.fillRect(x0 + 24, y - 9, x1 - x0 - 48, 3);
      const typ = r % 4;
      for (let x = x0 + 32; x < x1 - 24; x += typ === 1 ? 24 : 18) {
        if (Math.hypot((x - 515) / 1.25, y - 382) < 58) continue;
        if (typ === 0) { // Karotten
          c.strokeStyle = '#4fae3a'; c.lineWidth = 1.6;
          for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x, y + 2); c.lineTo(x + k * 3, y - 9); c.stroke(); }
          c.fillStyle = '#ff8a1c'; c.beginPath(); c.arc(x, y + 3, 2.6, 0, TAU); c.fill();
        } else if (typ === 1) { // Salat
          for (let k = 3; k >= 1; k--) { c.fillStyle = ['', '#d8f59a', '#a8e070', '#7cc84e'][k]; c.beginPath(); c.arc(x, y, k * 3.4, 0, TAU); c.fill(); }
        } else if (typ === 2) { // Kohl
          c.fillStyle = '#5a9a7a'; c.beginPath(); c.arc(x, y, 8, 0, TAU); c.fill();
          c.strokeStyle = '#a8d8c0'; c.lineWidth = 1; for (let k = 0; k < 5; k++) { const a = k * 1.25; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); c.stroke(); }
          c.fillStyle = '#8fc8a8'; c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill();
        } else { // Erdbeeren
          c.fillStyle = '#3f9a3a'; for (let k = 0; k < 3; k++) { const a = k * 2.1; c.beginPath(); c.ellipse(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 4.5, 3, a, 0, TAU); c.fill(); }
          c.fillStyle = '#e8323c'; c.beginPath(); c.arc(x + 3, y + 3, 2.6, 0, TAU); c.fill(); c.beginPath(); c.arc(x - 4, y + 1, 2.2, 0, TAU); c.fill();
        }
      }
    }
    // Zaun
    c.strokeStyle = '#f2e6cc'; c.lineWidth = 3;
    c.beginPath(); c.roundRect(x0 - 6, y0 - 6, x1 - x0 + 12, y1 - y0 + 12, 16); c.stroke();
    c.strokeStyle = 'rgba(90,60,30,.35)'; c.lineWidth = 1; c.stroke();
    const post = (x, y) => { c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x - 1, y + 1, 7, 7); c.fillStyle = '#fff6e0'; c.fillRect(x - 3.5, y - 3.5, 7, 7); c.strokeStyle = '#a89070'; c.strokeRect(x - 3.5, y - 3.5, 7, 7); };
    for (let x = x0; x <= x1; x += 40) { post(x, y0 - 6); if (Math.abs(x - 640) > 30) post(x, y1 + 6); }
    for (let y = y0 + 34; y < y1; y += 40) { post(x0 - 6, y); post(x1 + 6, y); }
    // Tor (offen)
    c.fillStyle = '#d9c491'; c.fillRect(616, y1 - 2, 48, 14);
  }

  // Spielplatz der Menschen
  {
    const { x0, y0, x1, y1 } = PLATZ;
    const p = new Path2D(); p.roundRect(x0, y0, x1 - x0, y1 - y0, 60);
    c.save(); c.filter = 'blur(6px)'; c.fillStyle = 'rgba(160,140,80,.55)'; c.fill(p); c.restore();
    c.fillStyle = 'rgba(214,196,140,.55)'; c.fill(p);
    for (let i = 0; i < 600; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(150,120,70,.3)' : 'rgba(255,250,220,.35)'; c.beginPath(); c.arc(x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0), 1 + rnd(), 0, TAU); c.fill(); }
    // Sandkasten
    const sx = 160, sy = 1362, sw = 130, sh = 112;
    c.fillStyle = 'rgba(30,20,5,.3)'; c.fillRect(sx + 8, sy + 10, sw, sh);
    c.fillStyle = '#b07a42'; c.fillRect(sx, sy, sw, sh);
    c.fillStyle = 'rgba(255,220,170,.35)'; c.fillRect(sx, sy, sw, 3); c.fillRect(sx, sy, 3, sh);
    g = c.createRadialGradient(sx + 50, sy + 40, 5, sx + sw / 2, sy + sh / 2, 80); g.addColorStop(0, '#fbe6ad'); g.addColorStop(1, '#e5c682');
    c.fillStyle = g; c.fillRect(sx + 10, sy + 10, sw - 20, sh - 20);
    for (let i = 0; i < 80; i++) { c.fillStyle = 'rgba(170,130,70,.4)'; c.beginPath(); c.arc(sx + 12 + rnd() * (sw - 24), sy + 12 + rnd() * (sh - 24), 0.8 + rnd() * 1.2, 0, TAU); c.fill(); }
    // Sandburg
    c.fillStyle = 'rgba(120,80,30,.3)'; c.beginPath(); c.arc(sx + 48, sy + 50, 22, 0, TAU); c.fill();
    c.fillStyle = '#e2b866'; c.fillRect(sx + 28, sy + 30, 36, 36);
    for (const [dx, dy] of [[28, 30], [64, 30], [28, 66], [64, 66]]) { c.fillStyle = '#d8a850'; c.beginPath(); c.arc(sx + dx, sy + dy, 8, 0, TAU); c.fill(); c.fillStyle = '#f0cc80'; c.beginPath(); c.arc(sx + dx - 2, sy + dy - 2, 4, 0, TAU); c.fill(); }
    c.strokeStyle = '#666'; c.lineWidth = 1; c.beginPath(); c.moveTo(sx + 46, sy + 48); c.lineTo(sx + 46, sy + 30); c.stroke();
    c.fillStyle = '#e8323c'; c.beginPath(); c.moveTo(sx + 46, sy + 30); c.lineTo(sx + 56, sy + 34); c.lineTo(sx + 46, sy + 38); c.fill();
    // Eimer & Schaufel
    c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.arc(sx + 98, sy + 82, 12, 0, TAU); c.fill();
    c.fillStyle = '#e8323c'; c.beginPath(); c.arc(sx + 95, sy + 78, 12, 0, TAU); c.fill();
    c.fillStyle = '#b81e28'; c.beginPath(); c.arc(sx + 95, sy + 78, 8.5, 0, TAU); c.fill();
    c.strokeStyle = '#ffd34d'; c.lineWidth = 1.5; c.beginPath(); c.arc(sx + 95, sy + 78, 13, 3.6, 5.8); c.stroke();
    c.save(); c.translate(sx + 90, sy + 30); c.rotate(0.7);
    c.fillStyle = '#3d95f5'; c.fillRect(-2, -16, 4, 22); c.beginPath(); c.ellipse(0, 10, 7, 9, 0, 0, TAU); c.fill(); c.restore();
    // Schaukel
    const kx = 470, ky = 1400;
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
    // Bank
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(205, 1175, 90, 26);
    c.fillStyle = '#9a6030'; for (let k = 0; k < 4; k++) c.fillRect(200, 1168 + k * 6.5, 90, 5);
    c.fillStyle = '#555'; c.fillRect(206, 1166, 5, 26); c.fillRect(280, 1166, 5, 26);
  }

  // Das Haus der Menschen mit Fensterbrett (oben rechts)
  {
    const x0 = HAUS.x0, y1 = HAUS.y1, dy = HAUS.dach;
    g = c.createLinearGradient(0, y1, 0, y1 + 40); g.addColorStop(0, 'rgba(20,30,10,.4)'); g.addColorStop(1, 'rgba(20,30,10,0)');
    c.fillStyle = g; c.fillRect(x0, y1, W - x0, 40);
    // Beet vor der Wand
    for (let x = x0 + 100; x < W; x += 22) { if (x > 2085 && x < 2275) continue; c.fillStyle = '#3f8a34'; c.beginPath(); c.arc(x, y1 + 10, 11, 0, TAU); c.fill(); blume(c, x + 2, y1 + 6, 2.8, ['#ff5c8a', '#ffd34d', '#b07cff'][(x / 22) % 3 | 0]); }
    // Wand
    g = c.createLinearGradient(0, dy, 0, y1); g.addColorStop(0, '#e9d8b4'); g.addColorStop(1, '#f7ead0');
    c.fillStyle = g; c.fillRect(x0, dy, W - x0, y1 - dy);
    c.strokeStyle = 'rgba(160,130,90,.25)'; c.lineWidth = 1;
    for (let y = dy + 14; y < y1; y += 14) { c.beginPath(); c.moveTo(x0, y); c.lineTo(W, y); c.stroke(); }
    c.fillStyle = 'rgba(120,90,50,.25)'; c.fillRect(x0, dy, 10, y1 - dy);
    // Dach
    g = c.createLinearGradient(0, 0, 0, dy); g.addColorStop(0, '#9a3424'); g.addColorStop(1, '#c4553a');
    c.fillStyle = g; c.fillRect(x0 - 12, 0, W - x0 + 12, dy);
    for (let r = 0, y = 4; y < dy; r++, y += 17) {
      for (let x = x0 - 12 + (r % 2) * 13; x < W; x += 26) {
        c.fillStyle = (x * 7 + r * 3) % 5 < 1 ? '#b04a32' : '#cc5c40'; c.beginPath(); c.arc(x + 13, y + 6, 13, 0, Math.PI); c.fill();
        c.strokeStyle = 'rgba(80,20,10,.4)'; c.lineWidth = 1; c.stroke();
      }
    }
    c.fillStyle = '#6a2416'; c.fillRect(x0 - 14, dy - 6, W - x0 + 14, 10);
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x0 - 14, dy + 4, W - x0 + 14, 6);
    // Schornstein
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(2296, 52, 52, 46);
    c.fillStyle = '#9a4a3a'; c.fillRect(2288, 44, 50, 44);
    c.fillStyle = '#7a3428'; for (let y = 50; y < 88; y += 9) c.fillRect(2288, y, 50, 1.5);
    c.fillStyle = '#2a1a14'; c.fillRect(2296, 52, 34, 26);
    // Tür
    c.fillStyle = '#8a5a30'; c.beginPath(); c.roundRect(2018, 218, 58, y1 - 218, [26, 26, 0, 0]); c.fill();
    c.strokeStyle = '#5a3418'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = 'rgba(60,30,10,.45)'; c.lineWidth = 1.5; for (const x of [2032, 2047, 2062]) { c.beginPath(); c.moveTo(x, 232); c.lineTo(x, y1 - 4); c.stroke(); }
    c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(2066, 280, 3, 0, TAU); c.fill();
    c.fillStyle = '#bdb6a8'; c.fillRect(2010, y1, 74, 14); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(2010, y1, 74, 3);
    // Fenster mit Läden
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

  // Grashalme, Klee, Blumen, Steine
  c.lineCap = 'round';
  for (let i = 0; i < 16000; i++) {
    const x = rnd() * W, y = rnd() * H;
    if (!frei(x, y) && rnd() < 0.85) continue;
    const a = -Math.PI / 2 + (rnd() - 0.5) * 1.4, l = 3 + rnd() * 6;
    c.strokeStyle = rnd() < 0.55 ? 'rgba(40,100,30,.32)' : 'rgba(190,240,130,.28)'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
  }
  for (let i = 0; i < 160; i++) {
    const x = rnd() * W, y = rnd() * H;
    if (!frei(x, y)) continue;
    for (let k = 0; k < 3; k++) { c.fillStyle = 'rgba(60,140,50,.55)'; c.beginPath(); c.arc(x + Math.cos(k * 2.1) * 4, y + Math.sin(k * 2.1) * 4, 4, 0, TAU); c.fill(); }
  }
  const farben = ['#ff6b8b', '#ffd34d', '#ffffff', '#b07cff', '#5fb4ff', '#ff9f43'];
  for (let i = 0; i < 1100; i++) {
    let x, y;
    if (i < 380) { const a = rnd() * TAU, r = Math.sqrt(rnd()) * 175; x = 860 + Math.cos(a) * r * 1.15; y = 560 + Math.sin(a) * r * 0.9; }
    else { x = rnd() * W; y = rnd() * H; if (rnd() < 0.4) continue; }
    if (!frei(x, y)) continue;
    blume(c, x, y, 1.8 + rnd() * 1.8, farben[(rnd() * farben.length) | 0]);
  }
  for (let i = 0; i < 40; i++) { const x = rnd() * W, y = rnd() * H; if (frei(x, y) && Math.hypot(x - HX, y - HY) > RR) stein(c, x, y, 4 + rnd() * 9, 3 + rnd() * 7, rnd()); }
  // Kleine Büsche
  for (let i = 0; i < 70; i++) {
    const x = rnd() * W, y = rnd() * H;
    if (!frei(x, y) || inWald(x, y, 1.15) || Math.hypot(x - HX, y - HY) < RR + 40 || ORTE.some(o => Math.hypot(o.x - x, o.y - y) < 120)) continue;
    const r = 12 + rnd() * 12;
    c.fillStyle = 'rgba(12,40,14,.25)'; c.beginPath(); c.arc(x + r * 0.35, y + r * 0.45, r, 0, TAU); c.fill();
    for (let k = 0; k < 4; k++) { const a = rnd() * TAU, s = r * (0.5 + rnd() * 0.3); const gg = c.createRadialGradient(x + Math.cos(a) * r * 0.3 - s * 0.3, y + Math.sin(a) * r * 0.3 - s * 0.4, 1, x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, s); gg.addColorStop(0, '#78c860'); gg.addColorStop(1, '#2f6e2c'); c.fillStyle = gg; c.beginPath(); c.arc(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, s, 0, TAU); c.fill(); }
    if (rnd() < 0.4) for (let k = 0; k < 4; k++) { c.fillStyle = '#e8323c'; c.beginPath(); c.arc(x + (rnd() - 0.5) * r, y + (rnd() - 0.5) * r, 1.8, 0, TAU); c.fill(); }
    markiere(x, y, r);
  }

  // Wald & Bäume (zuerst alle Schatten, dann die Kronen von hinten nach vorn)
  const baeume = [];
  const ok = (x, y, r) => !baeume.some(b => Math.hypot(b[0] - x, b[1] - y) < (b[2] + r) * 0.62);
  for (let i = 0; i < 2600 && baeume.length < 260; i++) {
    const x = 1700 + rnd() * 760, y = 330 + rnd() * 1050, r = 26 + rnd() * 26;
    if (!inWald(x, y) || y < HAUS.y1 + 30 || ORTE.some(o => Math.hypot(o.x - x, o.y - y) < 90 + r) || !ok(x, y, r)) continue;
    baeume.push([x, y, r, rnd() < 0.55]);
  }
  // Einzelbäume am Kartenrand und auf der Wiese
  const rand = (x, y) => x < 110 || y < 110 || y > H - 110 || (x > W - 110 && y > HAUS.y1);
  for (let i = 0; i < 1600 && baeume.length < 340; i++) {
    const x = rnd() * W, y = rnd() * H, r = 30 + rnd() * 32;
    const amRand = rand(x, y);
    if (!amRand && rnd() < 0.975) continue;
    if (!frei(x, y) || inWald(x, y, 1.05) || Math.hypot(x - HX, y - HY) < RR + 90 || ORTE.some(o => Math.hypot(o.x - x, o.y - y) < 115 + r) || !ok(x, y, r)) continue;
    if (x > PLATZ.x0 - 40 && x < PLATZ.x1 + 40 && y > PLATZ.y0 - 40 && y < PLATZ.y1 + 40) continue;
    if (x > GARTEN.x0 - 50 && x < GARTEN.x1 + 50 && y > GARTEN.y0 - 50 && y < GARTEN.y1 + 50) continue;
    baeume.push([x, y, r, rnd() < 0.25]);
  }
  for (const [x, y, r] of baeume) baumSchatten(c, x, y, r);
  baeume.sort((a, b) => a[1] - b[1]);
  for (const [x, y, r, nadel] of baeume) (nadel ? nadelBaum : laubBaum)(c, rnd, x, y, r);
  // Waldpilze
  for (let i = 0; i < 14; i++) { const x = 1760 + rnd() * 600, y = 600 + rnd() * 600; if (inWald(x, y, 1.12) && !inWald(x, y, 0.92)) fliegenpilz(c, x, y, 4 + rnd() * 3); }
  return cv;
}

// ---------- Renderer ----------
export class WeltRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cam = { x: 0, y: 0, z: 0.6 };
    this.t = 0;
    this.hover = null;       // ORT unter dem Zeiger
    this.selected = null;    // ORT-id
    this.flugBereit = false; // geflügelte Prinzessin kreist ums Nest
    this.maxDpr = 1.5;
    this.cache = null;
    this.cacheKey = '';
    this.regenA = 0;
    this.regen = [];
    for (let i = 0; i < 160; i++) this.regen.push([Math.random(), Math.random(), 0.6 + Math.random() * 0.8]);
    document.fonts?.ready?.then(() => { this.cacheKey = ''; });
  }

  get vw() { return this.canvas.clientWidth || window.innerWidth; }
  get vh() { return this.canvas.clientHeight || window.innerHeight; }

  setState(state) {
    this.state = state;
    if (!this.base) this.base = makeBase();
    this.cacheKey = '';
    this.focusNest();
  }

  focusNest() {
    this.cam.z = Math.max(this.vw / W, this.vh / H) * 1.06;
    this.centerOn(HX, HY);
  }
  centerOn(wx, wy) { this.cam.x = wx - this.vw / 2 / this.cam.z; this.cam.y = wy - this.vh / 2 / this.cam.z; this.clampCam(); }
  clampCam() {
    const minZ = Math.max(this.vw / W, this.vh / H, 0.2);
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
  get ui() { return clamp(0.78 + this.cam.z * 0.32, 0.9, 1.2); }
  badgePos(o) {
    const [sx, sy] = this.worldToScreen(o.x, o.y);
    return [sx, sy - LM[o.biom].top * this.cam.z - 24 * this.ui];
  }

  /** Ort unter dem Zeiger (großzügige Trefferzone: Wahrzeichen oder Plakette) */
  ortAt(sx, sy) {
    let best = null, bd = Infinity;
    const z = this.cam.z, r = Math.max(36, 66 * z);
    for (const o of ORTE) {
      const [ox, oy] = this.worldToScreen(o.x, o.y);
      const [bx, by] = this.badgePos(o);
      const d = Math.min(Math.hypot(ox - sx, oy - sy) / r, Math.hypot(bx - sx, by - sy) / (28 * this.ui));
      if (d < 1 && d < bd) { bd = d; best = o; }
    }
    return best;
  }

  koloSig() {
    const s = this.state;
    return (s.welt?.kolonien ?? []).map(k => `${k.ort}:${kolonieGroesse(s, k)}`).join(',');
  }

  staticLayer() {
    const cw = this.canvas.width, ch = this.canvas.height;
    if (!this.cache || this.cache.width !== cw || this.cache.height !== ch) {
      this.cache = document.createElement('canvas'); this.cache.width = cw; this.cache.height = ch; this.cacheKey = '';
    }
    const key = `${this.cam.x.toFixed(2)}|${this.cam.y.toFixed(2)}|${this.cam.z.toFixed(4)}|${this.koloSig()}`;
    if (key === this.cacheKey) return this.cache;
    this.cacheKey = key;
    const c = this.cache.getContext('2d');
    const z = this.cam.z, k = cw / this.vw;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#3d6e2c'; c.fillRect(0, 0, cw, ch);
    c.setTransform(k * z, 0, 0, k * z, -this.cam.x * z * k, -this.cam.y * z * k);
    c.imageSmoothingQuality = 'medium';
    const x0 = clamp(Math.floor(this.cam.x), 0, W), y0 = clamp(Math.floor(this.cam.y), 0, H);
    const x1 = clamp(Math.ceil(this.cam.x + this.vw / z), 0, W), y1 = clamp(Math.ceil(this.cam.y + this.vh / z), 0, H);
    if (x1 > x0 && y1 > y0) c.drawImage(this.base, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
    c.imageSmoothingQuality = 'high';
    // Unser Revier: leuchtender Kreis
    const g = c.createRadialGradient(HX, HY, RR * 0.55, HX, HY, RR);
    g.addColorStop(0, 'rgba(255,240,170,0)'); g.addColorStop(0.85, 'rgba(255,236,150,.16)'); g.addColorStop(1, 'rgba(255,236,150,.32)');
    c.fillStyle = g; c.beginPath(); c.arc(HX, HY, RR, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,240,170,.28)'; c.lineWidth = 12; c.stroke();
    c.strokeStyle = 'rgba(255,244,190,.9)'; c.lineWidth = 2.5; c.setLineDash([10, 9]); c.stroke(); c.setLineDash([]);
    // Wahrzeichen
    for (const o of ORTE) {
      const S = LM[o.biom].s;
      c.drawImage(wahrzeichen(o.biom), o.x - S / 2, o.y - S / 2, S, S);
    }
    // Tochterkolonien
    for (const kol of this.state.welt?.kolonien ?? []) {
      const o = ORTE.find(x => x.id === kol.ort);
      if (!o) continue;
      const n = kolonieGroesse(this.state, kol), R = kolR(n), [kx, ky] = kolPos(o);
      c.drawImage(cached('weltKol|' + n, R * 3, R * 3, cc => huegel(cc, mulberry32(n * 31), R * 1.4, R * 1.4, R, 0.9), 3), kx - R * 1.4, ky - R * 1.4, R * 3, R * 3);
    }
    // Heimatnest
    c.drawImage(cached('weltHeim', 200, 200, cc => huegel(cc, mulberry32(9), 96, 96, 58, 1), 3), HX - 96, HY - 96, 200, 200);
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
    const t = this.t, ctx = this.ctx;
    const dpr = this.canvas.width / this.vw, z = this.cam.z;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.staticLayer(), 0, 0);
    const welt = () => ctx.setTransform(dpr * z, 0, 0, dpr * z, -this.cam.x * z * dpr, -this.cam.y * z * dpr);
    welt();
    const view = { x0: this.cam.x - 80, y0: this.cam.y - 80, x1: this.cam.x + this.vw / z + 80, y1: this.cam.y + this.vh / z + 80 };
    const inView = (x, y, m = 0) => x > view.x0 - m && x < view.x1 + m && y > view.y0 - m && y < view.y1 + m;
    const ph = d.tagPhase ?? 0.3;
    const night = ph > 0.7 ? clamp((ph - 0.7) / 0.08, 0, 1) * (ph > 0.96 ? clamp((1 - ph) / 0.04, 0, 1) : 1) : ph < 0.04 ? 0.3 * (1 - ph / 0.04) : 0;
    const dusk = ph > 0.6 && ph < 0.74 ? Math.sin(((ph - 0.6) / 0.14) * Math.PI) : 0;
    const kolonien = st.welt?.kolonien ?? [];

    // Wasser fließt & glitzert
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(220,245,255,.38)'; ctx.lineWidth = 2.2; ctx.setLineDash([5, 26]); ctx.lineDashOffset = -t * 34;
    ctx.stroke(BACH_P);
    ctx.lineDashOffset = -t * 26 + 13; ctx.strokeStyle = 'rgba(220,245,255,.2)';
    ctx.save(); ctx.translate(5, 6); ctx.stroke(BACH_P); ctx.restore();
    ctx.setLineDash([]);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 4; i < BACH.length; i += 9) {
      const [x, y] = BACH[i];
      if (!inView(x, y)) continue;
      const s = Math.sin(t * 2.6 + i * 1.37);
      if (s > 0.55) drawGlow(ctx, '255,255,255', x + Math.sin(i) * 8, y + Math.cos(i * 1.3) * 6, 5 + (s - 0.55) * 14, (s - 0.55) * 1.6);
    }
    for (let i = 0; i < 6; i++) {
      const s = Math.sin(t * 2.1 + i * 2.3);
      if (s > 0.5) drawGlow(ctx, '255,255,255', TEICH.x + Math.cos(i * 2.4) * TEICH.rx * 0.6, TEICH.y + Math.sin(i * 1.9) * TEICH.ry * 0.5, 6 + (s - 0.5) * 14, (s - 0.5) * 1.6);
    }
    // Sonnenflecken auf der Lichtung
    ctx.globalCompositeOperation = 'source-over';
    if (night < 0.5) drawGlow(ctx, '255,244,170', 1520 + Math.sin(t * 0.4) * 10, 640 + Math.cos(t * 0.3) * 8, 130, (0.16 + 0.05 * Math.sin(t * 1.3)) * (1 - night * 2));

    // Flugroute zum gewählten / überfahrenen Ort
    const sel = ORTE.find(o => o.id === this.selected) ?? null;
    const routen = [];
    if (sel) routen.push([sel, 1]);
    if (this.hover && this.hover !== sel) routen.push([this.hover, 0.6]);
    this.routeLabels = [];
    for (const [o, a] of routen) {
      const mx = (HX + o.x) / 2, my = (HY + o.y) / 2, len = Math.hypot(o.x - HX, o.y - HY);
      let nx = -(o.y - HY) / len, ny = (o.x - HX) / len;
      if (ny > 0) { nx = -nx; ny = -ny; }
      const cx = mx + nx * len * 0.22, cy = my + ny * len * 0.22;
      ctx.strokeStyle = `rgba(30,20,0,${0.22 * a})`; ctx.lineWidth = 5;
      ctx.setLineDash([2, 13]); ctx.lineDashOffset = -t * 30;
      ctx.beginPath(); ctx.moveTo(HX + 4, HY + 6); ctx.quadraticCurveTo(cx + 4, cy + 6, o.x + 4, o.y + 6); ctx.stroke();
      ctx.strokeStyle = `rgba(255,248,215,${0.95 * a})`; ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.moveTo(HX, HY); ctx.quadraticCurveTo(cx, cy, o.x, o.y); ctx.stroke();
      ctx.setLineDash([]);
      // kleine Prinzessin fliegt die Route ab
      const u = ((t * 0.22) % 1);
      const px = (1 - u) ** 2 * HX + 2 * (1 - u) * u * cx + u * u * o.x, py = (1 - u) ** 2 * HY + 2 * (1 - u) * u * cy + u * u * o.y;
      const ang = Math.atan2(2 * (1 - u) * (cy - HY) + 2 * u * (o.y - cy), 2 * (1 - u) * (cx - HX) + 2 * u * (o.x - cx));
      if (a === 1) this.drawFlieger(ctx, px, py, ang, t, 1.3, Math.sin(u * Math.PI));
      this.routeLabels.push([o, 0.49 * HX + 0.42 * cx + 0.09 * o.x, 0.49 * HY + 0.42 * cy + 0.09 * o.y, a]);
    }

    // Ausgewählter Ort: pulsierender Ring
    if (sel) {
      const p = (t * 0.8) % 1, R0 = LM[sel.biom].s * 0.36;
      ctx.strokeStyle = `rgba(255,214,90,${0.75 + 0.25 * Math.sin(t * 4)})`; ctx.lineWidth = 4;
      ctx.setLineDash([12, 8]); ctx.lineDashOffset = -t * 14;
      ctx.beginPath(); ctx.arc(sel.x, sel.y, R0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = `rgba(255,236,150,${0.7 * (1 - p)})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sel.x, sel.y, R0 + p * 40, 0, TAU); ctx.stroke();
    } else if (this.hover) {
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(this.hover.x, this.hover.y, LM[this.hover.biom].s * 0.36, 0, TAU); ctx.stroke();
    }

    // Wimmelnde Ameisen: ums Heimatnest und um jede Tochterkolonie
    const f = i => Math.floor(t * 10 + i) % 4;
    if (inView(HX, HY, RR)) {
      for (let i = 0; i < 16; i++) {
        const a0 = i * 2.39996, v = 0.08 + (i % 5) * 0.012;
        let u = (t * v + i * 0.37) % 2; const zurueck = u > 1; if (zurueck) u = 2 - u;
        const r = 62 + u * (RR - 78);
        const a = a0 + Math.sin(u * 3 + i) * 0.12;
        drawAnt(ctx, HX + Math.cos(a) * r, HY + Math.sin(a) * r, a + (zurueck ? Math.PI : 0), f(i));
      }
      for (let i = 0; i < 8; i++) { const a = t * 0.35 + (i / 8) * TAU; drawAnt(ctx, HX + Math.cos(a) * 66, HY + Math.sin(a) * 66, a + Math.PI / 2, f(i)); }
    }
    kolonien.forEach((kol, ki) => {
      const o = ORTE.find(x => x.id === kol.ort);
      if (!o) return;
      const [kx, ky] = kolPos(o), n = kolonieGroesse(st, kol), R = kolR(n);
      if (!inView(kx, ky, 60)) return;
      const anz = 3 + n * 2;
      for (let i = 0; i < anz; i++) {
        const dir = i % 2 ? 1 : -1, v = (0.5 + (i % 3) * 0.15) * dir;
        const a = t * v * (14 / (R + 10)) + (i / anz) * TAU, r = R + 6 + (i % 3) * 6 + Math.sin(t * 0.7 + i) * 3;
        drawAnt(ctx, kx + Math.cos(a) * r, ky + Math.sin(a) * r, a + (dir > 0 ? Math.PI / 2 : -Math.PI / 2), f(i), 0.9);
      }
      this.drawFlagge(ctx, kx + R * 0.15, ky - R * 0.2, FLAGGEN[ki % FLAGGEN.length], t + ki, 0.55 + n * 0.08);
    });
    this.drawFlagge(ctx, HX + 8, HY - 10, '#e8323c', t, 1.15, true);

    // Schmetterlinge
    const BF = [[860, 560, '#ff9ad5', '#ff5ca8'], [900, 520, '#ffd34d', '#ff9f1c'], [820, 600, '#8fd3ff', '#3d95f5'], [1520, 640, '#ffffff', '#ffd34d'], [1480, 680, '#ffb36b', '#ff6b3d'], [520, 380, '#d6b6ff', '#9a6cff'], [360, 1260, '#8fffd0', '#2ec4b6'], [1250, 770, '#fff3a0', '#ffc93c']];
    BF.forEach(([bx, by, c1, c2], i) => {
      const x = bx + Math.sin(t * 0.37 + i * 2) * 70 + Math.sin(t * 1.7 + i) * 14, y = by + Math.cos(t * 0.29 + i * 1.3) * 50 + Math.cos(t * 2.1 + i) * 10;
      if (!inView(x, y)) return;
      const flap = Math.abs(Math.sin(t * 13 + i * 1.7)), ang = Math.atan2(Math.cos(t * 0.29 + i * 1.3) * -14, Math.cos(t * 0.37 + i * 2) * 26) + Math.PI / 2;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(6, 10, 7 * flap + 2, 5, 0, 0, TAU); ctx.fill();
      for (const sd of [-1, 1]) {
        ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(sd * (4 * flap + 1), -2, 4.8 * flap + 0.8, 4.2, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = c2; ctx.beginPath(); ctx.ellipse(sd * (3 * flap + 1), 3.5, 3.4 * flap + 0.6, 3, 0, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#2a1a10'; ctx.fillRect(-0.8, -5, 1.6, 10);
      ctx.restore();
    });

    // Geflügelte Prinzessin kreist ums Nest, wenn der Hochzeitsflug bereit ist
    if (this.flugBereit) {
      const u = t * 0.7;
      const x = HX + Math.cos(u) * 110, y = HY - 20 + Math.sin(2 * u) * 46;
      const dx = -Math.sin(u) * 110, dy = Math.cos(2 * u) * 92;
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 1; k <= 5; k++) {
        const uu = u - k * 0.09;
        drawGlow(ctx, '255,220,120', HX + Math.cos(uu) * 110, HY - 20 + Math.sin(2 * uu) * 46, 10 - k, 0.5 - k * 0.08);
      }
      drawGlow(ctx, '255,226,140', x, y, 40, 0.55 + 0.15 * Math.sin(t * 5));
      ctx.globalCompositeOperation = 'source-over';
      this.drawFlieger(ctx, x, y, Math.atan2(dy, dx), t, 2, 1);
    }

    // Wolkenschatten
    for (let i = 0; i < 6; i++) {
      const x = ((t * 11 + i * 640) % (W + 900)) - 450, y = (i * 337 + 140) % H;
      if (inView(x, y, 300)) {
        drawGlow(ctx, '10,30,10', x, y, 230 + (i % 3) * 50, 0.16);
        drawGlow(ctx, '10,30,10', x + 140, y + 40, 160 + (i % 2) * 40, 0.12);
      }
    }
    // Rauch aus dem Schornstein
    for (let i = 0; i < 5; i++) {
      const p = (t * 0.25 + i / 5) % 1;
      drawGlow(ctx, '235,235,240', 2313 + p * 60 + Math.sin(p * 6 + t) * 8, 64 - p * 40, 12 + p * 26, 0.5 * (1 - p));
    }
    // Vögel (mit Schatten)
    for (let fl = 0; fl < 2; fl++) {
      const sp = fl ? 46 : 60, lx = ((t * sp + fl * 1400) % (W + 800)) - 400, ly = (fl ? 1180 : 360) + Math.sin(t * 0.2 + fl) * 60 - lx * (fl ? 0.25 : 0.12);
      for (let i = 0; i < (fl ? 3 : 5); i++) {
        const row = Math.ceil(i / 2), sd = i % 2 ? -1 : 1;
        const x = lx - row * 34, y = ly + sd * row * 26;
        if (!inView(x, y, 100)) continue;
        const span = 0.45 + 0.55 * Math.abs(Math.cos(t * 7 + i * 0.8 + fl * 2)), ang = Math.atan2(fl ? -0.25 : -0.12, 1);
        for (const sh of [1, 0]) {
          ctx.save(); ctx.translate(x + (sh ? 60 : 0), y + (sh ? 80 : 0)); ctx.rotate(ang); ctx.scale(1.3, 1.3);
          ctx.fillStyle = sh ? 'rgba(0,25,0,.15)' : '#3b3a4c';
          ctx.beginPath(); ctx.ellipse(0, 0, 7, 2.6, 0, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-11, -3); ctx.lineTo(-11, 3); ctx.fill();
          for (const sd of [-1, 1]) {
            ctx.beginPath(); ctx.moveTo(3, 0); ctx.quadraticCurveTo(2, sd * 9 * span, -5, sd * 18 * span); ctx.quadraticCurveTo(-3, sd * 8 * span, -3, 0); ctx.fill();
          }
          if (!sh) { ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.moveTo(7, -1); ctx.lineTo(10, 0); ctx.lineTo(7, 1); ctx.fill(); }
          ctx.restore();
        }
      }
    }

    // Tag/Nacht
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (dusk > 0.02) { ctx.fillStyle = `rgba(255,120,60,${dusk * 0.14})`; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); }
    if (night > 0.02) {
      ctx.fillStyle = `rgba(8,14,48,${night * 0.52})`; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      welt();
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, '255,170,80', HX, HY, 150, night * 0.35);
      kolonien.forEach(kol => { const o = ORTE.find(x => x.id === kol.ort); if (o) { const [kx, ky] = kolPos(o); drawGlow(ctx, '255,170,80', kx, ky, 70, night * 0.3); } });
      // Licht im Fenster der Menschen
      ctx.globalAlpha = night * 0.55; ctx.fillStyle = 'rgb(255,200,90)'; ctx.fillRect(2114, 206, 132, 72); ctx.globalAlpha = 1;
      drawGlow(ctx, '255,200,110', 2180, 300, 190, night * 0.4);
      for (let i = 0; i < 34; i++) {
        const x = ((i * 271.7 + Math.sin(t * 0.3 + i) * 70) % W + W) % W, y = ((i * 163.3 + Math.cos(t * 0.25 + i) * 60) % H + H) % H;
        if (inView(x, y)) drawGlow(ctx, '230,255,140', x, y, 12, night * (0.5 + 0.5 * Math.sin(t * 3 + i * 1.7)));
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // Regen
    this.regenA = clamp(this.regenA + (d.regen ? dt : -dt) / 2.5, 0, 1);
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
    ctx.fillStyle = 'rgba(40,25,5,.28)'; ctx.beginPath(); ctx.roundRect(x - ww / 2 + 1, y + 2.5, ww, hh, hh / 2 > 14 * u ? 12 * u : hh / 2); ctx.fill();
    ctx.fillStyle = stil.bg; ctx.beginPath(); ctx.roundRect(x - ww / 2, y, ww, hh, hh / 2 > 14 * u ? 12 * u : hh / 2); ctx.fill();
    ctx.strokeStyle = stil.rand; ctx.lineWidth = 1.5; ctx.stroke();
    zeilen.forEach((z, i) => {
      ctx.font = z.font; ctx.fillStyle = z.col;
      const lx = x - z.w / 2, ly = y + 4 * u + lh * (i + 0.5);
      ctx.fillText(z.text, lx, ly + 0.5);
      z.nach?.(lx + z.w - (z.extra ?? 0), ly);
    });
    return hh;
  }

  drawLabels(ctx, t, night) {
    const u = this.ui, z = this.cam.z, st = this.state;
    const vw = this.vw, vh = this.vh;
    // Heimatnest
    {
      const [sx, sy] = this.worldToScreen(HX, HY);
      const name = st.spieler?.koloniename ?? 'Unser Nest';
      this.pill(ctx, sx, sy + 66 * z + 4 * u, [{ text: '👑 ' + name, font: `700 ${14 * u}px ${FONT}`, col: '#3b2300' }], { bg: 'rgba(255,214,94,.96)', rand: 'rgba(160,100,0,.6)' });
    }
    // Routen-Schild
    for (const [o, mx, my, a] of this.routeLabels ?? []) {
      const [sx, sy] = this.worldToScreen(mx, my);
      ctx.globalAlpha = a;
      this.pill(ctx, sx, sy - 12 * u, [{ text: `🪽 ${DIST_NAME[o.entfernung]}`, font: `700 ${12 * u}px ${FONT}`, col: '#fff' }], { bg: 'rgba(60,45,120,.88)', rand: 'rgba(255,255,255,.5)' });
      ctx.globalAlpha = 1;
    }
    ORTE.forEach((o, i) => {
      const [sx, sy] = this.worldToScreen(o.x, o.y);
      if (sx < -120 || sy < -120 || sx > vw + 120 || sy > vh + 160) return;
      const kol = kolonieAn(st, o.id);
      const an = this.selected === o.id, hv = this.hover?.id === o.id;
      const s = u * (an ? 1.18 : hv ? 1.1 : 1);
      // Namensschild mit Entfernungspunkten
      const e = o.entfernung, dotR = 2.8 * u;
      const zeilen = [{
        text: o.name, font: `700 ${13 * u}px ${FONT}`, col: '#3a2614', extra: 8 * u + 4 * dotR * 2.6,
        nach: (x, y) => { for (let k = 0; k < 4; k++) { ctx.fillStyle = k < e ? DIST_FARBE[e] : 'rgba(80,50,20,.18)'; ctx.beginPath(); ctx.arc(x + 8 * u + dotR + k * dotR * 2.6, y, dotR, 0, TAU); ctx.fill(); } },
      }];
      if (kol) zeilen.push({ text: `🚩 ${kol.name}`, font: `700 ${12 * u}px ${FONT}`, col: '#1f6b30' });
      this.pill(ctx, sx, sy + LM[o.biom].bot * z + 2 * u, zeilen, an ? { bg: 'rgba(255,240,180,.98)', rand: '#ffb52e' } : { bg: 'rgba(255,250,236,.93)', rand: 'rgba(110,70,20,.3)' });
      // Plakette mit Symbol
      const [bx, by0] = this.badgePos(o), by = by0 + Math.sin(t * 2 + i * 1.3) * 3 * u;
      const r = 19 * s;
      ctx.fillStyle = 'rgba(30,20,5,.3)'; ctx.beginPath(); ctx.ellipse(bx + 2, by0 + r + 9 * u, r * 0.6, r * 0.22, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = an ? '#ffb52e' : '#fffaf0';
      ctx.beginPath(); ctx.moveTo(bx - r * 0.42, by + r * 0.8); ctx.lineTo(bx, by + r + 9 * s); ctx.lineTo(bx + r * 0.42, by + r * 0.8); ctx.fill();
      if (an) { ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, '255,210,90', bx, by, r * 2.4, 0.5 + 0.2 * Math.sin(t * 4)); ctx.globalCompositeOperation = 'source-over'; }
      ctx.fillStyle = an ? '#ffb52e' : '#fffaf0'; ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fill();
      ctx.lineWidth = 3.2 * s; ctx.strokeStyle = kol ? '#3cc455' : DIST_FARBE[e]; ctx.beginPath(); ctx.arc(bx, by, r - 1.6 * s, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, r - 4 * s, 0, TAU); ctx.fill();
      drawEmoji(ctx, o.icon, bx, by + 7.5 * s, 21 * s);
      if (kol) {
        const cx = bx + r * 0.75, cy = by - r * 0.75;
        ctx.fillStyle = '#3cc455'; ctx.beginPath(); ctx.arc(cx, cy, 8 * s, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2 * s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(cx - 3.6 * s, cy); ctx.lineTo(cx - 1 * s, cy + 2.8 * s); ctx.lineTo(cx + 3.8 * s, cy - 2.8 * s); ctx.stroke();
      }
    });
  }
}
