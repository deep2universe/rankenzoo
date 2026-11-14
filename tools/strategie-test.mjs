// Test der Strategie-Ebene ohne Browser: Revier, Trupps, Expeditionen, Forschung, Handel, neue Gebäude.
// Aufruf: node tools/strategie-test.mjs
import { newGame, addRoom, migriere } from '../src/game/state.js';
import { tick, derive, refreshConnectivity } from '../src/game/sim.js';
import { setzeTrupp, sendeExpedition, handeln, handelMoeglich, aufdecken, NEST, erkundetAnteil } from '../src/game/revier.js';
import { starteForschung, kannForschen, TECHS, hatTech } from '../src/game/forschung.js';
import { verfuegbarePlaene, placeBuilding } from '../src/game/actions.js';
import { schalteFrei, ausbauen, istFrei } from '../src/game/bauplaene.js';
import { canPlace, canDig, dig } from '../src/game/world.js';
import { GEBAEUDE, GROUND, COLS, QUELLEN } from '../src/game/config.js';
import { MISSIONEN } from '../src/game/missions.js';

let fehler = 0;
const ok = (bed, msg) => { if (!bed) { fehler++; console.error('✗ ' + msg); } };
const lauf = (s, sek) => { let d; for (let i = 0; i < sek * 10; i++) d = tick(s, 0.1); return d; };

// 1) Revier-Erzeugung
const s = newGame('Test', 'Test');
const r = s.revier;
ok(r.quellen.length >= 18, `zu wenige Quellen (${r.quellen.length})`);
ok(r.quellen.filter(q => q.entdeckt).length >= 2, 'am Anfang sollen 2 Quellen sichtbar sein');
ok(r.quellen.filter(q => q.typ === 'fund').length >= 10, 'zu wenige Fundstücke im Nebel');
ok(r.quellen.some(q => QUELLEN[q.typ].pollen), 'keine Pollen-Quellen');
ok(r.quellen.some(q => q.typ === 'nachbar'), 'kein Nachbarvolk');
ok(r.quellen.filter(q => q.typ === 'schatz').length === 5, 'nicht 5 Schätze');
ok(r.quellen.every(q => QUELLEN[q.typ]), 'unbekannter Quellentyp');
console.log(`✓ Revier: ${r.quellen.length} Quellen, ${Math.round(erkundetAnteil(r) * 100)} % sichtbar`);

// 2) Trupps liefern Rohstoffe, Faktor sinkt bei Ameisenmangel
s.volk.arbeiterinnen = 40;
const [beeren, zweige] = ['beeren', 'zweige'].map(t => r.quellen.find(q => q.typ === t && q.entdeckt));
ok(beeren && zweige, 'Startquellen fehlen');
setzeTrupp(r, beeren.id, 's', 8);
setzeTrupp(r, zweige.id, 's', 6);
const mat0 = s.res.material;
let d = lauf(s, 60);
ok(d.revier.nahrung > 0 && d.revier.material > 0, 'Trupps liefern nichts');
ok(s.res.material > mat0 + 3, `Material steigt kaum (${s.res.material.toFixed(1)})`);
ok(d.revierFaktor === 1, 'Faktor sollte 1 sein');
setzeTrupp(r, zweige.id, 's', 60);
d = derive(s);
ok(d.revierFaktor < 1, 'Faktor sollte bei Ameisenmangel < 1 sein');
ok(d.jobs.sammler >= 0 && d.jobs.revier <= s.volk.arbeiterinnen, 'Jobverteilung kaputt');
setzeTrupp(r, zweige.id, 's', -60);
console.log(`✓ Trupps: ${(d.revier.nahrung * 60).toFixed(1)} Nahrung/min aus dem Revier`);

// 3) Expedition zu einem Schatz
const schatz = r.quellen.filter(q => q.typ === 'schatz').sort((a, b) => Math.hypot(a.x - NEST.x, a.y - NEST.y) - Math.hypot(b.x - NEST.x, b.y - NEST.y))[0];
const sterne0 = s.res.sterne;
ok(sendeExpedition(r, schatz.x, schatz.y, 3, derive(s).fx).ok, 'Expedition startet nicht');
ok(!sendeExpedition(r, 1, 1, 1, derive(s).fx).ok, 'Expeditions-Slots werden nicht begrenzt');
d = lauf(s, 120);
ok(r.exp.length === 0, 'Expedition kommt nicht zurück');
ok(r.gefunden === 1 && schatz.menge === 0, 'Schatz nicht gefunden');
ok(s.res.sterne > sterne0, 'Schatz bringt keine Sterne');
console.log(`✓ Expedition: Schatz gefunden, ${Math.round(erkundetAnteil(r) * 100)} % erkundet`);

// 4) Störenfried & Wächterinnen
r.stoererTimer = 1e9; // keine zufälligen Störenfriede während des Tests
beeren.stoerer = { typ: 'wespe', kraft: 32, max: 32, t: 0 };
const ohne = derive(s).revier.pro.get(beeren.id);
setzeTrupp(r, beeren.id, 'w', 4);
lauf(s, 20);
ok(!beeren.stoerer, 'Wächterinnen vertreiben den Störenfried nicht');
ok(r.vertrieben >= 1, 'vertrieben wird nicht gezählt');
ok(derive(s).revier.pro.get(beeren.id) > ohne, 'Störenfried senkt den Ertrag nicht');
console.log('✓ Störenfriede werden vertrieben');

// 5) Forschung
s.res.fp = 0;
ok(!kannForschen(s, 'pilzzucht').ok, 'Forschung ohne Punkte möglich');
ok(!kannForschen(s, 'blattlauspflege').ok, 'Voraussetzungen werden ignoriert');
s.res.fp = 500; s.res.material = 500;
ok(starteForschung(s, 'pilzzucht').ok, 'Forschung startet nicht');
ok(!starteForschung(s, 'duftspuren').ok, 'zwei Forschungen gleichzeitig');
lauf(s, TECHS.pilzzucht.dauer + 2);
ok(hatTech(s, 'pilzzucht'), 'Forschung wird nicht fertig');
ok(derive(s).fx.pilzBonus >= 0.25, 'Forschungseffekt wirkt nicht');
ok(!verfuegbarePlaene(s, 3).includes('bahnhof'), 'Bahnhof ohne Duftspuren verfügbar');
starteForschung(s, 'duftspuren'); lauf(s, TECHS.duftspuren.dauer + 2);
ok(verfuegbarePlaene(s, 3).includes('bahnhof'), 'Bahnhof nach Duftspuren nicht verfügbar');
console.log(`✓ Forschung: ${s.forschung.fertig.length} Techniken erforscht`);

// 6) Handel
const nachbar = r.quellen.find(q => q.typ === 'nachbar');
ok(!handelMoeglich(s, derive(s).fx).ok, 'Handel ohne Nachbarn möglich');
aufdecken(r, nachbar.x, nachbar.y, 2);
ok(!handelMoeglich(s, derive(s).fx).ok, 'Handel ohne Diplomatie möglich');
for (const t of ['schrift', 'feste', 'diplomatie']) { ok(starteForschung(s, t).ok, `${t} startet nicht`); lauf(s, TECHS[t].dauer + 2); }
ok(handelMoeglich(s, derive(s).fx).ok, 'Handel nach Diplomatie nicht möglich');
s.res.nahrung = 100; s.res.material = 100; s.res.sterne = 100;
ok(handeln(s, 0).ok, 'Handel schlägt fehl');
ok(!handeln(s, 0).ok, 'Angebot doppelt nutzbar');
console.log('✓ Handel mit dem Nachbarvolk');

// 7) Alle Gebäude lassen sich platzieren; Material-Kosten greifen
const b = newGame('Bau', 'Bau');
for (let pass = 0; pass < 3; pass++) {
  for (const yy of [GROUND + 3, GROUND + 9, GROUND + 14, GROUND + 17, GROUND + 20, GROUND + 25, GROUND + 29]) for (let x = 2; x < COLS - 2; x++) if (canDig(b.world, x, yy).ok) dig(b.world, x, yy);
  for (let y = GROUND + 3; y < GROUND + 30; y++) for (const x of [4, 10, 20, 31, 40, 50, 56]) if (canDig(b.world, x, y).ok) dig(b.world, x, y);
}
b.world.hill = 4;
const { setHill } = await import('../src/game/world.js');
setHill(b.world, 4);
refreshConnectivity(b);
for (const typ of Object.keys(GEBAEUDE)) {
  if (typ === 'koenigin' || GEBAEUDE[typ].zone === 'revier' || GEBAEUDE[typ].lstufe > 1) continue;
  let gesetzt = false;
  for (let y = 0; y < GROUND + 30 && !gesetzt; y++) for (let x = 2; x < COLS - 6 && !gesetzt; x++) {
    if (canPlace(b.world, b.rooms, typ, x, y).ok) { addRoom(b, typ, x, y, true); refreshConnectivity(b); gesetzt = true; }
  }
  ok(gesetzt, `${typ} konnte nicht platziert werden`);
}
b.volk.arbeiterinnen = 250;
d = lauf(b, 30);
ok(Number.isFinite(d.zufriedenheit) && Number.isFinite(b.res.fp) && d.fpProSek > 0.01, 'Werte mit allen Gebäuden ungültig');
// Alle Ausbaustufen einmal im Spiel durchrechnen
for (const rr of b.rooms) { const G = GEBAEUDE[rr.typ]; if (G.lmax > 1) rr.typ = Object.keys(GEBAEUDE).find(k => GEBAEUDE[k].linie === G.linie && GEBAEUDE[k].lstufe === G.lmax); }
d = lauf(b, 10);
ok(Number.isFinite(d.zufriedenheit) && Number.isFinite(b.res.fp), 'Werte mit höchsten Ausbaustufen ungültig');
console.log(`✓ Alle ${Object.keys(GEBAEUDE).length} Gebäude (Stufe 1 platziert, höchste Stufen gerechnet) · ${(d.fpProSek * 60).toFixed(1)} 🔬/min · Zufriedenheit ${Math.round(d.zufriedenheit)} %`);
// Materialkosten & Bauplan-Pflicht
const m = newGame('M', 'M');
m.res.sterne = 999; m.res.material = 0;
ok(!placeBuilding(m, 'labor', 30, GROUND + 10).ok, 'Labor ohne Bauplan baubar');
schalteFrei(m, 'labor');
const lab = placeBuilding(m, 'labor', 30, GROUND + 10);
ok(!lab.ok && /Baumaterial/.test(lab.grund ?? ''), 'Labor ohne Baumaterial baubar');
ok(!placeBuilding(m, 'schule', 30, GROUND + 10).ok, 'Ausbaustufe lässt sich direkt bauen');
// Ausbau an Ort und Stelle
const kino = b.rooms.find(rr => GEBAEUDE[rr.typ].linie === 'kino');
kino.typ = 'kino';
b.res.sterne = 999; b.res.material = 999;
ok(!ausbauen(b, kino).ok, 'Ausbau ohne Bauplan möglich');
schalteFrei(b, 'grosskino');
ok(ausbauen(b, kino).ok, 'Ausbau mit Bauplan geht nicht');
const masse0 = [kino.w, kino.h];
lauf(b, 120);
ok(kino.typ === 'grosskino' && !kino.ausbau, `Ausbau wird nicht fertig (${kino.typ})`);
ok(kino.w === masse0[0] && kino.h === masse0[1], 'Ausbau verändert die Raumgröße');

// 8) Alte Spielstände
const alt = JSON.parse(JSON.stringify({ ...newGame('Alt', 'Alt'), world: null }));
delete alt.revier; delete alt.forschung; delete alt.befehle; delete alt.res.material; delete alt.res.fp;
alt.world = newGame('x', 'y').world;
migriere(alt);
ok(alt.revier && alt.forschung && alt.befehle && alt.res.material >= 0, 'Migration alter Spielstände unvollständig');
ok(alt.bauplaene && alt.schule && alt.welt && alt.buerger, 'Migration: neue Felder fehlen');
ok(Number.isFinite(derive(alt).zufriedenheit), 'migrierter Spielstand rechnet nicht');

// 9) Missionen eindeutig
ok(new Set(MISSIONEN.map(x => x.id)).size === MISSIONEN.length, 'doppelte Missions-IDs');
for (const mi of MISSIONEN) {
  const [ist, soll] = mi.ziel(s, derive(s));
  ok(Number.isFinite(ist) && Number.isFinite(soll), `Mission ${mi.id} liefert ungültige Werte`);
  if (mi.lohn.plan) ok(GEBAEUDE[mi.lohn.plan], `Mission ${mi.id}: unbekannter Bauplan`);
}
console.log(`✓ ${MISSIONEN.length} Aufgaben, alte Spielstände werden übernommen`);

console.log(fehler ? `\n✗ ${fehler} Fehler` : '\n✓ Strategie-Ebene in Ordnung');
process.exit(fehler ? 1 : 0);
