// Weltgitter: Erde, Gänge, Kammern, Hügel – Platzierungsregeln & Wegfindung.
import { COLS, ROWS, GROUND, DEPTH, HILL_X, WATER_ROWS, C, GEBAEUDE, hillShape } from './config.js';
import { mulberry32 } from '../util.js';

export const idx = (x, y) => y * COLS + x;
/** Größe eines Raums in Zellen. Räume merken sich ihre Maße (alte Spielstände & Ausbau behalten die Fläche). */
export const raumMasse = r => { const G = GEBAEUDE[r.typ]; return { w: r.w ?? G.w, h: r.h ?? G.h }; };
export const inBounds = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;

export function createWorld(seed = 7) {
  const typ = new Uint8Array(COLS * ROWS);
  const rnd = mulberry32(seed);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      typ[idx(x, y)] = y < GROUND ? C.AIR : y >= ROWS - WATER_ROWS ? C.WATER : C.EARTH;
    }
  }
  // Felsbrocken (unbebaubar) – nicht im Startbereich
  const blobs = 26;
  for (let i = 0; i < blobs; i++) {
    const bx = Math.floor(rnd() * COLS);
    const by = GROUND + 5 + Math.floor(rnd() * (DEPTH - 8));
    if (Math.abs(bx - HILL_X) < 7 && by < GROUND + 14) continue;
    const r = 0.8 + rnd() * 1.6;
    for (let y = Math.floor(by - r); y <= by + r; y++) {
      for (let x = Math.floor(bx - r * 1.4); x <= bx + r * 1.4; x++) {
        if (!inBounds(x, y) || y < GROUND + 3 || y >= ROWS - WATER_ROWS) continue;
        const d = ((x - bx) / (r * 1.4)) ** 2 + ((y - by) / r) ** 2;
        if (d <= 1 - rnd() * 0.25) typ[idx(x, y)] = C.ROCK;
      }
    }
  }
  // Wasseradern: ein paar Wasserzellen über dem Grundwasser
  for (let i = 0; i < 5; i++) {
    const bx = Math.floor(rnd() * COLS);
    for (let x = bx; x < bx + 3 + rnd() * 4 && x < COLS; x++) typ[idx(x, ROWS - WATER_ROWS - 1)] = C.WATER;
  }
  const world = { typ, raum: new Int16Array(COLS * ROWS).fill(-1), hill: 0, seed, version: 0 };
  setHill(world, 1);
  return world;
}

export function inHillMask(level, x, y) {
  if (y >= GROUND || level <= 0) return false;
  const { w, h } = hillShape(level);
  const dx = (x + 0.5 - (HILL_X + 0.5)) / w;
  const dy = (GROUND - y - 0.5) / h;
  return dx * dx + dy * dy <= 1;
}

export function setHill(world, level) {
  world.hill = level;
  // Eingänge merken: Gangzellen mit freiem Himmel darüber oder daneben
  const eingaenge = [];
  for (let y = 0; y < GROUND; y++) {
    for (let x = 0; x < COLS; x++) {
      if (world.typ[idx(x, y)] !== C.TUNNEL) continue;
      if ([[0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => get(world, x + dx, y + dy) === C.AIR)) eingaenge.push([x, y]);
    }
  }
  for (let y = 0; y < GROUND; y++) {
    for (let x = 0; x < COLS; x++) {
      const i = idx(x, y);
      if (world.typ[i] === C.AIR && inHillMask(level, x, y)) world.typ[i] = C.HILL;
    }
  }
  // zugeschüttete Eingänge nach oben durch den neuen Hügel verlängern
  for (const [x, y0] of eingaenge) {
    if ([[0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => get(world, x + dx, y0 + dy) === C.AIR)) continue;
    for (let y = y0 - 1; y >= 0 && world.typ[idx(x, y)] === C.HILL; y--) world.typ[idx(x, y)] = C.TUNNEL;
  }
  world.version++;
}

export function hillTop(world) {
  for (let y = 0; y < GROUND; y++) {
    const t = world.typ[idx(HILL_X, y)];
    if (t !== C.AIR) return y;
  }
  return GROUND;
}

export const get = (world, x, y) => (inBounds(x, y) ? world.typ[idx(x, y)] : C.ROCK);
const solid = t => t === C.EARTH || t === C.HILL || t === C.ROCK || t === C.WATER;

/** Kann auf dieser Zelle gelaufen werden? */
export function walkable(world, x, y) {
  if (!inBounds(x, y)) return false;
  const t = world.typ[idx(x, y)];
  if (t === C.TUNNEL || t === C.ROOM) return true;
  if (t === C.AIR) {
    const below = get(world, x, y + 1);
    if (y + 1 < ROWS && below !== C.AIR) return true;
    // Ameisen klettern auch an steilen Hügelflanken
    const l = get(world, x - 1, y), r = get(world, x + 1, y);
    return y > 0 && (l === C.HILL || r === C.HILL);
  }
  return false;
}
/** Oberflächen-Laufzelle (draußen)? */
export function isSurfaceWalk(world, x, y) {
  return get(world, x, y) === C.AIR && walkable(world, x, y);
}

function neighbors(world, x, y) {
  const out = [];
  const here = get(world, x, y);
  const surfHere = here === C.AIR;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (!walkable(world, nx, ny)) continue;
    // Raumeingänge: von draußen nur über Oberflächenzellen hinein
    out.push(nx, ny);
  }
  if (surfHere) {
    for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (isSurfaceWalk(world, nx, ny)) out.push(nx, ny);
    }
  }
  return out;
}

/** Breitensuche von (sx,sy) nach (tx,ty). Gibt Zellliste zurück oder null. */
export function findPath(world, sx, sy, tx, ty) {
  if (!walkable(world, sx, sy) || !walkable(world, tx, ty)) return null;
  const prev = new Int32Array(COLS * ROWS).fill(-2);
  const q = new Int32Array(COLS * ROWS);
  let h = 0, t = 0;
  const s = idx(sx, sy), goal = idx(tx, ty);
  q[t++] = s; prev[s] = -1;
  while (h < t) {
    const c = q[h++];
    if (c === goal) break;
    const cx = c % COLS, cy = (c / COLS) | 0;
    const n = neighbors(world, cx, cy);
    for (let k = 0; k < n.length; k += 2) {
      const ni = idx(n[k], n[k + 1]);
      if (prev[ni] !== -2) continue;
      prev[ni] = c; q[t++] = ni;
    }
  }
  if (prev[goal] === -2) return null;
  const path = [];
  for (let c = goal; c !== -1; c = prev[c]) path.push([c % COLS, (c / COLS) | 0]);
  return path.reverse();
}

/** Alle von der Königinnenkammer erreichbaren Zellen markieren. */
export function computeConnectivity(world, rooms) {
  const reach = new Uint8Array(COLS * ROWS);
  const queen = rooms.find(r => r.typ === 'koenigin');
  if (!queen) return reach;
  const q = [];
  const s = idx(queen.x, queen.y);
  reach[s] = 1; q.push(s);
  while (q.length) {
    const c = q.pop();
    const cx = c % COLS, cy = (c / COLS) | 0;
    const n = neighbors(world, cx, cy);
    for (let k = 0; k < n.length; k += 2) {
      const ni = idx(n[k], n[k + 1]);
      if (reach[ni]) continue;
      reach[ni] = 1; q.push(ni);
    }
  }
  for (const r of rooms) r.verbunden = !!reach[idx(r.x, r.y)];
  return reach;
}

const grabbar = t => t === C.EARTH || t === C.HILL;

/** Darf diese Zelle zum Gang werden? `extra` = Set mit Indizes, die gerade schon gezogen werden. */
export function canDig(world, x, y, extra) {
  if (!inBounds(x, y)) return { ok: false, grund: 'Außerhalb der Welt' };
  const t = world.typ[idx(x, y)];
  if (t === C.TUNNEL || t === C.ROOM) return { ok: false, grund: 'Hier ist schon gegraben', schon: true };
  if (t === C.ROCK) return { ok: false, grund: 'Fels! Zu hart zum Graben.' };
  if (t === C.WATER) return { ok: false, grund: 'Grundwasser – hier wird alles nass.' };
  if (!grabbar(t)) return { ok: false, grund: 'Gänge gehören in die Erde oder in den Hügel.' };
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    const nt = get(world, nx, ny);
    if (nt === C.TUNNEL || nt === C.ROOM) return { ok: true };
    if (extra && extra.has(idx(nx, ny))) return { ok: true };
  }
  return { ok: false, grund: 'Gänge müssen an einen bestehenden Gang oder eine Kammer anschließen.' };
}

export function dig(world, x, y) {
  world.typ[idx(x, y)] = C.TUNNEL;
  world.version++;
}

export function fillTunnel(world, x, y) {
  world.typ[idx(x, y)] = y < GROUND ? C.HILL : C.EARTH;
  world.version++;
}

/** Prüft, ob ein Gebäude an (x,y) (linke obere Ecke) gebaut werden darf. */
export function canPlace(world, rooms, typ, x, y) {
  const g = GEBAEUDE[typ];
  if (!g) return { ok: false, grund: 'Unbekannt' };
  if (g.einzigartig && rooms.some(r => r.typ === typ)) return { ok: false, grund: `${g.name} gibt es nur einmal.` };
  let ersetzt = 0, anschluss = false, amRand = false;
  for (let yy = y; yy < y + g.h; yy++) {
    for (let xx = x; xx < x + g.w; xx++) {
      if (!inBounds(xx, yy)) return { ok: false, grund: 'Passt nicht in die Welt.' };
      const t = world.typ[idx(xx, yy)];
      if (g.zone === 'oberflaeche') {
        if (t !== C.AIR) return { ok: false, grund: 'Muss frei auf der Wiese stehen (nicht im Hügel).' };
      } else {
        if (t === C.ROOM) return { ok: false, grund: 'Da steht schon eine Kammer.' };
        if (t === C.ROCK) return { ok: false, grund: 'Ein Felsbrocken ist im Weg.' };
        if (t === C.WATER) return { ok: false, grund: 'Zu nass – Grundwasser!' };
        if (t === C.AIR) return { ok: false, grund: g.zone === 'huegel' ? 'Muss ganz im Hügel liegen.' : 'Muss unter der Erde liegen.' };
        if (g.zone === 'huegel' && yy >= GROUND) return { ok: false, grund: 'Diese Kammer gehört in den Ameisenhügel.' };
        if (g.zone !== 'huegel' && yy < GROUND) return { ok: false, grund: 'Diese Kammer gehört unter die Erde.' };
        if (t === C.TUNNEL) { ersetzt++; anschluss = true; }
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nt = get(world, xx + dx, yy + dy);
        const drin = xx + dx >= x && xx + dx < x + g.w && yy + dy >= y && yy + dy < y + g.h;
        if (drin) continue;
        if (nt === C.TUNNEL || nt === C.ROOM) anschluss = true;
        if (nt === C.AIR) amRand = true;
      }
    }
  }
  if (g.zone === 'oberflaeche') {
    if (y + g.h !== GROUND) return { ok: false, grund: 'Muss direkt auf dem Boden stehen.' };
    for (let xx = x; xx < x + g.w; xx++) {
      if (get(world, xx, GROUND) === C.HILL) return { ok: false, grund: 'Nicht auf den Hügel bauen.' };
    }
    return { ok: true, ersetzt: 0 };
  }
  const tiefe = y - GROUND;
  if (g.minTiefe && tiefe < g.minTiefe) return { ok: false, grund: `Muss tiefer liegen (mind. ${g.minTiefe} Reihen unter der Wiese).` };
  if (g.amRand && !amRand) return { ok: false, grund: 'Muss am Rand des Hügels liegen (Ausgang nach draußen).' };
  if (!anschluss) return { ok: false, grund: 'Kammern brauchen Anschluss an einen Gang.' };
  return { ok: true, ersetzt };
}

/** Baut die Kammer ins Gitter ein. Gibt Liste ersetzter Gang-Indizes zurück. */
export function placeRoom(world, room) {
  const g = raumMasse(room);
  const ersetzt = [];
  for (let yy = room.y; yy < room.y + g.h; yy++) {
    for (let xx = room.x; xx < room.x + g.w; xx++) {
      const i = idx(xx, yy);
      if (world.typ[i] === C.TUNNEL) ersetzt.push(i);
      world.typ[i] = C.ROOM;
      world.raum[i] = room.id;
    }
  }
  world.version++;
  return ersetzt;
}

export function removeRoom(world, room) {
  const g = { ...GEBAEUDE[room.typ], ...raumMasse(room) };
  const ers = new Set(room.ersetzt ?? []);
  for (let yy = room.y; yy < room.y + g.h; yy++) {
    for (let xx = room.x; xx < room.x + g.w; xx++) {
      const i = idx(xx, yy);
      world.raum[i] = -1;
      if (ers.has(i)) world.typ[i] = C.TUNNEL;
      else if (g.zone === 'oberflaeche') world.typ[i] = C.AIR;
      else world.typ[i] = yy < GROUND ? C.HILL : C.EARTH;
    }
  }
  world.version++;
}

export function rebuildRoomIndex(world, rooms) {
  world.raum.fill(-1);
  for (const r of rooms) {
    const g = raumMasse(r);
    for (let yy = r.y; yy < r.y + g.h; yy++)
      for (let xx = r.x; xx < r.x + g.w; xx++) world.raum[idx(xx, yy)] = r.id;
  }
}

export function serializeWorld(world) {
  let s = '';
  for (let i = 0; i < world.typ.length; i++) s += world.typ[i].toString(36);
  return { typ: s, hill: world.hill, seed: world.seed };
}
export function deserializeWorld(data, rooms) {
  const typ = new Uint8Array(COLS * ROWS);
  for (let i = 0; i < typ.length; i++) typ[i] = parseInt(data.typ[i] ?? '1', 36);
  const world = { typ, raum: new Int16Array(COLS * ROWS).fill(-1), hill: data.hill, seed: data.seed, version: 1 };
  rebuildRoomIndex(world, rooms);
  return world;
}
