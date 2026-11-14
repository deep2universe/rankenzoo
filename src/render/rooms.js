// Innenausstattung der Kammern: statisch (vorgerendert) & animiert (pro Frame).
import { shade, mulberry32 } from '../util.js';
import { drawEgg, drawLarva, drawPupa } from './antdraw.js';
import { drawEmoji, drawAntFast, cached, drawGlow } from './sprites.js';

/** Emoji zeichnen (über Sprite-Cache – Farb-Emojis zu rastern ist teuer). */
export const emoji = drawEmoji;
const drawAnt = drawAntFast;
// Brut als kleine Sprites (statt pro Bild Farbverläufe zu bauen)
const EI = () => cached('ei', 8, 10, c => drawEgg(c, 4, 5, 3), 4);
const LARVE = () => cached('larve', 10, 9, c => drawLarva(c, 5, 4.5, 3.6, 0), 4);
const PUPPE = () => cached('puppe', 11, 8, c => drawPupa(c, 5.5, 4, 3.6), 4);

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

function plank(ctx, x, y, w, h, c = '#a8743f') {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, shade(c, 0.25)); g.addColorStop(1, shade(c, -0.25));
  ctx.fillStyle = g;
  rr(ctx, x, y, w, h, Math.min(3, h / 2)); ctx.fill();
}

function bookshelf(ctx, x, y, w, h, seed) {
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

function sign(ctx, cx, y, icon) {
  ctx.strokeStyle = 'rgba(60,40,20,.8)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - 7, y - 4); ctx.lineTo(cx - 5, y + 2); ctx.moveTo(cx + 7, y - 4); ctx.lineTo(cx + 5, y + 2); ctx.stroke();
  plank(ctx, cx - 11, y + 1, 22, 16, '#c08a4e');
  emoji(ctx, icon, cx, y + 14, 11);
}

function lampe(ctx, x, y) {
  ctx.strokeStyle = 'rgba(40,25,10,.8)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x, y - 2); ctx.stroke();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath(); ctx.arc(x, y + 1, 3.5, 0, 7); ctx.fill();
}

/** Gibt Lampenpositionen (für Lichtschein) zurück. */
export function lampPositions(room, g, rx, ry, rw) {
  if (g.zone === 'oberflaeche') return [];
  const n = rw > 110 ? 2 : 1;
  const out = [];
  for (let i = 0; i < n; i++) out.push([rx + rw * (n === 1 ? 0.5 : 0.28 + i * 0.44), ry + 14]);
  return out;
}

export function drawRoomStatic(ctx, room, g, rx, ry, rw, rh) {
  const fertig = room.bau >= 1;
  if (g.zone === 'oberflaeche') return drawSurfaceStatic(ctx, room, g, rx, ry, rw, rh, fertig);
  const rad = Math.min(rh * 0.42, 26);
  ctx.save();
  rr(ctx, rx + 5, ry + 5, rw - 10, rh - 10, rad);
  ctx.clip();
  // Wand
  const wg = ctx.createLinearGradient(0, ry, 0, ry + rh);
  if (fertig) {
    wg.addColorStop(0, shade(g.farbe, -0.72));
    wg.addColorStop(0.7, shade(g.farbe, -0.55));
    wg.addColorStop(1, shade(g.farbe, -0.62));
  } else {
    wg.addColorStop(0, '#3a2414'); wg.addColorStop(1, '#4e321c');
  }
  ctx.fillStyle = wg;
  ctx.fillRect(rx, ry, rw, rh);
  // Wandstruktur
  const rnd = mulberry32(room.id * 97);
  ctx.fillStyle = 'rgba(255,255,255,.035)';
  for (let i = 0; i < rw * rh / 120; i++) {
    ctx.beginPath(); ctx.arc(rx + rnd() * rw, ry + rnd() * rh, 1 + rnd() * 3, 0, 7); ctx.fill();
  }
  // Boden
  const fy = ry + rh - 13;
  const fg = ctx.createLinearGradient(0, fy, 0, ry + rh);
  fg.addColorStop(0, fertig ? '#8a5a34' : '#5b3a20'); fg.addColorStop(1, '#4a2e18');
  ctx.fillStyle = fg;
  ctx.fillRect(rx, fy, rw, rh);
  ctx.fillStyle = 'rgba(255,230,190,.12)';
  ctx.fillRect(rx, fy, rw, 1.5);
  if (!fertig) {
    drawConstructionStatic(ctx, rx, ry, rw, rh, fy, rnd);
    ctx.restore();
    return;
  }
  const cx = rx + rw / 2;
  const P = PROPS[room.typ];
  if (P) P(ctx, { rx, ry, rw, rh, fy, cx, rnd, g, room });
  ctx.restore();
  sign(ctx, rx + 18, ry + 2, g.icon);
  for (const [lx, ly] of lampPositions(room, g, rx, ry, rw)) lampe(ctx, lx, ly);
}

function drawConstructionStatic(ctx, rx, ry, rw, rh, fy, rnd) {
  // Erdhaufen
  for (let i = 0; i < 4; i++) {
    const x = rx + 14 + rnd() * (rw - 28);
    ctx.fillStyle = '#6e4626';
    ctx.beginPath(); ctx.ellipse(x, fy + 2, 10 + rnd() * 8, 7 + rnd() * 4, 0, Math.PI, 0); ctx.fill();
  }
  // Gerüst
  ctx.strokeStyle = '#c99252'; ctx.lineWidth = 3;
  for (let x = rx + 16; x < rx + rw - 10; x += 26) {
    ctx.beginPath(); ctx.moveTo(x, fy + 2); ctx.lineTo(x, ry + 10); ctx.stroke();
  }
  ctx.lineWidth = 2.5;
  for (let y = ry + 18; y < fy; y += 18) {
    ctx.beginPath(); ctx.moveTo(rx + 10, y); ctx.lineTo(rx + rw - 10, y); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(201,146,82,.6)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(rx + 16, fy); ctx.lineTo(rx + rw - 16, ry + 14); ctx.stroke();
  emoji(ctx, '🚧', rx + rw - 18, fy - 2, 14);
}

// Einrichtung je Kammertyp – Signatur: (ctx, p)
const PROPS = {};
Object.assign(PROPS, {
  koenigin(ctx, { rx, rw, fy, cx, ry }) {
    // roter Teppich
    const g = ctx.createLinearGradient(0, fy, 0, fy + 10);
    g.addColorStop(0, '#d8344f'); g.addColorStop(1, '#8e1f33');
    ctx.fillStyle = g; ctx.fillRect(rx + 16, fy, rw - 32, 6);
    ctx.fillStyle = '#ffd34d'; ctx.fillRect(rx + 16, fy, rw - 32, 1.2);
    // Thron
    const tx = cx + 26;
    const tg = ctx.createLinearGradient(tx - 16, 0, tx + 16, 0);
    tg.addColorStop(0, '#ffe680'); tg.addColorStop(0.5, '#e5a91a'); tg.addColorStop(1, '#b07800');
    ctx.fillStyle = tg;
    rr(ctx, tx - 12, fy - 46, 24, 46, 8); ctx.fill();
    ctx.fillStyle = '#c42c4a';
    rr(ctx, tx - 9, fy - 40, 18, 30, 6); ctx.fill();
    // Wimpel
    const cols = ['#ff5f7e', '#ffd34d', '#5fc8ff', '#8ee26b', '#c48bff'];
    ctx.strokeStyle = 'rgba(255,240,200,.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(rx + 12, ry + 14); ctx.quadraticCurveTo(cx, ry + 30, rx + rw - 12, ry + 14); ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const t = (i + 0.5) / 9;
      const x = rx + 12 + (rw - 24) * t;
      const y = ry + 14 + Math.sin(t * Math.PI) * 12;
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 8); ctx.fill();
    }
  },
  brut(ctx, { rx, rw, fy }) {
    for (let i = 0; i < 3; i++) {
      const x = rx + 16 + i * ((rw - 32) / 2);
      const g = ctx.createRadialGradient(x, fy - 2, 2, x, fy, 16);
      g.addColorStop(0, '#f6e6c4'); g.addColorStop(1, '#b89a6a');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(x, fy, 15, 6, 0, Math.PI, 0); ctx.fill();
    }
  },
  wohnen(ctx, { rx, rw, fy }) {
    const cols = ['#5fa8ff', '#ff7aa8', '#7ddc6f', '#ffc04d'];
    const n = Math.floor((rw - 16) / 26);
    for (let i = 0; i < n; i++) {
      const x = rx + 10 + i * 26;
      plank(ctx, x, fy - 9, 22, 9, '#9a6a3c');
      ctx.fillStyle = cols[i % 4];
      rr(ctx, x + 2, fy - 12, 18, 6, 3); ctx.fill();
      ctx.fillStyle = '#fff';
      rr(ctx, x + 1, fy - 14, 7, 5, 2.5); ctx.fill();
      // obere Etage
      plank(ctx, x, fy - 30, 22, 7, '#9a6a3c');
      ctx.fillStyle = cols[(i + 2) % 4];
      rr(ctx, x + 2, fy - 33, 18, 5, 3); ctx.fill();
      ctx.fillStyle = '#9a6a3c'; ctx.fillRect(x, fy - 30, 2, 30); ctx.fillRect(x + 20, fy - 30, 2, 30);
    }
  },
  vorrat(ctx, { rx, rw, fy }) {
    plank(ctx, rx + 10, fy - 28, rw - 20, 4, '#9a6a3c');
    const items = ['🫙', '🍯', '🌰', '🫙', '🍯', '🌰'];
    const n = Math.floor((rw - 20) / 16);
    for (let i = 0; i < n; i++) emoji(ctx, items[i % items.length], rx + 18 + i * 16, fy - 29, 13);
    for (let i = 0; i < n; i++) emoji(ctx, items[(i + 3) % items.length], rx + 18 + i * 16, fy + 1, 14);
  },
  muell(ctx, { rx, rw, fy }) {
    emoji(ctx, '♻️', rx + rw * 0.3, fy, 15);
    ctx.fillStyle = '#5b4a33';
    ctx.beginPath(); ctx.ellipse(rx + rw * 0.68, fy, 14, 10, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#7a6345';
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(rx + rw * 0.6 + i * 3, fy - 4 - (i % 3) * 2, 2, 0, 7); ctx.fill(); }
  },
  pilz(ctx, { rx, rw, fy, rnd }) {
    for (let i = 0; i < 9; i++) {
      const x = rx + 12 + rnd() * (rw - 24);
      const s = 10 + rnd() * 9;
      emoji(ctx, '🍄', x, fy + 1, s);
    }
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    for (let i = 0; i < 25; i++) { ctx.beginPath(); ctx.arc(rx + 10 + rnd() * (rw - 20), fy - rnd() * 6, 1.2, 0, 7); ctx.fill(); }
  },
  kita(ctx, { rx, rw, fy }) {
    const cols = ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff'];
    for (let i = 0; i < 4; i++) { ctx.fillStyle = cols[i]; ctx.fillRect(rx + 12 + i * ((rw - 24) / 4), fy + 1, (rw - 24) / 4, 4); }
    emoji(ctx, '🧸', rx + 20, fy, 14);
    emoji(ctx, '🧩', rx + rw - 22, fy, 12);
    // Rutsche
    ctx.strokeStyle = '#ff8c42'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(rx + rw * 0.45, fy - 26); ctx.quadraticCurveTo(rx + rw * 0.6, fy - 6, rx + rw * 0.72, fy); ctx.stroke();
    ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(rx + rw * 0.45, fy - 26); ctx.lineTo(rx + rw * 0.43, fy); ctx.stroke();
  },
  baeckerei(ctx, { rx, rw, fy }) {
    // Ofen
    const ox = rx + 14, oy = fy - 34;
    ctx.fillStyle = '#a0472f';
    rr(ctx, ox, oy, 34, 34, [14, 14, 2, 2]); ctx.fill();
    ctx.strokeStyle = 'rgba(60,20,10,.4)'; ctx.lineWidth = 1;
    for (let y = oy + 6; y < fy; y += 6) { ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(ox + 34, y); ctx.stroke(); }
    ctx.fillStyle = '#2a0f06';
    rr(ctx, ox + 8, fy - 18, 18, 14, [8, 8, 0, 0]); ctx.fill();
    // Theke
    plank(ctx, rx + rw - 46, fy - 14, 38, 14, '#c58b52');
    emoji(ctx, '🥐', rx + rw - 38, fy - 15, 11);
    emoji(ctx, '🍞', rx + rw - 24, fy - 15, 11);
    emoji(ctx, '🥨', rx + rw - 13, fy - 15, 10);
  },
  buchhandlung(ctx, { rx, rw, fy, ry, room }) {
    bookshelf(ctx, rx + 10, ry + 20, rw * 0.38, fy - ry - 20, room.id);
    bookshelf(ctx, rx + rw * 0.55, ry + 20, rw * 0.38, fy - ry - 20, room.id + 7);
  },
  apotheke(ctx, { rx, rw, fy, ry, rnd }) {
    plank(ctx, rx + 10, ry + 24, rw - 20, 3, '#ffffff');
    plank(ctx, rx + 10, ry + 40, rw - 20, 3, '#ffffff');
    const cols = ['#6fe0c5', '#ff8fb1', '#ffd36b', '#8fc1ff', '#b18cff'];
    for (let s = 0; s < 2; s++) for (let x = rx + 14; x < rx + rw - 14; x += 8) {
      ctx.fillStyle = cols[(rnd() * cols.length) | 0];
      rr(ctx, x, ry + 24 + s * 16 - 9, 5, 9, 1.5); ctx.fill();
    }
    emoji(ctx, '🌿', rx + 18, fy, 12);
    emoji(ctx, '💊', rx + rw - 18, fy, 11);
  },
  restaurant(ctx, { rx, rw, fy }) {
    const n = Math.floor((rw - 20) / 34);
    for (let i = 0; i < n; i++) {
      const x = rx + 18 + i * 34;
      ctx.fillStyle = '#fff';
      rr(ctx, x - 12, fy - 14, 24, 4, 2); ctx.fill();
      ctx.fillStyle = '#e04848';
      for (let k = 0; k < 6; k++) if (k % 2 === 0) ctx.fillRect(x - 12 + k * 4, fy - 14, 4, 4);
      ctx.fillStyle = '#7a4a24'; ctx.fillRect(x - 1, fy - 10, 2, 10);
      emoji(ctx, '🍽️', x, fy - 15, 9);
    }
  },
  kino(ctx, { rx, rw, fy, ry }) {
    // Leinwand-Rahmen
    ctx.fillStyle = '#8a1f2e';
    rr(ctx, rx + 14, ry + 14, rw - 28, 40, 4); ctx.fill();
    ctx.fillStyle = '#f5f0e6';
    ctx.fillRect(rx + 20, ry + 18, rw - 40, 32);
    // Sitzreihen
    for (let row = 0; row < 2; row++) {
      for (let x = rx + 16 + row * 6; x < rx + rw - 16; x += 13) {
        ctx.fillStyle = row ? '#b8233a' : '#d63a52';
        rr(ctx, x, fy - 9 - row * 0, 10, 9, [4, 4, 1, 1]); ctx.fill();
      }
    }
  },
  moebel(ctx, { rx, rw, fy }) {
    emoji(ctx, '🛋️', rx + rw * 0.3, fy, 18);
    emoji(ctx, '🪑', rx + rw * 0.62, fy, 14);
    emoji(ctx, '🪴', rx + rw * 0.84, fy, 13);
    ctx.fillStyle = '#ffdd8a';
    ctx.font = 'bold 8px Fredoka, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('% SALE %', rx + rw / 2, fy - 30);
  },
  brunnen(ctx, { rx, rw, fy }) {
    const cx = rx + rw / 2;
    ctx.fillStyle = '#8d8a8a';
    rr(ctx, cx - 18, fy - 12, 36, 12, 4); ctx.fill();
    ctx.fillStyle = '#4fa8e8';
    ctx.beginPath(); ctx.ellipse(cx, fy - 12, 15, 4, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#6d6a6a'; ctx.lineWidth = 1;
    for (let x = cx - 16; x < cx + 16; x += 6) { ctx.beginPath(); ctx.moveTo(x, fy - 12); ctx.lineTo(x, fy); ctx.stroke(); }
  },
  sonne(ctx, { rx, rw, fy }) {
    emoji(ctx, '⛱️', rx + rw * 0.28, fy, 16);
    // Liegestühle
    for (const x of [rx + rw * 0.55, rx + rw * 0.78]) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 10, fy); ctx.lineTo(x - 4, fy - 8); ctx.lineTo(x + 8, fy - 8); ctx.stroke();
      ctx.fillStyle = '#ff9f43'; ctx.fillRect(x - 3, fy - 10, 11, 3);
    }
  },
  universitaet(ctx, { rx, rw, fy, ry, room }) {
    // Tafel
    const bx = rx + rw * 0.32, bw = rw * 0.42;
    ctx.fillStyle = '#7a4d2a'; rr(ctx, bx - 3, ry + 16, bw + 6, 36, 3); ctx.fill();
    ctx.fillStyle = '#1f4a38'; ctx.fillRect(bx, ry + 19, bw, 30);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.font = '8px "Comic Sans MS", Fredoka, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('7 · 8 = 56', bx + 5, ry + 29);
    ctx.fillText('Ameise → Nomen', bx + 5, ry + 39);
    ctx.fillText('H₂O 💧', bx + 5, ry + 47);
    // Pult
    plank(ctx, bx + bw * 0.4, fy - 16, 18, 16, '#9a6a3c');
    bookshelf(ctx, rx + 10, ry + 22, rw * 0.18, fy - ry - 22, room.id + 3);
    bookshelf(ctx, rx + rw * 0.79, ry + 22, rw * 0.13, fy - ry - 22, room.id + 5);
    emoji(ctx, '🎓', rx + rw - 22, ry + 22, 11);
  },
  einkauf(ctx, { rx, rw, fy, ry }) {
    const cols = [['#ff6b8b', '#fff'], ['#4fb4ff', '#fff'], ['#ffc93c', '#fff'], ['#6bd36b', '#fff']];
    const shops = ['👗', '🧃', '🎈', '🛼'];
    const n = 4, sw = (rw - 20) / n;
    for (let i = 0; i < n; i++) {
      const x = rx + 10 + i * sw;
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x + 2, ry + 30, sw - 4, fy - ry - 30);
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = cols[i][k % 2];
        ctx.beginPath(); ctx.moveTo(x + k * (sw / 5), ry + 22); ctx.lineTo(x + (k + 1) * (sw / 5), ry + 22);
        ctx.lineTo(x + (k + 1) * (sw / 5), ry + 30); ctx.arc(x + (k + 0.5) * (sw / 5), ry + 30, sw / 10, 0, Math.PI); ctx.fill();
      }
      emoji(ctx, shops[i], x + sw / 2, fy - 8, 14);
    }
  },
  hochzeit(ctx, { rx, rw, fy }) {
    ctx.fillStyle = '#d0d6dc';
    rr(ctx, rx + 10, fy - 4, rw - 20, 5, 2); ctx.fill();
    ctx.fillStyle = '#ffcf3a';
    ctx.font = 'bold 13px Fredoka, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('H', rx + rw / 2, fy - 6);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(rx + rw / 2, fy - 10, 11, 0, 7); ctx.stroke();
  },

  sporthalle(ctx, { rx, rw, fy, ry }) {
    // Hallenboden mit Linien
    ctx.fillStyle = '#d9a35e'; ctx.fillRect(rx + 8, fy - 2, rw - 16, 4);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(rx + rw / 2, fy - 2); ctx.lineTo(rx + rw / 2, fy + 2); ctx.stroke();
    // Sprossenwand
    ctx.strokeStyle = '#b07a40'; ctx.lineWidth = 2;
    for (let x = rx + 12; x <= rx + 30; x += 18) { ctx.beginPath(); ctx.moveTo(x, ry + 12); ctx.lineTo(x, fy); ctx.stroke(); }
    for (let y = ry + 16; y < fy; y += 6) { ctx.beginPath(); ctx.moveTo(rx + 12, y); ctx.lineTo(rx + 30, y); ctx.stroke(); }
    // Basketballkorb
    ctx.fillStyle = '#fff'; ctx.fillRect(rx + rw - 22, ry + 14, 12, 9);
    ctx.strokeStyle = '#ff6b2b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(rx + rw - 24, ry + 24, 5, 1.5, 0, 0, 7); ctx.stroke();
    emoji(ctx, '🏋️', rx + rw * 0.45, fy, 13);
  },
  eisladen(ctx, { rx, rw, fy, ry }) {
    // Theke mit Eiswannen
    plank(ctx, rx + 10, fy - 14, rw - 20, 14, '#ffc9e3');
    const cols = ['#ffe0f0', '#a8e6cf', '#ffd38a', '#c39bff', '#8a5a34'];
    for (let i = 0; i < 5; i++) { ctx.fillStyle = cols[i]; rr(ctx, rx + 14 + i * ((rw - 28) / 5), fy - 17, (rw - 28) / 5 - 2, 6, 3); ctx.fill(); }
    // Markise
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#ff7aa8'; ctx.beginPath(); const x = rx + 8 + i * ((rw - 16) / 6), w = (rw - 16) / 6; ctx.moveTo(x, ry + 9); ctx.lineTo(x + w, ry + 9); ctx.lineTo(x + w, ry + 16); ctx.arc(x + w / 2, ry + 16, w / 2, 0, Math.PI); ctx.fill(); }
    emoji(ctx, '🍦', rx + rw - 16, fy - 18, 12);
  },
  schuhladen(ctx, { rx, rw, fy, ry }) {
    plank(ctx, rx + 10, ry + 22, rw - 20, 3, '#c58b52');
    plank(ctx, rx + 10, ry + 36, rw - 20, 3, '#c58b52');
    const cols = ['#ff5a5a', '#4fa3ff', '#ffd23f', '#5fd068', '#b07cff'];
    for (let s2 = 0; s2 < 2; s2++) for (let i = 0; i < 6; i++) {
      const x = rx + 14 + i * ((rw - 28) / 6), y = ry + 22 + s2 * 14;
      ctx.fillStyle = cols[(i + s2 * 2) % 5];
      ctx.beginPath(); ctx.ellipse(x + 3, y - 2, 3.5, 2, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(x - 0.5, y - 2, 7, 2);
    }
    emoji(ctx, '👟', rx + rw * 0.3, fy, 12);
    ctx.fillStyle = '#ffdd8a'; ctx.font = 'bold 7px Fredoka, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('6 = 1 PAAR', rx + rw * 0.66, fy - 3);
  },
  friseur(ctx, { rx, rw, fy, ry }) {
    // Spiegel
    for (const x of [rx + rw * 0.3, rx + rw * 0.66]) {
      ctx.fillStyle = '#f2d06b'; rr(ctx, x - 10, ry + 14, 20, 24, 10); ctx.fill();
      const g2 = ctx.createLinearGradient(x - 8, ry + 16, x + 8, ry + 36); g2.addColorStop(0, '#e8f6ff'); g2.addColorStop(1, '#9fc8e8');
      ctx.fillStyle = g2; rr(ctx, x - 8, ry + 16, 16, 20, 8); ctx.fill();
      ctx.fillStyle = '#c42c4a'; rr(ctx, x - 7, fy - 9, 14, 9, 3); ctx.fill();
    }
    emoji(ctx, '✂️', rx + rw - 12, fy - 2, 10);
  },
  schule(ctx, { rx, rw, fy, ry }) {
    const bx = rx + 16, bw = rw * 0.55;
    ctx.fillStyle = '#7a4d2a'; rr(ctx, bx - 3, ry + 12, bw + 6, 30, 3); ctx.fill();
    ctx.fillStyle = '#245a40'; ctx.fillRect(bx, ry + 15, bw, 24);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '8px "Comic Sans MS", Fredoka, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('A B C  1 2 3', bx + 4, ry + 25); ctx.fillText('🐜 + 🐜 = 2', bx + 4, ry + 35);
    // Bänke
    for (let i = 0; i < 3; i++) plank(ctx, rx + 18 + i * 22, fy - 8, 16, 4, '#c58b52');
    emoji(ctx, '🎒', rx + rw - 18, fy, 12);
    emoji(ctx, '🌍', rx + rw - 18, ry + 30, 12);
  },
  wache(ctx, { rx, rw, fy, ry }) {
    // Wappen & Speere (aus Tannennadeln)
    ctx.fillStyle = '#4f6fb0'; ctx.beginPath(); ctx.moveTo(rx + rw / 2 - 12, ry + 12); ctx.lineTo(rx + rw / 2 + 12, ry + 12); ctx.lineTo(rx + rw / 2 + 12, ry + 26); ctx.quadraticCurveTo(rx + rw / 2, ry + 38, rx + rw / 2 - 12, ry + 26); ctx.fill();
    ctx.fillStyle = '#ffd34d'; ctx.font = 'bold 11px Fredoka'; ctx.textAlign = 'center'; ctx.fillText('🐜', rx + rw / 2, ry + 28);
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2;
    for (const x of [rx + 14, rx + 20, rx + rw - 20, rx + rw - 14]) { ctx.beginPath(); ctx.moveTo(x, fy); ctx.lineTo(x, ry + 14); ctx.stroke(); }
    emoji(ctx, '🛡️', rx + 26, fy, 11); emoji(ctx, '🛡️', rx + rw - 26, fy, 11);
  },
  spaeher(ctx, { rx, rw, fy, ry }) {
    // Fernrohr auf Stativ & Karte
    ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(rx + rw * 0.4, fy); ctx.lineTo(rx + rw * 0.5, fy - 18); ctx.lineTo(rx + rw * 0.6, fy); ctx.stroke();
    ctx.fillStyle = '#c9a050'; ctx.save(); ctx.translate(rx + rw * 0.5, fy - 20); ctx.rotate(-0.5); rr(ctx, -12, -3, 24, 6, 3); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#f3e1b0'; ctx.fillRect(rx + 8, ry + 12, 14, 12);
    ctx.strokeStyle = '#b8231f'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(rx + 10, ry + 22); ctx.quadraticCurveTo(rx + 15, ry + 14, rx + 20, ry + 17); ctx.stroke();
  },
  labor(ctx, { rx, rw, fy, ry }) {
    plank(ctx, rx + 10, fy - 16, rw - 20, 16, '#e8eef4');
    const cols = ['#5fd068', '#ff6b9b', '#4fa3ff', '#ffd23f'];
    for (let i = 0; i < 4; i++) {
      const x = rx + 22 + i * ((rw - 44) / 3);
      ctx.fillStyle = 'rgba(220,240,255,.8)'; ctx.beginPath(); ctx.moveTo(x - 3, fy - 32); ctx.lineTo(x + 3, fy - 32); ctx.lineTo(x + 3, fy - 26); ctx.lineTo(x + 8, fy - 17); ctx.lineTo(x - 8, fy - 17); ctx.lineTo(x - 3, fy - 26); ctx.fill();
      ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.moveTo(x - 6, fy - 20); ctx.lineTo(x + 6, fy - 20); ctx.lineTo(x + 8, fy - 17); ctx.lineTo(x - 8, fy - 17); ctx.fill();
    }
    // Mikroskop & Tafel mit Formeln
    emoji(ctx, '🔬', rx + rw - 20, fy - 16, 14);
    ctx.fillStyle = '#1f3a4a'; ctx.fillRect(rx + 14, ry + 14, rw * 0.4, 22);
    ctx.fillStyle = 'rgba(160,240,255,.85)'; ctx.font = '7px monospace'; ctx.textAlign = 'left';
    ctx.fillText('C₁₀H₁₆O = 🐜💨', rx + 17, ry + 24); ctx.fillText('Duft → Weg ✓', rx + 17, ry + 32);
  },
  theater(ctx, { rx, rw, fy, ry }) {
    // Bühne & Vorhang
    plank(ctx, rx + 12, fy - 22, rw - 24, 6, '#9a6a3c');
    ctx.fillStyle = '#b8233a';
    ctx.beginPath(); ctx.moveTo(rx + 10, ry + 10); ctx.lineTo(rx + 30, ry + 10); ctx.quadraticCurveTo(rx + 22, ry + 40, rx + 30, fy - 22); ctx.lineTo(rx + 10, fy - 22); ctx.fill();
    ctx.beginPath(); ctx.moveTo(rx + rw - 10, ry + 10); ctx.lineTo(rx + rw - 30, ry + 10); ctx.quadraticCurveTo(rx + rw - 22, ry + 40, rx + rw - 30, fy - 22); ctx.lineTo(rx + rw - 10, fy - 22); ctx.fill();
    ctx.fillStyle = '#ffd34d'; ctx.fillRect(rx + 10, ry + 8, rw - 20, 4);
    for (let x = rx + 16; x < rx + rw - 16; x += 11) { ctx.fillStyle = '#7a1f2e'; rr(ctx, x, fy - 9, 9, 9, [4, 4, 1, 1]); ctx.fill(); }
    emoji(ctx, '🎭', rx + rw / 2, ry + 30, 14);
  },
  musikschule(ctx, { rx, rw, fy, ry }) {
    // Klavier
    ctx.fillStyle = '#2a1a14'; rr(ctx, rx + 10, fy - 26, 34, 26, 3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(rx + 12, fy - 14, 30, 5);
    ctx.fillStyle = '#111'; for (let i = 0; i < 6; i++) ctx.fillRect(rx + 14 + i * 5, fy - 14, 2, 3);
    emoji(ctx, '🎻', rx + rw - 30, fy, 14);
    emoji(ctx, '🥁', rx + rw - 14, fy, 12);
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(rx + 50, ry + 12 + i * 3); ctx.lineTo(rx + rw - 10, ry + 12 + i * 3); ctx.stroke(); }
  },
  bank(ctx, { rx, rw, fy, ry }) {
    // Tresor
    ctx.fillStyle = '#7a828c'; rr(ctx, rx + rw - 40, fy - 32, 28, 32, 4); ctx.fill();
    ctx.strokeStyle = '#4a525c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(rx + rw - 26, fy - 16, 7, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx + rw - 26, fy - 23); ctx.lineTo(rx + rw - 26, fy - 9); ctx.moveTo(rx + rw - 33, fy - 16); ctx.lineTo(rx + rw - 19, fy - 16); ctx.stroke();
    plank(ctx, rx + 10, fy - 14, 40, 14, '#c58b52');
    for (let i = 0; i < 4; i++) { ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.ellipse(rx + 18 + i * 3, fy - 15 - i * 2.5, 6, 2, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#c99a00'; ctx.lineWidth = 0.6; ctx.stroke(); }
    emoji(ctx, '🪙', rx + 42, fy - 14, 10);
  },
  schwimmbad(ctx, { rx, rw, fy, ry }) {
    // Becken
    ctx.fillStyle = '#d8e4ec'; rr(ctx, rx + 12, fy - 18, rw - 24, 18, 4); ctx.fill();
    const g2 = ctx.createLinearGradient(0, fy - 16, 0, fy); g2.addColorStop(0, '#6fd0ff'); g2.addColorStop(1, '#2a8fd0');
    ctx.fillStyle = g2; rr(ctx, rx + 15, fy - 15, rw - 30, 13, 3); ctx.fill();
    // Sprungbrett & Leiter
    plank(ctx, rx + 8, fy - 24, 22, 3, '#ffffff');
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(rx + rw - 18, fy - 26); ctx.lineTo(rx + rw - 18, fy - 14); ctx.moveTo(rx + rw - 13, fy - 26); ctx.lineTo(rx + rw - 13, fy - 14); ctx.stroke();
    emoji(ctx, '🛟', rx + rw - 34, ry + 26, 11);
  },
  rathaus(ctx, { rx, rw, fy, ry, cx }) {
    // Säulen & Giebel
    ctx.fillStyle = '#efe0bd';
    ctx.beginPath(); ctx.moveTo(cx - 40, ry + 26); ctx.lineTo(cx, ry + 10); ctx.lineTo(cx + 40, ry + 26); ctx.fill();
    for (let i = 0; i < 5; i++) { const x = cx - 34 + i * 17; ctx.fillStyle = '#f6ecd4'; ctx.fillRect(x - 3, ry + 27, 6, fy - ry - 27); ctx.fillStyle = 'rgba(0,0,0,.1)'; ctx.fillRect(x + 1, ry + 27, 2, fy - ry - 27); }
    ctx.fillStyle = '#d8c69c'; ctx.fillRect(cx - 42, ry + 25, 84, 3);
    // Uhr
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, ry + 20, 4.5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(cx, ry + 20); ctx.lineTo(cx, ry + 17); ctx.moveTo(cx, ry + 20); ctx.lineTo(cx + 2, ry + 20); ctx.stroke();
    // roter Teppich
    ctx.fillStyle = '#c42c4a'; ctx.fillRect(cx - 14, fy - 1, 28, 4);
  },
});

function drawSurfaceStatic(ctx, room, g, rx, ry, rw, rh, fertig) {
  const fy = ry + rh;
  if (!fertig) {
    ctx.fillStyle = '#6e4626';
    ctx.beginPath(); ctx.ellipse(rx + rw / 2, fy, rw / 2 - 4, 8, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#c99252'; ctx.lineWidth = 3;
    for (let x = rx + 8; x < rx + rw; x += 22) { ctx.beginPath(); ctx.moveTo(x, fy); ctx.lineTo(x, ry + 8); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(rx + 4, ry + 20); ctx.lineTo(rx + rw - 4, ry + 20); ctx.stroke();
    emoji(ctx, '🚧', rx + rw / 2, fy - 4, 16);
    return;
  }
  if (room.typ === 'fussball') {
    const top = fy - 18;
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#52b84a' : '#62c958';
      ctx.fillRect(rx + 4 + i * ((rw - 8) / 8), top, (rw - 8) / 8, 18);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(rx + 6, top + 2, rw - 12, 14);
    ctx.beginPath(); ctx.moveTo(rx + rw / 2, top + 2); ctx.lineTo(rx + rw / 2, top + 16); ctx.stroke();
    // Tore
    for (const gx of [rx + 4, rx + rw - 12]) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.strokeRect(gx, top - 18, 8, 20);
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 0.7;
      for (let k = 2; k < 20; k += 4) { ctx.beginPath(); ctx.moveTo(gx, top - 18 + k); ctx.lineTo(gx + 8, top - 18 + k); ctx.stroke(); }
    }
    // Fahnen
    for (const fx of [rx + rw / 2 - 30, rx + rw / 2 + 30]) {
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(fx, top); ctx.lineTo(fx, top - 34); ctx.stroke();
    }
    return;
  }
  if (room.typ === 'tankstelle') {
    // Dach
    ctx.fillStyle = '#ffd23f';
    rr(ctx, rx + 4, ry + 6, rw - 8, 9, 3); ctx.fill();
    ctx.fillStyle = '#e8a400'; ctx.fillRect(rx + 4, ry + 13, rw - 8, 3);
    ctx.fillStyle = '#ccc'; ctx.fillRect(rx + 10, ry + 15, 3, rh - 15); ctx.fillRect(rx + rw - 13, ry + 15, 3, rh - 15);
    // Säule
    const px = rx + rw / 2 - 10;
    ctx.fillStyle = '#ff5a5a'; rr(ctx, px, fy - 30, 20, 30, 4); ctx.fill();
    ctx.fillStyle = '#ffffff'; rr(ctx, px + 3, fy - 26, 14, 8, 2); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px + 20, fy - 20); ctx.quadraticCurveTo(px + 30, fy - 10, px + 26, fy - 2); ctx.stroke();
    emoji(ctx, '🍯', px + 10, fy - 4, 9);
    ctx.fillStyle = '#4a3000';
    ctx.font = 'bold 6px Fredoka, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('HONIGTAU', rx + rw / 2, ry + 13);
    return;
  }
  if (room.typ === 'spielplatz') {
    // Sandkasten, Rutsche, Schaukelgerüst
    ctx.fillStyle = '#e8cf8a'; rr(ctx, rx + 6, fy - 6, 34, 6, 3); ctx.fill();
    ctx.strokeStyle = '#c99252'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(rx + rw - 54, fy); ctx.lineTo(rx + rw - 44, fy - 40); ctx.lineTo(rx + rw - 34, fy); ctx.moveTo(rx + rw - 22, fy); ctx.lineTo(rx + rw - 12, fy - 40); ctx.lineTo(rx + rw - 2, fy); ctx.moveTo(rx + rw - 46, fy - 38); ctx.lineTo(rx + rw - 10, fy - 38); ctx.stroke();
    ctx.strokeStyle = '#ff8c42'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(rx + 52, fy - 30); ctx.quadraticCurveTo(rx + 62, fy - 6, rx + 76, fy); ctx.stroke();
    ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rx + 52, fy - 30); ctx.lineTo(rx + 50, fy); ctx.stroke();
    emoji(ctx, '🪣', rx + 20, fy - 4, 10);
    return;
  }
  if (room.typ === 'handel') {
    // Marktstand mit Markise und Kisten
    ctx.fillStyle = '#9a6a3c'; ctx.fillRect(rx + 8, ry + 14, 3, rh - 14); ctx.fillRect(rx + rw - 11, ry + 14, 3, rh - 14);
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#3cc483'; const x = rx + 4 + i * ((rw - 8) / 8), w = (rw - 8) / 8; ctx.beginPath(); ctx.moveTo(x, ry + 6); ctx.lineTo(x + w, ry + 6); ctx.lineTo(x + w, ry + 15); ctx.arc(x + w / 2, ry + 15, w / 2, 0, Math.PI); ctx.fill(); }
    plank(ctx, rx + 12, fy - 16, rw - 24, 16, '#c58b52');
    emoji(ctx, '🍯', rx + 26, fy - 16, 11); emoji(ctx, '🌰', rx + rw / 2, fy - 16, 11); emoji(ctx, '🪵', rx + rw - 26, fy - 16, 11);
    ctx.fillStyle = '#3b2300'; ctx.font = 'bold 7px Fredoka'; ctx.textAlign = 'center'; ctx.fillText('TAUSCH', rx + rw / 2, fy - 5);
    return;
  }
  if (room.typ === 'bahnhof') {
    // Bahnsteig, Dach, Gleis
    ctx.fillStyle = '#8a8a8a'; ctx.fillRect(rx + 2, fy - 3, rw - 4, 3);
    ctx.fillStyle = '#5a3a22'; for (let x = rx + 4; x < rx + rw - 4; x += 8) ctx.fillRect(x, fy - 2, 4, 2);
    ctx.fillStyle = '#d9534f'; rr(ctx, rx + 6, ry + 8, rw - 12, 8, 3); ctx.fill();
    ctx.fillStyle = '#ccc'; ctx.fillRect(rx + 12, ry + 16, 3, rh - 22); ctx.fillRect(rx + rw - 15, ry + 16, 3, rh - 22);
    ctx.fillStyle = '#fff'; rr(ctx, rx + rw / 2 - 18, ry + 18, 36, 9, 2); ctx.fill();
    ctx.fillStyle = '#333'; ctx.font = 'bold 6px Fredoka'; ctx.textAlign = 'center'; ctx.fillText('DUFTSPUR', rx + rw / 2, ry + 25);
    return;
  }
  if (room.typ === 'blattlaus') {
    // Zaun
    ctx.strokeStyle = '#c99a62'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(rx + 2, fy - 10); ctx.lineTo(rx + rw - 2, fy - 10); ctx.moveTo(rx + 2, fy - 4); ctx.lineTo(rx + rw - 2, fy - 4); ctx.stroke();
    for (let x = rx + 4; x < rx + rw; x += 12) { ctx.beginPath(); ctx.moveTo(x, fy); ctx.lineTo(x, fy - 14); ctx.stroke(); }
    // Pflanzen
    for (let i = 0; i < 3; i++) {
      const x = rx + 18 + i * ((rw - 36) / 2);
      ctx.strokeStyle = '#3e8e2e'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x, fy); ctx.quadraticCurveTo(x - 4, fy - 30, x + 2, fy - rh + 6); ctx.stroke();
      ctx.fillStyle = '#5cc94a';
      for (let k = 0; k < 4; k++) {
        const ly = fy - 12 - k * 11, s = k % 2 ? 1 : -1;
        ctx.beginPath(); ctx.ellipse(x + s * 7, ly, 8, 3.5, s * 0.5, 0, 7); ctx.fill();
      }
    }
    return;
  }
}

/** Animierte Details pro Frame. info: {t, brut:{ei,larve,puppe}, eff, verbunden, nacht} */
export function drawRoomDynamic(ctx, room, g, rx, ry, rw, rh, info) {
  const t = info.t;
  const fy = g.zone === 'oberflaeche' ? ry + rh : ry + rh - 13;
  const cx = rx + rw / 2;
  if (room.bau < 1) return;
  switch (room.typ) {
    case 'koenigin': {
      const breathe = Math.sin(t * 1.5) * 0.6;
      drawAnt(ctx, { x: cx - 8, y: fy - 8 + breathe, L: 46, dir: 1, rolle: 'koenigin', phase: t * 1.2, walking: false });
      break;
    }
    case 'pilz': {
      ctx.fillStyle = 'rgba(230,210,255,.6)';
      for (let i = 0; i < 8; i++) {
        const p = (t * 0.15 + i * 0.137) % 1;
        const x = rx + 14 + ((i * 37) % (rw - 28)) + Math.sin(t + i) * 4;
        ctx.globalAlpha = Math.sin(p * Math.PI) * 0.8;
        ctx.beginPath(); ctx.arc(x, fy - 6 - p * (rh - 30), 1.4, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'baeckerei': {
      const fl = 0.6 + Math.sin(t * 9) * 0.15 + Math.sin(t * 13) * 0.1;
      drawGlow(ctx, '255,170,60', rx + 31, fy - 10, 14, fl);
      steam(ctx, rx + rw - 30, fy - 24, t);
      break;
    }
    case 'restaurant': steam(ctx, rx + 18, fy - 20, t); if (rw > 100) steam(ctx, rx + 86, fy - 20, t + 1.3); break;
    case 'kino': {
      const sx = rx + 20, sy = ry + 18, sw = rw - 40, sh = 32;
      const hue = (t * 40) % 360;
      ctx.fillStyle = `hsl(${hue},70%,72%)`;
      ctx.fillRect(sx, sy, sw, sh);
      ctx.fillStyle = `hsl(${(hue + 180) % 360},60%,40%)`;
      ctx.fillRect(sx, sy + sh - 8, sw, 8);
      const bx = sx + ((t * 30) % (sw + 20)) - 10;
      ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip();
      drawAnt(ctx, { x: bx, y: sy + sh - 10, L: 18, dir: 1, phase: t * 12, rolle: 'arbeiterin' });
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(bx + 18, sy + sh - 14 - Math.abs(Math.sin(t * 5)) * 10, 3, 0, 7); ctx.fill();
      ctx.restore();
      // Lichtkegel
      ctx.fillStyle = 'rgba(255,255,220,.06)';
      ctx.beginPath(); ctx.moveTo(cx, fy - 4); ctx.lineTo(sx, sy + sh); ctx.lineTo(sx + sw, sy + sh); ctx.fill();
      break;
    }
    case 'brunnen': {
      for (let i = 0; i < 2; i++) {
        const p = (t * 0.5 + i * 0.5) % 1;
        ctx.strokeStyle = `rgba(200,235,255,${1 - p})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(cx, fy - 12, 3 + p * 12, 1 + p * 3, 0, 0, 7); ctx.stroke();
      }
      const dp = (t * 0.8) % 1;
      ctx.fillStyle = '#9fd8ff';
      ctx.beginPath(); ctx.arc(cx, ry + 10 + dp * (fy - ry - 22), 2, 0, 7); ctx.fill();
      break;
    }
    case 'sonne': {
      const p = 0.5 + Math.sin(t * 2) * 0.15;
      drawGlow(ctx, '255,220,110', cx, ry + 14, rw * 0.6, p);
      break;
    }
    case 'blattlaus': {
      for (let i = 0; i < 3; i++) {
        const x = rx + 18 + i * ((rw - 36) / 2);
        for (let k = 0; k < 4; k++) {
          const ly = fy - 14 - k * 11 + Math.sin(t * 3 + k + i) * 0.8;
          ctx.fillStyle = '#9be05a';
          ctx.beginPath(); ctx.ellipse(x + (k % 2 ? 4 : -4), ly, 2.6, 2, 0, 0, 7); ctx.fill();
          ctx.fillStyle = '#2a4a10';
          ctx.beginPath(); ctx.arc(x + (k % 2 ? 6 : -6), ly - 0.5, 0.7, 0, 7); ctx.fill();
        }
      }
      break;
    }
    case 'tankstelle': {
      ctx.fillStyle = Math.sin(t * 4) > 0 ? '#3aff7a' : '#1a9a40';
      ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center';
      ctx.fillText('100%', cx, fy - 20);
      break;
    }
    case 'fussball': {
      const top = fy - 18;
      const p = (Math.sin(t * 1.3) + 1) / 2;
      const bx = rx + 22 + p * (rw - 44);
      const by = top + 8 - Math.abs(Math.sin(t * 5)) * 10;
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(bx, top + 12, 3, 1, 0, 0, 7); ctx.fill();
      emoji(ctx, '⚽', bx, by + 4, 9);
      break;
    }
    case 'einkauf': {
      for (let i = 0; i < 10; i++) {
        const on = Math.sin(t * 5 + i * 1.3) > 0.2;
        ctx.fillStyle = on ? ['#ffe066', '#ff6b8b', '#6bd3ff'][i % 3] : 'rgba(255,255,255,.15)';
        ctx.beginPath(); ctx.arc(rx + 14 + i * ((rw - 28) / 9), ry + 17, 1.8, 0, 7); ctx.fill();
      }
      break;
    }
    case 'hochzeit': {
      const w = Math.sin(t * 3) * 0.3;
      ctx.save(); ctx.translate(rx + rw - 14, fy - 2);
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -24); ctx.stroke();
      ctx.rotate(w);
      ctx.fillStyle = '#ff7a3d';
      ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(14, -21); ctx.lineTo(14, -17); ctx.lineTo(0, -16); ctx.fill();
      ctx.restore();
      break;
    }
    case 'kita': {
      const a = Math.sin(t * 2) * 0.25;
      ctx.save(); ctx.translate(rx + rw * 0.3, fy - 2); ctx.rotate(a);
      emoji(ctx, '🪀', 0, 0, 10);
      ctx.restore();
      break;
    }
    case 'sporthalle': {
      const bx = rx + 40 + Math.sin(t * 1.4) * (rw - 80) * 0.4, by = fy - 6 - Math.abs(Math.sin(t * 5)) * 22;
      ctx.fillStyle = '#ff7a2b'; ctx.beginPath(); ctx.arc(bx, by, 3.5, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(bx - 3.5, by); ctx.lineTo(bx + 3.5, by); ctx.stroke();
      break;
    }
    case 'theater': {
      const a = 0.18 + Math.sin(t * 1.3) * 0.06;
      ctx.fillStyle = `rgba(255,250,200,${a})`;
      ctx.beginPath(); ctx.moveTo(cx + Math.sin(t * 0.7) * 20, ry + 10); ctx.lineTo(cx - 22 + Math.sin(t * 0.7) * 20, fy - 22); ctx.lineTo(cx + 22 + Math.sin(t * 0.7) * 20, fy - 22); ctx.fill();
      drawAnt(ctx, { x: cx + Math.sin(t * 0.7) * 20, y: fy - 25, L: 14, dir: Math.cos(t * 0.7) > 0 ? 1 : -1, phase: t * 3, acc: 'zylinder' });
      break;
    }
    case 'schwimmbad': {
      for (let i = 0; i < 3; i++) {
        const p = (t * 0.4 + i / 3) % 1;
        ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - p)})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(rx + 30 + i * ((rw - 60) / 2), fy - 9, 3 + p * 10, 1 + p * 2, 0, 0, 7); ctx.stroke();
      }
      const sx = rx + 30 + ((t * 18) % (rw - 60));
      drawEmoji(ctx, '🐜', sx, fy - 6, 8);
      break;
    }
    case 'labor': {
      for (let i = 0; i < 4; i++) {
        const p = (t * 0.8 + i * 0.27) % 1, x = rx + 22 + i * ((rw - 44) / 3);
        ctx.fillStyle = `rgba(220,255,240,${0.7 * (1 - p)})`;
        ctx.beginPath(); ctx.arc(x + Math.sin(t * 3 + i) * 1.5, fy - 33 - p * 16, 1.4 + p * 1.5, 0, 7); ctx.fill();
      }
      break;
    }
    case 'musikschule': {
      for (let i = 0; i < 3; i++) {
        const p = (t * 0.35 + i / 3) % 1;
        ctx.globalAlpha = Math.sin(p * Math.PI);
        drawEmoji(ctx, i % 2 ? '🎵' : '🎶', rx + 30 + p * (rw - 50), ry + 34 - Math.sin(p * 6 + i) * 6, 9);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'bank': {
      const p = (t * 0.5) % 1;
      if (p < 0.3) drawGlow(ctx, '255,240,150', rx + 20, fy - 22, 8, Math.sin(p / 0.3 * Math.PI));
      break;
    }
    case 'friseur': {
      for (let i = 0; i < 4; i++) {
        const p = (t * 0.5 + i / 4) % 1;
        ctx.strokeStyle = `rgba(200,240,255,${0.7 * (1 - p)})`; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(rx + rw * 0.3 + Math.sin(t + i) * 6, fy - 12 - p * 26, 1.5 + p * 2, 0, 7); ctx.stroke();
      }
      break;
    }
    case 'eisladen': {
      const p = (Math.sin(t * 2) + 1) / 2;
      drawEmoji(ctx, '🍨', rx + 20 + p * (rw - 50), fy - 1, 10);
      break;
    }
    case 'rathaus': {
      const w = Math.sin(t * 2.5);
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, ry + 10); ctx.lineTo(cx, ry + 1); ctx.stroke();
      ctx.fillStyle = '#ffcf3a'; ctx.beginPath(); ctx.moveTo(cx, ry + 1); ctx.quadraticCurveTo(cx + 5, ry + 2 + w, cx + 10, ry + 2); ctx.lineTo(cx + 10, ry + 6); ctx.quadraticCurveTo(cx + 5, ry + 6 - w, cx, ry + 5); ctx.fill();
      break;
    }
    case 'spielplatz': {
      const a = Math.sin(t * 2.2) * 0.5;
      ctx.save(); ctx.translate(rx + rw - 28, fy - 38); ctx.rotate(a);
      ctx.strokeStyle = '#777'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(-3, 26); ctx.moveTo(3, 0); ctx.lineTo(3, 26); ctx.stroke();
      ctx.fillStyle = '#ff5a5a'; ctx.fillRect(-5, 25, 10, 3);
      drawAnt(ctx, { x: 0, y: 23, L: 12, dir: 1, phase: 0, walking: false });
      ctx.restore();
      break;
    }
    case 'bahnhof': {
      const p = ((t * 0.12) % 1.4) - 0.2;
      const x = rx + p * rw;
      ctx.save(); ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();
      for (let k = 0; k < 3; k++) {
        const wx = x - k * 22;
        ctx.fillStyle = k ? '#ffd34d' : '#e8463c'; rr(ctx, wx - 9, fy - 15, 18, 11, 3); ctx.fill();
        ctx.fillStyle = '#9fd8ff'; ctx.fillRect(wx - 5, fy - 13, 4, 4); ctx.fillRect(wx + 1, fy - 13, 4, 4);
        ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(wx - 5, fy - 3, 2.2, 0, 7); ctx.arc(wx + 5, fy - 3, 2.2, 0, 7); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      for (let i = 0; i < 3; i++) { const q = (t * 1.5 + i / 3) % 1; ctx.globalAlpha = 1 - q; ctx.beginPath(); ctx.arc(x + 4 - q * 10, fy - 18 - q * 12, 2 + q * 3, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
      ctx.restore();
      break;
    }
    case 'spaeher': {
      const p = (t * 0.3) % 1;
      if (p < 0.15) drawGlow(ctx, '255,255,220', rx + rw * 0.5 + 10, fy - 26, 7, Math.sin(p / 0.15 * Math.PI));
      break;
    }
    case 'universitaet': {
      if (Math.sin(t * 3) > 0) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(rx + rw * 0.32 + 5 + ((t * 10) % (rw * 0.3)), ry + 45, 3, 1);
      }
      break;
    }
  }
  // Brut anzeigen
  if (info.brut) {
    const items = [];
    for (let i = 0; i < info.brut.ei; i++) items.push('ei');
    for (let i = 0; i < info.brut.larve; i++) items.push('larve');
    for (let i = 0; i < info.brut.puppe; i++) items.push('puppe');
    const startX = room.typ === 'koenigin' ? rx + 14 : rx + 12;
    const maxW = room.typ === 'koenigin' ? rw * 0.35 : rw - 24;
    const perRow = Math.max(1, Math.floor(maxW / 8));
    items.forEach((it, i) => {
      const x = startX + (i % perRow) * 8 + 4;
      const y = fy - 3 - Math.floor(i / perRow) * 7;
      if (it === 'ei') ctx.drawImage(EI(), x - 4, y - 5, 8, 10);
      else if (it === 'larve') { ctx.save(); ctx.translate(x, y - 1); ctx.rotate(Math.sin(t * 2 + x) * 0.15); ctx.drawImage(LARVE(), -5, -4.5, 10, 9); ctx.restore(); }
      else ctx.drawImage(PUPPE(), x - 5.5, y - 5, 11, 8);
    });
  }
}

function steam(ctx, x, y, t) {
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.6 + i / 3) % 1;
    ctx.fillStyle = `rgba(255,255,255,${0.35 * (1 - p)})`;
    ctx.beginPath(); ctx.arc(x + Math.sin(p * 6 + i) * 3, y - p * 16, 2 + p * 3, 0, 7); ctx.fill();
  }
}
