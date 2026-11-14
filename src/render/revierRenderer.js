// Revier-Ansicht: die Wiese rund um den Hügel in Draufsicht – Kommandokarte der Königin.
// Boden und Nebel werden vorgerendert; pro Bild kommen nur Duftstraßen, Ameisen,
// Quellen, Expeditionen und Wetter dazu.
import { REVIER, QUELLEN, STOERER, GEBAEUDE, FUNDE } from '../game/config.js';
import { NEST, sichtbar, distNest, naechsteBasis, lagerPlatz } from '../game/revier.js';
import { hatFreischaltung } from '../game/forschung.js';
import { makeNoise, mulberry32, clamp } from '../util.js';
import { drawEmoji, drawGlow, cached } from './sprites.js';

const T = REVIER.TILE;
export const MW = REVIER.W * T, MH = REVIER.H * T;
const NX = (NEST.x + 0.5) * T, NY = (NEST.y + 0.5) * T;

// ---------- kleine Zeichenhelfer ----------
function antTop(c, L, frame, last) {
  // Ameise von oben, Kopf nach rechts
  const sw = Math.sin(frame / 4 * Math.PI * 2);
  c.strokeStyle = '#2a140c'; c.lineWidth = L * 0.06; c.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const x = -L * 0.05 + i * L * 0.12, s = (i % 2 ? 1 : -1) * sw * L * 0.08;
    for (const side of [-1, 1]) {
      c.beginPath(); c.moveTo(x, 0);
      c.lineTo(x + L * 0.08 + s * side, side * L * 0.2);
      c.lineTo(x + L * 0.02 + s * side * 1.6, side * L * 0.34);
      c.stroke();
    }
  }
  const body = (x, rx, ry, col) => {
    const g = c.createRadialGradient(x - rx * 0.3, -ry * 0.35, rx * 0.1, x, 0, rx * 1.1);
    g.addColorStop(0, '#d0684a'); g.addColorStop(0.5, col); g.addColorStop(1, '#2a120a');
    c.fillStyle = g; c.beginPath(); c.ellipse(x, 0, rx, ry, 0, 0, 7); c.fill();
  };
  body(-L * 0.3, L * 0.22, L * 0.16, '#5a2416');
  body(0.02 * L, L * 0.14, L * 0.09, '#8a3a20');
  body(L * 0.27, L * 0.12, L * 0.11, '#7a2f1c');
  c.strokeStyle = '#3a1a0e'; c.lineWidth = L * 0.04;
  for (const side of [-1, 1]) { c.beginPath(); c.moveTo(L * 0.34, side * L * 0.05); c.lineTo(L * 0.45, side * L * 0.16); c.lineTo(L * 0.56, side * L * 0.12); c.stroke(); }
  if (last) {
    c.fillStyle = last; c.beginPath(); c.arc(L * 0.47, 0, L * 0.11, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = L * 0.02; c.stroke();
  }
}
const ANT_L = 13;
const antSprite = (frame, last = '') => cached(`antTop|${frame}|${last}`, ANT_L * 1.4, ANT_L * 1.0, c => { c.translate(ANT_L * 0.65, ANT_L * 0.5); antTop(c, ANT_L, frame, last); }, 4);
function drawAntTop(ctx, x, y, ang, frame, last) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.drawImage(antSprite(frame, last), -ANT_L * 0.65, -ANT_L * 0.5, ANT_L * 1.4, ANT_L);
  ctx.restore();
}
const LADUNG = { nahrung: '#ffcf40', material: '#a8743f', sterne: '#9ff0ff', tau: '#8fd3ff', pollen: '#ffb02e' };

// Quellen-Kunst (von oben), einmal gemalt
function quelleKunst(typ) {
  return cached('quelle|' + typ, T * 2, T * 2, c => {
    c.translate(T, T);
    const rnd = mulberry32(typ.length * 31 + typ.charCodeAt(0));
    const blob = (r, col, n = 9, jitter = 0.25) => {
      c.fillStyle = col; c.beginPath();
      for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2, rr = r * (1 - jitter / 2 + rnd() * jitter); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.closePath(); c.fill();
    };
    c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(4, 6, T * 0.62, T * 0.5, 0, 0, 7); c.fill();
    switch (typ) {
      case 'beeren':
        blob(T * 0.62, '#2f7d32', 12); blob(T * 0.5, '#3d9a3a', 10); blob(T * 0.3, '#56b84f', 8);
        for (let i = 0; i < 11; i++) { const a = rnd() * 7, r = rnd() * T * 0.45; c.fillStyle = '#e8323c'; c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r, 4, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(Math.cos(a) * r - 1.2, Math.sin(a) * r - 1.2, 1.2, 0, 7); c.fill(); }
        break;
      case 'samen':
        for (const [dx, dy, s] of [[-10, -8, 1], [12, 6, 0.8], [-4, 14, 0.7]]) {
          c.save(); c.translate(dx, dy); c.scale(s, s);
          for (let i = 0; i < 14; i++) { c.save(); c.rotate(i / 14 * Math.PI * 2); c.fillStyle = i % 2 ? '#ffd02e' : '#ffc107'; c.beginPath(); c.ellipse(13, 0, 8, 3.6, 0, 0, 7); c.fill(); c.restore(); }
          c.fillStyle = '#5a3418'; c.beginPath(); c.arc(0, 0, 9, 0, 7); c.fill();
          c.fillStyle = '#7a4a22'; for (let k = 0; k < 14; k++) { c.beginPath(); c.arc((rnd() - 0.5) * 12, (rnd() - 0.5) * 12, 1.3, 0, 7); c.fill(); }
          c.restore();
        }
        break;
      case 'blattlaus':
        for (let i = 0; i < 6; i++) { c.save(); c.rotate(i * 1.05 + 0.3); c.fillStyle = i % 2 ? '#48a83d' : '#5cc94a'; c.beginPath(); c.ellipse(T * 0.32, 0, T * 0.32, T * 0.13, 0, 0, 7); c.fill(); c.strokeStyle = 'rgba(30,80,20,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(4, 0); c.lineTo(T * 0.6, 0); c.stroke(); c.restore(); }
        for (let i = 0; i < 16; i++) { const a = rnd() * 7, r = 6 + rnd() * T * 0.42; c.fillStyle = '#b6f07a'; c.beginPath(); c.ellipse(Math.cos(a) * r, Math.sin(a) * r, 2.6, 2, a, 0, 7); c.fill(); }
        c.fillStyle = '#3a8a2e'; c.beginPath(); c.arc(0, 0, 5, 0, 7); c.fill();
        break;
      case 'zucker':
        c.save(); c.rotate(-0.25);
        for (let y = -3; y < 3; y++) for (let x = -3; x < 3; x++) { c.fillStyle = (x + y) & 1 ? '#ffffff' : '#e8414e'; c.fillRect(x * 10, y * 10, 10, 10); }
        c.restore();
        c.fillStyle = '#f6d7a0'; c.beginPath(); c.moveTo(-8, 4); c.lineTo(10, -4); c.lineTo(12, 8); c.closePath(); c.fill();
        c.fillStyle = '#ff9fc4'; c.fillRect(-6, -2, 16, 3);
        for (let i = 0; i < 12; i++) { c.fillStyle = '#f0c27a'; c.beginPath(); c.arc((rnd() - 0.5) * 50, (rnd() - 0.5) * 46, 1.5 + rnd() * 2, 0, 7); c.fill(); }
        break;
      case 'zweige':
        c.lineCap = 'round';
        for (let i = 0; i < 14; i++) { const a = rnd() * Math.PI, l = 14 + rnd() * 18; c.strokeStyle = ['#7a4a22', '#9a6030', '#5a3518', '#b07a40'][i % 4]; c.lineWidth = 2.5 + rnd() * 2.5; c.beginPath(); c.moveTo(-Math.cos(a) * l + (rnd() - 0.5) * 10, -Math.sin(a) * l * 0.6); c.lineTo(Math.cos(a) * l, Math.sin(a) * l * 0.6); c.stroke(); }
        for (let i = 0; i < 30; i++) { c.strokeStyle = '#4a6a2a'; c.lineWidth = 1; const x = (rnd() - 0.5) * 40, y = (rnd() - 0.5) * 30, a = rnd() * 7; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6); c.stroke(); }
        break;
      case 'harz': {
        const g = c.createRadialGradient(-6, -6, 2, 0, 0, T * 0.55);
        g.addColorStop(0, '#c08a55'); g.addColorStop(1, '#6a4020');
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, T * 0.5, 0, 7); c.fill();
        c.strokeStyle = 'rgba(70,40,15,.6)'; c.lineWidth = 1.2;
        for (let r = 5; r < T * 0.48; r += 4.5) { c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke(); }
        for (let i = 0; i < 5; i++) { const a = rnd() * 7; c.fillStyle = 'rgba(255,170,40,.9)'; c.beginPath(); c.ellipse(Math.cos(a) * T * 0.48, Math.sin(a) * T * 0.48, 4, 3, a, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(Math.cos(a) * T * 0.48 - 1, Math.sin(a) * T * 0.48 - 1, 1, 0, 7); c.fill(); }
        break;
      }
      case 'tau':
        for (let i = 0; i < 4; i++) { c.save(); c.rotate(i * 1.6); c.fillStyle = '#52b048'; c.beginPath(); c.ellipse(T * 0.3, 0, T * 0.34, T * 0.16, 0, 0, 7); c.fill(); c.restore(); }
        for (let i = 0; i < 9; i++) { const a = rnd() * 7, r = rnd() * T * 0.45, s = 2.5 + rnd() * 4; const x = Math.cos(a) * r, y = Math.sin(a) * r; const g = c.createRadialGradient(x - s * 0.3, y - s * 0.3, 0.5, x, y, s); g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#bfe9ff'); g.addColorStop(1, '#4fa8e8'); c.fillStyle = g; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); }
        break;
      case 'kristall':
        for (let i = 0; i < 9; i++) { const a = rnd() * 7, r = rnd() * T * 0.4, s = 4 + rnd() * 5; const x = Math.cos(a) * r, y = Math.sin(a) * r; c.fillStyle = ['#9ff0ff', '#d6b6ff', '#ffffff', '#8fd3ff'][i % 4]; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.8, y); c.lineTo(x, y + s); c.lineTo(x - s * 0.8, y); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.3, y - s * 0.2); c.lineTo(x - s * 0.2, y - s * 0.1); c.fill(); }
        break;
      case 'nachbar': {
        const g = c.createRadialGradient(-8, -8, 2, 0, 0, T * 0.75);
        g.addColorStop(0, '#d0844a'); g.addColorStop(1, '#6a3418');
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, T * 0.72, 0, 7); c.fill();
        c.strokeStyle = 'rgba(60,25,10,.5)'; for (let i = 0; i < 70; i++) { const a = rnd() * 7, r = rnd() * T * 0.68; c.lineWidth = 1; c.beginPath(); c.moveTo(Math.cos(a) * r, Math.sin(a) * r); c.lineTo(Math.cos(a) * r + 4, Math.sin(a) * r + 2); c.stroke(); }
        c.fillStyle = '#1a0a04'; c.beginPath(); c.arc(0, 0, 5, 0, 7); c.fill();
        c.strokeStyle = '#ddd'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(10, -6); c.lineTo(10, -30); c.stroke();
        c.fillStyle = '#e8323c'; c.beginPath(); c.moveTo(10, -30); c.lineTo(26, -25); c.lineTo(10, -20); c.fill();
        break;
      }
      case 'schatz':
        c.strokeStyle = '#b8231f'; c.lineWidth = 5; c.lineCap = 'round';
        c.beginPath(); c.moveTo(-10, -10); c.lineTo(10, 10); c.moveTo(10, -10); c.lineTo(-10, 10); c.stroke();
        break;
      case 'blumen': {
        blob(T * 0.6, '#4f9a3a', 12, 0.3);
        const cols = ['#ff6b9b', '#ffd34d', '#ffffff', '#b07cff', '#ff9f43', '#5fb4ff'];
        for (let i = 0; i < 16; i++) {
          const a = rnd() * 7, r = rnd() * T * 0.5, x = Math.cos(a) * r, y = Math.sin(a) * r, s = 3.2 + rnd() * 2.6, col = cols[i % cols.length];
          for (let k = 0; k < 5; k++) { const b = k * 1.256 + i; c.fillStyle = col; c.beginPath(); c.ellipse(x + Math.cos(b) * s * 0.8, y + Math.sin(b) * s * 0.8, s * 0.62, s * 0.4, b, 0, 7); c.fill(); }
          c.fillStyle = '#ffb02e'; c.beginPath(); c.arc(x, y, s * 0.45, 0, 7); c.fill();
          c.fillStyle = 'rgba(255,250,200,.9)'; c.beginPath(); c.arc(x - 0.6, y - 0.6, s * 0.18, 0, 7); c.fill();
        }
        break;
      }
      case 'loewenzahn':
        blob(T * 0.58, '#4a8f34', 10, 0.3);
        for (let i = 0; i < 8; i++) { c.save(); c.rotate(i * 0.8); c.fillStyle = '#3d7d2a'; c.beginPath(); c.ellipse(T * 0.38, 0, T * 0.24, 5, 0, 0, 7); c.fill(); c.restore(); }
        for (const [dx, dy, s] of [[-12, -6, 1], [10, 4, 0.85], [-2, 14, 0.75], [8, -14, 0.7]]) {
          c.save(); c.translate(dx, dy); c.scale(s, s);
          for (let k = 0; k < 22; k++) { c.save(); c.rotate(k / 22 * Math.PI * 2); c.fillStyle = k % 2 ? '#ffd21f' : '#ffc000'; c.beginPath(); c.ellipse(7, 0, 6, 1.8, 0, 0, 7); c.fill(); c.restore(); }
          c.fillStyle = '#ffb000'; c.beginPath(); c.arc(0, 0, 4.5, 0, 7); c.fill();
          c.restore();
        }
        // Pusteblume
        c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 0.8;
        for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; c.beginPath(); c.moveTo(16, 14); c.lineTo(16 + Math.cos(a) * 8, 14 + Math.sin(a) * 8); c.stroke(); }
        c.fillStyle = '#e8e2c8'; c.beginPath(); c.arc(16, 14, 2, 0, 7); c.fill();
        break;
      case 'klee':
        for (let i = 0; i < 14; i++) {
          const a = rnd() * 7, r = rnd() * T * 0.5, x = Math.cos(a) * r, y = Math.sin(a) * r;
          for (let k = 0; k < 3; k++) { const b = k * 2.094 + a; c.fillStyle = k % 2 ? '#3f9a3a' : '#4fb04a'; c.beginPath(); c.arc(x + Math.cos(b) * 3.4, y + Math.sin(b) * 3.4, 3.6, 0, 7); c.fill(); }
        }
        for (let i = 0; i < 6; i++) {
          const a = rnd() * 7, r = rnd() * T * 0.4, x = Math.cos(a) * r, y = Math.sin(a) * r;
          for (let k = 0; k < 10; k++) { const b = k * 0.628; c.fillStyle = i % 2 ? '#f6c8e0' : '#ffffff'; c.beginPath(); c.ellipse(x + Math.cos(b) * 3, y + Math.sin(b) * 3, 2.2, 1.2, b, 0, 7); c.fill(); }
          c.fillStyle = '#e88ab8'; c.beginPath(); c.arc(x, y, 1.6, 0, 7); c.fill();
        }
        break;
      case 'pilzring':
        blob(T * 0.55, 'rgba(60,110,40,.55)', 12, 0.2);
        for (let i = 0; i < 9; i++) {
          const a = i / 9 * Math.PI * 2, x = Math.cos(a) * T * 0.4, y = Math.sin(a) * T * 0.4, s = 5 + rnd() * 3;
          c.fillStyle = '#f2e6cf'; c.beginPath(); c.arc(x + 1, y + 2, s * 0.45, 0, 7); c.fill();
          const g = c.createRadialGradient(x - s * 0.3, y - s * 0.3, 1, x, y, s);
          g.addColorStop(0, i % 3 ? '#e8423c' : '#c98a4a'); g.addColorStop(1, i % 3 ? '#a8201c' : '#7a4a22');
          c.fillStyle = g; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill();
          if (i % 3) { c.fillStyle = '#fff'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x + (rnd() - 0.5) * s, y + (rnd() - 0.5) * s, 1, 0, 7); c.fill(); } }
        }
        break;
      case 'eichel': {
        c.fillStyle = 'rgba(10,40,10,.3)'; c.beginPath(); c.arc(6, 8, T * 0.72, 0, 7); c.fill();
        for (let k = 0; k < 10; k++) {
          const a = rnd() * 7, rr = rnd() * T * 0.42, sz = T * (0.3 + rnd() * 0.22);
          const g = c.createRadialGradient(Math.cos(a) * rr - sz * 0.3, Math.sin(a) * rr - sz * 0.4, sz * 0.1, Math.cos(a) * rr, Math.sin(a) * rr, sz);
          g.addColorStop(0, ['#6aa84a', '#5a9a3c', '#78b852'][k % 3]); g.addColorStop(1, '#2a5a1c');
          c.fillStyle = g; c.beginPath(); c.arc(Math.cos(a) * rr, Math.sin(a) * rr, sz, 0, 7); c.fill();
        }
        for (let i = 0; i < 5; i++) { const a = rnd() * 7, r = T * (0.3 + rnd() * 0.3); const x = Math.cos(a) * r, y = Math.sin(a) * r; c.fillStyle = '#b07a3a'; c.beginPath(); c.ellipse(x, y + 1.5, 2.6, 3.4, 0, 0, 7); c.fill(); c.fillStyle = '#6a4220'; c.beginPath(); c.ellipse(x, y - 1.4, 3, 1.8, 0, 0, 7); c.fill(); }
        break;
      }
      case 'fund':
        c.fillStyle = 'rgba(255,240,170,.35)'; c.beginPath(); c.ellipse(0, 4, T * 0.4, T * 0.26, 0, 0, 7); c.fill();
        c.strokeStyle = 'rgba(120,90,40,.45)'; c.lineWidth = 1;
        for (let i = 0; i < 10; i++) { const a = rnd() * 7, r = T * (0.2 + rnd() * 0.25); c.beginPath(); c.moveTo(Math.cos(a) * r, 4 + Math.sin(a) * r * 0.6); c.lineTo(Math.cos(a) * (r + 5), 4 + Math.sin(a) * (r + 5) * 0.6); c.stroke(); }
        break;
    }
  });
}

/**
 * Revier-Lager von oben: Zelt (1), Basislager (2), Außenposten (3). (x,y) = Mitte, s = Skalierung.
 * Wird auch für die Bauplan-Vorschau benutzt.
 */
export function zeichneLager(c, x, y, stufe, t = 0, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(4, 7, 26, 15, 0, 0, 7); c.fill();
  // festgetretener Platz
  c.fillStyle = '#b89462'; c.beginPath(); c.ellipse(0, 4, 24, 15, 0, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,240,200,.25)'; c.beginPath(); c.ellipse(-4, 1, 16, 8, 0, 0, 7); c.fill();
  const zelt = (zx, zy, k, farbe, farbe2) => {
    c.save(); c.translate(zx, zy); c.scale(k, k);
    c.fillStyle = farbe2; c.beginPath(); c.moveTo(-14, 8); c.lineTo(0, -14); c.lineTo(0, 10); c.closePath(); c.fill();
    c.fillStyle = farbe; c.beginPath(); c.moveTo(14, 8); c.lineTo(0, -14); c.lineTo(0, 10); c.closePath(); c.fill();
    c.fillStyle = '#4a2a14'; c.beginPath(); c.moveTo(-3, 9); c.lineTo(0, -2); c.lineTo(3, 9); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -14); c.lineTo(0, 10); c.stroke();
    c.restore();
  };
  if (stufe >= 2) {
    // Lagerfeuer mit Steinen
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; c.fillStyle = '#8d8a84'; c.beginPath(); c.arc(-12 + Math.cos(a) * 5, 9 + Math.sin(a) * 3.2, 1.8, 0, 7); c.fill(); }
    const fl = 0.75 + Math.sin(t * 9) * 0.15 + Math.sin(t * 13) * 0.1;
    c.fillStyle = `rgba(255,150,40,${fl})`; c.beginPath(); c.ellipse(-12, 7, 3.2, 4.5 * fl, 0, 0, 7); c.fill();
    c.fillStyle = `rgba(255,230,120,${fl})`; c.beginPath(); c.ellipse(-12, 8, 1.6, 2.4 * fl, 0, 0, 7); c.fill();
    // Vorratskiste
    c.fillStyle = '#9a6a3c'; c.fillRect(11, 6, 9, 7); c.strokeStyle = '#5e3a1e'; c.strokeRect(11, 6, 9, 7);
    zelt(-6, -2, 0.85, '#ff9f43', '#e07a1f');
    zelt(9, -5, 0.75, '#4fb4ff', '#2f8fd8');
  } else {
    zelt(0, -1, 1, '#ff9f43', '#e07a1f');
  }
  if (stufe >= 3) {
    // Turm mit Fahne
    c.fillStyle = '#7a4a22'; c.fillRect(16, -26, 4, 30); c.fillRect(24, -26, 4, 30);
    c.strokeStyle = '#7a4a22'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(18, -16); c.lineTo(26, -6); c.moveTo(26, -16); c.lineTo(18, -6); c.stroke();
    c.fillStyle = '#c08040'; c.fillRect(13, -30, 18, 5);
    c.strokeStyle = '#ddd'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(22, -30); c.lineTo(22, -46); c.stroke();
    const w = Math.sin(t * 3) * 2;
    c.fillStyle = '#e8323c'; c.beginPath(); c.moveTo(22, -46); c.quadraticCurveTo(28, -44 + w, 34, -43); c.lineTo(22, -38); c.fill();
  } else {
    // Wimpel am Zelt
    c.strokeStyle = '#ddd'; c.lineWidth = 1; c.beginPath(); c.moveTo(stufe >= 2 ? -6 : 0, stufe >= 2 ? -14 : -15); c.lineTo(stufe >= 2 ? -6 : 0, -24); c.stroke();
    c.fillStyle = '#ffd34d'; c.beginPath(); c.moveTo(stufe >= 2 ? -6 : 0, -24); c.lineTo((stufe >= 2 ? -6 : 0) + 8 + Math.sin(t * 3), -21); c.lineTo(stufe >= 2 ? -6 : 0, -18); c.fill();
  }
  c.restore();
}

export class RevierRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cam = { x: 0, y: 0, z: 1 };
    this.t = 0;
    this.hover = null;
    this.selected = null;   // Quellen-id
    this.tool = null;       // 'exp' = Expeditionsziel wählen
    this.fogVersion = -1;
    this.cacheKey = '';
    this.regen = [];
    for (let i = 0; i < 160; i++) this.regen.push([Math.random(), Math.random(), 0.6 + Math.random() * 0.8]);
  }

  get vw() { return this.canvas.clientWidth || window.innerWidth; }
  get vh() { return this.canvas.clientHeight || window.innerHeight; }

  setState(state) {
    this.state = state;
    this.base = this.makeBase(state.revier.seed);
    this.fogVersion = -1;
    this.cacheKey = '';
    this.focusNest();
  }

  focusNest() {
    this.cam.z = clamp(Math.min(this.vw / 1100, this.vh / 760), 0.55, 1.4);
    this.centerOn(NX, NY);
  }
  centerOn(wx, wy) { this.cam.x = wx - this.vw / 2 / this.cam.z; this.cam.y = wy - this.vh / 2 / this.cam.z; this.clampCam(); }
  clampCam() {
    const minZ = Math.max(this.vw / (MW + 300), this.vh / (MH + 300), 0.35);
    this.cam.z = clamp(this.cam.z, minZ, 2.4);
    const vw = this.vw / this.cam.z, vh = this.vh / this.cam.z;
    this.cam.x = vw >= MW ? (MW - vw) / 2 : clamp(this.cam.x, -150, MW - vw + 150);
    this.cam.y = vh >= MH ? (MH - vh) / 2 : clamp(this.cam.y, -150, MH - vh + 150);
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
  cellAt(sx, sy) { const [wx, wy] = this.screenToWorld(sx, sy); return [Math.floor(wx / T), Math.floor(wy / T)]; }
  nestScreen() { return this.worldToScreen(NX, NY); }

  /** Lager unter dem Mauszeiger */
  lagerAt(sx, sy) {
    const [wx, wy] = this.screenToWorld(sx, sy);
    let best = null, bd = T * 0.8;
    for (const l of this.state.revier.lager ?? []) {
      const d = Math.hypot((l.x + 0.5) * T - wx, (l.y + 0.5) * T - wy);
      if (d < bd) { bd = d; best = l; }
    }
    return best;
  }

  /** Quelle unter dem Mauszeiger (nur entdeckte) */
  quelleAt(sx, sy) {
    const [wx, wy] = this.screenToWorld(sx, sy);
    let best = null, bd = T * 0.9;
    for (const q of this.state.revier.quellen) {
      if (!q.entdeckt || ((q.typ === 'schatz' || q.typ === 'fund') && q.menge <= 0)) continue;
      const d = Math.hypot((q.x + 0.5) * T - wx, (q.y + 0.5) * T - wy);
      if (d < bd) { bd = d; best = q; }
    }
    return best;
  }

  // ---------- Boden ----------
  makeBase(seed) {
    const cv = document.createElement('canvas');
    cv.width = MW; cv.height = MH;
    const c = cv.getContext('2d');
    const rnd = mulberry32(seed + 77);
    const n = makeNoise(seed + 5);
    // Wiese mit großflächigen Farbwolken
    const sc = 8, w = Math.ceil(MW / sc), h = Math.ceil(MH / sc);
    const low = document.createElement('canvas'); low.width = w; low.height = h;
    const lc = low.getContext('2d'); const img = lc.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = n(x * 0.06, y * 0.06, 4), v2 = n(x * 0.2 + 30, y * 0.2, 2);
      const i = (y * w + x) * 4;
      img.data[i] = 70 + v * 70 + v2 * 14; img.data[i + 1] = 140 + v * 70 + v2 * 10; img.data[i + 2] = 50 + v * 30; img.data[i + 3] = 255;
    }
    lc.putImageData(img, 0, 0);
    c.imageSmoothingQuality = 'high';
    c.drawImage(low, 0, 0, MW, MH);
    // Sandweg in Schlangenlinie
    const weg = new Path2D();
    weg.moveTo(-40, MH * 0.78);
    weg.bezierCurveTo(MW * 0.25, MH * 0.55, MW * 0.35, MH * 1.0, MW * 0.55, MH * 0.82);
    weg.bezierCurveTo(MW * 0.75, MH * 0.66, MW * 0.85, MH * 0.95, MW + 40, MH * 0.7);
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(120,90,50,.35)'; c.lineWidth = 46; c.stroke(weg);
    c.strokeStyle = '#d8bf8a'; c.lineWidth = 36; c.stroke(weg);
    c.strokeStyle = 'rgba(255,240,200,.35)'; c.lineWidth = 12; c.stroke(weg);
    // Teich
    const tx = MW * 0.2, ty = MH * 0.25;
    const teich = new Path2D();
    for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2, r = 95 + Math.sin(i * 1.7) * 14 + Math.cos(i * 0.9) * 10; teich.lineTo(tx + Math.cos(a) * r * 1.3, ty + Math.sin(a) * r * 0.85); }
    teich.closePath();
    c.fillStyle = '#8a7a50'; c.save(); c.translate(0, 6); c.fill(teich); c.restore();
    const tg = c.createRadialGradient(tx - 20, ty - 20, 10, tx, ty, 140);
    tg.addColorStop(0, '#7ccbf0'); tg.addColorStop(0.6, '#3d8fc8'); tg.addColorStop(1, '#2a6a9a');
    c.fillStyle = tg; c.fill(teich);
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3; c.stroke(teich);
    for (let i = 0; i < 6; i++) { const a = rnd() * 7, r = rnd() * 70; c.fillStyle = '#3f9a3a'; c.beginPath(); c.arc(tx + Math.cos(a) * r * 1.2, ty + Math.sin(a) * r * 0.7, 9 + rnd() * 6, 0.4, Math.PI * 2 - 0.2); c.lineTo(tx + Math.cos(a) * r * 1.2, ty + Math.sin(a) * r * 0.7); c.fill(); }
    c.fillStyle = '#ff8fb1'; c.beginPath(); c.arc(tx + 30, ty - 12, 5, 0, 7); c.fill();
    // Grashalme & Klee
    const fl = (MW * MH) / (44 * 30 * 48 * 48);
    for (let i = 0; i < 9000 * fl; i++) {
      const x = rnd() * MW, y = rnd() * MH, a = rnd() * Math.PI * 2, l = 2 + rnd() * 5;
      c.strokeStyle = rnd() < 0.5 ? 'rgba(40,100,30,.35)' : 'rgba(170,230,120,.3)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
    }
    for (let i = 0; i < 70 * fl; i++) {
      const x = rnd() * MW, y = rnd() * MH;
      for (let k = 0; k < 3; k++) { c.fillStyle = 'rgba(60,140,50,.6)'; c.beginPath(); c.arc(x + Math.cos(k * 2.1) * 4, y + Math.sin(k * 2.1) * 4, 4, 0, 7); c.fill(); }
    }
    // Blumen
    const blumen = ['#ff6b8b', '#ffd34d', '#ffffff', '#b07cff', '#5fb4ff', '#ff9f43'];
    for (let i = 0; i < 260 * fl; i++) {
      const x = rnd() * MW, y = rnd() * MH, col = blumen[(rnd() * blumen.length) | 0], s = 2 + rnd() * 2.2;
      for (let k = 0; k < 5; k++) { const a = k * 1.256; c.fillStyle = col; c.beginPath(); c.arc(x + Math.cos(a) * s, y + Math.sin(a) * s, s * 0.8, 0, 7); c.fill(); }
      c.fillStyle = '#ffe680'; c.beginPath(); c.arc(x, y, s * 0.6, 0, 7); c.fill();
    }
    // Steine
    for (let i = 0; i < 26 * fl; i++) {
      const x = rnd() * MW, y = rnd() * MH, r = 6 + rnd() * 16;
      if (Math.hypot(x - NX, y - NY) < 200) continue;
      c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(x + 4, y + 5, r, r * 0.8, 0, 0, 7); c.fill();
      const g = c.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r);
      g.addColorStop(0, '#d8d4cc'); g.addColorStop(1, '#7a7670');
      c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r, r * 0.8, rnd(), 0, 7); c.fill();
    }
    // Baumkronen am Rand (mit Schatten)
    const baum = (x, y, r) => {
      c.fillStyle = 'rgba(10,40,10,.3)'; c.beginPath(); c.arc(x + 18, y + 22, r, 0, 7); c.fill();
      for (let k = 0; k < 9; k++) {
        const a = rnd() * 7, rr = rnd() * r * 0.55, s = r * (0.45 + rnd() * 0.3);
        const g = c.createRadialGradient(x + Math.cos(a) * rr - s * 0.3, y + Math.sin(a) * rr - s * 0.4, s * 0.1, x + Math.cos(a) * rr, y + Math.sin(a) * rr, s);
        g.addColorStop(0, ['#5fc957', '#4cb04a', '#6ad35f'][k % 3]); g.addColorStop(1, '#1f5a22');
        c.fillStyle = g; c.beginPath(); c.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, s, 0, 7); c.fill();
      }
    };
    // zweiter Teich & Bach im großen Revier
    const t2x = MW * 0.8, t2y = MH * 0.22;
    const teich2 = new Path2D();
    for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2, r = 70 + Math.sin(i * 2.3) * 12; teich2.lineTo(t2x + Math.cos(a) * r * 1.4, t2y + Math.sin(a) * r * 0.8); }
    teich2.closePath();
    c.fillStyle = '#8a7a50'; c.save(); c.translate(0, 5); c.fill(teich2); c.restore();
    const tg2 = c.createRadialGradient(t2x - 15, t2y - 15, 8, t2x, t2y, 110);
    tg2.addColorStop(0, '#86d3f4'); tg2.addColorStop(0.6, '#3d8fc8'); tg2.addColorStop(1, '#2a6a9a');
    c.fillStyle = tg2; c.fill(teich2);
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3; c.stroke(teich2);
    const bach = new Path2D();
    bach.moveTo(t2x - 90, t2y + 40);
    bach.bezierCurveTo(MW * 0.7, MH * 0.4, MW * 0.92, MH * 0.55, MW * 0.86, MH + 30);
    c.strokeStyle = 'rgba(90,70,40,.35)'; c.lineWidth = 26; c.stroke(bach);
    c.strokeStyle = '#4f9fd6'; c.lineWidth = 18; c.stroke(bach);
    c.strokeStyle = 'rgba(220,245,255,.45)'; c.lineWidth = 4; c.setLineDash([14, 18]); c.stroke(bach); c.setLineDash([]);
    for (let i = 0; i < 16 * Math.max(1, fl * 0.8); i++) {
      const seite = i % 4, u = rnd();
      const x = seite === 0 ? u * MW : seite === 1 ? MW + 20 - rnd() * 60 : seite === 2 ? u * MW : -20 + rnd() * 60;
      const y = seite === 0 ? -20 + rnd() * 60 : seite === 1 ? u * MH : seite === 2 ? MH + 20 - rnd() * 60 : u * MH;
      baum(x, y, 70 + rnd() * 60);
    }
    // Duftmarken-Ring um den Hügel (Revier-Grenze der Anfangszeit)
    c.strokeStyle = 'rgba(255,230,150,.18)'; c.lineWidth = 2; c.setLineDash([6, 10]);
    c.beginPath(); c.arc(NX, NY, REVIER.startSicht * T, 0, 7); c.stroke(); c.setLineDash([]);
    return cv;
  }

  // ---------- Nebel ----------
  makeFog() {
    const r = this.state.revier;
    const fw = REVIER.W * 8, fh = REVIER.H * 8;
    if (!this.fog) {
      this.fog = document.createElement('canvas'); this.fog.width = fw; this.fog.height = fh;
      // Wolkentextur
      this.fogTex = document.createElement('canvas'); this.fogTex.width = fw; this.fogTex.height = fh;
      const tc = this.fogTex.getContext('2d'); const img = tc.createImageData(fw, fh);
      const n = makeNoise(r.seed + 9);
      for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
        const v = n(x * 0.035, y * 0.035, 4);
        const i = (y * fw + x) * 4;
        img.data[i] = 168 + v * 70; img.data[i + 1] = 186 + v * 60; img.data[i + 2] = 212 + v * 38; img.data[i + 3] = 255;
      }
      tc.putImageData(img, 0, 0);
    }
    const c = this.fog.getContext('2d');
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, fw, fh);
    // Maske: weiche Flecken über unerforschten Feldern
    for (let y = -1; y <= REVIER.H; y++) for (let x = -1; x <= REVIER.W; x++) {
      const inside = x >= 0 && y >= 0 && x < REVIER.W && y < REVIER.H;
      if (inside && r.sicht[y * REVIER.W + x]) continue;
      drawGlow(c, '255,255,255', x * 8 + 4, y * 8 + 4, 13, 1, 0.45);
    }
    c.globalCompositeOperation = 'source-in';
    c.drawImage(this.fogTex, 0, 0);
    c.globalCompositeOperation = 'source-over';
    this.fogVersion = r.sichtVersion ?? 0;
  }

  staticLayer() {
    const cw = this.canvas.width, ch = this.canvas.height;
    if (!this.cache || this.cache.width !== cw || this.cache.height !== ch) {
      this.cache = document.createElement('canvas'); this.cache.width = cw; this.cache.height = ch; this.cacheKey = '';
    }
    if ((this.state.revier.sichtVersion ?? 0) !== this.fogVersion) this.makeFog();
    const key = `${this.cam.x.toFixed(2)}|${this.cam.y.toFixed(2)}|${this.cam.z.toFixed(4)}|${this.fogVersion}|${this.state.world.hill}`;
    if (key === this.cacheKey) return this.cache;
    this.cacheKey = key;
    const c = this.cache.getContext('2d');
    const z = this.cam.z, k = cw / this.vw;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#2f5a24'; c.fillRect(0, 0, cw, ch);
    c.setTransform(k * z, 0, 0, k * z, -this.cam.x * z * k, -this.cam.y * z * k);
    c.imageSmoothingQuality = 'medium';
    const x0 = clamp(Math.floor(this.cam.x), 0, MW), y0 = clamp(Math.floor(this.cam.y), 0, MH);
    const x1 = clamp(Math.ceil(this.cam.x + this.vw / z), 0, MW), y1 = clamp(Math.ceil(this.cam.y + this.vh / z), 0, MH);
    if (x1 > x0 && y1 > y0) c.drawImage(this.base, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
    this.drawHill(c);
    c.imageSmoothingQuality = 'high';
    c.globalAlpha = 0.94;
    c.drawImage(this.fog, 0, 0, MW, MH);
    c.globalAlpha = 1;
    // Rand des Reviers
    c.fillStyle = 'rgba(20,40,20,.55)';
    c.fillRect(-400, -400, MW + 800, 400); c.fillRect(-400, MH, MW + 800, 400);
    c.fillRect(-400, 0, 400, MH); c.fillRect(MW, 0, 400, MH);
    return this.cache;
  }

  drawHill(c) {
    const lvl = this.state.world.hill;
    const R = T * (1.1 + lvl * 0.32);
    c.fillStyle = 'rgba(30,20,5,.35)'; c.beginPath(); c.ellipse(NX + 10, NY + 14, R * 1.05, R, 0, 0, 7); c.fill();
    const g = c.createRadialGradient(NX - R * 0.35, NY - R * 0.4, R * 0.1, NX, NY, R);
    g.addColorStop(0, '#c88a50'); g.addColorStop(0.6, '#8a5428'); g.addColorStop(1, '#5a3418');
    c.fillStyle = g; c.beginPath(); c.arc(NX, NY, R, 0, 7); c.fill();
    const rnd = mulberry32(lvl * 999);
    for (let i = 0; i < 260 * lvl; i++) {
      const a = rnd() * 7, r = Math.sqrt(rnd()) * R * 0.96, l = 3 + rnd() * 6, b = rnd() * Math.PI;
      c.strokeStyle = ['#5a3518', '#7a4a22', '#9a6030', '#c08040', '#3f2510'][(rnd() * 5) | 0]; c.lineWidth = 1;
      const x = NX + Math.cos(a) * r, y = NY + Math.sin(a) * r;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(b) * l, y + Math.sin(b) * l); c.stroke();
    }
    // Eingänge
    for (let i = 0; i < 2 + lvl; i++) {
      const a = (i / (2 + lvl)) * Math.PI * 2 + 0.4, r = i === 0 ? 0 : R * 0.55;
      c.fillStyle = '#1a0c04'; c.beginPath(); c.ellipse(NX + Math.cos(a) * r, NY + Math.sin(a) * r, 5, 4, a, 0, 7); c.fill();
    }
  }

  // ---------- Pro Bild ----------
  frame(dt, d) {
    const st = this.state;
    if (!st) return;
    this.t += dt;
    const t = this.t, r = st.revier, ctx = this.ctx;
    const dpr = this.canvas.width / this.vw, z = this.cam.z;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.staticLayer(), 0, 0);
    ctx.setTransform(dpr * z, 0, 0, dpr * z, -this.cam.x * z * dpr, -this.cam.y * z * dpr);
    const view = { x0: this.cam.x - 60, y0: this.cam.y - 60, x1: this.cam.x + this.vw / z + 60, y1: this.cam.y + this.vh / z + 60 };
    const inView = (x, y) => x > view.x0 && x < view.x1 && y > view.y0 && y < view.y1;

    // Gebäude an der Oberfläche rund um den Hügel
    const ober = st.rooms.filter(rr => GEBAEUDE[rr.typ].zone !== 'erde' && rr.bau >= 1);
    ober.forEach((rr, i) => {
      const a = -Math.PI / 2 + (i + 0.5) * (Math.PI * 2 / Math.max(6, ober.length));
      const R = T * (1.6 + st.world.hill * 0.32);
      drawEmoji(ctx, GEBAEUDE[rr.typ].icon, NX + Math.cos(a) * R, NY + Math.sin(a) * R + 7, 18);
    });

    // Lager (Zelte) mit Pfad zum Hügel
    for (const l of r.lager ?? []) {
      const lx = (l.x + 0.5) * T, ly = (l.y + 0.5) * T;
      ctx.strokeStyle = 'rgba(214,180,120,.35)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(NX, NY); ctx.lineTo(lx, ly); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,240,200,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 8]);
      ctx.beginPath(); ctx.moveTo(NX, NY); ctx.lineTo(lx, ly); ctx.stroke(); ctx.setLineDash([]);
    }
    for (const l of r.lager ?? []) {
      const lx = (l.x + 0.5) * T, ly = (l.y + 0.5) * T;
      if (!inView(lx, ly)) continue;
      if (this.lagerSel === l.id) {
        ctx.strokeStyle = `rgba(255,236,140,${0.65 + 0.35 * Math.sin(t * 4)})`; ctx.lineWidth = 3; ctx.setLineDash([7, 5]); ctx.lineDashOffset = -t * 10;
        ctx.beginPath(); ctx.arc(lx, ly, T * 0.9, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      }
      if (l.bau < 1) {
        ctx.globalAlpha = 0.45 + 0.4 * l.bau; zeichneLager(ctx, lx, ly, l.stufe, t, 0.9); ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.roundRect(lx - 22, ly + 22, 44, 6, 3); ctx.fill();
        ctx.fillStyle = '#ffcf3a'; ctx.beginPath(); ctx.roundRect(lx - 22, ly + 22, 44 * l.bau, 6, 3); ctx.fill();
        // fleißige Erkunderinnen beim Aufbauen
        for (let i = 0; i < 3; i++) { const a = t * 1.5 + i * 2.1; drawAntTop(ctx, lx + Math.cos(a) * 20, ly + Math.sin(a) * 13, a + Math.PI / 2, Math.floor(t * 10 + i) % 4, '#a8743f'); }
      } else {
        drawGlow(ctx, '255,200,120', lx, ly, 40, 0.18 + (d.istNacht ? 0.25 : 0));
        zeichneLager(ctx, lx, ly, l.stufe, t, 0.9);
      }
    }

    // Duftstraßen & Sammel-Trupps (vom nächsten Stützpunkt aus – Hügel oder Lager)
    const raten = d.revier;
    for (const [qid, tr] of Object.entries(r.trupps)) {
      const q = r.quellen.find(x => x.id === +qid);
      if (!q) continue;
      const Q = QUELLEN[q.typ];
      const qx = (q.x + 0.5) * T, qy = (q.y + 0.5) * T;
      const basis = naechsteBasis(r, q.x, q.y);
      const NX = (basis.x + 0.5) * T, NY = (basis.y + 0.5) * T;
      const mx = (NX + qx) / 2, my = (NY + qy) / 2;
      const nx = -(qy - NY), ny = qx - NX, nl = Math.hypot(nx, ny) || 1;
      const bend = ((q.id * 37) % 7 - 3) * 0.06 * nl;
      const cx = mx + (nx / nl) * bend, cy = my + (ny / nl) * bend;
      const aktiv = (raten.pro.get(q.id) ?? 0) > 0 || Q.gibt === 'tau';
      if (tr.s > 0) {
        ctx.lineCap = 'round';
        ctx.strokeStyle = aktiv ? 'rgba(255,214,90,.22)' : 'rgba(200,200,200,.18)'; ctx.lineWidth = 12;
        ctx.beginPath(); ctx.moveTo(NX, NY); ctx.quadraticCurveTo(cx, cy, qx, qy); ctx.stroke();
        ctx.strokeStyle = aktiv ? 'rgba(255,226,120,.85)' : 'rgba(220,220,220,.5)'; ctx.lineWidth = 2.2;
        ctx.setLineDash([3, 9]); ctx.lineDashOffset = -t * 26;
        ctx.beginPath(); ctx.moveTo(NX, NY); ctx.quadraticCurveTo(cx, cy, qx, qy); ctx.stroke();
        ctx.setLineDash([]);
        // laufende Ameisen auf der Straße
        const n = Math.min(14, 2 + Math.ceil(tr.s * (d.revierFaktor ?? 1) / 2));
        const len = Math.hypot(qx - NX, qy - NY) + 1;
        const v = (32 * (1 + (d.fx.revierBonus ?? 0))) / len * (d.regen ? 0.5 : 1);
        for (let i = 0; i < n; i++) {
          let u = (t * v + i / n + q.id * 0.13) % 2;
          const zurueck = u > 1;
          if (zurueck) u = 2 - u;
          const ix = (1 - u) * (1 - u) * NX + 2 * (1 - u) * u * cx + u * u * qx;
          const iy = (1 - u) * (1 - u) * NY + 2 * (1 - u) * u * cy + u * u * qy;
          const dx = 2 * (1 - u) * (cx - NX) + 2 * u * (qx - cx), dy = 2 * (1 - u) * (cy - NY) + 2 * u * (qy - cy);
          const dl = Math.hypot(dx, dy) || 1;
          const off = zurueck ? -4 : 4;
          const px = ix + (-dy / dl) * off, py = iy + (dx / dl) * off;
          if (!inView(px, py)) continue;
          const ang = Math.atan2(dy, dx) + (zurueck ? Math.PI : 0);
          drawAntTop(ctx, px, py, ang, Math.floor(t * 10 + i) % 4, zurueck && aktiv ? LADUNG[Q.pollen ? 'pollen' : Q.gibt] : '');
        }
      }
    }

    // Quellen
    const ahnen = hatFreischaltung(st, 'quellenAhnen');
    for (const q of r.quellen) {
      const x = (q.x + 0.5) * T, y = (q.y + 0.5) * T;
      if (!inView(x, y)) continue;
      if (!q.entdeckt) {
        if (ahnen && q.menge > 0) drawEmoji(ctx, '❔', x, y + 8, 20, 0.55 + 0.2 * Math.sin(t * 2 + q.id));
        continue;
      }
      if ((q.typ === 'schatz' || q.typ === 'fund') && q.menge <= 0) continue;
      const Q = QUELLEN[q.typ];
      if (q.typ === 'fund') {
        const b = Math.sin(t * 2.5 + q.id) * 2;
        if (this.selected === q.id) { ctx.strokeStyle = `rgba(255,236,140,${0.65 + 0.35 * Math.sin(t * 4)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, T * 0.75, 0, 7); ctx.stroke(); }
        drawGlow(ctx, '255,250,200', x, y, 26 + b, 0.45);
        ctx.drawImage(quelleKunst(q.typ), x - T, y - T, T * 2, T * 2);
        drawEmoji(ctx, FUNDE[q.fund]?.icon ?? '✨', x, y + 7 + b, 20);
        if (Math.sin(t * 3 + q.id * 1.7) > 0.85) drawEmoji(ctx, '✨', x + 12, y - 10, 11);
        continue;
      }
      const leer = Q.gibt && Q.gibt !== 'tau' && q.menge <= 0.5;
      if (this.selected === q.id) {
        ctx.strokeStyle = `rgba(255,236,140,${0.65 + 0.35 * Math.sin(t * 4)})`; ctx.lineWidth = 3;
        ctx.setLineDash([7, 5]); ctx.lineDashOffset = -t * 10;
        ctx.beginPath(); ctx.arc(x, y, T * 0.95, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      } else if (this.hover?.id === q.id) {
        ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, T * 0.9, 0, 7); ctx.stroke();
      }
      if (q.typ === 'schatz') {
        const b = Math.sin(t * 3 + q.id) * 3;
        drawGlow(ctx, '255,230,120', x, y, 34 + b * 2, 0.6);
        ctx.drawImage(quelleKunst(q.typ), x - T, y - T, T * 2, T * 2);
        drawEmoji(ctx, '🎁', x, y + 8 + b, 24);
        continue;
      }
      ctx.globalAlpha = leer ? 0.45 : 1;
      ctx.drawImage(quelleKunst(q.typ), x - T, y - T, T * 2, T * 2);
      ctx.globalAlpha = 1;
      // Vorratsring
      if (Q.gibt && Q.gibt !== 'tau') {
        const p = clamp(q.menge / q.max, 0, 1);
        ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(x, y, T * 0.72, -Math.PI / 2, Math.PI * 1.5); ctx.stroke();
        ctx.strokeStyle = p > 0.5 ? '#7dff8a' : p > 0.2 ? '#ffd34d' : '#ff6b6b';
        ctx.beginPath(); ctx.arc(x, y, T * 0.72, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.stroke();
      }
      // Symbol-Plakette
      const tr = r.trupps[q.id];
      const bx = x + T * 0.55, by = y - T * 0.55;
      ctx.fillStyle = 'rgba(30,20,10,.82)'; ctx.beginPath(); ctx.roundRect(bx - 13, by - 13, 26, 26, 9); ctx.fill();
      drawEmoji(ctx, Q.icon, bx, by + 6, 15);
      if (tr?.s || tr?.w) {
        const txt = `${tr.s ? '🧺' + tr.s : ''}${tr.w ? ' 🛡️' + tr.w : ''}`;
        ctx.font = 'bold 12px Fredoka, sans-serif'; ctx.textAlign = 'center';
        const tw = ctx.measureText(txt).width + 12;
        ctx.fillStyle = 'rgba(255,201,60,.95)'; ctx.beginPath(); ctx.roundRect(x - tw / 2, y + T * 0.78, tw, 18, 9); ctx.fill();
        ctx.fillStyle = '#3b2300'; ctx.fillText(txt, x, y + T * 0.78 + 13.5);
      }
      // Wächterinnen kreisen um die Quelle
      const w = Math.min(8, tr?.w ?? 0);
      for (let i = 0; i < w; i++) {
        const a = t * 0.8 + (i / w) * Math.PI * 2;
        drawAntTop(ctx, x + Math.cos(a) * T * 0.62, y + Math.sin(a) * T * 0.62, a + Math.PI / 2, Math.floor(t * 8 + i) % 4, '#c9d3e6');
      }
      // Störenfried
      if (q.stoerer) {
        const S = STOERER[q.stoerer.typ];
        const p = 0.5 + 0.5 * Math.sin(t * 5);
        ctx.strokeStyle = `rgba(255,80,80,${0.35 + p * 0.4})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, T * (0.75 + p * 0.12), 0, 7); ctx.stroke();
        drawEmoji(ctx, S.icon, x - T * 0.15 + Math.sin(t * 2.3) * 6, y - T * 0.15 + Math.cos(t * 3.1) * 4 + 10, 26);
        const hp = clamp(q.stoerer.kraft / q.stoerer.max, 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.roundRect(x - 22, y - T * 0.98, 44, 6, 3); ctx.fill();
        ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.roundRect(x - 22, y - T * 0.98, 44 * hp, 6, 3); ctx.fill();
      }
    }

    // Expeditionen
    for (const e of r.exp) {
      const ex = (e.x + 0.5) * T, ey = (e.y + 0.5) * T, tx = (e.tx + 0.5) * T, ty = (e.ty + 0.5) * T;
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.setLineDash([2, 7]);
      const HX = ((e.hx ?? NEST.x) + 0.5) * T, HY = ((e.hy ?? NEST.y) + 0.5) * T;
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(e.phase === 'heim' ? HX : tx, e.phase === 'heim' ? HY : ty); ctx.stroke(); ctx.setLineDash([]);
      if (e.phase !== 'heim') {
        const p = 0.5 + 0.5 * Math.sin(t * 4);
        ctx.strokeStyle = `rgba(255,120,80,${0.5 + p * 0.4})`; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(tx, ty, 12 + p * 6, 0, 7); ctx.stroke();
      }
      drawGlow(ctx, '255,255,220', ex, ey, (REVIER.expSicht + (d.fx.sicht ?? 0) * 0.8) * T, 0.12);
      const ang = e.phase === 'heim' ? Math.atan2(HY - ey, HX - ex) : Math.atan2(ty - ey, tx - ex);
      const n = Math.min(5, e.n);
      for (let i = 0; i < n; i++) {
        const ox = Math.cos(ang + 2.4 + i * 0.9) * (i ? 9 : 0), oy = Math.sin(ang + 2.4 + i * 0.9) * (i ? 9 : 0);
        drawAntTop(ctx, ex + ox, ey + oy, e.phase === 'suche' ? t * 3 + i : ang, Math.floor(t * 12 + i) % 4, (e.fund || e.fundstueck) && e.phase === 'heim' ? '#ffd34d' : '');
      }
      drawEmoji(ctx, e.phase === 'suche' ? '🔍' : '🚩', ex + 4, ey - 12, 16);
    }

    // Werkzeug: Expeditionsziel-Vorschau
    if (this.tool === 'zelt' && this.hoverCell) {
      const [hx, hy] = this.hoverCell;
      const x = (hx + 0.5) * T, y = (hy + 0.5) * T;
      const ok = lagerPlatz(r, hx, hy).ok;
      ctx.fillStyle = ok ? 'rgba(120,255,140,.22)' : 'rgba(255,90,90,.22)';
      ctx.strokeStyle = ok ? 'rgba(120,255,140,.9)' : 'rgba(255,90,90,.9)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, T * 0.8, 0, 7); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 0.75; zeichneLager(ctx, x, y, 1, t, 0.9); ctx.globalAlpha = 1;
      if (ok) { ctx.strokeStyle = 'rgba(255,240,200,.35)'; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(x, y, (GEBAEUDE.zelt.sicht ?? 3) * T, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    }
    if (this.tool === 'exp' && this.hoverCell) {
      const [hx, hy] = this.hoverCell;
      const x = (hx + 0.5) * T, y = (hy + 0.5) * T;
      const b = naechsteBasis(r, hx, hy);
      const BX = (b.x + 0.5) * T, BY = (b.y + 0.5) * T;
      ctx.strokeStyle = 'rgba(255,240,170,.9)'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 20;
      ctx.beginPath(); ctx.moveTo(BX, BY); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
      if (b.lager) drawEmoji(ctx, '⛺', BX, BY - 16, 14);
      ctx.fillStyle = 'rgba(255,240,170,.25)'; ctx.beginPath(); ctx.arc(x, y, (REVIER.expSicht + (d.fx.sicht ?? 0) * 0.8) * T, 0, 7); ctx.fill();
      drawEmoji(ctx, '🚩', x, y + 6, 24);
    }

    // Wolkenschatten ziehen über die Wiese
    for (let i = 0; i < 5; i++) {
      const x = ((t * 9 + i * 520) % (MW + 600)) - 300, y = (i * 271) % MH;
      drawGlow(ctx, '10,30,10', x, y, 170 + i * 20, 0.18);
    }

    // Tag/Nacht
    const ph = d.tagPhase;
    const night = ph > 0.7 ? clamp((ph - 0.7) / 0.08, 0, 1) * (ph > 0.96 ? clamp((1 - ph) / 0.04, 0, 1) : 1) : ph < 0.04 ? 0.3 * (1 - ph / 0.04) : 0;
    const dusk = ph > 0.6 && ph < 0.74 ? Math.sin(((ph - 0.6) / 0.14) * Math.PI) : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (dusk > 0.02) { ctx.fillStyle = `rgba(255,120,60,${dusk * 0.14})`; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); }
    if (night > 0.02) {
      ctx.fillStyle = `rgba(8,14,48,${night * 0.5})`; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.setTransform(dpr * z, 0, 0, dpr * z, -this.cam.x * z * dpr, -this.cam.y * z * dpr);
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, '255,170,80', NX, NY, T * 3, night * 0.35);
      for (let i = 0; i < 24; i++) {
        const x = ((i * 211.7 + Math.sin(t * 0.3 + i) * 60) % MW + MW) % MW, y = ((i * 137.3 + Math.cos(t * 0.25 + i) * 50) % MH + MH) % MH;
        drawGlow(ctx, '230,255,140', x, y, 10, night * (0.5 + 0.5 * Math.sin(t * 3 + i * 1.7)));
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // Regen
    if (d.regen) {
      const a = clamp(r.wetter.t / 3, 0, 1);
      ctx.fillStyle = `rgba(40,60,90,${0.22 * a})`; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.strokeStyle = `rgba(200,225,255,${0.45 * a})`; ctx.lineWidth = 1.2 * dpr;
      ctx.beginPath();
      const W = this.canvas.width, H = this.canvas.height;
      for (const [rx, ry, s] of this.regen) {
        const y = ((ry + t * 1.4 * s) % 1) * H, x = ((rx + t * 0.15 * s) % 1) * W;
        ctx.moveTo(x, y); ctx.lineTo(x - 5 * dpr, y + 18 * dpr * s);
      }
      ctx.stroke();
    }
  }
}

export { distNest, sichtbar };
