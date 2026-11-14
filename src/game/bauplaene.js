// Baupläne & Ausbau: Baupläne werden im Quiz dauerhaft freigeschaltet.
// Stufe 1 einer Entwicklungslinie wird neu gebaut, höhere Stufen entstehen durch Ausbau.
import { GEBAEUDE, LINIEN, START_PLAENE, rangVon } from './config.js';
import { hatTech } from './forschung.js';
import { emit } from '../events.js';

const LINIEN_REIHE = Object.keys(LINIEN);

export const istFrei = (state, typ) => !!state.bauplaene?.[typ];
export const bevoelkerung = state => state.volk.arbeiterinnen + state.volk.drohnen + 1;
export const rangVonState = state => rangVon(bevoelkerung(state));

/** Bauplan freischalten. Gibt true zurück, wenn er neu ist. */
export function schalteFrei(state, typ, quelle = 'quiz') {
  if (!GEBAEUDE[typ] || istFrei(state, typ)) return false;
  state.bauplaene ??= {};
  state.bauplaene[typ] = { tag: Math.floor((state.zeit ?? 0) / 240) + 1, quelle };
  emit('bauplan', typ);
  return true;
}

/** Benötigtes Test-Niveau (1–3) für einen Bauplan: höhere Ausbaustufen gibt es nur in schwierigeren Tests. */
export const noetigesNiveau = typ => Math.min(3, Math.ceil((GEBAEUDE[typ]?.lstufe ?? 1) / 2));

/** Kann dieser Bauplan gerade gewonnen werden? (Vorstufe freigeschaltet, Kolonie groß genug, Forschung) */
export function planVerfuegbar(state, typ, rang = rangVonState(state)) {
  const G = GEBAEUDE[typ];
  if (!G || typ === 'koenigin' || istFrei(state, typ)) return false;
  if (G.vorige && !istFrei(state, G.vorige)) return false;
  if ((G.stufe ?? 0) > rang + 1) return false;
  if (G.forschung && !hatTech(state, G.forschung)) return false;
  if (typ === 'handel' && !(hatTech(state, 'diplomatie') || rang >= 3)) return false;
  return true;
}

/** Warum ist ein Bauplan (noch) nicht zu gewinnen? (für das Bauplan-Buch) */
export function planSperre(state, typ, rang = rangVonState(state)) {
  const G = GEBAEUDE[typ];
  if (istFrei(state, typ)) return null;
  if (G.vorige && !istFrei(state, G.vorige)) return `Erst „${GEBAEUDE[G.vorige].name}" freischalten`;
  if ((G.stufe ?? 0) > rang + 1) return `Ab ${['', 'dem Ameisendorf', 'der Ameisenstadt', 'der Metropole', 'dem Ameisenreich'][G.stufe - 1] ?? 'später'} (Volk wächst)`;
  if (G.forschung && !hatTech(state, G.forschung)) return 'Braucht Forschung';
  if (typ === 'handel' && !(hatTech(state, 'diplomatie') || rang >= 3)) return 'Braucht Forschung „Diplomatie"';
  return null;
}

const sortiert = typen => [...typen].sort((a, b) => {
  const A = GEBAEUDE[a], B = GEBAEUDE[b];
  return (A.lstufe - B.lstufe) || ((A.stufe ?? 0) - (B.stufe ?? 0)) || (LINIEN_REIHE.indexOf(A.linie) - LINIEN_REIHE.indexOf(B.linie));
});

/** Alle gerade gewinnbaren Baupläne, sortiert (niedrige Stufen zuerst – die Gebäude entwickeln sich Schritt für Schritt). */
export function offenePlaene(state, rang = rangVonState(state)) {
  return sortiert(Object.keys(GEBAEUDE).filter(t => planVerfuegbar(state, t, rang)));
}

/** Gewinnbare Baupläne getrennt nach „passt zum Fach" und „andere Fächer". */
export function plaeneFuerFach(state, fach, rang = rangVonState(state)) {
  const alle = offenePlaene(state, rang);
  return {
    eigen: alle.filter(t => LINIEN[GEBAEUDE[t].linie]?.fach === fach),
    fremd: alle.filter(t => LINIEN[GEBAEUDE[t].linie]?.fach !== fach),
  };
}

/** Einen zufälligen gewinnbaren Bauplan freischalten (Schatzfund, Mission, Hochzeitsflug). Gibt den Typ oder null zurück. */
export function zufallsPlan(state, quelle = 'fund') {
  const alle = offenePlaene(state).filter(t => GEBAEUDE[t].lstufe <= 2);
  const pool = alle.length ? alle : offenePlaene(state);
  if (!pool.length) return null;
  const typ = pool[Math.floor(Math.random() * Math.min(pool.length, 6))];
  schalteFrei(state, typ, quelle);
  return typ;
}

// ---------------------------------------------------------------- Bauen

/** Wie viele Gebäude dieser Linie stehen schon? */
export const anzahlLinie = (state, linie) => state.rooms.filter(r => GEBAEUDE[r.typ]?.linie === linie).length;

/** Baukosten für ein NEUES Gebäude – jedes weitere der gleichen Art wird etwas teurer. */
export function baukosten(state, typ) {
  const G = GEBAEUDE[typ];
  const n = anzahlLinie(state, G.linie);
  const f = 1 + 0.2 * n;
  return { sterne: Math.round((G.kosten ?? 0) * f), material: Math.round((G.material ?? 0) * f) };
}

/** Kann dieser Typ neu gebaut werden (nicht nur ausgebaut)? */
export const neuBaubar = typ => (GEBAEUDE[typ]?.lstufe ?? 1) === 1 && GEBAEUDE[typ]?.zone !== 'revier' && typ !== 'koenigin';

/** Freigeschaltete Baupläne, die man im Nest neu bauen kann (für die Bauleiste). */
export function baubarePlaene(state) {
  return Object.keys(GEBAEUDE).filter(t => neuBaubar(t) && istFrei(state, t))
    .sort((a, b) => LINIEN_REIHE.indexOf(GEBAEUDE[a].linie) - LINIEN_REIHE.indexOf(GEBAEUDE[b].linie));
}

// ---------------------------------------------------------------- Ausbau

export function ausbauKosten(state, ziel, rabatt = 0) {
  const G = GEBAEUDE[ziel];
  const f = Math.max(0.4, 1 - rabatt);
  return { sterne: Math.round((G.kosten ?? 0) * f), material: Math.round((G.material ?? 0) * f) };
}

/** Ausbau-Möglichkeit eines Raums: { ziel, frei, ok, grund, kosten } oder null (höchste Stufe erreicht). */
export function ausbauInfo(state, room, fx = {}) {
  const G = GEBAEUDE[room.typ];
  const ziel = G?.naechste;
  if (!ziel) return null;
  const Z = GEBAEUDE[ziel];
  const kosten = ausbauKosten(state, ziel, fx.ausbauRabatt ?? 0);
  const frei = istFrei(state, ziel);
  let grund = null;
  if (!frei) grund = `Bauplan „${Z.name}" fehlt – gewinne ihn mit einem perfekten Test im Quiz!`;
  else if (room.ausbau) grund = 'Wird gerade ausgebaut …';
  else if (room.bau < 1) grund = 'Erst fertig bauen.';
  else if (room.verbunden === false) grund = 'Keine Verbindung zur Königin.';
  else if (state.res.sterne < kosten.sterne) grund = `Du brauchst ${kosten.sterne} ⭐ (du hast ${Math.floor(state.res.sterne)}).`;
  else if ((state.res.material ?? 0) < kosten.material) grund = `Du brauchst ${kosten.material} 🪵 Baumaterial (Revier!).`;
  return { ziel, frei, ok: !grund, grund, kosten };
}

/** Ausbau starten: Das Gebäude bleibt in Betrieb, Bauarbeiterinnen bauen es zur nächsten Stufe aus. */
export function ausbauen(state, room, fx = {}) {
  const info = ausbauInfo(state, room, fx);
  if (!info) return { ok: false, grund: 'Das ist schon die höchste Stufe!' };
  if (!info.ok) return { ok: false, grund: info.grund };
  state.res.sterne -= info.kosten.sterne;
  state.res.material = (state.res.material ?? 0) - info.kosten.material;
  room.bezahlt = {
    sterne: (room.bezahlt?.sterne ?? GEBAEUDE[room.typ].kosten ?? 0) + info.kosten.sterne,
    material: (room.bezahlt?.material ?? GEBAEUDE[room.typ].material ?? 0) + info.kosten.material,
  };
  room.ausbau = { ziel: info.ziel, p: 0 };
  emit('ausbauStart', room);
  return { ok: true, ziel: info.ziel };
}

/** Ausbau abschließen (aus der Simulation aufgerufen). */
export function ausbauFertig(state, room) {
  const ziel = room.ausbau?.ziel;
  if (!ziel) return;
  room.typ = ziel;
  delete room.ausbau;
  emit('ausgebaut', room);
}

/** Startzustand der Baupläne für ein neues Spiel. */
export function startBauplaene() {
  return Object.fromEntries(START_PLAENE.map(t => [t, { tag: 1, quelle: 'start' }]));
}

/** Alte Spielstände: verbrauchbare Baupläne & gebaute Kammern → freigeschaltete Baupläne. */
export function migriereBauplaene(d) {
  if (d.bauplaene) return;
  d.bauplaene = startBauplaene();
  const frei = t => { if (GEBAEUDE[t]) d.bauplaene[t] ??= { tag: 1, quelle: 'alt' }; };
  for (const [t, n] of Object.entries(d.plaene ?? {})) if (n > 0) frei(t);
  for (const r of d.rooms ?? []) {
    // ein gebautes Gebäude schaltet seine ganze Linie bis zu dieser Stufe frei
    let t = r.typ;
    while (t) { frei(t); t = GEBAEUDE[t]?.vorige; }
  }
}
