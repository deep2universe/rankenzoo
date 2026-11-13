// Schnelltest ohne Browser: Quiz-Engine, Generatoren, Simulation, Platzierungsregeln.
// Aufruf: node tools/smoke-test.mjs
import { loadBanks, themenVon, buildRound, recordAnswer, pruefeEingabe } from '../src/quiz/engine.js';
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
