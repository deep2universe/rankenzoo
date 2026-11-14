// Sprite-Caches: Teure Zeichnungen (Ameisen, Emojis, Lichtschein) werden einmal
// in kleine Offscreen-Canvas gemalt und danach nur noch kopiert. Das spart pro Bild
// hunderte Farbverläufe und Pfade – und hält Laptops kühl.
import { drawAnt } from './antdraw.js';

const EMOJI_FONT = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji","Twemoji Mozilla",sans-serif';
const mk = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
};

// ---------- Emojis ----------
const emojiCache = new Map();
const EK = 3; // Auflösungsfaktor
function emojiSprite(ch, size) {
  const s = Math.max(6, Math.round(size));
  const key = ch + '|' + s;
  let sp = emojiCache.get(key);
  if (sp) return sp;
  const px = s * EK;
  const c = mk(px * 1.6, px * 1.45);
  const x = c.getContext('2d');
  x.font = `${px}px ${EMOJI_FONT}`;
  x.textAlign = 'center';
  x.textBaseline = 'alphabetic';
  const base = px * 1.12;
  x.fillText(ch, c.width / 2, base);
  sp = { img: c, w: c.width / EK, h: c.height / EK, base: base / EK };
  if (emojiCache.size > 600) emojiCache.clear();
  emojiCache.set(key, sp);
  return sp;
}
/** Emoji zentriert über (x, Grundlinie y) zeichnen – wie fillText mit textAlign=center. */
export function drawEmoji(ctx, ch, x, y, size, alpha = 1) {
  const sp = emojiSprite(ch, size);
  const k = size / Math.round(size) || 1;
  if (alpha < 1) { const a = ctx.globalAlpha; ctx.globalAlpha = a * alpha; ctx.drawImage(sp.img, x - sp.w * k / 2, y - sp.base * k, sp.w * k, sp.h * k); ctx.globalAlpha = a; }
  else ctx.drawImage(sp.img, x - sp.w * k / 2, y - sp.base * k, sp.w * k, sp.h * k);
}

// ---------- Weiche Lichtpunkte ----------
const glowCache = new Map();
/** Radialer Schein (Farbe als 'r,g,b'), mittig auf (x,y) mit Radius r. */
export function drawGlow(ctx, rgb, x, y, r, alpha = 1, inner = 0) {
  const key = rgb + '|' + inner;
  let c = glowCache.get(key);
  if (!c) {
    c = mk(128, 128);
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, inner * 64, 64, 64, 64);
    gr.addColorStop(0, `rgba(${rgb},1)`);
    gr.addColorStop(0.35, `rgba(${rgb},.45)`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    glowCache.set(key, c);
  }
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * alpha;
  ctx.drawImage(c, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = a;
}

// ---------- Ameisen ----------
const antCache = new Map();
const FRAMES = 8;
const TAU = Math.PI * 2;
const AK = 4; // Pixel pro Welteinheit im Sprite
function antSprite(o, frame) {
  const L = Math.round(o.L);
  const key = `${o.rolle}|${o.acc ?? ''}|${o.last ?? ''}|${o.wings ? 1 : 0}|${o.walking ? 1 : 0}|${L}|${frame}`;
  let c = antCache.get(key);
  if (c) return c;
  const k = L <= 24 ? AK : L <= 60 ? 3 : 2;
  c = mk(1.9 * L * k, 1.35 * L * k);
  const x = c.getContext('2d');
  x.scale(k, k);
  drawAnt(x, { ...o, x: 0.95 * L, y: 0.9 * L, L, dir: 1, tilt: 0, alpha: 1, phase: (frame / FRAMES) * TAU });
  c._L = L;
  if (antCache.size > 1500) antCache.clear();
  antCache.set(key, c);
  return c;
}
/** Wie drawAnt, aber über einen Sprite-Cache (Laufzyklus in 8 Bildern). */
export function drawAntFast(ctx, o) {
  const ph = ((o.phase ?? 0) % TAU + TAU) % TAU;
  const frame = Math.floor((ph / TAU) * FRAMES) % FRAMES;
  const sp = antSprite(o, frame);
  const L = sp._L;
  ctx.save();
  ctx.translate(o.x, o.y);
  if (o.tilt) ctx.rotate(o.tilt);
  if ((o.dir ?? 1) < 0) ctx.scale(-1, 1);
  if (o.alpha != null && o.alpha < 1) ctx.globalAlpha *= o.alpha;
  const s = o.L / L;
  ctx.drawImage(sp, -0.95 * L * s, -0.9 * L * s, 1.9 * L * s, 1.35 * L * s);
  ctx.restore();
}

// ---------- Allgemeiner Mini-Cache für beliebige Zeichnungen ----------
const anyCache = new Map();
/** Zeichnet fn(ctx) einmal in ein Canvas der Größe w×h (Welteinheiten) und cached es unter key. */
export function cached(key, w, h, fn, k = 2) {
  let c = anyCache.get(key);
  if (!c) {
    c = mk(w * k, h * k);
    const x = c.getContext('2d');
    x.scale(k, k);
    fn(x);
    anyCache.set(key, c);
  }
  return c;
}
