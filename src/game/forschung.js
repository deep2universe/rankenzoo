// Forschung & Entwicklung: ein Technologie-Baum mit fünf Ästen.
// Forschungspunkte (🔬) entstehen durch Bildungsgebäude und richtige Quizantworten.
import { emit } from '../events.js';

export const AESTE = {
  natur: { name: 'Landwirtschaft', icon: '🌾', farbe: '#5cc96b', farbe2: '#a8ec8a' },
  erkundung: { name: 'Erkundung', icon: '🧭', farbe: '#3fa7e0', farbe2: '#8fd3ff' },
  bau: { name: 'Baukunst', icon: '🏗️', farbe: '#e0913f', farbe2: '#ffc98a' },
  volk: { name: 'Volk & Brut', icon: '🥚', farbe: '#e0608c', farbe2: '#ffa8c6' },
  kultur: { name: 'Kultur & Wissen', icon: '🎓', farbe: '#8b6ce0', farbe2: '#c6b2ff' },
};

const K = [null, { fp: 12, material: 0, dauer: 30 }, { fp: 30, material: 20, dauer: 55 }, { fp: 60, material: 50, dauer: 80 }, { fp: 100, material: 90, dauer: 110 }];

/*
 Jede Technologie: ast, stufe (1–4), voraus (Liste von ids), effekte (werden in derive() addiert)
 oder freischalten (Spielfunktion). Fakten bleiben bei echten Ameisen.
*/
export const TECHS = {
  // 🌾 Landwirtschaft
  pilzzucht: { ast: 'natur', stufe: 1, name: 'Pilz-Zucht', icon: '🍄', effekte: { pilzBonus: 0.25 },
    text: 'Pilzgärten liefern 25 % mehr Nahrung.', fakt: 'Blattschneiderameisen betreiben Landwirtschaft schon seit Millionen Jahren – lange bevor Menschen Felder hatten.' },
  blattlauspflege: { ast: 'natur', stufe: 2, voraus: ['pilzzucht'], name: 'Blattlaus-Pflege', icon: '🌿', effekte: { weideBonus: 0.35, quelleNahrung: 0.1 },
    text: 'Blattlaus-Weiden +35 %, Nahrungsquellen im Revier +10 %.', fakt: 'Ameisen streicheln Blattläuse mit den Fühlern – dann geben die einen Tropfen Honigtau ab.' },
  honigtopf: { ast: 'natur', stufe: 3, voraus: ['blattlauspflege'], name: 'Honigtopf-Ameisen', icon: '🍯', effekte: { lagerBonus: 0.4 },
    text: 'Lebende Vorratsfässer: 40 % mehr Lagerplatz.', fakt: 'Honigtopf-Ameisen hängen an der Decke und speichern Nektar in ihrem prall gefüllten Hinterleib.' },
  saatgut: { ast: 'natur', stufe: 4, voraus: ['honigtopf'], name: 'Saatgut-Kunde', icon: '🌱', effekte: { verbrauch: -0.12, quelleNachwuchs: 0.5 },
    text: '12 % weniger Futterverbrauch, Quellen wachsen 50 % schneller nach.', fakt: 'Ernteameisen „pflanzen" ungewollt Wälder: Viele Samen, die sie verlieren, keimen später.' },
  // 🧭 Erkundung
  duftspuren: { ast: 'erkundung', stufe: 1, name: 'Duftspuren', icon: '👃', effekte: { revierBonus: 0.2 },
    text: 'Bessere Duftstraßen: Revier-Trupps sammeln 20 % mehr. Schaltet den Duftspur-Bahnhof frei.', fakt: 'Ameisen legen mit ihrem Hinterleib Duftspuren. Je mehr Futter, desto stärker riecht die Spur.' },
  sonnenkompass: { ast: 'erkundung', stufe: 2, voraus: ['duftspuren'], name: 'Sonnenkompass', icon: '☀️', effekte: { expTempo: 0.4, sicht: 1 },
    text: 'Erkunderinnen laufen 40 % schneller und sehen weiter.', fakt: 'Ameisen erkennen sogar polarisiertes Himmelslicht und wissen so, wo die Sonne steht – auch hinter Wolken.' },
  kartenkunde: { ast: 'erkundung', stufe: 3, voraus: ['sonnenkompass'], name: 'Kartenkunde', icon: '🗺️', freischalten: 'quellenAhnen', effekte: { expSlots: 1 },
    text: 'Du ahnst, wo im Nebel Quellen liegen (❔), und kannst eine Expedition mehr schicken.', fakt: 'Ameisen merken sich Landmarken wie Bäume und Steine und bauen daraus eine Art innere Karte.' },
  fernexpedition: { ast: 'erkundung', stufe: 4, voraus: ['kartenkunde'], name: 'Fernexpeditionen', icon: '🏕️', effekte: { expTempo: 0.3, sicht: 1, schatzBonus: 0.5 },
    text: 'Weitere Wege, größere Funde: Schätze bringen 50 % mehr.', fakt: 'Wanderameisen ziehen in riesigen Kolonnen durch den Regenwald und bauen jede Nacht ein neues „lebendes Nest".' },
  // 🏗️ Baukunst
  harzmoertel: { ast: 'bau', stufe: 1, name: 'Harz-Mörtel', icon: '🧱', effekte: { bauTempo: 0.25 },
    text: 'Baustellen werden 25 % schneller fertig.', fakt: 'Waldameisen bauen Harzbrocken in ihr Nest ein. Das schützt vor Keimen.' },
  gewoelbe: { ast: 'bau', stufe: 2, voraus: ['harzmoertel'], name: 'Gewölbebau', icon: '🏛️', effekte: { wohnBonus: 0.25 },
    text: 'Stabile Decken: Schlafkammern bieten 25 % mehr Platz.', fakt: 'Ameisennester können metertief sein – mit Hunderten Kammern, verbunden durch Gänge.' },
  lueftung: { ast: 'bau', stufe: 3, voraus: ['gewoelbe'], name: 'Lüftungsschächte', icon: '🌬️', effekte: { hygieneMult: 0.3, waermeMult: 0.15 },
    text: 'Frische Luft: Sauberkeit +30 %, Wärme +15 %.', fakt: 'Termiten und Ameisen bauen Nester mit Luftkanälen – warme Luft steigt auf und zieht frische nach.' },
  architektur: { ast: 'bau', stufe: 4, voraus: ['lueftung'], name: 'Architektur', icon: '📐', effekte: { ausbauRabatt: 0.25, bauTempo: 0.15 },
    text: 'Kluge Baupläne: Jeder Ausbau kostet 25 % weniger, Baustellen sind 15 % schneller.', fakt: 'Weberameisen bauen Nester aus lebenden Blättern und arbeiten dabei als Team: Sie bilden lange Ketten aus ihren Körpern.' },
  // 🥚 Volk & Brut
  geleeroyal: { ast: 'volk', stufe: 1, name: 'Futtersaft', icon: '🍼', effekte: { eiTempo: 0.2 },
    text: 'Die Königin legt 20 % schneller Eier.', fakt: 'Ammen füttern Larven mit Futtersaft aus ihrem Sozialmagen – Mund zu Mund.' },
  waechterinnen: { ast: 'volk', stufe: 2, voraus: ['geleeroyal'], name: 'Wächterinnen-Kaste', icon: '🛡️', effekte: { wacheStaerke: 1 },
    text: 'Wächterinnen vertreiben Störenfriede doppelt so schnell.', fakt: 'Bei vielen Arten werden aus besser gefütterten Larven größere Arbeiterinnen – oft mit besonders kräftigen Kiefern.' },
  arbeitsteilung: { ast: 'volk', stufe: 3, voraus: ['waechterinnen'], name: 'Arbeitsteilung', icon: '🧩', effekte: { ausbildung: 0.15, brutTempo: 0.1 },
    text: 'Alle Fachkräfte +15 %, Brut 10 % schneller.', fakt: 'Ameisen wechseln im Laufe ihres Lebens oft den Beruf: von der Amme zur Bauarbeiterin zur Sammlerin.' },
  superorganismus: { ast: 'volk', stufe: 4, voraus: ['arbeitsteilung'], name: 'Superorganismus', icon: '🌟', effekte: { tempo: 0.1, zufriedenBonus: 4, eiTempo: 0.15 },
    text: 'Das Volk arbeitet wie ein einziges Wesen: +10 % Tempo, +4 % Zufriedenheit, mehr Eier.', fakt: 'Forschende nennen ein Ameisenvolk „Superorganismus": Viele Einzelne verhalten sich zusammen wie ein großes Lebewesen.' },
  // 🎓 Kultur & Wissen
  schrift: { ast: 'kultur', stufe: 1, name: 'Duft-Schrift', icon: '📜', effekte: { quizBonus: 0.1, fpMult: 0.15 },
    text: '+10 % Sterne im Quiz und 15 % mehr Forschungspunkte.', fakt: 'Ameisen nutzen viele verschiedene Duftstoffe – für Alarm, Wege, Erkennen von Nestgenossinnen und mehr.' },
  feste: { ast: 'kultur', stufe: 2, voraus: ['schrift'], name: 'Ameisenfeste', icon: '🎉', effekte: { zufriedenBonus: 4, freizeitMult: 0.2 },
    text: 'Gemeinsam feiern: +4 % Zufriedenheit, Freizeit-Gebäude +20 %.', fakt: 'Wenn Ameisen sich begegnen, betrillern sie sich kurz mit den Fühlern – so erkennen sie, wer zum Volk gehört.' },
  diplomatie: { ast: 'kultur', stufe: 3, voraus: ['feste'], name: 'Diplomatie', icon: '🤝', freischalten: 'handel', effekte: { handel: 1 },
    text: 'Handel mit entdeckten Nachbarvölkern im Revier. Schaltet den Handelsposten frei.', fakt: 'Zwischen manchen Ameisenkolonien gibt es feste Grenzen – und erstaunlich wenig Streit, wenn beide genug Futter haben.' },
  akademie: { ast: 'kultur', stufe: 4, voraus: ['diplomatie'], name: 'Große Akademie', icon: '🏛️', effekte: { fpMult: 0.5, sterneProMin: 2, quizBonus: 0.1 },
    text: '+50 % Forschungspunkte, 2 ⭐ pro Minute und mehr Quiz-Sterne.', fakt: 'Ameisen gibt es auf fast allen Kontinenten – nur nicht in der Antarktis und auf ein paar Inseln.' },
};
// Kosten aus der Stufe
for (const t of Object.values(TECHS)) Object.assign(t, { kosten: { fp: K[t.stufe].fp, material: K[t.stufe].material }, dauer: K[t.stufe].dauer, voraus: t.voraus ?? [] });

export function hatTech(state, id) { return !!state.forschung?.fertig?.includes(id); }
export function hatFreischaltung(state, key) {
  return Object.entries(TECHS).some(([id, t]) => t.freischalten === key && hatTech(state, id));
}

/** Summe aller Forschungseffekte. */
export function forschungsEffekte(state) {
  const out = {};
  for (const id of state.forschung?.fertig ?? []) {
    for (const [k, v] of Object.entries(TECHS[id]?.effekte ?? {})) out[k] = (out[k] ?? 0) + v;
  }
  return out;
}

export function techStatus(state, id) {
  const t = TECHS[id];
  if (hatTech(state, id)) return 'fertig';
  if (state.forschung.aktiv?.id === id) return 'aktiv';
  if (!t.voraus.every(v => hatTech(state, v))) return 'gesperrt';
  return 'moeglich';
}

export function kannForschen(state, id) {
  const t = TECHS[id];
  const st = techStatus(state, id);
  if (st === 'fertig') return { ok: false, grund: 'Schon erforscht.' };
  if (st === 'aktiv') return { ok: false, grund: 'Wird gerade erforscht.' };
  if (st === 'gesperrt') return { ok: false, grund: 'Erst: ' + t.voraus.filter(v => !hatTech(state, v)).map(v => TECHS[v].name).join(', ') };
  if (state.forschung.aktiv) return { ok: false, grund: 'Es läuft schon ein Forschungsprojekt.' };
  if (state.res.fp < t.kosten.fp) return { ok: false, grund: `Du brauchst ${t.kosten.fp} 🔬 (du hast ${Math.floor(state.res.fp)}).` };
  if ((state.res.material ?? 0) < t.kosten.material) return { ok: false, grund: `Du brauchst ${t.kosten.material} 🪵 Baumaterial.` };
  return { ok: true };
}

export function starteForschung(state, id) {
  const r = kannForschen(state, id);
  if (!r.ok) return r;
  const t = TECHS[id];
  state.res.fp -= t.kosten.fp;
  state.res.material -= t.kosten.material;
  state.forschung.aktiv = { id, t: 0 };
  emit('forschungStart', id);
  return { ok: true };
}

export function brichForschungAb(state) {
  const a = state.forschung.aktiv;
  if (!a) return;
  const t = TECHS[a.id];
  state.res.fp += t.kosten.fp;
  state.res.material += t.kosten.material;
  state.forschung.aktiv = null;
}

/** Fortschritt pro Tick; tempo = 1 + Forschungstempo-Boni. */
export function forschungTick(state, dt, tempo) {
  const a = state.forschung.aktiv;
  if (!a) return;
  a.t += dt * tempo;
  const t = TECHS[a.id];
  if (a.t >= t.dauer) {
    state.forschung.fertig.push(a.id);
    state.forschung.aktiv = null;
    emit('forschungFertig', a.id);
  }
}
