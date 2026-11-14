// Spielstand: Neues Spiel, Speichern, Laden.
import { SAVE_KEY, GROUND, HILL_X, GEBAEUDE } from './config.js';
import { createRevier } from './revier.js';
import { createWorld, placeRoom, dig, serializeWorld, deserializeWorld, hillTop, computeConnectivity } from './world.js';

export function newGame(name = 'Königin', koloniename = 'Krümelhausen') {
  const world = createWorld(Math.floor(Math.random() * 1e6));
  const state = {
    version: 2,
    spieler: { name, koloniename },
    zeit: 0,
    res: { sterne: 40, gang: 14, nahrung: 80, joker: 3, material: 10, fp: 0 },
    plaene: { brut: 1, wohnen: 1, vorrat: 1 },
    rooms: [],
    nextRoomId: 1,
    volk: { arbeiterinnen: 8, drohnen: 0, drohnenAnteil: 0.1, eiTimer: 0, auswanderTimer: 0 },
    brut: [{ s: 'ei', t: 4, k: 'a' }, { s: 'larve', t: 10, k: 'a' }, { s: 'puppe', t: 5, k: 'a' }],
    kronenStufe: 1,
    kolonienGegruendet: 0,
    lernen: { fragen: {}, themen: {}, proFach: {}, runden: 0, richtig: 0, gesamt: 0, serie: 0, besteSerie: 0, verlauf: [] },
    minispiele: {},
    missionen: { erledigt: [], gesehen: [] },
    stats: { gegraben: 0, gebaut: 0, quizRunden: 0, minispiele: 0, hochzeitsfluege: 0, ersetzt: 0, forschungen: 0, handel: 0, revierBesuche: 0 },
    forschung: { fertig: [], aktiv: null },
    befehle: { bauMax: 3, ammen: 'normal' },
    einstellungen: { ton: true, musik: true, vorlesen: true, tempo: 1 },
    tutorial: { schritt: 0 },
    world,
  };
  state.revier = createRevier(world.seed);
  // Startlayout: Gang vom Hügel hinunter zur Königinnenkammer
  const top = hillTop(world);
  const qy = GROUND + 6;
  for (let y = top; y < qy; y++) dig(world, HILL_X, y);
  addRoom(state, 'koenigin', HILL_X - 1, qy, true);
  // kleiner Seitengang als Startpunkt
  for (let x = HILL_X + 1; x <= HILL_X + 4; x++) dig(world, x, GROUND + 3);
  computeConnectivity(world, state.rooms);
  return state;
}

export function addRoom(state, typ, x, y, fertig = false) {
  const room = { id: state.nextRoomId++, typ, x, y, bau: fertig ? 1 : 0 };
  room.ersetzt = placeRoom(state.world, room);
  state.rooms.push(room);
  return room;
}

export function save(state) {
  try {
    const data = { ...state, world: serializeWorld(state.world), gespeichert: Date.now() };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('Speichern fehlgeschlagen', e);
    return false;
  }
}

export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}

export function saveInfo() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!d) return null;
    const pop = d.volk.arbeiterinnen + d.volk.drohnen + 1;
    return { name: d.spieler.name, kolonie: d.spieler.koloniename, pop, gespeichert: d.gespeichert };
  } catch { return null; }
}

export function load() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!d) return null;
    d.rooms = d.rooms.filter(r => GEBAEUDE[r.typ]);
    d.world = deserializeWorld(d.world, d.rooms);
    computeConnectivity(d.world, d.rooms);
    // Felder späterer Versionen ergänzen
    d.lernen.verlauf ??= [];
    d.tutorial ??= { schritt: 99 };
    d.missionen.gesehen ??= [];
    migriere(d);
    return d;
  } catch (e) {
    console.warn('Laden fehlgeschlagen', e);
    return null;
  }
}

export function resetSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* egal */ }
}

/** Ältere Spielstände auf den neuen Stand bringen (Strategie-Erweiterung). */
export function migriere(d) {
  d.res.material ??= 10;
  d.res.fp ??= 0;
  d.forschung ??= { fertig: [], aktiv: null };
  d.befehle ??= { bauMax: 3, ammen: 'normal' };
  for (const k of ['forschungen', 'handel', 'revierBesuche']) d.stats[k] ??= 0;
  if (!d.revier) d.revier = createRevier(d.world.seed ?? 1);
  d.version = 2;
  return d;
}
