// Statisches Gelände: Erdschichten, Felsen, Wurzeln, Hügel, Gänge & Kammern (vorgerendert).
import { TILE as T, COLS, ROWS, GROUND, HILL_X, C, GEBAEUDE, hillShape } from '../game/config.js';
import { idx, get } from '../game/world.js';
import { makeNoise, mulberry32, clamp } from '../util.js';
import { drawRoomStatic } from './rooms.js';

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
function schicht(d) {
  for (let i = 0; i < SCHICHTEN.length - 1; i++) {
    const a = SCHICHTEN[i], b = SCHICHTEN[i + 1];
    if (d <= b.d) {
      const t = clamp((d - a.d) / (b.d - a.d), 0, 1);
      const s = t * t * (3 - 2 * t);
      return a.c.map((v, k) => v + (b.c[k] - v) * s);
    }
  }
  return SCHICHTEN[SCHICHTEN.length - 1].c;
}

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
  constructor(seed) {
    this.seed = seed;
    this.noise = makeNoise(seed);
    this.soil = this.makeSoil();
    this.hillTex = this.makeHillTex();
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

  /** Baut das Gelände-Bild neu, wenn sich die Welt verändert hat. */
  rebuild(state) {
    const world = state.world;
    const key = world.version + ':' + state.rooms.map(r => r.id + (r.bau >= 1 ? 'f' : 'b')).join(',');
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
      drawRoomStatic(ctx, r, g, r.x * T, r.y * T, g.w * T, g.h * T, world);
    }
    return true;
  }

  drawWater(ctx, world) {
    for (let y = GROUND; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (world.typ[idx(x, y)] !== C.WATER) continue;
        const g = ctx.createLinearGradient(0, y * T, 0, (y + 1) * T);
        g.addColorStop(0, '#3d7fb8'); g.addColorStop(1, '#244f7a');
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
    ctx.fillStyle = '#4a4650';
    ctx.fill(pfad(2.5));
    const base = pfad(0);
    const g = ctx.createLinearGradient(0, GROUND * T, 0, ROWS * T);
    g.addColorStop(0, '#9c968f'); g.addColorStop(1, '#6f6b72');
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
    ctx.fillStyle = '#7a4a24';
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
    ctx.strokeStyle = 'rgba(60,35,15,.6)';
    ctx.lineWidth = 2;
    ctx.stroke(p);
  }

  /** Gänge und Kammerhöhlen „ausgraben". */
  drawCarvings(ctx, state) {
    const world = state.world;
    const outer = new Path2D(), inner = new Path2D();
    const isOpen = t => t === C.TUNNEL || t === C.ROOM;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (world.typ[idx(x, y)] !== C.TUNNEL) continue;
        const cx = (x + 0.5) * T, cy = (y + 0.5) * T;
        outer.moveTo(cx + T * 0.44, cy); outer.arc(cx, cy, T * 0.44, 0, Math.PI * 2);
        inner.moveTo(cx + T * 0.34, cy); inner.arc(cx, cy, T * 0.34, 0, Math.PI * 2);
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
          const nt = get(world, x + dx, y + dy);
          const air = nt === C.AIR;
          if (!isOpen(nt) && !air) continue;
          if ((dx < 0 || dy < 0) && isOpen(nt)) continue; // nur einmal pro Paar
          const ext = air ? 1.25 : 1;
          const ow = T * 0.44, iw = T * 0.34;
          if (dx !== 0) {
            const x0 = dx > 0 ? cx : cx - T * ext;
            outer.rect(x0, cy - ow, T * ext, ow * 2);
            inner.rect(x0, cy - iw, T * ext, iw * 2);
          } else {
            const y0 = dy > 0 ? cy : cy - T * ext;
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
      const rx = r.x * T, ry = r.y * T, rw = g.w * T, rh = g.h * T;
      const rad = Math.min(rh * 0.42, 26);
      outer.roundRect(rx + 1, ry + 1, rw - 2, rh - 2, rad + 4);
      inner.roundRect(rx + 5, ry + 5, rw - 10, rh - 10, rad);
    }
    ctx.save();
    // nur im Boden und im Hügel graben
    const solid = new Path2D();
    solid.rect(0, GROUND * T, W, H);
    if (world.hill > 0) solid.addPath(this.hillPath(world.hill));
    ctx.clip(solid);
    // äußerer Rand: verdichtete Erde
    ctx.fillStyle = 'rgba(38,22,12,.55)';
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
