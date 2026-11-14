// Spieleraktionen: Graben, Bauen, Abreißen, Hügel ausbauen, Hochzeitsflug, Belohnungen.
import { GEBAEUDE, hillUpgradeCost, HILL_MAX, FACH_BAUPLAENE, rangVon } from './config.js';
import { canDig, dig, canPlace, removeRoom, fillTunnel, setHill, get, idx } from './world.js';
import { addRoom } from './state.js';
import { refreshConnectivity } from './sim.js';
import { C } from './config.js';
import { emit } from '../events.js';
import { pick, shuffle } from '../util.js';
import { hatTech } from './forschung.js';

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
  if (!state.plaene[typ]) return { ok: false, grund: 'Dafür brauchst du einen Bauplan – gewinne ihn im Quiz!' };
  if (state.res.sterne < g.kosten) return { ok: false, grund: `Du brauchst ${g.kosten} ⭐ (du hast ${Math.floor(state.res.sterne)}).` };
  if (g.material && (state.res.material ?? 0) < g.material) return { ok: false, grund: `Du brauchst ${g.material} 🪵 Baumaterial – schicke Sammlerinnen ins Revier (Shift)!` };
  const r = canPlace(state.world, state.rooms, typ, x, y);
  if (!r.ok) return r;
  state.res.sterne -= g.kosten;
  if (g.material) state.res.material -= g.material;
  state.plaene[typ]--;
  if (!state.plaene[typ]) delete state.plaene[typ];
  const room = addRoom(state, typ, x, y, false);
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
    state.plaene[room.typ] = (state.plaene[room.typ] ?? 0) + 1;
    // Sterne: bei fertigen Gebäuden die Hälfte zurück, bei Baustellen alles
    state.res.sterne += room.bau >= 1 ? Math.floor(g.kosten / 2) : g.kosten;
    if (g.material) state.res.material = (state.res.material ?? 0) + (room.bau >= 1 ? Math.floor(g.material / 2) : g.material);
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

export function hochzeitsflug(state) {
  const k = state.kronenStufe;
  state.volk.drohnen -= 10;
  state.kronenStufe++;
  state.kolonienGegruendet++;
  state.stats.hochzeitsfluege++;
  const sterne = 150 + 60 * k;
  state.res.sterne += sterne;
  const plan = pick(verfuegbarePlaene(state, 9));
  state.plaene[plan] = (state.plaene[plan] ?? 0) + 1;
  emit('hochzeitsflug', { sterne, plan, stufe: state.kronenStufe });
  return { sterne, plan };
}

/** Pläne, die beim aktuellen Kolonie-Rang gewonnen werden können. */
export function verfuegbarePlaene(state, rangOverride) {
  const pop = state.volk.arbeiterinnen + state.volk.drohnen + 1;
  const rang = rangOverride ?? rangVon(pop);
  return Object.entries(GEBAEUDE)
    .filter(([k, g]) => k !== 'koenigin' && g.stufe <= rang)
    .filter(([, g]) => !g.forschung || hatTech(state, g.forschung))
    .filter(([k]) => k !== 'handel' || hatTech(state, 'diplomatie') || rang >= 3)
    .filter(([k, g]) => !(g.einzigartig && (state.rooms.some(r => r.typ === k) || state.plaene[k])))
    .map(([k]) => k);
}

/** Drei Baupläne zur Auswahl – mindestens einer passt thematisch zum Fach. */
export function planAuswahl(state, fach, anzahl = 3) {
  const alle = verfuegbarePlaene(state);
  const thema = (FACH_BAUPLAENE[fach] ?? []).filter(p => alle.includes(p));
  const result = [];
  if (thema.length) result.push(pick(thema));
  // Grundbedarf bevorzugen, wenn er fehlt
  const basis = ['brut', 'wohnen', 'vorrat'].filter(p => alle.includes(p));
  for (const p of shuffle([...basis, ...alle, ...alle])) {
    if (result.length >= anzahl) break;
    if (!result.includes(p)) result.push(p);
  }
  return shuffle(result);
}

export function grantPlan(state, typ, n = 1) {
  state.plaene[typ] = (state.plaene[typ] ?? 0) + n;
  emit('plan', typ);
}

/** Architektur-Forschung: Bauplan einer schon gebauten Kammer kopieren. */
export function planKopieKosten(typ) {
  const g = GEBAEUDE[typ];
  return { material: 15 + Math.round(g.kosten * 0.5), sterne: Math.round(g.kosten * 0.5) };
}
export function kopierePlan(state, typ) {
  const g = GEBAEUDE[typ];
  if (!g || g.einzigartig || typ === 'koenigin') return { ok: false, grund: 'Diesen Plan kann man nicht kopieren.' };
  if (!hatTech(state, 'architektur')) return { ok: false, grund: 'Erforsche zuerst „Architektur".' };
  if (!state.rooms.some(r => r.typ === typ && r.bau >= 1)) return { ok: false, grund: 'Nur Kammern, die du schon gebaut hast.' };
  const k = planKopieKosten(typ);
  if ((state.res.material ?? 0) < k.material || state.res.sterne < k.sterne) return { ok: false, grund: `Kosten: ${k.material} 🪵 und ${k.sterne} ⭐.` };
  state.res.material -= k.material; state.res.sterne -= k.sterne;
  grantPlan(state, typ);
  return { ok: true };
}
