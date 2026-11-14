// Ausbaustufen der Kammern (Entwicklungslinien): Einrichtung für alle Gebäude ab Stufe 2,
// die allgemeine „Stufen-Verschönerung“ (Tapete, Vertäfelung, Goldleisten, edlere Lampen,
// Sterne am Schild) und die Animationen der Ausbaustufen.
// Alle Zeichnungen richten sich nach der tatsächlichen Raumgröße (rw/rh) – alte Spielstände
// behalten nämlich ihre alten Maße, auch wenn der Raum ausgebaut wird.
import { shade, mulberry32 } from '../util.js';
import { drawEmoji, drawAntFast, drawGlow } from './sprites.js';

const emoji = drawEmoji;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------------------
// Grundformen (auch von rooms.js benutzt)
// ---------------------------------------------------------------------------
export function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

export function plank(ctx, x, y, w, h, c = '#a8743f') {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, shade(c, 0.25)); g.addColorStop(1, shade(c, -0.25));
  ctx.fillStyle = g;
  rr(ctx, x, y, w, h, Math.min(3, h / 2)); ctx.fill();
}

export function bookshelf(ctx, x, y, w, h, seed) {
  const rnd = mulberry32(seed);
  plank(ctx, x, y, w, h, '#7a4d2a');
  ctx.fillStyle = 'rgba(30,15,5,.55)';
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  const rows = Math.max(1, Math.floor((h - 6) / 13));
  const rh = (h - 6) / rows;
  const cols = ['#e85a5a', '#4f9bff', '#ffd04d', '#59c977', '#b07cff', '#ff9f43', '#f2f2f2', '#2fbfb4'];
  for (let r = 0; r < rows; r++) {
    let bx = x + 4;
    const by = y + 3 + r * rh;
    while (bx < x + w - 6) {
      const bw = 2 + rnd() * 3, bh = rh * (0.6 + rnd() * 0.35);
      ctx.fillStyle = cols[(rnd() * cols.length) | 0];
      ctx.fillRect(bx, by + rh - bh - 1, bw, bh);
      bx += bw + 0.8;
    }
    ctx.fillStyle = '#5e3a1e';
    ctx.fillRect(x + 3, by + rh - 1.5, w - 6, 2);
  }
}

export function steam(ctx, x, y, t) {
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.6 + i / 3) % 1;
    ctx.fillStyle = `rgba(255,255,255,${0.35 * (1 - p)})`;
    ctx.beginPath(); ctx.arc(x + Math.sin(p * 6 + i) * 3, y - p * 16, 2 + p * 3, 0, 7); ctx.fill();
  }
}

function lin(ctx, x0, y0, x1, y1, ...cols) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c));
  return g;
}
function strich(ctx, col, lw, ...pts) {
  ctx.strokeStyle = col; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.stroke();
}
function kreis(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
function oval(ctx, x, y, a, b, col, rot = 0) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, a, b, rot, 0, TAU); ctx.fill(); }
function halboval(ctx, x, y, a, b, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, a, b, 0, Math.PI, 0); ctx.fill(); }
function schrift(ctx, s, x, y, size, col, align = 'center', font = 'bold', fam = 'Fredoka, sans-serif') {
  ctx.fillStyle = col; ctx.font = `${font} ${size}px ${fam}`; ctx.textAlign = align; ctx.fillText(s, x, y);
}
export function stern(ctx, x, y, r, col, rot = -Math.PI / 2) {
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath(); ctx.fill();
}
function raute(ctx, x, y, r, col) {
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.8, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.8, y); ctx.fill();
}
function edelstein(ctx, x, y, r, col) {
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x - r, y - r * 0.3); ctx.lineTo(x - r * 0.5, y - r * 0.8); ctx.lineTo(x + r * 0.5, y - r * 0.8);
  ctx.lineTo(x + r, y - r * 0.3); ctx.lineTo(x, y + r); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath();
  ctx.moveTo(x - r * 0.45, y - r * 0.35); ctx.lineTo(x - r * 0.2, y - r * 0.7); ctx.lineTo(x + r * 0.05, y - r * 0.35); ctx.fill();
}
/** Klassische Säule von y0 (Kapitell) bis y1 (Basis). */
function saeule(ctx, x, y0, y1, w, col = '#f3e8cf') {
  ctx.fillStyle = col; ctx.fillRect(x - w / 2, y0 + 3, w, y1 - y0 - 6);
  ctx.fillStyle = shade(col, -0.18);
  for (let k = 1; k < 3; k++) ctx.fillRect(x - w / 2 + (k * w) / 3 - 0.4, y0 + 4, 0.8, y1 - y0 - 8);
  ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(x + w / 2 - 1.4, y0 + 3, 1.4, y1 - y0 - 6);
  ctx.fillStyle = shade(col, 0.12);
  rr(ctx, x - w / 2 - 2, y0, w + 4, 3.5, 1); ctx.fill();
  rr(ctx, x - w / 2 - 2, y1 - 3.5, w + 4, 3.5, 1); ctx.fill();
}
/** Hängendes Banner mit Schwalbenschwanz. */
function banner(ctx, x, y, w, h, col, icon, gold = '#f2c14e') {
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
  ctx.lineTo(x, y + h - w * 0.35); ctx.lineTo(x - w / 2, y + h); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(x + w / 2 - 1.5, y, 1.5, h - 1);
  ctx.fillStyle = gold;
  ctx.fillRect(x - w / 2, y + 1.5, 1, h - 3); ctx.fillRect(x + w / 2 - 1, y + 1.5, 1, h - 3);
  rr(ctx, x - w / 2 - 2, y - 1.5, w + 4, 2.5, 1.2); ctx.fill();
  if (icon) emoji(ctx, icon, x, y + h * 0.55, Math.min(w * 0.75, 10));
}
/** Wimpelkette zwischen x0 und x1. */
function wimpel(ctx, x0, x1, y, sag, cols, s = 4) {
  strich(ctx, 'rgba(255,240,200,.55)', 0.8);
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.quadraticCurveTo((x0 + x1) / 2, y + sag * 2, x1, y); ctx.stroke();
  const n = Math.max(2, Math.floor((x1 - x0) / (s * 2.6)));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, yy = y + Math.sin(t * Math.PI) * sag;
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath(); ctx.moveTo(x - s, yy); ctx.lineTo(x + s, yy); ctx.lineTo(x, yy + s * 1.8); ctx.fill();
  }
}
/** Goldener Kronleuchter, aufgehängt bei (x, y). */
function kronleuchter(ctx, x, y, s = 1) {
  strich(ctx, '#b8902a', 0.8, x, y - 6, x, y + 2 * s);
  ctx.strokeStyle = '#e7b94a'; ctx.lineWidth = 1.3 * s;
  ctx.beginPath(); ctx.ellipse(x, y + 4 * s, 9 * s, 3 * s, 0, 0, Math.PI); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x, y + 4 * s, 5 * s, 2 * s, 0, 0, Math.PI); ctx.stroke();
  kreis(ctx, x, y + 3 * s, 2 * s, '#f2c94c');
  for (const dx of [-9, -5, 0, 5, 9]) {
    const yy = y + 4 * s + (Math.abs(dx) === 9 ? 0 : dx === 0 ? 3 : 1.8) * s;
    ctx.fillStyle = '#fff6dc'; ctx.fillRect(x + dx * s - 0.7 * s, yy - 4 * s, 1.4 * s, 3.5 * s);
    kreis(ctx, x + dx * s, yy - 5 * s, 1.2 * s, '#ffd36a');
  }
  for (const dx of [-6, -2, 2, 6]) raute(ctx, x + dx * s, y + 9 * s, 1.5 * s, 'rgba(220,240,255,.85)');
  raute(ctx, x, y + 11 * s, 2 * s, 'rgba(220,240,255,.9)');
}
function kerze(ctx, x, y, h = 6, col = '#fff3dc') {
  ctx.fillStyle = col; ctx.fillRect(x - 1, y - h, 2, h);
  oval(ctx, x, y - h - 2, 1.2, 2, '#ffcf4a');
  oval(ctx, x, y - h - 1.6, 0.6, 1, '#fff7d0');
}
/** Flackernde Flamme (pro Bild). */
function flamme(ctx, x, y, t, s = 1, seed = 0) {
  const f = 1 + Math.sin(t * 11 + seed) * 0.12 + Math.sin(t * 17 + seed * 2) * 0.08;
  drawGlow(ctx, '255,190,90', x, y - 2 * s, 7 * s, 0.55);
  oval(ctx, x, y - 2 * s * f, 1.6 * s, 3 * s * f, '#ff9a2a');
  oval(ctx, x, y - 1.6 * s * f, 0.8 * s, 1.6 * s * f, '#fff3b0');
}
function pflanze(ctx, x, fy, s = 1, potCol = '#c8643c') {
  ctx.fillStyle = '#3f9a3a';
  for (let i = -2; i <= 2; i++) oval(ctx, x + i * 2.6 * s, fy - 9 * s - Math.abs(i) * -1.5 * s, 2.2 * s, 5 * s, i % 2 ? '#4fb447' : '#3f9a3a', i * 0.35);
  ctx.fillStyle = potCol;
  ctx.beginPath(); ctx.moveTo(x - 4 * s, fy - 6 * s); ctx.lineTo(x + 4 * s, fy - 6 * s); ctx.lineTo(x + 3 * s, fy); ctx.lineTo(x - 3 * s, fy); ctx.fill();
  ctx.fillStyle = shade(potCol, 0.2); ctx.fillRect(x - 4.5 * s, fy - 7 * s, 9 * s, 1.6 * s);
}
function bilderrahmen(ctx, x, y, w, h, gold = '#d9a94a') {
  ctx.fillStyle = gold; rr(ctx, x - 1.5, y - 1.5, w + 3, h + 3, 1.5); ctx.fill();
  ctx.fillStyle = '#9fd3f0'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#6cbf5a'; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.quadraticCurveTo(x + w * 0.3, y + h * 0.35, x + w * 0.6, y + h * 0.7);
  ctx.quadraticCurveTo(x + w * 0.8, y + h * 0.5, x + w, y + h * 0.6); ctx.lineTo(x + w, y + h); ctx.fill();
  kreis(ctx, x + w * 0.78, y + h * 0.28, Math.min(w, h) * 0.13, '#ffe27a');
}
/** Markise (Bogenkante) – n Streifen. */
function markise(ctx, x, y, w, n, c1, c2, h = 7) {
  const sw = w / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 ? c2 : c1;
    const xx = x + i * sw;
    ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx + sw, y); ctx.lineTo(xx + sw, y + h);
    ctx.arc(xx + sw / 2, y + h, sw / 2, 0, Math.PI); ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x, y, w, 1.5);
}
function zahnrad(ctx, x, y, r, col, rot = 0) {
  ctx.fillStyle = col; ctx.beginPath();
  const n = 8;
  for (let i = 0; i < n * 2; i++) {
    const a0 = rot + (i / (n * 2)) * TAU, a1 = rot + ((i + 1) / (n * 2)) * TAU, rad = i % 2 ? r * 0.78 : r;
    ctx.arc(x, y, rad, a0, a1);
  }
  ctx.closePath(); ctx.fill();
  kreis(ctx, x, y, r * 0.32, 'rgba(0,0,0,.35)');
}
function kiste(ctx, x, y, w, h, col = '#b5823f') {
  ctx.fillStyle = col; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = shade(col, -0.35); ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.beginPath(); ctx.moveTo(x + 1, y + 1); ctx.lineTo(x + w - 1, y + h - 1); ctx.stroke();
}
function fass(ctx, x, fy, w, h, col = '#9a6236') {
  ctx.fillStyle = col; rr(ctx, x - w / 2, fy - h, w, h, w * 0.3); ctx.fill();
  ctx.fillStyle = '#5d5d66';
  ctx.fillRect(x - w / 2, fy - h * 0.8, w, 1.2); ctx.fillRect(x - w / 2, fy - h * 0.25, w, 1.2);
  ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(x - w / 2 + 2, fy - h + 2, 1.5, h - 4);
}
function teppich(ctx, x0, x1, fy, col = '#c42c4a', rand = '#ffd34d') {
  ctx.fillStyle = col; ctx.fillRect(x0, fy, x1 - x0, 5);
  ctx.fillStyle = rand; ctx.fillRect(x0, fy + 0.8, x1 - x0, 0.8); ctx.fillRect(x0, fy + 3.6, x1 - x0, 0.8);
}
function sitzreihe(ctx, x0, x1, y, col, w = 9, h = 8, gap = 2) {
  for (let x = x0; x + w <= x1; x += w + gap) {
    ctx.fillStyle = col; rr(ctx, x, y - h, w, h, [w / 2.2, w / 2.2, 1, 1]); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(x + 1.5, y - h + 2, 1.2, h - 4);
  }
}
/** Glänzendes Metall (Kessel, Tanks). */
function metall(ctx, x, y, w, h, r = 3, base = '#cfd8de') {
  ctx.fillStyle = lin(ctx, x, 0, x + w, 0, shade(base, -0.25), shade(base, 0.35), base, shade(base, -0.35));
  rr(ctx, x, y, w, h, r); ctx.fill();
}
/** Schwanenhals-Lampe mit Schirm. */
function leselampe(ctx, x, y, col = '#2f8a5a') {
  strich(ctx, '#c9a050', 1, x, y, x, y - 7, x + 3, y - 9);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 7, y - 11); ctx.lineTo(x + 8, y - 7); ctx.lineTo(x + 1, y - 6); ctx.fill();
  ctx.fillStyle = '#c9a050'; ctx.fillRect(x - 2.5, y - 1, 5, 1.5);
}
function wolke(ctx, x, y, s, col = 'rgba(255,255,255,.85)') {
  ctx.fillStyle = col; ctx.beginPath();
  ctx.arc(x, y, 3 * s, 0, TAU); ctx.arc(x + 3.5 * s, y - 1.5 * s, 3.5 * s, 0, TAU); ctx.arc(x + 7 * s, y, 2.8 * s, 0, TAU);
  ctx.fill(); ctx.fillRect(x, y - 0.5 * s, 7 * s, 3 * s);
}
/** Wassersäulen/Becken mit Verlauf. */
function becken(ctx, x, y, w, h, rim = '#d8e4ec', w1 = '#7fd8ff', w2 = '#2a8fd0') {
  ctx.fillStyle = rim; rr(ctx, x, y, w, h, 4); ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y + 3, 0, y + h, w1, w2); rr(ctx, x + 3, y + 3, w - 6, h - 5, 3); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + 4, y + 3.5, w - 8, 1.2);
}

// ---------------------------------------------------------------------------
// Allgemeine Stufen-Verschönerung
// ---------------------------------------------------------------------------
/** Hintergrund ab Stufe 2: Tapete & Vertäfelung; ab Stufe 3 Goldleisten und Stuck. */
export function stufenWand(ctx, { rx, ry, rw, fy, g }) {
  const s = g.lstufe ?? 1;
  if (s < 2) return;
  const H = fy - ry;
  if (s === 2) {
    ctx.fillStyle = 'rgba(255,240,210,.05)';
    for (let x = rx + 3; x < rx + rw; x += 9) ctx.fillRect(x, ry, 3.5, H);
  } else {
    let r = 0;
    for (let y = ry + 14; y < fy - 12; y += 9, r++) {
      for (let x = rx + (r % 2 ? 4 : 9); x < rx + rw; x += 10) raute(ctx, x, y, 2, 'rgba(255,215,140,.09)');
    }
  }
  // Vertäfelung
  const wh = Math.min(12, H * 0.24), wy = fy - wh;
  ctx.fillStyle = s >= 3 ? 'rgba(70,28,18,.45)' : 'rgba(60,35,15,.4)';
  ctx.fillRect(rx, wy, rw, wh);
  ctx.strokeStyle = s >= 3 ? 'rgba(255,215,140,.2)' : 'rgba(255,225,180,.12)'; ctx.lineWidth = 0.8;
  for (let x = rx + 6; x + 10 < rx + rw; x += 14) ctx.strokeRect(x + 0.5, wy + 2.5, 10, wh - 5);
  ctx.fillStyle = s >= 3 ? '#e2b048' : '#a8763f'; ctx.fillRect(rx, wy - 1.5, rw, 1.8);
  if (s >= 3) {
    ctx.fillStyle = 'rgba(255,245,200,.6)'; ctx.fillRect(rx, wy - 1.5, rw, 0.6);
    // Stuckleiste mit Goldperlen unter der Decke
    ctx.fillStyle = 'rgba(226,176,72,.7)'; ctx.fillRect(rx, ry + 8, rw, 1.2);
    for (let x = rx + 4; x < rx + rw; x += 6) kreis(ctx, x, ry + 10.8, 0.9, 'rgba(240,200,100,.75)');
  }
  if (s >= 4) {
    // Gold-Girlanden zwischen den Perlen
    ctx.strokeStyle = 'rgba(240,200,100,.45)'; ctx.lineWidth = 0.9;
    for (let x = rx + 4; x + 12 <= rx + rw; x += 12) { ctx.beginPath(); ctx.moveTo(x, ry + 11); ctx.quadraticCurveTo(x + 6, ry + 16, x + 12, ry + 11); ctx.stroke(); }
  }
}

/** Deckenlampe je nach Stufe: einfach, Messinglampe, Kronleuchter. */
export function stufenLampe(ctx, x, y, s) {
  if (s >= 3) {
    strich(ctx, '#b8902a', 0.9, x, y - 7, x, y - 2);
    ctx.strokeStyle = '#e7b94a'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.ellipse(x, y - 1, 6, 2.6, 0, 0, Math.PI); ctx.stroke();
    for (const dx of [-6, 0, 6]) {
      const yy = dx ? y - 1 : y + 1.6;
      ctx.fillStyle = '#fff6dc'; ctx.fillRect(x + dx - 0.6, yy - 3, 1.2, 3);
      kreis(ctx, x + dx, yy - 4, 1.3, '#ffe9a8');
    }
    raute(ctx, x, y + 4, 1.5, 'rgba(220,240,255,.9)');
    if (s >= 4) { raute(ctx, x - 3.5, y + 2.5, 1.1, 'rgba(220,240,255,.8)'); raute(ctx, x + 3.5, y + 2.5, 1.1, 'rgba(220,240,255,.8)'); }
    return;
  }
  ctx.strokeStyle = 'rgba(40,25,10,.8)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x, y - 2); ctx.stroke();
  if (s === 2) {
    kreis(ctx, x, y + 1.2, 2.6, '#ffe9a8');
    ctx.fillStyle = '#d9a441';
    ctx.beginPath(); ctx.moveTo(x - 2, y - 3); ctx.lineTo(x + 2, y - 3); ctx.lineTo(x + 5, y + 1); ctx.lineTo(x - 5, y + 1); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x - 1.5, y - 2.5, 1, 3);
    return;
  }
  kreis(ctx, x, y + 1, 3.5, '#ffe9a8');
}

/** Stufen-Sterne unter dem Kammerschild (gefüllt = erreicht). */
export function stufenSterne(ctx, cx, y, s, max) {
  if (!(max > 1)) return;
  const w = max * 6 + 3;
  ctx.fillStyle = 'rgba(45,25,10,.82)'; rr(ctx, cx - w / 2, y - 3.6, w, 7.2, 3.6); ctx.fill();
  for (let i = 0; i < max; i++) {
    const x = cx - (max - 1) * 3 + i * 6;
    if (i < s) stern(ctx, x, y + 0.2, 2.8, '#ffd34d');
    else stern(ctx, x, y + 0.2, 2.4, 'rgba(255,240,200,.22)');
  }
}

// ---------------------------------------------------------------------------
// Einrichtung der Ausbaustufen (unterirdisch & im Hügel) – Signatur (ctx, p)
// p = { rx, ry, rw, rh, fy, cx, rnd, g, room, basis }
// ---------------------------------------------------------------------------
export const AUSBAU_PROPS = {};

// ----- Königin -----
function thron(ctx, tx, fy, th, gold, samt, deko) {
  ctx.fillStyle = lin(ctx, tx - 14, 0, tx + 14, 0, shade(gold, 0.35), gold, shade(gold, -0.35));
  rr(ctx, tx - 13, fy - th, 26, th, [13, 13, 2, 2]); ctx.fill();
  ctx.fillStyle = samt; rr(ctx, tx - 9, fy - th + 5, 18, th - 16, [9, 9, 2, 2]); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.12)'; rr(ctx, tx - 7, fy - th + 7, 4, th - 22, 2); ctx.fill();
  ctx.fillStyle = gold;
  rr(ctx, tx - 18, fy - 20, 7, 16, 3); ctx.fill(); rr(ctx, tx + 11, fy - 20, 7, 16, 3); ctx.fill();
  ctx.fillStyle = shade(samt, 0.15); rr(ctx, tx - 12, fy - 14, 24, 6, 3); ctx.fill();
  if (deko) deko(tx, fy - th);
}
Object.assign(AUSBAU_PROPS, {
  thronsaal(ctx, { rx, ry, rw, fy }) {
    const H = fy - ry, R = rx + rw;
    saeule(ctx, rx + 17, ry + 30, fy, 7, '#f0dca8');
    saeule(ctx, R - 17, ry + 22, fy, 7, '#f0dca8');
    const bh = clamp(H * 0.34, 16, 30);
    banner(ctx, rx + rw * 0.36, ry + 20, 11, bh, '#b3203f', '👑');
    banner(ctx, rx + rw * 0.55, ry + 20, 11, bh, '#3a4fb0', '🐜');
    teppich(ctx, rx + 12, R - 12, fy);
    const tx = rx + rw * 0.74, th = clamp(H * 0.68, 34, 58);
    ctx.fillStyle = '#d9c08a'; rr(ctx, tx - 22, fy - 4, 44, 4, 1); ctx.fill();
    ctx.fillStyle = '#ead6a4'; rr(ctx, tx - 17, fy - 7, 34, 3, 1); ctx.fill();
    ctx.fillStyle = '#e2b048'; ctx.fillRect(tx - 22, fy - 4, 44, 0.8);
    thron(ctx, tx, fy - 7, th - 7, '#e5a91a', '#b3203f', (x, y) => emoji(ctx, '👑', x, y + 1, 10));
  },
  kronpalast(ctx, { rx, ry, rw, rh, fy, cx }) {
    const H = fy - ry, R = rx + rw;
    // Marmorboden
    for (let x = rx, i = 0; x < R; x += 7, i++) for (let y = fy, j = 0; y < ry + rh; y += 6, j++) {
      ctx.fillStyle = (i + j) % 2 ? '#e9e0d4' : '#b9aea4'; ctx.fillRect(x, y, 7, 6);
    }
    ctx.fillStyle = '#e2b048'; ctx.fillRect(rx, fy, rw, 1.5);
    // Arkaden
    const n = Math.max(2, Math.floor((rw - 24) / 24)), aw = (rw - 24) / n;
    for (let i = 0; i < n; i++) {
      const x = rx + 12 + i * aw;
      ctx.fillStyle = 'rgba(255,240,210,.1)'; rr(ctx, x + 3, ry + 24, aw - 6, H - 24, [(aw - 6) / 2, (aw - 6) / 2, 0, 0]); ctx.fill();
      ctx.strokeStyle = 'rgba(240,200,100,.55)'; ctx.lineWidth = 1; ctx.stroke();
    }
    // Vorhang-Bögen oben
    for (let x = rx + 2; x < R; x += 16) {
      ctx.fillStyle = '#7a2a9a'; ctx.beginPath(); ctx.moveTo(x, ry + 4); ctx.quadraticCurveTo(x + 8, ry + 16, x + 16, ry + 4); ctx.fill();
      ctx.strokeStyle = '#f2c94c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, ry + 4); ctx.quadraticCurveTo(x + 8, ry + 16, x + 16, ry + 4); ctx.stroke();
    }
    // Juwelen-Sockel
    const px = rx + rw * 0.14;
    ctx.fillStyle = '#efe6da'; ctx.fillRect(px - 5, fy - 18, 10, 18); ctx.fillStyle = '#d0c4b4'; ctx.fillRect(px - 7, fy - 20, 14, 3);
    oval(ctx, px, fy - 22, 6, 2.5, '#c42c4a'); emoji(ctx, '💎', px, fy - 22, 10);
    kronleuchter(ctx, cx, ry + 12, 1.3);
    const tx = rx + rw * 0.75, th = clamp(H * 0.72, 34, 62);
    ctx.fillStyle = '#efe6da'; rr(ctx, tx - 22, fy - 5, 44, 5, 1); ctx.fill();
    thron(ctx, tx, fy - 5, th - 5, '#f4cf55', '#2f4fb8', (x, y) => {
      for (let k = 0; k < 5; k++) edelstein(ctx, x - 10 + k * 5, y + 4 + Math.abs(k - 2) * 2.5, 1.8, ['#ff4d6d', '#4dd2ff', '#7dff8a', '#4dd2ff', '#ff4d6d'][k]);
      emoji(ctx, '💎', x, y + 1, 10);
    });
  },
});

// ----- Wohnen -----
Object.assign(AUSBAU_PROPS, {
  wohnhoehle(ctx, { rx, ry, rw, fy, rnd }) {
    const H = fy - ry;
    const n = Math.max(3, Math.floor((rw - 16) / 26)), sw = (rw - 16) / n;
    const reihen = H >= 44 ? 2 : 1;
    for (let r = 0; r < reihen; r++) {
      const y = fy - 9 - r * 21;
      for (let i = 0; i < n; i++) {
        const x = rx + 8 + sw * (i + 0.5);
        if (r === 1 && x < rx + 34) continue; // Platz fürs Schild
        oval(ctx, x, y, sw * 0.44, 8.5, 'rgba(25,14,6,.55)');
        ctx.strokeStyle = 'rgba(255,230,190,.16)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, sw * 0.44, 8.5, 0, Math.PI, 0); ctx.stroke();
        oval(ctx, x, y + 3.5, sw * 0.38, 4.2, '#5f9a3e');
        oval(ctx, x, y + 2.5, sw * 0.33, 2.6, '#86c457');
        for (let k = 0; k < 4; k++) kreis(ctx, x - sw * 0.28 + rnd() * sw * 0.56, y + 2 + rnd() * 3, 0.8, '#a8e070');
        ctx.fillStyle = ['#fff3dc', '#ffd0e0', '#d0e8ff'][(i + r) % 3]; rr(ctx, x - sw * 0.3, y - 1, 8, 4.5, 2.2); ctx.fill();
      }
    }
    // Moosbüschel & hängendes Moos
    for (let i = 0; i < 6; i++) halboval(ctx, rx + 14 + rnd() * (rw - 28), fy + 1, 3 + rnd() * 3, 2.5, '#6aa84a');
    ctx.strokeStyle = 'rgba(120,180,80,.6)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) { const x = rx + rw * (0.4 + i * 0.15); ctx.beginPath(); ctx.moveTo(x, ry + 5); ctx.quadraticCurveTo(x + 2, ry + 10, x, ry + 13 + (i % 2) * 3); ctx.stroke(); }
  },
  ameisenvilla(ctx, { rx, ry, rw, fy }) {
    const R = rx + rw;
    // Teppich
    ctx.fillStyle = '#5a7fd0'; rr(ctx, rx + 14, fy - 1, rw - 28, 4, 2); ctx.fill();
    ctx.fillStyle = '#ffd34d'; ctx.fillRect(rx + 16, fy + 0.5, rw - 32, 0.8);
    // Kommode mit Leselampe
    plank(ctx, rx + 12, fy - 13, 17, 13, '#8a5530');
    ctx.fillStyle = '#e2b048'; kreis(ctx, rx + 20.5, fy - 9, 0.9, '#e2b048'); kreis(ctx, rx + 20.5, fy - 4, 0.9, '#e2b048');
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(rx + 13, fy - 7, 15, 0.8);
    leselampe(ctx, rx + 17, fy - 13, '#2f8a5a');
    // Etagenbetten
    const n = Math.max(1, Math.floor((rw - 40) / 28)), bw = 24;
    const quilts = [['#ff7aa8', '#ffd0e0'], ['#5fa8ff', '#d0e8ff'], ['#7ddc6f', '#d8f6c8'], ['#ffc04d', '#fff0c8']];
    for (let i = 0; i < n; i++) {
      const x = rx + 33 + i * 28;
      if (x + bw > R - 8) break;
      for (const [y, q] of [[fy - 8, quilts[i % 4]], [fy - 28, quilts[(i + 2) % 4]]]) {
        plank(ctx, x, y, bw, 5, '#6b3f22');
        for (let k = 0; k < 5; k++) { ctx.fillStyle = q[k % 2]; ctx.fillRect(x + 7 + k * 3.4, y - 4, 3.4, 4.5); }
        ctx.fillStyle = '#fff'; rr(ctx, x + 1.5, y - 4.5, 6, 4.5, 2); ctx.fill();
      }
      ctx.fillStyle = '#6b3f22'; ctx.fillRect(x, fy - 34, 2.5, 34); ctx.fillRect(x + bw - 2.5, fy - 34, 2.5, 34);
      kreis(ctx, x + 1.2, fy - 34.5, 1.6, '#e2b048'); kreis(ctx, x + bw - 1.2, fy - 34.5, 1.6, '#e2b048');
      // Leselampe am Bett
      kreis(ctx, x + bw - 4, fy - 31, 1.8, '#ffe9a8');
      ctx.fillStyle = '#c9a050'; ctx.fillRect(x + bw - 6, fy - 33.5, 4, 1.5);
    }
    if (ry + 14 < fy - 40) bilderrahmen(ctx, R - 26, ry + 14, 12, 8);
  },
});

// ----- Brut -----
Object.assign(AUSBAU_PROPS, {
  wiegenstube(ctx, { rx, ry, rw, fy, rnd, cx }) {
    // gemalte Sterne & Mond
    for (let i = 0; i < 9; i++) stern(ctx, rx + 34 + rnd() * (rw - 44), ry + 10 + rnd() * (fy - ry - 26), 1.6 + rnd() * 1.2, 'rgba(255,240,170,.35)');
    kreis(ctx, rx + rw - 18, ry + 18, 5, 'rgba(255,240,170,.5)'); kreis(ctx, rx + rw - 16, ry + 16.5, 4.5, shade('#fff4d6', -0.62));
    // Wiegen
    const n = Math.max(2, Math.floor((rw - 24) / 24)), sw = (rw - 24) / n;
    for (let i = 0; i < n; i++) {
      const x = rx + 12 + sw * (i + 0.5);
      ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(x, fy - 12, 11, Math.PI * 0.3, Math.PI * 0.7); ctx.stroke();
      ctx.fillStyle = '#c99a5e'; ctx.beginPath(); ctx.ellipse(x, fy - 7, 9, 6, 0, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = 'rgba(90,55,25,.5)'; ctx.lineWidth = 0.7;
      for (let k = -6; k <= 6; k += 3) { ctx.beginPath(); ctx.moveTo(x + k, fy - 7); ctx.lineTo(x + k * 0.8, fy - 2); ctx.stroke(); }
      oval(ctx, x, fy - 7.5, 8, 2.2, '#7ec860');
      ctx.fillStyle = ['#ffd0e0', '#d0e8ff', '#fff0b8'][i % 3]; rr(ctx, x - 7, fy - 9.5, 5, 3, 1.5); ctx.fill();
    }
    // Mobile-Faden
    strich(ctx, 'rgba(255,240,200,.6)', 0.7, cx, ry + 5, cx, ry + 14);
  },
  brutpalast(ctx, { rx, ry, rw, fy }) {
    const H = fy - ry, R = rx + rw;
    // gesteppte Polsterwand
    ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 0.8;
    for (let x = rx; x < R; x += 8) { ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x + 30, fy); ctx.moveTo(x + 30, ry); ctx.lineTo(x, fy); ctx.stroke(); }
    // Regenbogen-Wandbild
    const cols = ['#ff7a7a', '#ffb84d', '#ffe66b', '#7ddc6f', '#6fb8ff', '#b48cff'];
    const bx = rx + rw * 0.62, by = fy - 8, br = Math.min(rw * 0.3, H * 0.62);
    ctx.lineWidth = 2.2;
    cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(bx, by, br - i * 2.2, Math.PI, 0); ctx.stroke(); });
    ctx.globalAlpha = 1;
    wolke(ctx, bx - br - 2, by - 3, 1); wolke(ctx, bx + br - 6, by - 3, 1);
    // Thermometer
    ctx.fillStyle = '#fff'; rr(ctx, rx + 13, ry + 28, 4, Math.max(8, fy - ry - 36), 2); ctx.fill();
    ctx.fillStyle = '#ff4d4d'; ctx.fillRect(rx + 14, ry + 34, 2, Math.max(4, fy - ry - 42)); kreis(ctx, rx + 15, fy - 7, 3, '#ff4d4d');
    // Wärmelampen
    for (const x of [rx + rw * 0.42, rx + rw * 0.8]) {
      strich(ctx, '#333', 0.8, x, ry + 5, x, ry + 14);
      ctx.fillStyle = '#d23c3c'; ctx.beginPath(); ctx.arc(x, ry + 18, 5, Math.PI, 0); ctx.fill();
      kreis(ctx, x, ry + 18.5, 2.5, '#ffb36b');
    }
    // weiche Matten
    const mc = ['#ffd0e0', '#c8f0d8', '#d0e4ff', '#fff0b8'];
    const n = Math.max(2, Math.floor((rw - 26) / 18));
    for (let i = 0; i < n; i++) { ctx.fillStyle = mc[i % 4]; rr(ctx, rx + 13 + i * ((rw - 26) / n), fy - 3, (rw - 26) / n - 2, 4, 2); ctx.fill(); }
  },
});

// ----- Vorrat -----
function glas(ctx, x, y, w, h, fill) {
  ctx.fillStyle = 'rgba(220,240,255,.35)'; rr(ctx, x, y, w, h, 2); ctx.fill();
  ctx.fillStyle = fill; rr(ctx, x + 1, y + h * 0.3, w - 2, h * 0.7 - 1, 1.5); ctx.fill();
  ctx.fillStyle = '#b07a40'; ctx.fillRect(x - 0.5, y - 1.5, w + 1, 2);
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x + 1, y + 1, 1, h - 3);
}
function sack(ctx, x, fy, w, h, col = '#d8b878') {
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(x - w * 0.35, fy - h * 0.85); ctx.quadraticCurveTo(x - w * 0.6, fy - h * 0.3, x - w / 2, fy);
  ctx.lineTo(x + w / 2, fy); ctx.quadraticCurveTo(x + w * 0.6, fy - h * 0.3, x + w * 0.35, fy - h * 0.85); ctx.fill();
  ctx.fillStyle = shade(col, -0.2); ctx.beginPath(); ctx.ellipse(x, fy - h * 0.88, w * 0.3, h * 0.12, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#8a5a30'; ctx.fillRect(x - w * 0.3, fy - h * 0.8, w * 0.6, 1.2);
  ctx.strokeStyle = 'rgba(120,80,30,.35)'; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(x - w * 0.2, fy - h * 0.6); ctx.lineTo(x - w * 0.25, fy - 2); ctx.moveTo(x + w * 0.15, fy - h * 0.6); ctx.lineTo(x + w * 0.2, fy - 2); ctx.stroke();
}
function aehre(ctx, x, y, s, col = '#e8c050') {
  strich(ctx, col, 0.8, x, y, x, y - 7 * s);
  for (let k = 0; k < 4; k++) { oval(ctx, x - 1.2 * s, y - 3 * s - k * 1.4 * s, 1 * s, 0.6 * s, col, -0.6); oval(ctx, x + 1.2 * s, y - 3 * s - k * 1.4 * s, 1 * s, 0.6 * s, col, 0.6); }
}
/** Lebende Honigtöpfe: x-Positionen, die den Deckenlampen ausweichen. */
function honigtopfX(rx, rw) {
  const lampen = rw > 110 ? [rx + rw * 0.28, rx + rw * 0.72] : [rx + rw / 2];
  const out = [];
  for (let x = rx + 36; x < rx + rw - 12; x += 3) {
    if (lampen.some(l => Math.abs(l - x) < 13) || out.some(o => x - o < 15)) continue;
    out.push(x);
  }
  return out;
}
/** Räume mit eigenem Prunk-Leuchter: dort keine zusätzlichen Deckenlampen zeichnen. */
export const EIGENES_LICHT = new Set(['kronpalast', 'opernhaus']);
Object.assign(AUSBAU_PROPS, {
  kornspeicher(ctx, { rx, ry, rw, fy, rnd }) {
    const R = rx + rw;
    // Regal mit Körnergläsern
    const sy = fy - 26;
    plank(ctx, rx + 32, sy, R - rx - 42, 3.5, '#9a6a3c');
    ctx.fillStyle = '#7a4d2a'; ctx.fillRect(rx + 34, sy + 3, 2, 6); ctx.fillRect(R - 14, sy + 3, 2, 6);
    const fills = ['#e8c050', '#c9873a', '#f1dfa0', '#a8743f'];
    for (let x = rx + 35, i = 0; x < R - 18; x += 10, i++) glas(ctx, x, sy - 10, 7, 10, fills[i % 4]);
    // Säcke
    const n = Math.max(2, Math.floor((rw - 30) / 18));
    for (let i = 0; i < n; i++) {
      const x = rx + 22 + i * ((rw - 40) / Math.max(1, n - 1));
      sack(ctx, x, fy, 15, 15 + (i % 2) * 3, i % 2 ? '#d0ae70' : '#dcc08a');
      aehre(ctx, x, fy - 3, 0.8, '#b8862a');
    }
    // Körnerhaufen
    for (let i = 0; i < 22; i++) kreis(ctx, rx + rw * 0.5 + (rnd() - 0.5) * 18 * (1 - i / 30), fy - rnd() * 3, 1, i % 3 ? '#e8c050' : '#c9a040');
    aehre(ctx, rx + 14, fy, 1.2); aehre(ctx, rx + 17, fy, 1.1);
  },
  honigtopflager(ctx, { rx, ry, rw, fy, rnd }) {
    const R = rx + rw;
    // Waben-Muster
    ctx.strokeStyle = 'rgba(255,200,80,.07)'; ctx.lineWidth = 0.8;
    for (let y = ry + 26, r = 0; y < fy - 6; y += 7, r++) for (let x = rx + (r % 2 ? 4 : 0); x < R; x += 8) {
      ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; ctx.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4); } ctx.closePath(); ctx.stroke();
    }
    // Deckenbalken mit lebenden Honigtöpfen
    plank(ctx, rx + 8, ry + 7, rw - 16, 4, '#7a4d2a');
    honigtopfX(rx, rw).forEach((x, i) => {
      const r = 5.5 + (i % 2) * 1.2, y = ry + 15 + r;
      strich(ctx, '#3a2010', 0.7, x - 2, ry + 11, x - 3, ry + 14, x + 2, ry + 11, x + 3, ry + 14);
      kreis(ctx, x, ry + 13.5, 2, '#4a2a14');
      const gg = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 1, x, y, r);
      gg.addColorStop(0, '#ffe9a0'); gg.addColorStop(0.5, '#f5b324'); gg.addColorStop(1, '#b06a08');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(120,60,0,.35)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.35, 0, 0, Math.PI); ctx.stroke();
    });
    // Honigtöpfe am Boden
    const m = Math.max(2, Math.floor((rw - 24) / 15));
    for (let i = 0; i < m; i++) {
      const x = rx + 18 + i * ((rw - 36) / Math.max(1, m - 1));
      ctx.fillStyle = '#c87a2a'; ctx.beginPath(); ctx.ellipse(x, fy - 5, 6, 5.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e8a040'; ctx.fillRect(x - 4, fy - 12, 8, 3);
      ctx.fillStyle = '#fff3d0'; ctx.fillRect(x - 3, fy - 6, 6, 3.5);
      ctx.fillStyle = '#f5b324'; ctx.beginPath(); ctx.moveTo(x - 3, fy - 10); ctx.quadraticCurveTo(x - 3.5, fy - 7, x - 2.5, fy - 6.5); ctx.lineTo(x - 1.5, fy - 10); ctx.fill();
    }
  },
});

// ----- Müll -----
Object.assign(AUSBAU_PROPS, {
  recyclinghof(ctx, { rx, ry, rw, fy, cx }) {
    const bins = [['#3fae4f', 'blatt'], ['#f2c230', 'schale'], ['#3f7fd8', 'krumen']];
    const bw = Math.min(13, (rw - 22) / 3 - 2);
    bins.forEach(([c, sym], i) => {
      const x = cx + (i - 1) * (bw + 2.5);
      ctx.fillStyle = c; rr(ctx, x - bw / 2, fy - 16, bw, 16, [1, 1, 2, 2]); ctx.fill();
      ctx.fillStyle = shade(c, -0.25); rr(ctx, x - bw / 2 - 1, fy - 19, bw + 2, 3.5, 1.5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      if (sym === 'blatt') { oval(ctx, x, fy - 9, 2.2, 3.6, '#fff', 0.6); }
      else if (sym === 'schale') { ctx.beginPath(); ctx.arc(x, fy - 10, 3, 0, Math.PI); ctx.fill(); }
      else { kreis(ctx, x - 1.5, fy - 9, 1.1, '#fff'); kreis(ctx, x + 1.5, fy - 10, 1.1, '#fff'); kreis(ctx, x, fy - 7, 1.1, '#fff'); }
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x - bw / 2 + 1.5, fy - 15, 1.2, 13);
    });
    // Pfeil-Kreis an der Wand
    const sx = rx + rw - 18, sy = ry + 22;
    ctx.strokeStyle = '#59c977'; ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const a = k * TAU / 3 - 0.3;
      ctx.beginPath(); ctx.arc(sx, sy, 6, a, a + 1.5); ctx.stroke();
      const ax = sx + Math.cos(a + 1.5) * 6, ay = sy + Math.sin(a + 1.5) * 6;
      ctx.fillStyle = '#59c977'; ctx.beginPath(); ctx.arc(ax, ay, 1.8, 0, TAU); ctx.fill();
    }
  },
  kompostwerk(ctx, { rx, ry, rw, fy, cx, rnd }) {
    const bw = Math.min(40, rw - 22), x0 = cx - bw / 2;
    // Erdschichten
    const lay = ['#3a2412', '#5a3a1e', '#2e1c0e', '#4a3018'];
    lay.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x0 + 2, fy - 18 + i * 4.5, bw - 4, 4.6); });
    halboval(ctx, cx, fy - 18, bw / 2 - 2, 6, '#4a3018');
    for (let i = 0; i < 10; i++) kreis(ctx, x0 + 4 + rnd() * (bw - 8), fy - 16 + rnd() * 14, 0.9, ['#7aa848', '#c9a050', '#9a6a3c'][i % 3]);
    // Latten-Kasten
    ctx.fillStyle = '#b5823f';
    for (let y = fy - 16; y < fy; y += 5) ctx.fillRect(x0, y, bw, 2.5);
    ctx.fillStyle = '#8a5a30'; ctx.fillRect(x0 - 1, fy - 19, 3, 19); ctx.fillRect(x0 + bw - 2, fy - 19, 3, 19);
    emoji(ctx, '🌱', cx + 4, fy - 22, 9);
    emoji(ctx, '🪱', x0 + 8, fy - 17, 8);
  },
});

// ----- Pilze -----
function pilzchen(ctx, x, y, s, cap, stem = '#f4ead8') {
  ctx.fillStyle = stem; rr(ctx, x - 1.2 * s, y - 5 * s, 2.4 * s, 5 * s, 1); ctx.fill();
  ctx.fillStyle = cap; ctx.beginPath(); ctx.ellipse(x, y - 5 * s, 4 * s, 3.2 * s, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.4)'; kreis(ctx, x - 1.5 * s, y - 6.5 * s, 0.7 * s, 'rgba(255,255,255,.45)');
}
function beet(ctx, x0, x1, y, h = 7) {
  plank(ctx, x0, y, x1 - x0, h, '#8a5530');
  ctx.fillStyle = '#3e2410'; ctx.fillRect(x0 + 2, y, x1 - x0 - 4, 2);
}
Object.assign(AUSBAU_PROPS, {
  pilzplantage(ctx, { rx, ry, rw, fy, rnd }) {
    const H = fy - ry, R = rx + rw;
    const beds = H > 60 ? [ry + H * 0.5, fy - 7] : [fy - 7];
    beds.forEach((by, bi) => {
      const x0 = bi === 0 && beds.length > 1 ? rx + 10 : rx + 14, x1 = bi === 0 && beds.length > 1 ? R - 10 : R - 14;
      if (bi === 0 && beds.length > 1) { ctx.fillStyle = '#6b3f22'; ctx.fillRect(x0 + 4, by + 6, 2.5, fy - by - 6); ctx.fillRect(x1 - 6.5, by + 6, 2.5, fy - by - 6); }
      for (let x = x0 + 6, i = 0; x < x1 - 4; x += 8, i++) pilzchen(ctx, x, by + 0.5, 1 + (i % 2) * 0.15, bi ? '#ffb36b' : '#e2c8ff');
      beet(ctx, x0, x1, by, 7);
      ctx.fillStyle = '#fff'; ctx.fillRect(x0 + 3, by + 2, 5, 3);
    });
    // Feuchte Luft
    for (let i = 0; i < 18; i++) kreis(ctx, rx + 12 + rnd() * (rw - 24), ry + 12 + rnd() * (H - 24), 0.9, 'rgba(190,230,255,.35)');
    emoji(ctx, '💧', R - 18, ry + 22, 9);
  },
  pilzfarm(ctx, { rx, ry, rw, rh, fy, rnd }) {
    const H = fy - ry, R = rx + rw;
    // Gewächshaus-Glas
    ctx.fillStyle = 'rgba(200,240,255,.08)'; ctx.fillRect(rx, ry, rw, H);
    ctx.strokeStyle = 'rgba(230,250,255,.28)'; ctx.lineWidth = 1.2;
    for (let x = rx + 8; x < R; x += 16) { ctx.beginPath(); ctx.moveTo(x, fy); ctx.lineTo(x, ry); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(rx, ry + H * 0.35); ctx.quadraticCurveTo(rx + rw / 2, ry - H * 0.05, R, ry + H * 0.35); ctx.stroke();
    // Sprinkler-Rohr
    ctx.fillStyle = '#8a9aa8'; ctx.fillRect(rx + 8, ry + 15, rw - 16, 2.5);
    for (let x = rx + 36; x < R - 10; x += 18) { ctx.fillStyle = '#5a6a78'; ctx.fillRect(x - 1.5, ry + 17, 3, 3); }
    // Beete mit Leuchtpilzen
    const beds = H > 60 ? [ry + H * 0.55, fy - 7] : [fy - 7];
    beds.forEach((by, bi) => {
      const x0 = rx + (bi === 0 && beds.length > 1 ? 10 : 14), x1 = R - (bi === 0 && beds.length > 1 ? 10 : 14);
      if (bi === 0 && beds.length > 1) { ctx.fillStyle = '#6b3f22'; ctx.fillRect(x0 + 4, by + 6, 2.5, fy - by - 6); ctx.fillRect(x1 - 6.5, by + 6, 2.5, fy - by - 6); }
      for (let x = x0 + 7, i = 0; x < x1 - 4; x += 10, i++) {
        const c = i % 2 ? '#c78bff' : '#6ff0e0';
        drawGlow(ctx, i % 2 ? '200,140,255' : '110,240,224', x, by - 6, 9, 0.5);
        pilzchen(ctx, x, by + 0.5, 1.2, c, '#e8fff8');
      }
      beet(ctx, x0, x1, by, 7);
    });
    for (let i = 0; i < 10; i++) halboval(ctx, rx + 14 + rnd() * (rw - 28), fy + 1, 2 + rnd() * 2, 3, '#4fa84a');
  },
});

// ----- Bildung -----
/** Gemeinsames Tafel-Layout der Bildungslinie (passt sich 96×64 … 160×96 an). */
export function bildungsTafel(rx, ry, rw, rh, rechts = 0) {
  const fy = ry + rh - 13, H = fy - ry;
  const x = rx + 33, w = Math.max(30, rx + rw - 12 - rechts - x);
  // unterhalb der Deckenlampen beginnen, über den Pulten enden
  const y = ry + 21, h = clamp(Math.min(H * 0.42, fy - 12 - y), 16, 34);
  return { x, y, w, h, H, fy };
}
function tafel(ctx, b, rahmen = '#7a4d2a', flaeche = '#245a40') {
  ctx.fillStyle = rahmen; rr(ctx, b.x - 3, b.y - 3, b.w + 6, b.h + 6, 3); ctx.fill();
  ctx.fillStyle = flaeche; ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(b.x + b.w * 0.5, b.y, b.w * 0.2, b.h);
  ctx.fillStyle = shade(rahmen, 0.15); ctx.fillRect(b.x - 2, b.y + b.h + 1, b.w + 4, 2);
  ctx.fillStyle = '#fff'; ctx.fillRect(b.x + b.w - 10, b.y + b.h, 4, 1.4);
}
function tafelText(ctx, b, zeilen, size = 7) {
  ctx.save(); ctx.beginPath(); ctx.rect(b.x + 1, b.y, b.w - 2, b.h); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.font = `${size}px "Comic Sans MS", Fredoka, sans-serif`; ctx.textAlign = 'left';
  const n = Math.min(zeilen.length, Math.max(1, Math.floor((b.h - 3) / (size + 2))));
  for (let i = 0; i < n; i++) ctx.fillText(zeilen[i], b.x + 4, b.y + 3 + size + i * (size + 2));
  ctx.restore();
}
function pult(ctx, x, fy, w = 16, col = '#c58b52') {
  plank(ctx, x - w / 2, fy - 9, w, 3, col);
  ctx.fillStyle = shade(col, -0.3); ctx.fillRect(x - w / 2 + 2, fy - 6, 1.5, 6); ctx.fillRect(x + w / 2 - 3.5, fy - 6, 1.5, 6);
}
function hammer(ctx, x, y) { ctx.fillStyle = '#a8743f'; ctx.fillRect(x - 0.8, y, 1.6, 9); ctx.fillStyle = '#7a8088'; rr(ctx, x - 3.5, y - 1, 7, 3, 1); ctx.fill(); }
function saege(ctx, x, y) {
  ctx.fillStyle = '#c8d0d8'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 12, y + 1); ctx.lineTo(x + 12, y + 4); ctx.lineTo(x, y + 6); ctx.fill();
  ctx.fillStyle = '#7a8088'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(x + 1 + k * 2.2, y + 6 - k * 0.4); ctx.lineTo(x + 2.1 + k * 2.2, y + 7 - k * 0.4); ctx.lineTo(x + 3.2 + k * 2.2, y + 5.8 - k * 0.4); ctx.fill(); }
  ctx.fillStyle = '#b5622e'; rr(ctx, x - 4, y - 0.5, 5, 6.5, 2); ctx.fill();
}
function schluessel(ctx, x, y) {
  ctx.fillStyle = '#9aa4ae'; ctx.fillRect(x - 0.9, y + 2, 1.8, 8);
  ctx.beginPath(); ctx.arc(x, y + 1.5, 2.5, 0, TAU); ctx.fill();
  ctx.fillStyle = '#d8a35e'; ctx.fillRect(x - 0.8, y - 1.5, 1.6, 2.5);
}
function lineal(ctx, x, y, h) {
  ctx.fillStyle = '#ffd34d'; ctx.fillRect(x, y, 2.5, h);
  ctx.fillStyle = '#7a5a10'; for (let k = 2; k < h; k += 2) ctx.fillRect(x, y + k, k % 4 ? 0.8 : 1.4, 0.5);
}
Object.assign(AUSBAU_PROPS, {
  berufsschule(ctx, { rx, ry, rw, rh, fy }) {
    const R = rx + rw;
    const b = bildungsTafel(rx, ry, rw, rh, rw >= 120 ? 4 : 0);
    // Lochwand mit Werkzeug
    ctx.fillStyle = '#7a4d2a'; rr(ctx, b.x - 3, b.y - 3, b.w + 6, b.h + 6, 3); ctx.fill();
    ctx.fillStyle = '#d8b07a'; ctx.fillRect(b.x, b.y, b.w, b.h);
    for (let y = b.y + 3; y < b.y + b.h; y += 4) for (let x = b.x + 3; x < b.x + b.w; x += 4) kreis(ctx, x, y, 0.5, 'rgba(90,55,20,.45)');
    const tools = [hammer, saege, schluessel, lineal, hammer, schluessel, saege];
    let x = b.x + 6, i = 0;
    while (x < b.x + b.w - 8) {
      const f = tools[i % tools.length];
      if (f === saege) { if (x + 14 > b.x + b.w) break; f(ctx, x + 2, b.y + 4); x += 19; }
      else if (f === lineal) { f(ctx, x, b.y + 3, b.h - 6); x += 7; }
      else { f(ctx, x, b.y + 4); x += 9; }
      i++;
    }
    // Werkbank mit Schraubstock
    const wx = rx + 30, ww = Math.min(rw * 0.45, 64);
    plank(ctx, wx, fy - 13, ww, 4, '#c58b52');
    ctx.fillStyle = '#8a5a30'; ctx.fillRect(wx + 2, fy - 9, 2.5, 9); ctx.fillRect(wx + ww - 4.5, fy - 9, 2.5, 9);
    ctx.fillStyle = '#a8743f'; ctx.fillRect(wx + 3, fy - 4, ww - 6, 1.5);
    ctx.fillStyle = '#5d6670'; rr(ctx, wx + 1, fy - 18, 8, 5, 1); ctx.fill(); ctx.fillRect(wx - 2, fy - 16, 3, 1.2);
    plank(ctx, wx + 12, fy - 16, ww * 0.45, 3, '#e8c890');
    for (let k = 0; k < 3; k++) { ctx.strokeStyle = '#f0d8a8'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(wx + ww * 0.6 + k * 3, fy - 16, 1.4, Math.PI, TAU * 0.9); ctx.stroke(); }
    // Werkzeugkiste & Zahnrad
    ctx.fillStyle = '#d64545'; rr(ctx, R - 26, fy - 8, 13, 8, 1.5); ctx.fill();
    ctx.fillStyle = '#a83030'; ctx.fillRect(R - 26, fy - 5, 13, 1);
    strich(ctx, '#555', 1, R - 22.5, fy - 8, R - 22.5, fy - 10.5, R - 16.5, fy - 10.5, R - 16.5, fy - 8);
    for (let k = 0; k < 8; k++) kreis(ctx, wx + 4 + ((k * 37) % (ww + 10)), fy + 1 + (k % 3), 0.7, '#f0d8a8');
    if (fy - (b.y + b.h) > 22) zahnrad(ctx, R - 20, b.y + b.h + 12, 6, '#b8c2cc');
  },
  gymnasium(ctx, { rx, ry, rw, rh, fy, room }) {
    const R = rx + rw;
    const b = bildungsTafel(rx, ry, rw, rh, 14);
    // Säulen
    saeule(ctx, rx + 15, ry + 28, fy, 6, '#efe4cc');
    saeule(ctx, R - 15, ry + 12, fy, 6, '#efe4cc');
    // Tafel mit Geometrie
    tafel(ctx, b, '#6b4326', '#1f4a44');
    ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.9;
    const s = Math.min(b.h - 8, 22);
    const tx = b.x + 5, ty = b.y + b.h - 4;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + s, ty); ctx.lineTo(tx, ty - s * 0.8); ctx.closePath(); ctx.stroke();
    ctx.strokeRect(tx, ty - 3, 3, 3);
    ctx.strokeStyle = 'rgba(255,240,150,.85)';
    const cx2 = tx + s + 5 + s * 0.4;
    if (cx2 + s * 0.4 < b.x + b.w - 2) {
      ctx.beginPath(); ctx.arc(cx2, ty - s * 0.4, s * 0.38, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx2, ty - s * 0.4); ctx.lineTo(cx2 + s * 0.38, ty - s * 0.4); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.font = '7px "Comic Sans MS", Fredoka, sans-serif'; ctx.textAlign = 'left';
    const textX = cx2 + s * 0.4 + 4;
    if (textX + 30 < b.x + b.w) { ctx.fillText('a²+b²=c²', textX, b.y + 9); ctx.fillText('π ≈ 3,14', textX, b.y + 18); }
    else ctx.fillText('a²+b²=c²', b.x + 4, b.y + 8);
    ctx.restore();
    // Lorbeer über der Tafel
    // Pulte mit Büchern
    const n = Math.max(1, Math.floor((rw - 52) / 24));
    for (let i = 0; i < n; i++) {
      const x = rx + 34 + i * 24 + 8;
      if (x + 8 > R - 20) break;
      pult(ctx, x, fy, 16, '#a8743f');
      ctx.fillStyle = ['#c84a4a', '#4a7ac8', '#4ab06a'][i % 3]; ctx.fillRect(x - 5, fy - 11, 8, 2);
      ctx.fillStyle = '#f4ead8'; ctx.fillRect(x - 4.5, fy - 12, 7, 1);
    }
    emoji(ctx, '📐', R - 26, fy - 1, 9);
  },
});

// ----- Bücher -----
Object.assign(AUSBAU_PROPS, {
  bibliothek(ctx, { rx, ry, rw, fy, room }) {
    const R = rx + rw;
    const top = ry + 8;
    const n = Math.max(2, Math.round((rw - 16) / 26)), sw = (rw - 16) / n;
    for (let i = 0; i < n; i++) {
      const y0 = i === 0 ? ry + 27 : top;
      bookshelf(ctx, rx + 8 + i * sw, y0, sw - 1, fy - y0, room.id * 3 + i);
    }
    // Rollleiter
    const lx = rx + 8 + sw * (n > 2 ? 1.6 : 1.2);
    strich(ctx, '#e2b048', 1, rx + 8, top + 2, R - 8, top + 2);
    ctx.strokeStyle = '#c9893f'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(lx, top + 2); ctx.lineTo(lx + 10, fy); ctx.moveTo(lx + 6, top + 2); ctx.lineTo(lx + 16, fy); ctx.stroke();
    ctx.lineWidth = 1;
    for (let k = 1; k < 6; k++) { const q = k / 6; ctx.beginPath(); ctx.moveTo(lx + 10 * q, top + 2 + (fy - top - 2) * q); ctx.lineTo(lx + 6 + 10 * q, top + 2 + (fy - top - 2) * q); ctx.stroke(); }
    // Lesetisch mit grüner Lampe
    const tx = R - 28;
    plank(ctx, tx - 12, fy - 10, 24, 3, '#6b3f22');
    ctx.fillStyle = '#4a2a14'; ctx.fillRect(tx - 10, fy - 7, 2, 7); ctx.fillRect(tx + 8, fy - 7, 2, 7);
    ctx.fillStyle = '#f4ead8'; ctx.beginPath(); ctx.moveTo(tx - 8, fy - 10); ctx.lineTo(tx - 1, fy - 12); ctx.lineTo(tx, fy - 10); ctx.lineTo(tx + 1, fy - 12); ctx.lineTo(tx + 8, fy - 10); ctx.fill();
    ctx.fillStyle = '#c9a050'; ctx.fillRect(tx + 5, fy - 17, 1.2, 7);
    ctx.fillStyle = '#1f7a4a'; rr(ctx, tx + 1, fy - 20, 10, 4, [3, 3, 1, 1]); ctx.fill();
  },
  archiv(ctx, { rx, ry, rw, fy, rnd }) {
    const R = rx + rw;
    // Waben-Regal mit Schriftrollen
    const x0 = rx + 32, x1 = R - 30, y0 = ry + 9, y1 = fy - 2;
    ctx.fillStyle = '#6b4326'; rr(ctx, x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 2, 2); ctx.fill();
    const cs = 9;
    for (let y = y0; y + cs <= y1; y += cs) for (let x = x0; x + cs <= x1 + 0.5; x += cs) {
      ctx.fillStyle = '#2a1608'; ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
      const k = (rnd() * 3) | 0;
      for (let j = 0; j < 1 + (k > 0); j++) {
        const sx = x + 3 + j * 3.2, sy = y + cs / 2 + (j ? -1 : 1);
        kreis(ctx, sx, sy, 1.9, '#efe2c0'); kreis(ctx, sx, sy, 0.7, '#b89a6a');
      }
      if (k === 2) { ctx.fillStyle = '#c42c4a'; ctx.fillRect(x + 2, y + cs / 2 - 0.4, cs - 4, 0.8); }
    }
    // Lesepult mit offener Rolle
    const lx = R - 18;
    ctx.fillStyle = '#6b4326'; ctx.fillRect(lx - 1, fy - 14, 2.5, 14); ctx.fillRect(lx - 5, fy - 1.5, 10, 1.5);
    ctx.save(); ctx.translate(lx, fy - 16); ctx.rotate(-0.25);
    ctx.fillStyle = '#efe2c0'; ctx.fillRect(-8, -3, 16, 6);
    kreis(ctx, -8, 0, 2.2, '#d8c49a'); kreis(ctx, 8, 0, 2.2, '#d8c49a');
    ctx.fillStyle = 'rgba(80,50,20,.5)'; for (let k = 0; k < 3; k++) ctx.fillRect(-5, -1.5 + k * 1.5, 9 - k * 2, 0.6);
    ctx.restore();
    // Kerze & Feder
    ctx.fillStyle = '#c9a050'; oval(ctx, rx + 20, fy - 1, 4, 1.4, '#c9a050');
    kerze(ctx, rx + 20, fy - 1, 7);
    strich(ctx, '#f4f4f4', 1.2, R - 12, fy - 22, R - 6, fy - 30);
  },
});

// ----- Backen -----
function torte(ctx, x, fy, s = 1) {
  ctx.fillStyle = '#d8d8e0'; ctx.fillRect(x - 0.8 * s, fy - 5 * s, 1.6 * s, 5 * s); oval(ctx, x, fy - 5 * s, 8 * s, 1.6 * s, '#e8e8f0');
  const t = [[7, 6, '#fff5f8'], [5.2, 5, '#ffb3cf'], [3.5, 4.5, '#fff5f8']];
  let y = fy - 6 * s;
  for (const [w, h, c] of t) {
    ctx.fillStyle = c; rr(ctx, x - w * s, y - h * s, w * 2 * s, h * s, 1.5 * s); ctx.fill();
    ctx.fillStyle = '#ff7aa8'; for (let k = -w + 1; k < w; k += 2) kreis(ctx, x + k * s, y - h * s + 0.6 * s, 0.7 * s, '#ff7aa8');
    y -= h * s;
  }
  kreis(ctx, x, y - 1.6 * s, 1.6 * s, '#e0263f');
}
function ofen(ctx, x, fy, w, h) {
  ctx.fillStyle = '#a0472f'; rr(ctx, x, fy - h, w, h, [w * 0.4, w * 0.4, 2, 2]); ctx.fill();
  ctx.strokeStyle = 'rgba(60,20,10,.35)'; ctx.lineWidth = 0.8;
  for (let y = fy - h + 5; y < fy; y += 5) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke(); }
  ctx.fillStyle = '#2a0f06'; rr(ctx, x + w * 0.22, fy - h * 0.5, w * 0.56, h * 0.42, [w * 0.28, w * 0.28, 0, 0]); ctx.fill();
}
Object.assign(AUSBAU_PROPS, {
  konditorei(ctx, { rx, ry, rw, fy }) {
    const R = rx + rw;
    // rosa Streifentapete
    ctx.fillStyle = 'rgba(255,170,200,.1)';
    for (let x = rx; x < R; x += 10) ctx.fillRect(x, ry, 5, fy - ry);
    wimpel(ctx, rx + 32, R - 10, ry + 9, 4, ['#ff9ec0', '#fff', '#ffd34d'], 3);
    // Etagere-Torte
    torte(ctx, rx + 22, fy, 1.15);
    // Glasvitrine
    const vx = rx + 38, vw = R - 12 - vx, vh = Math.min(26, fy - ry - 22);
    plank(ctx, vx, fy - 9, vw, 9, '#f2c6d6');
    ctx.fillStyle = 'rgba(210,240,255,.28)'; rr(ctx, vx + 1, fy - 9 - vh, vw - 2, vh, [4, 4, 0, 0]); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(vx + 2, fy - 9 - vh * 0.5, vw - 4, 1);
    const items = ['🧁', '🍰', '🍩', '🧁', '🍪'];
    const n = Math.max(2, Math.floor((vw - 4) / 11));
    for (let i = 0; i < n; i++) {
      const x = vx + 6 + i * ((vw - 12) / Math.max(1, n - 1));
      emoji(ctx, items[i % 5], x, fy - 9 - vh * 0.5, 8);
      emoji(ctx, items[(i + 2) % 5], x, fy - 10, 8);
    }
  },
  grossbaeckerei(ctx, { rx, ry, rw, fy }) {
    const R = rx + rw;
    // drei Öfen
    const n = 3, ow = Math.min(18, (rw - 44) / 3), oh = Math.min(24, fy - ry - 24);
    for (let i = 0; i < n; i++) ofen(ctx, rx + 32 + i * (ow + 4), fy - 10, ow, oh);
    // Fließband
    ctx.fillStyle = '#5d6670'; rr(ctx, rx + 10, fy - 10, rw - 20, 4, 2); ctx.fill();
    ctx.fillStyle = '#3a4048'; ctx.fillRect(rx + 12, fy - 9, rw - 24, 2);
    for (let x = rx + 14; x < R - 12; x += 8) kreis(ctx, x, fy - 3, 2, '#8a949e');
    ctx.fillStyle = '#4a525c'; ctx.fillRect(rx + 12, fy - 6, 2, 6); ctx.fillRect(R - 14, fy - 6, 2, 6);
    // Mehlsäcke
    sack(ctx, rx + 18, fy - 10, 11, 12, '#f4ead8');
    schrift(ctx, 'MEHL', rx + 18, fy - 13, 3.5, '#8a6a3a');
  },
});

// ----- Essen -----
Object.assign(AUSBAU_PROPS, {
  festsaal(ctx, { rx, ry, rw, fy }) {
    const R = rx + rw;
    wimpel(ctx, rx + 32, R - 8, ry + 8, 6, ['#ff5f7e', '#ffd34d', '#5fc8ff', '#8ee26b', '#c48bff'], 3.5);
    // Banner
    if (fy - ry > 40) { banner(ctx, rx + rw * 0.42, ry + 17, 9, 14, '#c42c4a', null); banner(ctx, rx + rw * 0.58, ry + 17, 9, 14, '#e2b048', null); }
    // Stuhllehnen
    for (let x = rx + 18; x < R - 16; x += 12) { ctx.fillStyle = '#8a3a2a'; rr(ctx, x, fy - 19, 7, 12, [3.5, 3.5, 0, 0]); ctx.fill(); ctx.fillStyle = '#e2b048'; ctx.fillRect(x + 1, fy - 17, 5, 0.8); }
    // lange Tafel
    ctx.fillStyle = '#fbf6ec'; rr(ctx, rx + 12, fy - 11, rw - 24, 4, 1.5); ctx.fill();
    ctx.fillStyle = '#efe6d4'; ctx.fillRect(rx + 13, fy - 7, rw - 26, 5);
    ctx.fillStyle = '#e04848'; ctx.fillRect(rx + 12, fy - 8, rw - 24, 1);
    ctx.fillStyle = '#6b3f22'; ctx.fillRect(rx + 16, fy - 2, 2, 2); ctx.fillRect(R - 18, fy - 2, 2, 2);
    const food = ['🍇', '🥧', '🍰', '🍓', '🧀', '🍯'];
    let i = 0;
    for (let x = rx + 20; x < R - 18; x += 13, i++) {
      if (i % 3 === 1) { kerze(ctx, x, fy - 11, 6); continue; }
      oval(ctx, x, fy - 11, 4.5, 1.2, '#fff');
      emoji(ctx, food[i % food.length], x, fy - 11, 8);
    }
  },
  sternerestaurant(ctx, { rx, ry, rw, fy }) {
    const R = rx + rw;
    // dunkle edle Wand
    ctx.fillStyle = 'rgba(60,10,20,.35)'; ctx.fillRect(rx, ry, rw, fy - ry);
    // Stern-Emblem
    const ex = rx + rw * 0.5, ey = ry + 22;
    kreis(ctx, ex, ey, 8, '#e2b048'); kreis(ctx, ex, ey, 6.5, '#3a0e18'); stern(ctx, ex, ey + 0.5, 5, '#ffd34d');
    for (const d of [-1, 1]) { stern(ctx, ex + d * 13, ey + 2, 2.6, '#ffd34d'); }
    // runde Tische mit Kerzen
    const n = Math.max(2, Math.floor((rw - 24) / 30));
    for (let k = 0; k < n; k++) {
      const x = rx + 12 + (k + 0.5) * ((rw - 24) / n);
      ctx.fillStyle = '#fbf6ec'; ctx.beginPath(); ctx.moveTo(x - 10, fy - 9); ctx.lineTo(x + 10, fy - 9); ctx.lineTo(x + 12, fy); ctx.lineTo(x - 12, fy); ctx.fill();
      oval(ctx, x, fy - 9, 10, 1.6, '#fff');
      ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(x - 3, fy - 8, 1, 8); ctx.fillRect(x + 4, fy - 8, 1, 8);
      kerze(ctx, x, fy - 9, 5);
      // Gläser
      for (const d of [-6, 6]) { ctx.fillStyle = 'rgba(230,240,255,.8)'; ctx.fillRect(x + d - 0.4, fy - 12, 0.8, 3); ctx.beginPath(); ctx.moveTo(x + d - 1.6, fy - 15); ctx.lineTo(x + d + 1.6, fy - 15); ctx.lineTo(x + d, fy - 12); ctx.fill(); ctx.fillStyle = '#b01e3a'; ctx.fillRect(x + d - 1, fy - 14.4, 2, 1.2); }
      // Stühle
      ctx.fillStyle = '#5a1e2a'; rr(ctx, x - 17, fy - 14, 4, 14, 2); ctx.fill(); rr(ctx, x + 13, fy - 14, 4, 14, 2); ctx.fill();
    }
    pflanze(ctx, R - 14, fy, 0.9);
  },
});

// ----- Gesundheit -----
function rotesKreuz(ctx, x, y, s, bg = '#fff') {
  ctx.fillStyle = bg; rr(ctx, x - s, y - s, s * 2, s * 2, s * 0.3); ctx.fill();
  ctx.fillStyle = '#e03a3a'; ctx.fillRect(x - s * 0.25, y - s * 0.7, s * 0.5, s * 1.4); ctx.fillRect(x - s * 0.7, y - s * 0.25, s * 1.4, s * 0.5);
}
function bett(ctx, x, fy, w, decke = '#7ab8ff') {
  ctx.fillStyle = '#c8d0d8'; ctx.fillRect(x, fy - 7, 1.6, 7); ctx.fillRect(x + w - 1.6, fy - 11, 1.6, 11);
  ctx.fillStyle = '#e8eef4'; rr(ctx, x, fy - 9, w, 4, 1.5); ctx.fill();
  ctx.fillStyle = decke; rr(ctx, x + 1, fy - 11, w * 0.68, 4, 1.5); ctx.fill();
  ctx.fillStyle = '#fff'; rr(ctx, x + w * 0.7, fy - 12.5, w * 0.26, 4, 2); ctx.fill();
}
Object.assign(AUSBAU_PROPS, {
  arztpraxis(ctx, { rx, ry, rw, fy }) {
    const R = rx + rw;
    // Sehtafel
    const sx = rx + 34, sy = ry + 17;
    ctx.fillStyle = '#fbfbf6'; rr(ctx, sx, sy, 16, 19, 1.5); ctx.fill();
    const rows = [['E', 5.5], ['F P', 4], ['T O Z', 3.2], ['L P E D', 2.6]];
    rows.forEach(([s, sz], i) => schrift(ctx, s, sx + 8, sy + 5.5 + i * 4.2, sz, '#222'));
    // Schrank mit rotem Kreuz
    ctx.fillStyle = '#eef2f4'; rr(ctx, R - 26, ry + 12, 14, 18, 2); ctx.fill();
    ctx.fillStyle = '#c8d0d8'; ctx.fillRect(R - 19.4, ry + 13, 0.8, 16);
    rotesKreuz(ctx, R - 19, ry + 21, 3.5, 'rgba(0,0,0,0)');
    // Liege
    const lx = rx + 32, lw = Math.min(34, rw * 0.38);
    ctx.fillStyle = '#c8d0d8'; ctx.fillRect(lx + 2, fy - 7, 1.6, 7); ctx.fillRect(lx + lw - 3.6, fy - 7, 1.6, 7);
    ctx.fillStyle = '#7fd8c8'; rr(ctx, lx, fy - 11, lw, 5, 2); ctx.fill();
    ctx.fillStyle = '#f4f4f4'; ctx.fillRect(lx + 6, fy - 11.5, lw - 8, 1.2);
    ctx.fillStyle = '#fff'; rr(ctx, lx + 1, fy - 13.5, 7, 3.5, 1.5); ctx.fill();
    // Paravent
    const px = R - 30;
    for (let k = 0; k < 3; k++) { ctx.fillStyle = k % 2 ? '#9ad8b8' : '#b8e8cc'; ctx.fillRect(px + k * 5.5, fy - 17, 5, 17); }
    ctx.fillStyle = '#e8eef4'; ctx.fillRect(px - 0.5, fy - 18, 17.5, 1.5);
    // Stethoskop am Haken
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(rx + 24, ry + 30); ctx.quadraticCurveTo(rx + 18, ry + 42, rx + 24, ry + 44); ctx.quadraticCurveTo(rx + 30, ry + 42, rx + 26, ry + 30); ctx.stroke();
    kreis(ctx, rx + 24, ry + 45, 1.8, '#9aa4ae');
  },
  krankenhaus(ctx, { rx, ry, rw, fy }) {
    const R = rx + rw;
    // Kreuz-Schild
    rotesKreuz(ctx, rx + 38, ry + 15, 5);
    // Kräuterregal
    const kx = rx + 48, kw = R - 14 - kx;
    if (kw > 18) {
      plank(ctx, kx, ry + 19, kw, 2.5, '#ffffff');
      for (let x = kx + 3, i = 0; x < kx + kw - 3; x += 6, i++) {
        ctx.fillStyle = ['#5fd068', '#3fae4f', '#a8e070', '#2fbfb4'][i % 4]; rr(ctx, x, ry + 12, 4, 7, [1.5, 1.5, 1, 1]); ctx.fill();
        ctx.fillStyle = '#f4ead8'; ctx.fillRect(x + 1, ry + 10.5, 2, 1.6);
      }
    }
    // Monitor
    const mx = R - 26;
    ctx.fillStyle = '#4a525c'; rr(ctx, mx - 1, ry + 26, 16, 11, 2); ctx.fill();
    ctx.fillStyle = '#0d2a1a'; ctx.fillRect(mx + 1, ry + 28, 12, 7);
    ctx.fillStyle = '#4a525c'; ctx.fillRect(mx + 6, ry + 37, 2, fy - ry - 37);
    // Betten & Tropf
    const bw = Math.min(26, (rw - 50) / 2);
    bett(ctx, rx + 13, fy, bw, '#7ab8ff');
    bett(ctx, rx + 18 + bw + 4, fy, bw, '#ffb3cf');
    const tx = rx + 18 + bw;
    strich(ctx, '#aab4be', 1, tx, fy, tx, fy - 26); strich(ctx, '#aab4be', 1, tx - 3, fy, tx + 3, fy);
    ctx.fillStyle = 'rgba(200,255,220,.85)'; rr(ctx, tx - 2.5, fy - 27, 5, 7, 2); ctx.fill();
    strich(ctx, 'rgba(220,240,255,.8)', 0.6, tx, fy - 20, tx + 4, fy - 12);
  },
});

// ----- Kino -----
function leinwandRahmen(ctx, sx, sy, sw, sh, rahmen = '#2a1a14') {
  ctx.fillStyle = rahmen; rr(ctx, sx - 4, sy - 4, sw + 8, sh + 8, 3); ctx.fill();
  ctx.fillStyle = '#f5f0e6'; ctx.fillRect(sx, sy, sw, sh);
}
export function kinoLeinwand(rx, ry, rw, rh, typ) {
  const fy = ry + rh - 13, H = fy - ry;
  // unterhalb von Schild & Sternen, damit die Animation sie nicht überdeckt
  const sy = ry + 28, sh = clamp(Math.min(H * 0.4, fy - 24 - sy), 16, 34);
  if (typ === 'filmpalast') return { sx: rx + 26, sy, sw: rw - 52, sh };
  return { sx: rx + 14, sy, sw: rw - 28, sh };
}
function popcorn(ctx, x, fy) {
  ctx.fillStyle = '#d63a52'; rr(ctx, x - 7, fy - 12, 14, 12, 1.5); ctx.fill();
  ctx.fillStyle = 'rgba(230,245,255,.55)'; ctx.fillRect(x - 6, fy - 24, 12, 11);
  ctx.strokeStyle = '#d63a52'; ctx.lineWidth = 1; ctx.strokeRect(x - 6, fy - 24, 12, 11);
  for (let k = 0; k < 12; k++) kreis(ctx, x - 4.5 + (k * 7 % 10), fy - 15 - (k % 4) * 1.5, 1.2, '#fff6c8');
  ctx.fillStyle = '#d63a52'; rr(ctx, x - 7.5, fy - 27, 15, 3.5, 1.5); ctx.fill();
  schrift(ctx, 'POP', x, fy - 3.5, 4.5, '#fff');
}
Object.assign(AUSBAU_PROPS, {
  grosskino(ctx, { rx, ry, rw, rh, fy }) {
    const { sx, sy, sw, sh } = kinoLeinwand(rx, ry, rw, rh, 'grosskino');
    leinwandRahmen(ctx, sx, sy, sw, sh);
    // Volant
    for (let x = sx - 4; x < sx + sw + 4; x += 8) { ctx.fillStyle = '#8a1f2e'; ctx.beginPath(); ctx.moveTo(x, sy - 4); ctx.quadraticCurveTo(x + 4, sy + 2, x + 8, sy - 4); ctx.fill(); }
    // Sitzreihen gestaffelt
    const rows = fy - (sy + sh) > 26 ? 3 : 2;
    for (let r = 0; r < rows; r++) sitzreihe(ctx, rx + 14 + r * 5, rx + rw - 30 + r * 2, fy - r * 7, r % 2 ? '#b8233a' : '#d63a52', 9, 8, 2);
    popcorn(ctx, rx + rw - 18, fy);
  },
  filmpalast(ctx, { rx, ry, rw, rh, fy }) {
    const R = rx + rw;
    const { sx, sy, sw, sh } = kinoLeinwand(rx, ry, rw, rh, 'filmpalast');
    leinwandRahmen(ctx, sx, sy, sw, sh, '#e2b048');
    // Samtvorhänge mit Kordeln
    for (const d of [-1, 1]) {
      const x0 = d < 0 ? sx - 6 : sx + sw + 6, x1 = d < 0 ? rx + 8 : R - 8;
      ctx.fillStyle = '#9a1830';
      ctx.beginPath(); ctx.moveTo(x0, ry + 7); ctx.lineTo(x1, ry + 7); ctx.lineTo(x1, fy);
      ctx.lineTo(x1 - d * 4, fy); ctx.quadraticCurveTo(x0 + d * 2, sy + sh * 0.7, x0, ry + 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1;
      for (let k = 1; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x0 + (x1 - x0) * k / 3, ry + 8); ctx.lineTo(x0 + (x1 - x0) * k / 3 - d * 1, fy); ctx.stroke(); }
      kreis(ctx, (x0 + x1) / 2 - d * 1, sy + sh * 0.7, 2, '#f2c94c');
    }
    ctx.fillStyle = '#9a1830'; ctx.fillRect(rx + 6, ry + 5, rw - 12, 4); ctx.fillStyle = '#f2c94c'; ctx.fillRect(rx + 6, ry + 9, rw - 12, 1.4);
    // roter Teppich & Absperrung
    teppich(ctx, sx + 4, sx + sw - 4, fy);
    for (const x of [sx + 8, sx + sw - 8]) { ctx.fillStyle = '#e2b048'; ctx.fillRect(x - 1, fy - 10, 2, 10); kreis(ctx, x, fy - 11, 1.8, '#f2c94c'); }
    ctx.strokeStyle = '#c42c4a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(sx + 8, fy - 9); ctx.quadraticCurveTo(sx + sw / 2, fy - 3, sx + sw - 8, fy - 9); ctx.stroke();
    sitzreihe(ctx, sx + 12, sx + sw / 2 - 8, fy - 1, '#7a1f2e', 8, 7, 2);
    sitzreihe(ctx, sx + sw / 2 + 8, sx + sw - 10, fy - 1, '#7a1f2e', 8, 7, 2);
  },
});

// ----- Möbel -----
Object.assign(AUSBAU_PROPS, {
  schreinerei(ctx, { rx, ry, rw, fy, rnd }) {
    const R = rx + rw;
    // Werkzeugwand
    const wy = ry + 18;
    plank(ctx, rx + 34, wy, R - rx - 46, 14, '#c99a62');
    saege(ctx, rx + 40, wy + 3); hammer(ctx, rx + 60, wy + 3);
    if (rw > 80) { schluessel(ctx, rx + 68, wy + 2); lineal(ctx, rx + 74, wy + 1.5, 11); }
    // Brettstapel an der Wand
    for (let k = 0; k < 3; k++) { ctx.save(); ctx.translate(rx + 16 + k * 3, fy); ctx.rotate(-0.12); plank(ctx, -2, -30 + k * 2, 4, 30 - k * 2, ['#e8c890', '#d8a868', '#c99252'][k]); ctx.restore(); }
    // Hobelbank
    const bx = rx + 30, bw = R - 14 - bx;
    plank(ctx, bx, fy - 13, bw, 5, '#b5823f');
    ctx.fillStyle = '#8a5a30'; ctx.fillRect(bx + 3, fy - 8, 3, 8); ctx.fillRect(bx + bw - 6, fy - 8, 3, 8); ctx.fillRect(bx + 3, fy - 3, bw - 6, 2);
    // Hobel
    ctx.fillStyle = '#7a4d2a'; rr(ctx, bx + bw * 0.4, fy - 17, 12, 4, 1.5); ctx.fill(); ctx.fillStyle = '#c42c4a'; kreis(ctx, bx + bw * 0.4 + 3, fy - 18, 1.8, '#c42c4a');
    // Hobelspäne
    ctx.strokeStyle = '#f0d8a8'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 9; i++) { const x = bx + rnd() * bw, y = fy - 1 - rnd() * 2; ctx.beginPath(); ctx.arc(x, y, 1.6, Math.PI * 0.8, TAU * 1.05); ctx.stroke(); }
  },
  moebelhaus(ctx, { rx, ry, rw, fy }) {
    const R = rx + rw;
    // Schriftzug
    const sx0 = rx + rw * 0.58, sx1 = R - 12;
    ctx.fillStyle = '#c42c4a'; rr(ctx, sx0, ry + 10, sx1 - sx0, 9, 2); ctx.fill();
    ctx.fillStyle = '#ffd34d'; ctx.fillRect(sx0 + 2, ry + 17.4, sx1 - sx0 - 4, 0.8);
    schrift(ctx, 'MÖBEL', (sx0 + sx1) / 2, ry + 16.6, 6.5, '#fff');
    // Ausstellungs-Podeste
    const pw = (R - 12 - (rx + 12)) / 3;
    const cols = ['#e8d0b0', '#d0e0f0', '#e0f0d0'];
    for (let i = 0; i < 3; i++) { ctx.fillStyle = cols[i]; rr(ctx, rx + 12 + i * pw + 1, fy - 3, pw - 2, 3, 1); ctx.fill(); }
    // Sofa
    const sx = rx + 12 + pw * 0.5;
    ctx.fillStyle = '#4f7fd0'; rr(ctx, sx - 11, fy - 15, 22, 9, 4); ctx.fill();
    ctx.fillStyle = '#6f9fea'; rr(ctx, sx - 9, fy - 9, 18, 5, 2); ctx.fill();
    rr(ctx, sx - 13, fy - 12, 4, 9, 2); ctx.fill(); rr(ctx, sx + 9, fy - 12, 4, 9, 2); ctx.fill();
    ctx.fillStyle = '#ffd34d'; rr(ctx, sx - 6, fy - 14, 5, 5, 1.5); ctx.fill();
    // Stehlampe + Sessel
    const mx = rx + 12 + pw * 1.5;
    strich(ctx, '#333', 1, mx - 6, fy - 3, mx - 6, fy - 22);
    ctx.fillStyle = '#ffe0a0'; ctx.beginPath(); ctx.moveTo(mx - 9, fy - 20); ctx.lineTo(mx - 3, fy - 20); ctx.lineTo(mx - 4.5, fy - 25); ctx.lineTo(mx - 7.5, fy - 25); ctx.fill();
    ctx.fillStyle = '#c86a3a'; rr(ctx, mx - 2, fy - 12, 11, 9, 3); ctx.fill(); rr(ctx, mx - 1, fy - 17, 9, 7, 3); ctx.fill();
    // Bett
    const bx = rx + 12 + pw * 2.5;
    ctx.fillStyle = '#8a5530'; rr(ctx, bx - 11, fy - 15, 3, 12, 1); ctx.fill();
    ctx.fillStyle = '#fff'; rr(ctx, bx - 9, fy - 9, 19, 5, 2); ctx.fill();
    ctx.fillStyle = '#ff9ec0'; rr(ctx, bx - 4, fy - 10, 14, 5, 2); ctx.fill();
    // Preisschilder
    for (let i = 0; i < 3; i++) { const x = rx + 12 + pw * (i + 0.5) + 6; ctx.fillStyle = '#ffd34d'; rr(ctx, x, fy - 23 - (i === 1 ? 6 : 0), 8, 5, 1); ctx.fill(); schrift(ctx, ['3⭐', '2⭐', '5⭐'][i], x + 4, fy - 19.5 - (i === 1 ? 6 : 0), 3.5, '#5a3a10'); }
  },
});

// ----- Wasser -----
Object.assign(AUSBAU_PROPS, {
  quellgrotte(ctx, { rx, ry, rw, fy, cx, rnd }) {
    // Tropfsteine
    for (let x = rx + 12; x < rx + rw - 8; x += 7) {
      const h = 5 + rnd() * 10;
      ctx.fillStyle = rnd() > 0.5 ? '#8a8fa0' : '#a0a6b8';
      ctx.beginPath(); ctx.moveTo(x - 3, ry + 4); ctx.lineTo(x + 3, ry + 4); ctx.lineTo(x, ry + 4 + h); ctx.fill();
    }
    // Felsbecken
    ctx.fillStyle = '#7a7f8c'; rr(ctx, cx - 22, fy - 10, 44, 10, 5); ctx.fill();
    for (let k = 0; k < 6; k++) oval(ctx, cx - 20 + k * 8, fy - 9 + (k % 2), 4.5, 3, k % 2 ? '#8e94a2' : '#6e7380');
    ctx.fillStyle = lin(ctx, 0, fy - 10, 0, fy - 4, '#9fe0ff', '#3a9ad8'); ctx.beginPath(); ctx.ellipse(cx, fy - 8, 17, 3.5, 0, 0, TAU); ctx.fill();
    // Farne & Moos
    for (const [x, d] of [[cx - 22, -1], [cx + 22, 1]]) {
      for (let k = 0; k < 4; k++) { ctx.strokeStyle = '#4fa84a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, fy - 4); ctx.quadraticCurveTo(x + d * (2 + k * 2), fy - 16 + k, x + d * (6 + k * 2), fy - 10 + k * 2); ctx.stroke(); }
    }
    halboval(ctx, cx, fy - 10, 6, 2.5, '#5fb84a');
  },
  wasserwerk(ctx, { rx, ry, rw, fy, cx }) {
    const R = rx + rw;
    // Rohre
    const py = ry + 21;
    ctx.fillStyle = '#5a8ab0';
    ctx.fillRect(rx + 22, py, R - rx - 34, 4);
    ctx.fillRect(R - 16, py, 4, fy - py - 6);
    ctx.fillStyle = '#7aaad0'; ctx.fillRect(rx + 22, py, R - rx - 34, 1.2);
    for (const x of [rx + 30, R - 22]) { ctx.fillStyle = '#3a6a90'; ctx.fillRect(x, py - 1, 2.5, 6); }
    // Ventilrad
    const vx = R - 14, vy = py + 12;
    ctx.strokeStyle = '#d64545'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(vx, vy, 4.5, 0, TAU); ctx.stroke();
    strich(ctx, '#d64545', 1, vx - 4.5, vy, vx + 4.5, vy); strich(ctx, '#d64545', 1, vx, vy - 4.5, vx, vy + 4.5);
    // Tank mit Manometer
    metall(ctx, rx + 14, fy - 24, 20, 24, 6, '#b8c8d4');
    kreis(ctx, rx + 24, fy - 15, 4.5, '#fff'); ctx.strokeStyle = '#333'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(rx + 24, fy - 15, 4.5, 0, TAU); ctx.stroke();
    // Wasserhahn & Becken
    ctx.fillStyle = '#9aa4ae'; ctx.fillRect(R - 22, fy - 18, 8, 3); ctx.fillRect(R - 22, fy - 18, 2.5, 5);
    becken(ctx, R - 32, fy - 8, 20, 8);
  },
});

// ----- Sonne -----
Object.assign(AUSBAU_PROPS, {
  waermestube(ctx, { rx, ry, rw, fy, rnd }) {
    const R = rx + rw;
    // Sonnenfenster
    const wx = rx + rw * 0.72, wy = ry + 19;
    kreis(ctx, wx, wy, 9, '#8a5a30');
    ctx.fillStyle = lin(ctx, 0, wy - 8, 0, wy + 8, '#fff2a8', '#ffb84d'); ctx.beginPath(); ctx.arc(wx, wy, 7.5, 0, TAU); ctx.fill();
    strich(ctx, '#8a5a30', 1, wx - 7.5, wy, wx + 7.5, wy); strich(ctx, '#8a5a30', 1, wx, wy - 7.5, wx, wy + 7.5);
    // Steinherd mit Wärmesteinen
    const hx = rx + 32;
    ctx.fillStyle = '#7a6a5c'; rr(ctx, hx - 2, fy - 12, 30, 12, [4, 4, 1, 1]); ctx.fill();
    for (let k = 0; k < 5; k++) for (let j = 0; j < 2; j++) oval(ctx, hx + 3 + k * 5.5 + j * 2, fy - 12 - j * 3.5, 3, 2.4, j ? '#ffb347' : '#ff8a2a');
    ctx.strokeStyle = 'rgba(60,40,30,.5)'; ctx.lineWidth = 0.7;
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(hx - 2 + k * 7.5, fy - 9); ctx.lineTo(hx - 2 + k * 7.5, fy); ctx.stroke(); }
    // Sessel mit Decke
    const sx = R - 22;
    ctx.fillStyle = '#b8452f'; rr(ctx, sx - 8, fy - 18, 16, 18, 4); ctx.fill();
    ctx.fillStyle = '#d65a3c'; rr(ctx, sx - 9, fy - 10, 18, 7, 3); ctx.fill();
    for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? '#ffe08a' : '#ff9a5c'; ctx.fillRect(sx - 6 + k * 3, fy - 17, 3, 8); }
    // Thermometer
    ctx.fillStyle = '#fff'; rr(ctx, rx + 16, ry + 30, 3.5, 14, 1.8); ctx.fill();
    ctx.fillStyle = '#ff4d4d'; ctx.fillRect(rx + 16.8, ry + 33, 2, 11); kreis(ctx, rx + 17.7, ry + 45, 2.4, '#ff4d4d');
    // Teppich
    ctx.fillStyle = '#d6a040'; rr(ctx, rx + 14, fy, rw - 28, 3, 1.5); ctx.fill();
  },
  sonnentempel(ctx, { rx, ry, rw, fy, cx }) {
    const R = rx + rw, H = fy - ry;
    // goldene Kuppel
    const kr = Math.min(rw * 0.42, H * 0.95);
    ctx.fillStyle = 'rgba(255,215,110,.16)'; ctx.beginPath(); ctx.arc(cx, fy, kr, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#e2b048'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, fy, kr, Math.PI, 0); ctx.stroke();
    ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(240,200,100,.5)';
    for (let k = 1; k < 8; k++) { const a = Math.PI + k * Math.PI / 8; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * kr * 0.35, fy + Math.sin(a) * kr * 0.35); ctx.lineTo(cx + Math.cos(a) * kr, fy + Math.sin(a) * kr); ctx.stroke(); }
    // Säulen
    saeule(ctx, rx + 16, ry + 28, fy, 6, '#f6e7b8');
    saeule(ctx, R - 16, ry + 20, fy, 6, '#f6e7b8');
    // Altar mit Sonnenscheibe
    ctx.fillStyle = '#efe0b8'; rr(ctx, cx - 9, fy - 8, 18, 8, 1); ctx.fill();
    ctx.fillStyle = '#e2b048'; ctx.fillRect(cx - 10, fy - 9, 20, 1.6);
    const sy = fy - 9 - Math.min(13, H * 0.26);
    for (let k = 0; k < 12; k++) { const a = k * TAU / 12; strich(ctx, '#ffc93a', 1.4, cx + Math.cos(a) * 7, sy + Math.sin(a) * 7, cx + Math.cos(a) * 10, sy + Math.sin(a) * 10); }
    ctx.fillStyle = lin(ctx, 0, sy - 6, 0, sy + 6, '#fff3a0', '#f5a623'); ctx.beginPath(); ctx.arc(cx, sy, 6, 0, TAU); ctx.fill();
    // Mosaikboden
    for (let x = rx + 12, i = 0; x < R - 12; x += 5, i++) { ctx.fillStyle = ['#f2c94c', '#e8763a', '#fff0b0'][i % 3]; ctx.fillRect(x, fy + 1, 4, 2.5); }
  },
});

// ----- Einkaufen -----
function laden(ctx, x, y0, w, y1, c1, items, sz = 11) {
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x + 1, y0 + 6, w - 2, y1 - y0 - 6);
  ctx.fillStyle = 'rgba(255,250,220,.1)'; ctx.fillRect(x + 3, y0 + 11, w - 6, y1 - y0 - 14);
  markise(ctx, x, y0, w, Math.max(3, Math.round(w / 6)), c1, '#fff', 5);
  const n = items.length;
  for (let i = 0; i < n; i++) emoji(ctx, items[i], x + w * (i + 0.5) / n, y1 - 2, sz);
}
Object.assign(AUSBAU_PROPS, {
  kaufhaus(ctx, { rx, ry, rw, fy }) {
    const R = rx + rw, H = fy - ry;
    const my = ry + Math.round(H * 0.5);
    // Obergeschoss
    const ux0 = rx + 32, uw = (R - 12 - ux0) / 3;
    [['#ff6b8b', ['👗', '👒']], ['#4fb4ff', ['🧸', '🪀']], ['#ffc93c', ['📚', '🖍️']]].forEach(([c, it], i) => laden(ctx, ux0 + i * uw + 1, ry + 18, uw - 2, my - 1, c, it, 9));
    // Geschossdecke mit Glasgeländer
    ctx.fillStyle = '#d8c8b8'; ctx.fillRect(rx + 6, my, rw - 12, 3.5);
    ctx.fillStyle = '#e2b048'; ctx.fillRect(rx + 6, my, rw - 12, 0.9);
    // Untergeschoss
    const ex0 = rx + rw * 0.38, ex1 = rx + rw * 0.64;
    laden(ctx, rx + 12, my + 6, ex0 - rx - 16, fy - 1, '#6bd36b', ['🧃', '🍎'], 10);
    laden(ctx, ex1 + 6, my + 6, R - 12 - ex1 - 6, fy - 1, '#c48bff', ['🎈', '🛼'], 10);
    // Rolltreppe
    ctx.fillStyle = '#5d6670';
    ctx.beginPath(); ctx.moveTo(ex0 - 2, fy); ctx.lineTo(ex0 + 6, fy); ctx.lineTo(ex1 + 2, my + 3.5); ctx.lineTo(ex1 - 6, my + 3.5); ctx.fill();
    strich(ctx, '#2a2e34', 1.6, ex0 + 3, fy - 7, ex1 + 1, my - 3);
    strich(ctx, 'rgba(200,230,255,.5)', 3, ex0 + 3, fy - 4.5, ex1 + 1, my - 0.5);
  },
  einkaufswelt(ctx, { rx, ry, rw, fy, cx }) {
    const R = rx + rw, H = fy - ry;
    const wr = Math.min(H * 0.4, rw * 0.2), wy = fy - wr - 7;
    // Läden links & rechts
    const lw = cx - wr - 8 - (rx + 10);
    laden(ctx, rx + 10, ry + 30, lw, fy - 1, '#ff6b8b', ['👗', '🍭'], 10);
    laden(ctx, cx + wr + 8, ry + 22, R - 10 - (cx + wr + 8), fy - 1, '#4fb4ff', ['🎈', '🧸'], 10);
    // Riesenrad: Gestell & Kranz
    ctx.strokeStyle = '#d8dde4'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(cx - wr * 0.55, fy); ctx.lineTo(cx, wy); ctx.lineTo(cx + wr * 0.55, fy); ctx.stroke();
    ctx.strokeStyle = '#ff7aa8'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(cx, wy, wr, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(cx, wy, wr * 0.86, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#e8eef4'; rr(ctx, cx - 10, fy - 4, 20, 4, 1); ctx.fill();
  },
});

// ----- Flugfeld -----
function rollbahn(ctx, x0, x1, fy) {
  ctx.fillStyle = '#4a4f58'; ctx.fillRect(x0, fy - 3, x1 - x0, 4);
  ctx.fillStyle = '#fff'; for (let x = x0 + 4; x < x1 - 6; x += 9) ctx.fillRect(x, fy - 1.6, 5, 1);
}
Object.assign(AUSBAU_PROPS, {
  flugfeld(ctx, { rx, ry, rw, fy }) {
    const R = rx + rw;
    rollbahn(ctx, rx + 10, R - 10, fy);
    // Hangar
    const hx = rx + 30, hw = Math.min(30, rw * 0.32);
    ctx.fillStyle = '#7d9a8a'; ctx.beginPath(); ctx.ellipse(hx + hw / 2, fy - 3, hw / 2, 18, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 0.8;
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.ellipse(hx + hw / 2, fy - 3, hw / 2 * k / 4, 18, 0, Math.PI, 0); ctx.stroke(); }
    ctx.fillStyle = '#2a2e34'; rr(ctx, hx + hw * 0.25, fy - 13, hw * 0.5, 10, [3, 3, 0, 0]); ctx.fill();
    // Windsack-Mast
    strich(ctx, '#e8eef4', 1.4, R - 20, fy - 3, R - 20, fy - 30);
    // Startbahn-Lichter
    for (let x = rx + 14; x < R - 12; x += 12) kreis(ctx, x, fy - 4, 0.9, '#ffd34d');
  },
  flughafen(ctx, { rx, ry, rw, fy }) {
    const R = rx + rw;
    rollbahn(ctx, rx + 10, R - 10, fy);
    // Terminal
    const tx = rx + 32, tw = Math.min(32, rw * 0.34);
    ctx.fillStyle = '#e8eef4'; rr(ctx, tx, fy - 14, tw, 11, [3, 3, 0, 0]); ctx.fill();
    ctx.fillStyle = '#6fb8ff'; for (let x = tx + 3; x < tx + tw - 4; x += 5) ctx.fillRect(x, fy - 11, 3.5, 4);
    ctx.fillStyle = '#4a7ac8'; ctx.fillRect(tx, fy - 15, tw, 1.6);
    schrift(ctx, 'GATE', tx + tw / 2, fy - 16.5, 4, '#ffd34d');
    // Tower
    const kx = R - 22;
    ctx.fillStyle = '#d8dde4'; ctx.fillRect(kx - 3.5, ry + 22, 7, fy - ry - 25);
    ctx.fillStyle = '#b8c0c8'; ctx.fillRect(kx + 1.5, ry + 22, 2, fy - ry - 25);
    ctx.fillStyle = '#4a525c'; rr(ctx, kx - 9, ry + 13, 18, 10, 2); ctx.fill();
    ctx.fillStyle = '#9fe0ff'; ctx.fillRect(kx - 7.5, ry + 15, 15, 5);
    ctx.fillStyle = '#4a525c'; ctx.fillRect(kx - 10, ry + 12, 20, 2);
    strich(ctx, '#888', 0.8, kx, ry + 12, kx, ry + 7);
    emoji(ctx, '🛩️', rx + 21, fy - 2, 10);
  },
});

// ----- Sport -----
Object.assign(AUSBAU_PROPS, {
  fitnessstudio(ctx, { rx, ry, rw, fy }) {
    const R = rx + rw;
    // Spiegelwand
    const mx = rx + 34, mw = R - 14 - mx, mh = Math.min(22, fy - ry - 26);
    ctx.fillStyle = '#c8d0d8'; ctx.fillRect(mx - 1.5, ry + 9 - 1.5, mw + 3, mh + 3);
    ctx.fillStyle = lin(ctx, mx, ry + 9, mx + mw, ry + 9 + mh, '#cfeaff', '#8fbfe0', '#d8f0ff'); ctx.fillRect(mx, ry + 9, mw, mh);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.2;
    for (let x = mx + 6; x < mx + mw; x += 22) { ctx.beginPath(); ctx.moveTo(x, ry + 9 + mh); ctx.lineTo(x + 8, ry + 9); ctx.stroke(); }
    for (let x = mx + mw / 3; x < mx + mw - 2; x += mw / 3) { ctx.fillStyle = '#c8d0d8'; ctx.fillRect(x, ry + 9, 1, mh); }
    // Laufband
    const tx = rx + 22;
    ctx.fillStyle = '#2a2e34'; rr(ctx, tx, fy - 6, 28, 5, 2); ctx.fill();
    strich(ctx, '#8a949e', 1.6, tx + 26, fy - 5, tx + 30, fy - 20);
    ctx.fillStyle = '#4a525c'; rr(ctx, tx + 26, fy - 24, 9, 5, 1.5); ctx.fill();
    ctx.fillStyle = '#3aff7a'; ctx.fillRect(tx + 28, fy - 23, 5, 2.5);
    strich(ctx, '#8a949e', 1, tx + 4, fy - 6, tx + 4, fy - 14, tx + 28, fy - 16);
    // Hantelständer
    const hx = R - 34;
    ctx.fillStyle = '#4a525c'; ctx.fillRect(hx, fy - 16, 2, 16); ctx.fillRect(hx + 18, fy - 16, 2, 16);
    for (const y of [fy - 14, fy - 7]) {
      ctx.fillStyle = '#4a525c'; ctx.fillRect(hx, y + 2, 20, 1.5);
      for (const x of [hx + 5, hx + 14]) { ctx.fillStyle = '#9aa4ae'; ctx.fillRect(x - 3, y + 0.5, 6, 1); kreis(ctx, x - 3, y + 1, 2.2, '#2a2e34'); kreis(ctx, x + 3, y + 1, 2.2, '#2a2e34'); }
    }
    // Gymnastikball
    kreis(ctx, R - 18, fy - 6, 6, '#ff6b8b'); kreis(ctx, R - 20, fy - 8, 1.8, 'rgba(255,255,255,.45)');
    // Kettlebell
    kreis(ctx, rx + 62, fy - 3.5, 3.5, '#3a7a4a'); ctx.strokeStyle = '#3a7a4a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(rx + 62, fy - 7, 2, Math.PI, 0); ctx.stroke();
  },
  olympiahalle(ctx, { rx, ry, rw, fy, cx }) {
    const R = rx + rw;
    wimpel(ctx, rx + 32, R - 10, ry + 8, 4, ['#e8463c', '#ffd34d', '#2f9a4a', '#3a6ad8', '#fff'], 3);
    // Ringe-Banner
    const bx = cx + 6, by = ry + 21;
    ctx.fillStyle = '#fbfbf6'; rr(ctx, bx - 17, by - 7, 34, 15, 2); ctx.fill();
    [['#3a6ad8', -9, 0], ['#222', 0, 0], ['#e8463c', 9, 0], ['#ffc93a', -4.5, 3.5], ['#2f9a4a', 4.5, 3.5]].forEach(([c, dx, dy]) => {
      ctx.strokeStyle = c; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(bx + dx, by - 1 + dy, 3.6, 0, TAU); ctx.stroke();
    });
    // Siegertreppchen
    const px = cx + 6;
    [[-14, 9, '#c8d0d8', '2'], [0, 14, '#ffd34d', '1'], [14, 6, '#d8915a', '3']].forEach(([dx, h, c, n]) => {
      ctx.fillStyle = c; ctx.fillRect(px + dx - 7, fy - h, 14, h);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(px + dx - 7, fy - h, 14, 1.2);
      schrift(ctx, n, px + dx, fy - h + 6.5, 6, 'rgba(60,40,10,.8)');
    });
    emoji(ctx, '🥇', px, fy - 14, 9);
    // Fackel
    const fx = rx + 30;
    ctx.fillStyle = '#c9a050'; ctx.fillRect(fx - 1.2, fy - 15, 2.4, 15); ctx.fillRect(fx - 4, fy - 1.5, 8, 1.5);
    ctx.fillStyle = '#e2b048'; ctx.beginPath(); ctx.moveTo(fx - 5, fy - 19); ctx.lineTo(fx + 5, fy - 19); ctx.lineTo(fx + 2, fy - 14); ctx.lineTo(fx - 2, fy - 14); ctx.fill();
    // Hallenboden
    ctx.fillStyle = '#d9a35e'; ctx.fillRect(rx + 8, fy, rw - 16, 3); strich(ctx, 'rgba(255,255,255,.6)', 0.8, rx + 8, fy + 1.5, R - 8, fy + 1.5);
  },
});

// ----- Eis -----
function sonnenschirm(ctx, x, fy, h, c1, c2 = '#fff') {
  strich(ctx, '#ddd', 1, x, fy, x, fy - h);
  for (let k = 0; k < 4; k++) {
    ctx.fillStyle = k % 2 ? c2 : c1;
    ctx.beginPath(); ctx.moveTo(x, fy - h - 4); ctx.lineTo(x - 11 + k * 5.5, fy - h + 1); ctx.lineTo(x - 11 + (k + 1) * 5.5, fy - h + 1); ctx.fill();
  }
}
function tischchen(ctx, x, fy, col = '#fff') {
  oval(ctx, x, fy - 9, 6, 1.4, col); strich(ctx, '#bbb', 1, x, fy - 9, x, fy); strich(ctx, '#bbb', 1, x - 3, fy, x + 3, fy);
}
function eisbecher(ctx, x, y, s = 1) {
  ctx.fillStyle = 'rgba(230,245,255,.75)'; ctx.beginPath(); ctx.moveTo(x - 5 * s, y - 5 * s); ctx.lineTo(x + 5 * s, y - 5 * s); ctx.lineTo(x + 1.5 * s, y - 1.5 * s); ctx.lineTo(x - 1.5 * s, y - 1.5 * s); ctx.fill();
  ctx.fillRect(x - 0.6 * s, y - 1.5 * s, 1.2 * s, 1.5 * s); ctx.fillRect(x - 2.5 * s, y - 0.6 * s, 5 * s, 0.8 * s);
  kreis(ctx, x - 2.4 * s, y - 6.5 * s, 2.6 * s, '#ffc0d8'); kreis(ctx, x + 2.4 * s, y - 6.5 * s, 2.6 * s, '#a8e6cf'); kreis(ctx, x, y - 9 * s, 2.8 * s, '#fff2c0');
  kreis(ctx, x + 0.5 * s, y - 12 * s, 1.3 * s, '#e0263f');
}
Object.assign(AUSBAU_PROPS, {
  eiscafe(ctx, { rx, ry, rw, fy }) {
    const R = rx + rw;
    markise(ctx, rx + 32, ry + 8, R - rx - 42, 6, '#ff7aa8', '#fff', 6);
    // Theke hinten rechts
    const tx = rx + rw * 0.55, tw = R - 12 - tx;
    plank(ctx, tx, fy - 13, tw, 13, '#ffc9e3');
    const cols = ['#ffe0f0', '#a8e6cf', '#ffd38a', '#c39bff'];
    for (let i = 0; i < 4; i++) { ctx.fillStyle = cols[i]; rr(ctx, tx + 2 + i * (tw - 4) / 4, fy - 16, (tw - 4) / 4 - 1.5, 5, 2.5); ctx.fill(); }
    // Tische mit Schirmen
    sonnenschirm(ctx, rx + 24, fy, 20, '#59c2a8');
    tischchen(ctx, rx + 24, fy);
    eisbecher(ctx, rx + 24, fy - 10, 0.6);
    if (tx - rx > 50) { sonnenschirm(ctx, rx + 44, fy, 17, '#ff9f43'); tischchen(ctx, rx + 44, fy); emoji(ctx, '🍨', rx + 44, fy - 9.5, 7); }
  },
  eispalast(ctx, { rx, ry, rw, fy, cx, rnd }) {
    const R = rx + rw, H = fy - ry;
    ctx.fillStyle = 'rgba(180,220,255,.16)'; ctx.fillRect(rx, ry, rw, H + 13);
    // Eiskristalle
    const kris = (x, y, h, w, up) => {
      ctx.fillStyle = 'rgba(210,240,255,.75)'; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x, y + (up ? -h : h)); ctx.lineTo(x + w, y); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.moveTo(x - w * 0.2, y); ctx.lineTo(x, y + (up ? -h : h)); ctx.lineTo(x + w * 0.35, y); ctx.fill();
    };
    for (let x = rx + 14; x < R - 10; x += 9) kris(x, ry + 5, 5 + rnd() * 7, 3, false);
    for (const [x, h] of [[rx + 14, 18], [rx + 19, 11], [R - 14, 20], [R - 19, 12]]) kris(x, fy, h, 3.5, true);
    // Eissäulen
    for (const x of [rx + rw * 0.3, R - rw * 0.3]) {
      ctx.fillStyle = 'rgba(200,235,255,.65)'; ctx.fillRect(x - 3, ry + 16, 6, fy - ry - 16);
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x - 2, ry + 16, 1.5, fy - ry - 16);
      raute(ctx, x, ry + 15, 4, '#e8f8ff');
    }
    // Riesen-Eisbecher auf Eis-Sockel
    ctx.fillStyle = 'rgba(220,245,255,.85)'; rr(ctx, cx - 9, fy - 6, 18, 6, 1.5); ctx.fill();
    eisbecher(ctx, cx, fy - 6, Math.min(1.5, H / 34));
    for (let i = 0; i < 10; i++) { const x = rx + 14 + rnd() * (rw - 28), y = ry + 14 + rnd() * (H - 22); strich(ctx, 'rgba(255,255,255,.55)', 0.6, x - 2, y, x + 2, y); strich(ctx, 'rgba(255,255,255,.55)', 0.6, x, y - 2, x, y + 2); }
  },
});

// ----- Schuhe -----
function schuh(ctx, x, y, col, s = 1) {
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x - 4 * s, y); ctx.lineTo(x - 4 * s, y - 4 * s); ctx.lineTo(x - 1 * s, y - 4 * s); ctx.quadraticCurveTo(x + 1 * s, y - 2 * s, x + 4.5 * s, y - 1.6 * s); ctx.lineTo(x + 4.5 * s, y); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(x - 4.3 * s, y - 0.9 * s, 9 * s, 1.1 * s);
  ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(x - 2.5 * s, y - 3.2 * s, 2.5 * s, 0.6 * s);
}
Object.assign(AUSBAU_PROPS, {
  schuhwerkstatt(ctx, { rx, ry, rw, fy }) {
    const R = rx + rw;
    // Regale mit Stiefeln
    const sx = rx + rw * 0.5, sw = R - 12 - sx;
    for (const y of [ry + 22, ry + 36]) {
      if (y > fy - 10) continue;
      plank(ctx, sx, y, sw, 3, '#9a6a3c');
      for (let x = sx + 7; x < sx + sw - 3; x += 11) emoji(ctx, '🥾', x, y, 9);
    }
    // Schusterbank mit Leisten
    const bx = rx + 22;
    plank(ctx, bx, fy - 9, 26, 4, '#8a5530');
    ctx.fillStyle = '#6b3f22'; ctx.fillRect(bx + 2, fy - 5, 2, 5); ctx.fillRect(bx + 22, fy - 5, 2, 5);
    ctx.fillStyle = '#5d6670'; ctx.fillRect(bx + 8, fy - 15, 2.5, 6);
    ctx.fillStyle = '#7a828c'; ctx.beginPath(); ctx.moveTo(bx + 3, fy - 15); ctx.lineTo(bx + 15, fy - 15); ctx.quadraticCurveTo(bx + 16, fy - 19, bx + 11, fy - 19); ctx.lineTo(bx + 4, fy - 18); ctx.fill();
    hammer(ctx, bx + 20, fy - 18);
    // Lederrollen & Garn
    for (const [x, c] of [[rx + 16, '#8a4a20'], [rx + 22, '#b5622e']]) { ctx.fillStyle = c; rr(ctx, x - 3, fy - 32, 6, 12, 3); ctx.fill(); oval(ctx, x, fy - 32, 3, 1.2, shade(c, 0.2)); }
    kreis(ctx, rx + 52, fy - 3, 3, '#e8463c'); ctx.fillStyle = '#c99252'; ctx.fillRect(rx + 49, fy - 1, 6, 1);
  },
  turnschuhfabrik(ctx, { rx, ry, rw, fy }) {
    const R = rx + rw;
    // Rohre & Warnstreifen
    ctx.fillStyle = '#8a949e'; ctx.fillRect(rx + 30, ry + 10, R - rx - 40, 3);
    for (let x = rx + 12; x < R - 12; x += 6) { ctx.fillStyle = (x / 6 | 0) % 2 ? '#ffd23f' : '#2a2e34'; ctx.fillRect(x, fy - 1, 6, 1.5); }
    // Maschine mit Zahnrädern
    const mx = rx + 14;
    ctx.fillStyle = '#4f7fb0'; rr(ctx, mx, fy - 28, 20, 20, 2); ctx.fill();
    ctx.fillStyle = '#2a4a70'; ctx.fillRect(mx + 3, fy - 25, 14, 6);
    kreis(ctx, mx + 6, fy - 13, 1.6, '#3aff7a'); kreis(ctx, mx + 11, fy - 13, 1.6, '#ff5a5a');
    ctx.fillStyle = '#5d6670'; ctx.fillRect(mx + 20, fy - 20, 6, 4);
    // Fließband
    ctx.fillStyle = '#3a4048'; rr(ctx, mx + 18, fy - 10, R - 12 - mx - 18, 4, 2); ctx.fill();
    for (let x = mx + 22; x < R - 14; x += 7) kreis(ctx, x, fy - 4, 1.6, '#8a949e');
    // Kartons
    for (const [x, y] of [[R - 24, fy - 20], [R - 18, fy - 27]]) { ctx.fillStyle = '#ff9f43'; ctx.fillRect(x, y, 11, 7); ctx.fillStyle = '#fff'; ctx.fillRect(x + 2, y + 2.5, 7, 1.6); }
  },
});

// ----- Pflege -----
Object.assign(AUSBAU_PROPS, {
  fuehlerspa(ctx, { rx, ry, rw, fy }) {
    const R = rx + rw;
    // Kacheln
    ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 0.7;
    for (let y = ry + 26; y < fy; y += 6) { ctx.beginPath(); ctx.moveTo(rx, y); ctx.lineTo(R, y); ctx.stroke(); }
    // Handtuch-Regal
    plank(ctx, rx + rw * 0.55, ry + 22, R - 12 - rx - rw * 0.55, 2.5, '#c58b52');
    for (let x = rx + rw * 0.55 + 5, i = 0; x < R - 14; x += 7, i++) { kreis(ctx, x, ry + 18.5, 3.2, i % 2 ? '#fff' : '#ffc0d8'); kreis(ctx, x, ry + 18.5, 1.2, 'rgba(0,0,0,.1)'); }
    // Holzbottich
    const bx = rx + 30;
    ctx.fillStyle = '#a8743f'; rr(ctx, bx - 14, fy - 14, 28, 14, [2, 2, 5, 5]); ctx.fill();
    ctx.fillStyle = '#6b4326'; ctx.fillRect(bx - 14, fy - 11, 28, 1.4); ctx.fillRect(bx - 14, fy - 4, 28, 1.4);
    ctx.strokeStyle = 'rgba(60,35,15,.35)'; ctx.lineWidth = 0.7; for (let x = bx - 10; x < bx + 14; x += 4.5) { ctx.beginPath(); ctx.moveTo(x, fy - 14); ctx.lineTo(x, fy); ctx.stroke(); }
    oval(ctx, bx, fy - 14, 14, 2.5, '#8fd8f0');
    // Massageliege
    const lx = R - 34;
    ctx.fillStyle = '#c8d0d8'; ctx.fillRect(lx + 2, fy - 7, 1.5, 7); ctx.fillRect(lx + 19, fy - 7, 1.5, 7);
    ctx.fillStyle = '#f4ead8'; rr(ctx, lx, fy - 10, 22, 4, 2); ctx.fill();
    ctx.fillStyle = '#ff9ec0'; rr(ctx, lx + 7, fy - 11, 12, 3, 1.5); ctx.fill();
    kerze(ctx, R - 15, fy, 5); kerze(ctx, R - 11, fy, 4);
  },
  wellnessoase(ctx, { rx, ry, rw, fy, cx, rnd }) {
    const R = rx + rw;
    // Lampions
    for (const [x, c] of [[rx + rw * 0.45, '#ff9ec0'], [rx + rw * 0.65, '#ffd36b'], [rx + rw * 0.85, '#9ed8ff']]) {
      strich(ctx, 'rgba(255,255,255,.4)', 0.6, x, ry + 5, x, ry + 12);
      oval(ctx, x, ry + 15, 3.5, 4, c); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x - 2, ry + 11, 4, 1); ctx.fillRect(x - 2, ry + 18.5, 4, 1);
    }
    // Blütenbad
    const bx = rx + rw * 0.42;
    oval(ctx, bx, fy - 4, 20, 6, '#c8bcae');
    oval(ctx, bx, fy - 5, 17, 4, '#ff9ec0');
    oval(ctx, bx, fy - 5.5, 14, 2.5, '#ffc0d8');
    for (let i = 0; i < 9; i++) oval(ctx, bx - 13 + rnd() * 26, fy - 6 + rnd() * 2.5, 1.6, 1, ['#fff', '#ff5a8a', '#ffd34d'][i % 3], rnd() * 3);
    // Moos-Liege
    const lx = R - 26;
    ctx.fillStyle = '#5f9a3e'; ctx.beginPath(); ctx.moveTo(lx - 8, fy - 3); ctx.lineTo(lx + 6, fy - 3); ctx.lineTo(lx + 11, fy - 14); ctx.lineTo(lx + 7, fy - 15); ctx.lineTo(lx + 3, fy - 8); ctx.lineTo(lx - 8, fy - 8); ctx.fill();
    ctx.fillStyle = '#86c457'; ctx.fillRect(lx - 8, fy - 8, 11, 1.6);
    ctx.fillStyle = '#7a5230'; ctx.fillRect(lx - 7, fy - 3, 1.5, 3); ctx.fillRect(lx + 4, fy - 3, 1.5, 3);
    // Pflanzen & Kiesel
    pflanze(ctx, rx + 16, fy, 1, '#8aa0a8');
    for (let i = 0; i < 8; i++) oval(ctx, rx + 14 + rnd() * (rw - 28), fy + 1.5, 1.6, 1, '#d8d0c4');
  },
});

// ----- Wache -----
function burgTuerme(rx, rw) { return [rx + 34, rx + rw - 18]; }
Object.assign(AUSBAU_PROPS, {
  waechterakademie(ctx, { rx, ry, rw, fy, cx }) {
    const R = rx + rw;
    banner(ctx, rx + rw * 0.66, ry + 9, 12, 18, '#3a5ab0', '🎖️');
    // Speer-Ständer
    ctx.strokeStyle = '#4a7a3a'; ctx.lineWidth = 1.4;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(rx + 14 + k * 3, fy); ctx.lineTo(rx + 14 + k * 3, ry + 30); ctx.stroke(); raute(ctx, rx + 14 + k * 3, ry + 29, 2, '#9ad86a'); }
    ctx.fillStyle = '#8a5a30'; ctx.fillRect(rx + 11, fy - 10, 11, 2);
    // Trainingspuppe
    const px = rx + rw * 0.4;
    ctx.fillStyle = '#8a5a30'; ctx.fillRect(px - 1, fy - 22, 2, 22); ctx.fillRect(px - 5, fy - 1.5, 10, 1.5);
    ctx.fillStyle = '#e0c070'; rr(ctx, px - 5, fy - 20, 10, 12, 4); ctx.fill(); kreis(ctx, px, fy - 23.5, 4, '#e8cc80');
    ctx.fillRect(px - 10, fy - 18, 20, 2.5);
    strich(ctx, 'rgba(140,100,30,.6)', 0.6, px - 3, fy - 15, px + 3, fy - 15); strich(ctx, 'rgba(140,100,30,.6)', 0.6, px - 3, fy - 12, px + 3, fy - 12);
    // Zielscheibe
    const zx = R - 22, zy = fy - 15;
    strich(ctx, '#8a5a30', 1.5, zx - 5, fy, zx, zy, zx + 5, fy);
    for (const [r, c] of [[8, '#fff'], [6, '#e8463c'], [4, '#fff'], [2, '#e8463c']]) kreis(ctx, zx, zy, r, c);
    // Matte
    ctx.fillStyle = '#3a7ac8'; rr(ctx, rx + 28, fy - 2, rw * 0.35, 3, 1); ctx.fill();
  },
  schutzburg(ctx, { rx, ry, rw, fy, cx }) {
    const R = rx + rw, H = fy - ry;
    const wy = fy - Math.min(22, H * 0.45);
    const stein = '#9a9aa8';
    // Mauer mit Zinnen
    ctx.fillStyle = stein; ctx.fillRect(rx + 10, wy, rw - 20, fy - wy);
    for (let x = rx + 10; x < R - 10; x += 8) ctx.fillRect(x, wy - 4, 5, 4);
    ctx.strokeStyle = 'rgba(60,60,80,.35)'; ctx.lineWidth = 0.7;
    for (let y = wy + 4, r = 0; y < fy; y += 4, r++) { ctx.beginPath(); ctx.moveTo(rx + 10, y); ctx.lineTo(R - 10, y); ctx.stroke(); for (let x = rx + 10 + (r % 2) * 4; x < R - 10; x += 8) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 4); ctx.stroke(); } }
    // Türme
    for (const x of burgTuerme(rx, rw)) {
      const ty = ry + 18;
      ctx.fillStyle = '#8a8a98'; ctx.fillRect(x - 6, ty, 12, fy - ty);
      ctx.fillStyle = '#2a2030'; rr(ctx, x - 1.5, ty + 6, 3, 5, [1.5, 1.5, 0, 0]); ctx.fill();
      ctx.fillStyle = '#c03a3a'; ctx.beginPath(); ctx.moveTo(x - 8, ty); ctx.lineTo(x + 8, ty); ctx.lineTo(x, ty - 11); ctx.fill();
      strich(ctx, '#ddd', 0.8, x, ty - 11, x, ty - 15);
    }
    // Tor
    const gx = cx + 4;
    ctx.fillStyle = '#3a2412'; rr(ctx, gx - 6, fy - 13, 12, 13, [6, 6, 0, 0]); ctx.fill();
    ctx.strokeStyle = '#5d5d66'; ctx.lineWidth = 0.8; for (let x = gx - 4; x <= gx + 4; x += 2.7) { ctx.beginPath(); ctx.moveTo(x, fy - 12); ctx.lineTo(x, fy); ctx.stroke(); }
    // Feuerschale
    const fx = cx + 17;
    ctx.fillStyle = '#4a4a52'; ctx.beginPath(); ctx.moveTo(fx - 5, wy - 4); ctx.lineTo(fx + 5, wy - 4); ctx.lineTo(fx + 2, wy); ctx.lineTo(fx - 2, wy); ctx.fill();
  },
});

// ----- Späher -----
Object.assign(AUSBAU_PROPS, {
  aussichtsturm(ctx, { rx, ry, rw, fy }) {
    const top = ry + 26, cx = rx + rw / 2 + 7;
    // Wolken an der Wand
    wolke(ctx, rx + 14, ry + 34, 0.8, 'rgba(255,255,255,.22)');
    ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 11, fy); ctx.lineTo(cx - 6, top); ctx.moveTo(cx + 11, fy); ctx.lineTo(cx + 6, top); ctx.stroke();
    ctx.lineWidth = 1;
    for (let k = 0; k < 2; k++) {
      const y0 = top + (fy - top) * k / 2, y1 = top + (fy - top) * (k + 1) / 2;
      const w0 = 6 + 5 * k / 2, w1 = 6 + 5 * (k + 1) / 2;
      ctx.beginPath(); ctx.moveTo(cx - w0, y0); ctx.lineTo(cx + w1, y1); ctx.moveTo(cx + w0, y0); ctx.lineTo(cx - w1, y1); ctx.stroke();
    }
    plank(ctx, cx - 10, top - 2, 20, 3, '#a8743f');
    strich(ctx, '#a8743f', 1, cx - 9, top - 2, cx - 9, top - 7, cx + 9, top - 7, cx + 9, top - 2);
    ctx.fillStyle = '#c03a3a'; ctx.beginPath(); ctx.moveTo(cx - 11, top - 7); ctx.lineTo(cx + 11, top - 7); ctx.lineTo(cx, top - 14); ctx.fill();
    strich(ctx, '#ddd', 0.8, cx, top - 14, cx, top - 18);
    // Leiter
    ctx.strokeStyle = '#c99252'; ctx.lineWidth = 0.8;
    for (let y = top + 4; y < fy; y += 4) { ctx.beginPath(); ctx.moveTo(cx - 2, y); ctx.lineTo(cx + 2, y); ctx.stroke(); }
  },
  sternwarte(ctx, { rx, ry, rw, fy, cx, rnd }) {
    const R = rx + rw, H = fy - ry;
    // Sternenhimmel an der Wand
    ctx.fillStyle = 'rgba(20,24,70,.55)'; ctx.fillRect(rx, ry, rw, H);
    for (let i = 0; i < 14; i++) kreis(ctx, rx + 8 + rnd() * (rw - 16), ry + 6 + rnd() * (H * 0.55), 0.5 + rnd() * 0.6, 'rgba(255,255,230,.8)');
    kreis(ctx, R - 18, ry + 16, 4, '#fff6c8'); kreis(ctx, R - 16.5, ry + 15, 3.6, 'rgb(40,40,80)');
    // Fernrohr
    ctx.save(); ctx.translate(cx + 2, fy - 13); ctx.rotate(-0.75);
    ctx.fillStyle = '#c9a050'; rr(ctx, 0, -3, 22, 6, 2); ctx.fill();
    ctx.fillStyle = '#e2c070'; ctx.fillRect(18, -3.5, 4, 7);
    ctx.fillStyle = '#9fe0ff'; ctx.fillRect(21.5, -2.5, 1, 5);
    ctx.restore();
    // Kuppel
    const kr = Math.min(17, rw * 0.3);
    ctx.fillStyle = lin(ctx, cx - kr, 0, cx + kr, 0, '#8a94a8', '#e8eef8', '#9aa4b8'); ctx.beginPath(); ctx.arc(cx, fy - 2, kr, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#1a1a3a'; ctx.beginPath(); ctx.moveTo(cx - 2, fy - 2 - kr); ctx.lineTo(cx + 3, fy - 2 - kr); ctx.lineTo(cx + 3, fy - 8); ctx.lineTo(cx - 2, fy - 8); ctx.fill();
    ctx.fillStyle = '#c8d0e0'; ctx.fillRect(cx - kr - 1, fy - 3, kr * 2 + 2, 3);
  },
});

// ----- Labor -----
function mikroskop(ctx, x, fy, s = 1) {
  ctx.fillStyle = '#2a2e34'; rr(ctx, x - 5 * s, fy - 2 * s, 10 * s, 2 * s, 1); ctx.fill();
  ctx.strokeStyle = '#2a2e34'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(x + 2 * s, fy - 8 * s, 6 * s, Math.PI * 0.5, Math.PI * 1.4); ctx.stroke();
  ctx.save(); ctx.translate(x - 1 * s, fy - 12 * s); ctx.rotate(-0.4); ctx.fillStyle = '#e8eef4'; ctx.fillRect(-1.6 * s, -6 * s, 3.2 * s, 10 * s); ctx.restore();
  ctx.fillStyle = '#5d6670'; ctx.fillRect(x - 4 * s, fy - 6 * s, 7 * s, 1.2 * s);
}
function kolben(ctx, x, y, col, s = 1) {
  ctx.fillStyle = 'rgba(220,240,255,.8)'; ctx.beginPath(); ctx.moveTo(x - 1.5 * s, y - 10 * s); ctx.lineTo(x + 1.5 * s, y - 10 * s); ctx.lineTo(x + 1.5 * s, y - 6 * s); ctx.lineTo(x + 5 * s, y); ctx.lineTo(x - 5 * s, y); ctx.lineTo(x - 1.5 * s, y - 6 * s); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 3.2 * s, y - 3 * s); ctx.lineTo(x + 3.2 * s, y - 3 * s); ctx.lineTo(x + 5 * s, y); ctx.lineTo(x - 5 * s, y); ctx.fill();
}
export function laborBank(rx, ry, rw, rh) { const fy = ry + rh - 13; return { by: fy - 16, fy }; }
Object.assign(AUSBAU_PROPS, {
  forschungszentrum(ctx, { rx, ry, rw, rh, fy }) {
    const R = rx + rw, H = fy - ry;
    // Periodensystem
    const px = rx + 34, py = ry + 10, cols = ['#ff8a8a', '#ffd36b', '#8ad8ff', '#a8e88a', '#d8a8ff'];
    const pc = Math.min(12, Math.floor((rw - 70) / 4.5));
    for (let r = 0; r < 4; r++) for (let c = 0; c < pc; c++) { if (r === 0 && c > 0 && c < pc - 1) continue; ctx.fillStyle = cols[(c + r) % 5]; ctx.fillRect(px + c * 4.5, py + r * 4.5, 3.8, 3.8); }
    // Regal mit Flaschen
    if (H > 50) {
      const sx = R - 34;
      plank(ctx, sx, ry + 26, 22, 2.5, '#e8eef4');
      for (let k = 0; k < 4; k++) { ctx.fillStyle = ['#5fd068', '#ff6b9b', '#4fa3ff', '#ffd23f'][k]; rr(ctx, sx + 2 + k * 5, ry + 19, 3.5, 7, 1); ctx.fill(); }
    }
    // Labortisch
    plank(ctx, rx + 10, fy - 16, rw - 20, 4, '#e8eef4');
    ctx.fillStyle = '#c8d4dc'; ctx.fillRect(rx + 12, fy - 12, rw - 24, 12);
    for (let x = rx + 14; x < R - 20; x += 16) { ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 0.8; ctx.strokeRect(x, fy - 10, 13, 8); kreis(ctx, x + 6.5, fy - 6, 0.9, '#8a949e'); }
    const by = fy - 16;
    mikroskop(ctx, rx + 22, by); mikroskop(ctx, rx + rw * 0.48, by, 0.9);
    kolben(ctx, rx + 36, by, '#5fd068'); kolben(ctx, rx + 44, by, '#ff6b9b', 0.8);
    // Reagenzglas-Ständer
    ctx.fillStyle = '#a8743f'; ctx.fillRect(rx + rw * 0.56, by - 3, 16, 3);
    for (let k = 0; k < 4; k++) { ctx.fillStyle = 'rgba(220,240,255,.8)'; rr(ctx, rx + rw * 0.56 + 1.5 + k * 3.8, by - 10, 2.4, 9, 1.2); ctx.fill(); ctx.fillStyle = ['#4fa3ff', '#ffd23f', '#5fd068', '#b07cff'][k]; ctx.fillRect(rx + rw * 0.56 + 1.5 + k * 3.8, by - 5, 2.4, 3); }
    // Bildschirm mit Diagramm
    const mx = R - 30;
    ctx.fillStyle = '#2a2e34'; rr(ctx, mx, by - 17, 20, 13, 1.5); ctx.fill(); ctx.fillRect(mx + 9, by - 4, 2, 4);
    ctx.fillStyle = '#0d2236'; ctx.fillRect(mx + 1.5, by - 15.5, 17, 10);
    [3, 6, 4, 8].forEach((h, k) => { ctx.fillStyle = ['#5fd068', '#ffd23f', '#4fa3ff', '#ff6b9b'][k]; ctx.fillRect(mx + 3 + k * 4, by - 6.5 - h, 2.6, h); });
    // Bunsenbrenner
    ctx.fillStyle = '#5d6670'; ctx.fillRect(rx + rw * 0.4 - 1.2, by - 7, 2.4, 7); ctx.fillRect(rx + rw * 0.4 - 3, by - 1.5, 6, 1.5);
  },
  zukunftslabor(ctx, { rx, ry, rw, rh, fy, cx }) {
    const R = rx + rw, H = fy - ry;
    ctx.fillStyle = 'rgba(160,220,255,.1)'; ctx.fillRect(rx, ry, rw, H);
    ctx.strokeStyle = 'rgba(160,230,255,.14)'; ctx.lineWidth = 0.8;
    for (let x = rx + 10; x < R; x += 18) { ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x, fy); ctx.stroke(); }
    // Konsole mit Bildschirmen
    const kx = rx + 34, kw = Math.min(46, rw * 0.38);
    ctx.fillStyle = '#e8eef4'; rr(ctx, kx, fy - 14, kw, 14, [3, 3, 0, 0]); ctx.fill();
    ctx.fillStyle = '#2a3a4a'; rr(ctx, kx + 2, ry + 12, kw - 4, Math.min(22, H - 34), 2); ctx.fill();
    ctx.fillStyle = '#0d2236'; ctx.fillRect(kx + 4, ry + 14, kw - 8, Math.min(22, H - 34) - 4);
    ctx.strokeStyle = '#5ff0ff'; ctx.lineWidth = 0.8; ctx.beginPath();
    for (let x = 0; x < kw - 10; x += 2) ctx.lineTo(kx + 5 + x, ry + 14 + (Math.min(22, H - 34) - 4) * (0.5 + Math.sin(x * 0.4) * 0.3));
    ctx.stroke();
    // Holo-Projektor
    const hx = rx + rw * 0.68;
    ctx.fillStyle = '#c8d4dc'; oval(ctx, hx, fy - 2, 10, 3, '#c8d4dc'); oval(ctx, hx, fy - 3, 7, 1.8, '#5ff0ff');
    // Roboterarm
    ctx.strokeStyle = '#9aa4ae'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(kx + kw - 6, fy - 14); ctx.lineTo(kx + kw - 2, fy - 24); ctx.lineTo(kx + kw + 6, fy - 20); ctx.stroke(); ctx.lineCap = 'butt';
    kreis(ctx, kx + kw - 2, fy - 24, 2, '#ff9f43');
    // Roboter-Ameise
    const ax = R - 18, ay = fy - 6;
    strich(ctx, '#5d6670', 1, ax - 6, ay + 1, ax - 9, fy, ax - 1, ay + 1, ax - 2, fy, ax + 4, ay + 1, ax + 6, fy);
    kreis(ctx, ax - 6, ay - 2, 4.5, '#b8c4d0'); kreis(ctx, ax, ay - 2, 2.5, '#9aa4ae'); kreis(ctx, ax + 5, ay - 4, 3.5, '#c8d4dc');
    kreis(ctx, ax + 6.5, ay - 4.5, 1, '#5ff0ff');
    strich(ctx, '#5d6670', 0.8, ax + 6, ay - 7, ax + 8, ay - 12);
  },
});

// ----- Theater -----
Object.assign(AUSBAU_PROPS, {
  schauspielhaus(ctx, { rx, ry, rw, fy, cx }) {
    const R = rx + rw;
    const sy = fy - 22;
    // Bühne mit Drehscheibe
    plank(ctx, rx + 10, sy, rw - 20, 7, '#8a5a30');
    oval(ctx, cx, sy + 1, rw * 0.28, 3, '#b5823f');
    ctx.strokeStyle = 'rgba(255,230,180,.5)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.ellipse(cx, sy + 1, rw * 0.28, 3, 0, 0, TAU); ctx.stroke();
    // Fußrampenlichter
    for (let x = rx + 16; x < R - 14; x += 9) kreis(ctx, x, sy + 6, 1.1, '#ffe9a8');
    // Vorhänge
    for (const d of [-1, 1]) {
      const x0 = d < 0 ? rx + 8 : R - 8;
      ctx.fillStyle = '#b8233a';
      ctx.beginPath(); ctx.moveTo(x0, ry + 8); ctx.lineTo(x0 - d * 22, ry + 8); ctx.quadraticCurveTo(x0 - d * 12, ry + 28, x0 - d * 18, sy); ctx.lineTo(x0, sy); ctx.fill();
      kreis(ctx, x0 - d * 13, ry + 30, 2, '#f2c94c');
    }
    ctx.fillStyle = '#9a1830'; for (let x = rx + 8; x < R - 8; x += 10) { ctx.beginPath(); ctx.moveTo(x, ry + 8); ctx.quadraticCurveTo(x + 5, ry + 15, x + 10, ry + 8); ctx.fill(); }
    ctx.fillStyle = '#f2c94c'; ctx.fillRect(rx + 8, ry + 6.5, rw - 16, 2);
    sitzreihe(ctx, rx + 16, R - 14, fy, '#7a1f2e', 9, 9, 2);
    sitzreihe(ctx, rx + 21, R - 18, fy - 9, '#9a2a3e', 9, 6, 2);
  },
  opernhaus(ctx, { rx, ry, rw, fy, cx }) {
    const R = rx + rw, H = fy - ry;
    // Goldener Bühnenrahmen
    const bx0 = rx + rw * 0.28, bx1 = R - rw * 0.28, by = ry + 14;
    ctx.fillStyle = '#e2b048'; rr(ctx, bx0 - 3, by - 3, bx1 - bx0 + 6, fy - 16 - by + 3, [12, 12, 0, 0]); ctx.fill();
    ctx.fillStyle = '#b8233a'; rr(ctx, bx0, by, bx1 - bx0, fy - 16 - by, [10, 10, 0, 0]); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1; for (let x = bx0 + 4; x < bx1; x += 5) { ctx.beginPath(); ctx.moveTo(x, by + 3); ctx.lineTo(x, fy - 16); ctx.stroke(); }
    ctx.fillStyle = '#7a1525'; ctx.fillRect((bx0 + bx1) / 2 - 0.6, by, 1.2, fy - 16 - by);
    // Logen links & rechts (zwei Ränge)
    for (const d of [-1, 1]) {
      const x0 = d < 0 ? rx + 10 : bx1 + 6, w = (d < 0 ? bx0 - 6 : R - 10) - x0;
      for (let k = 0; k < 2; k++) {
        const y = ry + 26 + k * Math.min(20, H * 0.28);
        ctx.fillStyle = 'rgba(30,10,10,.55)'; rr(ctx, x0, y - 10, w, 10, [5, 5, 0, 0]); ctx.fill();
        for (let j = 0; j < 3; j++) kreis(ctx, x0 + w * (j + 0.5) / 3, y - 3, 1.6, ['#ffd0a0', '#8a5a30', '#ffd0a0'][j]);
        ctx.fillStyle = '#e2b048'; rr(ctx, x0 - 1, y - 2, w + 2, 4, [1, 1, 3, 3]); ctx.fill();
        ctx.fillStyle = '#b8233a'; ctx.fillRect(x0 + 1, y - 0.8, w - 2, 1.4);
      }
    }
    // Orchestergraben
    ctx.fillStyle = '#2a1a14'; ctx.fillRect(bx0 - 6, fy - 14, bx1 - bx0 + 12, 14);
    ctx.fillStyle = '#e2b048'; ctx.fillRect(bx0 - 6, fy - 15, bx1 - bx0 + 12, 1.5);
    for (let x = bx0; x < bx1; x += 7) kreis(ctx, x, fy - 9, 1.6, '#c9893f');
    sitzreihe(ctx, rx + 12, bx0 - 8, fy, '#9a1830', 7, 7, 1.5);
    sitzreihe(ctx, bx1 + 8, R - 10, fy, '#9a1830', 7, 7, 1.5);
    kronleuchter(ctx, cx, ry + 10, 1.2);
  },
});

// ----- Musik -----
function fluegel(ctx, x, fy, s = 1) {
  ctx.fillStyle = '#16100c';
  ctx.beginPath(); ctx.moveTo(x, fy - 13 * s); ctx.lineTo(x + 18 * s, fy - 13 * s); ctx.quadraticCurveTo(x + 32 * s, fy - 13 * s, x + 32 * s, fy - 9 * s);
  ctx.lineTo(x + 32 * s, fy - 7 * s); ctx.lineTo(x, fy - 7 * s); ctx.fill();
  // Deckel
  ctx.beginPath(); ctx.moveTo(x + 2 * s, fy - 13 * s); ctx.lineTo(x + 28 * s, fy - 26 * s); ctx.lineTo(x + 31 * s, fy - 24 * s); ctx.lineTo(x + 20 * s, fy - 13 * s); ctx.fill();
  strich(ctx, '#3a2a20', 0.8 * s, x + 20 * s, fy - 13 * s, x + 24 * s, fy - 21 * s);
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x + 4 * s, fy - 12 * s, 24 * s, 0.8 * s);
  ctx.fillStyle = '#fff'; ctx.fillRect(x - 3 * s, fy - 10 * s, 5 * s, 2 * s);
  ctx.fillStyle = '#16100c'; ctx.fillRect(x + 2 * s, fy - 7 * s, 1.6 * s, 7 * s); ctx.fillRect(x + 28 * s, fy - 7 * s, 1.6 * s, 7 * s); ctx.fillRect(x + 14 * s, fy - 7 * s, 1.6 * s, 7 * s);
  ctx.fillStyle = '#e2b048'; ctx.fillRect(x, fy - 7.5 * s, 32 * s, 0.6 * s);
}
function harfe(ctx, x, fy, h) {
  ctx.strokeStyle = '#e2b048'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x, fy); ctx.lineTo(x, fy - h); ctx.quadraticCurveTo(x + h * 0.45, fy - h * 0.9, x + h * 0.55, fy - h * 0.55); ctx.lineTo(x + 3, fy - 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,240,.6)'; ctx.lineWidth = 0.4;
  for (let k = 1; k < 6; k++) { const t = k / 6; ctx.beginPath(); ctx.moveTo(x + 0.5, fy - h * (1 - t) - 2); ctx.lineTo(x + 0.5 + h * 0.5 * (1 - t * 0.9), fy - h * (0.62 - t * 0.6)); ctx.stroke(); }
}
function pauke(ctx, x, fy, r = 6) {
  ctx.fillStyle = '#c87a3a'; ctx.beginPath(); ctx.ellipse(x, fy - 7, r, r * 0.9, 0, 0, Math.PI); ctx.fill();
  oval(ctx, x, fy - 7, r, 1.6, '#f4ead8');
  strich(ctx, '#5d6670', 0.8, x - r * 0.6, fy - 3, x - r * 0.7, fy); strich(ctx, '#5d6670', 0.8, x + r * 0.6, fy - 3, x + r * 0.7, fy);
}
function orgelpfeifen(ctx, x0, x1, base, hmax) {
  const n = Math.max(5, Math.floor((x1 - x0) / 4));
  for (let i = 0; i < n; i++) {
    const t = Math.abs(i - (n - 1) / 2) / ((n - 1) / 2), h = hmax * (1 - t * 0.55);
    const x = x0 + i * (x1 - x0) / n;
    ctx.fillStyle = lin(ctx, x, 0, x + 3, 0, '#f6d77a', '#c9952a'); ctx.fillRect(x, base - h, 3, h);
    ctx.fillStyle = '#2a1a0a'; ctx.fillRect(x + 0.6, base - h * 0.25, 1.8, 1.2);
  }
}
Object.assign(AUSBAU_PROPS, {
  konzertsaal(ctx, { rx, ry, rw, fy }) {
    const R = rx + rw;
    // Vorhang-Hintergrund
    for (let x = rx + 32; x < R - 8; x += 6) { ctx.fillStyle = (x / 6 | 0) % 2 ? '#7a1f3e' : '#8f2a4a'; ctx.fillRect(x, ry + 8, 6, fy - ry - 12); }
    ctx.fillStyle = '#e2b048'; ctx.fillRect(rx + 32, ry + 8, R - rx - 40, 1.5);
    // Bühne
    plank(ctx, rx + 10, fy - 4, rw - 20, 4, '#b5823f');
    fluegel(ctx, rx + 24, fy - 4, Math.min(1.1, rw / 90));
    ctx.fillStyle = '#2a1a14'; rr(ctx, rx + 15, fy - 10, 8, 3, 1); ctx.fill(); ctx.fillRect(rx + 16, fy - 7, 1.4, 3); ctx.fillRect(rx + 20.5, fy - 7, 1.4, 3);
    // Notenständer
    const nx = R - 18;
    strich(ctx, '#2a2e34', 1, nx, fy - 4, nx, fy - 20); strich(ctx, '#2a2e34', 1, nx - 4, fy - 4, nx + 4, fy - 4);
    ctx.fillStyle = '#fbfbf6'; ctx.fillRect(nx - 6, fy - 27, 12, 8);
    ctx.fillStyle = '#333'; for (let k = 0; k < 3; k++) ctx.fillRect(nx - 5, fy - 25.5 + k * 2.2, 10, 0.4);
  },
  philharmonie(ctx, { rx, ry, rw, fy, cx }) {
    const R = rx + rw;
    orgelpfeifen(ctx, rx + 34, R - 12, fy - 14, Math.min(34, fy - ry - 20));
    // Podest-Stufen
    plank(ctx, rx + 10, fy - 7, rw - 20, 3, '#a8743f');
    plank(ctx, rx + 14, fy - 14, rw - 28, 3, '#b5823f');
    // Instrumente
    harfe(ctx, rx + 20, fy - 7, 18);
    emoji(ctx, '🎻', rx + rw * 0.42, fy - 13.5, 9);
    emoji(ctx, '🎺', rx + rw * 0.6, fy - 13.5, 9);
    pauke(ctx, R - 22, fy - 1, 6);
    // Dirigentenpult
    ctx.fillStyle = '#6b3f22'; rr(ctx, cx - 4, fy - 5, 8, 5, 1); ctx.fill();
    ctx.fillStyle = '#c42c4a'; ctx.fillRect(cx - 4, fy - 5, 8, 1);
  },
});

// ----- Bank -----
function muenzstapel(ctx, x, fy, n) { for (let k = 0; k < n; k++) { oval(ctx, x, fy - 1.2 - k * 1.8, 4, 1.4, k % 2 ? '#ffd34d' : '#f2c030'); } ctx.strokeStyle = 'rgba(150,100,0,.5)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.ellipse(x, fy - 1.2 - (n - 1) * 1.8, 4, 1.4, 0, 0, TAU); ctx.stroke(); }
function truhe(ctx, x, fy, w = 22) {
  const h = w * 0.5;
  // Deckel offen
  ctx.fillStyle = '#7a3a1a'; rr(ctx, x - w / 2, fy - h - w * 0.45, w, w * 0.45, [w * 0.2, w * 0.2, 0, 0]); ctx.fill();
  ctx.fillStyle = '#e2b048'; ctx.fillRect(x - w / 2, fy - h - 2, w, 1.4);
  // Gold-Haufen
  ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.ellipse(x, fy - h, w / 2 - 1, 4, 0, Math.PI, 0); ctx.fill();
  for (let k = 0; k < 6; k++) kreis(ctx, x - w / 2 + 3 + k * (w - 6) / 5, fy - h - 1.5 - (k % 2) * 1.5, 1.4, '#ffe680');
  edelstein(ctx, x - 3, fy - h - 2, 2, '#ff4d6d'); edelstein(ctx, x + 4, fy - h - 3, 2, '#4dd2ff');
  // Kasten
  ctx.fillStyle = '#9a4a20'; rr(ctx, x - w / 2, fy - h, w, h, 2); ctx.fill();
  ctx.fillStyle = '#e2b048'; ctx.fillRect(x - w / 2, fy - h, w, 1.6); ctx.fillRect(x - w / 2 + 3, fy - h, 1.6, h); ctx.fillRect(x + w / 2 - 4.6, fy - h, 1.6, h);
  rr(ctx, x - 2, fy - h + 2.5, 4, 4, 1); ctx.fill();
}
Object.assign(AUSBAU_PROPS, {
  kruemelbank(ctx, { rx, ry, rw, fy }) {
    const R = rx + rw;
    // Schließfächer
    const x0 = rx + 34, x1 = R - 12, y0 = ry + 9, y1 = fy - 18;
    ctx.fillStyle = '#6a6f78'; rr(ctx, x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4, 2); ctx.fill();
    for (let y = y0; y + 6 <= y1; y += 7) for (let x = x0; x + 8 <= x1; x += 9) {
      ctx.fillStyle = '#c8a050'; ctx.fillRect(x, y, 8, 6); ctx.fillStyle = '#e8c870'; ctx.fillRect(x, y, 8, 1);
      kreis(ctx, x + 6, y + 3.2, 0.8, '#5a4010');
    }
    // Schalter
    plank(ctx, rx + 14, fy - 13, rw - 28, 13, '#5f8a4a');
    ctx.fillStyle = '#e2b048'; ctx.fillRect(rx + 14, fy - 13, rw - 28, 1.2);
    muenzstapel(ctx, rx + 24, fy - 13, 4); muenzstapel(ctx, rx + 32, fy - 13, 6);
    ctx.fillStyle = '#e2b048'; ctx.beginPath(); ctx.arc(R - 26, fy - 13, 3.2, Math.PI, 0); ctx.fill(); kreis(ctx, R - 26, fy - 17, 0.9, '#e2b048');
    emoji(ctx, '💰', R - 16, fy - 13, 9);
  },
  schatzkammer(ctx, { rx, ry, rw, fy, cx, rnd }) {
    const R = rx + rw;
    // Goldbogen
    ctx.strokeStyle = 'rgba(240,200,100,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx + 6, fy, Math.min(rw * 0.36, fy - ry - 10), Math.PI, 0); ctx.stroke();
    // Krone auf Kissen
    ctx.fillStyle = '#efe6da'; ctx.fillRect(cx + 2, fy - 16, 8, 16); oval(ctx, cx + 6, fy - 17, 6, 2.2, '#b3203f');
    emoji(ctx, '👑', cx + 6, fy - 17, 10);
    truhe(ctx, rx + 26, fy, 22);
    truhe(ctx, R - 22, fy, 18);
    for (let i = 0; i < 4; i++) muenzstapel(ctx, rx + 40 + i * 5 + (i > 1 ? rw * 0.3 : 0), fy, 2 + (i * 3) % 5);
    for (let i = 0; i < 7; i++) edelstein(ctx, rx + 14 + rnd() * (rw - 28), fy - 0.5, 1.6, ['#ff4d6d', '#4dd2ff', '#7dff8a', '#c88bff'][i % 4]);
  },
});

// ----- Bad -----
export function rutschenPunkt(rx, ry, rw, rh, u) {
  // Spiralrutsche: Turm links, Rutsche schlängelt sich ins Becken
  const fy = ry + rh - 13;
  const x0 = rx + 34, top = ry + 14;
  const pts = [[x0 + 4, top], [x0 + 26, top + 6], [x0 + 6, top + 14], [x0 + 28, fy - 22], [x0 + 40, fy - 12]];
  const n = pts.length - 1, f = clamp(u, 0, 0.9999) * n, i = Math.floor(f), t = f - i;
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t, pts];
}
Object.assign(AUSBAU_PROPS, {
  erlebnisbad(ctx, { rx, ry, rw, rh, fy }) {
    const R = rx + rw;
    becken(ctx, rx + 58, fy - 18, R - 12 - rx - 58, 18);
    // Wellen-Muster
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 0.8;
    for (let x = rx + 64; x < R - 20; x += 10) { ctx.beginPath(); ctx.arc(x, fy - 10, 3, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    // Rutschturm
    ctx.fillStyle = '#c8d0d8'; ctx.fillRect(rx + 34, ry + 14, 2, fy - ry - 14); ctx.fillRect(rx + 42, ry + 14, 2, fy - ry - 14);
    for (let y = ry + 18; y < fy; y += 5) ctx.fillRect(rx + 34, y, 10, 1);
    const [, , pts] = rutschenPunkt(rx, ry, rw, rh, 0);
    for (const [lw, c] of [[6, '#e8a400'], [4.2, '#ffcf3a']]) {
      ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    }
    ctx.strokeStyle = '#ff6b5b'; ctx.lineWidth = 1; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 1.6) : ctx.moveTo(x, y + 1.6))); ctx.stroke();
    ctx.lineJoin = 'miter';
    // Palme
    const px = R - 18;
    ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(px, fy - 18); ctx.quadraticCurveTo(px + 3, ry + 26, px - 1, ry + 16); ctx.stroke();
    for (let k = 0; k < 5; k++) { const a = Math.PI + k * Math.PI / 4; oval(ctx, px - 1 + Math.cos(a) * 6, ry + 16 + Math.sin(a) * 3 + 3, 7, 2, '#3fae4f', a + Math.PI / 2 - Math.PI / 2); }
    emoji(ctx, '🛟', rx + rw * 0.7, fy - 8, 9);
  },
  spassbad(ctx, { rx, ry, rw, fy }) {
    const R = rx + rw;
    becken(ctx, rx + 12, fy - 18, rw - 24, 18);
    // Felsen mit Wasserfall
    for (const [x, y, a, b] of [[rx + 36, ry + 22, 11, 9], [rx + 44, ry + 30, 10, 9], [rx + 30, ry + 36, 10, 10]]) oval(ctx, x, y, a, b, '#7a7f8c');
    oval(ctx, rx + 38, ry + 18, 7, 4, '#5fb84a');
    ctx.fillStyle = 'rgba(180,230,255,.75)'; ctx.fillRect(rx + 48, ry + 26, 6, fy - 16 - ry - 26);
    // Strudel
    const sx = rx + rw * 0.6;
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 0.9;
    ctx.beginPath(); for (let a = 0; a < TAU * 2.2; a += 0.3) { const r = 1 + a * 1.2; ctx.lineTo(sx + Math.cos(a) * r, fy - 9 + Math.sin(a) * r * 0.3); } ctx.stroke();
    // Tropfen-Kanone
    const kx = R - 22;
    ctx.fillStyle = '#ff6b5b'; rr(ctx, kx - 4, fy - 30, 8, 12, 2); ctx.fill();
    ctx.save(); ctx.translate(kx, fy - 30); ctx.rotate(-0.6); ctx.fillStyle = '#4fa3ff'; rr(ctx, -2.5, -10, 5, 11, 2); ctx.fill(); ctx.restore();
    emoji(ctx, '🛟', rx + rw * 0.4, fy - 8, 9);
    kreis(ctx, rx + rw * 0.8, fy - 13, 3, '#fff'); ctx.fillStyle = '#e8463c'; ctx.beginPath(); ctx.arc(rx + rw * 0.8, fy - 13, 3, -0.5, 0.8); ctx.lineTo(rx + rw * 0.8, fy - 13); ctx.fill();
  },
});

// ----- Rathaus -----
function bogenfenster(ctx, x, y, w, h) {
  ctx.fillStyle = '#efe0bd'; rr(ctx, x - 1.5, y - 1.5, w + 3, h + 3, [w / 2 + 1.5, w / 2 + 1.5, 1, 1]); ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y, 0, y + h, '#bfe6ff', '#7ab8e0'); rr(ctx, x, y, w, h, [w / 2, w / 2, 0, 0]); ctx.fill();
  strich(ctx, '#efe0bd', 0.8, x + w / 2, y, x + w / 2, y + h); strich(ctx, '#efe0bd', 0.8, x, y + h * 0.55, x + w, y + h * 0.55);
}
function fahne(ctx, x, fy, h, col) {
  strich(ctx, '#d8d8d8', 1, x, fy, x, fy - h);
  kreis(ctx, x, fy - h - 1, 1.2, '#e2b048');
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, fy - h + 1); ctx.quadraticCurveTo(x + 5, fy - h + 2, x + 10, fy - h + 1); ctx.lineTo(x + 10, fy - h + 8); ctx.quadraticCurveTo(x + 5, fy - h + 9, x, fy - h + 8); ctx.fill();
}
Object.assign(AUSBAU_PROPS, {
  buergerhaus(ctx, { rx, ry, rw, fy, cx }) {
    const R = rx + rw, H = fy - ry;
    // Bogenfenster
    const wh = Math.min(26, H * 0.38);
    for (const x of [cx - 34, cx - 6, cx + 22]) bogenfenster(ctx, x, ry + 12, 12, wh);
    // Pinnwand
    ctx.fillStyle = '#c99a62'; rr(ctx, rx + 12, ry + 30, 22, 16, 1.5); ctx.fill();
    ctx.fillStyle = '#d8b07a'; ctx.fillRect(rx + 14, ry + 32, 18, 12);
    for (const [x, y, c] of [[rx + 16, ry + 33, '#fff'], [rx + 23, ry + 34, '#ffd36b'], [rx + 17, ry + 39, '#a8e0ff'], [rx + 25, ry + 39, '#fff']]) { ctx.fillStyle = c; ctx.fillRect(x, y, 5, 4); kreis(ctx, x + 2.5, y + 0.5, 0.7, '#e8463c'); }
    // Runder Tisch mit Stühlen
    const ty = fy - 10;
    for (let k = 0; k < 6; k++) { const x = cx - 30 + k * 12; ctx.fillStyle = '#8a3a2a'; rr(ctx, x - 3, ty - 12, 6, 10, [3, 3, 0, 0]); ctx.fill(); }
    oval(ctx, cx, ty, 36, 4.5, '#8a5530'); oval(ctx, cx, ty - 0.8, 34, 3.4, '#a8743f');
    ctx.fillStyle = '#6b3f22'; ctx.fillRect(cx - 2, ty + 3, 4, fy - ty - 3); ctx.fillRect(cx - 8, fy - 1.5, 16, 1.5);
    for (const x of [cx - 18, cx + 4, cx + 20]) { ctx.fillStyle = '#fbfbf6'; ctx.fillRect(x, ty - 1.6, 5, 1.6); }
    // Fahnen
    fahne(ctx, R - 22, fy, Math.min(40, H - 14), '#3a6ad8');
    fahne(ctx, R - 14, fy, Math.min(34, H - 18), '#ffd34d');
  },
  parlament(ctx, { rx, ry, rw, fy, cx }) {
    const R = rx + rw, H = fy - ry;
    // Kuppel
    const dr = Math.min(26, rw * 0.18);
    ctx.fillStyle = 'rgba(200,230,255,.18)'; ctx.beginPath(); ctx.arc(cx, ry + 10 + dr, dr, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(240,220,170,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, ry + 10 + dr, dr, Math.PI, 0); ctx.stroke();
    for (let k = 1; k < 6; k++) { const a = Math.PI + k * Math.PI / 6; strich(ctx, 'rgba(240,220,170,.45)', 0.7, cx, ry + 10 + dr, cx + Math.cos(a) * dr, ry + 10 + dr + Math.sin(a) * dr); }
    // Säulen
    for (const x of [rx + 16, R - 16]) saeule(ctx, x, ry + 28, fy, 6, '#f6ecd4');
    // Halbrund der Sitze
    const farben = ['#e8463c', '#ff9f43', '#ffd34d', '#59c977', '#4f9bff', '#b07cff'];
    const rmax = Math.min(rw * 0.36, H * 0.62);
    for (let ring = 0; ring < 4; ring++) {
      const r = rmax * (0.45 + ring * 0.18);
      const n = Math.round(6 + ring * 4);
      for (let i = 0; i < n; i++) {
        const a = Math.PI + (i + 0.5) * Math.PI / n;
        ctx.fillStyle = farben[Math.floor(i / n * farben.length)];
        rr(ctx, cx + Math.cos(a) * r - 2, fy - 4 + Math.sin(a) * r * 0.55 - 2, 4, 3.5, 1.2); ctx.fill();
      }
    }
    // Rednerpult
    ctx.fillStyle = '#8a5530'; rr(ctx, cx - 6, fy - 12, 12, 12, [2, 2, 0, 0]); ctx.fill();
    ctx.fillStyle = '#e2b048'; ctx.fillRect(cx - 7, fy - 13, 14, 1.6);
    emoji(ctx, '🐜', cx, fy - 3, 7);
    emoji(ctx, '🗳️', R - 30, fy, 10);
  },
});

// ---------------------------------------------------------------------------
// Oberfläche (Wiese): Signatur (ctx, p) mit p = { rx, ry, rw, rh, fy, cx, room } – fy = Boden
// ---------------------------------------------------------------------------
function laeusePflanze(ctx, x, fy, h) {
  ctx.strokeStyle = '#3e8e2e'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x, fy); ctx.quadraticCurveTo(x - 4, fy - h * 0.55, x + 2, fy - h); ctx.stroke();
  const n = Math.max(2, Math.floor((h - 8) / 11));
  for (let k = 0; k < n; k++) { const ly = fy - 12 - k * 11, s = k % 2 ? 1 : -1; oval(ctx, x + s * 7, ly, 8, 3.5, '#5cc94a', s * 0.5); }
}
function laeuse(ctx, x, fy, h, t, seed = 0) {
  const n = Math.max(2, Math.floor((h - 8) / 11));
  for (let k = 0; k < n; k++) {
    const ly = fy - 14 - k * 11 + Math.sin(t * 3 + k + seed) * 0.8, dx = k % 2 ? 4 : -4;
    oval(ctx, x + dx, ly, 2.6, 2, '#9be05a');
    kreis(ctx, x + (k % 2 ? 6 : -6), ly - 0.5, 0.7, '#2a4a10');
  }
}
function zaun(ctx, x0, x1, fy) {
  ctx.strokeStyle = '#c99a62'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, fy - 10); ctx.lineTo(x1, fy - 10); ctx.moveTo(x0, fy - 4); ctx.lineTo(x1, fy - 4); ctx.stroke();
  for (let x = x0 + 2; x < x1; x += 12) { ctx.beginPath(); ctx.moveTo(x, fy); ctx.lineTo(x, fy - 14); ctx.stroke(); }
}
function blumen(ctx, x0, x1, fy, rnd) {
  for (let x = x0; x < x1; x += 4) {
    halboval(ctx, x, fy, 2.5, 3 + rnd() * 2, '#4fa83a');
    if (rnd() < 0.5) kreis(ctx, x + rnd() * 2 - 1, fy - 4 - rnd() * 2, 1.2, ['#ff7aa8', '#fff', '#ffd34d', '#b48cff'][(rnd() * 4) | 0]);
  }
}
function satteldach(ctx, x, y, w, h, col, over = 3) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - over, y); ctx.lineTo(x + w + over, y); ctx.lineTo(x + w / 2, y - h); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(x - over, y - 1, w + over * 2, 1.5);
}
const lp = {
  blattlaushof: (rx, rw, rh) => [[rx + rw * 0.55, rh - 12], [rx + rw - 16, rh - 8]],
  molkerei: (rx, rw, rh) => [[rx + rw - 9, rh - 18]],
};
export function bahnPunkte(rw, rh) {
  // Achterbahn (relativ zu rx/ry)
  const p = [], fy = rh;
  const q = (x0, y0, cx, cy, x1, y1, n = 14) => { for (let i = p.length ? 1 : 0; i <= n; i++) { const t = i / n; p.push([(1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1]); } };
  q(4, fy - 8, rw * 0.2, fy - rh * 1.25, rw * 0.4, fy - 8);
  const lr = Math.min(13, rh * 0.22), lx = rw * 0.57;
  q(rw * 0.4, fy - 8, rw * 0.48, fy - 8, lx, fy - 8, 4);
  for (let i = 1; i <= 20; i++) { const a = Math.PI / 2 - (i / 20) * TAU; p.push([lx + Math.cos(a) * lr + (i / 20) * 3, fy - 8 - lr + Math.sin(a) * lr]); }
  const [ex, ey] = p[p.length - 1];
  q(ex, ey, rw * 0.72, fy - 8, rw * 0.78, fy - 10, 5);
  q(rw * 0.78, fy - 10, rw * 0.89, fy - rh * 0.7, rw - 4, fy - 10, 10);
  return p;
}
function bahnPos(pts, u) {
  const f = clamp(u, 0, 0.9999) * (pts.length - 1), i = Math.floor(f), t = f - i;
  const a = pts[i], b = pts[i + 1];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])];
}
export function seilbahn(rx, ry, rw, rh) {
  const fy = ry + rh;
  return { x0: rx + 30, y0: fy - 42, x1: rx + rw - 7, y1: fy - 30 };
}

export const AUSBAU_SURFACE = {
  blattlaushof(ctx, { rx, ry, rw, rh, fy, room }) {
    const rnd = mulberry32(room.id * 31 + 7);
    const R = rx + rw;
    const sx = rx + 6, sw = Math.min(44, rw * 0.36), wy = fy - 26;
    // Stall
    ctx.fillStyle = '#c0392b'; ctx.fillRect(sx, wy, sw, fy - wy);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let x = sx + 4; x < sx + sw; x += 5) ctx.fillRect(x, wy, 0.8, fy - wy);
    satteldach(ctx, sx, wy, sw, 16, '#6b3f22', 3);
    strich(ctx, '#fff', 1, sx - 3, wy, sx + sw / 2, wy - 16, sx + sw + 3, wy);
    ctx.fillStyle = '#ffe08a'; ctx.fillRect(sx + sw / 2 - 3, wy - 9, 6, 5);
    ctx.fillStyle = '#7a1f1a'; ctx.fillRect(sx + sw / 2 - 7, fy - 16, 14, 16);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.strokeRect(sx + sw / 2 - 7, fy - 16, 14, 16);
    strich(ctx, '#fff', 1, sx + sw / 2 - 7, fy - 16, sx + sw / 2 + 7, fy, sx + sw / 2 + 7, fy - 16, sx + sw / 2 - 7, fy);
    // Weide mit Zaun, Pflanzen, Kräuterbeet
    zaun(ctx, sx + sw + 4, R - 2, fy);
    for (const [x, h] of lp.blattlaushof(rx, rw, rh)) laeusePflanze(ctx, x, fy, h);
    blumen(ctx, sx + sw + 8, R - 24, fy, rnd);
    emoji(ctx, '🌿', sx + sw + 8, fy, 9);
  },
  molkerei(ctx, { rx, ry, rw, rh, fy }) {
    const R = rx + rw;
    // Gebäude
    const bx = rx + 4, bw = Math.min(54, rw * 0.42), wy = fy - 28;
    ctx.fillStyle = '#f6f2e8'; ctx.fillRect(bx, wy, bw, fy - wy);
    satteldach(ctx, bx, wy, bw, 12, '#3a6ad8', 3);
    ctx.fillStyle = '#3a6ad8'; rr(ctx, bx + 5, wy + 3, bw - 10, 7, 1.5); ctx.fill();
    schrift(ctx, 'MOLKEREI', bx + bw / 2, wy + 8.6, 5.5, '#fff');
    ctx.fillStyle = '#9fd8ff'; ctx.fillRect(bx + 5, wy + 13, 10, 7); strich(ctx, '#fff', 0.8, bx + 10, wy + 13, bx + 10, wy + 20);
    ctx.fillStyle = '#7a8a9a'; ctx.fillRect(bx + bw - 16, fy - 14, 11, 14);
    // Tanks
    for (const [tx, h] of [[rx + rw * 0.6, 44], [rx + rw * 0.76, 50]]) {
      metall(ctx, tx - 8, fy - h, 16, h, 2, '#d8e0e6');
      ctx.fillStyle = '#c8d0d8'; ctx.beginPath(); ctx.ellipse(tx, fy - h, 8, 3.5, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(tx - 8, fy - h * 0.66, 16, 1); ctx.fillRect(tx - 8, fy - h * 0.33, 16, 1);
      ctx.fillStyle = '#e8ffd0'; rr(ctx, tx - 5, fy - h * 0.6, 10, 6, 1); ctx.fill();
      emoji(ctx, '🥛', tx, fy - h * 0.6 + 5.5, 5);
    }
    // Rohr & Hahn
    ctx.fillStyle = '#9aa4ae'; ctx.fillRect(bx + bw, fy - 20, rx + rw * 0.6 - 8 - bx - bw, 2.5);
    ctx.fillRect(bx + bw + 4, fy - 20, 2.5, 6);
    // Milchkannen
    for (const x of [bx + bw + 5, bx + bw + 13]) {
      metall(ctx, x - 3.5, fy - 9, 7, 9, 2, '#e0e6ea');
      ctx.fillStyle = '#b8c0c8'; ctx.fillRect(x - 2, fy - 11, 4, 2.5); ctx.fillRect(x - 3.5, fy - 6, 7, 0.8);
    }
    for (const [x, h] of lp.molkerei(rx, rw, rh)) laeusePflanze(ctx, x, fy, h);
  },
  raststaette(ctx, { rx, ry, rw, fy }) {
    const R = rx + rw;
    const bx = rx + 6, bw = Math.min(56, rw * 0.58), wy = fy - 26;
    ctx.fillStyle = '#f4e2c0'; ctx.fillRect(bx, wy, bw, fy - wy);
    ctx.fillStyle = '#b5622e'; ctx.fillRect(bx, fy - 6, bw, 6);
    ctx.strokeStyle = 'rgba(80,30,10,.35)'; ctx.lineWidth = 0.6; for (let x = bx + 3; x < bx + bw; x += 6) { ctx.beginPath(); ctx.moveTo(x, fy - 6); ctx.lineTo(x, fy - 3); ctx.stroke(); }
    ctx.fillStyle = '#c0392b'; rr(ctx, bx - 3, wy - 5, bw + 6, 6, 2); ctx.fill();
    // Fenster mit warmem Licht
    ctx.fillStyle = '#ffe08a'; rr(ctx, bx + 5, wy + 7, bw * 0.5, 11, 1.5); ctx.fill();
    strich(ctx, '#8a5a30', 0.8, bx + 5 + bw * 0.25, wy + 7, bx + 5 + bw * 0.25, wy + 18);
    markise(ctx, bx + 3, wy + 1, bw * 0.5 + 4, 5, '#c0392b', '#fff', 4);
    ctx.fillStyle = '#7a4a24'; rr(ctx, bx + bw - 13, fy - 16, 9, 16, [4, 4, 0, 0]); ctx.fill();
    // Kaffee-Schild
    const sx = bx + bw / 2;
    strich(ctx, '#888', 1.2, sx, wy - 5, sx, wy - 9);
    kreis(ctx, sx, wy - 16, 7.5, '#fff'); ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(sx, wy - 16, 7.5, 0, TAU); ctx.stroke();
    emoji(ctx, '☕', sx, wy - 12.5, 9);
    // Terrasse
    sonnenschirm(ctx, R - 16, fy, 18, '#ffb84d');
    tischchen(ctx, R - 16, fy, '#f4f4f4');
    emoji(ctx, '☕', R - 16, fy - 9.5, 5);
  },
  nektarkraftwerk(ctx, { rx, ry, rw, fy }) {
    const R = rx + rw;
    // Nektartank
    const tx = rx + 6, tw = 24, th = 38;
    metall(ctx, tx, fy - th, tw, th, 3, '#f2c94c');
    ctx.fillStyle = '#e2b048'; ctx.beginPath(); ctx.ellipse(tx + tw / 2, fy - th, tw / 2, 5, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(120,70,0,.3)'; ctx.fillRect(tx, fy - th * 0.7, tw, 1.2); ctx.fillRect(tx, fy - th * 0.35, tw, 1.2);
    ctx.fillStyle = '#4a3000'; ctx.beginPath(); const bxx = tx + tw / 2, byy = fy - th * 0.55;
    ctx.moveTo(bxx + 2, byy - 7); ctx.lineTo(bxx - 4, byy + 1); ctx.lineTo(bxx, byy + 1); ctx.lineTo(bxx - 2, byy + 7); ctx.lineTo(bxx + 4, byy - 1); ctx.lineTo(bxx, byy - 1); ctx.fill();
    // Turbinenhaus
    const hx = rx + 36;
    ctx.fillStyle = '#d8dde4'; ctx.fillRect(hx, fy - 18, 26, 18);
    ctx.fillStyle = '#4a7ac8'; rr(ctx, hx - 2, fy - 20, 30, 3, 1); ctx.fill();
    ctx.fillStyle = '#9fd8ff'; ctx.fillRect(hx + 4, fy - 13, 6, 5); ctx.fillRect(hx + 15, fy - 13, 6, 5);
    ctx.fillStyle = '#9aa4ae'; ctx.fillRect(tx + tw, fy - 10, hx - tx - tw, 3);
    // Rad (Kranz statisch, Speichen animiert)
    ctx.strokeStyle = '#5d6670'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx + 13, fy - 32, 11, 0, TAU); ctx.stroke();
    strich(ctx, '#7a828c', 2, hx + 9, fy - 20, hx + 13, fy - 32, hx + 17, fy - 20);
    // Strommast
    const px = R - 12;
    ctx.strokeStyle = '#6a7078'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(px - 6, fy); ctx.lineTo(px - 1.5, fy - 50); ctx.moveTo(px + 6, fy); ctx.lineTo(px + 1.5, fy - 50); ctx.stroke();
    ctx.lineWidth = 0.7;
    for (let k = 0; k < 5; k++) { const y0 = fy - k * 10, y1 = fy - (k + 1) * 10, w0 = 6 - k * 0.9, w1 = 6 - (k + 1) * 0.9; ctx.beginPath(); ctx.moveTo(px - w0, y0); ctx.lineTo(px + w1, y1); ctx.moveTo(px + w0, y0); ctx.lineTo(px - w1, y1); ctx.stroke(); }
    strich(ctx, '#6a7078', 1.4, px - 9, fy - 43, px + 9, fy - 43);
    for (const d of [-8, 8]) kreis(ctx, px + d, fy - 41.5, 1.2, '#e8eef4');
    ctx.strokeStyle = 'rgba(40,40,40,.6)'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(px - 8, fy - 41); ctx.quadraticCurveTo(hx + 40, fy - 30, hx + 26, fy - 19); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px + 8, fy - 41); ctx.quadraticCurveTo(px + 12, fy - 36, R + 2, fy - 38); ctx.stroke();
  },
  sportplatz(ctx, { rx, ry, rw, fy, room }) {
    const R = rx + rw;
    const rnd = mulberry32(room.id * 13 + 5);
    // Tribüne
    for (let k = 0; k < 3; k++) {
      const y = fy - 6 - (k + 1) * 6;
      ctx.fillStyle = k % 2 ? '#a8b0b8' : '#c0c8d0'; ctx.fillRect(rx + 2 + k * 4, y, 32 - k * 8, 6);
      for (let x = rx + 5 + k * 4; x < rx + 32 - k * 4; x += 4) kreis(ctx, x, y - 1, 1.6, ['#e8463c', '#ffd34d', '#4f9bff', '#fff'][(rnd() * 4) | 0]);
    }
    ctx.fillStyle = '#4a7ac8'; ctx.fillRect(rx + 2, fy - 26, 34, 2);
    // Spielfeld
    const x0 = rx + 38, x1 = R - 4, top = fy - 20, bot = fy - 5;
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#52b84a' : '#62c958'; ctx.fillRect(x0 + i * (x1 - x0) / 8, top, (x1 - x0) / 8, bot - top); }
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.2;
    ctx.strokeRect(x0 + 2, top + 2, x1 - x0 - 4, bot - top - 4);
    ctx.beginPath(); ctx.moveTo((x0 + x1) / 2, top + 2); ctx.lineTo((x0 + x1) / 2, bot - 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, (top + bot) / 2, 6, 3, 0, 0, TAU); ctx.stroke();
    for (const gx of [x0, x1 - 8]) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(gx, top - 16, 8, 18);
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 0.7;
      for (let k = 2; k < 18; k += 4) { ctx.beginPath(); ctx.moveTo(gx, top - 16 + k); ctx.lineTo(gx + 8, top - 16 + k); ctx.stroke(); }
    }
    // Laufbahn
    ctx.fillStyle = '#c8553d'; ctx.fillRect(rx + 2, bot, rw - 4, fy - bot);
    strich(ctx, 'rgba(255,255,255,.75)', 0.6, rx + 2, bot + 2.5, R - 2, bot + 2.5);
    for (const fx of [x0 + 30, x1 - 30]) { strich(ctx, '#ddd', 1.2, fx, top, fx, top - 30); ctx.fillStyle = '#ffd34d'; ctx.fillRect(fx, top - 30, 7, 4); }
  },
  stadion(ctx, { rx, ry, rw, rh, fy, room }) {
    const R = rx + rw;
    const rnd = mulberry32(room.id * 17 + 3);
    const sw = 44, sh = Math.min(42, rh - 18);
    // Tribünen
    for (const d of [-1, 1]) {
      const xo = d < 0 ? rx + 2 : R - 2, xi = xo - d * -sw; // innen
      const xin = d < 0 ? rx + 2 + sw : R - 2 - sw;
      ctx.fillStyle = '#9aa4ae'; ctx.beginPath(); ctx.moveTo(xo, fy); ctx.lineTo(xo, fy - sh); ctx.lineTo(xin, fy - 10); ctx.lineTo(xin, fy); ctx.fill();
      for (let r = 0; r < 7; r++) {
        for (let k = 0; k < 10; k++) {
          const t = (k + 0.5) / 10, x = xo + (xin - xo) * t;
          const yTop = fy - sh + (sh - 10) * t;
          const y = yTop + 3 + r * 4.2;
          if (y > fy - 3) continue;
          kreis(ctx, x, y, 1.5, ['#e8463c', '#ffd34d', '#4f9bff', '#fff', '#59c977'][(rnd() * 5) | 0]);
        }
      }
      // Dach
      strich(ctx, '#4a525c', 2.5, xo, fy - sh - 6, xin + d * 6, fy - sh + 2);
      strich(ctx, '#6a7078', 1, xo + d * 1, fy - sh - 6, xo + d * 1, fy - sh);
      // Flutlicht
      const mx = d < 0 ? rx + 16 : R - 16;
      strich(ctx, '#8a949e', 1.5, mx, fy - sh + (sh - 10) * 0.32, mx, ry + 6);
      ctx.fillStyle = '#4a525c'; rr(ctx, mx - 6, ry + 1, 12, 7, 1); ctx.fill();
      for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) kreis(ctx, mx - 3.5 + k * 3.5, ry + 3 + j * 3, 1.1, '#fffbe0');
    }
    // Spielfeld
    const x0 = rx + 2 + sw + 2, x1 = R - 2 - sw - 2, top = fy - 16;
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#52b84a' : '#62c958'; ctx.fillRect(x0 + i * (x1 - x0) / 6, top, (x1 - x0) / 6, 16); }
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.2; ctx.strokeRect(x0 + 2, top + 2, x1 - x0 - 4, 12);
    ctx.beginPath(); ctx.moveTo((x0 + x1) / 2, top + 2); ctx.lineTo((x0 + x1) / 2, top + 14); ctx.stroke();
    for (const gx of [x0, x1 - 7]) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.strokeRect(gx, top - 13, 7, 15); }
    // Anzeigetafel
    const cxm = (x0 + x1) / 2;
    strich(ctx, '#6a7078', 1.4, cxm - 10, top, cxm - 10, top - 26); strich(ctx, '#6a7078', 1.4, cxm + 10, top, cxm + 10, top - 26);
    ctx.fillStyle = '#1a1e24'; rr(ctx, cxm - 16, top - 38, 32, 13, 2); ctx.fill();
    schrift(ctx, '2 : 1', cxm, top - 28.5, 8, '#ffd34d');
  },
  abenteuerspielplatz(ctx, { rx, ry, rw, rh, fy }) {
    const R = rx + rw;
    const tx = rx + 6, tw = 26, py = fy - 30;
    // Netz
    ctx.strokeStyle = '#d8c090'; ctx.lineWidth = 0.8;
    const nx0 = tx + tw, nx1 = rx + 64;
    for (let k = 0; k <= 6; k++) { const t = k / 6; ctx.beginPath(); ctx.moveTo(nx0, py + (fy - py) * t); ctx.lineTo(nx1, fy - 22 + 22 * t); ctx.stroke(); }
    for (let k = 0; k <= 6; k++) { const t = k / 6; ctx.beginPath(); ctx.moveTo(nx0 + (nx1 - nx0) * t, py + (fy - 22 - py) * t); ctx.lineTo(nx0 + (nx1 - nx0) * t, fy); ctx.stroke(); }
    strich(ctx, '#8a5a30', 2, nx1, fy, nx1, fy - 24);
    // Turm
    ctx.fillStyle = '#8a5a30'; ctx.fillRect(tx, py - 14, 2.5, fy - py + 14); ctx.fillRect(tx + tw - 2.5, py - 14, 2.5, fy - py + 14);
    plank(ctx, tx - 2, py, tw + 4, 3.5, '#b5823f');
    ctx.fillStyle = '#d8a868'; ctx.fillRect(tx + 3, py + 4, tw - 6, fy - py - 4);
    const holds = ['#e8463c', '#ffd34d', '#4f9bff', '#59c977', '#b07cff'];
    for (let k = 0; k < 12; k++) kreis(ctx, tx + 6 + (k * 7) % (tw - 11), py + 7 + k * 2, 1.6, holds[k % 5]);
    strich(ctx, '#8a5a30', 1, tx, py - 6, tx + tw, py - 6);
    satteldach(ctx, tx, py - 14, tw, 10, '#e8463c', 3);
    // Seilbahn
    const s = seilbahn(rx, ry, rw, rh);
    strich(ctx, '#8a5a30', 2.5, s.x1, fy, s.x1, s.y1 - 3);
    strich(ctx, '#555', 0.8, s.x0, s.y0, s.x1, s.y1);
    // Sandkasten
    ctx.fillStyle = '#e8cf8a'; rr(ctx, rx + 72, fy - 5, 30, 5, 2); ctx.fill();
    ctx.fillStyle = '#b5823f'; ctx.fillRect(rx + 71, fy - 5, 32, 1.4);
    emoji(ctx, '🪣', rx + 82, fy - 3, 8);
  },
  freizeitpark(ctx, { rx, ry, rw, rh, fy }) {
    const pts = bahnPunkte(rw, rh);
    // Stützen
    ctx.strokeStyle = '#b8c0c8'; ctx.lineWidth = 1;
    for (let i = 0; i < pts.length; i += 3) { const [x, y] = pts[i]; if (y < rh - 10) { ctx.beginPath(); ctx.moveTo(rx + x, ry + y + 2); ctx.lineTo(rx + x, fy); ctx.stroke(); } }
    // Schienen
    for (const [lw, c] of [[3.5, '#c0392b'], [1, '#ffb0a0']]) {
      ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(rx + x, ry + y) : ctx.moveTo(rx + x, ry + y))); ctx.stroke();
    }
    ctx.lineJoin = 'miter';
    // Kassenhäuschen & Fahnen
    const kx = rx + rw * 0.22;
    for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? '#fff' : '#ff7aa8'; ctx.fillRect(kx - 8 + k * 4, fy - 12, 4, 12); }
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(kx - 10, fy - 12); ctx.lineTo(kx + 10, fy - 12); ctx.lineTo(kx, fy - 20); ctx.fill();
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(kx - 3, fy - 9, 6, 5);
    for (const fx of [rx + rw * 0.89, rx + 6]) { strich(ctx, '#ddd', 1, fx, fy, fx, fy - 18); ctx.fillStyle = '#4f9bff'; ctx.beginPath(); ctx.moveTo(fx, fy - 18); ctx.lineTo(fx + 7, fy - 16); ctx.lineTo(fx, fy - 14); ctx.fill(); }
  },
  marktplatz(ctx, { rx, ry, rw, fy }) {
    // Pflaster
    for (let x = rx + 2, i = 0; x < rx + rw - 2; x += 5, i++) oval(ctx, x + 2, fy - 1, 2.3, 1.3, i % 2 ? '#b8b0a4' : '#a8a094');
    const n = 3, sw = (rw - 8) / n;
    const st = [['#e8463c', ['🍯', '🌰']], ['#4f9bff', ['🪵', '🍓']], ['#ffc93c', ['🍄', '🌾']]];
    for (let i = 0; i < n; i++) {
      const x = rx + 4 + i * sw;
      const top = ry + 14 + (i === 1 ? -4 : 0);
      ctx.fillStyle = '#9a6a3c'; ctx.fillRect(x + 2, top, 2, fy - top); ctx.fillRect(x + sw - 4, top, 2, fy - top);
      markise(ctx, x, top, sw, 5, st[i][0], '#fff', 6);
      plank(ctx, x + 2, fy - 14, sw - 4, 5, '#c58b52');
      ctx.fillStyle = '#9a6a3c'; ctx.fillRect(x + 3, fy - 9, sw - 6, 9);
      st[i][1].forEach((e, k) => emoji(ctx, e, x + sw * (k + 1) / 3, fy - 14, 9));
    }
    // Waage-Schild
    const cx = rx + rw / 2;
    ctx.fillStyle = '#c99252'; rr(ctx, cx - 8, ry, 16, 10, 2); ctx.fill();
    emoji(ctx, '⚖️', cx, ry + 8.5, 8);
  },
  handelskontor(ctx, { rx, ry, rw, fy }) {
    const R = rx + rw;
    const bx = rx + 4, bw = Math.min(70, rw * 0.55), wy = fy - 34;
    ctx.fillStyle = '#b5703f'; ctx.fillRect(bx, wy, bw, fy - wy);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let y = wy + 4; y < fy; y += 4) ctx.fillRect(bx, y, bw, 0.7);
    satteldach(ctx, bx, wy, bw, 14, '#7a3a1a', 3);
    ctx.fillStyle = '#f4e2c0'; rr(ctx, bx + bw / 2 - 16, wy + 3, 32, 7, 1.5); ctx.fill();
    schrift(ctx, 'KONTOR', bx + bw / 2, wy + 8.6, 5.5, '#5a3010');
    // offenes Tor mit Waren
    ctx.fillStyle = '#2a1a0e'; rr(ctx, bx + 8, fy - 20, bw - 30, 20, [3, 3, 0, 0]); ctx.fill();
    kiste(ctx, bx + 11, fy - 8, 9, 8); kiste(ctx, bx + 21, fy - 8, 9, 8, '#c99252'); kiste(ctx, bx + 15, fy - 15, 9, 7, '#a8743f');
    ctx.fillStyle = '#ffe08a'; ctx.fillRect(bx + bw - 16, wy + 14, 8, 7); strich(ctx, '#7a3a1a', 0.8, bx + bw - 12, wy + 14, bx + bw - 12, wy + 21);
    // Kran
    const kx = bx + bw - 2;
    strich(ctx, '#8a5a30', 2.5, kx, wy - 6, kx + 26, wy - 6);
    strich(ctx, '#8a5a30', 1.2, kx, wy + 6, kx + 14, wy - 6);
    // Kisten & Fässer
    kiste(ctx, R - 26, fy - 10, 11, 10); kiste(ctx, R - 15, fy - 10, 11, 10, '#c99252'); kiste(ctx, R - 21, fy - 19, 11, 9, '#a8743f');
    fass(ctx, R - 32, fy, 8, 11);
  },
  hauptbahnhof(ctx, { rx, ry, rw, rh, fy, cx }) {
    const R = rx + rw;
    // Glasdach
    const ah = rh - 14;
    ctx.fillStyle = 'rgba(200,230,255,.35)'; ctx.beginPath(); ctx.ellipse(cx, fy - 12, rw / 2 - 4, ah, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#7a2a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, fy - 12, rw / 2 - 4, ah, 0, Math.PI, 0); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,50,50,.45)'; ctx.lineWidth = 0.8;
    for (let k = 1; k < 8; k++) { const a = Math.PI + k * Math.PI / 8; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (rw / 2 - 4), fy - 12 + Math.sin(a) * ah); ctx.lineTo(cx + Math.cos(a) * (rw / 2 - 4) * 0.5, fy - 12); ctx.stroke(); }
    ctx.fillStyle = '#7a2a2a'; ctx.fillRect(rx + 2, fy - 12, 4, 12); ctx.fillRect(R - 6, fy - 12, 4, 12);
    // Uhr (Zeiger animiert)
    kreis(ctx, cx, ry + 22, 7.5, '#2a2e34'); kreis(ctx, cx, ry + 22, 6.3, '#fff');
    for (let k = 0; k < 12; k++) { const a = k * TAU / 12; kreis(ctx, cx + Math.cos(a) * 5, ry + 22 + Math.sin(a) * 5, 0.45, '#333'); }
    // Gleisnummern
    [['1', rx + rw * 0.22], ['2', rx + rw * 0.5 + 18], ['3', rx + rw * 0.78]].forEach(([n, x]) => {
      if (Math.abs(x - cx) < 12) return;
      strich(ctx, '#888', 0.8, x, fy - ah + 8, x, ry + 22);
      ctx.fillStyle = '#2a5ab0'; rr(ctx, x - 4, ry + 22, 8, 8, 1.5); ctx.fill(); schrift(ctx, n, x, ry + 28.5, 6.5, '#fff');
    });
    // Bahnsteig & Gleis
    ctx.fillStyle = '#9a9a9a'; ctx.fillRect(rx + 2, fy - 3, rw - 4, 3);
    ctx.fillStyle = '#ffd34d'; ctx.fillRect(rx + 2, fy - 3.2, rw - 4, 0.8);
    ctx.fillStyle = '#5a3a22'; for (let x = rx + 4; x < R - 4; x += 8) ctx.fillRect(x, fy - 2, 4, 2);
  },
  expressbahnhof(ctx, { rx, ry, rw, fy, cx }) {
    const R = rx + rw;
    // geschwungenes Dach
    ctx.fillStyle = '#f4f6f8';
    ctx.beginPath(); ctx.moveTo(rx + 2, ry + 16); ctx.quadraticCurveTo(cx, ry - 2, R - 2, ry + 10); ctx.lineTo(R - 2, ry + 15); ctx.quadraticCurveTo(cx, ry + 5, rx + 2, ry + 21); ctx.fill();
    ctx.fillStyle = '#e8463c'; ctx.beginPath(); ctx.moveTo(rx + 2, ry + 21); ctx.quadraticCurveTo(cx, ry + 5, R - 2, ry + 15); ctx.lineTo(R - 2, ry + 16.5); ctx.quadraticCurveTo(cx, ry + 6.5, rx + 2, ry + 22.5); ctx.fill();
    for (const x of [rx + 14, R - 14]) strich(ctx, '#c8d0d8', 2.5, x, fy - 3, x + (x < cx ? 4 : -4), ry + (x < cx ? 18 : 13));
    // Anzeigetafel
    ctx.fillStyle = '#1a1e24'; rr(ctx, cx - 22, ry + 20, 44, 10, 2); ctx.fill();
    strich(ctx, '#8a949e', 0.8, cx - 14, ry + 13, cx - 14, ry + 20); strich(ctx, '#8a949e', 0.8, cx + 14, ry + 11, cx + 14, ry + 20);
    schrift(ctx, 'EXPRESS ➜', cx, ry + 27.5, 6, '#ffb030');
    // Bahnsteig
    ctx.fillStyle = '#c8ccd0'; ctx.fillRect(rx + 2, fy - 3, rw - 4, 3);
    ctx.fillStyle = '#ffd34d'; ctx.fillRect(rx + 2, fy - 3.3, rw - 4, 0.9);
    ctx.fillStyle = '#4a4f58'; ctx.fillRect(rx + 2, fy - 1, rw - 4, 1);
  },
};

// ---------------------------------------------------------------------------
// Animationen der Ausbaustufen (pro Bild, günstig halten!)
// ---------------------------------------------------------------------------
function noten(ctx, x0, x1, y, t, n = 3) {
  for (let i = 0; i < n; i++) {
    const p = (t * 0.35 + i / n) % 1;
    schrift(ctx, i % 2 ? '♪' : '♫', x0 + p * (x1 - x0), y - Math.sin(p * 6 + i) * 5, 9, `rgba(255,236,170,${Math.sin(p * Math.PI).toFixed(2)})`);
  }
}
function funkeln(ctx, pts, t, rate = 1.3) {
  pts.forEach(([x, y], i) => {
    const p = (t * rate + i * 0.37) % 1;
    if (p < 0.35) { const a = Math.sin(p / 0.35 * Math.PI); drawGlow(ctx, '255,250,210', x, y, 4 + a * 3, a); stern(ctx, x, y, 1.8 * a + 0.4, `rgba(255,255,240,${a})`, 0); }
  });
}
function tropfen(ctx, x, y0, y1, t, col = '#9fd8ff', speed = 0.8, off = 0) {
  const p = (t * speed + off) % 1;
  kreis(ctx, x, y0 + p * (y1 - y0), 1.4, col);
}
function zeiger(ctx, x, y, a, len, lw, col) { strich(ctx, col, lw, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len); }
function bildschirm(ctx, sx, sy, sw, sh, t, hue0 = 200) {
  // einfacher „Film“: Himmel, Sonne, Hügel, laufende Ameise
  const hue = (hue0 + t * 25) % 360;
  ctx.fillStyle = `hsl(${hue},70%,72%)`; ctx.fillRect(sx, sy, sw, sh);
  kreis(ctx, sx + sw * 0.75, sy + sh * 0.3, Math.min(sh * 0.16, 6), `hsl(${(hue + 40) % 360},90%,80%)`);
  ctx.fillStyle = `hsl(${(hue + 160) % 360},45%,42%)`; ctx.beginPath(); ctx.moveTo(sx, sy + sh); ctx.quadraticCurveTo(sx + sw * 0.3, sy + sh * 0.55, sx + sw * 0.6, sy + sh * 0.8); ctx.quadraticCurveTo(sx + sw * 0.8, sy + sh * 0.65, sx + sw, sy + sh * 0.75); ctx.lineTo(sx + sw, sy + sh); ctx.fill();
  const bx = sx + ((t * 30) % (sw + 20)) - 10;
  ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip();
  drawAntFast(ctx, { x: bx, y: sy + sh - 6, L: Math.min(16, sh * 0.45), dir: 1, phase: t * 12, rolle: 'arbeiterin' });
  ctx.restore();
}

export function ausbauDynamic(ctx, room, g, rx, ry, rw, rh, t) {
  const sur = g.zone === 'oberflaeche';
  const fy = sur ? ry + rh : ry + rh - 13;
  const cx = rx + rw / 2, R = rx + rw, H = fy - ry;
  switch (room.typ) {
    case 'kronpalast': funkeln(ctx, [[cx - 6, ry + 21], [cx + 6, ry + 21], [cx, ry + 26], [rx + rw * 0.14, fy - 26]], t); break;
    case 'wohnhoehle': {
      for (let i = 0; i < 2; i++) {
        const p = (t * 0.3 + i * 0.5) % 1;
        schrift(ctx, 'z', rx + rw * 0.6 + i * 14 + p * 6, fy - 14 - p * 14, 5 + p * 3, `rgba(255,255,255,${0.7 * Math.sin(p * Math.PI)})`);
      }
      break;
    }
    case 'ameisenvilla': {
      const n = Math.max(1, Math.floor((rw - 40) / 28));
      for (let i = 0; i < n; i++) { const x = rx + 33 + i * 28; if (x + 24 > R - 8) break; drawGlow(ctx, '255,220,140', x + 20, fy - 30, 8, 0.45 + Math.sin(t * 2 + i) * 0.05); }
      drawGlow(ctx, '255,230,160', rx + 22, fy - 20, 9, 0.5);
      break;
    }
    case 'wiegenstube': {
      const a = Math.sin(t * 1.2) * 0.25;
      ctx.save(); ctx.translate(cx, ry + 14); ctx.rotate(a);
      strich(ctx, '#e2b048', 1, -12, 0, 12, 0);
      [[-12, '⭐'], [0, '🌙'], [12, '☁️']].forEach(([x, e], i) => { strich(ctx, 'rgba(255,255,255,.5)', 0.5, x, 0, x, 4 + (i % 2) * 2); emoji(ctx, e, x, 11 + (i % 2) * 2, 7); });
      ctx.restore();
      break;
    }
    case 'brutpalast': {
      for (const [i, x] of [rx + rw * 0.42, rx + rw * 0.8].entries()) drawGlow(ctx, '255,120,60', x, ry + 22, 14, 0.35 + Math.sin(t * 2 + i) * 0.08);
      break;
    }
    case 'kornspeicher': {
      ctx.fillStyle = 'rgba(255,240,190,.55)';
      for (let i = 0; i < 6; i++) { const p = (t * 0.08 + i * 0.17) % 1; kreis(ctx, rx + 20 + ((i * 29) % (rw - 40)) + Math.sin(t + i) * 4, fy - 4 - p * (H - 10), 0.8, 'rgba(255,240,190,.5)'); }
      break;
    }
    case 'honigtopflager': {
      const xs = honigtopfX(rx, rw), x = xs[Math.min(1, xs.length - 1)], y = ry + 15 + 6.7 * 2;
      tropfen(ctx, x, y, fy - 12, t, '#f5b324', 0.5);
      funkeln(ctx, [[rx + 34, ry + 18], [R - 14, ry + 19]], t, 0.8);
      break;
    }
    case 'recyclinghof': {
      const p = (t * 0.6) % 1, i = Math.floor(t * 0.6) % 3, bw = Math.min(13, (rw - 22) / 3 - 2);
      const x = cx + (i - 1) * (bw + 2.5);
      if (p < 0.8) kreis(ctx, x, ry + 14 + p * (fy - 20 - ry - 14) / 0.8, 1.8, ['#7ac850', '#f4ead8', '#c9a050'][i]);
      break;
    }
    case 'kompostwerk': steam(ctx, cx - 6, fy - 24, t); steam(ctx, cx + 8, fy - 24, t + 0.5); break;
    case 'pilzplantage': case 'pilzfarm': {
      for (let i = 0; i < 7; i++) {
        const p = (t * 0.15 + i * 0.137) % 1, x = rx + 14 + ((i * 37) % (rw - 28)) + Math.sin(t + i) * 4;
        kreis(ctx, x, fy - 6 - p * (H - 20), 1.3, `rgba(230,210,255,${Math.sin(p * Math.PI) * 0.7})`);
      }
      if (room.typ === 'pilzfarm') {
        for (let x = rx + 36, i = 0; x < R - 10; x += 18, i++) for (let k = 0; k < 2; k++) {
          const p = (t * 0.9 + i * 0.31 + k * 0.5) % 1;
          strich(ctx, `rgba(170,220,255,${0.8 * (1 - p)})`, 1, x, ry + 21 + p * (H * 0.45), x, ry + 24 + p * (H * 0.45));
        }
      }
      break;
    }
    case 'berufsschule': {
      const wx = rx + 30, ww = Math.min(rw * 0.45, 64);
      for (let i = 0; i < 4; i++) { const p = (t * 1.2 + i / 4) % 1; kreis(ctx, wx + ww * 0.6 + Math.sin(i * 2) * 6 * p, fy - 18 - p * 8 + p * p * 12, 0.8, `rgba(255,230,180,${1 - p})`); }
      break;
    }
    case 'gymnasium': {
      const b = bildungsTafel(rx, ry, rw, rh, 14), s = Math.min(b.h - 8, 22);
      const p = (t * 0.25) % 1, tx = b.x + 5, ty = b.y + b.h - 4;
      const pts = [[tx, ty], [tx + s, ty], [tx, ty - s * 0.8], [tx, ty]];
      const f = p * 3, i = Math.floor(f), q = f - i;
      const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * q, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * q;
      kreis(ctx, x, y, 1.3, '#fff');
      break;
    }
    case 'bibliothek': drawGlow(ctx, '200,255,200', R - 22, fy - 15, 10, 0.5); break;
    case 'archiv': flamme(ctx, rx + 20, fy - 9, t, 1); break;
    case 'konditorei': funkeln(ctx, [[rx + 20, fy - 26], [rx + 26, fy - 16], [rx + 52, fy - 16], [R - 22, fy - 22]], t); break;
    case 'grossbaeckerei': {
      const ow = Math.min(18, (rw - 44) / 3), oh = Math.min(24, H - 24);
      for (let i = 0; i < 3; i++) drawGlow(ctx, '255,160,60', rx + 32 + i * (ow + 4) + ow / 2, fy - 10 - oh * 0.25, 9, 0.55 + Math.sin(t * 9 + i * 2) * 0.12);
      ctx.save(); ctx.beginPath(); ctx.rect(rx + 12, ry, rw - 24, rh); ctx.clip();
      for (let k = 0; k < 4; k++) { const x = rx + 12 + ((t * 14 + k * (rw - 24) / 4) % (rw - 24)); emoji(ctx, k % 2 ? '🥨' : '🥐', x, fy - 9.5, 8); }
      ctx.restore();
      break;
    }
    case 'festsaal': { let i = 0; for (let x = rx + 20; x < R - 18; x += 13, i++) if (i % 3 === 1) flamme(ctx, x, fy - 19, t, 0.8, i); break; }
    case 'sternerestaurant': {
      const n = Math.max(2, Math.floor((rw - 24) / 30));
      for (let k = 0; k < n; k++) flamme(ctx, rx + 12 + (k + 0.5) * ((rw - 24) / n), fy - 16, t, 0.8, k);
      break;
    }
    case 'blattlaushof': case 'molkerei': {
      lp[room.typ](rx, rw, rh).forEach(([x, h], i) => laeuse(ctx, x, fy, h, t, i));
      if (room.typ === 'molkerei') { const bw = Math.min(54, rw * 0.42); tropfen(ctx, rx + 4 + bw + 5.2, fy - 14, fy - 10, t, '#f4fff0', 0.7); }
      break;
    }
    case 'raststaette': { const bw = Math.min(56, rw * 0.58); steam(ctx, rx + 6 + bw / 2 + 1, fy - 46, t); break; }
    case 'nektarkraftwerk': {
      const wx = rx + 49, wy = fy - 32;
      for (let k = 0; k < 6; k++) { const a = t * 2 + k * TAU / 6; strich(ctx, '#9aa4ae', 1.2, wx, wy, wx + Math.cos(a) * 10, wy + Math.sin(a) * 10); oval(ctx, wx + Math.cos(a) * 9, wy + Math.sin(a) * 9, 2.4, 1.2, '#ffd34d', a); }
      kreis(ctx, wx, wy, 2, '#5d6670');
      const p = (t * 0.7) % 1;
      if (p < 0.25) drawGlow(ctx, '255,240,120', R - 12, fy - 43, 9, Math.sin(p / 0.25 * Math.PI));
      break;
    }
    case 'krankenhaus': {
      const mx = R - 26 + 1, my = ry + 31.5;
      ctx.strokeStyle = '#3aff7a'; ctx.lineWidth = 0.8; ctx.beginPath();
      for (let k = 0; k <= 12; k++) { const ph = (k / 12 + t * 0.6) % 1; const y = ph > 0.45 && ph < 0.55 ? (ph < 0.5 ? -2.8 : 2) : 0; ctx.lineTo(mx + k, my + y); }
      ctx.stroke();
      break;
    }
    case 'grosskino': case 'filmpalast': {
      const { sx, sy, sw, sh } = kinoLeinwand(rx, ry, rw, rh, room.typ);
      bildschirm(ctx, sx, sy, sw, sh, t, room.typ === 'filmpalast' ? 20 : 200);
      ctx.fillStyle = 'rgba(255,255,220,.05)'; ctx.beginPath(); ctx.moveTo(cx, fy - 4); ctx.lineTo(sx, sy + sh); ctx.lineTo(sx + sw, sy + sh); ctx.fill();
      if (room.typ === 'filmpalast') {
        const per = 2 * (sw + sh + 8), n = Math.floor(per / 7);
        for (let i = 0; i < n; i++) {
          let d = i * 7, x, y;
          if (d < sw + 8) { x = sx - 4 + d; y = sy - 4; } else if ((d -= sw + 8) < sh + 8) { x = sx + sw + 4; y = sy - 4 + d; } else if ((d -= sh + 8) < sw + 8) { x = sx + sw + 4 - d; y = sy + sh + 4; } else { d -= sw + 8; x = sx - 4; y = sy + sh + 4 - d; }
          kreis(ctx, x, y, 1.1, (i + Math.floor(t * 6)) % 3 === 0 ? '#fff6c0' : '#a8781a');
        }
      }
      break;
    }
    case 'sportplatz': {
      const x0 = rx + 38, x1 = R - 4, top = fy - 20;
      const p = (Math.sin(t * 1.3) + 1) / 2, bx = x0 + 14 + p * (x1 - x0 - 28), by = top + 9 - Math.abs(Math.sin(t * 5)) * 9;
      oval(ctx, bx, top + 12, 3, 1, 'rgba(0,0,0,.2)'); emoji(ctx, '⚽', bx, by + 4, 8);
      const q = (t * 0.12) % 1;
      drawAntFast(ctx, { x: rx + 6 + q * (rw - 12), y: fy - 2.5, L: 9, dir: 1, phase: t * 14, rolle: 'arbeiterin' });
      break;
    }
    case 'stadion': {
      const sw = 44, x0 = rx + 48, x1 = R - 48, top = fy - 16;
      const p = (Math.sin(t * 1.5) + 1) / 2, bx = x0 + 10 + p * (x1 - x0 - 20), by = top + 8 - Math.abs(Math.sin(t * 5)) * 9;
      emoji(ctx, '⚽', bx, by + 4, 8);
      for (const mx of [rx + 16, R - 16]) drawGlow(ctx, '255,255,220', mx, ry + 5, 14, 0.6);
      // La-Ola-Welle
      const w = (t * 0.5) % 1;
      for (const d of [-1, 1]) {
        const xo = d < 0 ? rx + 2 : R - 2, xin = d < 0 ? rx + 2 + sw : R - 2 - sw;
        for (let k = 0; k < 3; k++) {
          const tt = (w + k * 0.04) % 1, x = xo + (xin - xo) * tt, sh = Math.min(42, rh - 18);
          const y = fy - sh + (sh - 10) * tt + 2;
          for (let r = 0; r < 3; r++) if (y + r * 8 < fy - 3) kreis(ctx, x, y + r * 8, 1.4, '#fff6a0');
        }
      }
      break;
    }
    case 'schreinerei': {
      for (let i = 0; i < 5; i++) { const p = (t * 0.4 + i / 5) % 1; kreis(ctx, rx + 40 + i * 9 + Math.sin(t + i) * 3, fy - 14 - p * 20, 0.8, `rgba(255,235,190,${0.7 * (1 - p)})`); }
      break;
    }
    case 'quellgrotte': {
      for (let i = 0; i < 2; i++) { const p = (t * 0.5 + i * 0.5) % 1; ctx.strokeStyle = `rgba(200,235,255,${1 - p})`; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(cx, fy - 8, 3 + p * 12, 1 + p * 2.5, 0, 0, TAU); ctx.stroke(); }
      for (let i = 0; i < 3; i++) { const p = (t * 0.8 + i / 3) % 1; kreis(ctx, cx + Math.sin(i * 3) * 4, fy - 9 - p * 10, 1 + p, `rgba(220,245,255,${0.8 * (1 - p)})`); }
      tropfen(ctx, rx + 26, ry + 14, fy - 10, t, '#bfe8ff', 0.6);
      break;
    }
    case 'wasserwerk': {
      zeiger(ctx, rx + 24, fy - 15, -Math.PI / 2 + Math.sin(t * 1.5) * 0.9, 3.5, 0.8, '#e8463c');
      tropfen(ctx, R - 21, fy - 13, fy - 6, t, '#7fd0ff', 1.1);
      break;
    }
    case 'waermestube': {
      drawGlow(ctx, '255,150,60', rx + 45, fy - 12, 18, 0.45 + Math.sin(t * 2.3) * 0.1);
      for (let i = 0; i < 3; i++) { const p = (t * 0.5 + i / 3) % 1; strich(ctx, `rgba(255,220,180,${0.35 * (1 - p)})`, 0.8, rx + 36 + i * 8 + Math.sin(t * 3 + i) * 2, fy - 16 - p * 16, rx + 36 + i * 8 + Math.sin(t * 3 + i + 1) * 2, fy - 20 - p * 16); }
      break;
    }
    case 'sonnentempel': {
      const sy = fy - 9 - Math.min(13, H * 0.26);
      drawGlow(ctx, '255,220,110', cx, sy, rw * 0.45, 0.45 + Math.sin(t * 2) * 0.12);
      for (let k = 0; k < 8; k++) { const a = t * 0.5 + k * TAU / 8; strich(ctx, 'rgba(255,240,170,.35)', 1, cx + Math.cos(a) * 12, sy + Math.sin(a) * 12, cx + Math.cos(a) * 18, sy + Math.sin(a) * 18); }
      break;
    }
    case 'kaufhaus': case 'einkaufswelt': {
      for (let i = 0; i < 10; i++) {
        const on = Math.sin(t * 5 + i * 1.3) > 0.2;
        kreis(ctx, rx + 14 + i * ((rw - 28) / 9), ry + 9, 1.6, on ? ['#ffe066', '#ff6b8b', '#6bd3ff'][i % 3] : 'rgba(255,255,255,.15)');
      }
      if (room.typ === 'kaufhaus') {
        const my = ry + Math.round(H * 0.5), ex0 = rx + rw * 0.38, ex1 = rx + rw * 0.64;
        for (let k = 0; k < 5; k++) { const p = (t * 0.25 + k / 5) % 1; const x = ex0 + 3 + (ex1 - ex0 - 2) * p, y = fy - 4.5 + (my - fy + 4) * p; strich(ctx, '#c8d0d8', 1, x - 2, y, x + 2, y); }
        const p = (t * 0.25) % 1;
        drawAntFast(ctx, { x: ex0 + 3 + (ex1 - ex0 - 2) * p, y: fy - 7 + (my - fy + 4) * p, L: 10, dir: 1, phase: 0, walking: false, rolle: 'arbeiterin' });
      } else {
        const wr = Math.min(H * 0.4, rw * 0.2), wy = fy - wr - 7;
        const cols = ['#ff6b8b', '#ffd34d', '#4fb4ff', '#6bd36b', '#c48bff', '#ff9f43', '#2fbfb4', '#fff'];
        for (let k = 0; k < 8; k++) {
          const a = t * 0.4 + k * TAU / 8, x = cx + Math.cos(a) * wr, y = wy + Math.sin(a) * wr;
          strich(ctx, 'rgba(230,235,240,.7)', 0.8, cx, wy, x, y);
          strich(ctx, '#888', 0.6, x, y, x, y + 2);
          ctx.fillStyle = cols[k]; rr(ctx, x - 3.5, y + 2, 7, 5, [1, 1, 2.5, 2.5]); ctx.fill();
        }
        kreis(ctx, cx, wy, 2.5, '#e2b048');
      }
      break;
    }
    case 'flugfeld': {
      const w = Math.sin(t * 3) * 0.3, x = R - 20, y = fy - 29;
      ctx.save(); ctx.translate(x, y); ctx.rotate(w);
      for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? '#fff' : '#ff7a3d'; ctx.beginPath(); ctx.moveTo(k * 3.5, -3 + k * 0.4); ctx.lineTo((k + 1) * 3.5, -3 + (k + 1) * 0.4); ctx.lineTo((k + 1) * 3.5, 3 - (k + 1) * 0.4); ctx.lineTo(k * 3.5, 3 - k * 0.4); ctx.fill(); }
      ctx.restore();
      break;
    }
    case 'flughafen': {
      const kx = R - 22, p = (t * 1.6) % 1;
      drawGlow(ctx, '255,90,60', kx, ry + 7, 6 + Math.sin(p * TAU) * 2, 0.7);
      kreis(ctx, kx, ry + 7, 1.5, '#ff5a3c');
      const n = Math.floor((rw - 26) / 12);
      for (let i = 0; i < n; i++) if ((i - Math.floor(t * 8)) % n === 0 || (i - Math.floor(t * 8) + n * 10) % n === 0) drawGlow(ctx, '255,230,120', rx + 14 + i * 12, fy - 4, 5, 0.9);
      break;
    }
    case 'fitnessstudio': {
      const tx = rx + 22;
      ctx.fillStyle = '#5d6670'; for (let k = 0; k < 4; k++) ctx.fillRect(tx + 2 + ((k * 7 - t * 20) % 26 + 26) % 26, fy - 5.5, 2, 1);
      drawAntFast(ctx, { x: tx + 13, y: fy - 9, L: 13, dir: 1, phase: t * 16, rolle: 'arbeiterin' });
      break;
    }
    case 'olympiahalle': flamme(ctx, rx + 30, fy - 19, t, 1.5); break;
    case 'eispalast': {
      const pts = []; for (let i = 0; i < 6; i++) pts.push([rx + 16 + ((i * 41) % (rw - 32)), ry + 14 + ((i * 23) % Math.max(8, H - 24))]);
      funkeln(ctx, pts, t, 0.9);
      for (let i = 0; i < 5; i++) { const p = (t * 0.12 + i / 5) % 1; kreis(ctx, rx + 14 + ((i * 31) % (rw - 28)) + Math.sin(t + i) * 3, ry + 8 + p * (H - 8), 0.9, `rgba(255,255,255,${0.8 * Math.sin(p * Math.PI)})`); }
      break;
    }
    case 'turnschuhfabrik': {
      const mx = rx + 14;
      zahnrad(ctx, mx + 25, fy - 25, 5, '#b8c2cc', t * 2); zahnrad(ctx, mx + 32, fy - 31, 3.5, '#9aa4ae', -t * 2.8);
      ctx.save(); ctx.beginPath(); ctx.rect(mx + 20, ry, R - 12 - mx - 20, rh); ctx.clip();
      const L = R - 12 - mx - 20;
      for (let k = 0; k < 3; k++) schuh(ctx, mx + 18 + ((t * 12 + k * L / 3) % L), fy - 10, ['#e8463c', '#4f9bff', '#59c977'][k], 0.9);
      ctx.restore();
      break;
    }
    case 'fuehlerspa': steam(ctx, rx + 26, fy - 16, t); steam(ctx, rx + 36, fy - 16, t + 0.6); flamme(ctx, R - 15, fy - 5, t, 0.6, 1); flamme(ctx, R - 11, fy - 4, t, 0.6, 2); break;
    case 'wellnessoase': {
      const bx = rx + rw * 0.42;
      for (let i = 0; i < 4; i++) { const p = (t * 0.6 + i / 4) % 1; ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - p)})`; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(bx - 9 + i * 6, fy - 7 - p * 7, 0.8 + p * 1.2, 0, TAU); ctx.stroke(); }
      for (const [x, c] of [[rx + rw * 0.45, '255,170,200'], [rx + rw * 0.65, '255,220,120'], [rx + rw * 0.85, '160,220,255']]) drawGlow(ctx, c, x, ry + 15, 7, 0.5 + Math.sin(t * 2 + x) * 0.1);
      break;
    }
    case 'schutzburg': {
      const wy = fy - Math.min(22, H * 0.45);
      flamme(ctx, cx + 17, wy - 4, t, 1.4);
      for (const [i, x] of burgTuerme(rx, rw).entries()) {
        const w = Math.sin(t * 3 + i) * 1.2, y = ry + 3;
        ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 3, y + w, x + 6, y + 0.5); ctx.lineTo(x + 6, y + 3.5); ctx.quadraticCurveTo(x + 3, y + 3 - w, x, y + 3.5); ctx.fill();
      }
      break;
    }
    case 'aussichtsturm': {
      const top = ry + 26, w = Math.sin(t * 3), cx = rx + rw / 2 + 7;
      ctx.fillStyle = '#4f9bff'; ctx.beginPath(); ctx.moveTo(cx, top - 18); ctx.quadraticCurveTo(cx + 3, top - 18 + w, cx + 7, top - 17.5); ctx.lineTo(cx + 7, top - 14.5); ctx.quadraticCurveTo(cx + 3, top - 15 - w, cx, top - 14.5); ctx.fill();
      break;
    }
    case 'sternwarte': {
      const rnd = mulberry32(room.id * 7 + 1), pts = [];
      for (let i = 0; i < 5; i++) pts.push([rx + 10 + rnd() * (rw - 20), ry + 8 + rnd() * H * 0.45]);
      funkeln(ctx, pts, t, 0.7);
      break;
    }
    case 'abenteuerspielplatz': {
      const s = seilbahn(rx, ry, rw, rh), p = (Math.sin(t * 0.8) + 1) / 2;
      const x = s.x0 + (s.x1 - s.x0) * p, y = s.y0 + (s.y1 - s.y0) * p;
      strich(ctx, '#777', 0.8, x, y, x, y + 6);
      kreis(ctx, x, y, 1.5, '#555');
      drawAntFast(ctx, { x, y: y + 8, L: 10, dir: 1, phase: 0, walking: false });
      break;
    }
    case 'freizeitpark': {
      const pts = bahnPunkte(rw, rh), u = (t * 0.12) % 1;
      for (let k = 0; k < 3; k++) {
        const [x, y, a] = bahnPos(pts, (u + 1 - k * 0.025) % 1);
        ctx.save(); ctx.translate(rx + x, ry + y); ctx.rotate(a);
        ctx.fillStyle = ['#ffd34d', '#4f9bff', '#59c977'][k]; rr(ctx, -3.5, -6, 7, 5, 1.5); ctx.fill();
        kreis(ctx, 0, -7, 1.6, '#3a2010');
        ctx.restore();
      }
      break;
    }
    case 'forschungszentrum': {
      const by = fy - 16;
      for (let i = 0; i < 3; i++) { const p = (t * 0.8 + i * 0.33) % 1; kreis(ctx, rx + 36 + Math.sin(t * 3 + i) * 1.5, by - 11 - p * 14, 1.2 + p, `rgba(220,255,240,${0.7 * (1 - p)})`); }
      const fl = 1 + Math.sin(t * 13) * 0.15;
      oval(ctx, rx + rw * 0.4, by - 9.5 * fl, 1.6, 3 * fl, 'rgba(90,160,255,.9)');
      oval(ctx, rx + rw * 0.4, by - 9 * fl, 0.8, 1.6 * fl, '#dff0ff');
      if (Math.sin(t * 4) > 0) kreis(ctx, R - 13, by - 14, 0.9, '#3aff7a');
      break;
    }
    case 'zukunftslabor': {
      const hx = rx + rw * 0.68, top = fy - Math.min(40, H - 18);
      ctx.fillStyle = 'rgba(95,240,255,.12)'; ctx.beginPath(); ctx.moveTo(hx - 7, fy - 3); ctx.lineTo(hx + 7, fy - 3); ctx.lineTo(hx + 16, top); ctx.lineTo(hx - 16, top); ctx.fill();
      const ay = top + (fy - top) * 0.45;
      kreis(ctx, hx, ay, 2.2, '#9ff8ff');
      ctx.strokeStyle = 'rgba(160,250,255,.85)'; ctx.lineWidth = 0.8;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(hx, ay, 10, 3.5, t * 1.2 + k * Math.PI / 3, 0, TAU); ctx.stroke(); }
      for (let k = 0; k < 3; k++) { const a = t * 3 + k * 2.1; kreis(ctx, hx + Math.cos(a) * 10 * Math.cos(t * 1.2 + k * Math.PI / 3) - Math.sin(a) * 3.5 * Math.sin(t * 1.2 + k * Math.PI / 3), ay + Math.cos(a) * 10 * Math.sin(t * 1.2 + k * Math.PI / 3) + Math.sin(a) * 3.5 * Math.cos(t * 1.2 + k * Math.PI / 3), 1, '#fff'); }
      const kx = rx + 34, kw = Math.min(46, rw * 0.38);
      for (let i = 0; i < 6; i++) kreis(ctx, kx + 6 + i * ((kw - 12) / 5), fy - 7, 1.2, Math.sin(t * 5 + i * 1.7) > 0 ? ['#ff5a5a', '#3aff7a', '#ffd23f'][i % 3] : '#4a525c');
      if (Math.sin(t * 2) > -0.3) kreis(ctx, R - 18 + 6.5, fy - 6 - 4.5, 1.1, '#bffcff');
      break;
    }
    case 'schauspielhaus': {
      const sy = fy - 22, k = Math.cos(t * 0.6);
      // Drehscheibe: Haus und Baum drehen sich
      for (const [ph, kind] of [[0, 'haus'], [Math.PI, 'baum']]) {
        const c = Math.cos(t * 0.6 + ph), s = Math.sin(t * 0.6 + ph);
        if (s < -0.2) continue;
        const x = cx + c * rw * 0.18, sc = 0.65 + 0.35 * s;
        if (kind === 'haus') { ctx.fillStyle = '#f4e2c0'; ctx.fillRect(x - 8 * sc, sy - 14, 16 * sc, 14); ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(x - 10 * sc, sy - 14); ctx.lineTo(x + 10 * sc, sy - 14); ctx.lineTo(x, sy - 22); ctx.fill(); ctx.fillStyle = '#7a4a24'; ctx.fillRect(x - 2 * sc, sy - 7, 4 * sc, 7); }
        else { ctx.fillStyle = '#8a5a30'; ctx.fillRect(x - 1.5 * sc, sy - 10, 3 * sc, 10); kreis(ctx, x, sy - 15, 7 * sc + 1, '#4fb447'); }
      }
      const a = 0.16 + Math.sin(t * 1.3) * 0.05, lx = cx + Math.sin(t * 0.7) * 22;
      ctx.fillStyle = `rgba(255,250,200,${a})`; ctx.beginPath(); ctx.moveTo(lx, ry + 10); ctx.lineTo(lx - 16, sy); ctx.lineTo(lx + 16, sy); ctx.fill();
      void k;
      break;
    }
    case 'opernhaus': {
      noten(ctx, rx + rw * 0.3, R - rw * 0.3, fy - 26, t);
      funkeln(ctx, [[cx - 7, ry + 19], [cx + 7, ry + 19], [cx, ry + 23]], t, 1);
      break;
    }
    case 'konzertsaal': noten(ctx, rx + 34, R - 22, ry + 30, t); break;
    case 'philharmonie': {
      noten(ctx, rx + 30, R - 14, ry + 22, t, 4);
      const a = Math.sin(t * 4) * 0.5;
      drawAntFast(ctx, { x: cx, y: fy - 9, L: 12, dir: -1, phase: 0, walking: false, acc: 'zylinder' });
      ctx.save(); ctx.translate(cx - 4, fy - 12); ctx.rotate(-0.8 + a); strich(ctx, '#fff', 0.8, 0, 0, 0, -7); ctx.restore();
      break;
    }
    case 'kruemelbank': funkeln(ctx, [[rx + 24, fy - 20], [rx + 32, fy - 24]], t, 0.6); break;
    case 'schatzkammer': funkeln(ctx, [[rx + 22, fy - 13], [rx + 30, fy - 12], [R - 20, fy - 11], [cx + 6, fy - 24], [rx + 46, fy - 6]], t, 1.1); break;
    case 'erlebnisbad': {
      for (let i = 0; i < 3; i++) { const p = (t * 0.4 + i / 3) % 1; ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - p)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(rx + 80 + i * ((rw - 110) / 2), fy - 9, 3 + p * 10, 1 + p * 2, 0, 0, TAU); ctx.stroke(); }
      const u = (t * 0.3) % 1.3;
      if (u < 1) { const [x, y] = rutschenPunkt(rx, ry, rw, rh, u); drawAntFast(ctx, { x, y: y - 3, L: 10, dir: 1, phase: 0, walking: false }); }
      else { const q = (u - 1) / 0.3; for (let k = 0; k < 4; k++) kreis(ctx, rx + 74 + (k - 1.5) * 4 * q, fy - 14 - Math.sin(q * Math.PI) * (4 + k), 1.2, 'rgba(220,245,255,.9)'); }
      break;
    }
    case 'spassbad': {
      for (let i = 0; i < 4; i++) { const p = (t * 1.6 + i / 4) % 1; strich(ctx, 'rgba(255,255,255,.8)', 0.8, rx + 49 + i * 1.3, ry + 26 + p * (fy - 16 - ry - 26), rx + 49 + i * 1.3, ry + 30 + p * (fy - 16 - ry - 26)); }
      for (let i = 0; i < 3; i++) { const p = (t * 0.6 + i / 3) % 1; ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - p)})`; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(rx + 51, fy - 15, 2 + p * 8, 0.8 + p * 1.6, 0, 0, TAU); ctx.stroke(); }
      const sx = rx + rw * 0.6;
      for (let k = 0; k < 3; k++) { const a = t * 3 + k * TAU / 3; kreis(ctx, sx + Math.cos(a) * 6, fy - 9 + Math.sin(a) * 1.8, 0.9, '#fff'); }
      const kx = R - 22;
      for (let k = 0; k < 5; k++) { const p = (t * 0.8 + k / 5) % 1; kreis(ctx, kx - 7 - p * 30, fy - 38 + (p * 2 - 1) ** 2 * 24 - 4, 1.3, `rgba(170,225,255,${1 - p * 0.5})`); }
      break;
    }
    case 'parlament': {
      const rmax = Math.min(rw * 0.36, H * 0.62);
      for (let i = 0; i < 4; i++) {
        const ring = i % 4, r = rmax * (0.45 + ring * 0.18), n = Math.round(6 + ring * 4);
        const j = Math.floor(t * 1.5 + i * 3) % n, a = Math.PI + (j + 0.5) * Math.PI / n;
        drawGlow(ctx, '255,255,200', cx + Math.cos(a) * r, fy - 4 + Math.sin(a) * r * 0.55, 4, 0.8);
      }
      break;
    }
    case 'handelskontor': {
      const bw = Math.min(70, rw * 0.55), kx = rx + 4 + bw - 2 + 24, wy = fy - 34;
      const a = Math.sin(t * 1.4) * 0.12, len = 22 + Math.sin(t * 0.5) * 3;
      ctx.save(); ctx.translate(kx, wy - 6); ctx.rotate(a);
      strich(ctx, '#555', 0.7, 0, 0, 0, len);
      kiste(ctx, -4.5, len, 9, 7, '#d8a868');
      ctx.restore();
      break;
    }
    case 'hauptbahnhof': case 'expressbahnhof': {
      if (room.typ === 'hauptbahnhof') {
        zeiger(ctx, cx, ry + 22, t * 0.1 - Math.PI / 2, 3.2, 1, '#222');
        zeiger(ctx, cx, ry + 22, t * 1.2 - Math.PI / 2, 4.8, 0.7, '#222');
      }
      ctx.save(); ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();
      if (room.typ === 'hauptbahnhof') {
        const p = ((t * 0.12) % 1.6) - 0.3, x = rx + p * rw;
        for (let k = 0; k < 4; k++) {
          const wx = x - k * 22;
          ctx.fillStyle = k ? ['#ffd34d', '#4f9bff', '#59c977'][k - 1] : '#e8463c'; rr(ctx, wx - 9, fy - 15, 18, 11, 3); ctx.fill();
          ctx.fillStyle = '#9fd8ff'; ctx.fillRect(wx - 5, fy - 13, 4, 4); ctx.fillRect(wx + 1, fy - 13, 4, 4);
          kreis(ctx, wx - 5, fy - 3, 2.2, '#222'); kreis(ctx, wx + 5, fy - 3, 2.2, '#222');
        }
        for (let i = 0; i < 3; i++) { const q = (t * 1.5 + i / 3) % 1; kreis(ctx, x + 4 - q * 10, fy - 18 - q * 12, 2 + q * 3, `rgba(255,255,255,${0.6 * (1 - q)})`); }
      } else {
        const p = ((t * 0.3) % 2) - 0.5, x = rx + p * rw;
        if (p > -0.4 && p < 1.5) {
          ctx.fillStyle = '#f4f6f8';
          ctx.beginPath(); ctx.moveTo(x + 12, fy - 3); ctx.quadraticCurveTo(x + 12, fy - 13, x - 4, fy - 13); ctx.lineTo(x - 70, fy - 13); ctx.lineTo(x - 70, fy - 3); ctx.fill();
          ctx.fillStyle = '#e8463c'; ctx.fillRect(x - 70, fy - 7, 78, 1.6);
          ctx.fillStyle = '#2a3a4a'; for (let w = x - 66; w < x - 8; w += 7) ctx.fillRect(w, fy - 11, 5, 3);
          ctx.beginPath(); ctx.moveTo(x - 2, fy - 12); ctx.quadraticCurveTo(x + 6, fy - 12, x + 8, fy - 8); ctx.lineTo(x - 2, fy - 8); ctx.fill();
          strich(ctx, '#888', 0.5, x - 23, fy - 13, x - 23, fy - 3); strich(ctx, '#888', 0.5, x - 46, fy - 13, x - 46, fy - 3);
          for (let k = 0; k < 3; k++) strich(ctx, 'rgba(255,255,255,.7)', 0.8, x - 76 - k * 6, fy - 11 + k * 3, x - 90 - k * 6, fy - 11 + k * 3);
        }
      }
      ctx.restore();
      break;
    }
  }
}
