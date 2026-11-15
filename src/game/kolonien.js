// Mehrere Ameisenstaaten: Das Heimatnest ('heim') und bis zu 19 Tochterkolonien (IDs = Orts-IDs).
// Die gerade gezeigte Kolonie liegt in den gewohnten Feldern des Spielstands (state.world, state.rooms, …),
// alle anderen ruhen in state.kolonienDaten und werden im Hintergrund leise weitersimuliert.
// Gemeinsam für alle: Sterne, Gangstücke, Baumaterial, Forschungspunkte, Joker, Baupläne, Forschung, Schule.
// Je Kolonie: Gelände, Kammern, Volk, Brut, Nahrung (mit eigenem Lager) und Revier.
import { GROUND, HILL_X, GEBAEUDE, SIM } from './config.js';
import { createWorld, dig, hillTop, computeConnectivity, canPlace, canDig, placeRoom } from './world.js';
import { createRevier } from './revier.js';
import { ortById, BIOME } from './welt.js';
import { tick, derive } from './sim.js';
import { leise } from '../events.js';

/** Felder, die zu einer einzelnen Kolonie gehören. */
export const KOLONIE_FELDER = ['world', 'rooms', 'nextRoomId', 'volk', 'brut', 'revier', 'gruendung', '_sterneRest', '_revSterne'];

export const aktiveId = state => state.aktiveKolonie ?? 'heim';
export const kolonieIds = state => ['heim', ...(state.welt?.kolonien ?? []).map(k => k.ort)];
export const anzahlKolonien = state => kolonieIds(state).length;

export function kolonieName(state, id) {
  if (id === 'heim') return state.spieler?.koloniename ?? 'Heimatnest';
  return state.welt?.kolonien.find(k => k.ort === id)?.name ?? ortById(id)?.name ?? id;
}
export const kolonieBiom = (state, id) => (id === 'heim' ? 'heim' : ortById(id)?.biom ?? 'heim');

/** Daten einer Kolonie lesen – egal ob aktiv oder im Hintergrund. */
export function kolonieDaten(state, id) {
  if (id === aktiveId(state)) {
    const o = { nahrung: state.res.nahrung, aktiv: true };
    for (const f of KOLONIE_FELDER) o[f] = state[f];
    return o;
  }
  return state.kolonienDaten?.[id] ?? null;
}

function packe(state) {
  const k = { nahrung: state.res.nahrung };
  for (const f of KOLONIE_FELDER) k[f] = state[f];
  return k;
}
function entpacke(state, k) {
  for (const f of KOLONIE_FELDER) state[f] = k[f];
  state.res.nahrung = k.nahrung ?? 0;
}

/** Zur anderen Kolonie wechseln (die bisherige ruht dann im Hintergrund). */
export function wechsleKolonie(state, id) {
  const alt = aktiveId(state);
  if (id === alt || !state.kolonienDaten?.[id]) return false;
  const k = state.kolonienDaten[id];
  state.kolonienDaten[alt] = { ...packe(state), info: state._info ?? state.kolonienDaten[alt]?.info };
  delete state.kolonienDaten[id];
  entpacke(state, k);
  state.aktiveKolonie = id;
  computeConnectivity(state.world, state.rooms);
  return true;
}

/** Kammern-Platz suchen (für das Startnest einer neuen Kolonie). */
function setzeIrgendwo(k, typ, y0, y1) {
  for (let y = y0; y <= y1; y++) for (let dx = 0; dx < 24; dx++) for (const s of [1, -1]) {
    const x = HILL_X + s * dx;
    if (canPlace(k.world, k.rooms, typ, x, y).ok) {
      const G = GEBAEUDE[typ];
      const room = { id: k.nextRoomId++, typ, x, y, w: G.w, h: G.h, bau: 1, bezahlt: { sterne: 0, material: 0 } };
      room.ersetzt = placeRoom(k.world, room);
      k.rooms.push(room);
      return room;
    }
  }
  return null;
}

/**
 * Daten für eine neue Tochterkolonie: Gelände der Gegend, ein fertiges Startnest
 * (Königinnenkammer, Kinderstube, Schlafkammer, Vorratskammer) und ein paar mitgeflogene Arbeiterinnen.
 * So kann das Kind sofort weiterbauen, ohne lange zu warten.
 */
export function neueKolonieDaten(state, ortId, mitflieger = 8) {
  const ort = ortById(ortId);
  const seed = Math.floor(Math.random() * 1e6);
  const world = createWorld(seed, ort?.biom ?? 'heim');
  const k = { world, rooms: [], nextRoomId: 1 };
  const top = hillTop(world);
  const qy = GROUND + 6;
  for (let y = top; y < qy; y++) dig(world, HILL_X, y);
  const q = GEBAEUDE.koenigin;
  const queen = { id: k.nextRoomId++, typ: 'koenigin', x: HILL_X - 1, y: qy, w: q.w, h: q.h, bau: 1 };
  queen.ersetzt = placeRoom(world, queen);
  k.rooms.push(queen);
  // Gangnetz: zwei Quergänge, damit die Startkammern Anschluss haben
  for (const gy of [GROUND + 3, GROUND + 10]) for (let x = HILL_X - 9; x <= HILL_X + 9; x++) if (canDig(world, x, gy).ok) dig(world, x, gy);
  for (let y = qy + 3; y <= GROUND + 10; y++) if (canDig(world, HILL_X + 2, y).ok) dig(world, HILL_X + 2, y);
  setzeIrgendwo(k, 'brut', GROUND + 1, GROUND + 9);
  setzeIrgendwo(k, 'wohnen', GROUND + 1, GROUND + 9);
  setzeIrgendwo(k, 'vorrat', GROUND + 4, GROUND + 12);
  computeConnectivity(world, k.rooms);
  return {
    ...k,
    volk: { arbeiterinnen: 6 + mitflieger, drohnen: 0, drohnenAnteil: 0.12, eiTimer: 0, auswanderTimer: 0 },
    brut: [{ s: 'ei', t: 2, k: 'a' }, { s: 'ei', t: 8, k: 'a' }, { s: 'larve', t: 6, k: 'a' }, { s: 'puppe', t: 12, k: 'a' }],
    revier: createRevier(seed + 3),
    gruendung: Math.floor((state.zeit ?? 0) / SIM.tagDauer) + 1,
    nahrung: 110,
  };
}

/** Eine (im Hintergrund ruhende) Kolonie als „Spielstand" zum Rechnen – gemeinsame Werte bleiben geteilt. */
export function kolonieProxy(state, k) {
  const p = Object.create(state);
  for (const f of KOLONIE_FELDER) p[f] = k[f];
  p.res = new Proxy(state.res, {
    get: (t, key) => (key === 'nahrung' ? k.nahrung : t[key]),
    set: (t, key, v) => { if (key === 'nahrung') k.nahrung = v; else t[key] = v; return true; },
  });
  p.forschung = { fertig: state.forschung?.fertig ?? [], aktiv: null }; // geforscht wird nur einmal (in der aktiven Kolonie)
  p.zeit = state.zeit;
  p._hintergrund = true;
  return p;
}

/** Kurzinfo aus abgeleiteten Werten. */
export function infoAus(d, nahrung, k) {
  return {
    pop: d.pop, zufriedenheit: d.zufriedenheit, nahrung, lager: d.lager, nahrungProSek: d.nahrungProSek, verbrauch: d.verbrauch,
    quote: { ...d.quote }, wohnraum: d.wohnraum, rang: d.rang, brut: k.brut?.length ?? 0, drohnen: k.volk?.drohnen ?? 0,
    arbeiterinnen: k.volk?.arbeiterinnen ?? 0, hotel: d.fx.hotel ?? 0, bildung: d.versorgung?.bildung ?? 0, fp: d.fpProSek * 60,
  };
}

/** Infos einer Hintergrund-Kolonie berechnen (z. B. direkt nach der Gründung). */
export function berechneInfo(state, id) {
  const k = state.kolonienDaten?.[id];
  if (!k) return null;
  const d = derive(kolonieProxy(state, k));
  k.info = infoAus(d, k.nahrung, k);
  return k.info;
}

/**
 * Alle Hintergrund-Kolonien weitersimulieren (leise: ihre Ereignisse werden gesammelt und zurückgegeben).
 * dt in Sekunden – wird z. B. einmal pro Sekunde aufgerufen.
 */
export function kolonienTick(state, dt) {
  const ereignisse = [];
  for (const [id, k] of Object.entries(state.kolonienDaten ?? {})) {
    const p = kolonieProxy(state, k);
    let d = null;
    const evs = leise(() => { d = tick(p, dt); });
    for (const f of KOLONIE_FELDER) k[f] = p[f]; // tick ersetzt manche Listen (z. B. die Brut)
    k.info = infoAus(d, k.nahrung, k);
    for (const [typ, data] of evs) ereignisse.push({ kolonie: id, typ, data });
  }
  return ereignisse;
}

/** Drohnen aller Kolonien zusammen. */
export function drohnenGesamt(state) {
  let n = state.volk.drohnen;
  for (const k of Object.values(state.kolonienDaten ?? {})) n += k.volk?.drohnen ?? 0;
  return n;
}
/** n Drohnen für einen Hochzeitsflug nehmen – zuerst aus den Kolonien mit den meisten Drohnen. */
export function nimmDrohnen(state, n) {
  const volker = [state.volk, ...Object.values(state.kolonienDaten ?? {}).map(k => k.volk)].filter(Boolean).sort((a, b) => b.drohnen - a.drohnen);
  for (const v of volker) { const x = Math.min(n, v.drohnen); v.drohnen -= x; n -= x; if (n <= 0) break; }
}

/** Gründungsbonus: Junge Kolonien wachsen in den ersten Tagen besonders schnell. */
export function gruendungsBonus(state) {
  if (!state.gruendung) return 0;
  const tag = Math.floor((state.zeit ?? 0) / SIM.tagDauer) + 1;
  return Math.max(0, 1 - (tag - state.gruendung) / 4);
}

export { BIOME };
