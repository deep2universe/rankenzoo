// Spieleraktionen: Graben, Bauen, Abreißen, Hügel ausbauen, Hochzeitsflug, Belohnungen.
import { GEBAEUDE, hillUpgradeCost, HILL_MAX } from './config.js';
import { canDig, dig, canPlace, removeRoom, fillTunnel, setHill, get, idx } from './world.js';
import { addRoom } from './state.js';
import { refreshConnectivity } from './sim.js';
import { C } from './config.js';
import { emit } from '../events.js';
import { istFrei, baukosten, neuBaubar, offenePlaene, schalteFrei, zufallsPlan } from './bauplaene.js';
import { gruendeKolonie, ortById, drohnenNoetig } from './welt.js';
import { neueKolonieDaten, nimmDrohnen, berechneInfo } from './kolonien.js';

export function digCell(state, x, y, extra) {
  if (state.res.gang <= 0) return { ok: false, grund: 'Keine Gangstücke mehr! Verdiene neue im Quiz.' };
  const r = canDig(state.world, x, y, extra);
  if (!r.ok) return r;
  dig(state.world, x, y);
  state.res.gang--;
  state.stats.gegraben++;
  refreshConnectivity(state);
  emit('gegraben', { x, y });
  return { ok: true };
}

export function placeBuilding(state, typ, x, y) {
  const g = GEBAEUDE[typ];
  if (!istFrei(state, typ)) return { ok: false, grund: 'Dafür brauchst du einen Bauplan – gewinne ihn mit einem perfekten Test im Quiz!' };
  if (!neuBaubar(typ)) return { ok: false, grund: `${g.name} entsteht durch Ausbau eines bestehenden Gebäudes.` };
  const k = baukosten(state, typ);
  if (state.res.sterne < k.sterne) return { ok: false, grund: `Du brauchst ${k.sterne} ⭐ (du hast ${Math.floor(state.res.sterne)}).` };
  if (k.material && (state.res.material ?? 0) < k.material) return { ok: false, grund: `Du brauchst ${k.material} 🪵 Baumaterial – schicke Sammlerinnen ins Revier (Shift)!` };
  const r = canPlace(state.world, state.rooms, typ, x, y);
  if (!r.ok) return r;
  state.res.sterne -= k.sterne;
  if (k.material) state.res.material -= k.material;
  const room = addRoom(state, typ, x, y, false);
  room.bezahlt = { sterne: k.sterne, material: k.material };
  if (room.ersetzt.length) {
    state.res.gang += room.ersetzt.length;
    state.stats.ersetzt += room.ersetzt.length;
  }
  refreshConnectivity(state);
  emit('platziert', { room, ersetzt: room.ersetzt.length });
  return { ok: true, room };
}

export function demolishAt(state, x, y) {
  const t = get(state.world, x, y);
  if (t === C.ROOM) {
    const id = state.world.raum[idx(x, y)];
    const room = state.rooms.find(r => r.id === id);
    if (!room) return { ok: false };
    const g = GEBAEUDE[room.typ];
    if (g.abreissbar === false) return { ok: false, grund: 'Die Königinnenkammer kann nicht abgerissen werden.' };
    removeRoom(state.world, room);
    state.rooms = state.rooms.filter(r => r !== room);
    // Sterne & Material: bei fertigen Gebäuden die Hälfte zurück, bei Baustellen alles. Der Bauplan bleibt freigeschaltet.
    const bez = room.bezahlt ?? { sterne: g.kosten ?? 0, material: g.material ?? 0 };
    const f = room.bau >= 1 ? 0.5 : 1;
    state.res.sterne += Math.floor(bez.sterne * f);
    state.res.material = (state.res.material ?? 0) + Math.floor((bez.material ?? 0) * f);
    state.res.gang = Math.max(0, state.res.gang - (room.ersetzt?.length ?? 0));
    refreshConnectivity(state);
    emit('abgerissen', room);
    return { ok: true, room };
  }
  if (t === C.TUNNEL) {
    fillTunnel(state.world, x, y);
    state.res.gang++;
    refreshConnectivity(state);
    emit('zugeschuettet', { x, y });
    return { ok: true };
  }
  return { ok: false, grund: 'Hier gibt es nichts abzureißen.' };
}

export function upgradeHill(state, pop) {
  const lvl = state.world.hill;
  if (lvl >= HILL_MAX) return { ok: false, grund: 'Der Hügel ist schon riesig!' };
  const k = hillUpgradeCost(lvl);
  if (pop < k.pop) return { ok: false, grund: `Dafür brauchst du ${k.pop} Ameisen.` };
  if (state.res.sterne < k.sterne) return { ok: false, grund: `Du brauchst ${k.sterne} ⭐.` };
  if (state.res.gang < k.gang) return { ok: false, grund: `Du brauchst ${k.gang} Gangstücke.` };
  if ((state.res.material ?? 0) < k.material) return { ok: false, grund: `Du brauchst ${k.material} 🪵 Baumaterial (Revier: Zweige & Harz sammeln).` };
  state.res.sterne -= k.sterne;
  state.res.gang -= k.gang;
  state.res.material -= k.material;
  setHill(state.world, lvl + 1);
  refreshConnectivity(state);
  emit('huegel', lvl + 1);
  return { ok: true };
}

/** Erfolgreicher Hochzeitsflug: neue Tochterkolonie am Zielort. */
export function hochzeitsflug(state, ortId) {
  const k = state.kronenStufe;
  const ort = ortById(ortId);
  nimmDrohnen(state, drohnenNoetig(state));
  state.kronenStufe++;
  state.kolonienGegruendet++;
  state.stats.hochzeitsfluege++;
  const sterne = 150 + 60 * k;
  state.res.sterne += sterne;
  const kolonie = ort && ortId !== 'heim' ? gruendeKolonie(state, ortId) : null;
  if (kolonie) {
    // Die neue Kolonie ist sofort bebaubar: eigenes Gelände der Gegend, Startnest und mitgeflogene Arbeiterinnen
    state.kolonienDaten ??= {};
    state.kolonienDaten[ortId] = neueKolonieDaten(state, ortId);
    berechneInfo(state, ortId);
  }
  if (state.welt) state.welt.fluege = (state.welt.fluege ?? 0) + 1;
  const plan = zufallsPlan(state, 'hochzeitsflug');
  emit('hochzeitsflug', { sterne, plan, stufe: state.kronenStufe, kolonie, ort });
  return { sterne, plan, kolonie };
}

/** Pläne, die gerade gewonnen werden können (für Tests & Anzeigen). */
export function verfuegbarePlaene(state, rang) {
  return offenePlaene(state, rang);
}

/**
 * Bauplan geben (Mission, Fund). Ist er schon freigeschaltet, gibt es stattdessen Sterne.
 * Gibt den Typ zurück, wenn er neu freigeschaltet wurde, sonst null.
 */
export function grantPlan(state, typ) {
  if (typ && schalteFrei(state, typ, 'geschenk')) return typ;
  state.res.sterne += Math.round((GEBAEUDE[typ]?.kosten ?? 30) * 0.6);
  return null;
}
