// Spielstand: Neues Spiel, Speichern, Laden.
import { SAVE_KEY, GROUND, HILL_X, GEBAEUDE, REVIER } from './config.js';
import { createRevier } from './revier.js';
import { startBauplaene, migriereBauplaene } from './bauplaene.js';
import { createWelt } from './welt.js';
import { createSchule } from '../quiz/stundenplan.js';
import { neueKolonieDaten } from './kolonien.js';
import { createWorld, placeRoom, dig, serializeWorld, deserializeWorld, hillTop, computeConnectivity } from './world.js';

export function newGame(name = 'Königin', koloniename = 'Krümelhausen') {
  const world = createWorld(Math.floor(Math.random() * 1e6));
  const state = {
    version: 4,
    spieler: { name, koloniename },
    zeit: 0,
    res: { sterne: 40, gang: 14, nahrung: 80, joker: 3, material: 10, fp: 0 },
    bauplaene: startBauplaene(),
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
    einstellungen: { ton: true, musik: true, vorlesen: true, tempo: 1, lernmodus: 'stundenplan' },
    tutorial: { schritt: 0 },
    schule: createSchule(),
    welt: createWelt(),
    buerger: { liste: [], nextId: 1 },
    aktiveKolonie: 'heim',
    kolonienDaten: {},
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
  const G = GEBAEUDE[typ];
  const room = { id: state.nextRoomId++, typ, x, y, w: G.w, h: G.h, bau: fertig ? 1 : 0 };
  room.ersetzt = placeRoom(state.world, room);
  state.rooms.push(room);
  return room;
}

/** Spielstand in ein speicherbares Objekt verwandeln (Gelände als Text). */
export function zuSpeicher(state) {
  const kolonienDaten = Object.fromEntries(Object.entries(state.kolonienDaten ?? {}).map(([id, k]) => [id, { ...k, world: serializeWorld(k.world) }]));
  return { ...state, world: serializeWorld(state.world), kolonienDaten, _info: undefined, gespeichert: Date.now() };
}

export function save(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(zuSpeicher(state)));
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
    return { name: d.spieler.name, kolonie: d.spieler.koloniename, pop, kolonien: 1 + (d.welt?.kolonien?.length ?? 0), gespeichert: d.gespeichert };
  } catch { return null; }
}

/** Gespeichertes Objekt wieder in einen Spielstand verwandeln. */
export function ausSpeicher(d) {
  d.rooms = d.rooms.filter(r => GEBAEUDE[r.typ]);
  stempleMasse(d.rooms);
  d.world = deserializeWorld(d.world, d.rooms);
  for (const k of Object.values(d.kolonienDaten ?? {})) {
    k.rooms = k.rooms.filter(r => GEBAEUDE[r.typ]);
    stempleMasse(k.rooms);
    k.world = deserializeWorld(k.world, k.rooms);
    computeConnectivity(k.world, k.rooms);
  }
  computeConnectivity(d.world, d.rooms);
  // Felder späterer Versionen ergänzen
  d.lernen.verlauf ??= [];
  d.tutorial ??= { schritt: 99 };
  d.missionen.gesehen ??= [];
  migriere(d);
  return d;
}

export function load() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    return d ? ausSpeicher(d) : null;
  } catch (e) {
    console.warn('Laden fehlgeschlagen', e);
    return null;
  }
}

export function resetSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* egal */ }
}

// Maße, die Gebäude in älteren Versionen hatten (Räume behalten ihre Fläche)
const ALT_MASSE = { kita: [3, 2], schule: [4, 2], universitaet: [5, 3] };
export function stempleMasse(rooms) {
  for (const r of rooms) {
    if (r.w && r.h) continue;
    const alt = ALT_MASSE[r.typ];
    r.w = alt?.[0] ?? GEBAEUDE[r.typ].w;
    r.h = alt?.[1] ?? GEBAEUDE[r.typ].h;
  }
}

/** Ältere Spielstände auf den neuen Stand bringen (Strategie-Erweiterung, Stundenplan, Baupläne, Welt). */
export function migriere(d) {
  d.res.material ??= 10;
  d.res.fp ??= 0;
  d.forschung ??= { fertig: [], aktiv: null };
  d.befehle ??= { bauMax: 3, ammen: 'normal' };
  for (const k of ['forschungen', 'handel', 'revierBesuche']) d.stats[k] ??= 0;
  if (!d.revier) d.revier = createRevier(d.world.seed ?? 1);
  // Version 3: größeres Revier, Baupläne, Stundenplan, Welt, Ameisen-Bürgerinnen
  if (d.revier.sicht?.length !== REVIER.W * REVIER.H) {
    const alt = d.revier;
    d.revier = createRevier(d.world.seed ?? 1);
    for (const k of ['gefunden', 'vertrieben', 'expeditionen']) d.revier[k] = alt[k] ?? 0;
    d.revier.besucht = !!alt.besucht;
    d.revier.gewachsen = true;
  }
  stempleMasse(d.rooms ?? []);
  migriereBauplaene(d);
  d.schule ??= createSchule();
  d.welt ??= createWelt();
  d.buerger ??= { liste: [], nextId: 1 };
  // Version 4: mehrere bebaubare Kolonien, Straßen, Botenlinien, Besuche
  d.aktiveKolonie ??= 'heim';
  d.kolonienDaten ??= {};
  const W = d.welt;
  W.strassen ??= []; W.boten ??= []; W.besuche ??= []; W.nextRoute ??= 1; W.bewusstsein ??= 0;
  for (const k of W.kolonien ?? []) if (!d.kolonienDaten[k.ort] && d.aktiveKolonie !== k.ort) d.kolonienDaten[k.ort] = neueKolonieDaten(d, k.ort);
  d.bauplaene.hochzeit ??= { tag: 1, quelle: 'start' };
  d.einstellungen.lernmodus ??= 'stundenplan';
  d.version = 4;
  return d;
}
