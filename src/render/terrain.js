// Statisches Gelände: Erdschichten, Felsen, Wurzeln, Hügel, Gänge & Kammern (vorgerendert).
import { TILE as T, COLS, ROWS, GROUND, HILL_X, C, GEBAEUDE, hillShape } from '../game/config.js';
import { idx, get, raumMasse } from '../game/world.js';
import { makeNoise, mulberry32, clamp } from '../util.js';
import { drawRoomStatic } from './rooms.js';
import { biom as biomDaten } from '../game/biome.js';
import { biomWurzeln, gartenBeete } from './kulisse.js';

export const W = COLS * T;
export const H = ROWS * T;
export const RES = Math.min(2, Math.max(1.25, window.devicePixelRatio || 1));

const SCHICHTEN = [
  { d: 0, c: [74, 48, 30] },
  { d: 2.5, c: [96, 63, 38] },
  { d: 7, c: [128, 86, 52] },
  { d: 11, c: [150, 104, 64] },
  { d: 16, c: [134, 78, 52] },
  { d: 23, c: [104, 76, 62] },
  { d: 30, c: [76, 66, 64] },
  { d: 40, c: [60, 56, 58] },
];
function schicht(d, S = SCHICHTEN) {
  for (let i = 0; i < S.length - 1; i++) {
    const a = S[i], b = S[i + 1];
    if (d <= b.d) {
      const t = clamp((d - a.d) / (b.d - a.d), 0, 1);
      const s = t * t * (3 - 2 * t);
      return a.c.map((v, k) => v + (b.c[k] - v) * s);
    }
  }
  return S[S.length - 1].c;
}
const mischen = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const hell = (c, k) => (k > 0 ? mischen(c, [255, 255, 255], k) : mischen(c, [0, 0, 0], -k));
const farbe = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const helligkeit = c => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
/** Schicht-Stützstellen einer Gegend (4 Farben oben → unten) wie bei SCHICHTEN verteilt. */
function biomSchichten(B) {
  const [a, b, c, d] = B.erde.schichten;
  return [
    { d: 0, c: a }, { d: 2.5, c: mischen(a, b, 0.4) }, { d: 7, c: b }, { d: 11, c: hell(b, 0.08) },
    { d: 16, c: c }, { d: 23, c: mischen(c, d, 0.35) }, { d: 30, c: mischen(c, d, 0.7) }, { d: 40, c: d },
  ];
}
// Steinfarben je Gegend: [Rand, hell, dunkel]
const STEIN = {
  sand: ['#7a5a3a', '#dcc08e', '#a88660'], spielplatz: ['#6e5a48', '#cfc2ae', '#968a7c'], heide: ['#5e5048', '#b8aa98', '#86786c'],
  felsen: ['#363a46', '#9aa0ac', '#5c6270'], steingarten: ['#5a554e', '#cdc6b8', '#8f887c'],
  teich: ['#3e4a50', '#98a4a6', '#66727a'], bach: ['#3e4a50', '#a8b0b0', '#6c767c'],
};

/** Hügel-Oberfläche (Pixel-y) an Welt-x, oder null. */
export function hillSurfaceY(level, wx) {
  if (level <= 0) return null;
  const { w, h } = hillShape(level);
  const rx = (w + 0.55) * T, ry = (h + 0.45) * T;
  const dx = (wx - (HILL_X + 0.5) * T) / rx;
  if (Math.abs(dx) >= 1) return null;
  return GROUND * T - ry * Math.sqrt(1 - dx * dx);
}

export class Terrain {
  constructor(seed, biomKey = 'heim') {
    this.seed = seed;
    this.biomKey = biomKey;
    this.B = biomDaten(biomKey);
    this.heim = !this.B || this.B === biomDaten('heim');
    // dunkler Boden braucht hellere Gangränder, damit Gänge gut zu sehen sind
    this.dunkel = !this.heim && helligkeit(mischen(this.B.erde.schichten[0], this.B.erde.schichten[1], 0.5)) < 64;
    this.noise = makeNoise(seed);
    this.soil = this.heim ? this.makeSoil() : this.makeSoilBiom();
    this.hillTex = this.heim ? this.makeHillTex() : this.makeHillTexBiom();
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.round(W * RES);
    this.canvas.height = Math.round(H * RES);
    this.ctx = this.canvas.getContext('2d');
    this.version = -1;
  }

  makeSoil() {
    const sc = 2; // Rauschen in halber Auflösung, dann hochskaliert
    const w = Math.ceil(W / sc), hh = Math.ceil((H - GROUND * T) / sc);
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = hh;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(w, hh);
    const n = this.noise;
    for (let y = 0; y < hh; y++) {
      for (let x = 0; x < w; x++) {
        const wx = x * sc, wy = y * sc;
        const wave = (n(wx * 0.004, wy * 0.002 + 10, 3) - 0.5) * 5;
        const d = wy / T + wave;
        const base = schicht(d);
        const grain = n(wx * 0.05, wy * 0.05, 3) - 0.5;
        const big = n(wx * 0.012 + 50, wy * 0.012, 3) - 0.5;
        const strata = Math.sin((d + big * 2) * 2.6) * 0.04;
        const f = 1 + grain * 0.32 + big * 0.28 + strata;
        const i = (y * w + x) * 4;
        img.data[i] = clamp(base[0] * f, 0, 255);
        img.data[i + 1] = clamp(base[1] * f, 0, 255);
        img.data[i + 2] = clamp(base[2] * f, 0, 255);
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // Großes Canvas mit Details
    const out = document.createElement('canvas');
    out.width = W; out.height = H - GROUND * T;
    const o = out.getContext('2d');
    o.imageSmoothingQuality = 'high';
    o.drawImage(cv, 0, 0, out.width, out.height);
    const rnd = mulberry32(this.seed + 3);
    // Kiesel
    for (let i = 0; i < 900; i++) {
      const x = rnd() * W, y = rnd() * out.height;
      const r = 0.8 + rnd() * rnd() * 4.5;
      const light = 140 + rnd() * 80;
      o.fillStyle = `rgba(${light},${light * 0.88},${light * 0.75},${0.25 + rnd() * 0.45})`;
      o.beginPath(); o.ellipse(x, y, r * 1.3, r, rnd() * 3, 0, 7); o.fill();
      if (r > 2.5) {
        o.fillStyle = 'rgba(255,255,255,.18)';
        o.beginPath(); o.ellipse(x - r * 0.3, y - r * 0.35, r * 0.45, r * 0.3, 0, 0, 7); o.fill();
      }
    }
    // dunkle Krümel
    for (let i = 0; i < 2500; i++) {
      o.fillStyle = `rgba(30,18,10,${0.08 + rnd() * 0.18})`;
      o.fillRect(rnd() * W, rnd() * out.height, 1 + rnd() * 2, 1 + rnd() * 2);
    }
    // Wurzeln unter Gras und Bäumen
    const wurzel = (x0, len, dicke) => {
      o.strokeStyle = 'rgba(214,170,120,.55)';
      o.lineCap = 'round';
      let x = x0, y = 0, a = Math.PI / 2 + (rnd() - 0.5) * 0.6, w0 = dicke;
      for (let s = 0; s < len; s++) {
        const nx = x + Math.cos(a) * 6, ny = y + Math.sin(a) * 6;
        o.lineWidth = w0 * (1 - s / len) + 0.5;
        o.beginPath(); o.moveTo(x, y); o.lineTo(nx, ny); o.stroke();
        x = nx; y = ny; a += (rnd() - 0.5) * 0.5;
        a = clamp(a, 0.4, Math.PI - 0.4);
      }
    };
    for (let i = 0; i < 70; i++) wurzel(rnd() * W, 6 + rnd() * 18, 1 + rnd() * 2.2);
    for (const tx of [5 * T, 54 * T]) for (let i = 0; i < 9; i++) wurzel(tx + (rnd() - 0.5) * 60, 30 + rnd() * 40, 3 + rnd() * 4);
    // kleine Schätze: Schneckenhaus-Fossilien und Eicheln
    for (let i = 0; i < 9; i++) {
      const x = rnd() * W, y = (12 + rnd() * 18) * T;
      o.save(); o.translate(x, y); o.rotate(rnd() * 6);
      o.strokeStyle = 'rgba(235,220,190,.45)'; o.lineWidth = 1.4;
      o.beginPath();
      for (let k = 0; k < 40; k++) { const a = k * 0.35, r = 0.3 * k; o.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      o.stroke(); o.restore();
    }
    for (let i = 0; i < 5; i++) {
      const x = rnd() * W, y = (2 + rnd() * 6) * T;
      o.save(); o.translate(x, y); o.rotate(rnd() - 0.5);
      o.fillStyle = '#a8763f'; o.beginPath(); o.ellipse(0, 3, 5, 7, 0, 0, 7); o.fill();
      o.fillStyle = '#6a4626'; o.beginPath(); o.ellipse(0, -3, 6, 3.5, 0, 0, 7); o.fill();
      o.restore();
    }
    return out;
  }

  makeHillTex() {
    const w = 40 * T, hh = 10 * T;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = hh;
    const o = cv.getContext('2d');
    const g = o.createLinearGradient(0, 0, 0, hh);
    g.addColorStop(0, '#b0743c');
    g.addColorStop(1, '#6e4425');
    o.fillStyle = g; o.fillRect(0, 0, w, hh);
    const rnd = mulberry32(this.seed + 11);
    const farben = ['#5a3518', '#7a4a22', '#9a6030', '#c08040', '#d8a060', '#3f2510', '#8a5a2a', '#a8703a'];
    for (let i = 0; i < 9000; i++) {
      const x = rnd() * w, y = rnd() * hh;
      const len = 4 + rnd() * 10, a = rnd() * Math.PI;
      o.strokeStyle = farben[(rnd() * farben.length) | 0];
      o.globalAlpha = 0.5 + rnd() * 0.5;
      o.lineWidth = 0.8 + rnd() * 1.3;
      o.beginPath(); o.moveTo(x, y); o.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); o.stroke();
    }
    // kleine Zweige und Harzklümpchen
    for (let i = 0; i < 160; i++) {
      const x = rnd() * w, y = rnd() * hh;
      o.globalAlpha = 0.9;
      o.strokeStyle = '#4a2c14'; o.lineWidth = 2 + rnd() * 1.5;
      const a = rnd() * Math.PI, len = 10 + rnd() * 16;
      o.beginPath(); o.moveTo(x, y); o.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); o.stroke();
    }
    for (let i = 0; i < 60; i++) {
      o.fillStyle = 'rgba(255,190,70,.75)';
      o.beginPath(); o.arc(rnd() * w, rnd() * hh, 1.5 + rnd() * 2, 0, 7); o.fill();
    }
    o.globalAlpha = 1;
    return cv;
  }

  // ------------------------------------------------------------------ Gegenden
  /** Boden einer anderen Gegend: Schichten & Flecken aus biome.js plus Besonderheiten (tief). */
  makeSoilBiom() {
    const B = this.B, key = this.biomKey;
    const S = biomSchichten(B);
    const strataK = { sand: 0.11, heide: 0.06, kornfeld: 0.05, spielplatz: 0.07, steingarten: 0.05, felsen: 0.07, bach: 0.05 }[key] ?? 0.04;
    const sc = 2;
    const w = Math.ceil(W / sc), hh = Math.ceil((H - GROUND * T) / sc);
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = hh;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(w, hh);
    const n = this.noise;
    for (let y = 0; y < hh; y++) {
      for (let x = 0; x < w; x++) {
        const wx = x * sc, wy = y * sc;
        const wave = (n(wx * 0.004, wy * 0.002 + 10, 3) - 0.5) * 5;
        const d = wy / T + wave;
        const base = schicht(d, S);
        const grain = n(wx * 0.05, wy * 0.05, 3) - 0.5;
        const big = n(wx * 0.012 + 50, wy * 0.012, 3) - 0.5;
        const strata = Math.sin((d + big * 2) * 2.6) * strataK;
        const f = 1 + grain * 0.3 + big * 0.26 + strata;
        const i = (y * w + x) * 4;
        img.data[i] = clamp(base[0] * f, 0, 255);
        img.data[i + 1] = clamp(base[1] * f, 0, 255);
        img.data[i + 2] = clamp(base[2] * f, 0, 255);
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const out = document.createElement('canvas');
    out.width = W; out.height = H - GROUND * T;
    const o = out.getContext('2d');
    o.imageSmoothingQuality = 'high';
    o.drawImage(cv, 0, 0, out.width, out.height);
    const HH = out.height;
    const rnd = mulberry32(this.seed + 3);
    const fl = B.erde.flecken;
    const hellBoden = helligkeit(B.erde.schichten[1]) > 140;
    // Kiesel & Krümel in den Farben der Gegend
    const kiesel = { steingarten: 1700, felsen: 1300, bach: 1300, sand: 1100, topf: 250, kompost: 350, garten: 450, gewaechshaus: 450 }[key] ?? 900;
    for (let i = 0; i < kiesel; i++) {
      const x = rnd() * W, y = rnd() * HH;
      const r = 0.8 + rnd() * rnd() * 4.5;
      const k = 0.75 + rnd() * 0.35;
      o.fillStyle = farbe(fl.map(v => Math.min(255, v * k)), 0.22 + rnd() * 0.45);
      o.beginPath(); o.ellipse(x, y, r * 1.3, r, rnd() * 3, 0, 7); o.fill();
      if (r > 2.5) {
        o.fillStyle = 'rgba(255,255,255,.2)';
        o.beginPath(); o.ellipse(x - r * 0.3, y - r * 0.35, r * 0.45, r * 0.3, 0, 0, 7); o.fill();
      }
    }
    const kr = hell(B.erde.schichten[0], -0.6);
    for (let i = 0; i < 2500; i++) {
      o.fillStyle = farbe(kr, 0.08 + rnd() * 0.18);
      o.fillRect(rnd() * W, rnd() * HH, 1 + rnd() * 2, 1 + rnd() * 2);
    }
    // Wurzeln
    const wurzelFarbe = hellBoden ? 'rgba(120,80,44,.55)' : 'rgba(214,170,120,.55)';
    const wurzel = (x0, len, dicke, col = wurzelFarbe, y0 = 0, rand = false) => {
      o.lineCap = 'round';
      let x = x0, y = y0, a = Math.PI / 2 + (rnd() - 0.5) * 0.9, w0 = dicke;
      const pts = [];
      for (let s = 0; s < len; s++) {
        const nx = x + Math.cos(a) * 6, ny = y + Math.sin(a) * 6;
        pts.push([x, y, nx, ny, w0 * (1 - s / len) + 0.5]);
        x = nx; y = ny; a += (rnd() - 0.5) * 0.5;
        a = clamp(a, 0.3, Math.PI - 0.3);
      }
      if (rand) for (const [ax, ay, bx, by, lw] of pts) { o.strokeStyle = 'rgba(40,24,12,.55)'; o.lineWidth = lw + 2.5; o.beginPath(); o.moveTo(ax, ay); o.lineTo(bx, by); o.stroke(); }
      o.strokeStyle = col;
      for (const [ax, ay, bx, by, lw] of pts) { o.lineWidth = lw; o.beginPath(); o.moveTo(ax, ay); o.lineTo(bx, by); o.stroke(); }
      if (rand) {
        o.strokeStyle = 'rgba(255,230,190,.25)';
        for (const [ax, ay, bx, by, lw] of pts) { if (lw < 3) continue; o.lineWidth = lw * 0.25; o.beginPath(); o.moveTo(ax - lw * 0.25, ay); o.lineTo(bx - lw * 0.25, by); o.stroke(); }
      }
    };
    const feine = { sand: 14, felsen: 25, steingarten: 30, topf: 40, blumen: 150, lichtung: 95, heide: 100, gewaechshaus: 130, kompost: 40, spielplatz: 45 }[key] ?? 70;
    for (let i = 0; i < feine; i++) wurzel(rnd() * W, 6 + rnd() * 18, 0.8 + rnd() * 1.8);
    for (const wz of biomWurzeln(key)) {
      for (let i = 0; i < wz.n; i++) wurzel(wz.x + (rnd() - 0.5) * (wz.breite ?? 60), wz.len * (0.6 + rnd() * 0.6), wz.dicke * (0.6 + rnd() * 0.5), wz.farbe ?? wurzelFarbe, 0, wz.dicke > 6);
    }
    this.tiefDetails(o, HH, rnd, wurzel);
    // Schneckenhaus-Fossilien tief unten (gibt es überall)
    for (let i = 0; i < 6; i++) {
      const x = rnd() * W, y = (14 + rnd() * 16) * T;
      o.save(); o.translate(x, y); o.rotate(rnd() * 6);
      o.strokeStyle = 'rgba(235,220,190,.4)'; o.lineWidth = 1.4;
      o.beginPath();
      for (let k = 0; k < 40; k++) { const a = k * 0.35, r = 0.3 * k; o.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      o.stroke(); o.restore();
    }
    return out;
  }

  /** Besonderheiten im Untergrund je Gegend (Stichworte „tief" in biome.js). */
  tiefDetails(o, HH, rnd, wurzel) {
    const key = this.biomKey;
    const R = (a, b) => a + rnd() * (b - a);
    const eichel = (x, y, s = 1) => {
      o.save(); o.translate(x, y); o.rotate(R(-0.6, 0.6)); o.scale(s, s);
      o.fillStyle = '#a8763f'; o.beginPath(); o.ellipse(0, 3, 5, 7, 0, 0, 7); o.fill();
      o.fillStyle = 'rgba(255,255,255,.25)'; o.beginPath(); o.ellipse(-1.8, 3, 1.4, 3.5, 0, 0, 7); o.fill();
      o.fillStyle = '#6a4626'; o.beginPath(); o.ellipse(0, -3, 6, 3.5, 0, 0, 7); o.fill();
      o.fillStyle = 'rgba(0,0,0,.2)'; for (let k = -4; k <= 4; k += 2) o.fillRect(k, -4, 1, 2);
      o.restore();
    };
    const muschel = (x, y, r, col) => {
      o.save(); o.translate(x, y); o.rotate(R(-0.8, 0.8));
      o.fillStyle = col; o.beginPath(); o.moveTo(0, r * 0.35); o.arc(0, r * 0.35, r, Math.PI * 1.12, Math.PI * 1.88); o.closePath(); o.fill();
      o.strokeStyle = 'rgba(120,80,60,.35)'; o.lineWidth = 0.7;
      for (let k = -3; k <= 3; k++) { const a = -Math.PI / 2 + k * 0.17; o.beginPath(); o.moveTo(0, r * 0.35); o.lineTo(Math.cos(a) * r, r * 0.35 + Math.sin(a) * r); o.stroke(); }
      o.fillStyle = col; o.fillRect(-r * 0.22, r * 0.25, r * 0.44, r * 0.25);
      o.restore();
    };
    const faden = (x, y, len, col, lw) => {
      // verzweigte Pilzfäden (Myzel)
      o.strokeStyle = col; o.lineWidth = lw; o.lineCap = 'round';
      let a = R(0, Math.PI * 2);
      o.beginPath(); o.moveTo(x, y);
      for (let s = 0; s < len; s++) {
        x += Math.cos(a) * 5; y += Math.sin(a) * 5; a += R(-0.7, 0.7);
        o.lineTo(x, y);
        if (rnd() < 0.18) { const sx = x, sy = y, sa = a + R(-1.4, 1.4); o.moveTo(sx, sy); let bx = sx, by = sy, ba = sa; for (let k = 0; k < 4; k++) { bx += Math.cos(ba) * 4; by += Math.sin(ba) * 4; ba += R(-0.6, 0.6); o.lineTo(bx, by); } o.moveTo(x, y); }
      }
      o.stroke();
    };
    const leuchtpunkt = (x, y, r, rgb) => {
      const g = o.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${rgb},.95)`); g.addColorStop(0.3, `rgba(${rgb},.45)`); g.addColorStop(1, `rgba(${rgb},0)`);
      o.fillStyle = g; o.beginPath(); o.arc(x, y, r, 0, 7); o.fill();
      o.fillStyle = 'rgba(255,255,255,.9)'; o.beginPath(); o.arc(x, y, r * 0.14, 0, 7); o.fill();
    };
    const linse = (x, y, rx, ry, col, glanz = 0.18) => {
      o.fillStyle = col; o.beginPath(); o.ellipse(x, y, rx, ry, R(-0.15, 0.15), 0, 7); o.fill();
      o.fillStyle = `rgba(255,255,255,${glanz})`; o.beginPath(); o.ellipse(x - rx * 0.2, y - ry * 0.35, rx * 0.55, ry * 0.25, 0, 0, 7); o.fill();
    };
    const ader = (y, col, lw) => {
      // feuchte Wasserader
      let x = R(-50, W), yy = y;
      o.strokeStyle = col; o.lineWidth = lw; o.lineCap = 'round';
      o.beginPath(); o.moveTo(x, yy);
      const len = R(120, 380);
      for (let s = 0; s < len; s += 8) { x += 8; yy += Math.sin(s * 0.05 + y) * 2 + R(-1.5, 1.5); o.lineTo(x, yy); }
      o.stroke();
      o.strokeStyle = 'rgba(200,235,255,.25)'; o.lineWidth = lw * 0.35; o.stroke();
    };
    const wurm = (x, y, len, s = 1) => {
      o.save(); o.translate(x, y); o.rotate(R(0, 6.28));
      const pts = [];
      for (let k = 0; k <= 12; k++) pts.push([k * len / 12, Math.sin(k * 0.7 + x) * 4 * s]);
      o.lineCap = 'round'; o.lineJoin = 'round';
      o.strokeStyle = '#b45a64'; o.lineWidth = 5 * s; o.beginPath(); pts.forEach(([a, b]) => o.lineTo(a, b)); o.stroke();
      o.strokeStyle = '#e8909a'; o.lineWidth = 3.4 * s; o.stroke();
      o.strokeStyle = 'rgba(255,255,255,.35)'; o.lineWidth = 1 * s; o.beginPath(); pts.forEach(([a, b]) => o.lineTo(a, b - 1 * s)); o.stroke();
      o.fillStyle = '#d0707c'; o.fillRect(pts[4][0] - 2, pts[4][1] - 3 * s, 5, 6 * s);
      o.restore();
    };
    const blatt = (x, y, r, col) => {
      o.save(); o.translate(x, y); o.rotate(R(0, 6.28));
      o.fillStyle = col; o.beginPath(); o.moveTo(-r, 0); o.quadraticCurveTo(0, -r * 0.6, r, 0); o.quadraticCurveTo(0, r * 0.6, -r, 0); o.fill();
      o.strokeStyle = 'rgba(40,25,10,.35)'; o.lineWidth = 0.7; o.beginPath(); o.moveTo(-r, 0); o.lineTo(r, 0); o.stroke();
      o.restore();
    };
    const riss = (x, y, len, col = 'rgba(30,20,12,.5)', lw = 1.2) => {
      o.strokeStyle = col; o.lineWidth = lw; o.lineJoin = 'round';
      o.beginPath(); o.moveTo(x, y);
      let a = R(0.6, 2.5);
      for (let s = 0; s < len; s++) { x += Math.cos(a) * 7; y += Math.sin(a) * 7; a += R(-0.9, 0.9); o.lineTo(x, y); if (rnd() < 0.2) { o.lineTo(x + R(-8, 8), y + R(2, 9)); o.moveTo(x, y); } }
      o.stroke();
    };
    const platte = (x, y, w, h, hellC, dunkelC) => {
      o.save(); o.translate(x, y); o.rotate(R(-0.12, 0.12));
      o.fillStyle = 'rgba(20,12,8,.35)'; o.beginPath(); o.roundRect(-w / 2 + 2, -h / 2 + 3, w, h, h * 0.45); o.fill();
      const g = o.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, hellC); g.addColorStop(1, dunkelC);
      o.fillStyle = g; o.beginPath(); o.roundRect(-w / 2, -h / 2, w, h, h * 0.45); o.fill();
      o.fillStyle = 'rgba(255,255,255,.22)'; o.fillRect(-w / 2 + h * 0.4, -h / 2 + 1.2, w - h * 0.8, 1.4);
      o.strokeStyle = 'rgba(40,36,30,.35)'; o.lineWidth = 0.8; o.beginPath(); o.moveTo(-w * 0.2, -h / 2 + 2); o.lineTo(-w * 0.1, h / 2 - 2); o.stroke();
      o.restore();
    };
    switch (key) {
      case 'sand': {
        // feine Sandschichten
        for (let k = 0; k < 22; k++) {
          const y0 = 18 + k * 48 + R(-10, 10);
          for (const [col, lw, dy] of [['rgba(255,244,214,.28)', R(2, 5), 0], ['rgba(130,96,54,.2)', 1.2, 4]]) {
            o.strokeStyle = col; o.lineWidth = lw; o.beginPath();
            for (let x = 0; x <= W; x += 16) o.lineTo(x, y0 + dy + Math.sin(x * 0.006 + k) * 7 + Math.sin(x * 0.021 + k * 2) * 2);
            o.stroke();
          }
        }
        for (let i = 0; i < 26; i++) muschel(R(0, W), R(20, HH * 0.75), R(5, 9), ['#fbe8d8', '#f4c8b8', '#fff4e0', '#e8d0f0'][i % 4]);
        break;
      }
      case 'spielplatz': {
        // Sandkastensand oben mit Grenze
        o.strokeStyle = 'rgba(110,80,50,.35)'; o.lineWidth = 2; o.beginPath();
        for (let x = 0; x <= W; x += 16) o.lineTo(x, 2.6 * T + Math.sin(x * 0.01) * 5);
        o.stroke();
        // vergrabene Förmchen
        const form = (x, y, col, art) => {
          o.save(); o.translate(x, y); o.rotate(R(-0.5, 0.5));
          o.fillStyle = col; o.beginPath();
          if (art === 'stern') for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 6 : 13; o.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
          else if (art === 'fisch') { o.ellipse(0, 0, 13, 7, 0, 0, 7); o.moveTo(10, 0); o.lineTo(19, -7); o.lineTo(19, 7); }
          else { o.arc(0, 0, 11, Math.PI, 0); o.lineTo(11, 3); o.lineTo(-11, 3); }
          o.fill();
          o.fillStyle = 'rgba(255,255,255,.35)'; o.beginPath(); o.ellipse(-3, -3, 4, 2, -0.5, 0, 7); o.fill();
          if (art === 'fisch') { o.fillStyle = '#fff'; o.beginPath(); o.arc(-6, -2, 2, 0, 7); o.fill(); o.fillStyle = '#222'; o.beginPath(); o.arc(-6, -2, 1, 0, 7); o.fill(); }
          o.restore();
        };
        form(W * 0.18, 3.6 * T, '#ff5a5a', 'stern');
        form(W * 0.62, 5.2 * T, '#4fa8ff', 'fisch');
        form(W * 0.86, 3.2 * T, '#ffcf3a', 'muschel');
        form(W * 0.4, 11 * T, '#7ad46a', 'stern');
        // Murmeln, Münze, Flaschendeckel
        for (const [x, y, c] of [[W * 0.3, 7 * T, '#3fa0ff'], [W * 0.75, 9 * T, '#ff6b9a']]) {
          const g = o.createRadialGradient(x - 2, y - 2, 1, x, y, 6); g.addColorStop(0, '#fff'); g.addColorStop(0.4, c); g.addColorStop(1, '#223');
          o.fillStyle = g; o.beginPath(); o.arc(x, y, 6, 0, 7); o.fill();
        }
        o.fillStyle = '#e8b830'; o.beginPath(); o.ellipse(W * 0.52, 8 * T, 8, 3, 0.2, 0, 7); o.fill();
        o.fillStyle = '#ffe680'; o.beginPath(); o.ellipse(W * 0.52, 7.6 * T, 6, 1.4, 0.2, 0, 7); o.fill();
        break;
      }
      case 'pilzwald': {
        for (let i = 0; i < 70; i++) faden(R(0, W), R(4, HH * (i < 50 ? 0.45 : 0.9)), 18 + rnd() * 40, `rgba(240,236,255,${R(0.18, 0.4)})`, R(0.5, 1.2));
        for (let i = 0; i < 90; i++) leuchtpunkt(R(0, W), R(10, HH * 0.85), R(3, 8), i % 3 ? '150,255,230' : '210,170,255');
        break;
      }
      case 'topf': {
        // weiße Perlite-Kügelchen
        for (let i = 0; i < 650; i++) {
          const x = R(0, W), y = R(0, HH * 0.9), r = R(1, 3.4);
          o.fillStyle = 'rgba(80,80,80,.35)'; o.beginPath(); o.ellipse(x + 0.6, y + 0.8, r, r * 0.85, 0, 0, 7); o.fill();
          o.fillStyle = `rgba(${240 + R(-12, 12)},${240 + R(-12, 12)},236,.92)`; o.beginPath();
          for (let k = 0; k < 7; k++) { const a = k * 0.9, rr = r * R(0.75, 1.1); o.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
          o.fill();
        }
        // Tonscherben am Topfboden
        for (let i = 0; i < 16; i++) {
          const x = R(30, W - 30), y = HH - R(40, 5 * T), w = R(26, 60);
          o.save(); o.translate(x, y); o.rotate(R(-0.5, 0.5));
          o.fillStyle = '#9a4e2a'; o.beginPath(); o.moveTo(-w / 2, 4); o.quadraticCurveTo(0, -12, w / 2, 3); o.lineTo(w / 2 - 6, 10); o.quadraticCurveTo(0, -2, -w / 2 + 4, 11); o.closePath(); o.fill();
          o.fillStyle = '#c87048'; o.beginPath(); o.moveTo(-w / 2, 4); o.quadraticCurveTo(0, -12, w / 2, 3); o.lineTo(w / 2 - 2, 6); o.quadraticCurveTo(0, -7, -w / 2 + 2, 7); o.closePath(); o.fill();
          o.restore();
        }
        // Terrakotta-Topfwand an beiden Seiten
        const tw = 20;
        for (const links of [true, false]) {
          const x0 = links ? 0 : W - tw;
          const g = o.createLinearGradient(x0, 0, x0 + tw, 0);
          if (links) { g.addColorStop(0, '#8a4424'); g.addColorStop(0.6, '#c06a3c'); g.addColorStop(1, '#d9875a'); }
          else { g.addColorStop(0, '#d9875a'); g.addColorStop(0.4, '#c06a3c'); g.addColorStop(1, '#8a4424'); }
          o.fillStyle = g; o.fillRect(x0, 0, tw, HH);
          o.fillStyle = 'rgba(60,25,10,.45)'; o.fillRect(links ? tw : W - tw - 3, 0, 3, HH);
          for (let i = 0; i < 160; i++) { o.fillStyle = rnd() < 0.5 ? 'rgba(255,200,160,.18)' : 'rgba(90,40,20,.18)'; o.fillRect(x0 + rnd() * tw, rnd() * HH, 1.5, 1.5); }
        }
        // Topfboden mit Abflussloch
        const by = HH - 1.2 * T;
        const bg = o.createLinearGradient(0, by, 0, HH); bg.addColorStop(0, '#d0784a'); bg.addColorStop(1, '#8a4424');
        o.fillStyle = bg; o.fillRect(0, by, W, HH - by);
        o.fillStyle = 'rgba(60,25,10,.45)'; o.fillRect(0, by - 3, W, 3);
        o.fillStyle = '#2a170c'; o.beginPath(); o.ellipse(W / 2, by + 10, 34, 9, 0, 0, 7); o.fill();
        break;
      }
      case 'baumhaus': {
        for (let i = 0; i < 16; i++) eichel(R(0, W), R(1.5 * T, 14 * T), R(0.9, 1.4));
        break;
      }
      case 'wald': {
        o.lineCap = 'round';
        for (let i = 0; i < 600; i++) {
          const x = R(0, W), y = R(0, 4.5 * T) * (rnd() < 0.8 ? 1 : 2), a = R(0, 3.14), l = R(4, 9);
          o.strokeStyle = ['rgba(160,96,46,.6)', 'rgba(120,70,32,.6)', 'rgba(190,130,70,.5)'][i % 3]; o.lineWidth = 0.9;
          o.beginPath(); o.moveTo(x, y); o.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); o.stroke();
        }
        for (let i = 0; i < 26; i++) faden(R(0, W), R(10, HH * 0.4), 14 + rnd() * 26, 'rgba(240,236,225,.22)', 0.7);
        for (let i = 0; i < 4; i++) eichel(R(0, W), R(2 * T, 8 * T), 0.9);
        break;
      }
      case 'stumpf': {
        // morsche Holzstücke
        for (let i = 0; i < 14; i++) {
          const x = R(0, W), y = R(T, 16 * T), w = R(30, 70), h = R(12, 22);
          o.save(); o.translate(x, y); o.rotate(R(-0.6, 0.6));
          o.fillStyle = '#5e3a1e'; o.beginPath(); o.roundRect(-w / 2 - 1.5, -h / 2 - 1.5, w + 3, h + 3, 5); o.fill();
          o.fillStyle = '#a06c3c'; o.beginPath(); o.roundRect(-w / 2, -h / 2, w, h, 4); o.fill();
          o.strokeStyle = 'rgba(70,40,18,.5)'; o.lineWidth = 0.9;
          for (let k = -h / 2 + 3; k < h / 2; k += 3.2) { o.beginPath(); o.moveTo(-w / 2 + 2, k); o.bezierCurveTo(-w / 6, k + 1.5, w / 6, k - 1.5, w / 2 - 2, k); o.stroke(); }
          o.fillStyle = 'rgba(40,24,10,.7)';
          for (let k = 0; k < 3; k++) { o.beginPath(); o.arc(R(-w / 2 + 5, w / 2 - 5), R(-h / 2 + 3, h / 2 - 3), 1.6, 0, 7); o.fill(); }
          o.restore();
        }
        // Holzwurm-Gänge
        for (let i = 0; i < 34; i++) {
          let x = R(0, W), y = R(0, 12 * T), a = R(0, 6.28);
          o.lineCap = 'round';
          const pts = [];
          for (let s = 0; s < 22; s++) { x += Math.cos(a) * 4; y += Math.sin(a) * 4; a += R(-0.8, 0.8); pts.push([x, y]); }
          for (const [col, lw] of [['rgba(255,220,170,.22)', 3.6], ['rgba(40,22,10,.55)', 1.8]]) { o.strokeStyle = col; o.lineWidth = lw; o.beginPath(); pts.forEach(([a1, b1]) => o.lineTo(a1, b1)); o.stroke(); }
        }
        break;
      }
      case 'teich': case 'bach': {
        const ton = key === 'teich' ? 'rgba(130,146,156,.4)' : 'rgba(170,150,110,.35)';
        for (let i = 0; i < 28; i++) linse(R(0, W), R(T, HH * 0.9), R(20, 60), R(5, 12), ton);
        for (let i = 0; i < (key === 'teich' ? 26 : 18); i++) ader(R(2 * T, HH - 2 * T), 'rgba(80,150,215,.45)', R(1.5, 3.2));
        if (key === 'teich') {
          for (let i = 0; i < 14; i++) {
            const x = R(0, W), y = R(T, HH * 0.8);
            o.save(); o.translate(x, y); o.rotate(R(-1, 1));
            o.fillStyle = '#2a2f40'; o.beginPath(); o.ellipse(0, 0, 9, 5, 0, 0, 7); o.fill();
            o.strokeStyle = 'rgba(160,180,220,.45)'; o.lineWidth = 0.7;
            for (const k of [3, 6]) { o.beginPath(); o.ellipse(-9 + k, 0, k, k * 0.55, 0, -1.2, 1.2); o.stroke(); }
            o.fillStyle = 'rgba(200,220,255,.35)'; o.beginPath(); o.ellipse(-2, -2, 4, 1.2, 0, 0, 7); o.fill();
            o.restore();
          }
        } else {
          for (let i = 0; i < 260; i++) {
            const x = R(0, W), y = R(0, HH), r = R(2, 6);
            const g = o.createLinearGradient(0, y - r, 0, y + r); g.addColorStop(0, '#c8ccc8'); g.addColorStop(1, '#7e8684');
            o.fillStyle = g; o.beginPath(); o.ellipse(x, y, r * 1.3, r, R(-0.3, 0.3), 0, 7); o.fill();
          }
        }
        break;
      }
      case 'steingarten': {
        for (let i = 0; i < 2200; i++) { const g = R(110, 200); o.fillStyle = `rgba(${g},${g * 0.97},${g * 0.92},.5)`; o.fillRect(R(0, W), R(0, HH), R(1, 3), R(1, 2.5)); }
        for (let i = 0; i < 60; i++) platte(R(0, W), R(10, HH - 20), R(30, 96), R(8, 16), '#d6d0c4', '#958d80');
        break;
      }
      case 'felsen': {
        for (let i = 0; i < 46; i++) riss(R(0, W), R(0, HH), 6 + rnd() * 12, 'rgba(36,34,44,.45)', R(0.8, 1.8));
        for (let i = 0; i < 14; i++) {
          const x = R(30, W - 30), y = R(3 * T, HH - 3 * T), lila = rnd() < 0.55;
          o.fillStyle = 'rgba(30,24,40,.45)'; o.beginPath(); o.ellipse(x, y + 2, 20, 8, 0, 0, 7); o.fill();
          for (let k = 0; k < 5; k++) {
            const a = -Math.PI / 2 + (k - 2) * 0.38, l = R(12, 22), bw = R(3.5, 5.5);
            o.save(); o.translate(x + (k - 2) * 4, y); o.rotate(a + Math.PI / 2);
            const g = o.createLinearGradient(-bw, 0, bw, 0);
            g.addColorStop(0, lila ? '#7a4ab8' : '#a8c4e0'); g.addColorStop(0.5, lila ? '#d6b0ff' : '#f4fbff'); g.addColorStop(1, lila ? '#5a2e90' : '#86a2c0');
            o.fillStyle = g; o.beginPath(); o.moveTo(-bw, 0); o.lineTo(-bw, -l); o.lineTo(0, -l - bw * 1.4); o.lineTo(bw, -l); o.lineTo(bw, 0); o.fill();
            o.restore();
          }
          o.fillStyle = 'rgba(255,255,255,.85)'; o.beginPath(); o.arc(x - 3, y - 14, 1.3, 0, 7); o.fill();
        }
        break;
      }
      case 'kompost': {
        const cols = ['rgba(140,80,30,.6)', 'rgba(110,90,30,.55)', 'rgba(170,110,40,.5)', 'rgba(90,60,30,.6)', 'rgba(120,120,50,.45)'];
        for (let i = 0; i < 160; i++) blatt(R(0, W), R(0, HH * 0.6), R(5, 11), cols[i % cols.length]);
        for (let i = 0; i < 30; i++) {
          const x = R(0, W), y = R(0, HH * 0.5);
          o.fillStyle = 'rgba(250,244,230,.85)'; o.beginPath(); o.moveTo(x, y); o.lineTo(x + R(4, 8), y + R(-3, 3)); o.lineTo(x + R(2, 6), y + R(3, 7)); o.closePath(); o.fill();
        }
        for (let i = 0; i < 16; i++) wurm(R(0, W), R(T, HH * 0.75), R(26, 46), R(0.8, 1.1));
        break;
      }
      case 'kornfeld': {
        for (let i = 0; i < 34; i++) riss(R(0, W), R(0, 3 * T), 4 + rnd() * 7, 'rgba(60,40,20,.45)', 1);
        const korn = (x, y, s = 1) => { o.save(); o.translate(x, y); o.rotate(R(0, 6.28)); o.fillStyle = '#e8c060'; o.beginPath(); o.ellipse(0, 0, 3.2 * s, 1.8 * s, 0, 0, 7); o.fill(); o.fillStyle = 'rgba(150,100,30,.6)'; o.fillRect(-2.4 * s, -0.2, 4.8 * s, 0.5); o.restore(); };
        for (let i = 0; i < 9; i++) {
          const x = R(40, W - 40), y = R(2 * T, 12 * T);
          o.fillStyle = 'rgba(40,24,12,.55)'; o.beginPath(); o.ellipse(x, y, 24, 11, 0, 0, 7); o.fill();
          for (let k = 0; k < 22; k++) korn(x + R(-17, 17), y + R(-2, 7) - Math.abs(R(-1, 1)) * 2, 1.1);
        }
        for (let i = 0; i < 70; i++) korn(R(0, W), R(0, HH * 0.6), 0.9);
        break;
      }
      case 'obstwiese': {
        for (let i = 0; i < 40; i++) {
          const x = R(0, W), y = R(10, HH * 0.7);
          o.save(); o.translate(x, y); o.rotate(R(0, 6.28));
          o.fillStyle = '#4a2a14'; o.beginPath(); o.moveTo(0, -5); o.quadraticCurveTo(4, 1, 0, 4); o.quadraticCurveTo(-4, 1, 0, -5); o.fill();
          o.fillStyle = 'rgba(255,220,180,.35)'; o.beginPath(); o.ellipse(-1, 0, 0.8, 2, 0, 0, 7); o.fill();
          o.restore();
        }
        break;
      }
      case 'garten': {
        for (const b of gartenBeete()) {
          if (b.art === 'karotte') {
            const l = b.s * 64;
            o.fillStyle = '#e8762c'; o.beginPath(); o.moveTo(b.x - 7 * b.s, 0); o.quadraticCurveTo(b.x - 5 * b.s, l * 0.6, b.x, l); o.quadraticCurveTo(b.x + 5 * b.s, l * 0.6, b.x + 7 * b.s, 0); o.fill();
            o.fillStyle = 'rgba(255,220,160,.35)'; o.fillRect(b.x - 4 * b.s, 2, 1.6, l * 0.55);
            o.strokeStyle = 'rgba(150,70,20,.6)'; o.lineWidth = 0.8;
            for (let k = 10; k < l * 0.8; k += 9) { o.beginPath(); o.moveTo(b.x - 5 * b.s * (1 - k / l), k); o.lineTo(b.x + 3 * b.s * (1 - k / l), k + 1); o.stroke(); }
            o.strokeStyle = 'rgba(214,170,120,.6)'; o.beginPath(); o.moveTo(b.x, l); o.lineTo(b.x + 2, l + 12); o.stroke();
          } else if (b.art === 'radieschen') {
            o.fillStyle = '#d8324e'; o.beginPath(); o.arc(b.x, 7 * b.s, 9 * b.s, 0, 7); o.fill();
            o.fillStyle = 'rgba(255,255,255,.3)'; o.beginPath(); o.ellipse(b.x - 3 * b.s, 4 * b.s, 3 * b.s, 2 * b.s, -0.5, 0, 7); o.fill();
            o.fillStyle = '#f4f0f0'; o.beginPath(); o.moveTo(b.x - 4, 14 * b.s); o.quadraticCurveTo(b.x, 26 * b.s, b.x + 1, 30 * b.s); o.quadraticCurveTo(b.x + 2, 22 * b.s, b.x + 4, 14 * b.s); o.fill();
          }
        }
        for (let i = 0; i < 10; i++) wurm(R(0, W), R(T, HH * 0.6), R(26, 40), 0.9);
        break;
      }
      case 'gewaechshaus': {
        for (let i = 0; i < 24; i++) ader(R(2 * T, HH - 2 * T), 'rgba(80,150,215,.4)', R(1.4, 3));
        // verlorenes Pflanzschild
        o.save(); o.translate(W * 0.7, 3.4 * T); o.rotate(0.5);
        o.fillStyle = '#f4f4ee'; o.beginPath(); o.moveTo(-6, -30); o.lineTo(6, -30); o.lineTo(6, 20); o.lineTo(0, 28); o.lineTo(-6, 20); o.fill();
        o.fillStyle = '#3a8a3a'; o.font = 'bold 7px Fredoka, sans-serif'; o.textAlign = 'center';
        o.save(); o.rotate(-Math.PI / 2); o.fillText('TOMATE', 0, 2.5); o.restore();
        o.restore();
        break;
      }
      case 'heide': {
        for (let i = 0; i < 30; i++) {
          const x = R(0, W);
          o.strokeStyle = 'rgba(70,40,30,.5)'; o.lineWidth = 1;
          for (let k = 0; k < 6; k++) { o.beginPath(); o.moveTo(x, 0); o.quadraticCurveTo(x + R(-10, 10), R(8, 20), x + R(-18, 18), R(20, 46)); o.stroke(); }
        }
        break;
      }
      case 'blumen': {
        for (let i = 0; i < 60; i++) {
          const x = R(0, W), y = R(4, 5 * T);
          o.fillStyle = ['#2a1a10', '#e8d8b0', '#8a5a30'][i % 3]; o.beginPath(); o.ellipse(x, y, 2.4, 1.4, R(0, 3), 0, 7); o.fill();
        }
        break;
      }
      case 'lichtung': {
        for (let i = 0; i < 20; i++) riss(R(0, W), R(0, 2.5 * T), 3 + rnd() * 5, 'rgba(70,44,20,.4)', 0.9);
        break;
      }
    }
  }

  /** Hügel-Material einer Gegend: Nadeln, Sand, Laub, Erde, Holz, Moos oder Stroh. */
  makeHillTexBiom() {
    const w = 40 * T, hh = 10 * T;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = hh;
    const o = cv.getContext('2d');
    const { art, farbe: f1, farbe2: f2 } = this.B.huegel;
    const g = o.createLinearGradient(0, 0, 0, hh);
    g.addColorStop(0, farbe(hell(f1, 0.05))); g.addColorStop(1, farbe(f2));
    o.fillStyle = g; o.fillRect(0, 0, w, hh);
    const rnd = mulberry32(this.seed + 11);
    const R = (a, b) => a + rnd() * (b - a);
    const ton = () => farbe(mischen(f1, f2, rnd()).map(v => v * R(0.75, 1.25)), 1);
    o.lineCap = 'round';
    if (art === 'nadeln') {
      for (let i = 0; i < 9000; i++) {
        const x = rnd() * w, y = rnd() * hh, len = 4 + rnd() * 10, a = rnd() * Math.PI;
        o.strokeStyle = ton(); o.globalAlpha = 0.5 + rnd() * 0.5; o.lineWidth = 0.8 + rnd() * 1.3;
        o.beginPath(); o.moveTo(x, y); o.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); o.stroke();
      }
      for (let i = 0; i < 160; i++) {
        const x = rnd() * w, y = rnd() * hh, a = rnd() * Math.PI, len = 10 + rnd() * 16;
        o.globalAlpha = 0.9; o.strokeStyle = farbe(hell(f2, -0.35)); o.lineWidth = 2 + rnd() * 1.5;
        o.beginPath(); o.moveTo(x, y); o.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); o.stroke();
      }
    } else if (art === 'sand') {
      for (let i = 0; i < 26000; i++) {
        const k = R(0.8, 1.2);
        o.fillStyle = farbe(f1.map(v => Math.min(255, v * k)), R(0.4, 0.9));
        o.fillRect(rnd() * w, rnd() * hh, R(1, 2.4), R(1, 2.2));
      }
      // Windrippeln
      o.globalAlpha = 1;
      for (let y = 6; y < hh; y += R(7, 12)) {
        o.strokeStyle = 'rgba(255,248,225,.35)'; o.lineWidth = 1.4; o.beginPath();
        for (let x = 0; x <= w; x += 12) o.lineTo(x, y + Math.sin(x * 0.05 + y) * 2.5);
        o.stroke();
        o.strokeStyle = farbe(hell(f2, -0.2), 0.3); o.lineWidth = 1; o.beginPath();
        for (let x = 0; x <= w; x += 12) o.lineTo(x, y + 2 + Math.sin(x * 0.05 + y) * 2.5);
        o.stroke();
      }
      for (let i = 0; i < 80; i++) { o.fillStyle = 'rgba(255,255,255,.7)'; o.beginPath(); o.arc(rnd() * w, rnd() * hh, R(0.8, 1.6), 0, 7); o.fill(); }
      for (let i = 0; i < 40; i++) { o.fillStyle = ['#c9a37a', '#8a7a6a', '#e8d4b4'][i % 3]; o.beginPath(); o.ellipse(rnd() * w, rnd() * hh, R(2, 4), R(1.5, 3), 0, 0, 7); o.fill(); }
    } else if (art === 'laub') {
      const blaetter = ['#c0662a', '#d88c34', '#a04a24', '#8a6a2a', '#b89a3a', '#e0a040', '#7a4a24', '#9c7a3c'];
      for (let i = 0; i < 4200; i++) {
        const x = rnd() * w, y = rnd() * hh, r = R(4, 9);
        o.save(); o.translate(x, y); o.rotate(rnd() * 6.28);
        o.globalAlpha = R(0.75, 1);
        o.fillStyle = blaetter[(rnd() * blaetter.length) | 0];
        o.beginPath(); o.moveTo(-r, 0); o.quadraticCurveTo(0, -r * 0.62, r, 0); o.quadraticCurveTo(0, r * 0.62, -r, 0); o.fill();
        o.strokeStyle = 'rgba(60,30,10,.4)'; o.lineWidth = 0.6; o.beginPath(); o.moveTo(-r, 0); o.lineTo(r, 0); o.stroke();
        o.restore();
      }
      for (let i = 0; i < 120; i++) {
        o.globalAlpha = 0.9; o.strokeStyle = farbe(hell(f2, -0.35)); o.lineWidth = 1.6 + rnd();
        const x = rnd() * w, y = rnd() * hh, a = rnd() * Math.PI, len = 10 + rnd() * 14;
        o.beginPath(); o.moveTo(x, y); o.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); o.stroke();
      }
    } else if (art === 'erde') {
      for (let i = 0; i < 5200; i++) {
        const x = rnd() * w, y = rnd() * hh, r = R(1.5, 5.5);
        o.globalAlpha = R(0.55, 1);
        o.fillStyle = ton(); o.beginPath(); o.ellipse(x, y, r * 1.2, r, rnd() * 3, 0, 7); o.fill();
        if (r > 3.5) { o.fillStyle = 'rgba(255,240,210,.18)'; o.beginPath(); o.ellipse(x - r * 0.3, y - r * 0.3, r * 0.5, r * 0.3, 0, 0, 7); o.fill(); }
      }
      o.globalAlpha = 1;
      for (let i = 0; i < 90; i++) { o.fillStyle = ['#b8b0a4', '#8a8278', '#d8cbb4'][i % 3]; o.beginPath(); o.ellipse(rnd() * w, rnd() * hh, R(2, 4.5), R(1.6, 3.2), rnd() * 3, 0, 7); o.fill(); }
      for (let i = 0; i < 60; i++) {
        o.strokeStyle = farbe(hell(f2, -0.4), 0.8); o.lineWidth = 1.4;
        const x = rnd() * w, y = rnd() * hh, a = rnd() * Math.PI, len = 8 + rnd() * 10;
        o.beginPath(); o.moveTo(x, y); o.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); o.stroke();
      }
    } else if (art === 'holz') {
      for (let i = 0; i < 3800; i++) {
        const x = rnd() * w, y = rnd() * hh, l = R(5, 13), b = R(2.5, 5);
        o.save(); o.translate(x, y); o.rotate(rnd() * 6.28);
        o.globalAlpha = R(0.8, 1);
        const c = mischen(hell(f1, 0.2), f2, rnd());
        o.fillStyle = farbe(c); o.beginPath(); o.moveTo(-l / 2, -b / 2); o.lineTo(l / 2, -b / 2 + R(-1, 1)); o.lineTo(l / 2 - 1, b / 2); o.lineTo(-l / 2 + 1, b / 2); o.fill();
        o.fillStyle = farbe(hell(c, 0.25), 0.7); o.fillRect(-l / 2, -b / 2, l, 0.8);
        o.strokeStyle = farbe(hell(c, -0.3), 0.6); o.lineWidth = 0.5; o.beginPath(); o.moveTo(-l / 2 + 1, 0); o.lineTo(l / 2 - 1, 0.4); o.stroke();
        o.restore();
      }
      for (let i = 0; i < 2600; i++) { o.globalAlpha = 0.6; o.fillStyle = farbe(hell(f1, 0.3)); o.fillRect(rnd() * w, rnd() * hh, 1, 1); }
    } else if (art === 'moos') {
      for (let i = 0; i < 2400; i++) {
        const x = rnd() * w, y = rnd() * hh, r = R(3, 8);
        o.globalAlpha = R(0.6, 1);
        const c = mischen(hell(f1, 0.15), f2, rnd());
        const gg = o.createRadialGradient(x - r * 0.3, y - r * 0.3, 0.5, x, y, r);
        gg.addColorStop(0, farbe(hell(c, 0.3))); gg.addColorStop(1, farbe(c));
        o.fillStyle = gg; o.beginPath(); o.arc(x, y, r, 0, 7); o.fill();
      }
      o.globalAlpha = 1;
      for (let i = 0; i < 3000; i++) { o.fillStyle = rnd() < 0.5 ? 'rgba(200,240,140,.55)' : 'rgba(40,70,30,.35)'; o.fillRect(rnd() * w, rnd() * hh, 1, 1.6); }
      for (let i = 0; i < 70; i++) {
        o.strokeStyle = '#6a4a2a'; o.lineWidth = 1.4;
        const x = rnd() * w, y = rnd() * hh, a = rnd() * Math.PI, len = 8 + rnd() * 12;
        o.beginPath(); o.moveTo(x, y); o.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); o.stroke();
      }
      for (let i = 0; i < 30; i++) { // Moos-Sporenkapseln
        const x = rnd() * w, y = rnd() * hh;
        o.strokeStyle = '#b0743a'; o.lineWidth = 0.7; o.beginPath(); o.moveTo(x, y); o.lineTo(x + 1, y - 7); o.stroke();
        o.fillStyle = '#c0803c'; o.beginPath(); o.ellipse(x + 1, y - 8, 1, 1.8, 0.3, 0, 7); o.fill();
      }
    } else if (art === 'stroh') {
      for (let i = 0; i < 6500; i++) {
        const x = rnd() * w, y = rnd() * hh, len = R(8, 22), a = R(-0.5, 0.5) + (rnd() < 0.3 ? Math.PI / 2 : 0);
        const c = mischen(hell(f1, 0.15), f2, rnd());
        o.globalAlpha = R(0.6, 1);
        o.strokeStyle = farbe(c); o.lineWidth = R(1, 2.2);
        o.beginPath(); o.moveTo(x, y); o.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); o.stroke();
        if (rnd() < 0.3) { o.strokeStyle = farbe(hell(c, 0.35), 0.8); o.lineWidth = 0.5; o.beginPath(); o.moveTo(x, y - 0.5); o.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len - 0.5); o.stroke(); }
      }
      o.globalAlpha = 1;
      for (let i = 0; i < 90; i++) { o.fillStyle = '#e8c868'; o.beginPath(); o.ellipse(rnd() * w, rnd() * hh, 2.6, 1.5, rnd() * 3, 0, 7); o.fill(); }
    }
    o.globalAlpha = 1;
    return cv;
  }

  /** Baut das Gelände-Bild neu, wenn sich die Welt verändert hat. */
  rebuild(state) {
    const world = state.world;
    let fertig = 0, idSum = 0;
    let typen = '';
    for (const r of state.rooms) { idSum += r.id; if (r.bau >= 1) fertig++; typen += r.typ[0] + r.typ.length; }
    const key = world.version + ':' + state.rooms.length + ':' + fertig + ':' + idSum + ':' + typen;
    if (key === this.version) return false;
    this.version = key;
    const ctx = this.ctx;
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // Erde
    ctx.drawImage(this.soil, 0, GROUND * T);
    // Grasnarbe (dunkle Kante)
    const gk = ctx.createLinearGradient(0, GROUND * T, 0, GROUND * T + 18);
    gk.addColorStop(0, 'rgba(40,25,10,.55)'); gk.addColorStop(1, 'rgba(40,25,10,0)');
    ctx.fillStyle = gk; ctx.fillRect(0, GROUND * T, W, 18);
    this.drawWater(ctx, world);
    this.drawRocks(ctx, world);
    this.drawHill(ctx, world);
    this.drawCarvings(ctx, state);
    for (const r of state.rooms) {
      const g = GEBAEUDE[r.typ];
      const m = raumMasse(r);
      drawRoomStatic(ctx, r, g, r.x * T, r.y * T, m.w * T, m.h * T, world);
    }
    return true;
  }

  drawWater(ctx, world) {
    for (let y = GROUND; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (world.typ[idx(x, y)] !== C.WATER) continue;
        const g = ctx.createLinearGradient(0, y * T, 0, (y + 1) * T);
        const [w1, w2] = { teich: ['#3a8a98', '#22566a'], gewaechshaus: ['#3f8fb0', '#25587a'], topf: ['#4a7fa8', '#2c4f70'] }[this.biomKey] ?? ['#3d7fb8', '#244f7a'];
        g.addColorStop(0, w1); g.addColorStop(1, w2);
        ctx.fillStyle = g;
        ctx.fillRect(x * T, y * T, T, T);
        if (get(world, x, y - 1) !== C.WATER) {
          ctx.fillStyle = 'rgba(160,215,255,.5)';
          ctx.fillRect(x * T, y * T, T, 3);
        }
      }
    }
  }

  drawRocks(ctx, world) {
    const rnd = mulberry32(this.seed + 99);
    const circles = [];
    for (let y = GROUND; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (world.typ[idx(x, y)] !== C.ROCK) continue;
        circles.push([(x + 0.5) * T + (rnd() - 0.5) * 8, (y + 0.5) * T + (rnd() - 0.5) * 8, T * (0.6 + rnd() * 0.22), rnd()]);
      }
    }
    if (!circles.length) return;
    const pfad = grow => {
      const p = new Path2D();
      for (const [cx, cy, r] of circles) { p.moveTo(cx + r + grow, cy); p.ellipse(cx, cy, r + grow, (r + grow) * 0.88, 0, 0, Math.PI * 2); }
      return p;
    };
    // Schatten
    ctx.save();
    ctx.translate(4, 6);
    ctx.fillStyle = 'rgba(20,10,5,.4)';
    ctx.fill(pfad(2));
    ctx.restore();
    // dunkler Rand + Grundfläche
    const [sRand, sHell, sDunkel] = STEIN[this.biomKey] ?? ['#4a4650', '#9c968f', '#6f6b72'];
    ctx.fillStyle = sRand;
    ctx.fill(pfad(2.5));
    const base = pfad(0);
    const g = ctx.createLinearGradient(0, GROUND * T, 0, ROWS * T);
    g.addColorStop(0, sHell); g.addColorStop(1, sDunkel);
    ctx.fillStyle = g;
    ctx.fill(base);
    ctx.save();
    ctx.clip(base);
    // Licht oben links pro Teilstein, weich
    for (const [cx, cy, r, k] of circles) {
      const lg = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.5, 1, cx - r * 0.2, cy - r * 0.2, r * 1.2);
      lg.addColorStop(0, `rgba(255,255,255,${0.18 + k * 0.12})`);
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.2, 0, 7); ctx.fill();
      const sg = ctx.createRadialGradient(cx + r * 0.5, cy + r * 0.6, 1, cx + r * 0.4, cy + r * 0.5, r);
      sg.addColorStop(0, 'rgba(30,25,35,.25)'); sg.addColorStop(1, 'rgba(30,25,35,0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    }
    // Körnung und Risse
    for (let i = 0; i < circles.length * 14; i++) {
      const [cx, cy, r] = circles[(rnd() * circles.length) | 0];
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.12)';
      ctx.fillRect(cx + (rnd() - 0.5) * r * 2, cy + (rnd() - 0.5) * r * 2, 1.5, 1.5);
    }
    ctx.strokeStyle = 'rgba(40,36,45,.45)';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    for (const [cx, cy, r, k] of circles) {
      if (k > 0.35) continue;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.5, cy - r * 0.3);
      ctx.lineTo(cx - r * 0.1, cy + r * 0.05);
      ctx.lineTo(cx + r * 0.05, cy + r * 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  hillPath(level, grow = 0) {
    const { w, h } = hillShape(level);
    const rx = (w + 0.55) * T + grow, ry = (h + 0.45) * T + grow;
    const cx = (HILL_X + 0.5) * T;
    const p = new Path2D();
    p.moveTo(cx - rx, GROUND * T);
    for (let i = 0; i <= 64; i++) {
      const a = Math.PI + (i / 64) * Math.PI;
      const wob = Math.sin(i * 1.7) * 1.5;
      p.lineTo(cx + Math.cos(a) * rx, GROUND * T + Math.sin(a) * (ry + wob));
    }
    p.closePath();
    return p;
  }

  drawHill(ctx, world) {
    if (world.hill <= 0) return;
    const p = this.hillPath(world.hill);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = this.heim ? '#7a4a24' : farbe(this.B.huegel.farbe2);
    ctx.fill(p);
    ctx.restore();
    ctx.save();
    ctx.clip(p);
    const tw = this.hillTex.width, th = this.hillTex.height;
    ctx.drawImage(this.hillTex, (HILL_X + 0.5) * T - tw / 2, GROUND * T - th);
    // Licht von oben
    const { h } = hillShape(world.hill);
    const lg = ctx.createLinearGradient(0, (GROUND - h - 1) * T, 0, GROUND * T);
    lg.addColorStop(0, 'rgba(255,220,150,.28)');
    lg.addColorStop(1, 'rgba(40,20,5,.25)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, W, GROUND * T);
    ctx.restore();
    // Rand
    ctx.strokeStyle = this.heim ? 'rgba(60,35,15,.6)' : farbe(hell(this.B.huegel.farbe2, -0.45), 0.6);
    ctx.lineWidth = 2;
    ctx.stroke(p);
  }

  /** Gänge und Kammerhöhlen „ausgraben". */
  drawCarvings(ctx, state) {
    const world = state.world;
    const outer = new Path2D(), inner = new Path2D(), rim = new Path2D();
    const isOpen = t => t === C.TUNNEL || t === C.ROOM;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (world.typ[idx(x, y)] !== C.TUNNEL) continue;
        const cx = (x + 0.5) * T, cy = (y + 0.5) * T;
        outer.moveTo(cx + T * 0.44, cy); outer.arc(cx, cy, T * 0.44, 0, Math.PI * 2);
        rim.moveTo(cx + T * 0.53, cy); rim.arc(cx, cy, T * 0.53, 0, Math.PI * 2);
        inner.moveTo(cx + T * 0.34, cy); inner.arc(cx, cy, T * 0.34, 0, Math.PI * 2);
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
          const nt = get(world, x + dx, y + dy);
          const air = nt === C.AIR;
          if (!isOpen(nt) && !air) continue;
          if ((dx < 0 || dy < 0) && isOpen(nt)) continue; // nur einmal pro Paar
          const ext = air ? 1.25 : 1;
          const ow = T * 0.44, iw = T * 0.34;
          const mw = T * 0.53;
          if (dx !== 0) {
            const x0 = dx > 0 ? cx : cx - T * ext;
            rim.rect(x0, cy - mw, T * ext, mw * 2);
            outer.rect(x0, cy - ow, T * ext, ow * 2);
            inner.rect(x0, cy - iw, T * ext, iw * 2);
          } else {
            const y0 = dy > 0 ? cy : cy - T * ext;
            rim.rect(cx - mw, y0, mw * 2, T * ext);
            outer.rect(cx - ow, y0, ow * 2, T * ext);
            inner.rect(cx - iw, y0, iw * 2, T * ext);
          }
        }
      }
    }
    // Kammern als Höhlen
    for (const r of state.rooms) {
      const g = GEBAEUDE[r.typ];
      if (g.zone === 'oberflaeche') continue;
      const m = raumMasse(r);
      const rx = r.x * T, ry = r.y * T, rw = m.w * T, rh = m.h * T;
      const rad = Math.min(rh * 0.42, 26);
      outer.roundRect(rx + 1, ry + 1, rw - 2, rh - 2, rad + 4);
      rim.roundRect(rx - 2, ry - 2, rw + 4, rh + 4, rad + 7);
      inner.roundRect(rx + 5, ry + 5, rw - 10, rh - 10, rad);
    }
    ctx.save();
    // nur im Boden und im Hügel graben
    const solid = new Path2D();
    solid.rect(0, GROUND * T, W, H);
    if (world.hill > 0) solid.addPath(this.hillPath(world.hill));
    ctx.clip(solid);
    // äußerer Rand: verdichtete Erde (auf sehr dunklem Boden heller, damit Gänge gut sichtbar bleiben)
    if (this.dunkel) {
      ctx.fillStyle = farbe(hell(this.B.erde.schichten[1], 0.5), 0.5);
      ctx.fill(rim, 'nonzero');
      ctx.fillStyle = 'rgba(20,12,6,.6)';
    } else ctx.fillStyle = 'rgba(38,22,12,.55)';
    ctx.fill(outer, 'nonzero');
    ctx.shadowColor = 'rgba(0,0,0,.6)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#2a170c';
    ctx.fill(inner, 'nonzero');
    // Innenlicht: oben dunkler, unten wärmer (Boden)
    ctx.shadowColor = 'transparent';
    ctx.clip(inner, 'nonzero');
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(120,70,40,.10)');
    g.addColorStop(1, 'rgba(90,60,40,.10)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // Boden-Streifen in Gängen
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (world.typ[idx(x, y)] !== C.TUNNEL) continue;
        ctx.fillStyle = 'rgba(150,100,60,.22)';
        ctx.fillRect(x * T - 2, (y + 0.62) * T, T + 4, T * 0.25);
      }
    }
    ctx.restore();
  }
}
