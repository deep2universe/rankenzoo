// Haupt-Renderer: Himmel, Gelände, Kammern, Ameisen, Partikel, Bau-Vorschau.
import { TILE as T, COLS, ROWS, GROUND, HILL_X, C, GEBAEUDE, SIM, hillShape } from '../game/config.js';
import { Terrain, W, H, RES, hillSurfaceY } from './terrain.js';
import { drawRoomDynamic, lampPositions, emoji } from './rooms.js';
import { drawGlow } from './sprites.js';
import { Agents } from './agents.js';
import { canDig, canPlace, get, idx, raumMasse } from '../game/world.js';
import { mulberry32, clamp, lerp } from '../util.js';
import { baueKulisse, baueBewuchs, zeichneInsekten } from './kulisse.js';

const SKY = [
  // phase, oben, unten
  [0.0, [255, 156, 120], [255, 214, 160]],
  [0.07, [110, 182, 255], [200, 235, 255]],
  [0.55, [96, 170, 250], [196, 232, 255]],
  [0.64, [255, 128, 96], [255, 200, 140]],
  [0.72, [52, 40, 110], [140, 90, 140]],
  [0.8, [14, 18, 48], [36, 42, 90]],
  [0.96, [14, 18, 48], [40, 46, 96]],
  [1.0, [255, 156, 120], [255, 214, 160]],
];
function skyAt(p) {
  for (let i = 0; i < SKY.length - 1; i++) {
    const a = SKY[i], b = SKY[i + 1];
    if (p >= a[0] && p <= b[0]) {
      const t = (p - a[0]) / (b[0] - a[0]);
      return [0, 1].map(k => a[k + 1].map((v, j) => Math.round(lerp(v, b[k + 1][j], t))));
    }
  }
  return [SKY[0][1], SKY[0][2]];
}
const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
/** Wie stark der Tageshimmel der Gegend durchscheint (0 nachts & bei Sonnenauf-/-untergang). */
function tagLicht(p) {
  if (p < 0.03 || p > 0.64) return 0;
  if (p < 0.09) return (p - 0.03) / 0.06;
  if (p > 0.55) return (0.64 - p) / 0.09;
  return 1;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cam = { x: 0, y: 0, z: 1 };
    this.agents = new Agents();
    this.particles = [];
    this.overlay = { tool: null, hover: null, typ: null, drag: null, selected: null };
    this.t = 0;
    this.dpr = 1;
    this.frontierVersion = -1;
    this.frontier = [];
    this.resize();
    this.makeBackdrops();
  }

  setState(state) {
    this.state = state;
    // Gegend der Kolonie: Boden, Hügel, Himmel, Hintergrund & Bewuchs hängen davon ab
    const key = state.world.biom ?? 'heim';
    this.biomKey = key;
    this.terrain = new Terrain(state.world.seed, key);
    this.kulisse = key === 'heim' ? null : baueKulisse(key);
    this.agents.reset();
    this.worldCacheKey = ''; // Zwischenspeicher gehört zur alten Kolonie
    this.grassKey = null;
    this.makeGrass(state.world.seed);
    this.focusHome();
  }

  /** Wo vor dem Hügel / vor Oberflächen-Gebäuden nichts Großes wachsen darf (Weltpixel). */
  bewuchsFrei() {
    const st = this.state, out = [];
    if (st.world.hill > 0) {
      const { w } = hillShape(st.world.hill), cx = (HILL_X + 0.5) * T, rx = (w + 0.55) * T;
      out.push([cx - rx, cx + rx]);
    }
    for (const r of st.rooms) {
      if (GEBAEUDE[r.typ]?.zone !== 'oberflaeche') continue;
      const m = raumMasse(r);
      out.push([r.x * T - 4, (r.x + m.w) * T + 4]);
    }
    return out;
  }

  focusHome() {
    const q = this.state.rooms.find(r => r.typ === 'koenigin');
    const fx = (HILL_X + 0.5) * T, fy = q ? q.y * T - 40 : GROUND * T;
    this.cam.z = clamp(Math.min(this.vw / 900, this.vh / 620), 0.75, 1.5);
    this.centerOn(fx, fy);
  }

  centerOn(wx, wy) {
    this.cam.x = wx - this.vw / 2 / this.cam.z;
    this.cam.y = wy - this.vh / 2 / this.cam.z;
    this.clampCam();
  }

  /** Auflösungs-Obergrenze je nach Grafikqualität (1 = sparsam … 2 = hoch). */
  setMaxDpr(v) { this.maxDpr = v; this.resize(); }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr ?? 1.5);
    this.dpr = dpr;
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.vw = w; this.vh = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.worldCache = null;
    this.clampCam();
  }

  clampCam() {
    const minZ = Math.max(this.vw / (W + 200), 0.45);
    this.cam.z = clamp(this.cam.z, minZ, 2.6);
    const vw = this.vw / this.cam.z, vh = this.vh / this.cam.z;
    const top = -260, bottom = H + 40;
    this.cam.x = vw >= W ? (W - vw) / 2 : clamp(this.cam.x, -60, W - vw + 60);
    this.cam.y = vh >= bottom - top ? (top + bottom - vh) / 2 : clamp(this.cam.y, top, bottom - vh);
  }

  zoomAt(sx, sy, factor) {
    const before = this.screenToWorld(sx, sy);
    this.cam.z *= factor;
    this.clampCam();
    const after = this.screenToWorld(sx, sy);
    this.cam.x += before[0] - after[0];
    this.cam.y += before[1] - after[1];
    this.clampCam();
  }

  pan(dx, dy) {
    this.cam.x -= dx / this.cam.z;
    this.cam.y -= dy / this.cam.z;
    this.clampCam();
  }

  screenToWorld(sx, sy) { return [sx / this.cam.z + this.cam.x, sy / this.cam.z + this.cam.y]; }
  worldToScreen(wx, wy) { return [(wx - this.cam.x) * this.cam.z, (wy - this.cam.y) * this.cam.z]; }
  cellAt(sx, sy) {
    const [wx, wy] = this.screenToWorld(sx, sy);
    return [Math.floor(wx / T), Math.floor(wy / T)];
  }

  makeBackdrops() {
    // Wolken-Sprites
    this.clouds = [];
    const rnd = mulberry32(42);
    for (let i = 0; i < 7; i++) {
      const cv = document.createElement('canvas');
      cv.width = 260; cv.height = 110;
      const c = cv.getContext('2d');
      for (let k = 0; k < 9; k++) {
        const x = 50 + rnd() * 160, y = 55 + (rnd() - 0.5) * 30, r = 22 + rnd() * 26;
        const g = c.createRadialGradient(x, y - r * 0.3, r * 0.2, x, y, r);
        g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      }
      this.clouds.push({ img: cv, x: rnd() * 2600 - 300, y: -220 + rnd() * 260, s: 0.6 + rnd() * 0.7, v: 4 + rnd() * 8 });
    }
    this.stars = [];
    for (let i = 0; i < 140; i++) this.stars.push([rnd(), rnd() * 0.6, rnd() * 1.5 + 0.3, rnd() * 6]);
  }

  makeGrass(seed) {
    if (this.kulisse) {
      // andere Gegend: eigener Bewuchs, keine Heimat-Bäume (die stehen in der Kulisse)
      const frei = this.bewuchsFrei();
      this.grassKey = this.biomKey + '|' + frei.map(([a, b]) => `${a | 0}-${b | 0}`).join(',');
      this.grass = baueBewuchs(this.biomKey, seed, RES, frei);
      this.trees = [];
      return;
    }
    const rnd = mulberry32(seed + 5);
    const cv = document.createElement('canvas');
    const h = 46;
    cv.width = Math.round(W * RES); cv.height = Math.round(h * RES);
    const c = cv.getContext('2d');
    c.scale(RES, RES);
    const gy = h - 4;
    // Wiese-Boden
    const gg = c.createLinearGradient(0, gy - 6, 0, h);
    gg.addColorStop(0, '#5fbf3c'); gg.addColorStop(1, '#3a8a26');
    c.fillStyle = gg; c.fillRect(0, gy - 4, W, 10);
    for (let i = 0; i < 2600; i++) {
      const x = rnd() * W;
      const len = 5 + rnd() * rnd() * 22;
      const g = 140 + rnd() * 80;
      c.strokeStyle = `rgb(${50 + rnd() * 40},${g},${30 + rnd() * 30})`;
      c.lineWidth = 1 + rnd() * 1.2;
      c.beginPath(); c.moveTo(x, gy + 2); c.quadraticCurveTo(x + (rnd() - 0.5) * 6, gy - len * 0.5, x + (rnd() - 0.5) * 8, gy - len); c.stroke();
    }
    const blumen = ['#ff6b8b', '#ffd34d', '#ffffff', '#b07cff', '#5fb4ff', '#ff9f43'];
    for (let i = 0; i < 90; i++) {
      const x = rnd() * W, y = gy - 6 - rnd() * 14;
      c.strokeStyle = '#3e8e2e'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, gy + 1); c.lineTo(x, y); c.stroke();
      c.fillStyle = blumen[(rnd() * blumen.length) | 0];
      for (let k = 0; k < 5; k++) { const a = k * 1.256; c.beginPath(); c.arc(x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, 1.8, 0, 7); c.fill(); }
      c.fillStyle = '#ffe680'; c.beginPath(); c.arc(x, y, 1.3, 0, 7); c.fill();
    }
    this.grass = { img: cv, h };
    // Bäume
    this.trees = [];
    for (const [tx, s] of [[4.5 * T, 1.15], [55 * T, 1.0], [14 * T, 0.6], [46 * T, 0.7]]) {
      const tv = document.createElement('canvas');
      tv.width = 340; tv.height = 420;
      const t = tv.getContext('2d');
      const tg = t.createLinearGradient(150, 0, 190, 0);
      tg.addColorStop(0, '#5a3a22'); tg.addColorStop(1, '#3a2414');
      t.fillStyle = tg;
      t.beginPath(); t.moveTo(150, 420); t.quadraticCurveTo(158, 260, 152, 170); t.lineTo(188, 170); t.quadraticCurveTo(182, 260, 196, 420); t.fill();
      t.strokeStyle = '#4a2e1a'; t.lineWidth = 10; t.lineCap = 'round';
      t.beginPath(); t.moveTo(168, 230); t.quadraticCurveTo(120, 190, 100, 150); t.stroke();
      t.beginPath(); t.moveTo(172, 210); t.quadraticCurveTo(220, 170, 240, 130); t.stroke();
      const cols = ['#2f7d32', '#3d9a3a', '#4cb04a', '#5fc957', '#2a6b2c'];
      for (let k = 0; k < 34; k++) {
        const a = rnd() * Math.PI * 2, rr = rnd() * 105;
        const x = 170 + Math.cos(a) * rr * 1.15, y = 135 + Math.sin(a) * rr * 0.8;
        const r = 30 + rnd() * 28;
        const g = t.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.2, x, y, r);
        const col = cols[(rnd() * cols.length) | 0];
        g.addColorStop(0, col); g.addColorStop(1, '#1f5a22');
        t.fillStyle = g; t.beginPath(); t.arc(x, y, r, 0, 7); t.fill();
      }
      for (let k = 0; k < 8; k++) {
        t.fillStyle = '#e8463c';
        t.beginPath(); t.arc(110 + rnd() * 120, 90 + rnd() * 110, 5, 0, 7); t.fill();
      }
      this.trees.push({ img: tv, x: tx, s });
    }
  }

  spawnParticles(wx, wy, kind, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 20 + Math.random() * 70;
      this.particles.push({
        x: wx, y: wy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (kind === 'stern' ? 40 : 10),
        life: 0, max: 0.6 + Math.random() * 0.7, kind, r: 1.5 + Math.random() * 2.5,
      });
    }
  }
  floatText(wx, wy, text, color = '#fff') {
    this.particles.push({ x: wx, y: wy, vx: 0, vy: -28, life: 0, max: 1.6, kind: 'text', text, color });
  }

  /** Haupt-Zeichnen */
  frame(dt, d) {
    const st = this.state;
    if (!st) return;
    this.t += dt;
    const t = this.t;
    if (this.terrain.rebuild(st)) {
      this.frontierVersion = -1;
      // Hügel gewachsen oder Oberflächen-Gebäude dazu? Dann den Bewuchs davor neu setzen.
      if (this.kulisse) {
        const frei = this.bewuchsFrei();
        if (this.grassKey !== this.biomKey + '|' + frei.map(([a, b]) => `${a | 0}-${b | 0}`).join(',')) this.makeGrass(st.world.seed);
      }
    }
    this.agents.update(dt, st, d);
    const ctx = this.ctx;
    const { z } = this.cam;
    const dpr = this.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'low';

    // ---- Himmel (Bildschirmraum) ----
    const phase = d.tagPhase;
    let [top, bot] = skyAt(phase);
    const K = this.kulisse;
    if (K) {
      const k = tagLicht(phase) * 0.9;
      top = top.map((v, i) => Math.round(lerp(v, K.himmel.oben[i], k)));
      bot = bot.map((v, i) => Math.round(lerp(v, K.himmel.unten[i], k)));
    }
    const groundScreenY = (GROUND * T - this.cam.y) * z;
    const sg = ctx.createLinearGradient(0, Math.min(0, groundScreenY - 700 * z), 0, groundScreenY);
    sg.addColorStop(0, rgb(top)); sg.addColorStop(1, rgb(bot));
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, this.vw, this.vh);
    const night = phase > 0.7 ? clamp((phase - 0.7) / 0.08, 0, 1) * (phase > 0.96 ? clamp((1 - phase) / 0.04, 0, 1) : 1) : phase < 0.04 ? 0.3 * (1 - phase / 0.04) : 0;
    this.night = night;
    // Sterne
    if (night > 0.05) {
      for (const [sx, sy, r, ph] of this.stars) {
        const y = sy * groundScreenY;
        if (y > groundScreenY - 40) continue;
        ctx.globalAlpha = night * (0.5 + 0.5 * Math.sin(t * 2 + ph));
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(sx * this.vw, y, r, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // Sonne / Mond
    {
      const dayP = clamp(phase / 0.7, 0, 1);
      const sx = this.vw * (0.1 + 0.8 * dayP);
      const sy = groundScreenY - Math.sin(dayP * Math.PI) * Math.min(groundScreenY * 0.85, 420) - 30;
      if (phase < 0.72) {
        drawGlow(ctx, '255,215,110', sx, sy, 90, 0.9);
        ctx.fillStyle = 'rgba(255,248,205,1)'; ctx.beginPath(); ctx.arc(sx, sy, 15, 0, 7); ctx.fill();
      }
      if (night > 0.1) {
        const mp = clamp((phase - 0.72) / 0.28, 0, 1);
        const mx = this.vw * (0.15 + 0.7 * mp), my = groundScreenY - Math.sin(mp * Math.PI) * Math.min(groundScreenY * 0.8, 380) - 30;
        ctx.globalAlpha = night;
        drawGlow(ctx, '200,210,255', mx, my, 60, 0.35);
        ctx.fillStyle = 'rgba(248,248,255,1)'; ctx.beginPath(); ctx.arc(mx, my, 17, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(200,200,215,.5)';
        ctx.beginPath(); ctx.arc(mx - 5, my - 3, 4, 0, 7); ctx.arc(mx + 6, my + 4, 3, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    // Ferne Hügel (Parallaxe) – in anderen Gegenden vorgemalte Panoramen
    if (K) this.drawPano(ctx, groundScreenY, night);
    else this.drawFarHills(ctx, groundScreenY, night);
    // Wolken
    for (const c of this.clouds) {
      c.x += c.v * dt;
      if (c.x > W + 400) c.x = -500;
      const sx = (c.x - this.cam.x * 0.5) * z * 0.9, sy = (c.y - this.cam.y * 0.5) * z * 0.9 + groundScreenY * 0.5 - 200 * z;
      ctx.globalAlpha = 0.85 - night * 0.6;
      ctx.drawImage(c.img, sx, sy, 260 * c.s * z, 110 * c.s * z);
    }
    ctx.globalAlpha = 1;

    // ---- Weltraum ----
    const view = { x0: this.cam.x, y0: this.cam.y, x1: this.cam.x + this.vw / z, y1: this.cam.y + this.vh / z };
    // Bäume, Gelände und Gras ändern sich selten: einmal in einen bildschirmgroßen
    // Zwischenspeicher zeichnen und nur neu bauen, wenn Kamera oder Welt sich ändern.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.staticLayer(view), 0, 0);
    ctx.setTransform(dpr * z, 0, 0, dpr * z, -this.cam.x * z * dpr, -this.cam.y * z * dpr);
    // kleine Bewegungen der Gegend (Wasserfall, Schaukel, Leuchtpilze …)
    if (K?.anim) K.anim(ctx, t, night, view);
    // Wasser-Glitzern
    this.drawWaterShimmer(ctx, view, t);

    // Kammern: Licht und Animation
    const brutVerteilung = this.verteileBrut(st);
    for (const r of st.rooms) {
      const g = GEBAEUDE[r.typ];
      const m = raumMasse(r);
      const rx = r.x * T, ry = r.y * T, rw = m.w * T, rh = m.h * T;
      if (rx > view.x1 || rx + rw < view.x0 || ry > view.y1 || ry + rh < view.y0) continue;
      if (r.bau >= 1 && g.zone !== 'oberflaeche') {
        // warmes Lampenlicht
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();
        for (const [lx, ly] of lampPositions(r, g, rx, ry, rw)) {
          const fl = 0.16 + Math.sin(t * 3 + r.id) * 0.02 + Math.sin(t * 7.3 + r.id * 2) * 0.015;
          drawGlow(ctx, '255,175,90', lx, ly, Math.max(rw, rh) * 0.7, fl * 1.6);
        }
        ctx.restore();
      }
      ctx.save();
      if (g.zone !== 'oberflaeche') { ctx.beginPath(); ctx.roundRect(rx + 5, ry + 5, rw - 10, rh - 10, Math.min(rh * 0.42, 26)); ctx.clip(); }
      drawRoomDynamic(ctx, r, g, rx, ry, rw, rh, { t, brut: brutVerteilung.get(r.id) });
      ctx.restore();
    }

    // Ameisen
    this.agents.draw(ctx, view, t);

    // Bau-Fortschritt & Warnungen
    for (const r of st.rooms) {
      const g = GEBAEUDE[r.typ];
      const m = raumMasse(r);
      const rx = r.x * T, ry = r.y * T, rw = m.w * T, rh = m.h * T;
      if (r.ausbau && r.bau >= 1) this.drawAusbau(ctx, r, rx, ry, rw, rh, t);
      if (r.bau < 1) {
        const bw = Math.min(70, rw - 16), bx = rx + (rw - bw) / 2, by = ry - 2;
        ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.roundRect(bx - 2, by - 2, bw + 4, 10, 5); ctx.fill();
        const pg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
        pg.addColorStop(0, '#ffcf3a'); pg.addColorStop(1, '#ff8a3d');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.roundRect(bx, by, Math.max(4, bw * r.bau), 6, 3); ctx.fill();
        if (r.verbunden === false) emoji(ctx, '⚠️', rx + rw / 2, ry + 22, 16, 0.6 + 0.4 * Math.sin(t * 5));
      } else if (r.verbunden === false) {
        emoji(ctx, '⚠️', rx + rw / 2, ry + 24, 18, 0.6 + 0.4 * Math.sin(t * 5));
      } else if (g.personal && (d.personal.get(r.id) ?? 0) === 0) {
        emoji(ctx, '💤', rx + rw - 14, ry + 22 + Math.sin(t * 2) * 2, 12);
      }
    }

    // Nacht-Tönung oben
    if (night > 0.02) {
      ctx.fillStyle = `rgba(10,15,50,${night * 0.45})`;
      ctx.fillRect(view.x0 - 10, view.y0 - 10, view.x1 - view.x0 + 20, GROUND * T - view.y0 + 10);
      this.drawFireflies(ctx, t, night);
    } else if (!K || K.insekten === 'falter') this.drawButterflies(ctx, t);
    else zeichneInsekten(ctx, K.insekten, t);
    // Tiefen-Dunkel unten
    const dg = ctx.createLinearGradient(0, GROUND * T, 0, H);
    dg.addColorStop(0, 'rgba(10,5,0,0)'); dg.addColorStop(1, 'rgba(10,5,0,.35)');
    ctx.fillStyle = dg; ctx.fillRect(view.x0, GROUND * T, view.x1 - view.x0, H - GROUND * T);

    // Partikel
    this.drawParticles(ctx, dt);
    // Werkzeug-Vorschau
    this.drawOverlay(ctx, view, t);
    // Auswahl
    if (this.overlay.selected) {
      const r = st.rooms.find(rr => rr.id === this.overlay.selected);
      if (r) {
        const m = raumMasse(r);
        ctx.strokeStyle = `rgba(255,230,120,${0.6 + 0.4 * Math.sin(t * 4)})`;
        ctx.lineWidth = 3 / z + 1;
        ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.roundRect(r.x * T + 1, r.y * T + 1, m.w * T - 2, m.h * T - 2, 14); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    // (Vignette liegt als statisches CSS-Overlay über dem Canvas – kostet so nichts pro Bild.)
  }

  /** Bildschirmgroßer Zwischenspeicher für Bäume + Gelände + Gras. */
  staticLayer(view) {
    const cw = this.canvas.width, ch = this.canvas.height;
    if (!this.worldCache || this.worldCache.width !== cw || this.worldCache.height !== ch) {
      this.worldCache = document.createElement('canvas');
      this.worldCache.width = cw; this.worldCache.height = ch;
      this.worldCacheKey = '';
    }
    const z = this.cam.z, dpr = this.dpr;
    const key = `${this.cam.x.toFixed(2)}|${this.cam.y.toFixed(2)}|${z.toFixed(4)}|${this.terrain.version}`;
    if (key === this.worldCacheKey) return this.worldCache;
    this.worldCacheKey = key;
    const c = this.worldCache.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cw, ch);
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'medium';
    c.setTransform(dpr * z, 0, 0, dpr * z, -this.cam.x * z * dpr, -this.cam.y * z * dpr);
    for (const tr of this.trees) {
      const w = 340 * tr.s * 1.1, h = 420 * tr.s * 1.1, x = tr.x - w / 2, y = GROUND * T - h + 6;
      if (x > view.x1 || x + w < view.x0 || y > view.y1 || y + h < view.y0) continue;
      c.drawImage(tr.img, x, y, w, h);
    }
    // Wahrzeichen der Gegend (vorgemalt, Weltkoordinaten) – nur den sichtbaren Ausschnitt
    const N = this.kulisse?.nah;
    if (N) {
      const nx0 = clamp(Math.floor(view.x0) - 2, N.x0, N.x1), ny0 = clamp(Math.floor(view.y0) - 2, N.y0, N.y1);
      const nx1 = clamp(Math.ceil(view.x1) + 2, N.x0, N.x1), ny1 = clamp(Math.ceil(view.y1) + 2, N.y0, N.y1);
      if (nx1 > nx0 && ny1 > ny0) c.drawImage(N.img, (nx0 - N.x0) * N.s, (ny0 - N.y0) * N.s, (nx1 - nx0) * N.s, (ny1 - ny0) * N.s, nx0, ny0, nx1 - nx0, ny1 - ny0);
    }
    // Nur den sichtbaren Ausschnitt des großen Geländebildes kopieren
    const x0 = clamp(Math.floor(view.x0) - 2, 0, W), y0 = clamp(Math.floor(view.y0) - 2, 0, H);
    const x1 = clamp(Math.ceil(view.x1) + 2, 0, W), y1 = clamp(Math.ceil(view.y1) + 2, 0, H);
    if (x1 > x0 && y1 > y0) c.drawImage(this.terrain.canvas, x0 * RES, y0 * RES, (x1 - x0) * RES, (y1 - y0) * RES, x0, y0, x1 - x0, y1 - y0);
    const gy = GROUND * T - this.grass.h + 4;
    if (gy < view.y1 && gy + this.grass.h > view.y0 && x1 > x0) {
      c.drawImage(this.grass.img, x0 * RES, 0, (x1 - x0) * RES, this.grass.img.height, x0, gy, x1 - x0, this.grass.h);
    }
    return this.worldCache;
  }

  /** Vorgemalte Panoramen (fern & mitte) mit Parallaxe; nachts überblendet in die dunkle Fassung. */
  drawPano(ctx, gy, night) {
    const z = this.cam.z;
    for (const L of [this.kulisse.fern, this.kulisse.mitte]) {
      if (!L) continue;
      const x = (L.u0 - this.cam.x * L.par) * z, y = gy - L.G * z, w = L.w * z, h = L.h * z;
      // nur den sichtbaren Streifen kopieren; ganz Tag/Nacht → nur eine Fassung
      const k = L.tag.width / L.w;
      const u0 = clamp(-x / z, 0, L.w), u1 = clamp((this.vw - x) / z, 0, L.w);
      if (u1 <= u0) continue;
      const sx = u0 * k, sw = (u1 - u0) * k, dx = x + u0 * z, dw = (u1 - u0) * z;
      if (night < 0.98) ctx.drawImage(L.tag, sx, 0, sw, L.tag.height, dx, y, dw, h);
      if (night > 0.02) { ctx.globalAlpha = night < 0.98 ? night : 1; ctx.drawImage(L.nacht, sx, 0, sw, L.tag.height, dx, y, dw, h); ctx.globalAlpha = 1; }
      // unterhalb des Panoramas (nur außerhalb der Welt sichtbar) mit der Bodenfarbe auffüllen
      if (y + h < this.vh) {
        const k = 1 - night * 0.6;
        ctx.fillStyle = `rgb(${L.boden[0] * k | 0},${L.boden[1] * k | 0},${L.boden[2] * k | 0})`;
        ctx.fillRect(0, y + h - 1, this.vw, this.vh - y - h + 1);
      }
    }
  }

  drawFarHills(ctx, gy, night) {
    const layers = [
      { par: 0.15, amp: 70, base: 120, col: [120, 170, 210], f: 0.004 },
      { par: 0.3, amp: 50, base: 70, col: [90, 150, 110], f: 0.007 },
    ];
    for (const L of layers) {
      const k = 1 - night * 0.7;
      ctx.fillStyle = `rgb(${L.col[0] * k | 0},${L.col[1] * k | 0},${(L.col[2] * (1 - night * 0.4)) | 0})`;
      ctx.beginPath();
      ctx.moveTo(0, this.vh);
      for (let x = 0; x <= this.vw + 20; x += 20) {
        const wx = x / this.cam.z + this.cam.x * L.par;
        const y = gy - (L.base + Math.sin(wx * L.f) * L.amp * 0.6 + Math.sin(wx * L.f * 2.3 + 1) * L.amp * 0.4) * this.cam.z;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(this.vw, this.vh);
      ctx.fill();
    }
  }

  drawWaterShimmer(ctx, view, t) {
    const y0 = (ROWS - 2) * T;
    if (view.y1 < y0) return;
    ctx.strokeStyle = 'rgba(190,230,255,.35)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 20; i++) {
      const x = ((i * 137 + t * 20) % W);
      const y = y0 + 8 + (i % 4) * 12 + Math.sin(t * 2 + i) * 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14, y); ctx.stroke();
    }
  }

  drawFireflies(ctx, t, night) {
    for (let i = 0; i < 18; i++) {
      const x = ((i * 211.7 + Math.sin(t * 0.3 + i) * 80) % W + W) % W;
      const y = GROUND * T - 30 - (i % 7) * 22 + Math.sin(t * 0.8 + i * 2) * 15;
      const a = night * (0.5 + 0.5 * Math.sin(t * 3 + i * 1.7));
      drawGlow(ctx, '230,255,140', x, y, 9, a);
    }
  }

  drawButterflies(ctx, t) {
    for (let i = 0; i < 4; i++) {
      const x = ((i * 480 + t * (14 + i * 3)) % (W + 200)) - 100;
      const y = GROUND * T - 70 - i * 25 + Math.sin(t * 1.5 + i) * 20;
      const flap = Math.abs(Math.sin(t * 10 + i));
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = ['#ff8fb1', '#ffd34d', '#8fc1ff', '#c48bff'][i];
      ctx.beginPath(); ctx.ellipse(-3, 0, 5 * flap + 1, 4, -0.4, 0, 7); ctx.ellipse(3, 0, 5 * flap + 1, 4, 0.4, 0, 7); ctx.fill();
      ctx.fillStyle = '#333'; ctx.fillRect(-0.6, -3, 1.2, 7);
      ctx.restore();
    }
  }

  /** Ausbau läuft: Baugerüst, Kran-Haken und Fortschrittsbalken mit Ziel-Symbol. */
  drawAusbau(ctx, r, rx, ry, rw, rh, t) {
    const Z = GEBAEUDE[r.ausbau.ziel];
    const p = r.ausbau.p;
    ctx.save();
    ctx.strokeStyle = 'rgba(214,160,90,.85)'; ctx.lineWidth = 2;
    for (let x = rx + 8; x <= rx + rw - 8; x += 22) { ctx.beginPath(); ctx.moveTo(x, ry + rh - 12); ctx.lineTo(x, ry + 8); ctx.stroke(); }
    for (const y of [ry + 14, ry + rh * 0.55]) { ctx.beginPath(); ctx.moveTo(rx + 6, y); ctx.lineTo(rx + rw - 6, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(214,160,90,.5)'; ctx.lineWidth = 1;
    for (let x = rx + 8; x < rx + rw - 22; x += 22) { ctx.beginPath(); ctx.moveTo(x, ry + 14); ctx.lineTo(x + 22, ry + rh * 0.55); ctx.stroke(); }
    // schwingender Haken mit Baustein
    const hx = rx + rw * 0.7 + Math.sin(t * 1.6) * 6, hy = ry + 10 + (1 + Math.sin(t * 0.9)) * 8;
    ctx.strokeStyle = '#ddd'; ctx.beginPath(); ctx.moveTo(rx + rw * 0.7, ry + 6); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = '#c98a4a'; ctx.fillRect(hx - 4, hy, 8, 6);
    ctx.restore();
    const bw = Math.min(90, rw - 16), bx = rx + (rw - bw) / 2, by = ry - 4;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.roundRect(bx - 16, by - 4, bw + 20, 14, 7); ctx.fill();
    ctx.fillStyle = '#7ee08a'; ctx.beginPath(); ctx.roundRect(bx, by, Math.max(4, bw * p), 6, 3); ctx.fill();
    emoji(ctx, Z.icon, bx - 8, by + 8, 10);
  }

  verteileBrut(st) {
    const map = new Map();
    const stuben = st.rooms.filter(r => (r.typ === 'brut' || r.typ === 'koenigin') && r.bau >= 1);
    if (!stuben.length) return map;
    const cap = r => (r.typ === 'koenigin' ? 6 : 14);
    for (const r of stuben) map.set(r.id, { ei: 0, larve: 0, puppe: 0, n: 0 });
    let i = 0;
    for (const b of st.brut) {
      let tries = 0;
      while (tries++ < stuben.length) {
        const r = stuben[i % stuben.length];
        const m = map.get(r.id);
        i++;
        if (m.n < cap(r)) { m[b.s]++; m.n++; break; }
      }
    }
    return map;
  }

  drawParticles(ctx, dt) {
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind !== 'text') p.vy += 120 * dt;
      const a = 1 - p.life / p.max;
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      if (p.kind === 'staub') { ctx.fillStyle = '#8a5a30'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
      else if (p.kind === 'stern') {
        ctx.fillStyle = '#ffe066';
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.life * 5);
        ctx.beginPath();
        for (let k = 0; k < 5; k++) { const a1 = k * 1.2566, a2 = a1 + 0.628; ctx.lineTo(Math.cos(a1) * p.r * 2, Math.sin(a1) * p.r * 2); ctx.lineTo(Math.cos(a2) * p.r, Math.sin(a2) * p.r); }
        ctx.fill(); ctx.restore();
      } else if (p.kind === 'herz') { emoji(ctx, '💛', p.x, p.y, 10); }
      else if (p.kind === 'text') {
        ctx.font = 'bold 14px Fredoka, sans-serif'; ctx.textAlign = 'center';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y);
      }
    }
    ctx.globalAlpha = 1;
    this.particles = this.particles.filter(p => p.life < p.max);
  }

  computeFrontier() {
    const st = this.state;
    if (this.frontierVersion === st.world.version) return;
    this.frontierVersion = st.world.version;
    const out = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const tt = st.world.typ[idx(x, y)];
      if ((tt === C.EARTH || tt === C.HILL) && canDig(st.world, x, y).ok) out.push([x, y]);
    }
    this.frontier = out;
  }

  drawOverlay(ctx, view, t) {
    const o = this.overlay, st = this.state;
    if (!o.tool) return;
    const z = this.cam.z;
    // feines Raster in der Erde
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.lineWidth = 1 / z;
    const x0 = Math.max(0, Math.floor(view.x0 / T)), x1 = Math.min(COLS, Math.ceil(view.x1 / T));
    const y0 = Math.max(0, Math.floor(view.y0 / T)), y1 = Math.min(ROWS, Math.ceil(view.y1 / T));
    ctx.beginPath();
    for (let x = x0; x <= x1; x++) { ctx.moveTo(x * T, Math.max(y0 * T, (GROUND - 9) * T)); ctx.lineTo(x * T, y1 * T); }
    for (let y = Math.max(y0, GROUND - 9); y <= y1; y++) { ctx.moveTo(x0 * T, y * T); ctx.lineTo(x1 * T, y * T); }
    ctx.stroke();

    if (o.tool === 'gang') {
      this.computeFrontier();
      const pulse = 0.25 + 0.15 * Math.sin(t * 4);
      ctx.fillStyle = `rgba(255,220,120,${pulse})`;
      for (const [x, y] of this.frontier) {
        ctx.beginPath(); ctx.roundRect(x * T + 6, y * T + 6, T - 12, T - 12, 6); ctx.fill();
      }
      if (o.drag) {
        ctx.fillStyle = 'rgba(120,255,140,.5)';
        for (const i of o.drag) { const x = i % COLS, y = (i / COLS) | 0; ctx.fillRect(x * T + 3, y * T + 3, T - 6, T - 6); }
      }
      if (o.hover) {
        const [hx, hy] = o.hover;
        const ok = canDig(st.world, hx, hy, o.drag).ok;
        ctx.strokeStyle = ok ? '#7dff8a' : '#ff6b6b';
        ctx.lineWidth = 3 / z + 1;
        ctx.strokeRect(hx * T + 2, hy * T + 2, T - 4, T - 4);
      }
    }
    if (o.tool === 'bauen' && o.typ && o.hover) {
      const g = GEBAEUDE[o.typ];
      const [ax, ay] = this.anchorFor(o.typ, o.hover);
      const res = canPlace(st.world, st.rooms, o.typ, ax, ay);
      o.placeResult = res;
      o.anchor = [ax, ay];
      // Tiefenlinie
      if (g.minTiefe && g.zone === 'erde') {
        const ly = (GROUND + g.minTiefe) * T;
        ctx.strokeStyle = 'rgba(255,230,120,.8)'; ctx.setLineDash([10, 8]); ctx.lineWidth = 2 / z + 0.5;
        ctx.beginPath(); ctx.moveTo(view.x0, ly); ctx.lineTo(view.x1, ly); ctx.stroke(); ctx.setLineDash([]);
        ctx.font = 'bold 13px Fredoka, sans-serif'; ctx.fillStyle = '#ffe680'; ctx.textAlign = 'left';
        ctx.fillText(`⬇ ${g.name} ab hier (Tiefe ${g.minTiefe})`, view.x0 + 12 / z, ly - 6);
      }
      const col = res.ok ? '120,255,140' : '255,100,100';
      ctx.fillStyle = `rgba(${col},.28)`;
      ctx.strokeStyle = `rgba(${col},.95)`;
      ctx.lineWidth = 2.5 / z + 0.5;
      ctx.beginPath(); ctx.roundRect(ax * T + 2, ay * T + 2, g.w * T - 4, g.h * T - 4, 14); ctx.fill();
      ctx.setLineDash([8, 6]); ctx.stroke(); ctx.setLineDash([]);
      // ersetzte Gänge markieren
      if (res.ok && res.ersetzt) {
        ctx.fillStyle = 'rgba(255,210,80,.45)';
        for (let yy = ay; yy < ay + g.h; yy++) for (let xx = ax; xx < ax + g.w; xx++) if (get(st.world, xx, yy) === C.TUNNEL) ctx.fillRect(xx * T + 8, yy * T + 8, T - 16, T - 16);
      }
      emoji(ctx, g.icon, (ax + g.w / 2) * T, (ay + g.h / 2) * T + 10, 26, 0.9);
    }
    if (o.tool === 'abriss' && o.hover) {
      const [hx, hy] = o.hover;
      const tt = get(st.world, hx, hy);
      ctx.fillStyle = 'rgba(255,80,80,.35)';
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 3 / z + 1;
      if (tt === C.ROOM) {
        const r = st.rooms.find(rr => rr.id === st.world.raum[idx(hx, hy)]);
        if (r) { const m = raumMasse(r); ctx.beginPath(); ctx.roundRect(r.x * T, r.y * T, m.w * T, m.h * T, 14); ctx.fill(); ctx.stroke(); }
      } else if (tt === C.TUNNEL) {
        ctx.fillRect(hx * T, hy * T, T, T); ctx.strokeRect(hx * T, hy * T, T, T);
      }
    }
  }

  /** Mauszeiger liegt in der Mitte des Bauplans */
  anchorFor(typ, [hx, hy]) {
    const g = GEBAEUDE[typ];
    let ax = hx - Math.floor((g.w - 1) / 2), ay = hy - Math.floor((g.h - 1) / 2);
    if (g.zone === 'oberflaeche') ay = GROUND - g.h;
    return [ax, ay];
  }
}

export { SIM, hillSurfaceY };
