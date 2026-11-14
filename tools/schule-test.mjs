// Test ohne Browser: Stundenplan, Tests, Bauplan-Vergabe, Ausbau-Linien, Zelte, Bürgerinnen, Welt.
// Aufruf: node tools/schule-test.mjs
import { loadBanks, bank, istGeloest } from '../src/quiz/engine.js';
import {
  baueTests, alleTests, aktuelleStunde, stundeBeenden, spielbareTests, bauplanVerteilung, testErgebnis, testFragen, testBelohnung,
  offeneFaecher, pruefeAltlasten, istBestanden, STUNDEN_PRO_TAG, WOCHENPLAN,
} from '../src/quiz/stundenplan.js';
import { newGame, migriere } from '../src/game/state.js';
import { tick, derive } from '../src/game/sim.js';
import { istFrei, schalteFrei, offenePlaene, noetigesNiveau, planVerfuegbar } from '../src/game/bauplaene.js';
import { baueLager, sendeExpedition, NEST, aufdecken, naechsteBasis, lagerPlatz } from '../src/game/revier.js';
import { holeBuerger, steckbrief } from '../src/game/buerger.js';
import { hochzeitsflug } from '../src/game/actions.js';
import { ORTE, kolonieAn, flugParameter } from '../src/game/welt.js';
import { GEBAEUDE, LINIEN, FAECHER, SIM, REVIER } from '../src/game/config.js';

let fehler = 0;
const ok = (bed, msg) => { if (!bed) { fehler++; console.error('✗ ' + msg); } };
const lauf = (s, sek) => { let d; for (let i = 0; i < sek * 10; i++) d = tick(s, 0.1); return d; };

await loadBanks();
baueTests();

// 1) Tests: jede kuratierte Frage steckt in genau einem Test
const tests = alleTests();
ok(new Set(tests.map(t => t.id)).size === tests.length, 'Test-IDs doppelt');
const zaehler = new Map();
for (const t of tests.filter(t => !t.generator)) {
  ok(t.n >= 3 && t.n <= 9, `${t.id}: ungewöhnliche Testgröße ${t.n}`);
  ok(t.niveau >= 1 && t.niveau <= 3, `${t.id}: Niveau ${t.niveau}`);
  for (const id of t.fragen) zaehler.set(id, (zaehler.get(id) ?? 0) + 1);
}
const alleFragen = Object.values(bank()).flatMap(b => b.fragen);
ok(alleFragen.every(q => zaehler.get(q.id) === 1), 'nicht jede Frage steckt in genau einem Test');
ok(tests.length > Object.keys(GEBAEUDE).length, 'Es sollte mehr Tests als Baupläne geben');
for (const t of tests.filter(t => t.generator)) ok(testFragen(t).length === t.n, `${t.id}: Zufallstest unvollständig`);
console.log(`✓ ${tests.length} Tests (${tests.filter(t => t.generator).length} mit Zufallsaufgaben) für ${alleFragen.length} Fragen`);

// 2) Stundenplan: 4 Stunden, Schulschluss, neuer Schultag erst am neuen Ameisentag, Wochenwechsel
{
  const s = newGame('Plan', 'Plan');
  let st = aktuelleStunde(s);
  ok(st.fach === WOCHENPLAN[0][0] && st.stunde === 0 && st.wtag === 0, 'Start nicht Montag, 1. Stunde');
  for (let i = 0; i < STUNDEN_PRO_TAG; i++) stundeBeenden(s, { fach: aktuelleStunde(s).fach });
  st = aktuelleStunde(s);
  ok(st.schulschluss && !st.fach, 'Nach 4 Stunden kein Schulschluss');
  s.zeit += SIM.tagDauer;
  st = aktuelleStunde(s);
  ok(!st.schulschluss && st.wtag === 1 && st.neuerTag, 'Neuer Ameisentag startet keinen neuen Schultag');
  for (let tag = 0; tag < 5; tag++) {
    while (!aktuelleStunde(s).schulschluss) stundeBeenden(s, {});
    s.zeit += SIM.tagDauer;
  }
  st = aktuelleStunde(s);
  ok(st.woche === 2 && st.wtag === 1, `Wochenwechsel falsch (Woche ${st.woche}, Tag ${st.wtag})`);
  console.log('✓ Stundenplan: Stunden, Schulschluss, Schultage und Wochen');
}

// 3) Ein „perfektes" Kind spielt alle Tests: Baupläne kommen Stufe für Stufe, am Ende nur noch Rohstoffe
{
  const s = newGame('Perfekt', 'Perfekt');
  s.volk.arbeiterinnen = 260; // großes Volk: alle Ränge offen
  s.forschung.fertig.push('duftspuren', 'diplomatie');
  let gespielt = 0, plaene = 0, ohnePlan = 0;
  const reihenfolge = [];
  for (let runde = 0; runde < 2000 && offeneFaecher(s).length; runde++) {
    for (const fach of Object.keys(FAECHER)) {
      const vert = bauplanVerteilung(s, fach);
      for (const [tid, typ] of vert) {
        ok(planVerfuegbar(s, typ), `${typ} verteilt, obwohl nicht verfügbar`);
        const t = tests.find(x => x.id === tid);
        ok(t.niveau >= noetigesNiveau(typ), `${typ} liegt auf zu leichtem Test ${tid}`);
      }
      const t = spielbareTests(s, fach)[0];
      if (!t) continue;
      const typ = vert.get(t.id);
      ok(testErgebnis(s, t, t.n).perfekt, 'perfekter Test nicht perfekt');
      ok(istBestanden(s, t.id) && !spielbareTests(s, fach).some(x => x.id === t.id), 'bestandener Test bleibt spielbar');
      gespielt++;
      if (typ) {
        const G = GEBAEUDE[typ];
        ok(!G.vorige || istFrei(s, G.vorige), `${typ} vor ${G.vorige} freigeschaltet`);
        schalteFrei(s, typ); plaene++; reihenfolge.push(typ);
      } else ohnePlan++;
    }
  }
  ok(!offeneFaecher(s).length, 'Nicht alle Tests bestanden');
  ok(offenePlaene(s).length === 0, `Baupläne bleiben übrig: ${offenePlaene(s).join(', ')}`);
  ok(ohnePlan > 0, 'Es gab nie reine Rohstoff-Tests');
  const bildung = LINIEN.kita.stufen.map(t => reihenfolge.indexOf(t)).filter(i => i >= 0);
  ok(bildung.every((v, i) => i === 0 || v > bildung[i - 1]), 'Bildungslinie in falscher Reihenfolge');
  console.log(`✓ ${gespielt} Tests perfekt: ${plaene} Baupläne in Stufen-Reihenfolge, ${ohnePlan} Tests nur mit Rohstoffen`);
}

// 4) Belohnung & nicht bestandene Tests
{
  const s = newGame('B', 'B');
  const t = spielbareTests(s, 'deutsch')[0];
  const bel = testBelohnung(s, t, 0, 'kita');
  ok(bel.sterneMax > 0 && bel.noetig === Math.ceil(t.n / 2) && bel.plan === 'kita', 'Belohnungs-Vorschau unvollständig');
  ok(!testErgebnis(s, t, 1).bestanden, 'zu wenige richtig gilt als bestanden');
  ok(spielbareTests(s, 'deutsch')[0].id === t.id, 'nicht bestandener Test ist verschwunden');
  ok(testErgebnis(s, t, bel.noetig).bestanden, 'Hälfte richtig gilt nicht als bestanden');
  console.log('✓ Belohnungs-Vorschau, bestanden ab der Hälfte, Wiederholung bei zu wenig');
}

// 5) Alte Spielstände: gelöste Fragen → bestandene Tests; alte Baupläne → freigeschaltet
{
  const alt = JSON.parse(JSON.stringify({ ...newGame('Alt', 'Alt'), world: null }));
  delete alt.bauplaene; delete alt.schule; delete alt.welt; delete alt.buerger;
  alt.plaene = { kino: 2 };
  alt.rooms.push({ id: 99, typ: 'universitaet', x: 5, y: 30, bau: 1 });
  alt.revier.sicht = new Array(44 * 30).fill(0);
  alt.world = newGame('x', 'y').world;
  const t = tests.find(x => x.fach === 'mathe' && !x.generator);
  for (const id of t.fragen) alt.lernen.fragen[id] = { b: 1, d: 0, n: 1, r: 1 };
  migriere(alt);
  ok(istFrei(alt, 'kino') && istFrei(alt, 'universitaet') && istFrei(alt, 'kita') && istFrei(alt, 'schule'), 'alte Baupläne/Gebäude nicht übernommen');
  const uni = alt.rooms.find(r => r.typ === 'universitaet');
  ok(uni.w === 5 && uni.h === 3, 'alte Universität verliert ihre Größe');
  ok(alt.revier.sicht.length === REVIER.W * REVIER.H, 'altes Revier nicht vergrößert');
  pruefeAltlasten(alt);
  ok(istBestanden(alt, t.id) && t.fragen.every(id => istGeloest(alt, id)), 'gelöste Fragen zählen nicht als bestandener Test');
  console.log('✓ Alte Spielstände werden übernommen');
}

// 6) Zelte: Bauplan nötig, Platzregeln, Aufbau, Expeditionen starten am Lager
{
  const s = newGame('Zelt', 'Zelt');
  s.res.sterne = 500; s.res.material = 500; s.volk.arbeiterinnen = 40;
  const r = s.revier;
  aufdecken(r, NEST.x + 9, NEST.y, 4);
  let ziel = null;
  for (let dx = 6; dx <= 12 && !ziel; dx++) for (let dy = -3; dy <= 3 && !ziel; dy++) if (lagerPlatz(r, NEST.x + dx, NEST.y + dy).ok) ziel = { x: NEST.x + dx, y: NEST.y + dy };
  ok(ziel, 'kein freier Zeltplatz gefunden');
  ok(!baueLager(s, ziel.x, ziel.y).ok, 'Zelt ohne Bauplan');
  schalteFrei(s, 'zelt');
  ok(!baueLager(s, NEST.x + 1, NEST.y).ok, 'Zelt direkt am Hügel erlaubt');
  ok(!baueLager(s, 2, 2).ok, 'Zelt im Nebel erlaubt');
  const res = baueLager(s, ziel.x, ziel.y);
  ok(res.ok, 'Zelt lässt sich nicht aufstellen: ' + res.grund);
  lauf(s, 20);
  ok(r.lager[0].bau >= 1, 'Zelt wird nicht fertig');
  const b = naechsteBasis(r, ziel.x + 5, ziel.y);
  ok(b.lager?.id === r.lager[0].id, 'Lager ist nicht die nächste Basis');
  const e = sendeExpedition(r, ziel.x + 5, ziel.y, 2, derive(s).fx).e;
  ok(e && e.x === ziel.x && e.y === ziel.y, 'Expedition startet nicht am Lager');
  console.log('✓ Zelte: Bauplan, Platzregeln, Aufbau, Expeditionen ab Lager');
}

// 7) Pollen beschleunigt die Brut
{
  const s = newGame('Pollen', 'Pollen');
  s.volk.arbeiterinnen = 40;
  const q = s.revier.quellen.find(x => x.typ === 'klee');
  q.entdeckt = true;
  s.revier.trupps[q.id] = { s: 10, w: 0 };
  const d = derive(s);
  ok(d.revier.pollen > 0 && d.fx.brutTempo > 0, 'Pollen wirkt nicht auf die Brut');
  console.log(`✓ Pollen: +${(d.revier.pollen * 60).toFixed(1)}/min, Brut +${Math.round(d.fx.brutTempo * 100)} %`);
}

// 8) Bürgerinnen: positive, vollständige Steckbriefe
{
  const s = newGame('Volk', 'Volk');
  const belegt = new Set();
  const ids = [];
  for (let i = 0; i < 12; i++) { const id = holeBuerger(s, i % 4 === 0, belegt); belegt.add(id); ids.push(id); }
  const d = derive(s);
  for (const id of ids) {
    const sb = steckbrief(s, d, id, { job: id % 2 ? 'sammler' : 'amme', hidden: 0, last: 'blatt' });
    const txt = JSON.stringify(sb);
    ok(sb && sb.name && sb.satz && sb.wohnText && sb.schule && sb.tut && sb.traum, `Steckbrief ${id} unvollständig`);
    ok(!/undefined|NaN|null\)/.test(txt), `Steckbrief ${id} enthält ungültige Werte: ${txt.slice(0, 160)}`);
    ok(!/(traurig|stirbt|tot\b|hasse|schlecht)/i.test(txt), `Steckbrief ${id} ist nicht positiv formuliert`);
  }
  const sb = steckbrief(s, d, ids[1], null);
  ok(sb.freundin && sb.freund, 'Freundschaften fehlen');
  console.log('✓ Bürgerinnen: Steckbriefe mit Freundin, Freund, Zuhause, Schule und Träumen');
}

// 9) Welt: Hochzeitsflug gründet eine Tochterkolonie mit Bonus
{
  const s = newGame('Welt', 'Welt');
  s.volk.drohnen = 12;
  const ort = ORTE.find(o => o.id === 'lichtung');
  const p = flugParameter(s, ort);
  ok(p.ringe > 0 && p.ringRadius > 0, 'Flugparameter ungültig');
  const vorher = derive(s).fx.waermeMult ?? 0;
  hochzeitsflug(s, ort.id);
  ok(kolonieAn(s, ort.id), 'Kolonie wurde nicht gegründet');
  ok((derive(s).fx.waermeMult ?? 0) > vorher, 'Kolonie-Bonus wirkt nicht');
  ok(s.volk.drohnen === 2 && s.kronenStufe === 2, 'Drohnen/Kronenstufe stimmen nicht');
  console.log(`✓ Welt: ${ORTE.length} Orte, Tochterkolonie „${kolonieAn(s, ort.id).name}" gegründet`);
}

console.log(fehler ? `\n✗ ${fehler} Fehler` : '\n✓ Schule, Baupläne & Welt in Ordnung');
process.exit(fehler ? 1 : 0);
