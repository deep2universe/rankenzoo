// Stundenplan & Tests: Die Schulwoche gibt vor, welches Fach dran ist.
// Jedes Thema ist in feste Tests (ca. 6 Fragen) aufgeteilt – vom leichten Test 1 bis zum kniffligen letzten Test.
// Bestandene Tests kommen nicht wieder. Ein PERFEKTER Test (alles beim ersten Versuch richtig) schaltet einen Bauplan frei;
// sonst gibt es Rohstoffe – je mehr richtig, desto mehr.
import { FAECHER, GEBAEUDE, QUIZ, SIM } from '../game/config.js';
import { bank, themenVon, frageById, prep, istGeloest } from './engine.js';
import { plaeneFuerFach, noetigesNiveau, rangVonState, istFrei } from '../game/bauplaene.js';
import { shuffle } from '../util.js';

// ---------------------------------------------------------------- Stundenplan

/** Wochen-Stundenplan Klasse 4 (je 4 Stunden): Deutsch 5, Mathe 5, Sachunterricht 3, Sport & Miteinander 3, Englisch 2, Musik & Kunst 2. */
export const WOCHENPLAN = [
  ['deutsch', 'mathe', 'sachunterricht', 'sport_werte'],
  ['mathe', 'deutsch', 'englisch', 'musik_kunst'],
  ['deutsch', 'sachunterricht', 'mathe', 'sport_werte'],
  ['mathe', 'deutsch', 'englisch', 'musik_kunst'],
  ['deutsch', 'mathe', 'sachunterricht', 'sport_werte'],
];
export const WOCHENTAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
export const WOCHENTAGE_KURZ = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
export const STUNDEN_ZEITEN = ['8:00 – 8:45', '8:50 – 9:35', '9:55 – 10:40', '10:45 – 11:30'];
export const STUNDEN_PRO_TAG = 4;

export function createSchule() {
  return { woche: 1, wtag: 0, stunde: 0, startTag: 1, tests: {}, stunden: 0, wochenTests: 0, verlauf: [], altlasten: false };
}

const ameisentag = state => Math.floor((state.zeit ?? 0) / SIM.tagDauer) + 1;

/**
 * Aktueller Stand im Stundenplan. Ist der Schultag geschafft und ein neuer Ameisentag angebrochen,
 * beginnt automatisch der nächste Schultag. Gibt { fach, wtag, stunde, schulschluss, sekundenBisMorgen, neuerTag } zurück.
 */
export function aktuelleStunde(state) {
  const S = (state.schule ??= createSchule());
  const tag = ameisentag(state);
  let neuerTag = false, neueWoche = false;
  if (S.stunde >= STUNDEN_PRO_TAG && tag > S.startTag) {
    S.wtag++; S.stunde = 0; S.startTag = tag; neuerTag = true;
    if (S.wtag >= WOCHENPLAN.length) { S.wtag = 0; S.woche++; S.wochenTests = 0; neueWoche = true; }
  }
  const schulschluss = S.stunde >= STUNDEN_PRO_TAG;
  const fach = schulschluss ? null : WOCHENPLAN[S.wtag][S.stunde];
  const sekundenBisMorgen = Math.max(0, tag * SIM.tagDauer - (state.zeit ?? 0));
  return { fach, wtag: S.wtag, stunde: S.stunde, woche: S.woche, schulschluss, sekundenBisMorgen, neuerTag, neueWoche };
}

/** Die aktuelle Stunde ist vorbei (egal ob bestanden – ein nicht bestandener Test wartet auf die nächste Stunde des Fachs). */
export function stundeBeenden(state, eintrag) {
  const S = state.schule;
  S.verlauf.push({ woche: S.woche, wtag: S.wtag, stunde: S.stunde, ...eintrag });
  if (S.verlauf.length > 80) S.verlauf.splice(0, S.verlauf.length - 80);
  S.stunden++;
  S.stunde = Math.min(STUNDEN_PRO_TAG, S.stunde + 1);
  return S.stunde >= STUNDEN_PRO_TAG;
}

/** Status einer Stunde im Wochenraster: 'fertig' | 'jetzt' | 'spaeter' */
export function stundenStatus(state, wtag, stunde) {
  const S = state.schule;
  if (wtag < S.wtag || (wtag === S.wtag && stunde < S.stunde)) return 'fertig';
  if (wtag === S.wtag && stunde === S.stunde) return 'jetzt';
  return 'spaeter';
}

// ---------------------------------------------------------------- Tests

const GEN_TESTS = 3; // Zufallsaufgaben-Themen: Test 1 (leicht) bis 3 (knifflig)
let TESTS = null;     // fach -> thema -> [Test]

/** Tests aus den Fragenbanken bauen (nach loadBanks aufrufen; wird bei Bedarf automatisch gemacht). */
export function baueTests() {
  const B = bank();
  TESTS = {};
  for (const fach of Object.keys(FAECHER)) {
    TESTS[fach] = {};
    if (!B[fach]) continue;
    for (const t of themenVon(fach)) {
      if (t.generator) {
        TESTS[fach][t.key] = Array.from({ length: GEN_TESTS }, (_, k) => ({
          id: `${fach}:${t.key}:${k + 1}`, fach, thema: t.key, nr: k + 1, von: GEN_TESTS, niveau: k + 1, generator: true, n: QUIZ.fragenProRunde,
        }));
        continue;
      }
      const qs = B[fach].fragen.filter(q => q.thema === t.key)
        .sort((a, b) => (a.stufe - b.stufe) || a.id.localeCompare(b.id, 'de', { numeric: true }));
      const anzahl = Math.max(1, Math.round(qs.length / QUIZ.fragenProRunde));
      const tests = [];
      for (let k = 0; k < anzahl; k++) {
        const von = Math.round((k * qs.length) / anzahl), bis = Math.round(((k + 1) * qs.length) / anzahl);
        const ids = qs.slice(von, bis).map(q => q.id);
        const niveau = anzahl === 1 ? 2 : 1 + Math.round((2 * k) / (anzahl - 1));
        tests.push({ id: `${fach}:${t.key}:${k + 1}`, fach, thema: t.key, nr: k + 1, von: anzahl, niveau, fragen: ids, n: ids.length });
      }
      TESTS[fach][t.key] = tests;
    }
  }
  return TESTS;
}
const tests = () => TESTS ?? baueTests();

export const alleTests = () => Object.values(tests()).flatMap(f => Object.values(f).flat());
export const testsVon = (fach, thema) => tests()[fach]?.[thema] ?? [];
export const testById = id => { const [f, t] = id.split(':'); return testsVon(f, t).find(x => x.id === id) ?? null; };

export const testStand = (state, id) => state.schule?.tests?.[id] ?? null;
export const istBestanden = (state, id) => !!testStand(state, id)?.bestanden;

/** Nächster offener Test eines Themas (Tests werden der Reihe nach gespielt) – oder null, wenn alles bestanden ist. */
export function naechsterTest(state, fach, thema) {
  return testsVon(fach, thema).find(t => !istBestanden(state, t.id)) ?? null;
}

/** Überblick über ein Thema: { tests, bestanden, perfekt, offen, naechster } */
export function themaTests(state, fach, thema) {
  const ts = testsVon(fach, thema);
  const bestanden = ts.filter(t => istBestanden(state, t.id)).length;
  const perfekt = ts.filter(t => testStand(state, t.id)?.perfekt).length;
  return { tests: ts, bestanden, perfekt, offen: ts.length - bestanden, naechster: naechsterTest(state, fach, thema) };
}

/** Überblick über ein Fach. */
export function fachTests(state, fach) {
  const ts = Object.values(tests()[fach] ?? {}).flat();
  const bestanden = ts.filter(t => istBestanden(state, t.id)).length;
  return { gesamt: ts.length, bestanden, offen: ts.length - bestanden, perfekt: ts.filter(t => testStand(state, t.id)?.perfekt).length };
}

/** Freie Wahl statt Stundenplan? Dann darf das Kind jedes offene Test-Paket selbst aussuchen. */
export const freieWahl = state => state.einstellungen?.lernmodus === 'frei';

/**
 * Spielbare Tests eines Fachs in Themen-Reihenfolge: mit Stundenplan je Thema der nächste offene Test,
 * bei freier Wahl alle offenen Test-Pakete.
 */
export function spielbareTests(state, fach) {
  if (freieWahl(state)) return themenVon(fach).flatMap(t => testsVon(fach, t.key).filter(x => !istBestanden(state, x.id)));
  return themenVon(fach).map(t => naechsterTest(state, fach, t.key)).filter(Boolean);
}

/** Gibt es in irgendeinem Fach noch offene Tests? */
export const offeneFaecher = state => Object.keys(FAECHER).filter(f => spielbareTests(state, f).length > 0);

// ---------------------------------------------------------------- Belohnungen

/**
 * Welche Baupläne liegen gerade auf welchen Tests eines Fachs? Map testId → Gebäudetyp.
 * Niedrige Ausbaustufen kommen zuerst; höhere Stufen (Gymnasium, Universität …) nur auf schwierigeren Tests.
 * Gehen die Baupläne des Fachs aus, springen Baupläne anderer Fächer ein. Sind alle vergeben → nur noch Rohstoffe.
 */
export function bauplanVerteilung(state, fach) {
  const spielbar = spielbareTests(state, fach);
  const { eigen, fremd } = plaeneFuerFach(state, fach, rangVonState(state));
  const map = new Map();
  const frei = [...spielbar];
  // Höchstens gut die Hälfte der Themen trägt einen Bauplan – so bleibt er etwas Besonderes und das Kind kann wählen.
  const themen = new Set(spielbar.map(t => t.thema)).size;
  const grenze = Math.max(3, Math.ceil(themen * 0.5));
  for (const typ of [...eigen, ...fremd]) {
    if (!frei.length || map.size >= grenze) break;
    const need = noetigesNiveau(typ);
    const i = frei.findIndex(t => t.niveau >= need);
    if (i < 0) continue;
    map.set(frei[i].id, typ);
    frei.splice(i, 1);
  }
  return map;
}

/** Rohstoffe für einen Test – als Vorschau (max) und zur Auszahlung. */
export function testBelohnung(state, test, quizBonus = 0, plan = null) {
  const qs = test.generator ? null : test.fragen.map(id => frageById(id)).filter(Boolean);
  const proFrage = qs ? qs.map(q => QUIZ.sterne[q.stufe] ?? 5) : Array(test.n).fill(QUIZ.sterne[test.niveau] ?? 8);
  const sterneMax = Math.round(proFrage.reduce((a, b) => a + b, 0) * (1 + quizBonus));
  return {
    plan,
    n: test.n,
    proRichtig: { sterne: Math.round((sterneMax / test.n)), gang: QUIZ.gangProRichtig, fp: SIM.fpProRichtig },
    sterneMax,
    bestanden: { material: 4 + 3 * test.niveau, nahrung: 15 + 5 * test.niveau },   // ab der Hälfte richtig
    perfektOhnePlan: { sterne: 20 + 10 * test.niveau, material: 8 + 4 * test.niveau, joker: 1 },
    noetig: Math.ceil(test.n / 2),
  };
}

/** Fragen für einen Test zusammenstellen (für die Anzeige vorbereitet, gemischt). */
export function testFragen(test) {
  if (!test.generator) {
    return shuffle(test.fragen.map(id => frageById(id)).filter(Boolean).map(q => prep(q, false))).map((q, i) => ({ ...q, _n: i }));
  }
  const g = bank()[test.fach]?.gens[test.thema];
  const out = [], texte = new Set();
  for (let v = 0; out.length < test.n && v < test.n * 8; v++) {
    const q = g.gen(test.niveau);
    if (texte.has(q.frage)) continue;
    texte.add(q.frage);
    out.push(prep({ ...q, id: `gen-${test.thema}-${Date.now()}-${out.length}`, fach: test.fach, thema: test.thema, stufe: test.niveau, generiert: true }));
  }
  return out.map((q, i) => ({ ...q, _n: i }));
}

/**
 * Test-Ergebnis speichern. richtig = Anzahl beim ERSTEN Versuch richtig beantworteter Fragen.
 * Gibt { bestanden, perfekt, neuBestanden } zurück.
 */
export function testErgebnis(state, test, richtig) {
  const S = state.schule;
  const alt = S.tests[test.id];
  const perfekt = richtig >= test.n;
  const bestanden = richtig >= Math.ceil(test.n / 2);
  const st = (S.tests[test.id] ??= { versuche: 0, best: 0, bestanden: false, perfekt: false });
  st.versuche++;
  st.best = Math.max(st.best, richtig);
  st.n = test.n;
  st.zeit = Date.now();
  if (bestanden) { st.bestanden = true; S.wochenTests = (S.wochenTests ?? 0) + 1; }
  if (perfekt) st.perfekt = true;
  return { bestanden, perfekt, neuBestanden: bestanden && !alt?.bestanden };
}

/**
 * Alte Spielstände: Tests, deren Fragen schon alle gelöst sind, gelten als bestanden.
 * (Läuft einmal, sobald die Fragenbanken geladen sind.)
 */
export function pruefeAltlasten(state) {
  const S = (state.schule ??= createSchule());
  if (S.altlasten) return;
  S.altlasten = true;
  for (const t of alleTests()) {
    if (t.generator || S.tests[t.id]) continue;
    if (t.fragen.length && t.fragen.every(id => istGeloest(state, id))) S.tests[t.id] = { versuche: 1, best: t.n, n: t.n, bestanden: true, perfekt: false, alt: true };
  }
}

/** Kurztext einer Belohnung für Listen. */
export function planName(typ) { return typ ? `${GEBAEUDE[typ].icon} ${GEBAEUDE[typ].name}` : ''; }
export { istFrei };
