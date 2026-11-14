// Gebäude-Vorschau: zeichnet ein Gebäude (mit Einrichtung) in ein eigenes kleines Canvas –
// für Quiz-Belohnungen, das Bauplan-Buch und Ausbau-Fenster. Optional lebendig (animiert).
import { GEBAEUDE, TILE as T } from '../game/config.js';
import { drawRoomStatic, drawRoomDynamic } from './rooms.js';
import { zeichneLager } from './revierRenderer.js';
import { mulberry32 } from '../util.js';

const basisCache = new Map();
const PAD = 10;

function masse(typ, w, h) {
  const G = GEBAEUDE[typ];
  const rw = (w ?? G.w) * T, rh = (h ?? G.h) * T;
  const ober = G.zone === 'oberflaeche';
  const revier = G.zone === 'revier';
  if (revier) return { rw: 96, rh: 96, cw: 96, ch: 96, rx: 0, ry: 0 };
  return { rw, rh, cw: rw + PAD * 2, ch: rh + PAD * 2 + (ober ? 18 : 0), rx: PAD, ry: PAD + (ober ? 10 : 0) };
}

function hintergrund(c, typ, m) {
  const G = GEBAEUDE[typ];
  const rnd = mulberry32(typ.length * 977);
  if (G.zone === 'oberflaeche') {
    const sky = c.createLinearGradient(0, 0, 0, m.ch);
    sky.addColorStop(0, '#8fd3ff'); sky.addColorStop(0.75, '#d8f1ff'); sky.addColorStop(1, '#e8f7d0');
    c.fillStyle = sky; c.fillRect(0, 0, m.cw, m.ch);
    const gy = m.ry + m.rh;
    c.fillStyle = '#6dbb4a'; c.fillRect(0, gy, m.cw, m.ch - gy);
    c.fillStyle = '#5aa53c'; for (let x = 0; x < m.cw; x += 4) c.fillRect(x, gy - 2 - rnd() * 3, 2, 4);
    c.fillStyle = '#8a5a34'; c.fillRect(0, gy + 6, m.cw, m.ch);
    return;
  }
  const g = c.createLinearGradient(0, 0, 0, m.ch);
  g.addColorStop(0, G.zone === 'huegel' ? '#8a5a30' : '#6b4424'); g.addColorStop(1, G.zone === 'huegel' ? '#6e4422' : '#4e3018');
  c.fillStyle = g; c.fillRect(0, 0, m.cw, m.ch);
  for (let i = 0; i < m.cw * m.ch / 60; i++) {
    c.fillStyle = rnd() < 0.5 ? 'rgba(255,220,170,.06)' : 'rgba(0,0,0,.08)';
    c.beginPath(); c.arc(rnd() * m.cw, rnd() * m.ch, 1 + rnd() * 2.5, 0, 7); c.fill();
  }
  // verdichteter Höhlenrand
  c.fillStyle = 'rgba(30,15,5,.45)';
  c.beginPath(); c.roundRect(m.rx + 1, m.ry + 1, m.rw - 2, m.rh - 2, Math.min(m.rh * 0.42, 26) + 4); c.fill();
}

function fakeRaum(typ, m) {
  return { id: 7 + typ.length, typ, x: 0, y: 0, w: m.rw / T, h: m.rh / T, bau: 1, verbunden: true };
}

/** Statisches Bild (gecacht). skala = Auflösungsfaktor. */
export function gebaeudeBasis(typ, { w, h, skala = 2 } = {}) {
  const key = `${typ}|${w}|${h}|${skala}`;
  let cv = basisCache.get(key);
  if (cv) return cv;
  const m = masse(typ, w, h);
  cv = document.createElement('canvas');
  cv.width = m.cw * skala; cv.height = m.ch * skala;
  const c = cv.getContext('2d');
  c.scale(skala, skala);
  const G = GEBAEUDE[typ];
  if (G.zone === 'revier') {
    const sky = c.createRadialGradient(48, 48, 10, 48, 48, 70);
    sky.addColorStop(0, '#7fc65a'); sky.addColorStop(1, '#3f8a34');
    c.fillStyle = sky; c.fillRect(0, 0, 96, 96);
    zeichneLager(c, 48, 52, G.lstufe, 1.3, 1.6);
  } else {
    hintergrund(c, typ, m);
    try { drawRoomStatic(c, fakeRaum(typ, m), G, m.rx, m.ry, m.rw, m.rh); } catch (e) { console.warn('Vorschau', typ, e); }
  }
  cv._m = m;
  if (basisCache.size > 160) basisCache.clear();
  basisCache.set(key, cv);
  return cv;
}

/** Ein Vorschau-Canvas für das DOM (CSS-Größe = natürliche Größe × zoom). lebendig = animiert, solange sichtbar. */
export function gebaeudeBild(typ, { w, h, zoom = 1, lebendig = false, klasse = 'gebaeude-bild' } = {}) {
  const skala = Math.min(3, Math.max(1, Math.ceil(zoom * (window.devicePixelRatio || 1))));
  const basis = gebaeudeBasis(typ, { w, h, skala });
  const m = basis._m;
  const cv = document.createElement('canvas');
  cv.className = klasse;
  cv.width = basis.width; cv.height = basis.height;
  cv.style.width = Math.round(m.cw * zoom) + 'px';
  cv.style.aspectRatio = `${m.cw} / ${m.ch}`;
  const c = cv.getContext('2d');
  const G = GEBAEUDE[typ];
  const raum = fakeRaum(typ, m);
  const male = t => {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(basis, 0, 0);
    if (G.zone === 'revier') return;
    c.setTransform(skala, 0, 0, skala, 0, 0);
    c.save();
    if (G.zone !== 'oberflaeche') { c.beginPath(); c.roundRect(m.rx + 5, m.ry + 5, m.rw - 10, m.rh - 10, Math.min(m.rh * 0.42, 26)); c.clip(); }
    try { drawRoomDynamic(c, raum, G, m.rx, m.ry, m.rw, m.rh, { t }); } catch { /* Vorschau ohne Animation */ }
    c.restore();
  };
  male(1.7);
  if (lebendig && !matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    let last = 0, warte = 0;
    const loop = now => {
      if (!cv.isConnected) { if (cv._gestartet || warte++ > 120) return; requestAnimationFrame(loop); return; }
      cv._gestartet = true;
      if (now - last > 40) { last = now; male(now / 1000); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  return cv;
}
