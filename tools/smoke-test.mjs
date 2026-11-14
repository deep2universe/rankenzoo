// Schnelltest ohne Browser: Quiz-Engine, Generatoren, Simulation, Platzierungsregeln.
// Aufruf: node tools/smoke-test.mjs
import { loadBanks, themenVon, buildRound, recordAnswer, pruefeEingabe, istGeloest, themaStand, fachStand, rundeMoeglich, frageById, GEN_ARCHIV_MAX } from '../src/quiz/engine.js';
import { MATHE_GEN, ENGLISCH_GEN } from '../src/quiz/generators.js';
import { newGame, addRoom } from '../src/game/state.js';
import { tick, derive, refreshConnectivity } from '../src/game/sim.js';
import { canPlace, canDig, dig, computeConnectivity, setHill } from '../src/game/world.js';
import { FAECHER, GEBAEUDE, GROUND, COLS } from '../src/game/config.js';
import { planAuswahl } from '../src/game/actions.js';

let fehler = 0;
const ok = (bed, msg) => { if (!bed) { fehler++; console.error('✗ ' + msg); } };

// 1) Generatoren
for (const [k, g] of Object.entries({ ...MATHE_GEN, ...ENGLISCH_GEN })) {
  for (let stufe = 1; stufe <= 3; stufe++) {
    for (let i = 0; i < 300; i++) {
      const q = g.gen(stufe);
      const txt = JSON.stringify(q);
      ok(!/NaN|undefined|Infinity/.test(txt), `${k}/${stufe}: ungültiger Wert ${txt.slice(0, 120)}`);
      if (q.typ === 'choice') ok(new Set(q.optionen).size === q.optionen.length && q.loesung >= 0 && q.loesung < q.optionen.length, `${k}: Optionen`);
      if (q.typ === 'input') ok(pruefeEingabe(q, String(q.loesung)), `${k}: eigene Lösung wird nicht akzeptiert`);
    }
  }
}
console.log('✓ Generatoren');

// 2) Fragenbanken & Runden
const bank = await loadBanks();
const state = newGame('Test', 'Test');
let runden = 0;
for (const fach of Object.keys(FAECHER)) {
  const themen = themenVon(fach);
  ok(themen.length > 0, `${fach}: keine Themen`);
  for (const t of [null, ...themen.map(t => t.key)]) {
    const r = buildRound(state, fach, t);
    runden++;
    ok(r.length > 0, `${fach}/${t}: leere Runde`);
    ok(new Set(r.map(q => q.id)).size === r.length, `${fach}/${t}: doppelte Fragen in einer Runde`);
    for (const q of r) {
      if (q.typ === 'choice') ok(q.anzeige.filter(o => o.richtig).length === 1, `${q.id}: nicht genau eine richtige Anzeige-Option`);
      if (q.typ === 'order') ok(q.gemischt.length === q.teile.length, `${q.id}: order`);
      recordAnswer(state, q, Math.random() < 0.7);
    }
    state.lernen.runden++;
  }
  console.log(`✓ ${fach}: ${bank[fach].fragen.length} Fragen, ${themen.length} Themen`);
}
console.log(`✓ ${runden} Runden zusammengestellt, ${state.lernen.gesamt} Antworten verbucht`);

// 2b) Gelöste Fragen kommen nie wieder – bis jedes Fach komplett gemeistert ist
{
  const st = newGame('Archiv', 'Archiv');
  let gespielt = 0;
  for (const fach of Object.keys(FAECHER)) {
    const keys = [null, ...themenVon(fach).map(t => t.key)];
    const geloest = new Set();
    const hatGens = Object.keys(bank[fach].gens).length > 0;
    let r = 0;
    // Viele Runden: gemischt und themenweise; ca. 60 % richtig, später (fast) alles richtig
    while (fachStand(st, fach).offen > 0 && r < 2000) {
      const t = keys[r % keys.length];
      const runde = buildRound(st, fach, t);
      r++; gespielt++;
      const stand = t ? themaStand(st, fach, t) : fachStand(st, fach);
      if (!runde.length) {
        ok(!hatGens && stand.offen === 0, `${fach}/${t}: leere Runde, obwohl ${stand.offen} Fragen offen sind`);
        ok(!rundeMoeglich(st, fach, t), `${fach}/${t}: rundeMoeglich meldet true, Runde ist aber leer`);
        continue;
      }
      ok(new Set(runde.map(q => q.id)).size === runde.length, `${fach}/${t}: doppelte Fragen in einer Runde`);
      ok(new Set(runde.filter(q => q.generiert).map(q => q.frage)).size === runde.filter(q => q.generiert).length, `${fach}/${t}: doppelte Zufallsaufgabe`);
      const falsche = [];
      for (const q of runde) {
        if (!q.generiert) ok(!geloest.has(q.id), `${fach}: gelöste Frage ${q.id} kam wieder (Runde ${r}${q.wiederholung ? ', Wiederholung' : ''})`);
        if (t && !q.generiert) ok(q.thema === t, `${fach}/${t}: fremdes Thema ${q.thema}`);
        const richtig = Math.random() < (r > 150 ? 0.95 : 0.6);
        recordAnswer(st, q, richtig);
        if (richtig && !q.generiert) geloest.add(q.id);
        if (!q.generiert) ok(istGeloest(st, q.id) === geloest.has(q.id), `${q.id}: istGeloest stimmt nicht`);
        if (!richtig) falsche.push(q);
      }
      // „Zweite Chance" (wie in der Oberfläche): nur falsch beantwortete, nie gelöste
      for (const q of falsche.filter(q => q.generiert || !istGeloest(st, q.id)).slice(0, 3)) {
        ok(q.generiert || !geloest.has(q.id), `${q.id}: gelöste Frage in der zweiten Chance`);
        const richtig = Math.random() < 0.5;
        recordAnswer(st, { ...q, wiederholung: true }, richtig);
        if (richtig && !q.generiert) geloest.add(q.id);
      }
      st.lernen.runden++;
    }
    const fs = fachStand(st, fach);
    ok(fs.offen === 0 && fs.geloest === bank[fach].fragen.length, `${fach}: nach ${r} Runden nicht alles gelöst (${fs.geloest}/${fs.gesamt})`);
    // Fach komplett gemeistert: Runden bleiben baubar (Zufallsaufgaben) oder sind sauber leer
    for (const t of keys) {
      const runde = buildRound(st, fach, t);
      if (hatGens) {
        ok(runde.length > 0, `${fach}/${t}: gemeistert, aber keine Zufallsaufgaben`);
        ok(runde.every(q => q.generiert), `${fach}/${t}: gemeistert, trotzdem kuratierte Frage`);
        if (t && !bank[fach].gens[t]) ok(runde.every(q => q.bonus), `${fach}/${t}: Auffüll-Aufgaben nicht als Bonus markiert`);
      } else {
        ok(runde.length === 0, `${fach}/${t}: gemeistert, Runde müsste leer sein`);
        ok(!rundeMoeglich(st, fach, t), `${fach}/${t}: rundeMoeglich müsste false sein`);
      }
      if (t && !bank[fach].gens[t]) ok(themaStand(st, fach, t).gemeistert, `${fach}/${t}: nicht als gemeistert erkannt`);
    }
    console.log(`✓ ${fach}: nach ${r} Runden alle ${fs.gesamt} Fragen gelöst – keine kam doppelt`);
  }
  ok(frageById('de-wortarten-001')?.fach === 'deutsch' || frageById(bank.deutsch.fragen[0].id) === bank.deutsch.fragen[0], 'frageById');
  ok(frageById('gibt-es-nicht') === null, 'frageById(unbekannt) ≠ null');
  ok(Array.isArray(st.lernen.genArchiv) && st.lernen.genArchiv.length > 0 && st.lernen.genArchiv.length <= GEN_ARCHIV_MAX, 'genArchiv fehlt oder zu lang');
  ok(st.lernen.genArchiv.every(e => e.frage && e.antwort && e.fach && e.thema && typeof e.richtig === 'boolean'), 'genArchiv-Eintrag unvollständig');
  // Alter Spielstand ohne neue Felder
  const alt = newGame('Alt', 'Alt');
  delete alt.lernen.genArchiv;
  const g = buildRound(alt, 'mathe', 'g_runden')[0];
  recordAnswer(alt, g, true);
  ok(alt.lernen.genArchiv?.length === 1, 'genArchiv wird bei alten Spielständen nicht angelegt');
  console.log(`✓ ${gespielt} Runden: gelöste Fragen tauchen nie wieder auf, gemeisterte Themen bleiben spielbar`);
}

// 3) Simulation & Bauen
const s = newGame('Sim', 'Sim');
for (const yy of [GROUND + 3, GROUND + 10]) for (let x = 12; x < 50; x++) if (canDig(s.world, x, yy).ok) dig(s.world, x, yy);
for (let y = GROUND + 3; y < GROUND + 11; y++) if (canDig(s.world, 31, y).ok) dig(s.world, 31, y);
refreshConnectivity(s);
const bau = typ => {
  for (let y = 0; y < GROUND + 30; y++) for (let x = 2; x < COLS - 6; x++) {
    if (canPlace(s.world, s.rooms, typ, x, y).ok) { addRoom(s, typ, x, y); refreshConnectivity(s); return true; }
  }
  return false;
};
for (const typ of ['brut', 'wohnen', 'vorrat', 'pilz', 'fussball', 'sonne', 'blattlaus']) ok(bau(typ), `${typ} konnte nicht platziert werden`);
computeConnectivity(s.world, s.rooms);
for (const r of s.rooms) ok(r.verbunden, `${r.typ} ist nicht verbunden`);
let d;
for (let i = 0; i < 6000; i++) d = tick(s, 0.1);
ok(s.rooms.every(r => r.bau >= 1), 'Nicht alle Baustellen fertig nach 10 Minuten');
ok(d.pop > 15, `Volk wächst nicht (pop ${d.pop})`);
ok(s.res.nahrung > 0, 'Nahrung aufgebraucht');
console.log(`✓ Simulation: 10 Spielminuten → ${d.pop} Ameisen, Zufriedenheit ${Math.round(d.zufriedenheit)} %`);
// Hügelausbau darf Wiesenbauten nicht abschneiden
for (let lvl = 2; lvl <= 6; lvl++) {
  setHill(s.world, lvl);
  computeConnectivity(s.world, s.rooms);
  for (const r of s.rooms.filter(r => GEBAEUDE[r.typ].zone === 'oberflaeche')) ok(r.verbunden, `${r.typ} nach Hügelstufe ${lvl} nicht verbunden`);
}
console.log('✓ Hügelausbau hält Eingänge offen');
ok(planAuswahl(s, 'deutsch').length === 3, 'Planauswahl liefert nicht 3 Pläne');
ok(Object.keys(GEBAEUDE).length >= 20, 'Zu wenige Gebäude');

console.log(fehler ? `\n✗ ${fehler} Fehler` : '\n✓ Alles in Ordnung');
process.exit(fehler ? 1 : 0);
