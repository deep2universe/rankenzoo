// Hochzeitsflug: Die junge, geflügelte Königin fliegt durch goldene Ringe zu ihrem
// neuen Nestplatz. Pseudo-3D-Flug (Kamera hinter und etwas über der Königin),
// alles prozedural auf <canvas> gezeichnet – keine Bilder.
//
//   openHochzeitsflug(game, { ringe, ringRadius, tempo, energie, wind, name, koloniename })
//     → Promise<{ erfolg, ringe, gesamt, punkte }>
import { h, clamp, lerp, rand, pick } from '../util.js';
import { openModal, konfetti, topModal } from './modal.js';
import { sfx } from '../audio.js';
import { drawGlow, cached } from '../render/sprites.js';
import { drawAnt } from '../render/antdraw.js';

const TAU = Math.PI * 2;
const DA = 4;          // Abstand Kamera → Königin (Welteinheiten)
const KF = 0.55;       // wie stark die Kamera der Königin folgt (0 = gar nicht, 1 = starr)
const XR = 4.2;        // seitlicher Spielraum der Königin
const YLO = 0.85, YHI = 4.7, YM = 2.75, YC = 3.35; // Flughöhen, Kamerahöhe in der Mitte
const SP = 14;         // Abstand der Ringe
const SICHT = 150;     // Sichtweite
const NAH = 0.35;      // nahe Schnittebene
const BAND = 4;        // Rasenstreifen-Breite
const RATE = 5.5;      // Folge-Tempo der Königin (1/s)
const EMAX = 100;
const PRO_RING = { plus: 9, minus: 6, zehren: 3 }; // Flugkraft pro Ring
const HUEGEL_R = 4.6, HUEGEL_H = 2.4;

const LOB = ['Super!', 'Klasse!', 'Toll!', 'Spitze!', 'Prima!', 'Wow!', 'Juhu!', 'Genau!'];
const FONT = '"Fredoka","Nunito","Segoe UI",system-ui,sans-serif';
const EMOJI = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';

const reduziert = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const easeOut = t => 1 - (1 - t) ** 3;
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// ---------- Farben ----------
const hex = c => { const v = parseInt(c.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
const mix = (a, b, t) => `rgb(${a[0] + (b[0] - a[0]) * t | 0},${a[1] + (b[1] - a[1]) * t | 0},${a[2] + (b[2] - a[2]) * t | 0})`;
const RASEN_A = hex('#8fd36a'), RASEN_B = hex('#7cc45a'), DUNST = hex('#d8ecd0');
const WASSER = hex('#5db8ea'), UFER = hex('#d9c88e');

// ---------- Fluss über die Wiese ----------
const flussX = z => 11 * Math.sin(z * 0.011 + 0.6) + 4 * Math.sin(z * 0.029 + 1.3);
const FLUSS_B = 1.5;

// ================================================================
//  Sprites der Wiese (einmal gemalt, danach nur skaliert kopiert)
// ================================================================
const BLUMEN = [
  ['#ffffff', '#ffd23c'], ['#ff8fb8', '#ffe066'], ['#ffd93c', '#ff9f1c'], ['#9b8cff', '#fff3a0'], ['#ff5a5a', '#3a2016'], ['#6fc3ff', '#ffffff'],
];
function spriteBlume(v) {
  const [blatt, mitte] = BLUMEN[v % BLUMEN.length];
  return cached('flug-blume' + v, 0.5, 0.66, x => {
    x.lineCap = 'round';
    x.strokeStyle = '#3f8f35'; x.lineWidth = 0.035;
    x.beginPath(); x.moveTo(0.25, 0.66); x.quadraticCurveTo(0.22, 0.4, 0.25, 0.2); x.stroke();
    x.fillStyle = '#4fa63f';
    x.beginPath(); x.ellipse(0.32, 0.48, 0.08, 0.03, -0.6, 0, TAU); x.fill();
    x.beginPath(); x.ellipse(0.17, 0.54, 0.07, 0.025, 0.6, 0, TAU); x.fill();
    const n = v === 4 ? 4 : 6, pr = v === 4 ? 0.1 : 0.075;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      x.fillStyle = blatt;
      x.beginPath(); x.ellipse(0.25 + Math.cos(a) * 0.09, 0.18 + Math.sin(a) * 0.09, pr, pr * 0.62, a, 0, TAU); x.fill();
    }
    x.fillStyle = 'rgba(0,0,0,.08)';
    x.beginPath(); x.arc(0.25, 0.2, 0.06, 0, TAU); x.fill();
    x.fillStyle = mitte;
    x.beginPath(); x.arc(0.25, 0.18, 0.055, 0, TAU); x.fill();
  }, 150);
}
function spriteGras(v) {
  return cached('flug-gras' + v, 0.7, 0.5, x => {
    x.lineCap = 'round';
    const farben = ['#4f9e3a', '#5cb045', '#3e8a2e', '#6cc052'];
    for (let i = 0; i < 9; i++) {
      const bx = 0.18 + i * 0.042 + Math.sin(i * 7 + v) * 0.02;
      const hgt = 0.25 + ((i * 37 + v * 11) % 10) / 40;
      const lean = Math.sin(i * 3.1 + v * 1.7) * 0.12;
      x.strokeStyle = farben[(i + v) % farben.length]; x.lineWidth = 0.035;
      x.beginPath(); x.moveTo(bx, 0.5); x.quadraticCurveTo(bx + lean * 0.3, 0.5 - hgt * 0.6, bx + lean, 0.5 - hgt); x.stroke();
    }
  }, 120);
}
function spriteStein(v) {
  return cached('flug-stein' + v, 0.7, 0.36, x => {
    const g = x.createLinearGradient(0, 0.05, 0, 0.36);
    g.addColorStop(0, v ? '#d6d0c4' : '#c9c2b4'); g.addColorStop(1, '#8e8778');
    x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.ellipse(0.35, 0.33, 0.3, 0.04, 0, 0, TAU); x.fill();
    x.fillStyle = g; x.beginPath(); x.ellipse(0.35, 0.22, 0.27, 0.13, 0, Math.PI, 0); x.lineTo(0.62, 0.33); x.lineTo(0.08, 0.33); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(0.27, 0.15, 0.08, 0.03, -0.2, 0, TAU); x.fill();
    x.fillStyle = '#6fae4f'; x.beginPath(); x.ellipse(0.5, 0.31, 0.08, 0.03, 0, 0, TAU); x.fill();
  }, 120);
}
function spritePilz() {
  return cached('flug-pilz', 0.5, 0.5, x => {
    x.fillStyle = '#fff4e2'; x.beginPath(); x.roundRect(0.2, 0.22, 0.1, 0.28, 0.04); x.fill();
    const g = x.createRadialGradient(0.2, 0.12, 0.02, 0.25, 0.22, 0.24);
    g.addColorStop(0, '#ff7a6a'); g.addColorStop(1, '#d42c2c');
    x.fillStyle = g; x.beginPath(); x.ellipse(0.25, 0.25, 0.22, 0.17, 0, Math.PI, 0); x.closePath(); x.fill();
    x.fillStyle = '#fff';
    for (const [a, b, r] of [[0.16, 0.16, 0.03], [0.28, 0.11, 0.035], [0.35, 0.19, 0.025], [0.22, 0.21, 0.02]]) { x.beginPath(); x.arc(a, b, r, 0, TAU); x.fill(); }
  }, 150);
}
function spriteBusch(v) {
  return cached('flug-busch' + v, 2, 1.2, x => {
    x.fillStyle = 'rgba(0,0,0,.15)'; x.beginPath(); x.ellipse(1, 1.15, 0.85, 0.08, 0, 0, TAU); x.fill();
    const blobs = [[0.55, 0.8, 0.38], [1.0, 0.62, 0.48], [1.45, 0.82, 0.36], [0.8, 0.9, 0.32], [1.25, 0.95, 0.3]];
    for (const [bx, by, r] of blobs) {
      const g = x.createRadialGradient(bx - r * 0.3, by - r * 0.4, r * 0.1, bx, by, r);
      g.addColorStop(0, v ? '#8fd46a' : '#7cc95e'); g.addColorStop(1, v ? '#3f8f35' : '#367f2e');
      x.fillStyle = g; x.beginPath(); x.arc(bx, by, r, 0, TAU); x.fill();
    }
    if (v) for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? '#ff6b6b' : '#ffffff'; x.beginPath(); x.arc(0.5 + i * 0.18, 0.55 + Math.sin(i * 2) * 0.2, 0.045, 0, TAU); x.fill(); }
  }, 70);
}
function spriteBaum(v) {
  return cached('flug-baum' + v, 5, 7, x => {
    x.fillStyle = 'rgba(0,0,0,.16)'; x.beginPath(); x.ellipse(2.5, 6.9, 1.8, 0.16, 0, 0, TAU); x.fill();
    const st = x.createLinearGradient(2.2, 0, 2.8, 0);
    st.addColorStop(0, '#7a5232'); st.addColorStop(1, '#5a3a20');
    x.fillStyle = st;
    x.beginPath(); x.moveTo(2.2, 6.95); x.lineTo(2.35, 3.5); x.lineTo(2.65, 3.5); x.lineTo(2.8, 6.95); x.closePath(); x.fill();
    const kronen = v === 1
      ? [[2.5, 1.6, 1.3], [1.6, 2.6, 1.1], [3.4, 2.6, 1.1], [2.5, 3.2, 1.2]]
      : v === 2
        ? [[2.5, 0.9, 0.8], [2.5, 2.0, 1.15], [2.5, 3.3, 1.45]]
        : [[2.5, 1.8, 1.5], [1.4, 2.9, 1.1], [3.6, 2.9, 1.1], [2.1, 3.6, 1.0], [3.0, 3.5, 1.0]];
    const hell = v === 2 ? '#7fcf7a' : '#9ad86a', dunkel = v === 2 ? '#2e7a43' : '#3d8a32';
    for (const [bx, by, r] of kronen) {
      const g = x.createRadialGradient(bx - r * 0.35, by - r * 0.45, r * 0.1, bx, by, r * 1.05);
      g.addColorStop(0, hell); g.addColorStop(1, dunkel);
      x.fillStyle = g; x.beginPath(); x.arc(bx, by, r, 0, TAU); x.fill();
    }
    if (v === 0) for (let i = 0; i < 7; i++) { x.fillStyle = '#ff5a5a'; x.beginPath(); x.arc(1.4 + (i * 0.47) % 2.4, 1.4 + ((i * 1.3) % 2.2), 0.13, 0, TAU); x.fill(); }
  }, 36);
}
function spriteHuegel() {
  const W = HUEGEL_R * 2 + 1, H = HUEGEL_H + 0.6;
  return cached('flug-huegel', W, H, x => {
    const cx = W / 2, by = HUEGEL_H + 0.3;
    x.fillStyle = 'rgba(40,60,20,.25)'; x.beginPath(); x.ellipse(cx, by, HUEGEL_R + 0.3, 0.25, 0, 0, TAU); x.fill();
    const kuppel = () => {
      x.beginPath(); x.moveTo(cx - HUEGEL_R, by);
      x.bezierCurveTo(cx - HUEGEL_R * 0.7, by - HUEGEL_H * 0.75, cx - HUEGEL_R * 0.4, by - HUEGEL_H, cx, by - HUEGEL_H);
      x.bezierCurveTo(cx + HUEGEL_R * 0.4, by - HUEGEL_H, cx + HUEGEL_R * 0.7, by - HUEGEL_H * 0.75, cx + HUEGEL_R, by);
      x.closePath();
    };
    const g = x.createRadialGradient(cx - 1.2, by - HUEGEL_H * 0.9, 0.2, cx, by - 0.6, HUEGEL_R * 1.1);
    g.addColorStop(0, '#d39a5c'); g.addColorStop(0.55, '#a8703f'); g.addColorStop(1, '#6d4424');
    x.fillStyle = g; kuppel(); x.fill();
    x.save(); kuppel(); x.clip();
    // Tannennadeln & Zweiglein
    let sd = 7;
    const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    x.lineCap = 'round';
    for (let i = 0; i < 520; i++) {
      const px = cx + (r() * 2 - 1) * HUEGEL_R, py = by - r() * HUEGEL_H;
      const a = r() * Math.PI, l = 0.12 + r() * 0.18;
      x.strokeStyle = ['#5a3519', '#c48a50', '#7d5129', '#e0b070', '#4a2c14'][(r() * 5) | 0];
      x.globalAlpha = 0.55; x.lineWidth = 0.03;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l * 0.5); x.stroke();
    }
    x.globalAlpha = 1;
    x.restore();
    // Eingänge
    for (const [ex, ey, er] of [[cx - 1.4, by - 0.55, 0.32], [cx + 1.8, by - 0.35, 0.24], [cx + 0.2, by - 1.6, 0.2]]) {
      x.fillStyle = 'rgba(255,220,160,.35)'; x.beginPath(); x.ellipse(ex, ey - 0.03, er * 1.25, er * 0.85, 0, 0, TAU); x.fill();
      x.fillStyle = '#2a170a'; x.beginPath(); x.ellipse(ex, ey, er, er * 0.65, 0, 0, TAU); x.fill();
    }
    // Gras & Blumen am Fuß
    x.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const px = cx - HUEGEL_R - 0.2 + (i / 45) * (HUEGEL_R * 2 + 0.4);
      const hh = 0.18 + r() * 0.25;
      x.strokeStyle = ['#4f9e3a', '#6cc052', '#3e8a2e'][i % 3]; x.lineWidth = 0.05;
      x.beginPath(); x.moveTo(px, by + 0.05); x.lineTo(px + (r() - 0.5) * 0.15, by - hh); x.stroke();
    }
    for (let i = 0; i < 9; i++) {
      const px = cx - HUEGEL_R + 0.3 + r() * (HUEGEL_R * 2 - 0.6);
      x.fillStyle = ['#fff', '#ffd93c', '#ff8fb8', '#9b8cff'][i % 4];
      for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; x.beginPath(); x.arc(px + Math.cos(a) * 0.07, by - 0.12 + Math.sin(a) * 0.07, 0.055, 0, TAU); x.fill(); }
      x.fillStyle = '#ffb020'; x.beginPath(); x.arc(px, by - 0.12, 0.045, 0, TAU); x.fill();
    }
  }, 64);
}
function wolkenSprite(v) {
  return cached('flug-wolke' + v, 320, 140, x => {
    let sd = 11 + v * 31;
    const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const blobs = [];
    const n = 6 + v * 2;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const bx = 50 + t * 220 + (r() - 0.5) * 20;
      const rad = 26 + Math.sin(t * Math.PI) * 30 + r() * 12;
      blobs.push([bx, 112 - rad * 0.75, rad]);
    }
    // weicher Schatten unten
    x.fillStyle = 'rgba(160,190,225,.55)';
    for (const [bx, by, rad] of blobs) { x.beginPath(); x.arc(bx, by + 8, rad, 0, TAU); x.fill(); }
    for (const [bx, by, rad] of blobs) {
      const g = x.createRadialGradient(bx - rad * 0.3, by - rad * 0.5, rad * 0.1, bx, by, rad);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#eef4ff');
      x.fillStyle = g; x.beginPath(); x.arc(bx, by, rad, 0, TAU); x.fill();
    }
    x.fillStyle = 'rgba(255,255,255,.9)';
    x.beginPath(); x.roundRect(40, 96, 240, 22, 11); x.fill();
  }, 1);
}

// ================================================================
//  Die Königin von hinten
// ================================================================
function fluegel(ctx, side, L, breite, winkel, alpha) {
  // Gelenk im Ursprung, Flügel zeigt nach "side" (−1 links, 1 rechts)
  ctx.save();
  ctx.rotate(-side * winkel);
  ctx.scale(side, 1);
  ctx.globalAlpha *= alpha;
  const g = ctx.createLinearGradient(0, 0, L, 0);
  g.addColorStop(0, 'rgba(255,255,255,.82)');
  g.addColorStop(0.45, 'rgba(225,240,255,.55)');
  g.addColorStop(0.8, 'rgba(255,225,245,.45)');
  g.addColorStop(1, 'rgba(210,255,235,.35)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(L * 0.25, -breite * 1.15, L * 0.85, -breite * 1.05, L, -breite * 0.15);
  ctx.bezierCurveTo(L * 1.03, breite * 0.4, L * 0.7, breite * 0.85, L * 0.35, breite * 0.6);
  ctx.quadraticCurveTo(L * 0.12, breite * 0.4, 0, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,150,190,.75)';
  ctx.lineWidth = 0.008;
  ctx.stroke();
  // Adern
  ctx.strokeStyle = 'rgba(110,80,50,.38)';
  ctx.lineWidth = 0.006;
  ctx.beginPath();
  ctx.moveTo(0.01, -0.005); ctx.quadraticCurveTo(L * 0.45, -breite * 0.75, L * 0.9, -breite * 0.35);
  ctx.moveTo(0.02, 0.005); ctx.quadraticCurveTo(L * 0.4, -breite * 0.05, L * 0.75, breite * 0.25);
  ctx.moveTo(L * 0.3, -breite * 0.5); ctx.lineTo(L * 0.42, breite * 0.25);
  ctx.stroke();
  // Flügelmal
  ctx.fillStyle = 'rgba(120,70,30,.5)';
  ctx.beginPath(); ctx.ellipse(L * 0.55, -breite * 0.68, L * 0.06, breite * 0.12, 0.1, 0, TAU); ctx.fill();
  ctx.restore();
}

/** Königin von hinten/oben. s = Pixel pro Welteinheit, o = {bank, flap, amp, t, pitch} */
function drawKoenigin(ctx, x, y, s, o) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.bank);
  ctx.scale(s * 1.18, s * 1.18);
  const t = o.t;
  const amp = o.amp;
  // ---- Flügel (hinten zuerst) ----
  const schlag = Math.sin(o.flap);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 0.055, -0.2);
    const ruhe = 0.2 - (1 - amp) * 0.9; // ruhig: Flügel schräg nach unten angelegt
    // Bewegungsunschärfe: Nachbilder
    const lagen = amp > 0.3 ? [[-0.55, 0.22], [-0.28, 0.4], [0, 1]] : [[0, 1]];
    for (const [ph, al] of lagen) {
      const sw = Math.sin(o.flap + ph * amp);
      const w = ruhe + sw * 0.75 * amp;
      fluegel(ctx, side, 0.36, 0.075 * (0.7 + 0.3 * Math.abs(Math.cos(o.flap + ph))), w - 0.32, al * 0.85); // Hinterflügel
    }
    for (const [ph, al] of lagen) {
      const sw = Math.sin(o.flap + ph * amp + 0.25);
      const w = ruhe + sw * 0.8 * amp;
      fluegel(ctx, side, 0.5, 0.1 * (0.65 + 0.35 * Math.abs(Math.cos(o.flap + ph))), w, al);
    }
    ctx.restore();
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // ---- Beine (angezogen, baumeln leicht) ----
  ctx.strokeStyle = '#3d2117';
  ctx.lineWidth = 0.022;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const bau = Math.sin(t * 3 + i * 1.7 + side) * 0.015 * (o.landen ? 0 : 1);
      const ax = side * 0.05, ay = -0.15 + i * 0.03;
      const kx = side * (0.13 + i * 0.012), ky = -0.12 + i * 0.045 + bau;
      const fx = side * (o.landen ? 0.17 + i * 0.03 : 0.12 + i * 0.03), fy = (o.landen ? 0.08 + i * 0.05 : -0.02 + i * 0.065) + bau * 2;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    }
  }
  // ---- Kopf ----
  const kopfY = -0.33 - (o.pitch ?? 0) * 0.03;
  const kg = ctx.createRadialGradient(-0.03, kopfY - 0.04, 0.01, 0, kopfY, 0.11);
  kg.addColorStop(0, '#c4673a'); kg.addColorStop(0.5, '#8a3a1e'); kg.addColorStop(1, '#4e1f0f');
  // Fühler
  ctx.strokeStyle = '#6b2c15'; ctx.lineWidth = 0.018;
  for (const side of [-1, 1]) {
    const w = Math.sin(t * 4 + side) * 0.012;
    const ex = side * 0.13, ey = -0.5 + w;
    ctx.beginPath(); ctx.moveTo(side * 0.035, kopfY - 0.07); ctx.lineTo(ex, ey); ctx.lineTo(side * 0.2, ey - 0.03 - w); ctx.stroke();
    ctx.fillStyle = '#6b2c15'; ctx.beginPath(); ctx.arc(side * 0.2, ey - 0.03 - w, 0.017, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = kg;
  ctx.beginPath(); ctx.ellipse(0, kopfY, 0.1, 0.092, 0, 0, TAU); ctx.fill();
  // Augen schauen seitlich hervor
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#1a0d08'; ctx.beginPath(); ctx.ellipse(side * 0.088, kopfY - 0.005, 0.026, 0.036, side * 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(side * 0.092, kopfY - 0.02, 0.008, 0, TAU); ctx.fill();
  }
  // Krone
  ctx.save();
  ctx.translate(0, kopfY - 0.075);
  const cg = ctx.createLinearGradient(0, -0.08, 0, 0.01);
  cg.addColorStop(0, '#fff3a6'); cg.addColorStop(1, '#e0a400');
  ctx.fillStyle = cg; ctx.strokeStyle = '#a06c00'; ctx.lineWidth = 0.008;
  ctx.beginPath();
  ctx.moveTo(-0.06, 0.01); ctx.lineTo(-0.065, -0.05); ctx.lineTo(-0.032, -0.025); ctx.lineTo(0, -0.07);
  ctx.lineTo(0.032, -0.025); ctx.lineTo(0.065, -0.05); ctx.lineTo(0.06, 0.01); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff4f7a'; ctx.beginPath(); ctx.arc(0, -0.018, 0.012, 0, TAU); ctx.fill();
  ctx.restore();
  // ---- Brust ----
  const bg = ctx.createRadialGradient(-0.035, -0.22, 0.01, 0, -0.18, 0.13);
  bg.addColorStop(0, '#e08a52'); bg.addColorStop(0.5, '#a8461f'); bg.addColorStop(1, '#5e2410');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(0, -0.18, 0.105, 0.095, 0, 0, TAU); ctx.fill();
  // Stielchen
  ctx.fillStyle = '#6a2c14';
  ctx.beginPath(); ctx.ellipse(0, -0.075, 0.045, 0.035, 0, 0, TAU); ctx.fill();
  // ---- Hinterleib ----
  const hg = ctx.createRadialGradient(-0.05, -0.01, 0.01, 0, 0.06, 0.2);
  hg.addColorStop(0, '#8a5236'); hg.addColorStop(0.45, '#4a2a1a'); hg.addColorStop(1, '#1f100a');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.ellipse(0, 0.06, 0.155, 0.17, 0, 0, TAU); ctx.fill();
  // Streifen (Segmente)
  ctx.strokeStyle = 'rgba(255,220,180,.16)'; ctx.lineWidth = 0.012;
  for (const k of [-0.04, 0.03, 0.1]) {
    ctx.beginPath(); ctx.ellipse(0, k, 0.15 * Math.sqrt(1 - ((k - 0.06) / 0.18) ** 2), 0.04, 0, 0.15, Math.PI - 0.15); ctx.stroke();
  }
  // Glanzlicht + Sonnenkante
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ctx.beginPath(); ctx.ellipse(-0.06, -0.01, 0.04, 0.06, 0.35, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,120,.45)'; ctx.lineWidth = 0.01;
  ctx.beginPath(); ctx.ellipse(0, 0.06, 0.15, 0.165, 0, -1.3, -0.2); ctx.stroke();
  ctx.restore();
}

// ================================================================
//  Strecke
// ================================================================
function bauRoute(o) {
  const d = clamp((o.ringe - 15) / 15, 0, 1);
  const A = 1.9 + 1.4 * d, B = 0.55 + 0.6 * d;
  const p1 = rand(0, TAU), p2 = rand(0, TAU), p3 = rand(0, TAU);
  const w1 = TAU / (SP * (5.4 - 1.4 * d)), w2 = TAU / (SP * 2.6), w3 = TAU / (SP * (4.2 - d));
  const R = 1.25 * o.ringRadius;
  const ringe = [];
  for (let i = 0; i < o.ringe; i++) {
    const z = 34 + i * SP;
    const ramp = Math.min(1, i / 3);
    const x = clamp(A * ramp * (0.7 * Math.sin(z * w1 + p1) + 0.3 * (0.4 + d) * Math.sin(z * w2 + p2)), -(XR - 0.5), XR - 0.5);
    const y = clamp(YM - 0.15 + B * ramp * Math.sin(z * w3 + p3), 1.55, 3.95);
    ringe.push({ z, x, y, r: R, status: 0, blitz: 0, nr: i + 1 });
  }
  return { ringe, d, zEnde: ringe[ringe.length - 1].z + 32 };
}

// ================================================================
//  Hauptfunktion
// ================================================================
export function openHochzeitsflug(game, opts = {}) {
  const opt = {
    ringe: clamp(Math.round(opts.ringe ?? 20), 3, 60),
    ringRadius: clamp(opts.ringRadius ?? 1, 0.4, 1.6),
    tempo: clamp(opts.tempo ?? 1, 0.6, 1.8),
    energie: clamp(opts.energie ?? 1, 0.5, 2),
    wind: !!opts.wind,
    name: opts.name ?? 'Sonnige Lichtung',
    koloniename: opts.koloniename,
  };
  const vMax = 10 * opt.tempo;
  const E0 = clamp(60 * opt.energie, 30, EMAX);
  const rm = reduziert();

  return new Promise(resolve => {
    let fertig = false;
    let S = null;
    const ergebnis = () => ({ erfolg: !!S?.erfolg, ringe: S?.hits ?? 0, gesamt: opt.ringe, punkte: S?.punkte ?? 0 });
    const finish = () => { if (fertig) return; fertig = true; resolve(ergebnis()); };

    // ---------- DOM ----------
    const canvas = h('canvas.flug-canvas');
    const ctx = canvas.getContext('2d');
    const el = {};
    const hud = h('div.flug-hud',
      h('div.flug-oben',
        el.energie = h('div.flug-panel.flug-energie',
          h('span.flug-ic', '⚡'),
          h('div.flug-energie-txt', h('small', 'Flugkraft'),
            h('div.flug-track', el.energieFill = h('i')))),
        el.ringe = h('div.flug-panel.flug-ringzahl', h('span.flug-ring-ic'), el.ringTxt = h('b', `0 / ${opt.ringe}`)),
        h('div.flug-rechts',
          el.serie = h('div.flug-panel.flug-serie', '🔥 ', el.serieTxt = h('b', '')),
          el.wind = h('div.flug-panel.flug-wind', '🍃 ', el.windTxt = h('b', 'Windböe!')))),
      h('div.flug-weg',
        h('span.flug-weg-em', { title: 'Dein Nest' }, '🏠'),
        h('div.flug-weg-track', el.wegFill = h('i'), el.wegAnt = h('span.flug-weg-ant', '👑')),
        h('span.flug-weg-em', '🏁'),
        h('span.flug-weg-name', opt.name)),
    );
    const banner = h('div.flug-banner');
    const ebene = h('div.flug-ebene');
    const buehne = h('div.flug-buehne', canvas, hud, banner, ebene);

    const m = openModal({
      titel: 'Hochzeitsflug', unter: `Die junge Königin fliegt nach ${opt.name}`, icon: '👑', klasse: 'flug-modal',
      farbe: ['#ff9f1c', '#ffc93c'], inhalt: buehne, onClose: () => aufraeumen(),
    });
    game?.pause?.(true);
    let aufgeraeumt = false;
    function aufraeumen() {
      if (aufgeraeumt) return;
      aufgeraeumt = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
      ro?.disconnect();
      if (window.__flug === debug) delete window.__flug;
      game?.pause?.(false);
      finish();
    }

    // ---------- Größe ----------
    let W = 800, H = 500, dpr = 1, F = 500, cx = 400, cyH = 200, antMidY = 300;
    function resize() {
      const r = buehne.getBoundingClientRect();
      W = Math.max(200, r.width); H = Math.max(200, r.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      F = Math.min(0.91 * W, 1.2 * H);
      cx = W / 2;
      antMidY = H * 0.56;
      cyH = antMidY - (YC - YM) * F / DA;
    }
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resize()) : null;
    ro?.observe(buehne);
    resize();

    // ---------- Szene ----------
    const wolken = Array.from({ length: 7 }, (_, i) => ({ x: Math.random(), y: rand(0.15, 0.85), sc: rand(0.55, 1.15), v: i % 3, speed: rand(5, 14), par: rand(0.2, 0.6) }));
    function spawnObj(o, z) {
      const r = Math.random();
      o.z = z;
      o.sc = rand(0.85, 1.25);
      if (r < 0.1) { o.typ = 'baum'; o.x = (Math.random() < 0.5 ? -1 : 1) * rand(8.5, 24); o.v = (Math.random() * 3) | 0; o.sc = rand(0.75, 1.3); }
      else if (r < 0.17) { o.typ = 'busch'; o.x = rand(-18, 18); o.v = (Math.random() * 2) | 0; }
      else if (r < 0.5) { o.typ = 'blume'; o.x = rand(-14, 14); o.v = (Math.random() * BLUMEN.length) | 0; }
      else if (r < 0.88) { o.typ = 'gras'; o.x = rand(-14, 14); o.v = (Math.random() * 4) | 0; }
      else if (r < 0.95) { o.typ = 'stein'; o.x = rand(-14, 14); o.v = (Math.random() * 2) | 0; }
      else { o.typ = 'pilz'; o.x = rand(-12, 12); o.v = 0; }
      const fx = flussX(z);
      const brauch = FLUSS_B + (o.typ === 'baum' ? 2.5 : o.typ === 'busch' ? 1.4 : 0.6);
      if (Math.abs(o.x - fx) < brauch) o.x = fx + Math.sign(o.x - fx || 1) * (brauch + rand(0, 1));
      return o;
    }
    const OBJ_SIZE = { baum: [5, 7], busch: [2, 1.2], blume: [0.5, 0.66], gras: [0.7, 0.5], stein: [0.7, 0.36], pilz: [0.5, 0.5] };
    const objSprite = o => o.typ === 'baum' ? spriteBaum(o.v) : o.typ === 'busch' ? spriteBusch(o.v) : o.typ === 'blume' ? spriteBlume(o.v)
      : o.typ === 'gras' ? spriteGras(o.v) : o.typ === 'stein' ? spriteStein(o.v) : spritePilz();

    function neuerFlug(mitIntro) {
      const route = bauRoute(opt);
      S = {
        phase: mitIntro ? 'intro' : 'countdown', t: 0, pt: 0, camZ: 0, camX: 0, camY: YC, v: 0,
        ax: 0, ay: YM - 0.15, tx: 0, ty: YM - 0.15, antZ: DA, vx: 0, vy: 0, bank: 0, pitch: 0,
        flap: 0, amp: 1, E: E0, ringe: route.ringe, d: route.d, zEnde: route.zEnde, idx: 0,
        hits: 0, serie: 0, beste: 0, punkte: 0, erfolg: false,
        wind: { cur: 0, ziel: 0, t: rand(4, 7), ph: 0, dir: 1 },
        punch: 0, blitz: 0, shake: 0, gDz: DA, ringAlpha: 1, texte: [], teile: [], zaehler: 3, ruht: false, arbeiter: [],
        objs: [], pollen: [], ziel: null,
      };
      for (let i = 0; i < 150; i++) S.objs.push(spawnObj({}, rand(NAH + 1, SICHT)));
      for (let i = 0; i < 36; i++) S.pollen.push({ x: rand(-9, 9), y: rand(0.3, 7), z: rand(1, 60), g: Math.random() });
      banner.className = 'flug-banner';
      buehne.classList.remove('flug-steuern');
      hudStand = {};
      el.wegAnt.textContent = '👑';
      if (mitIntro) zeigeIntro(); else starteCountdown();
    }

    // ---------- Eingabe ----------
    const zeiger = { x: 0, y: 0, aktiv: false, typ: 'mouse' };
    const tasten = new Set();
    function zeigerSetzen(e) {
      const r = canvas.getBoundingClientRect();
      zeiger.typ = e.pointerType || 'mouse';
      zeiger.x = e.clientX - r.left;
      zeiger.y = e.clientY - r.top - (zeiger.typ === 'touch' ? Math.min(90, H * 0.12) : 0);
      zeiger.aktiv = true;
    }
    canvas.addEventListener('pointermove', zeigerSetzen);
    canvas.addEventListener('pointerdown', e => {
      zeigerSetzen(e);
      try { canvas.setPointerCapture(e.pointerId); } catch { /* egal */ }
    });
    const STEUER = { arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0], arrowup: [0, 1], w: [0, 1], arrowdown: [0, -1], s: [0, -1] };
    function onKeyDown(e) {
      if (topModal() !== m || e.target instanceof HTMLInputElement) return;
      const k = e.key.toLowerCase();
      if (STEUER[k]) { tasten.add(k); zeiger.aktiv = false; e.preventDefault(); return; }
      if (k === ' ' || k === 'enter') {
        e.preventDefault();
        if (e.repeat) return;
        if (S.phase === 'intro') starteCountdown();
        else if (S.phase === 'ergebnis') (ebene.querySelector('.btn.gruen'))?.click();
      }
    }
    function onKeyUp(e) { tasten.delete(e.key.toLowerCase()); }
    function onBlur() { tasten.clear(); }
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);
    // Spiel-eigene Tastatursteuerung: diese Tasten gehören dem Flug
    m._key = e => { const k = e.key.toLowerCase(); return !!STEUER[k] || k === ' ' || k === 'enter'; };

    // Zeiger → Zielpunkt in Weltkoordinaten (Königin erscheint unter dem Zeiger)
    const proEinheit = () => (1 - KF) * F / DA;
    function zielAusZeiger() {
      const k = proEinheit();
      S.tx = clamp((zeiger.x - cx) / k, -XR, XR);
      S.ty = clamp(YM - (zeiger.y - antMidY) / k, YLO, YHI);
    }
    const schirmVonWelt = (x, y) => [cx + x * proEinheit(), antMidY - (y - YM) * proEinheit()];

    // ---------- Overlays ----------
    function karte(...kids) {
      const k = h('div.flug-karte', ...kids);
      ebene.replaceChildren(k);
      ebene.classList.add('an');
      return k;
    }
    function ebeneWeg() { ebene.classList.remove('an'); ebene.replaceChildren(); }

    function zeigeIntro() {
      const tipps = [
        ['🖱️', 'Bewege die Maus oder deinen Finger – die Königin fliegt hinterher.'],
        ['⌨️', 'Oder steuere mit den Pfeiltasten bzw. W A S D.'],
        ['⭕', 'Jeder goldene Ring schenkt ihr neue Flugkraft ⚡.'],
      ];
      if (opt.wind) tipps.push(['🍃', 'Achtung, Wind! Böen schieben die Königin zur Seite.']);
      const weit = opt.ringe >= 25 ? 'weit' : opt.ringe >= 19 ? 'mittel' : 'nah';
      karte(
        h('div.flug-karte-em', '👑'),
        h('h3', `Hochzeitsflug nach ${opt.name}!`),
        h('p', opt.koloniename
          ? `Eine junge Königin aus „${opt.koloniename}“ startet zu ihrem großen Flug. Hilf ihr, eine neue Kolonie zu gründen!`
          : 'Die junge Königin startet zu ihrem großen Flug. Hilf ihr, eine neue Kolonie zu gründen!'),
        h('div.flug-chips', h('span', `⭕ ${opt.ringe} Ringe`), h('span', `🗺️ Strecke: ${weit}`), opt.wind ? h('span', '🍃 windig') : h('span', '☀️ windstill')),
        h('ul.flug-tipps', tipps.map(([i, t]) => h(i === '⌨️' ? 'li.flug-nur-tasten' : 'li', h('span', i), h('span', t)))),
        h('button.btn.gruen.gross', { onclick: () => starteCountdown() }, 'Los geht\'s!', h('span.mg-kbd', 'Leertaste')),
      );
    }
    function starteCountdown() {
      if (S.phase !== 'intro' && S.phase !== 'countdown') return;
      ebeneWeg();
      S.phase = 'countdown'; S.pt = 0; S.zaehler = 3;
      buehne.classList.add('flug-steuern');
      if (!zeiger.aktiv) { const [px, py] = schirmVonWelt(0, YM - 0.15); zeiger.x = px; zeiger.y = py; }
      sfx.tick();
    }

    function zeigeErgebnis() {
      S.phase = 'ergebnis';
      buehne.classList.remove('flug-steuern');
      banner.className = 'flug-banner';
      const N = opt.ringe, q = S.hits / N;
      if (S.erfolg) {
        const sterne = q >= 0.85 ? 3 : q >= 0.6 ? 2 : 1;
        karte(
          h('div.flug-karte-em.huepf', '🎉'),
          h('h3', 'Geschafft!'),
          h('p.gross', `Eine neue Kolonie entsteht in ${opt.name}!`),
          h('div.flug-sterne', [1, 2, 3].map(i => h('span' + (i <= sterne ? '.an' : ''), { style: { animationDelay: 0.15 + i * 0.18 + 's' } }, '⭐'))),
          h('div.flug-stats',
            h('div', h('b', `${S.hits} / ${N}`), h('small', 'Ringe')),
            h('div', h('b', `🔥 ${S.beste}`), h('small', 'beste Serie')),
            h('div', h('b', `${S.punkte}`), h('small', 'Punkte'))),
          h('div.flug-knoepfe', h('button.btn.gruen.gross', { onclick: () => m.close('fertig') }, 'Weiter', h('span.mg-kbd', 'Enter'))),
        );
      } else {
        const tipp = opt.wind && S.hits / Math.max(1, S.idx) > 0.4
          ? 'Tipp: Wenn die Blätter fliegen, kommt eine Böe – steuere ein bisschen dagegen!'
          : q < 0.3
            ? 'Tipp: Schau immer auf den nächsten Ring und bewege dich ruhig dorthin.'
            : 'Tipp: Jeder Ring gibt neue Flugkraft ⚡ – schau schon auf den nächsten!';
        karte(
          h('div.flug-karte-em', '🌼'),
          h('h3', 'Fast!'),
          h('p.gross', `Du hast ${S.hits} von ${N} Ringen geschafft. Versuch es gleich nochmal!`),
          h('p.flug-tipp', tipp),
          h('div.flug-knoepfe',
            h('button.btn.grau', { onclick: () => m.close('spaeter') }, 'Später'),
            h('button.btn.gruen.gross', { onclick: () => { sfx.click(); neuerFlug(false); } }, '🔄 Nochmal fliegen', h('span.mg-kbd', 'Enter'))),
        );
      }
    }

    // ---------- Effekte ----------
    function text(txt, x, y, farbe = '#fff', gross = 1) { S.texte.push({ txt, x, y, t: 0, farbe, gross }); }
    function funken(x, y, rad, n, farben) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rand(-0.1, 0.1);
        const sp = rand(120, 420);
        S.teile.push({ k: i % 3 === 0 ? 'stern' : 'funke', x: x + Math.cos(a) * rad, y: y + Math.sin(a) * rad, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: 0, max: rand(0.5, 0.9), g: rand(3, 7), rot: rand(0, TAU), c: pick(farben) });
      }
    }

    // ---------- Projektion ----------
    let Fe = F;
    function P(x, y, z) {
      const dz = z - S.camZ;
      if (dz < 0.05) return null;
      const s = Fe / dz;
      return [cx + (x - S.camX) * s, cyH - (y - S.camY) * s, s, dz];
    }
    const bodenY = z => cyH + S.camY * Fe / Math.max(0.05, z - S.camZ);

    // ================================================================
    //  Update
    // ================================================================
    function update(dt) {
      S.t += dt; S.pt += dt;
      const steuerbar = S.phase === 'intro' || S.phase === 'countdown' || S.phase === 'flug';
      if (steuerbar && S.phase !== 'intro') {
        if (tasten.size) {
          let kx = 0, ky = 0;
          for (const k of tasten) { kx += STEUER[k][0]; ky += STEUER[k][1]; }
          S.tx = clamp(S.tx + clamp(kx, -1, 1) * 6.5 * dt, -XR, XR);
          S.ty = clamp(S.ty + clamp(ky, -1, 1) * 4.5 * dt, YLO, YHI);
        } else if (zeiger.aktiv) zielAusZeiger();
      }

      const W_ = S.wind;
      switch (S.phase) {
        case 'intro':
          S.tx = Math.sin(S.t * 0.7) * 0.5; S.ty = YM - 0.15 + Math.sin(S.t * 1.3) * 0.15;
          S.v = lerp(S.v, 1.2, 1 - Math.exp(-dt));
          break;
        case 'countdown': {
          S.v = lerp(S.v, 1.2, 1 - Math.exp(-dt));
          const n = 3 - Math.floor(S.pt);
          if (n !== S.zaehler && n >= 1) { S.zaehler = n; sfx.tick(); }
          if (S.pt >= 3) { S.phase = 'flug'; S.pt = 0; sfx.whoosh(); sfx.pop(); }
          break;
        }
        case 'flug': {
          S.v = lerp(S.v, vMax, 1 - Math.exp(-dt * 1.6));
          S.E -= PRO_RING.zehren * S.v / SP * dt;
          // Wind
          if (opt.wind) {
            W_.t -= dt;
            if (W_.ph === 0 && W_.t <= 0) {
              W_.ph = 1; W_.t = 0.8;
              W_.dir = Math.abs(S.ax) > 2.5 ? -Math.sign(S.ax) : (Math.random() < 0.5 ? -1 : 1);
            } else if (W_.ph === 1 && W_.t <= 0) {
              W_.ph = 2; W_.t = rand(1.6, 2.6); W_.ziel = W_.dir * (2.3 + 1.3 * S.d);
              if (!rm) S.shake = 0.5;
            } else if (W_.ph === 2 && W_.t <= 0) { W_.ph = 0; W_.t = rand(3.5, 6.5); W_.ziel = 0; }
            if (W_.ph > 0) {
              const rate = W_.ph === 2 ? 26 : 8;
              if (Math.random() < rate * dt) windTeil(W_.dir, Math.random() < 0.45);
            }
          }
          ringePruefen();
          if (S.idx >= S.ringe.length) starteAnflug();
          else if (S.E <= 0) starteGleiten();
          break;
        }
        case 'anflug': {
          const T = S.anflugT, u = clamp(S.pt / T, 0, 1);
          S.v = S.v0 * (1 - u);
          const ue = easeInOut(u);
          // Königin bleibt vor der Kamera und fliegt allmählich voraus bis auf den Hügel
          S.antZ = S.camZ + S.v * dt + lerp(DA, S.zEnde - 0.7 - (S.zEnde - 12), ue);
          S.ax = lerp(S.a0[0], 0, ue);
          S.ay = lerp(S.a0[1], HUEGEL_H * 0.98 + 0.25, ue) + Math.sin(u * Math.PI) * 0.9;
          S.amp = u > 0.75 ? lerp(1, 0.25, (u - 0.75) / 0.25) : 1;
          if (u >= 1) {
            S.phase = 'gelandet'; S.pt = 0;
            sfx.fanfare(); konfetti(60);
            const p = P(0, HUEGEL_H, S.zEnde);
            if (p) funken(p[0], p[1], 10, 40, ['#ffd93c', '#fff6c0', '#ff9fc2', '#8ef08a']);
            if (!rm) S.shake = 0.6;
            banner.textContent = `🎉 Gelandet in ${opt.name}!`;
            banner.className = 'flug-banner an gut';
            el.wegAnt.textContent = '🎉';
            for (let i = 0; i < 6; i++) S.arbeiter.push({ x: rand(-1.2, 1.2), ziel: (i % 2 ? 1 : -1) * rand(1.8, HUEGEL_R + 0.6), t: rand(0, 2), dz: rand(-1.5, -0.2), dl: i * 0.25 });
          }
          break;
        }
        case 'gelandet':
          S.v = 0;
          S.amp = lerp(S.amp, 0, 1 - Math.exp(-dt * 2));
          if (S.pt > 2.6) zeigeErgebnis();
          break;
        case 'gleiten': {
          S.v *= Math.exp(-dt * (S.ruht ? 7 : S.pt > 2 ? 2.6 : 0.8));
          S.ty = 0.3; S.tx = S.ax;
          S.amp = lerp(S.amp, S.ay < 0.45 ? 0 : 0.35, 1 - Math.exp(-dt * 2));
          if (!S.ruht && S.ay < 0.4 && S.pt > 1.5) {
            S.ruht = true; S.ruhT = 0;
            // Eine Blume als Rastplatz direkt neben der Königin
            const o = S.objs[0];
            spawnObj(o, S.antZ + 0.5 + S.v / 7);
            o.typ = 'blume'; o.v = 1; o.x = S.ax + (S.ax > 2 ? -0.55 : 0.55); o.sc = 1.5;
            banner.textContent = 'Puh, eine Pause! Die Königin ruht sich aus.';
            banner.className = 'flug-banner an';
            el.wegAnt.textContent = '💤';
          }
          if (S.ruht) {
            S.ruhT += dt;
            if (Math.random() < dt * 1.4) S.texte.push({ txt: 'z', x: 0, y: 0, t: 0, farbe: '#ffffff', gross: 0.8, zzz: true, dx: rand(-0.1, 0.1) });
            if (S.ruhT > 2.2) zeigeErgebnis();
          }
          break;
        }
        case 'ergebnis':
          S.v = 0;
          if (S.erfolg) S.amp = lerp(S.amp, 0, 1 - Math.exp(-dt * 2));
          break;
      }
      W_.cur = lerp(W_.cur, W_.ziel, 1 - Math.exp(-dt * 3));
      if (S.phase !== 'flug' && W_.ph) { W_.ph = 0; W_.ziel = 0; }

      S.camZ += S.v * dt;

      // Königin folgt dem Ziel
      const px = S.ax, py = S.ay;
      if (S.phase === 'intro' || S.phase === 'countdown' || S.phase === 'flug' || S.phase === 'gleiten') {
        const k = 1 - Math.exp(-dt * (S.phase === 'gleiten' ? 1.6 : RATE));
        S.ax = clamp(S.ax + (S.tx - S.ax) * k + W_.cur * dt, -XR - 0.4, XR + 0.4);
        S.ay = clamp(S.ay + (S.ty - S.ay) * k, S.phase === 'gleiten' ? 0.3 : YLO, YHI);
        S.antZ = S.camZ + S.gDz;
      } else if (S.phase === 'ergebnis' && !S.erfolg) S.antZ = S.camZ + S.gDz;
      if (dt > 0) {
        S.vx = lerp(S.vx, (S.ax - px) / dt, 1 - Math.exp(-dt * 10));
        S.vy = lerp(S.vy, (S.ay - py) / dt, 1 - Math.exp(-dt * 10));
      }
      const zielBank = S.phase === 'gleiten' || S.phase === 'ergebnis' || S.phase === 'gelandet' ? 0 : clamp(S.vx * 0.11, -0.65, 0.65);
      S.bank = lerp(S.bank, zielBank, 1 - Math.exp(-dt * 8));
      S.pitch = lerp(S.pitch, clamp(S.vy * 0.4, -1, 1), 1 - Math.exp(-dt * 6));
      S.flap += dt * (S.phase === 'gleiten' ? 22 : 48) * (0.4 + 0.6 * S.amp);

      // Kamera folgt sanft (seitlich & Höhe hängen linear an der Königin → Zeigersteuerung bleibt exakt)
      if (S.phase === 'anflug' || S.phase === 'gelandet' || (S.phase === 'ergebnis' && S.erfolg)) {
        const k = 1 - Math.exp(-dt * 2);
        S.camX = lerp(S.camX, 0, k);
        S.camY = lerp(S.camY, HUEGEL_H + 1.6, k);
      } else if (S.phase === 'gleiten' || S.phase === 'ergebnis') {
        // sanft hinterher, damit die rastende Königin gut im Bild bleibt
        const k = 1 - Math.exp(-dt * 1.5);
        S.camX = lerp(S.camX, KF * S.ax, k);
        S.camY = lerp(S.camY, S.ay + 1.35, k);
        S.gDz = lerp(S.gDz, 6, k);
        S.ringAlpha = lerp(S.ringAlpha, 0, k);
      } else {
        S.camX = KF * S.ax;
        S.camY = YC + KF * (S.ay - YM);
      }

      // Wiese recyceln
      for (const o of S.objs) if (o.z < S.camZ + NAH) spawnObj(o, S.camZ + SICHT - rand(0, 8));
      for (const p of S.pollen) if (p.z < S.camZ + 0.4) { p.z = S.camZ + rand(40, 60); p.x = S.camX + rand(-9, 9); p.y = rand(0.3, 7); }

      // Ringe-Blitz
      for (const r of S.ringe) if (r.blitz > 0) r.blitz = Math.max(0, r.blitz - dt * 1.8);
      S.punch = Math.max(0, S.punch - dt * 3);
      S.blitz = Math.max(0, S.blitz - dt * 2.5);
      S.shake = Math.max(0, S.shake - dt * 1.5);

      // Glitzerspur bei Serie
      if (S.serie >= 3 && S.phase === 'flug' && Math.random() < dt * 30) {
        const p = P(S.ax, S.ay, S.antZ);
        if (p) S.teile.push({ k: 'staub', x: p[0] + rand(-12, 12), y: p[1] + rand(0, 20), vx: rand(-20, 20), vy: rand(40, 110), l: 0, max: rand(0.5, 0.9), g: rand(2, 4), rot: 0, c: pick(['#ffe680', '#fff6c0', '#ffc93c']) });
      }
      // Teilchen
      for (const p of S.teile) {
        p.l += dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.k === 'funke' || p.k === 'stern') { p.vx *= Math.exp(-dt * 3); p.vy = p.vy * Math.exp(-dt * 3) + 60 * dt; }
        if (p.k === 'blatt') { p.rot += p.spin * dt; p.vy += Math.sin(S.t * 4 + p.g) * 120 * dt; }
      }
      S.teile = S.teile.filter(p => p.l < p.max);
      for (const t of S.texte) t.t += dt;
      S.texte = S.texte.filter(t => t.t < (t.zzz ? 2.2 : 1.3));
      // Arbeiterinnen jubeln
      for (const a of S.arbeiter) { a.t += dt; if (a.t > a.dl) a.x = lerp(a.x, a.ziel, 1 - Math.exp(-dt * 1.2)); }
    }

    function windTeil(dir, blatt) {
      const x = dir > 0 ? -30 : W + 30;
      if (blatt) S.teile.push({ k: 'blatt', x, y: rand(0.08, 0.92) * H, vx: dir * rand(450, 800), vy: rand(-40, 40), l: 0, max: 2.4, g: rand(0, 9), rot: rand(0, TAU), spin: rand(-8, 8), c: pick(['#6cc052', '#9ad86a', '#e8b23a', '#d9822b', '#4f9e3a']), gr: rand(7, 13) });
      else S.teile.push({ k: 'streif', x, y: rand(0.05, 0.95) * H, vx: dir * rand(900, 1400), vy: 0, l: 0, max: 1.6, g: rand(60, 160), rot: 0, c: '#fff' });
    }

    function ringePruefen() {
      while (S.idx < S.ringe.length && S.ringe[S.idx].z <= S.antZ) {
        const r = S.ringe[S.idx];
        S.idx++;
        const dist = Math.hypot(S.ax - r.x, S.ay - r.y);
        const [sx, sy] = schirmVonWelt(S.ax, S.ay);
        if (dist <= r.r * 0.92) {
          r.status = 1; r.blitz = 1;
          S.hits++; S.serie++; S.beste = Math.max(S.beste, S.serie);
          S.E = Math.min(EMAX, S.E + PRO_RING.plus);
          S.punkte += 10 + 5 * Math.min(S.serie - 1, 6);
          sfx.ring(S.serie);
          if (S.serie > 0 && S.serie % 5 === 0) sfx.coin();
          const p = P(r.x, r.y, r.z);
          funken(p ? p[0] : sx, p ? p[1] : sy, p ? r.r * p[2] : 80, 30, ['#ffd93c', '#fff6c0', '#ffffff', '#ffb020']);
          if (!rm) S.punch = 1;
          S.blitz = 1;
          const oben = 0.62 * F / DA;
          text(S.serie >= 3 ? `${S.serie}er-Serie!` : pick(LOB), sx, sy - oben, S.serie >= 3 ? '#ffe066' : '#ffffff', S.serie >= 5 ? 1.25 : 1);
          text('+⚡', sx + 0.5 * F / DA, sy - 0.2 * F / DA, '#b8ff9a', 0.8);
          flash(el.energie, 'plus');
          if (S.serie >= 2) flash(el.serie, 'bump');
          flash(el.ringe, 'bump');
        } else {
          r.status = -1;
          S.serie = 0;
          S.E -= PRO_RING.minus;
          sfx.whoosh();
          text(dist < r.r * 1.6 ? 'Knapp vorbei!' : 'Hui, vorbei!', sx, sy - 0.62 * F / DA, '#ffe2c4', 0.85);
          flash(el.energie, 'minus');
        }
      }
    }
    function flash(e, kl) { e.classList.remove(kl); void e.offsetWidth; e.classList.add(kl); }

    function starteAnflug() {
      S.phase = 'anflug'; S.pt = 0; S.erfolg = true;
      S.v0 = Math.max(S.v, 4);
      const strecke = S.zEnde - 12 - S.camZ;
      S.anflugT = clamp(2 * strecke / S.v0, 2.2, 6);
      S.v0 = 2 * strecke / S.anflugT;
      S.a0 = [S.ax, S.ay, S.antZ];
      S.punkte += Math.round(Math.max(0, S.E));
      sfx.richtig();
    }
    function starteGleiten() {
      S.phase = 'gleiten'; S.pt = 0; S.E = 0; S.ruht = false;
      sfx.sinken();
    }

    // ================================================================
    //  Zeichnen
    // ================================================================
    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      Fe = F * (1 + 0.025 * S.punch);
      const roll = (rm ? 0.03 : 0.11) * S.bank;
      const sh = S.shake * 6;
      ctx.save();
      if (sh > 0.1) ctx.translate(rand(-sh, sh), rand(-sh, sh));
      ctx.translate(cx, antMidY); ctx.rotate(roll); ctx.translate(-cx, -antMidY);

      himmel();
      boden();

      // Tiefensortiert: Wiese, Ringe, Pfad-Glitzer, Hügel, Königin + Schatten, Pollen
      const liste = [];
      for (const o of S.objs) { const dz = o.z - S.camZ; if (dz > NAH && dz < SICHT) liste.push([dz, 0, o]); }
      for (const r of S.ringe) { const dz = r.z - S.camZ; if (dz > 0.25 && dz < SICHT + 10) liste.push([dz, 1, r]); }
      for (let j = S.idx; j < Math.min(S.ringe.length, S.idx + 3); j++) {
        const r = S.ringe[j], vor = j > 0 ? S.ringe[j - 1] : { x: 0, y: YM - 0.15, z: r.z - SP };
        for (const f of [0.25, 0.5, 0.75]) {
          const z = lerp(vor.z, r.z, f), dz = z - S.camZ;
          if (dz > DA + 0.5 && dz < SICHT) { const e = (1 - Math.cos(f * Math.PI)) / 2; liste.push([dz, 2, [lerp(vor.x, r.x, e), lerp(vor.y, r.y, e), z]]); }
        }
      }
      const hdz = S.zEnde - S.camZ;
      if (hdz < SICHT + 60 && hdz > 1) liste.push([hdz, 3, null]);
      const adz = S.antZ - S.camZ;
      liste.push([adz + 0.02, 4, null]);
      liste.push([adz, 5, null]);
      for (const p of S.pollen) { const dz = p.z - S.camZ; if (dz > 0.4) liste.push([dz, 6, p]); }
      liste.sort((a, b) => b[0] - a[0]);
      for (const [dz, typ, ref] of liste) {
        if (typ === 0) objekt(ref, dz);
        else if (typ === 1) ring(ref, dz);
        else if (typ === 2) pfadPunkt(ref, dz);
        else if (typ === 3) huegel(dz);
        else if (typ === 4) schatten();
        else if (typ === 5) koenigin();
        else pollen(ref, dz);
      }
      teilchen();
      ctx.restore();

      if (S.blitz > 0) { ctx.fillStyle = `rgba(255,250,220,${0.14 * S.blitz})`; ctx.fillRect(0, 0, W, H); }
      texte();
      fadenkreuz();
      if (S.phase === 'countdown') countdown();
      if (S.phase === 'flug' && S.pt < 0.8) gross('Los!', S.pt / 0.8, '#8ef08a');
    }

    function himmel() {
      const top = -H * 0.3;
      const g = ctx.createLinearGradient(0, top, 0, cyH);
      g.addColorStop(0, '#3d8fe8'); g.addColorStop(0.45, '#7cc0f5'); g.addColorStop(0.85, '#cfeafc'); g.addColorStop(1, '#fff3d6');
      ctx.fillStyle = g;
      ctx.fillRect(-W * 0.3, top, W * 1.6, cyH - top + 2);
      // Sonne
      const sx = W * 0.8 - S.camX * Fe * 0.004, sy = cyH - (cyH + H * 0.1) * 0.62;
      drawGlow(ctx, '255,236,170', sx, sy, H * 0.5, 0.55);
      ctx.save();
      ctx.translate(sx, sy); ctx.rotate(S.t * 0.05);
      ctx.fillStyle = 'rgba(255,250,215,.13)';
      for (let i = 0; i < 12; i++) {
        ctx.rotate(TAU / 12);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(H * 0.42, -H * 0.03); ctx.lineTo(H * 0.42, H * 0.03); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      drawGlow(ctx, '255,255,235', sx, sy, H * 0.13, 1);
      ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.arc(sx, sy, H * 0.045, 0, TAU); ctx.fill();
      // Wolken
      const breit = W + 600;
      for (const w of wolken) {
        const sp = wolkenSprite(w.v);
        const sc = w.sc * H / 620;
        const x = (((w.x * breit - S.t * w.speed - S.camX * Fe * w.par * 0.02 - S.camZ * 0.4 * w.par) % breit) + breit) % breit - 300;
        const y = cyH - (cyH + H * 0.15) * w.y - 140 * sc * 0.5;
        ctx.globalAlpha = 0.95;
        ctx.drawImage(sp, x, y, 320 * sc, 140 * sc);
      }
      ctx.globalAlpha = 1;
      // Ferne Berge und Hügel
      huegelKette(Fe * 0.003, H * 0.075, '#a7c9dc', 0.0035, 7, 0.55);
      huegelKette(Fe * 0.008, H * 0.042, '#8fbf86', 0.006, 3, 0.9, true);
    }
    function huegelKette(par, hoehe, farbe, freq, seed, alpha, baeume) {
      const off = S.camX * par * 40 + S.camZ * (baeume ? 0.25 : 0.06);
      const yAt = x => cyH - hoehe * (0.65 + 0.35 * Math.sin((x + off) * freq + seed) + 0.25 * Math.sin((x + off) * freq * 2.7 + seed * 2));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = farbe;
      ctx.beginPath(); ctx.moveTo(-W * 0.3, cyH + 4);
      for (let x = -W * 0.3; x <= W * 1.3; x += 10) ctx.lineTo(x, yAt(x));
      ctx.lineTo(W * 1.3, cyH + 4); ctx.closePath(); ctx.fill();
      if (baeume) {
        ctx.fillStyle = '#76ad6c';
        const step = Math.max(14, H * 0.03);
        const start = Math.floor((-W * 0.3 + off) / step) * step - off;
        for (let x = start; x < W * 1.3; x += step) {
          const n = Math.sin((x + off) * 0.37) * 0.5 + 0.5;
          if (n < 0.45) continue;
          const r = step * (0.35 + n * 0.3);
          ctx.beginPath(); ctx.arc(x, yAt(x) + r * 0.4, r, 0, TAU); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    function boden() {
      const unten = H * 1.6;
      ctx.fillStyle = mix(RASEN_A, DUNST, 0.2);
      ctx.fillRect(-W * 0.3, cyH, W * 1.6, unten - cyH);
      // Rasenstreifen von fern nach nah
      const z0 = S.camZ + NAH;
      let z = Math.floor((S.camZ + SICHT) / BAND) * BAND;
      for (; z + BAND > z0; z -= BAND) {
        const zn = Math.max(z, z0);
        const y1 = bodenY(z + BAND), y2 = Math.min(unten, bodenY(zn));
        if (y2 <= y1) continue;
        const dz = z - S.camZ;
        const f = Math.pow(clamp(dz / SICHT, 0, 1), 0.85) * 0.9;
        ctx.fillStyle = mix(((z / BAND) & 1) ? RASEN_A : RASEN_B, DUNST, f);
        ctx.fillRect(-W * 0.3, y1, W * 1.6, y2 - y1 + 0.5);
      }
      // Bach
      const schritt = 2.5;
      let zz = Math.floor((S.camZ + SICHT) / schritt) * schritt;
      for (; zz > z0; zz -= schritt) {
        const za = Math.max(zz - schritt, z0);
        const fa = flussX(zz), fb = flussX(za);
        const pa = P(0, 0, zz), pb = P(0, 0, za);
        if (!pa || !pb) continue;
        const dz = zz - S.camZ;
        const f = Math.pow(clamp(dz / SICHT, 0, 1), 0.6);
        for (const [b, col] of [[FLUSS_B + 0.45, mix(UFER, DUNST, f)], [FLUSS_B, mix(WASSER, DUNST, f)]]) {
          const xa1 = cx + (fa - b - S.camX) * pa[2], xa2 = cx + (fa + b - S.camX) * pa[2];
          const xb1 = cx + (fb - b - S.camX) * pb[2], xb2 = cx + (fb + b - S.camX) * pb[2];
          if (Math.max(xa2, xb2) < -W * 0.3 || Math.min(xa1, xb1) > W * 1.3) break;
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.moveTo(xa1, pa[1]); ctx.lineTo(xa2, pa[1]); ctx.lineTo(xb2, pb[1] + 0.5); ctx.lineTo(xb1, pb[1] + 0.5); ctx.closePath(); ctx.fill();
        }
        // Glitzern auf dem Wasser
        const idx = Math.round(zz / schritt);
        if ((idx * 7919) % 5 < 2 && dz < 80) {
          const ox = (((idx * 2654435761) >>> 0) % 1000) / 1000 * 1.6 - 0.8;
          const a = 0.5 + 0.5 * Math.sin(S.t * 5 + idx);
          ctx.strokeStyle = `rgba(255,255,255,${0.6 * a * (1 - dz / 80)})`;
          ctx.lineWidth = Math.max(1, 0.05 * pa[2]);
          const x = cx + (fa + ox - S.camX) * pa[2];
          ctx.beginPath(); ctx.moveTo(x - 0.25 * pa[2], pa[1]); ctx.lineTo(x + 0.25 * pa[2], pa[1]); ctx.stroke();
        }
      }
      // Dunst am Horizont
      const hz = bodenY(S.camZ + 70);
      const g = ctx.createLinearGradient(0, cyH - 1, 0, hz);
      g.addColorStop(0, 'rgba(232,243,226,.85)'); g.addColorStop(1, 'rgba(232,243,226,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-W * 0.3, cyH - 1, W * 1.6, hz - cyH + 1);
    }

    function nebel(dz) { return clamp((SICHT - dz) / 40, 0, 1); }

    function objekt(o, dz) {
      const p = P(o.x, 0, o.z);
      if (!p) return;
      const [w, hh] = OBJ_SIZE[o.typ];
      const s = p[2] * o.sc;
      const bw = w * s, bh = hh * s;
      if (p[0] + bw / 2 < -W * 0.3 || p[0] - bw / 2 > W * 1.3 || p[1] - bh > H * 1.1 || bh < 0.6) return;
      ctx.globalAlpha = nebel(dz);
      ctx.drawImage(objSprite(o), p[0] - bw / 2, p[1] - bh, bw, bh);
      ctx.globalAlpha = 1;
    }

    function ring(r, dz) {
      const p = P(r.x, r.y, r.z);
      if (!p) return;
      let a = nebel(dz - 10) * clamp((dz - 0.35) / 1.2, 0, 1);
      if (r.status === -1) a *= 0.4;
      a *= S.ringAlpha;
      if (a <= 0.01) return;
      const [sx, sy, s] = p;
      const grow = r.status === 1 ? 1 + (1 - r.blitz) * 0.25 : 1;
      const rad = r.r * s * grow, lw = Math.max(2.2, 0.15 * s);
      if (rad > W * 3) return;
      const naechster = S.idx < S.ringe.length && S.ringe[S.idx] === r && S.phase === 'flug';
      const drin = naechster && Math.hypot(S.ax - r.x, S.ay - r.y) <= r.r * 0.92;
      const puls = 0.5 + 0.5 * Math.sin(S.t * 6);
      ctx.globalAlpha = a;
      // Leuchten
      if (r.status !== -1) {
        ctx.strokeStyle = drin ? `rgba(255,255,200,${0.35 + 0.2 * puls})` : naechster ? `rgba(255,205,70,${0.22 + 0.15 * puls})` : 'rgba(255,205,70,.16)';
        ctx.lineWidth = lw * (naechster ? 3.6 : 2.8);
        ctx.beginPath(); ctx.arc(sx, sy, rad, 0, TAU); ctx.stroke();
        if (naechster) {
          ctx.fillStyle = drin ? 'rgba(255,250,200,.13)' : 'rgba(255,230,150,.07)';
          ctx.beginPath(); ctx.arc(sx, sy, rad - lw * 0.5, 0, TAU); ctx.fill();
        }
      }
      // Röhre: dunkle Unterkante, goldener Körper, Glanz oben
      const grau = r.status === -1;
      ctx.strokeStyle = grau ? '#9a8f7a' : '#a8620a';
      ctx.lineWidth = lw * 1.12;
      ctx.beginPath(); ctx.arc(sx, sy + lw * 0.12, rad, 0, TAU); ctx.stroke();
      const g = ctx.createLinearGradient(sx - rad * 0.4, sy - rad, sx + rad * 0.4, sy + rad);
      if (r.status === 1 && r.blitz > 0) { g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#fff2a0'); }
      else if (grau) { g.addColorStop(0, '#efe8da'); g.addColorStop(1, '#b9ae98'); }
      else { g.addColorStop(0, '#fff7c2'); g.addColorStop(0.35, '#ffd447'); g.addColorStop(0.7, '#ffb31f'); g.addColorStop(1, '#d98a00'); }
      ctx.strokeStyle = g;
      ctx.lineWidth = lw;
      ctx.beginPath(); ctx.arc(sx, sy, rad, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,245,.85)';
      ctx.lineWidth = lw * 0.25;
      ctx.beginPath(); ctx.arc(sx, sy - lw * 0.18, rad, Math.PI * 1.08, Math.PI * 1.62); ctx.stroke();
      ctx.beginPath(); ctx.arc(sx, sy - lw * 0.18, rad, Math.PI * 1.75, Math.PI * 1.85); ctx.stroke();
      // funkelnde Perlen auf dem Ring
      if (!grau && s > 6) {
        const n = 10;
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * TAU + S.t * 0.9 * (r.nr % 2 ? 1 : -1);
          const fl = 0.5 + 0.5 * Math.sin(S.t * 7 + i * 1.9 + r.nr);
          drawGlow(ctx, '255,255,230', sx + Math.cos(ang) * rad, sy + Math.sin(ang) * rad, lw * (0.9 + fl * 0.9), 0.55 + 0.45 * fl);
        }
      }
      // Erfolgs-Welle
      if (r.status === 1 && r.blitz > 0) {
        ctx.strokeStyle = `rgba(190,255,170,${r.blitz * 0.8})`;
        ctx.lineWidth = lw * 0.6;
        ctx.beginPath(); ctx.arc(sx, sy, rad * (1 + (1 - r.blitz) * 0.5), 0, TAU); ctx.stroke();
      }
      // Nummer am nächsten Ring (klein, oben)
      ctx.globalAlpha = 1;
    }

    function pfadPunkt([x, y, z], dz) {
      const p = P(x, y, z);
      if (!p) return;
      const a = S.ringAlpha * nebel(dz) * clamp((dz - DA - 0.5) / 3, 0, 1) * (0.55 + 0.25 * Math.sin(S.t * 5 + z));
      drawGlow(ctx, '255,226,120', p[0], p[1], Math.max(3, 0.13 * p[2]), a);
    }

    function pollen(p, dz) {
      const a = clamp(dz / 4, 0, 1) * clamp((60 - dz) / 20, 0, 1) * 0.8;
      if (a <= 0.02) return;
      const p1 = P(p.x, p.y, p.z), p2 = P(p.x, p.y, p.z + 0.25 + S.v * 0.05);
      if (!p1 || !p2) return;
      ctx.strokeStyle = p.g < 0.5 ? `rgba(255,255,255,${a})` : `rgba(255,236,150,${a})`;
      ctx.lineWidth = Math.max(1, 0.025 * p1[2]);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
    }

    function huegel(dz) {
      const p = P(0, 0, S.zEnde);
      if (!p) return;
      const [sx, sy, s] = p;
      const a = clamp((SICHT + 60 - dz) / 50, 0, 1);
      // Leuchtsäule: zeigt schon von weitem, wo das Ziel ist
      const beam = a * clamp((dz - 8) / 30, 0.15, 1);
      const bTop = sy - (HUEGEL_H + 9) * s;
      const gb = ctx.createLinearGradient(0, bTop, 0, sy - HUEGEL_H * s);
      gb.addColorStop(0, 'rgba(255,230,140,0)'); gb.addColorStop(1, `rgba(255,230,140,${0.4 * beam})`);
      ctx.fillStyle = gb;
      ctx.fillRect(sx - 0.55 * s, bTop, 1.1 * s, (9) * s);
      drawGlow(ctx, '255,226,130', sx, sy - HUEGEL_H * s, Math.max(30, 3.2 * s), 0.7 * a);
      const sp = spriteHuegel();
      const bw = (HUEGEL_R * 2 + 1) * s, bh = (HUEGEL_H + 0.6) * s;
      ctx.globalAlpha = a;
      ctx.drawImage(sp, sx - bw / 2, sy - (HUEGEL_H + 0.3) * s, bw, bh);
      // Fähnchen
      const fx = sx + 0.15 * s, fy = sy - (HUEGEL_H - 0.02) * s;
      ctx.strokeStyle = '#6b4424'; ctx.lineWidth = Math.max(1, 0.06 * s); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 1.3 * s); ctx.stroke();
      const wehen = Math.sin(S.t * 6) * 0.08 * s;
      ctx.fillStyle = '#ff6b9b';
      ctx.beginPath(); ctx.moveTo(fx, fy - 1.3 * s); ctx.quadraticCurveTo(fx + 0.4 * s, fy - 1.2 * s + wehen, fx + 0.8 * s, fy - 1.1 * s + wehen);
      ctx.quadraticCurveTo(fx + 0.4 * s, fy - 1.0 * s - wehen, fx, fy - 0.85 * s); ctx.closePath(); ctx.fill();
      // Schild mit Namen
      if (s > 9) {
        const tx = sx - 3.3 * s, ty = sy - 0.75 * s;
        const fs = Math.max(9, 0.3 * s);
        ctx.font = `600 ${fs}px ${FONT}`;
        const tw = ctx.measureText(opt.name).width + fs;
        ctx.fillStyle = '#7a5232';
        ctx.fillRect(tx - 0.04 * s, ty, 0.08 * s, 0.75 * s);
        ctx.fillStyle = '#e8c48c'; ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = Math.max(1, 0.04 * s);
        ctx.beginPath(); ctx.roundRect(tx - tw / 2, ty - fs * 1.5, tw, fs * 1.5, fs * 0.3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#4a2c14'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(opt.name, tx, ty - fs * 0.72);
      }
      // jubelnde Arbeiterinnen
      for (const w of S.arbeiter) {
        if (w.t < w.dl) continue;
        const q = P(w.x, 0, S.zEnde + w.dz);
        if (!q) continue;
        const hops = Math.abs(Math.sin((w.t - w.dl) * 7 + w.dl * 3)) * 0.18 * q[2];
        drawAnt(ctx, { x: q[0], y: q[1] - 0.1 * q[2] - hops, L: 0.55 * q[2], dir: w.ziel > w.x ? 1 : -1, phase: w.t * 14, rolle: 'arbeiterin', walking: true, alpha: clamp((w.t - w.dl) * 3, 0, 1) });
      }
      ctx.globalAlpha = 1;
    }

    function schatten() {
      const p = P(S.ax, 0, S.antZ);
      if (!p) return;
      const hoehe = Math.max(0, S.ay);
      const a = clamp(0.32 - hoehe * 0.05, 0.08, 0.32);
      ctx.fillStyle = `rgba(20,50,10,${a})`;
      ctx.beginPath(); ctx.ellipse(p[0], p[1], (0.35 + hoehe * 0.05) * p[2], 0.08 * p[2], 0, 0, TAU); ctx.fill();
    }

    function koenigin() {
      const p = P(S.ax, S.ay, S.antZ);
      if (!p) return;
      const bob = S.phase === 'gleiten' && S.ay < 0.5 ? 0 : Math.sin(S.t * 3.2) * 0.03 * p[2] * S.amp;
      drawKoenigin(ctx, p[0], p[1] + bob, p[2], { bank: S.bank, flap: S.flap, amp: S.amp, t: S.t, pitch: S.pitch, landen: S.phase === 'gelandet' || S.ruht || (S.phase === 'ergebnis') });
    }

    function teilchen() {
      for (const p of S.teile) {
        const a = clamp(1 - p.l / p.max, 0, 1);
        if (p.k === 'funke') {
          drawGlow(ctx, '255,226,120', p.x, p.y, p.g * 3.2, a);
          ctx.fillStyle = `rgba(255,255,240,${a})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.g * 0.45, 0, TAU); ctx.fill();
        } else if (p.k === 'stern') {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + p.l * 4);
          ctx.globalAlpha = a; ctx.fillStyle = p.c;
          const r = p.g * 1.6;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.35 : r; const an = i / 8 * TAU; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
          ctx.closePath(); ctx.fill();
          ctx.restore();
        } else if (p.k === 'staub') {
          ctx.fillStyle = p.c; ctx.globalAlpha = a;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.g * a, 0, TAU); ctx.fill();
          ctx.globalAlpha = 1;
        } else if (p.k === 'blatt') {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.globalAlpha = Math.min(1, a * 2);
          ctx.fillStyle = p.c;
          ctx.beginPath(); ctx.ellipse(0, 0, p.gr, p.gr * 0.45, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(-p.gr, 0); ctx.lineTo(p.gr, 0); ctx.stroke();
          ctx.restore();
        } else if (p.k === 'streif') {
          ctx.strokeStyle = `rgba(255,255,255,${0.45 * Math.min(1, a * 2)})`;
          ctx.lineWidth = 2; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - Math.sign(p.vx) * p.g, p.y); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    function texte() {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const ap = P(S.ax, S.ay, S.antZ);
      for (const t of S.texte) {
        if (t.zzz) {
          if (!ap) continue;
          const u = t.t / 2.2;
          ctx.globalAlpha = Math.sin(u * Math.PI);
          ctx.font = `700 ${Math.round((14 + u * 16) * (H / 600))}px ${FONT}`;
          ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(60,90,140,.6)'; ctx.lineWidth = 3;
          const x = ap[0] + 0.15 * ap[2] + (t.dx + Math.sin(u * 6) * 0.05) * ap[2], y = ap[1] - 0.45 * ap[2] - u * 0.6 * ap[2];
          ctx.strokeText('z', x, y); ctx.fillText('z', x, y);
          continue;
        }
        const u = t.t / 1.3;
        const sc = u < 0.15 ? 0.6 + (u / 0.15) * 0.55 : 1.15 - Math.min(0.15, (u - 0.15) * 0.6);
        ctx.globalAlpha = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1;
        const fs = Math.round(Math.max(20, H * 0.05) * t.gross * sc);
        ctx.font = `700 ${fs}px ${FONT}`;
        ctx.lineWidth = Math.max(3, fs * 0.16); ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(120,60,0,.75)';
        const y = t.y - u * 50;
        ctx.strokeText(t.txt, t.x, y); ctx.fillStyle = t.farbe; ctx.fillText(t.txt, t.x, y);
      }
      ctx.globalAlpha = 1;
    }

    function fadenkreuz() {
      if (!zeiger.aktiv || zeiger.typ !== 'mouse' || (S.phase !== 'flug' && S.phase !== 'countdown')) return;
      const r = Math.max(10, H * 0.018);
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2;
      ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.arc(zeiger.x, zeiger.y, r, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(zeiger.x, zeiger.y, 2.5, 0, TAU); ctx.fill();
    }

    function gross(txt, u, farbe) {
      const sc = u < 0.25 ? 0.4 + (u / 0.25) * 0.8 : 1.2 - (u - 0.25) * 0.25;
      ctx.globalAlpha = u > 0.6 ? 1 - (u - 0.6) / 0.4 : 1;
      const fs = Math.round(H * 0.17 * sc);
      ctx.font = `700 ${fs}px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.12; ctx.strokeStyle = 'rgba(140,70,0,.85)';
      ctx.strokeText(txt, cx, H * 0.24); ctx.fillStyle = farbe; ctx.fillText(txt, cx, H * 0.24);
      ctx.globalAlpha = 1;
    }
    function countdown() {
      const n = 3 - Math.floor(S.pt);
      if (n >= 1) gross(String(n), S.pt % 1, '#ffe066');
    }

    // ---------- HUD ----------
    let hudStand = {};
    function hudUpdate() {
      const e = Math.max(0, Math.round(S.E));
      if (e !== hudStand.e) {
        hudStand.e = e;
        el.energieFill.style.width = (e / EMAX * 100) + '%';
        el.energie.classList.toggle('knapp', e < 25);
      }
      const rt = `${S.hits} / ${opt.ringe}`;
      if (rt !== hudStand.rt) { hudStand.rt = rt; el.ringTxt.textContent = rt; }
      const se = S.serie >= 2 ? `${S.serie}er-Serie` : '';
      if (se !== hudStand.se) { hudStand.se = se; el.serieTxt.textContent = se; el.serie.classList.toggle('an', !!se); }
      const wi = S.wind.ph > 0 ? (S.wind.dir > 0 ? 'Windböe! ➜' : '⬅ Windböe!') : '';
      if (wi !== hudStand.wi) { hudStand.wi = wi; el.windTxt.textContent = wi; el.wind.classList.toggle('an', !!wi); }
      const prog = clamp((S.antZ - DA) / (S.zEnde - 0.7 - DA), 0, 1);
      const pr = Math.round(prog * 1000);
      if (pr !== hudStand.pr) { hudStand.pr = pr; el.wegFill.style.width = prog * 100 + '%'; el.wegAnt.style.left = prog * 100 + '%'; }
      const sicht = S.phase !== 'intro' && S.phase !== 'ergebnis';
      if (sicht !== hudStand.sicht) { hudStand.sicht = sicht; hud.classList.toggle('an', sicht); }
    }

    // ---------- Schleife ----------
    let raf = 0, last = performance.now();
    function frame(now) {
      if (aufgeraeumt) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
      if (canvas.width !== Math.round(W * dpr) || !W) resize();
      update(dt);
      render();
      hudUpdate();
    }

    // Debug-/Test-Haken
    const debug = {
      get state() { return S; },
      get opt() { return opt; },
      /** Bildschirmpunkt (clientX/Y), an den der Zeiger muss, um den nächsten Ring zu treffen */
      ziel() {
        const r = S.ringe[S.idx];
        if (!r) return null;
        const [x, y] = schirmVonWelt(r.x, r.y);
        const b = canvas.getBoundingClientRect();
        return { x: b.left + x, y: b.top + y, nr: r.nr, dz: r.z - S.antZ };
      },
    };
    window.__flug = debug;

    neuerFlug(true);
    raf = requestAnimationFrame(frame);
  });
}
