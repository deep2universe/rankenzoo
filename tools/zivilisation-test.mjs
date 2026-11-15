// Test ohne Browser: mehrere Kolonien, Gegenden, Wechsel, Hintergrund-Simulation, Speichern,
// Straßen & Botenlinien, Hotel-Besuche, Krabbelschow-Skala, Duftkarte, Bedarf, freie Wahl.
// Aufruf: node tools/zivilisation-test.mjs
import { loadBanks } from '../src/quiz/engine.js';
import { baueTests, spielbareTests, bauplanVerteilung } from '../src/quiz/stundenplan.js';
import { newGame, addRoom, zuSpeicher, ausSpeicher } from '../src/game/state.js';
import { tick, derive, hochzeitsflugBereit, refreshConnectivity } from '../src/game/sim.js';
import { hochzeitsflug, placeBuilding } from '../src/game/actions.js';
import { canPlace, canDig, dig } from '../src/game/world.js';
import { ORTE, ALLE_ORTE, ORT_ANZAHL, flugParameter, wespenParameter, BIOME, drohnenNoetig } from '../src/game/welt.js';
import * as K from '../src/game/kolonien.js';
import * as Z from '../src/game/zivilisation.js';
import { MISSIONEN } from '../src/game/missions.js';
import { GEBAEUDE, GROUND, COLS, START_PLAENE } from '../src/game/config.js';
import { schalteFrei } from '../src/game/bauplaene.js';

let fehler = 0;
const ok = (bed, msg) => { if (!bed) { fehler++; console.error('✗ ' + msg); } };
await loadBanks();
baueTests();

// 1) Welt: 20 Ameisenstaaten, jede Gegend definiert
ok(ORT_ANZAHL === 20 && ORTE.length === 19, `Es sollen 20 Ameisenstaaten sein (${ORT_ANZAHL})`);
ok(new Set(ALLE_ORTE.map(o => o.id)).size === 20, 'Orts-IDs doppelt');
for (const o of ALLE_ORTE) {
  ok(BIOME[o.biom], `${o.id}: Gegend ${o.biom} fehlt`);
  for (const o2 of ALLE_ORTE) if (o !== o2) ok(Math.hypot(o.x - o2.x, o.y - o2.y) > 250, `${o.id} und ${o2.id} liegen zu dicht`);
}
for (const o of ORTE) {
  const p = flugParameter({ rooms: [], welt: { kolonien: [] } }, o);
  ok(p.ringRadius >= 1.1, `${o.id}: Ringe zu klein (${p.ringRadius})`);
  ok(p.wind === o.entfernung >= 3, `${o.id}: Wind falsch`);
  const w = wespenParameter({ rooms: [], welt: { kolonien: [] } }, o);
  ok(w.dauer > 30 && w.powerups > 1, `${o.id}: Wespenalarm-Parameter`);
}
console.log('✓ 20 Ameisenstaaten in 20 Gegenden, Ringe groß, Wind ab „weit"');

// 2) Hochzeitsflug leicht erreichbar
{
  const s = newGame('Flug', 'Flug');
  ok(START_PLAENE.includes('hochzeit') && s.bauplaene.hochzeit, 'Startplatz-Bauplan fehlt am Anfang');
  ok(drohnenNoetig(s) <= 3, `zu viele Drohnen nötig (${drohnenNoetig(s)})`);
  // Startplatz bauen
  for (let x = 24; x < 37; x++) for (let y = 8; y < GROUND; y++) if (canDig(s.world, x, y).ok && y === GROUND - 2) dig(s.world, x, y);
  refreshConnectivity(s);
  let gebaut = false;
  s.res.sterne = 999;
  for (let y = 4; y < GROUND && !gebaut; y++) for (let x = 20; x < 42 && !gebaut; x++) if (canPlace(s.world, s.rooms, 'hochzeit', x, y).ok) { gebaut = placeBuilding(s, 'hochzeit', x, y).ok; }
  ok(gebaut, 'Startplatz lässt sich nicht bauen');
  for (const r of s.rooms) r.bau = 1;
  refreshConnectivity(s);
  s.volk.drohnen = 3;
  const b = hochzeitsflugBereit(s, derive(s));
  ok(b.ok, 'Hochzeitsflug trotz Startplatz & 3 Drohnen nicht bereit: ' + b.gruende.join(', '));
  console.log('✓ Hochzeitsflug: Bauplan von Anfang an, wenige Drohnen nötig');
}

// 3) Neue Kolonien sind bebaubar, haben ihre Gegend und wachsen im Hintergrund
const s = newGame('Reich', 'Reich');
s.volk.drohnen = 60; s.res.sterne = 5000; s.res.material = 3000; s.res.fp = 500;
for (const id of ['sandhuegel', 'teich', 'lichtung', 'pilzwald', 'kornfeld']) hochzeitsflug(s, id);
ok(K.kolonieIds(s).length === 6, 'Kolonien wurden nicht gegründet');
for (const id of K.kolonieIds(s).slice(1)) {
  const k = s.kolonienDaten[id];
  ok(k?.world?.biom === ALLE_ORTE.find(o => o.id === id).biom, `${id}: Gelände hat nicht die Gegend`);
  ok(k.rooms.length >= 4 && k.rooms.every(r => r.verbunden && r.bau >= 1), `${id}: Startnest unvollständig oder nicht verbunden`);
  ok(k.revier?.quellen?.length > 10, `${id}: kein eigenes Revier`);
}
const pop0 = s.kolonienDaten.sandhuegel.volk.arbeiterinnen;
for (let i = 0; i < 300; i++) { tick(s, 1); K.kolonienTick(s, 1); }
ok(s.kolonienDaten.sandhuegel.volk.arbeiterinnen > pop0, 'Hintergrund-Kolonie wächst nicht');
ok(Number.isFinite(s.kolonienDaten.teich.info.zufriedenheit), 'Info der Hintergrund-Kolonie fehlt');
ok(Number.isFinite(s.res.sterne) && Number.isFinite(s.res.fp), 'Gemeinsame Rohstoffe ungültig');
console.log(`✓ 6 Kolonien: Sandhügel wächst im Hintergrund von ${pop0} auf ${s.kolonienDaten.sandhuegel.volk.arbeiterinnen} Arbeiterinnen`);

// 4) Wechsel & Bauen in einer Tochterkolonie, Baupläne gelten überall
{
  const heimRooms = s.rooms.length;
  ok(K.wechsleKolonie(s, 'teich'), 'Wechsel klappt nicht');
  ok(K.aktiveId(s) === 'teich' && s.world.biom === 'teich' && s.kolonienDaten.heim, 'Wechsel vertauscht die Daten nicht');
  schalteFrei(s, 'kita');
  let gesetzt = false;
  for (let y = GROUND + 1; y < GROUND + 14 && !gesetzt; y++) for (let x = 2; x < COLS - 6 && !gesetzt; x++) if (canPlace(s.world, s.rooms, 'kita', x, y).ok) gesetzt = placeBuilding(s, 'kita', x, y).ok;
  ok(gesetzt, 'In der Tochterkolonie kann nicht gebaut werden');
  ok(K.wechsleKolonie(s, 'heim') && s.rooms.length === heimRooms && s.world.biom === 'heim', 'Zurückwechseln stellt das Heimatnest nicht her');
  ok(s.kolonienDaten.teich.rooms.some(r => r.typ === 'kita'), 'Bau in der Tochterkolonie ging verloren');
  console.log('✓ Kolonie wechseln, dort bauen, zurück – alles bleibt erhalten');
}

// 5) Speichern & Laden mit mehreren Kolonien
{
  const data = JSON.parse(JSON.stringify(zuSpeicher(s)));
  const t = ausSpeicher(data);
  ok(Object.keys(t.kolonienDaten).length === 5 && t.kolonienDaten.pilzwald.world.typ instanceof Uint8Array, 'Kolonien werden nicht gespeichert/geladen');
  ok(t.kolonienDaten.pilzwald.world.biom === 'pilzwald', 'Gegend geht beim Speichern verloren');
  ok(Number.isFinite(derive(t).zufriedenheit), 'geladener Spielstand rechnet nicht');
  console.log('✓ Speichern & Laden mit 6 Kolonien');
}

// 6) Straßen, Botenlinien, Hotels & Besuche
{
  ok(!Z.routeMoeglich(s, 'strasse', 'heim', 'heim').ok, 'Straße zu sich selbst erlaubt');
  ok(!Z.routeMoeglich(s, 'strasse', 'heim', 'felsen').ok, 'Straße zu Ort ohne Kolonie erlaubt');
  ok(Z.baueRoute(s, 'strasse', 'heim', 'teich').ok && Z.baueRoute(s, 'strasse', 'heim', 'lichtung').ok, 'Straßen lassen sich nicht bauen');
  ok(!Z.baueRoute(s, 'strasse', 'teich', 'heim').ok, 'Doppelte Straße erlaubt');
  ok(Z.baueRoute(s, 'boten', 'heim', 'sandhuegel').ok && Z.baueRoute(s, 'boten', 'teich', 'pilzwald').ok && Z.baueRoute(s, 'boten', 'lichtung', 'kornfeld').ok, 'Botenlinien lassen sich nicht bauen');
  const fp0 = derive(s).fpProSek;
  for (let i = 0; i < 120; i++) Z.weltTick(s, 1, derive(s));
  ok(s.welt.strassen.every(r => r.bau >= 1) && s.welt.boten.every(r => r.bau >= 1), 'Routen werden nicht fertig');
  ok(derive(s).fpProSek > fp0, 'Botenlinien bringen kein Wissen');
  ok(s.welt.besuche.length === 0, 'Besuche ohne Hotel');
  // Hotel in der Teich-Kolonie
  const k = s.kolonienDaten.teich;
  k.rooms.push({ id: k.nextRoomId++, typ: 'hotel', x: 1, y: GROUND + 20, w: 4, h: 2, bau: 1, verbunden: true });
  ok(Z.hotelVon(s, 'teich').stufe === 2, 'Hotel wird nicht erkannt');
  const fp1 = s.res.fp;
  let besuche = 0;
  for (let i = 0; i < 400; i++) besuche += Z.weltTick(s, 1, derive(s)).filter(e => e.typ === 'besuch').length;
  ok(besuche > 3, `Zu wenige Besuche im Hotel (${besuche})`);
  ok(s.welt.bewusstsein > 0 && s.res.fp > fp1 - 1, 'Besuche bringen nichts');
  const str = s.welt.strassen[0];
  ok(Z.routeAusbauen(s, str).ok && str.stufe === 2, 'Straßen-Ausbau geht nicht');
  console.log(`✓ Straßen, Botenlinien, Hotel: ${besuche} Besuche, Bewusstsein ${Math.round(Z.bewusstsein(s).wert)}`);
}

// 7) Krabbelschow-Skala, Duftkarte, Bedarf
{
  const leer = newGame('Leer', 'Leer');
  ok(Z.krabbelschow(leer).typ === 0, 'Neues Spiel nicht auf Typ 0');
  leer.welt.flugBereitErreicht = true;
  ok(Z.krabbelschow(leer).typ === 1, 'Flugbereitschaft ergibt nicht Typ 1');
  const ks = Z.krabbelschow(s);
  ok(ks.typ >= 2 && ks.wert >= ks.typ && ks.wert < ks.typ + 1, `Krabbelschow-Wert falsch (${ks.wert})`);
  ok(ks.stufen.length === 5 && ks.beitraege.length === 6 && Math.abs(ks.beitraege.reduce((a, b) => a + b.anteil, 0) - 1) < 1e-6, 'Beiträge stimmen nicht');
  const duft = Z.duftKarte(s, derive(s));
  ok(duft.kolonien.length === 6 && duft.kolonien.every(k => k.duefte.length === 6 && k.duefte.every(x => x.staerke >= 0 && x.staerke <= 1 && x.text)), 'Duftkarte unvollständig');
  ok(duft.spuren.length === 5, 'Duftspuren fehlen');
  const b = Z.bedarf(s, derive(s));
  ok(b.proKolonie.length === 6 && b.proKolonie.some(k => k.items.some(i => i.icon === '🏨')), 'Bedarf zeigt fehlende Hotels nicht');
  ok(Z.kolonieListe(s, derive(s)).every(k => Number.isFinite(k.pop) && k.name), 'Kolonieliste ungültig');
  console.log(`✓ Krabbelschow-Typ ${ks.wert.toFixed(1).replace('.', ',')}, Duftkarte & Bedarf vollständig`);
}

// 8) Freie Wahl: alle offenen Test-Pakete wählbar, Baupläne trotzdem vorab sichtbar
{
  const f = newGame('Frei', 'Frei');
  const plan = spielbareTests(f, 'deutsch').length;
  f.einstellungen.lernmodus = 'frei';
  const frei = spielbareTests(f, 'deutsch').length;
  ok(frei > plan, 'Freie Wahl bietet nicht mehr Pakete an');
  ok(bauplanVerteilung(f, 'deutsch').size >= 3, 'Freie Wahl zeigt keine Baupläne');
  console.log(`✓ Freie Wahl: ${frei} Test-Pakete in Deutsch wählbar (Stundenplan: ${plan})`);
}

// 9) Missionen rechnen mit mehreren Kolonien
for (const m of MISSIONEN) {
  const [ist, soll] = m.ziel(s, derive(s));
  ok(Number.isFinite(ist) && Number.isFinite(soll), `Mission ${m.id} liefert ungültige Werte`);
}
ok(new Set(MISSIONEN.map(m => m.id)).size === MISSIONEN.length, 'doppelte Missions-IDs');
ok(GEBAEUDE.gaestehaus && GEBAEUDE.hotel && GEBAEUDE.grandhotel, 'Hotel-Linie fehlt');
console.log(`✓ ${MISSIONEN.length} Aufgaben rechnen mit mehreren Kolonien`);

console.log(fehler ? `\n✗ ${fehler} Fehler` : '\n✓ Zivilisation in Ordnung');
process.exit(fehler ? 1 : 0);
