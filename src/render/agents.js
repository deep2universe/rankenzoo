// Sichtbare Ameisen, die wirklich durch die Gänge laufen.
import { TILE as T, COLS, GROUND, C, GEBAEUDE } from '../game/config.js';
import { findPath, walkable, get, idx, isSurfaceWalk } from '../game/world.js';
import { hillSurfaceY } from './terrain.js';
import { drawAntFast as drawAnt, drawEmoji } from './sprites.js';
import { pick, rand, randInt } from '../util.js';

const MAX_SICHTBAR = 90;
let nextId = 1;

export class Agents {
  constructor() {
    this.list = [];
    this.syncTimer = 0;
    this.flieger = []; // Hochzeitsflug-Ameisen
  }

  reset() { this.list = []; this.flieger = []; }

  cellPos(state, cx, cy) {
    const w = state.world;
    const t = get(w, cx, cy);
    const x = (cx + 0.5) * T;
    if (t === C.AIR || (t === C.ROOM && cy < GROUND && this.roomAt(state, cx, cy)?.zone === 'oberflaeche')) {
      const hy = hillSurfaceY(w.hill, x);
      return [x, Math.min(GROUND * T, hy ?? GROUND * T) - 1];
    }
    if (t === C.ROOM) {
      const r = this.roomAt(state, cx, cy);
      if (r) return [x, (r.y + r.h) * T - 12];
    }
    return [x, (cy + 0.5) * T + 7];
  }

  roomAt(state, cx, cy) {
    const id = state.world.raum[idx(cx, cy)];
    if (id < 0) return null;
    // Raum-Infos zwischenspeichern (wird pro Ameise und Bild mehrfach gebraucht)
    if (this._roomsRef !== state.rooms || this._roomsLen !== state.rooms.length) {
      this._roomsRef = state.rooms; this._roomsLen = state.rooms.length;
      this._roomInfo = new Map();
      for (const r of state.rooms) {
        const g = GEBAEUDE[r.typ];
        this._roomInfo.set(r.id, { id: r.id, typ: r.typ, x: r.x, y: r.y, w: g.w, h: g.h, zone: g.zone });
      }
    }
    return this._roomInfo.get(id) ?? null;
  }

  /** Gewünschte Zusammensetzung aus der Simulation ableiten und Ameisen ergänzen/entfernen. */
  sync(state, d) {
    const v = state.volk;
    const scale = Math.min(1, MAX_SICHTBAR / Math.max(1, v.arbeiterinnen));
    const want = [];
    const roomsById = new Map(state.rooms.map(r => [r.id, r]));
    // Personal
    for (const [rid, n] of d.personal) {
      const r = roomsById.get(rid);
      if (!r || n <= 0) continue;
      const g = GEBAEUDE[r.typ];
      const k = Math.min(3, Math.max(1, Math.round(n * scale)));
      for (let i = 0; i < k; i++) want.push({ job: 'personal', roomId: rid, acc: g.beruf?.acc });
    }
    for (const [rid, n] of d.bauProStelle) for (let i = 0; i < Math.min(3, n); i++) want.push({ job: 'bau', roomId: rid });
    const ammen = Math.min(8, Math.round(d.jobs.ammen * scale));
    for (let i = 0; i < ammen; i++) want.push({ job: 'amme', acc: 'haube' });
    const sammler = Math.min(40, Math.round((d.jobs.sammler + (d.jobs.revier ?? 0)) * scale));
    for (let i = 0; i < sammler; i++) want.push({ job: 'sammler' });
    const drohnen = Math.min(12, v.drohnen);
    for (let i = 0; i < drohnen; i++) want.push({ job: 'drohne', rolle: 'drohne' });

    const key = w => `${w.job}:${w.roomId ?? ''}`;
    const pool = new Map();
    for (const a of this.list) {
      const k = key(a);
      if (!pool.has(k)) pool.set(k, []);
      pool.get(k).push(a);
    }
    const next = [];
    for (const w of want) {
      const arr = pool.get(key(w));
      if (arr && arr.length) next.push(arr.pop());
      else next.push(this.spawn(state, w));
    }
    this.list = next.filter(Boolean);
  }

  spawn(state, w) {
    const queen = state.rooms.find(r => r.typ === 'koenigin');
    let start = queen;
    if (w.roomId) start = state.rooms.find(r => r.id === w.roomId) ?? queen;
    if (!start) return null;
    const g = GEBAEUDE[start.typ];
    const cx = start.x + randInt(0, g.w - 1), cy = start.y + g.h - 1;
    const [x, y] = this.cellPos(state, cx, cy);
    return {
      id: nextId++, job: w.job, roomId: w.roomId, acc: w.acc, rolle: w.rolle ?? 'arbeiterin',
      x, y, cx, cy, path: null, pi: 0, seg: 0, dir: Math.random() < 0.5 ? 1 : -1, tilt: 0,
      phase: Math.random() * 10, wait: rand(0, 2), last: null, hidden: 0, speed: rand(26, 36),
      L: w.rolle === 'drohne' ? 18 : rand(16, 18.5), roomX: Math.random(),
    };
  }

  /** Neues Ziel wählen */
  decide(a, state) {
    const rooms = state.rooms.filter(r => r.verbunden !== false);
    const roomCell = (r, bottom = true) => {
      const g = GEBAEUDE[r.typ];
      return [r.x + randInt(0, g.w - 1), bottom ? r.y + g.h - 1 : r.y + randInt(0, g.h - 1)];
    };
    let target = null;
    switch (a.job) {
      case 'sammler': {
        if (a.last) {
          const lager = rooms.filter(r => r.typ === 'vorrat' && r.bau >= 1);
          const ziel = lager.length ? pick(lager) : rooms.find(r => r.typ === 'koenigin');
          if (ziel) target = roomCell(ziel);
          a.onArrive = 'abladen';
        } else {
          const edge = Math.random() < 0.5 ? 0 : COLS - 1;
          target = [edge, GROUND - 1];
          a.onArrive = 'raus';
        }
        break;
      }
      case 'personal':
      case 'bau': {
        const r = state.rooms.find(rr => rr.id === a.roomId);
        if (r) target = roomCell(r);
        a.onArrive = 'arbeiten';
        break;
      }
      case 'amme': {
        const brut = rooms.filter(r => (r.typ === 'brut' || r.typ === 'kita' || r.typ === 'koenigin') && r.bau >= 1);
        if (brut.length) target = roomCell(pick(brut));
        a.onArrive = 'arbeiten';
        break;
      }
      default: {
        const r = pick(rooms.filter(rr => rr.bau >= 1));
        if (r) target = roomCell(r);
        a.onArrive = 'bummeln';
      }
    }
    if (!target) { a.wait = 2; return; }
    if (!walkable(state.world, a.cx, a.cy)) this.rescue(a, state);
    const p = findPath(state.world, a.cx, a.cy, target[0], target[1]);
    if (!p || p.length < 2) {
      a.wait = rand(1, 3);
      if (!p) this.rescue(a, state);
      else this.arrive(a, state);
      return;
    }
    a.path = p; a.pi = 0; a.seg = 0;
  }

  rescue(a, state) {
    const q = state.rooms.find(r => r.typ === 'koenigin');
    if (!q) return;
    a.cx = q.x + 1; a.cy = q.y + 2;
    [a.x, a.y] = this.cellPos(state, a.cx, a.cy);
    a.path = null;
  }

  arrive(a, state) {
    a.path = null;
    switch (a.onArrive) {
      case 'raus':
        a.hidden = rand(4, 10);
        a.last = pick(['blatt', 'blatt', 'krume', 'tropfen']);
        break;
      case 'abladen':
        a.last = null;
        a.wait = rand(0.5, 1.5);
        a.pop = 1;
        break;
      case 'arbeiten':
        a.wait = a.job === 'bau' ? rand(2, 5) : rand(2, 6);
        break;
      default:
        a.wait = rand(2, 6);
    }
  }

  update(dt, state, d) {
    this.syncTimer -= dt;
    if (this.syncTimer <= 0) { this.sync(state, d); this.syncTimer = 1.2; }
    const tempo = 1 + (d.fx.tempo ?? 0);
    for (const a of this.list) {
      if (a.hidden > 0) { a.hidden -= dt; continue; }
      if (a.pop) a.pop = Math.max(0, a.pop - dt * 2);
      if (!a.path) {
        a.wait -= dt;
        // im Raum etwas hin und her trippeln
        if (a.wait > 0) {
          a.phase += dt * 2;
          if (a.job === 'bau') a.work = (a.work ?? 0) + dt;
          if ((a.job === 'personal' || a.job === 'amme' || a.job === 'drohne') && Math.random() < dt * 0.5) {
            const r = this.roomAt(state, a.cx, a.cy);
            if (r && r.zone !== 'oberflaeche' && GEBAEUDE[r.typ]) {
              const nx = r.x + randInt(0, r.w - 1);
              const p = findPath(state.world, a.cx, a.cy, nx, r.y + r.h - 1);
              if (p && p.length > 1) { a.path = p; a.pi = 0; a.seg = 0; a.onArrive = 'arbeiten'; }
            }
          }
          continue;
        }
        this.decide(a, state);
        continue;
      }
      // dem Pfad folgen
      const p = a.path;
      if (a.pi >= p.length - 1) {
        a.cx = p[p.length - 1][0]; a.cy = p[p.length - 1][1];
        this.arrive(a, state);
        continue;
      }
      if (!a.px || a.pxFor !== p) { a.px = p.map(([cx, cy]) => this.cellPos(state, cx, cy)); a.pxFor = p; }
      const [x0, y0] = a.px[a.pi];
      const [x1, y1] = a.px[a.pi + 1];
      const len = Math.hypot(x1 - x0, y1 - y0) || 1;
      a.seg += (dt * a.speed * tempo) / len;
      a.phase += dt * a.speed * tempo * 0.45;
      if (a.seg >= 1) {
        a.seg = 0; a.pi++;
        a.cx = p[a.pi][0]; a.cy = p[a.pi][1];
        if (!walkable(state.world, a.cx, a.cy)) { a.path = null; this.rescue(a, state); continue; }
        continue;
      }
      a.x = x0 + (x1 - x0) * a.seg;
      a.y = y0 + (y1 - y0) * a.seg;
      const dx = x1 - x0, dy = y1 - y0;
      if (Math.abs(dx) > 0.5) a.dir = dx > 0 ? 1 : -1;
      const ang = Math.atan2(dy, Math.max(Math.abs(dx), 0.0001));
      const tgt = Math.max(-1.35, Math.min(1.35, ang)) * a.dir;
      a.tilt += (tgt - a.tilt) * Math.min(1, dt * 10);
    }
    // Hochzeitsflug-Ameisen
    for (const f of this.flieger) {
      f.t += dt;
      f.x += f.vx * dt; f.y += f.vy * dt;
      f.vy -= 6 * dt; f.vx += Math.sin(f.t * 2 + f.seed) * 8 * dt;
    }
    this.flieger = this.flieger.filter(f => f.t < 9);
  }

  startFlight(x, y, n = 24) {
    for (let i = 0; i < n; i++) {
      this.flieger.push({ x: x + rand(-20, 20), y: y + rand(-6, 6), vx: rand(-40, 40), vy: rand(-60, -25), t: -i * 0.12, seed: rand(0, 9), koenigin: i % 5 === 0 });
    }
  }

  draw(ctx, view, t) {
    for (const a of this.list) {
      if (a.hidden > 0) continue;
      if (a.x < view.x0 - 30 || a.x > view.x1 + 30 || a.y < view.y0 - 30 || a.y > view.y1 + 30) continue;
      const working = !a.path && a.job === 'bau' && a.wait > 0;
      drawAnt(ctx, {
        x: a.x, y: a.y - (working ? Math.abs(Math.sin(t * 8 + a.id)) * 2 : 0), L: a.L, dir: a.dir, tilt: a.path ? a.tilt : 0, phase: a.phase,
        rolle: a.rolle, acc: a.job === 'bau' ? 'muetze' : a.acc, last: a.last ?? (working ? 'erde' : null), walking: !!a.path,
        wings: a.rolle === 'drohne',
      });
      if (a.pop > 0) {
        drawEmoji(ctx, '🍯', a.x, a.y - 16 - (1 - a.pop) * 14, 10, a.pop);
      }
    }
    for (const f of this.flieger) {
      if (f.t < 0) continue;
      drawAnt(ctx, { x: f.x, y: f.y, L: f.koenigin ? 20 : 15, dir: f.vx > 0 ? 1 : -1, tilt: -0.3, phase: f.t * 30, rolle: f.koenigin ? 'koenigin' : 'drohne', wings: true, walking: false, alpha: Math.min(1, (9 - f.t) / 2) });
    }
  }

  /** Für Klick-Info: Ameise unter Mauszeiger */
  hit(wx, wy) {
    for (const a of this.list) {
      if (a.hidden > 0) continue;
      if (Math.abs(a.x - wx) < 9 && Math.abs(a.y - 4 - wy) < 9) return a;
    }
    return null;
  }
}

export { isSurfaceWalk };
