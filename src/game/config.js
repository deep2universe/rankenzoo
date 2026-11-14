// Zentrale Spielkonstanten & Gebäudedefinitionen für „Ameisenreich".

export const TILE = 32;            // Weltpixel pro Zelle
export const COLS = 60;            // Breite der Welt in Zellen
export const GROUND = 16;          // erste Erd-Zeile (darüber: Himmel/Hügel)
export const DEPTH = 34;           // Erd-Zeilen unter der Oberfläche
export const ROWS = GROUND + DEPTH;
export const HILL_X = 30;          // Mittelpunkt des Ameisenhügels
export const WATER_ROWS = 2;       // Grundwasser ganz unten

export const SAVE_KEY = 'ameisenreich.save.v1';
export const STATE_VERSION = 2;

// Zelltypen
export const C = {
  AIR: 0, EARTH: 1, ROCK: 2, WATER: 3, TUNNEL: 4, ROOM: 5, HILL: 6, ROOT: 7,
};

// Hügelgröße pro Ausbaustufe
export function hillShape(level) {
  return { w: 4 + level * 2, h: 2 + level };
}
export const HILL_MAX = 6;
export function hillUpgradeCost(level) {
  return { sterne: 50 + level * 45, gang: 6 + level * 4, material: level <= 1 ? 0 : (level - 1) * 20, pop: [0, 0, 18, 40, 75, 120, 180][level] ?? 999 };
}

// Kolonie-Ränge nach Bevölkerung
export const RAENGE = [
  { min: 0, name: 'Gründungs-Nest', icon: '🌱' },
  { min: 25, name: 'Ameisendorf', icon: '🏡' },
  { min: 60, name: 'Ameisenstadt', icon: '🏘️' },
  { min: 120, name: 'Ameisen-Metropole', icon: '🏙️' },
  { min: 200, name: 'Ameisenreich', icon: '👑' },
];
export function rangVon(pop) {
  let r = 0;
  RAENGE.forEach((x, i) => { if (pop >= x.min) r = i; });
  return r;
}

// Bedürfnisse des Volkes
export const BEDUERFNISSE = {
  nahrung: { name: 'Nahrung', icon: '🍯', farbe: '#f5b83d' },
  wohnen: { name: 'Wohnraum', icon: '🛏️', farbe: '#8fc1ff' },
  freizeit: { name: 'Freizeit', icon: '🎉', farbe: '#ff8fb1' },
  bildung: { name: 'Bildung', icon: '🎓', farbe: '#b18cff' },
  hygiene: { name: 'Sauberkeit', icon: '🧼', farbe: '#6fe0c5' },
  waerme: { name: 'Wärme', icon: '☀️', farbe: '#ffb067' },
};

/*
 Gebäude („Kammern"). Felder:
  w,h      Größe in Zellen
  zone     'erde' | 'huegel' | 'oberflaeche' | 'tief'
  minTiefe Mindestanzahl Erd-Zeilen unter der Oberfläche (nur Erde)
  stufe    Freischalt-Stufe (Kolonie-Rang)
  kosten   Sterne (optional material = Baumaterial 🪵)
  forschung  nötige Forschung, bevor der Bauplan im Quiz auftauchen kann
  bauzeit  Sekunden bei 1 Bauarbeiterin
  personal Arbeitsplätze für ausgebildete Ameisen
  beruf    Berufsname der ausgebildeten Ameisen + Accessoire
  liefert  Bedürfnis-Versorgung (pro Gebäude bei voller Besetzung) – Einheit: versorgte Ameisen
  effekte  Spezialeffekte (siehe sim.js)
  fakt     echtes Ameisenwissen („Wusstest du?")
*/
export const GEBAEUDE = {
  koenigin: {
    name: 'Königinnenkammer', icon: '👑', w: 4, h: 3, zone: 'erde', minTiefe: 4, stufe: 0, kosten: 0, bauzeit: 1,
    personal: 1, beruf: { name: 'Hofdame', acc: 'schleife' }, einzigartig: true, abreissbar: false,
    liefert: { waerme: 6 }, farbe: '#ffcf5a',
    text: 'Hier wohnt die Königin und legt die Eier. Das Herz deines Ameisenstaates.',
    fakt: 'Eine Waldameisen-Königin kann über 20 Jahre alt werden – älter als jedes andere Insekt!',
  },
  brut: {
    name: 'Kinderstube', icon: '🥚', w: 3, h: 2, zone: 'erde', minTiefe: 2, stufe: 0, kosten: 15, bauzeit: 14,
    personal: 2, beruf: { name: 'Amme', acc: 'haube' }, liefert: {}, effekte: { brutPlatz: 14 }, farbe: '#fff1c9',
    text: 'Platz für Eier, Larven und Puppen. Ammen pflegen und füttern die Brut.',
    fakt: 'Ameisen tragen ihre Puppen je nach Temperatur in wärmere oder kühlere Kammern.',
  },
  wohnen: {
    name: 'Schlafkammer', icon: '🛏️', w: 3, h: 2, zone: 'erde', minTiefe: 1, stufe: 0, kosten: 12, bauzeit: 12,
    personal: 0, liefert: {}, effekte: { wohnraum: 16 }, farbe: '#bcd9ff',
    text: 'Gemütliche Ruheplätze für 16 Ameisen. Mehr Platz = mehr Ameisen.',
    fakt: 'Ameisen schlafen in vielen kurzen Nickerchen – bei Arbeiterinnen bis zu 250 Mini-Schläfchen am Tag!',
  },
  vorrat: {
    name: 'Vorratskammer', icon: '🫙', w: 3, h: 2, zone: 'erde', minTiefe: 2, stufe: 0, kosten: 12, bauzeit: 12,
    personal: 1, beruf: { name: 'Lageristin', acc: 'kiste' }, liefert: {}, effekte: { lager: 160 }, farbe: '#ffd59e',
    text: 'Lagert 160 Nahrung zusätzlich. Gut für schlechte Zeiten!',
    fakt: 'Honigtopf-Ameisen benutzen sogar lebende Ameisen als Vorratsfässer – mit prall gefülltem Hinterleib.',
  },
  muell: {
    name: 'Abfallkammer', icon: '♻️', w: 2, h: 2, zone: 'erde', minTiefe: 2, stufe: 0, kosten: 10, bauzeit: 10,
    personal: 1, beruf: { name: 'Recyclerin', acc: 'muetze' }, liefert: { hygiene: 30 }, farbe: '#c7e8a5',
    text: 'Ameisen sind sehr ordentlich: Abfall kommt in eine eigene Kammer.',
    fakt: 'Viele Ameisenarten haben echte Müllkammern – und spezielle Arbeiterinnen, die nur dort arbeiten.',
  },
  pilz: {
    name: 'Pilzgarten', icon: '🍄', w: 3, h: 3, zone: 'erde', minTiefe: 6, stufe: 0, kosten: 20, bauzeit: 18,
    personal: 3, beruf: { name: 'Gärtnerin', acc: 'strohhut' }, liefert: {}, effekte: { nahrung: 0.55 }, farbe: '#e8d7ff',
    text: 'Im Dunkeln und Feuchten wachsen leckere Pilze. Braucht Tiefe (mind. 6 Reihen).',
    fakt: 'Blattschneiderameisen sind Bauern: Sie füttern mit Blättern einen Pilz – und essen den Pilz.',
  },
  kita: {
    name: 'Ameisen-Kindergarten', icon: '🧸', w: 3, h: 2, zone: 'erde', minTiefe: 2, stufe: 1, kosten: 25, bauzeit: 16,
    personal: 2, beruf: { name: 'Erzieherin', acc: 'schleife' }, liefert: { bildung: 25, freizeit: 10 },
    effekte: { brutTempo: 0.2 }, farbe: '#ffd1e8',
    text: 'Larven wachsen hier schneller und fröhlicher auf (+20 % Brut-Tempo).',
    fakt: 'Ammen-Ameisen füttern Larven mit Futtersaft von Mund zu Mund – das heißt Trophallaxis.',
  },
  baeckerei: {
    name: 'Bäckerei', icon: '🥐', w: 3, h: 2, zone: 'erde', minTiefe: 1, stufe: 1, kosten: 30, bauzeit: 16,
    personal: 2, beruf: { name: 'Bäckerin', acc: 'kochmuetze' }, liefert: { freizeit: 10 },
    effekte: { nahrung: 0.3, zufriedenBonus: 3 }, farbe: '#ffc98a',
    text: 'Backt Krümelbrot aus Samen. Liefert Nahrung und gute Laune.',
    fakt: 'Ernteameisen sammeln Samen, kauen sie und machen daraus eine Art „Ameisenbrot".',
  },
  buchhandlung: {
    name: 'Buchhandlung', icon: '📚', w: 3, h: 2, zone: 'erde', minTiefe: 1, stufe: 1, kosten: 30, bauzeit: 16,
    personal: 2, beruf: { name: 'Buchhändlerin', acc: 'brille' }, liefert: { bildung: 35 },
    effekte: { joker: 1, fp: 0.5 }, farbe: '#c9b8ff',
    text: 'Ameisen lesen gern! Bringt jeden Ameisentag einen Quiz-Joker und ein paar 🔬 Forschungspunkte.',
    fakt: 'Ameisen „lesen" Duftspuren: Mit Pheromonen schreiben sie sich Wegbeschreibungen auf den Boden.',
  },
  blattlaus: {
    name: 'Blattlaus-Weide', icon: '🌿', w: 4, h: 2, zone: 'oberflaeche', stufe: 1, kosten: 30, bauzeit: 16,
    personal: 3, beruf: { name: 'Hirtin', acc: 'strohhut' }, liefert: {}, effekte: { nahrung: 0.7 }, farbe: '#b8f08a',
    text: 'Ameisen „melken" Blattläuse und bekommen süßen Honigtau.',
    fakt: 'Ameisen beschützen Blattläuse vor Marienkäfern – als Dank gibt es zuckersüßen Honigtau.',
  },
  tankstelle: {
    name: 'Honigtau-Tankstelle', icon: '⛽', w: 3, h: 2, zone: 'oberflaeche', stufe: 1, kosten: 35, bauzeit: 16,
    personal: 2, beruf: { name: 'Tankwartin', acc: 'muetze' }, liefert: { freizeit: 5 },
    effekte: { sammelBonus: 0.25 }, farbe: '#ffe27a',
    text: 'Sammlerinnen tanken hier Energie: +25 % Futtersuche.',
    fakt: 'Ameisen haben zwei Mägen: einen für sich und einen „Sozialmagen" zum Teilen mit anderen.',
  },
  apotheke: {
    name: 'Ameisen-Apotheke', icon: '💊', w: 3, h: 2, zone: 'erde', minTiefe: 2, stufe: 1, kosten: 30, bauzeit: 16,
    personal: 2, beruf: { name: 'Apothekerin', acc: 'haube' }, liefert: { hygiene: 45 }, farbe: '#a8f0e0',
    text: 'Hält das Volk gesund und sauber.',
    fakt: 'Waldameisen bauen Baumharz in ihr Nest ein – das wirkt gegen Bakterien und Pilze.',
  },
  restaurant: {
    name: 'Restaurant', icon: '🍽️', w: 4, h: 2, zone: 'erde', minTiefe: 1, stufe: 2, kosten: 45, bauzeit: 20,
    personal: 3, beruf: { name: 'Köchin', acc: 'kochmuetze' }, liefert: { freizeit: 30 },
    effekte: { zufriedenBonus: 4, verbrauch: -0.1 }, farbe: '#ffb3a1',
    text: 'Gemeinsames Essen macht glücklich – und spart 10 % Nahrung.',
    fakt: 'Ameisen teilen Futter so gut, dass bald jede Ameise im Nest etwas vom gleichen Tropfen hat.',
  },
  kino: {
    name: 'Kino', icon: '🎬', w: 4, h: 3, zone: 'erde', minTiefe: 2, stufe: 2, kosten: 55, bauzeit: 22,
    personal: 2, beruf: { name: 'Filmvorführerin', acc: 'muetze' }, liefert: { freizeit: 55 }, farbe: '#ff9fc4',
    text: 'Großes Kino für kleine Krabbler. Viel Freizeit-Spaß.',
    fakt: 'Viele Ameisen sehen schlecht – sie „sehen" die Welt vor allem mit ihren Fühlern.',
  },
  fussball: {
    name: 'Fußballplatz', icon: '⚽', w: 6, h: 2, zone: 'oberflaeche', stufe: 2, kosten: 50, bauzeit: 20,
    personal: 2, beruf: { name: 'Trainerin', acc: 'stirnband' }, liefert: { freizeit: 45 },
    effekte: { tempo: 0.15 }, farbe: '#9ee37d',
    text: 'Sport macht fit: Alle Ameisen arbeiten 15 % schneller.',
    fakt: 'Eine Ameise kann ein Vielfaches ihres eigenen Gewichts tragen – manche Arten das 50-Fache!',
  },
  moebel: {
    name: 'Möbelgeschäft', icon: '🛋️', w: 3, h: 2, zone: 'erde', minTiefe: 1, stufe: 2, kosten: 45, bauzeit: 18,
    personal: 2, beruf: { name: 'Schreinerin', acc: 'stirnband' }, liefert: { freizeit: 10 },
    effekte: { wohnBonus: 0.3 }, farbe: '#e6c39a',
    text: 'Bessere Betten: Jede Schlafkammer bietet 30 % mehr Platz.',
    fakt: 'Weberameisen „nähen" Blätter zusammen – mit Seidenfäden ihrer eigenen Larven!',
  },
  brunnen: {
    name: 'Tautropfen-Brunnen', icon: '💧', w: 2, h: 2, zone: 'erde', minTiefe: 16, stufe: 2, kosten: 40, bauzeit: 18,
    personal: 1, beruf: { name: 'Brunnenmeisterin', acc: 'muetze' }, liefert: { hygiene: 30 },
    effekte: { pilzBonus: 0.3 }, farbe: '#9fd8ff',
    text: 'Tief unten gibt es Wasser. Pilzgärten wachsen 30 % besser. Braucht Tiefe (mind. 16).',
    fakt: 'Manche Ameisen bilden bei Hochwasser lebende Flöße – sie halten sich aneinander fest.',
  },
  sonne: {
    name: 'Sonnenterrasse', icon: '🌞', w: 3, h: 2, zone: 'huegel', stufe: 2, kosten: 40, bauzeit: 18,
    personal: 1, beruf: { name: 'Wärmerin', acc: 'sonnenbrille' }, liefert: { waerme: 60, freizeit: 10 },
    effekte: { brutTempo: 0.15 }, farbe: '#ffe08a',
    text: 'Im Hügel wird es warm: Die Brut entwickelt sich 15 % schneller.',
    fakt: 'Waldameisen sonnen sich im Frühling und tragen die Wärme mit ihrem Körper ins Nest.',
  },
  universitaet: {
    name: 'Universität', icon: '🎓', w: 5, h: 3, zone: 'erde', minTiefe: 2, stufe: 3, kosten: 110, material: 50, bauzeit: 32,
    personal: 4, beruf: { name: 'Professorin', acc: 'doktorhut' }, liefert: { bildung: 120 },
    effekte: { quizBonus: 0.2, ausbildung: 0.1, fp: 4 }, farbe: '#d4c2ff',
    text: 'Die höchste Schule im Ameisenreich: +20 % Quiz-Sterne, alle Berufe 10 % besser, viele 🔬 Forschungspunkte.',
    fakt: 'Ameisen lernen voneinander: Erfahrene Sammlerinnen führen Neulinge im „Tandemlauf" zum Futter.',
  },
  einkauf: {
    name: 'Einkaufscenter', icon: '🛍️', w: 5, h: 3, zone: 'erde', minTiefe: 2, stufe: 3, kosten: 90, bauzeit: 30,
    personal: 4, beruf: { name: 'Verkäuferin', acc: 'schleife' }, liefert: { freizeit: 70 },
    effekte: { sterneProMin: 3 }, farbe: '#ffc4f0',
    text: 'Riesiger Freizeit-Spaß – und Handel bringt 3 Sterne pro Minute.',
    fakt: 'Ameisen gibt es seit über 100 Millionen Jahren – sie lebten schon zur Zeit der Dinosaurier.',
  },
  hochzeit: {
    name: 'Hochzeitsflug-Startplatz', icon: '🪽', w: 3, h: 2, zone: 'huegel', amRand: true, stufe: 3, kosten: 70, bauzeit: 24,
    personal: 1, beruf: { name: 'Fluglotsin', acc: 'stirnband' }, liefert: { freizeit: 10 }, farbe: '#d6f3ff',
    einzigartig: true,
    text: 'Von hier starten Drohnen und junge Königinnen zum Hochzeitsflug. Muss am Hügelrand liegen.',
    fakt: 'Beim Hochzeitsflug schwärmen geflügelte Ameisen aus vielen Nestern gleichzeitig aus – oft an warmen, windstillen Tagen.',
  },
  // ---------- Neu: öffentliches & privates Leben im Ameisenstaat ----------
  sporthalle: {
    name: 'Sporthalle', icon: '🏟️', w: 4, h: 2, zone: 'erde', minTiefe: 2, stufe: 1, kosten: 40, bauzeit: 18,
    personal: 2, beruf: { name: 'Trainerin', acc: 'stirnband' }, liefert: { freizeit: 35, hygiene: 10 },
    effekte: { tempo: 0.08 }, farbe: '#9fe0ff',
    text: 'Turnen, Klettern, Gewichtheben: Alle Ameisen arbeiten 8 % schneller.',
    fakt: 'Sahara-Silberameisen gehören zu den schnellsten Ameisen: Sie legen fast einen Meter pro Sekunde zurück – rund 100 Körperlängen!',
  },
  eisladen: {
    name: 'Eisladen', icon: '🍦', w: 3, h: 2, zone: 'erde', minTiefe: 1, stufe: 1, kosten: 30, bauzeit: 14,
    personal: 2, beruf: { name: 'Eisverkäuferin', acc: 'muetze' }, liefert: { freizeit: 30 },
    effekte: { zufriedenBonus: 3 }, farbe: '#ffd6f0',
    text: 'Honigtau-Eis in vielen Sorten! Macht glücklich (+3 % Zufriedenheit).',
    fakt: 'Ameisen mögen nicht immer nur Süßes: Brauchen die Larven Eiweiß zum Wachsen, sammeln die Arbeiterinnen lieber Insekten und Samen.',
  },
  schuhladen: {
    name: 'Sechs-Bein-Schuhladen', icon: '👟', w: 3, h: 2, zone: 'erde', minTiefe: 1, stufe: 1, kosten: 35, bauzeit: 15,
    personal: 2, beruf: { name: 'Schuhmacherin', acc: 'brille' }, liefert: { freizeit: 10 },
    effekte: { sammelBonus: 0.15, expTempo: 0.2 }, farbe: '#ffe0a8',
    text: 'Sechs Schuhe pro Ameise! Sammlerinnen +15 %, Erkunderinnen laufen 20 % schneller.',
    fakt: 'An ihren Füßen haben Ameisen winzige Krallen und Haftpolster – damit laufen sie sogar kopfüber an der Decke entlang.',
  },
  friseur: {
    name: 'Fühler-Salon', icon: '💇', w: 3, h: 2, zone: 'erde', minTiefe: 1, stufe: 1, kosten: 25, bauzeit: 12,
    personal: 1, beruf: { name: 'Friseurin', acc: 'schleife' }, liefert: { hygiene: 30, freizeit: 10 }, farbe: '#ffc2d6',
    text: 'Fühler waschen, kämmen, föhnen: Sauberkeit und Wohlfühlen.',
    fakt: 'Ameisen putzen ihre Fühler ständig – mit einem eingebauten „Kamm" an den Vorderbeinen. Saubere Fühler riechen besser!',
  },
  schule: {
    name: 'Ameisenschule', icon: '🏫', w: 4, h: 2, zone: 'erde', minTiefe: 2, stufe: 1, kosten: 40, bauzeit: 18,
    personal: 3, beruf: { name: 'Lehrerin', acc: 'brille' }, liefert: { bildung: 50 },
    effekte: { fp: 1 }, farbe: '#c8f0b8',
    text: 'Junge Ameisen lernen Lesen, Rechnen, Duftkunde. Bringt Bildung und 🔬 Forschungspunkte.',
    fakt: 'Junge Arbeiterinnen arbeiten zuerst im Nest und gehen erst später als Sammlerinnen nach draußen – eine Art Ausbildung!',
  },
  wache: {
    name: 'Wachstube', icon: '🛡️', w: 3, h: 2, zone: 'erde', minTiefe: 2, stufe: 1, kosten: 35, bauzeit: 15,
    personal: 2, beruf: { name: 'Wächterin', acc: 'helm' }, liefert: {},
    effekte: { wacheStaerke: 0.5, zufriedenBonus: 1 }, farbe: '#c9d3e6',
    text: 'Bildet Wächterinnen aus: Störenfriede im Revier werden 50 % schneller vertrieben.',
    fakt: 'Bei manchen Ameisenarten haben Soldatinnen so große, flache Köpfe, dass sie damit den Nesteingang wie eine Tür verschließen.',
  },
  spaeher: {
    name: 'Späherturm', icon: '🔭', w: 2, h: 2, zone: 'huegel', stufe: 1, kosten: 30, bauzeit: 14,
    personal: 1, beruf: { name: 'Späherin', acc: 'stirnband' }, liefert: {},
    effekte: { sicht: 1, expSlots: 1 }, farbe: '#d6ecff',
    text: 'Weitblick! Erkunderinnen sehen weiter und du kannst eine Expedition mehr losschicken.',
    fakt: 'Wüstenameisen finden mit einem „Sonnenkompass" und durch Schrittezählen auf direktem Weg nach Hause zurück.',
  },
  spielplatz: {
    name: 'Spielplatz', icon: '🎠', w: 4, h: 2, zone: 'oberflaeche', stufe: 1, kosten: 30, bauzeit: 14,
    personal: 1, beruf: { name: 'Aufpasserin', acc: 'schleife' }, liefert: { freizeit: 30 },
    effekte: { brutTempo: 0.05 }, farbe: '#ffe9a0',
    text: 'Schaukel, Rutsche, Wippe – für junge Ameisen. Etwas schnellere Brut.',
    fakt: 'Neue Sammlerinnen machen zuerst kurze „Lernspaziergänge" rund ums Nest und prägen sich dabei die Umgebung ein.',
  },
  labor: {
    name: 'Forschungslabor', icon: '🔬', w: 4, h: 3, zone: 'erde', minTiefe: 8, stufe: 2, kosten: 60, material: 30, bauzeit: 26,
    personal: 3, beruf: { name: 'Forscherin', acc: 'brille' }, liefert: { bildung: 20 },
    effekte: { fp: 3, forschTempo: 0.3 }, farbe: '#bfe7ff',
    text: 'Tief unten wird getüftelt: viele 🔬 Forschungspunkte und 30 % schnellere Forschung.',
    fakt: 'Blattschneiderameisen tragen nützliche Bakterien auf ihrem Körper, die ihren Pilzgarten vor Schimmel schützen – wie ein eingebautes Medikament.',
  },
  theater: {
    name: 'Theater', icon: '🎭', w: 4, h: 3, zone: 'erde', minTiefe: 2, stufe: 2, kosten: 50, bauzeit: 22,
    personal: 2, beruf: { name: 'Schauspielerin', acc: 'schleife' }, liefert: { freizeit: 45, bildung: 15 }, farbe: '#ffb8b8',
    text: 'Vorhang auf! Theater bringt Spaß und Bildung zugleich.',
    fakt: 'Ameisen verständigen sich auch mit Geräuschen: Manche Arten zirpen, indem sie Teile ihres Hinterleibs aneinander reiben.',
  },
  musikschule: {
    name: 'Musikschule', icon: '🎻', w: 3, h: 2, zone: 'erde', minTiefe: 2, stufe: 2, kosten: 40, bauzeit: 16,
    personal: 2, beruf: { name: 'Musiklehrerin', acc: 'doktorhut' }, liefert: { bildung: 25, freizeit: 25 }, farbe: '#e2c8ff',
    text: 'Fühler-Geige und Krümel-Trommel: Musik für Bildung und Freizeit.',
    fakt: 'Sogar die Puppen mancher Ameisen können zirpen – so machen sie die Arbeiterinnen auf sich aufmerksam.',
  },
  bank: {
    name: 'Krümelkasse', icon: '🏦', w: 3, h: 2, zone: 'erde', minTiefe: 3, stufe: 2, kosten: 50, bauzeit: 20,
    personal: 2, beruf: { name: 'Kassiererin', acc: 'brille' }, liefert: {},
    effekte: { sterneProMin: 2, lagerBonus: 0.15 }, farbe: '#d8f5c0',
    text: 'Sparen lohnt sich: 2 ⭐ pro Minute und 15 % mehr Lagerplatz.',
    fakt: 'Ameisen teilen Futter ständig von Mund zu Mund. So weiß das ganze Volk schnell, was es gerade gibt – wie ein Konto, auf das alle schauen.',
  },
  schwimmbad: {
    name: 'Tautropfen-Bad', icon: '🏊', w: 5, h: 2, zone: 'erde', minTiefe: 12, stufe: 2, kosten: 55, bauzeit: 22,
    personal: 2, beruf: { name: 'Bademeisterin', acc: 'sonnenbrille' }, liefert: { freizeit: 40, hygiene: 30 }, farbe: '#a8e4ff',
    text: 'Planschen im kühlen Tau. Braucht Tiefe (mind. 12), dort ist es feucht.',
    fakt: 'Für eine Ameise ist ein einzelner Tautropfen so groß wie für dich ein Wasserball – sie trinkt vorsichtig vom Rand.',
  },
  handel: {
    name: 'Handelsposten', icon: '🏪', w: 4, h: 2, zone: 'oberflaeche', stufe: 2, kosten: 45, bauzeit: 18,
    personal: 2, beruf: { name: 'Händlerin', acc: 'kiste' }, liefert: { freizeit: 5 },
    effekte: { handel: 1 }, farbe: '#ffd59e',
    text: 'Tausche Waren mit Nachbarvölkern (im Revier). Bessere Angebote!',
    fakt: 'Manche Ameisenarten leben als friedliche Gäste in den Nestern anderer Arten und bekommen dort sogar Futter.',
  },
  rathaus: {
    name: 'Ameisen-Rathaus', icon: '🏛️', w: 5, h: 3, zone: 'erde', minTiefe: 2, stufe: 2, kosten: 70, material: 40, bauzeit: 28,
    personal: 2, beruf: { name: 'Bürgermeisterin', acc: 'zylinder' }, liefert: { bildung: 10 }, einzigartig: true,
    effekte: { zufriedenBonus: 4, revierBonus: 0.15, expSlots: 1 }, farbe: '#f3e1b0',
    text: 'Gute Planung: +4 % Zufriedenheit, Revier-Trupps +15 % und eine Expedition mehr.',
    fakt: 'Ameisen haben keinen Chef – nicht einmal die Königin gibt Befehle! Jede Ameise reagiert auf Düfte und auf die Ameisen, denen sie begegnet.',
  },
  bahnhof: {
    name: 'Duftspur-Bahnhof', icon: '🚂', w: 4, h: 2, zone: 'oberflaeche', stufe: 2, kosten: 55, material: 30, bauzeit: 22, forschung: 'duftspuren',
    personal: 2, beruf: { name: 'Schaffnerin', acc: 'muetze' }, liefert: { freizeit: 10 },
    effekte: { revierBonus: 0.25 }, farbe: '#ffcf9e',
    text: 'Express-Duftstraßen ins Revier: Alle Sammel-Trupps +25 %. (Braucht Forschung „Duftspuren")',
    fakt: 'Auf Ameisenstraßen gibt es kaum Stau: Wird es eng, laufen Ameisen langsamer, weichen aus oder wählen einen anderen Weg.',
  },
};

// ---------------------------------------------------------------------------------------------
// Entwicklungslinien: Jedes Gebäude wächst in Stufen (z. B. Kindergarten → Schule → … → Universität).
// Stufe 1 wird neu gebaut, höhere Stufen entstehen durch AUSBAU eines bestehenden Gebäudes.
// Jede Stufe ist ein eigener Bauplan, den das Kind im Quiz freischaltet (nur bei einem perfekten Test).
// Ausbaustufen übernehmen Größe, Zone und Tiefe von Stufe 1 – das Gebäude wächst an seinem Platz.
// ---------------------------------------------------------------------------------------------
const AUSBAU = {
  koenigin: [
    { key: 'thronsaal', name: 'Thronsaal', icon: '🏰', stufe: 2, kosten: 90, material: 30, bauzeit: 30, personal: 2,
      liefert: { waerme: 16 }, effekte: { eiTempo: 0.12, zufriedenBonus: 1 }, farbe: '#ffd77a',
      text: 'Ein prächtiger Saal für die Königin: Sie legt 12 % schneller Eier.',
      fakt: 'Die Königin wird von ihren Arbeiterinnen ständig geputzt, gefüttert und umsorgt – wie von einem Hofstaat.' },
    { key: 'kronpalast', name: 'Kronjuwelen-Palast', icon: '💎', stufe: 4, kosten: 160, material: 80, bauzeit: 44, personal: 3,
      liefert: { waerme: 28, freizeit: 10 }, effekte: { eiTempo: 0.25, zufriedenBonus: 3, brutPlatz: 6 }, farbe: '#fff0a8',
      text: 'Der schönste Ort im ganzen Nest: viel mehr Eier, mehr Brutplatz und glückliche Ameisen.',
      fakt: 'In manchen Ameisenvölkern leben mehrere Königinnen friedlich zusammen – bei Superkolonien sogar Tausende!' },
  ],
  wohnen: [
    { key: 'wohnhoehle', name: 'Gemütliche Wohnhöhle', icon: '🛌', stufe: 1, kosten: 30, material: 10, bauzeit: 18,
      effekte: { wohnraum: 26 }, farbe: '#c8e0ff',
      text: 'Weiche Moospolster und runde Nischen: Platz für 26 Ameisen.',
      fakt: 'Ameisen kuscheln sich beim Ausruhen gern eng aneinander – das hält warm und spart Platz.' },
    { key: 'ameisenvilla', name: 'Ameisen-Villa', icon: '🏡', stufe: 3, kosten: 60, material: 30, bauzeit: 26,
      liefert: { freizeit: 6 }, effekte: { wohnraum: 40 }, farbe: '#d8eaff',
      text: 'Wohnen mit Stil: Etagenbetten, Leselampen und Platz für 40 Ameisen.',
      fakt: 'Ein großes Waldameisennest kann über eine Million Bewohnerinnen haben!' },
  ],
  brut: [
    { key: 'wiegenstube', name: 'Wiegenstube', icon: '🍼', stufe: 1, kosten: 30, material: 10, bauzeit: 18, personal: 3,
      effekte: { brutPlatz: 22, brutTempo: 0.05 }, farbe: '#fff4d6',
      text: 'Kleine Wiegen aus Moos: Platz für 22 Eier, Larven und Puppen.',
      fakt: 'Ameisen sortieren ihre Brut: Eier, kleine Larven, große Larven und Puppen liegen jeweils in Gruppen beisammen.' },
    { key: 'brutpalast', name: 'Brut-Palast', icon: '🐣', stufe: 3, kosten: 60, material: 30, bauzeit: 26, personal: 4,
      effekte: { brutPlatz: 34, brutTempo: 0.1 }, farbe: '#fff8e2',
      text: 'Die modernste Kinderstube im Wald: 34 Plätze und die Brut wächst schneller.',
      fakt: 'Ameisenpuppen spinnen sich bei vielen Arten in einen Kokon ein – die „Ameiseneier" aus dem Zoohandel sind eigentlich Puppen!' },
  ],
  vorrat: [
    { key: 'kornspeicher', name: 'Kornspeicher', icon: '🌾', stufe: 1, kosten: 28, material: 10, bauzeit: 18, personal: 1,
      effekte: { lager: 280 }, farbe: '#ffe2b0',
      text: 'Trockene Regale für Samen und Körner: 280 Nahrung Lagerplatz.',
      fakt: 'Ernteameisen lagern Samen in trockenen Kammern, damit sie nicht keimen – oft monatelang.' },
    { key: 'honigtopflager', name: 'Honigtopf-Lager', icon: '🍯', stufe: 3, kosten: 55, material: 30, bauzeit: 24, personal: 2,
      effekte: { lager: 420, verbrauch: -0.03 }, farbe: '#ffd27a',
      text: 'Lebende Honigtöpfe an der Decke: 420 Lagerplatz, nichts verdirbt.',
      fakt: 'Honigtopf-Ameisen können so viel Nektar speichern, dass ihr Hinterleib so groß wie eine Erbse wird.' },
  ],
  muell: [
    { key: 'recyclinghof', name: 'Recyclinghof', icon: '🔄', stufe: 1, kosten: 25, material: 10, bauzeit: 16, personal: 2,
      liefert: { hygiene: 50 }, farbe: '#d2f0b0',
      text: 'Hier wird sortiert: Blattreste, Schalen, Krümel – alles kommt an den richtigen Ort.',
      fakt: 'Abfall-Ameisen bleiben oft unter sich, damit keine Keime ins übrige Nest gelangen.' },
    { key: 'kompostwerk', name: 'Kompostwerk', icon: '🪱', stufe: 3, kosten: 50, material: 25, bauzeit: 22, personal: 2,
      liefert: { hygiene: 80 }, effekte: { pilzBonus: 0.1 }, farbe: '#c9e6a0',
      text: 'Aus Abfall wird beste Erde: sehr sauber – und Pilzgärten wachsen 10 % besser.',
      fakt: 'Blattschneiderameisen düngen ihren Pilzgarten mit zerkauten Blättern – fast wie ein Komposthaufen.' },
  ],
  pilz: [
    { key: 'pilzplantage', name: 'Pilzplantage', icon: '🪴', stufe: 1, kosten: 40, material: 15, bauzeit: 22, personal: 4,
      effekte: { nahrung: 0.9 }, farbe: '#eedcff',
      text: 'Ordentliche Beete und feuchte Luft: viel mehr Pilze.',
      fakt: 'Ein großer Blattschneider-Pilzgarten kann so groß wie ein Fußball werden – tief unter der Erde.' },
    { key: 'pilzfarm', name: 'Pilz-Gewächshaus', icon: '🌱', stufe: 3, kosten: 75, material: 35, bauzeit: 30, personal: 5,
      effekte: { nahrung: 1.35 }, farbe: '#f3e6ff',
      text: 'Leuchtende Pilzlampen und Regentropf-Sprinkler: die größte Pilzernte im Wald.',
      fakt: 'Manche Pilze leuchten im Dunkeln. Forschende nennen das Biolumineszenz.' },
  ],
  kita: [
    { key: 'schule', basis: true },
    { key: 'berufsschule', name: 'Berufsschule', icon: '🛠️', stufe: 2, kosten: 60, material: 20, bauzeit: 24, personal: 3,
      beruf: { name: 'Meisterin', acc: 'stirnband' }, liefert: { bildung: 70 }, effekte: { ausbildung: 0.08, fp: 1.5, bauTempo: 0.1 }, farbe: '#ffe0b8',
      text: 'Ameisen lernen Berufe: Schreinerin, Gärtnerin, Bäckerin … Alle Fachkräfte +8 %, Baustellen +10 %.',
      fakt: 'Bei Ameisen lernen Neulinge von Erfahrenen: Sie schauen zu, laufen hinterher und probieren es dann selbst.' },
    { key: 'gymnasium', name: 'Gymnasium', icon: '📐', stufe: 3, kosten: 80, material: 35, bauzeit: 28, personal: 3,
      beruf: { name: 'Lehrerin', acc: 'brille' }, liefert: { bildung: 90 }, effekte: { fp: 2.5, quizBonus: 0.1 }, farbe: '#d6e4ff',
      text: 'Latein für Fühler, Mathe für Profis: viel Bildung, 🔬 Forschungspunkte und +10 % Quiz-Sterne.',
      fakt: 'Ameisen können zählen – zumindest ihre Schritte! So messen Wüstenameisen, wie weit sie vom Nest entfernt sind.' },
    { key: 'universitaet', basis: true },
  ],
  buchhandlung: [
    { key: 'bibliothek', name: 'Bibliothek', icon: '📖', stufe: 2, kosten: 50, material: 15, bauzeit: 20, personal: 2,
      beruf: { name: 'Bibliothekarin', acc: 'brille' }, liefert: { bildung: 55 }, effekte: { joker: 1, fp: 1 }, farbe: '#d6c8ff',
      text: 'Tausende Blätter voller Wissen: Bildung, ein Joker pro Tag und 🔬 Forschungspunkte.',
      fakt: 'Forschende haben über 15 000 Ameisenarten beschrieben – und jedes Jahr kommen neue dazu.' },
    { key: 'archiv', name: 'Schriftrollen-Archiv', icon: '📜', stufe: 3, kosten: 80, material: 35, bauzeit: 28, personal: 3,
      beruf: { name: 'Archivarin', acc: 'doktorhut' }, liefert: { bildung: 80 }, effekte: { joker: 2, fp: 2 }, farbe: '#efe2c0',
      text: 'Das Gedächtnis des Ameisenreichs: viel Bildung, zwei Joker pro Tag.',
      fakt: 'Die ältesten Ameisen hat man in Bernstein gefunden – sie sind fast 100 Millionen Jahre alt.' },
  ],
  baeckerei: [
    { key: 'konditorei', name: 'Konditorei', icon: '🧁', stufe: 2, kosten: 50, material: 15, bauzeit: 20, personal: 2,
      beruf: { name: 'Konditorin', acc: 'kochmuetze' }, liefert: { freizeit: 20 }, effekte: { nahrung: 0.45, zufriedenBonus: 4 }, farbe: '#ffd0e0',
      text: 'Honigtau-Törtchen und Samenkuchen: mehr Nahrung und richtig gute Laune.',
      fakt: 'Ameisen erkennen am Geschmack, wie viel Zucker im Futter ist – und holen das Süßeste zuerst.' },
    { key: 'grossbaeckerei', name: 'Großbäckerei', icon: '🥨', stufe: 3, kosten: 75, material: 30, bauzeit: 26, personal: 3,
      beruf: { name: 'Bäckermeisterin', acc: 'kochmuetze' }, liefert: { freizeit: 25 }, effekte: { nahrung: 0.7, zufriedenBonus: 5 }, farbe: '#ffc98a',
      text: 'Drei Öfen, ein Fließband und Brezeln für alle: viel Nahrung.',
      fakt: 'Ernteameisen knacken harte Samen mit ihren kräftigen Kiefern, die wie Nussknacker funktionieren.' },
  ],
  restaurant: [
    { key: 'festsaal', name: 'Festsaal', icon: '🎊', stufe: 3, kosten: 70, material: 25, bauzeit: 24, personal: 3,
      liefert: { freizeit: 45 }, effekte: { zufriedenBonus: 5, verbrauch: -0.12 }, farbe: '#ffc2b0',
      text: 'Lange Tafeln und Girlanden: Festessen für das ganze Volk.',
      fakt: 'Beim Teilen von Futter tauschen Ameisen auch Duftstoffe aus – so riecht das ganze Volk gleich.' },
    { key: 'sternerestaurant', name: 'Sterne-Restaurant', icon: '🌟', stufe: 4, kosten: 110, material: 45, bauzeit: 30, personal: 4,
      liefert: { freizeit: 65 }, effekte: { zufriedenBonus: 6, verbrauch: -0.15 }, farbe: '#ffd8a8',
      text: 'Feinste Krümel-Küche mit Kerzenlicht: glückliche Ameisen, 15 % weniger Verbrauch.',
      fakt: 'Ameisen brauchen Zucker als Energie und Eiweiß zum Wachsen – eine ausgewogene Ernährung, wie bei uns.' },
  ],
  blattlaus: [
    { key: 'blattlaushof', name: 'Blattlaus-Hof', icon: '🍃', stufe: 2, kosten: 50, material: 20, bauzeit: 20, personal: 4,
      effekte: { nahrung: 1.1 }, farbe: '#c8f5a0',
      text: 'Mit Stall und Kräutergarten: Die Blattläuse geben viel mehr Honigtau.',
      fakt: 'Manche Ameisen tragen Blattlaus-Eier im Winter ins Nest und bringen sie im Frühling wieder nach draußen.' },
    { key: 'molkerei', name: 'Honigtau-Molkerei', icon: '🥛', stufe: 3, kosten: 80, material: 35, bauzeit: 26, personal: 5,
      effekte: { nahrung: 1.6 }, farbe: '#e8ffd0',
      text: 'Die größte Honigtau-Farm der Wiese: Nahrung in Hülle und Fülle.',
      fakt: 'Eine einzige Blattlaus kann pro Stunde mehrere Tropfen Honigtau abgeben – ein Festmahl für Ameisen.' },
  ],
  tankstelle: [
    { key: 'raststaette', name: 'Honigtau-Raststätte', icon: '☕', stufe: 2, kosten: 50, material: 20, bauzeit: 20, personal: 2,
      liefert: { freizeit: 12 }, effekte: { sammelBonus: 0.35 }, farbe: '#ffe7a0',
      text: 'Pause mit Nektar-Kaffee: Sammlerinnen +35 %.',
      fakt: 'Sammlerinnen tragen Nektar im Kropf nach Hause – einem dehnbaren Magen nur zum Transportieren.' },
    { key: 'nektarkraftwerk', name: 'Nektar-Kraftwerk', icon: '⚡', stufe: 3, kosten: 80, material: 40, bauzeit: 28, personal: 3,
      liefert: { freizeit: 12 }, effekte: { sammelBonus: 0.5, tempo: 0.05 }, farbe: '#fff2a0',
      text: 'Zuckerenergie für alle: Sammlerinnen +50 %, alle 5 % schneller.',
      fakt: 'Fliegende Insekten brauchen sehr viel Zucker als Treibstoff – geflügelte Ameisen tanken vor dem Hochzeitsflug richtig auf.' },
  ],
  apotheke: [
    { key: 'arztpraxis', name: 'Arztpraxis', icon: '🩺', stufe: 2, kosten: 50, material: 15, bauzeit: 20, personal: 2,
      beruf: { name: 'Ärztin', acc: 'haube' }, liefert: { hygiene: 65 }, effekte: { zufriedenBonus: 1 }, farbe: '#bff5e8',
      text: 'Fühler-Check und Beinchen-Pflaster: Das Volk bleibt gesund.',
      fakt: 'Matabele-Ameisen versorgen verletzte Nestgenossinnen und lecken deren Wunden sauber – das hilft beim Heilen.' },
    { key: 'krankenhaus', name: 'Ameisen-Krankenhaus', icon: '🏥', stufe: 3, kosten: 85, material: 35, bauzeit: 28, personal: 3,
      beruf: { name: 'Ärztin', acc: 'haube' }, liefert: { hygiene: 100 }, effekte: { zufriedenBonus: 3, brutTempo: 0.05 }, farbe: '#d6fff4',
      text: 'Mit Ruheraum und Kräuterlabor: sehr sauber, gesund und glücklich.',
      fakt: 'Manche Ameisen stellen mit Drüsen eigene Abwehrstoffe gegen Pilze und Bakterien her – eine eingebaute Apotheke.' },
  ],
  kino: [
    { key: 'grosskino', name: 'Großkino', icon: '🍿', stufe: 3, kosten: 75, material: 25, bauzeit: 24, personal: 3,
      liefert: { freizeit: 80 }, farbe: '#ffb0d0',
      text: 'Riesige Leinwand und Popcorn-Krümel: viel Freizeit-Spaß.',
      fakt: 'Ameisen haben Facettenaugen aus vielen kleinen Einzelaugen – bei manchen Arten sind es nur ganz wenige.' },
    { key: 'filmpalast', name: 'Filmpalast', icon: '📽️', stufe: 4, kosten: 110, material: 45, bauzeit: 30, personal: 3,
      liefert: { freizeit: 110 }, effekte: { zufriedenBonus: 2 }, farbe: '#ffc8e0',
      text: 'Roter Teppich und Premieren: Das ganze Volk geht ins Kino.',
      fakt: 'Springameisen aus Australien sehen sehr gut und jagen mit großen Augen und weiten Sprüngen.' },
  ],
  fussball: [
    { key: 'sportplatz', name: 'Sportplatz', icon: '🥅', stufe: 3, kosten: 70, material: 25, bauzeit: 24, personal: 3,
      liefert: { freizeit: 60 }, effekte: { tempo: 0.2 }, farbe: '#b0eb90',
      text: 'Mit Laufbahn und Tribüne: Alle Ameisen arbeiten 20 % schneller.',
      fakt: 'Ameisen haben sechs Beine: Beim Laufen stehen immer drei auf dem Boden – wie ein sicherer Dreifuß.' },
    { key: 'stadion', name: 'Ameisen-Stadion', icon: '🏆', stufe: 4, kosten: 110, material: 45, bauzeit: 32, personal: 4,
      liefert: { freizeit: 85 }, effekte: { tempo: 0.25, zufriedenBonus: 2 }, farbe: '#c8f5a8',
      text: 'Flutlicht und Fankurve: +25 % Tempo und jede Menge Jubel.',
      fakt: 'Manche Ameisen können ein Mehrfaches ihres Gewichts mit den Kiefern hochheben – echte Gewichtheberinnen.' },
  ],
  moebel: [
    { key: 'schreinerei', name: 'Schreinerei', icon: '🪚', stufe: 3, kosten: 65, material: 25, bauzeit: 22, personal: 2,
      liefert: { freizeit: 12 }, effekte: { wohnBonus: 0.4 }, farbe: '#ecc9a0',
      text: 'Hobelbank und Sägespäne: Schlafkammern bieten 40 % mehr Platz.',
      fakt: 'Rossameisen nagen ihre Gänge in Holz – sie sind die Schreinerinnen unter den Ameisen.' },
    { key: 'moebelhaus', name: 'Möbelhaus', icon: '🪑', stufe: 4, kosten: 95, material: 40, bauzeit: 28, personal: 3,
      liefert: { freizeit: 18 }, effekte: { wohnBonus: 0.55 }, farbe: '#f2d5b0',
      text: 'Riesige Ausstellung: Schlafkammern bieten 55 % mehr Platz.',
      fakt: 'Weberameisen kleben Blätter mit Seide zusammen und bauen so Nester hoch oben in Bäumen.' },
  ],
  brunnen: [
    { key: 'quellgrotte', name: 'Quellgrotte', icon: '⛲', stufe: 3, kosten: 60, material: 25, bauzeit: 22, personal: 1,
      liefert: { hygiene: 45 }, effekte: { pilzBonus: 0.45 }, farbe: '#b0e2ff',
      text: 'Eine sprudelnde Quelle: Pilzgärten wachsen 45 % besser.',
      fakt: 'Ameisen trinken Wasser, indem sie es mit ihren Mundwerkzeugen auflecken – Tautropfen sind ihre Trinkflaschen.' },
    { key: 'wasserwerk', name: 'Wasserwerk', icon: '🚰', stufe: 4, kosten: 90, material: 40, bauzeit: 28, personal: 2,
      liefert: { hygiene: 70 }, effekte: { pilzBonus: 0.6, weideBonus: 0.1 }, farbe: '#c8ecff',
      text: 'Rohre bis in jeden Winkel: Pilze +60 %, Blattlaus-Weiden +10 %.',
      fakt: 'Feuerameisen bauen bei Überschwemmungen aus ihren Körpern wasserdichte Flöße – und retten so das ganze Volk.' },
  ],
  sonne: [
    { key: 'waermestube', name: 'Wärmestube', icon: '♨️', stufe: 3, kosten: 60, material: 25, bauzeit: 22, personal: 2,
      liefert: { waerme: 90, freizeit: 15 }, effekte: { brutTempo: 0.2 }, farbe: '#ffe9a0',
      text: 'Gespeicherte Sonnenwärme: Die Brut wächst 20 % schneller.',
      fakt: 'Im Frühling liegen Waldameisen in der Sonne, heizen sich auf und geben die Wärme im Nest wieder ab.' },
    { key: 'sonnentempel', name: 'Sonnentempel', icon: '🌅', stufe: 4, kosten: 95, material: 40, bauzeit: 28, personal: 2,
      liefert: { waerme: 130, freizeit: 20 }, effekte: { brutTempo: 0.25 }, farbe: '#fff0b0',
      text: 'Goldene Kuppel voller Licht: Wärme für ein riesiges Volk.',
      fakt: 'Ein Ameisenhügel ist oft nach Süden geneigt – so fängt er möglichst viel Sonnenwärme ein.' },
  ],
  einkauf: [
    { key: 'kaufhaus', name: 'Kaufhaus', icon: '🏬', stufe: 4, kosten: 120, material: 45, bauzeit: 32, personal: 5,
      liefert: { freizeit: 90 }, effekte: { sterneProMin: 4.5 }, farbe: '#ffd0f4',
      text: 'Rolltreppen für sechs Beine: Freizeit und 4,5 ⭐ pro Minute.',
      fakt: 'Ameisen „bezahlen" nicht – sie teilen. Trotzdem verhandeln manche Arten mit Pflanzen: Nektar gegen Schutz.' },
    { key: 'einkaufswelt', name: 'Einkaufswelt', icon: '🎡', stufe: 4, kosten: 160, material: 70, bauzeit: 38, personal: 6,
      liefert: { freizeit: 120 }, effekte: { sterneProMin: 6 }, farbe: '#ffe0f8',
      text: 'Ein Riesenrad im Nest! Riesiger Spaß und 6 ⭐ pro Minute.',
      fakt: 'Akazien-Ameisen wohnen in hohlen Dornen einer Pflanze und bekommen dort Futter – als Lohn verteidigen sie den Baum.' },
  ],
  hochzeit: [
    { key: 'flugfeld', name: 'Flugfeld', icon: '🛫', stufe: 3, kosten: 90, material: 35, bauzeit: 26, personal: 2,
      liefert: { freizeit: 12 }, effekte: { flugBonus: 1 }, farbe: '#dff6ff',
      text: 'Mit Windsack und Startbahn: Beim Hochzeitsflug sind die Ringe größer und du brauchst 2 Drohnen weniger.',
      fakt: 'Geflügelte Ameisen starten oft gemeinsam an warmen Sommertagen nach einem Regen – die Luft ist dann ruhig und feucht.' },
    { key: 'flughafen', name: 'Hochzeitsflughafen', icon: '✈️', stufe: 4, kosten: 130, material: 55, bauzeit: 32, personal: 3,
      liefert: { freizeit: 15 }, effekte: { flugBonus: 2 }, farbe: '#e8f8ff',
      text: 'Tower und Leuchtfeuer: noch größere Ringe, mehr Flugkraft, 4 Drohnen weniger nötig.',
      fakt: 'Nach dem Hochzeitsflug wirft die junge Königin ihre Flügel ab und gräbt sich eine erste kleine Kammer.' },
  ],
  sporthalle: [
    { key: 'fitnessstudio', name: 'Fitnessstudio', icon: '🏋️', stufe: 2, kosten: 60, material: 20, bauzeit: 22, personal: 2,
      liefert: { freizeit: 50, hygiene: 15 }, effekte: { tempo: 0.11 }, farbe: '#b0e8ff',
      text: 'Krabbel-Laufband und Mini-Hanteln: Alle arbeiten 11 % schneller.',
      fakt: 'Ameisen haben für ihre Größe enorm starke Muskeln – vor allem im Hals, der beim Tragen viel aushalten muss.' },
    { key: 'olympiahalle', name: 'Olympia-Halle', icon: '🥇', stufe: 3, kosten: 90, material: 35, bauzeit: 28, personal: 3,
      liefert: { freizeit: 70, hygiene: 20 }, effekte: { tempo: 0.15 }, farbe: '#c4f0ff',
      text: 'Ameisen-Olympiade mit Siegertreppchen: +15 % Tempo für alle.',
      fakt: 'Die Fallkieferameise schnappt mit ihren Kiefern so schnell zu, dass sie sich damit sogar in die Luft katapultieren kann.' },
  ],
  eisladen: [
    { key: 'eiscafe', name: 'Eiscafé', icon: '🍨', stufe: 2, kosten: 45, material: 15, bauzeit: 18, personal: 2,
      liefert: { freizeit: 45 }, effekte: { zufriedenBonus: 4 }, farbe: '#ffe0f4',
      text: 'Mit Sonnenschirmen und Eisbechern: noch mehr gute Laune.',
      fakt: 'An heißen Tagen bleiben viele Ameisen lieber im kühlen Nest und sammeln morgens und abends.' },
    { key: 'eispalast', name: 'Eispalast', icon: '🍧', stufe: 3, kosten: 70, material: 25, bauzeit: 24, personal: 3,
      liefert: { freizeit: 60 }, effekte: { zufriedenBonus: 5 }, farbe: '#e8f4ff',
      text: 'Ein glitzernder Palast aus Eis-Kristallen: das Lieblingsziel aller Ameisen.',
      fakt: 'Im Winter halten Ameisen Winterruhe tief im Nest. Sie bewegen sich kaum und brauchen dann fast kein Futter.' },
  ],
  schuhladen: [
    { key: 'schuhwerkstatt', name: 'Schuhwerkstatt', icon: '🥾', stufe: 2, kosten: 50, material: 20, bauzeit: 20, personal: 2,
      liefert: { freizeit: 10 }, effekte: { sammelBonus: 0.22, expTempo: 0.3 }, farbe: '#ffe6b8',
      text: 'Wanderstiefel nach Maß: Sammlerinnen +22 %, Erkunderinnen 30 % schneller.',
      fakt: 'Ameisenbeine haben sechs Glieder und am Ende zwei kleine Krallen – perfekte Kletterschuhe.' },
    { key: 'turnschuhfabrik', name: 'Turnschuh-Fabrik', icon: '🏭', stufe: 3, kosten: 80, material: 35, bauzeit: 26, personal: 3,
      liefert: { freizeit: 10 }, effekte: { sammelBonus: 0.3, expTempo: 0.45, tempo: 0.03 }, farbe: '#fff0c8',
      text: 'Sechs Turnschuhe pro Ameise, am Fließband: alle sind flotter unterwegs.',
      fakt: 'Ameisen putzen sich die Beine mit einer kleinen Bürste am Vorderbein – ganz ohne Schuhputzmittel.' },
  ],
  friseur: [
    { key: 'fuehlerspa', name: 'Fühler-Spa', icon: '🧖', stufe: 2, kosten: 45, material: 15, bauzeit: 18, personal: 2,
      liefert: { hygiene: 50, freizeit: 18 }, farbe: '#ffd2e2',
      text: 'Tautropfen-Dampfbad und Fühler-Massage: sauber und entspannt.',
      fakt: 'Ameisen putzen sich gegenseitig – das nennt man soziale Fellpflege, nur eben ohne Fell.' },
    { key: 'wellnessoase', name: 'Wellness-Oase', icon: '🛁', stufe: 3, kosten: 70, material: 25, bauzeit: 24, personal: 3,
      liefert: { hygiene: 75, freizeit: 28 }, effekte: { zufriedenBonus: 2 }, farbe: '#ffe4ee',
      text: 'Blütenbad und Moos-Liegen: Das Volk ist blitzsauber und glücklich.',
      fakt: 'Manche Ameisen „baden" in Ameisensäure: Sie reiben sich damit ein, um Keime abzuwehren.' },
  ],
  wache: [
    { key: 'waechterakademie', name: 'Wächter-Akademie', icon: '🎖️', stufe: 2, kosten: 55, material: 25, bauzeit: 22, personal: 3,
      liefert: {}, effekte: { wacheStaerke: 0.9, zufriedenBonus: 1.5 }, farbe: '#d2dcf0',
      text: 'Hier lernen Wächterinnen, Störenfriede freundlich zu vertreiben: 90 % schneller.',
      fakt: 'Wächterinnen am Nesteingang prüfen mit den Fühlern den Duft jeder Ameise, die hereinkommen möchte.' },
    { key: 'schutzburg', name: 'Schutzburg', icon: '🏯', stufe: 3, kosten: 85, material: 40, bauzeit: 28, personal: 3,
      liefert: {}, effekte: { wacheStaerke: 1.4, zufriedenBonus: 2, revierBonus: 0.05 }, farbe: '#dde4f4',
      text: 'Mit Türmen und Signalfeuer: Das Revier ist sicher, alle Trupps +5 %.',
      fakt: 'Ameisen warnen sich mit Alarmduft: Innerhalb von Sekunden weiß das halbe Nest Bescheid.' },
  ],
  spaeher: [
    { key: 'aussichtsturm', name: 'Aussichtsturm', icon: '🗼', stufe: 2, kosten: 50, material: 20, bauzeit: 20, personal: 1,
      effekte: { sicht: 1.6, expSlots: 1 }, farbe: '#dcefff',
      text: 'Hoch über dem Hügel: Erkunderinnen sehen noch weiter.',
      fakt: 'Ameisen merken sich den Himmel über dem Nest: Baumkronen-Muster helfen manchen Arten beim Heimweg.' },
    { key: 'sternwarte', name: 'Sternwarte', icon: '🌠', stufe: 3, kosten: 80, material: 35, bauzeit: 26, personal: 2,
      beruf: { name: 'Sternguckerin', acc: 'brille' }, effekte: { sicht: 2.2, expSlots: 2, fp: 1 }, farbe: '#e4e8ff',
      text: 'Mit Fernrohr bis zum Mond: zwei Expeditionen mehr, weite Sicht und 🔬 Forschungspunkte.',
      fakt: 'Manche Ameisen finden auch nachts nach Hause – sie orientieren sich dann am Mondlicht und an Landmarken.' },
  ],
  spielplatz: [
    { key: 'abenteuerspielplatz', name: 'Abenteuer-Spielplatz', icon: '🧗', stufe: 2, kosten: 50, material: 20, bauzeit: 20, personal: 2,
      liefert: { freizeit: 45 }, effekte: { brutTempo: 0.08 }, farbe: '#fff0a8',
      text: 'Kletterwand und Seilbahn: Freizeit und etwas schnellere Brut.',
      fakt: 'Junge Arbeiterinnen sind in den ersten Tagen noch hell gefärbt – erst langsam werden sie dunkel.' },
    { key: 'freizeitpark', name: 'Freizeitpark', icon: '🎢', stufe: 3, kosten: 85, material: 35, bauzeit: 28, personal: 3,
      liefert: { freizeit: 70 }, effekte: { brutTempo: 0.1, zufriedenBonus: 2 }, farbe: '#fff6c0',
      text: 'Achterbahn über die Wiese! Riesiger Spaß für Groß und Klein.',
      fakt: 'Ameisen können sich mit Fäden aus ihren Larven abseilen? Nein – aber Weberameisen bauen lebende Brücken aus ihren Körpern!' },
  ],
  labor: [
    { key: 'forschungszentrum', name: 'Forschungszentrum', icon: '🧪', stufe: 3, kosten: 90, material: 40, bauzeit: 30, personal: 4,
      beruf: { name: 'Forscherin', acc: 'brille' }, liefert: { bildung: 30 }, effekte: { fp: 5, forschTempo: 0.45 }, farbe: '#c8ecff',
      text: 'Mikroskope und Reagenzgläser: viele 🔬 Punkte und 45 % schnellere Forschung.',
      fakt: 'Mit winzigen Sendern und Farbtupfern beobachten Forschende, welche Ameise welche Arbeit macht.' },
    { key: 'zukunftslabor', name: 'Zukunftslabor', icon: '🤖', stufe: 4, kosten: 130, material: 60, bauzeit: 36, personal: 5,
      beruf: { name: 'Erfinderin', acc: 'brille' }, liefert: { bildung: 40 }, effekte: { fp: 7, forschTempo: 0.6 }, farbe: '#d8f2ff',
      text: 'Roboter-Ameisen helfen beim Tüfteln: Forschung im Turbotempo.',
      fakt: 'Ingenieure bauen Roboter nach dem Vorbild von Ameisen – viele kleine Roboter, die zusammenarbeiten.' },
  ],
  theater: [
    { key: 'schauspielhaus', name: 'Schauspielhaus', icon: '🎪', stufe: 3, kosten: 70, material: 25, bauzeit: 24, personal: 3,
      liefert: { freizeit: 65, bildung: 22 }, farbe: '#ffc4c4',
      text: 'Große Bühne mit Drehscheibe: Spaß und Bildung für viele.',
      fakt: 'Ameisen können „Theater spielen": Manche Käfer und Spinnen tarnen sich als Ameisen, um nicht gefressen zu werden.' },
    { key: 'opernhaus', name: 'Opernhaus', icon: '🎟️', stufe: 4, kosten: 110, material: 45, bauzeit: 32, personal: 4,
      liefert: { freizeit: 90, bildung: 30 }, effekte: { zufriedenBonus: 2 }, farbe: '#ffd4d4',
      text: 'Logen, Kronleuchter, großer Chor: Kultur für das ganze Ameisenreich.',
      fakt: 'Ameisen „singen" durch Zirpen: Sie reiben eine geriffelte Stelle am Hinterleib wie ein Waschbrett.' },
  ],
  musikschule: [
    { key: 'konzertsaal', name: 'Konzertsaal', icon: '🎹', stufe: 3, kosten: 65, material: 25, bauzeit: 24, personal: 3,
      liefert: { bildung: 35, freizeit: 40 }, farbe: '#ead4ff',
      text: 'Ein Flügel für sechs Beine: Musik für Bildung und Freizeit.',
      fakt: 'Ameisen nehmen Schwingungen mit den Beinen wahr – sie „hören" also eher mit den Füßen.' },
    { key: 'philharmonie', name: 'Philharmonie', icon: '🎼', stufe: 4, kosten: 100, material: 40, bauzeit: 30, personal: 4,
      liefert: { bildung: 45, freizeit: 60 }, effekte: { zufriedenBonus: 2 }, farbe: '#f0e0ff',
      text: 'Das große Ameisen-Orchester: Bildung und Freude für alle.',
      fakt: 'Forschende haben das Zirpen von Ameisen aufgenommen: Königinnen klingen anders als Arbeiterinnen.' },
  ],
  bank: [
    { key: 'kruemelbank', name: 'Krümelbank', icon: '💰', stufe: 3, kosten: 80, material: 30, bauzeit: 24, personal: 3,
      effekte: { sterneProMin: 3.5, lagerBonus: 0.22 }, farbe: '#e0f8cc',
      text: 'Schließfächer für Sternchen: 3,5 ⭐ pro Minute und 22 % mehr Lagerplatz.',
      fakt: 'Ameisenvölker legen Vorräte an – so überstehen sie Zeiten, in denen draußen wenig Futter wächst.' },
    { key: 'schatzkammer', name: 'Schatzkammer', icon: '🪙', stufe: 4, kosten: 120, material: 50, bauzeit: 30, personal: 3,
      effekte: { sterneProMin: 5, lagerBonus: 0.3 }, farbe: '#fff4c0',
      text: 'Glitzernde Truhen tief im Nest: 5 ⭐ pro Minute.',
      fakt: 'Manche Ameisen sammeln glänzende Dinge wie Harzperlen – nicht als Schatz, sondern als Schutz für ihr Nest.' },
  ],
  schwimmbad: [
    { key: 'erlebnisbad', name: 'Erlebnisbad', icon: '🤿', stufe: 3, kosten: 80, material: 30, bauzeit: 26, personal: 3,
      liefert: { freizeit: 60, hygiene: 45 }, farbe: '#b8ecff',
      text: 'Mit Rutsche und Wellenbecken: Freizeit und Sauberkeit.',
      fakt: 'Manche Ameisen können über Wasseroberflächen laufen, ohne einzusinken – die Oberflächenspannung trägt sie.' },
    { key: 'spassbad', name: 'Spaßbad', icon: '🌊', stufe: 4, kosten: 115, material: 45, bauzeit: 32, personal: 4,
      liefert: { freizeit: 85, hygiene: 60 }, effekte: { zufriedenBonus: 2 }, farbe: '#c8f2ff',
      text: 'Wasserfall, Strudel und Tropfen-Kanone: das beliebteste Bad im Wald.',
      fakt: 'Es gibt Ameisen, die tauchen können: In Borneo holen Taucherameisen ihr Futter aus Kannenpflanzen.' },
  ],
  handel: [
    { key: 'marktplatz', name: 'Marktplatz', icon: '⚖️', stufe: 3, kosten: 70, material: 25, bauzeit: 24, personal: 3,
      liefert: { freizeit: 10 }, effekte: { handel: 1 }, farbe: '#ffe0b0',
      text: 'Viele Stände, gute Preise: Bessere Tauschangebote im Revier.',
      fakt: 'Manche Ameisen „verhandeln" mit Raupen: Die Raupe gibt süßen Saft, dafür wird sie von den Ameisen beschützt.' },
    { key: 'handelskontor', name: 'Handelskontor', icon: '📦', stufe: 4, kosten: 110, material: 45, bauzeit: 30, personal: 4,
      liefert: { freizeit: 12 }, effekte: { handel: 1, sterneProMin: 1.5 }, farbe: '#ffe8c4',
      text: 'Lager voller Waren aus aller Welt: beste Angebote und 1,5 ⭐ pro Minute.',
      fakt: 'Manche Ameisen nehmen andere Tiere als Mitbewohner auf – zum Beispiel kleine Käfer, die im Nest putzen.' },
  ],
  rathaus: [
    { key: 'buergerhaus', name: 'Bürgerhaus', icon: '🏤', stufe: 3, kosten: 100, material: 50, bauzeit: 32, personal: 3,
      liefert: { bildung: 15 }, effekte: { zufriedenBonus: 5, revierBonus: 0.2, expSlots: 1 }, farbe: '#f6e6bc',
      text: 'Hier entscheiden alle mit: +5 % Zufriedenheit, Revier-Trupps +20 %.',
      fakt: 'Wenn Ameisen ein neues Nest suchen, „stimmen" sie ab: Je mehr Ameisen einen Ort gut finden, desto mehr folgen.' },
    { key: 'parlament', name: 'Ameisen-Parlament', icon: '🗳️', stufe: 4, kosten: 150, material: 70, bauzeit: 38, personal: 4,
      liefert: { bildung: 20 }, effekte: { zufriedenBonus: 7, revierBonus: 0.25, expSlots: 1, sterneProMin: 1 }, farbe: '#fff0c8',
      text: 'Die Stimme jeder Ameise zählt: +7 % Zufriedenheit und starke Trupps.',
      fakt: 'Bei der Nestwahl schicken Ameisen Kundschafterinnen los. Ist ein Ort gut, holen sie andere im „Tandemlauf" nach.' },
  ],
  bahnhof: [
    { key: 'hauptbahnhof', name: 'Hauptbahnhof', icon: '🚉', stufe: 3, kosten: 80, material: 35, bauzeit: 26, personal: 3,
      liefert: { freizeit: 15 }, effekte: { revierBonus: 0.35 }, farbe: '#ffd8aa',
      text: 'Drei Gleise und eine große Uhr: Alle Sammel-Trupps +35 %.',
      fakt: 'Auf Ameisenstraßen gibt es Überholspuren: Schnelle Ameisen laufen in der Mitte, langsame am Rand.' },
    { key: 'expressbahnhof', name: 'Express-Bahnhof', icon: '🚄', stufe: 4, kosten: 120, material: 55, bauzeit: 32, personal: 3,
      liefert: { freizeit: 20 }, effekte: { revierBonus: 0.45, expTempo: 0.2 }, farbe: '#ffe2c0',
      text: 'Der Duft-Express flitzt durchs Revier: Trupps +45 %, Erkunderinnen flinker.',
      fakt: 'Ameisenstraßen können über 100 Meter lang sein – für eine Ameise eine riesige Entfernung.' },
  ],
};

// Revier-Lager (werden nicht im Nest, sondern auf der Revier-Karte aufgestellt)
const LAGER_TYPEN = {
  zelt: { name: 'Expeditions-Zelt', icon: '⛺', w: 1, h: 1, zone: 'revier', stufe: 1, kosten: 25, material: 15, bauzeit: 12,
    personal: 0, liefert: {}, effekte: {}, farbe: '#ffb86b', sicht: 3, reichweite: 1,
    text: 'Ein Zelt draußen im Revier: Expeditionen starten von hier – der Weg ist viel kürzer.',
    fakt: 'Manche Ameisenvölker haben mehrere Nester, die durch Straßen verbunden sind – Forschende nennen das polydom.' },
  basislager: { name: 'Basislager', icon: '🏕️', w: 1, h: 1, zone: 'revier', stufe: 2, kosten: 50, material: 30, bauzeit: 18,
    personal: 0, liefert: {}, effekte: {}, farbe: '#ffc98a', sicht: 4.5, reichweite: 1,
    text: 'Mit Lagerfeuer und Vorratskiste: weite Sicht, Sammel-Trupps in der Nähe sind schneller.',
    fakt: 'Waldameisen bauen manchmal kleine Außennester entlang ihrer Straßen – wie Raststationen.' },
  aussenposten: { name: 'Außenposten', icon: '🚩', w: 1, h: 1, zone: 'revier', stufe: 3, kosten: 85, material: 50, bauzeit: 24,
    personal: 0, liefert: {}, effekte: { expSlots: 1 }, farbe: '#ffd6a8', sicht: 6, reichweite: 1,
    text: 'Ein Turm mit Fahne: sehr weite Sicht und eine Expedition mehr.',
    fakt: 'Superkolonien der Argentinischen Ameise reichen über Hunderte Kilometer – mit Millionen verbundener Nester.' },
};

// Welches Fach schaltet welche Linie frei? (Die Linie wächst mit dem Fach.)
export const LINIEN_FACH = {
  deutsch: ['wohnen', 'kita', 'buchhandlung', 'rathaus', 'wache', 'theater'],
  mathe: ['brut', 'vorrat', 'tankstelle', 'einkauf', 'labor', 'bank', 'bahnhof'],
  sachunterricht: ['koenigin', 'muell', 'pilz', 'blattlaus', 'brunnen', 'sonne', 'spaeher', 'zelt', 'hochzeit'],
  englisch: ['baeckerei', 'restaurant', 'eisladen', 'schuhladen', 'handel', 'schwimmbad'],
  musik_kunst: ['kino', 'moebel', 'friseur', 'musikschule'],
  sport_werte: ['apotheke', 'fussball', 'sporthalle', 'spielplatz'],
};

/** LINIEN[basis] = { key, name, icon, stufen: [typ1, typ2, …], fach } */
export const LINIEN = {};
(function baueLinien() {
  // Bildungs-Linie: alle Stufen teilen sich die Grundfläche des Kindergartens
  GEBAEUDE.kita.w = 4; GEBAEUDE.kita.h = 2;
  for (const [basis, stufen] of Object.entries(AUSBAU)) {
    const B = GEBAEUDE[basis];
    const keys = [basis];
    for (const s of stufen) {
      if (s.basis) { keys.push(s.key); continue; }
      const { key, ...def } = s;
      keys.push(key);
      GEBAEUDE[key] = {
        w: B.w, h: B.h, zone: B.zone, minTiefe: B.minTiefe, amRand: B.amRand, einzigartig: B.einzigartig, abreissbar: B.abreissbar,
        beruf: B.beruf, personal: B.personal ?? 0, liefert: {}, ...def,
      };
    }
    LINIEN[basis] = { key: basis, stufen: keys };
  }
  // Zelt-Linie (Revier)
  Object.assign(GEBAEUDE, LAGER_TYPEN);
  LINIEN.zelt = { key: 'zelt', stufen: ['zelt', 'basislager', 'aussenposten'] };
  // Alle übrigen Gebäude bilden (falls noch nicht erfasst) eine eigene Linie – sollte nicht vorkommen
  for (const [k, g] of Object.entries(GEBAEUDE)) {
    if (Object.values(LINIEN).some(l => l.stufen.includes(k))) continue;
    LINIEN[k] = { key: k, stufen: [k] };
  }
  for (const [fach, ls] of Object.entries(LINIEN_FACH)) for (const l of ls) if (LINIEN[l]) LINIEN[l].fach = fach;
  for (const L of Object.values(LINIEN)) {
    L.fach ??= 'sachunterricht';
    const G1 = GEBAEUDE[L.stufen[0]];
    L.name = G1.name; L.icon = G1.icon;
    L.stufen.forEach((k, i) => {
      const G = GEBAEUDE[k];
      G.linie = L.key; G.lstufe = i + 1; G.lmax = L.stufen.length;
      // Bildungslinie: gleiche Fläche für alle Stufen (alte Spielstände behalten ihre Maße am Raum)
      if (L.key === 'kita') { G.w = 4; G.h = 2; G.minTiefe = 2; G.zone = 'erde'; }
      G.naechste = L.stufen[i + 1] ?? null;
      G.vorige = L.stufen[i - 1] ?? null;
    });
  }
})();

/** Startbaupläne (sind von Anfang an freigeschaltet). */
export const START_PLAENE = ['koenigin', 'brut', 'wohnen', 'vorrat'];

// Accessoires und Farben für die Statistik
export const ROHSTOFFE = {
  sterne: { name: 'Sterne', icon: '⭐' },
  gang: { name: 'Gangstücke', icon: '🧱' },
  nahrung: { name: 'Nahrung', icon: '🍯' },
  material: { name: 'Baumaterial', icon: '🪵' },
  fp: { name: 'Forschungspunkte', icon: '🔬' },
};

/*
 Futterquellen im Revier (Draufsicht). Felder:
  gibt     Rohstoff, den Sammlerinnen holen
  rate     Ertrag je Sammlerin und Sekunde (vor Entfernung & Boni)
  menge    Startvorrat; regen = Nachwachsen pro Sekunde (0 = verbraucht sich)
  stoerer  Welche Störenfriede hier auftauchen können
*/
export const QUELLEN = {
  beeren: { name: 'Beerenstrauch', icon: '🍓', gibt: 'nahrung', rate: 0.07, menge: 500, regen: 0.6, stoerer: ['wespe'], text: 'Süße Beeren – wachsen langsam nach.' },
  samen: { name: 'Sonnenblumen', icon: '🌻', gibt: 'nahrung', rate: 0.055, menge: 700, regen: 0.4, stoerer: ['vogel'], text: 'Ölreiche Samen – nahrhaft und lange haltbar.' },
  blattlaus: { name: 'Blattlaus-Kolonie', icon: '🌿', gibt: 'nahrung', rate: 0.08, menge: 400, regen: 1.2, stoerer: ['marienkaefer'], text: 'Blattläuse geben süßen Honigtau. Marienkäfer lieben sie auch!' },
  zucker: { name: 'Picknick-Krümel', icon: '🍰', gibt: 'nahrung', rate: 0.16, menge: 600, regen: 0, stoerer: ['wespe'], text: 'Ein Festmahl! Aber wenn es aufgegessen ist, ist es weg.' },
  zweige: { name: 'Zweig-Haufen', icon: '🪵', gibt: 'material', rate: 0.035, menge: 400, regen: 0.25, stoerer: ['spinne'], text: 'Nadeln und Zweige – Baumaterial für Hügel, Forschung und große Gebäude.' },
  harz: { name: 'Harz-Baum', icon: '🌲', gibt: 'material', rate: 0.05, menge: 500, regen: 0.3, stoerer: ['spinne'], text: 'Klebriges Harz: wertvolles Baumaterial, das sogar Keime abhält.' },
  tau: { name: 'Tautropfen-Wiese', icon: '💧', gibt: 'tau', rate: 1, menge: 9999, regen: 9, stoerer: [], text: 'Frisches Wasser macht das Volk sauber: jede Sammlerin hier versorgt 3 Ameisen mit Sauberkeit.' },
  kristall: { name: 'Glitzer-Kiesel', icon: '💎', gibt: 'sterne', rate: 0.012, menge: 300, regen: 0.05, stoerer: ['ameisenloewe'], text: 'Funkelnde Steinchen – bringen Sterne.' },
  // Blüten: Pollen & Nektar – Pollen ist eiweißreich und lässt die Brut schneller wachsen
  blumen: { name: 'Blumenwiese', icon: '🌸', gibt: 'nahrung', pollen: true, rate: 0.06, menge: 600, regen: 0.8, stoerer: ['wespe'], text: 'Bunte Blüten voller Pollen und Nektar. Pollen ist eiweißreich – davon wächst die Brut schneller!' },
  loewenzahn: { name: 'Löwenzahn-Feld', icon: '🌼', gibt: 'nahrung', pollen: true, rate: 0.05, menge: 500, regen: 0.7, stoerer: ['vogel'], text: 'Goldgelbe Löwenzahnblüten: Pollen satt. Die Brut freut sich!' },
  klee: { name: 'Kleeblüten', icon: '☘️', gibt: 'nahrung', pollen: true, rate: 0.045, menge: 450, regen: 0.9, stoerer: ['wespe'], text: 'Süße Kleeblüten – Nektar zum Trinken, Pollen für die Larven.' },
  pilzring: { name: 'Pilzkreis', icon: '🍄', gibt: 'nahrung', rate: 0.07, menge: 380, regen: 0.35, stoerer: ['ameisenloewe'], text: 'Ein Kreis aus Wiesenpilzen – nahrhaft, wächst aber langsam nach.' },
  eichel: { name: 'Alte Eiche', icon: '🌳', gibt: 'material', rate: 0.045, menge: 650, regen: 0.35, stoerer: ['vogel'], text: 'Rinde, Zweige und Eichelhütchen: prima Baumaterial.' },
  fund: { name: 'Fundstück', icon: '✨', gibt: null, rate: 0, menge: 1, regen: 0, stoerer: [], text: 'Hier liegt etwas Besonderes! Schicke eine Expedition hin.' },
  nachbar: { name: 'Nachbarvolk „Rotkäppchen"', icon: '🏰', gibt: null, rate: 0, menge: 0, regen: 0, stoerer: [], text: 'Ein freundliches Nachbarvolk. Mit Forschung „Diplomatie" oder einem Handelsposten könnt ihr tauschen.' },
  schatz: { name: 'Geheimnisvoller Fund', icon: '🎁', gibt: null, rate: 0, menge: 1, regen: 0, stoerer: [], text: 'Hier liegt etwas! Schicke eine Expedition hin.' },
};

/** Fundstücke im Nebel – Expeditionen bringen sie heim, sie landen in der Fund-Sammlung. */
export const FUNDE = {
  murmel: { name: 'Bunte Glasmurmel', icon: '🔮', lohn: { sterne: 25 }, text: 'Eine riesige Glaskugel! Für eine Ameise ist sie so groß wie für dich ein Haus.' },
  kronkorken: { name: 'Kronkorken', icon: '🥏', lohn: { material: 18 }, text: 'Ein glänzender Flaschendeckel – perfekt als Badewanne für das Tautropfen-Bad.' },
  schneckenhaus: { name: 'Leeres Schneckenhaus', icon: '🐚', lohn: { fp: 10, material: 8 }, text: 'Die Schnecke ist längst ausgezogen. Manche kleinen Ameisenarten wohnen tatsächlich in leeren Schneckenhäusern!' },
  feder: { name: 'Vogelfeder', icon: '🪶', lohn: { sterne: 12, material: 10 }, text: 'Weich und federleicht. Damit polstern die Ameisen die Kinderstube aus.' },
  eichel: { name: 'Dicke Eichel', icon: '🌰', lohn: { nahrung: 70 }, text: 'Eine Eichel – Futter für viele Tage!' },
  baustein: { name: 'Bunter Spielstein', icon: '🧩', lohn: { material: 25 }, text: 'Ein Spielstein der Menschen. Ein ganzes Ameisenzimmer passt hinein!' },
  muenze: { name: 'Glänzende Münze', icon: '🪙', lohn: { sterne: 40 }, text: 'Ein verlorenes Centstück. Es glitzert wunderschön in der Sonne.' },
  kompass: { name: 'Mini-Kompass', icon: '🧭', lohn: { fp: 16 }, text: 'Ein Kompass aus einem Überraschungsei! Ameisen brauchen keinen – sie haben einen Sonnenkompass im Kopf.' },
  insektenhotel: { name: 'Insektenhotel', icon: '🏨', lohn: { fp: 12, sterne: 12 }, text: 'Ein Hotel für Wildbienen. Die Ameisen sagen freundlich Hallo zu den Nachbarn.' },
  ring: { name: 'Funkelnder Ring', icon: '💍', lohn: { sterne: 50 }, text: 'Ein Ring im Gras! Jemand vermisst ihn bestimmt – die Ameisen bewahren ihn gut auf.' },
  keks: { name: 'Riesiger Kekskrümel', icon: '🍪', lohn: { nahrung: 100 }, text: 'Ein Kekskrümel vom Picknick – ein Festmahl für das ganze Volk!' },
  bernstein: { name: 'Bernstein', icon: '🟠', lohn: { fp: 20, sterne: 20 }, text: 'Ein Bernstein! In manchen Bernsteinen stecken Ameisen, die vor Millionen Jahren lebten.' },
  lupe: { name: 'Lupe', icon: '🔍', lohn: { fp: 15 }, text: 'Eine Lupe – damit sehen Forscherinnen jedes Härchen am Ameisenbein.' },
  knopf: { name: 'Bunter Knopf', icon: '🔘', lohn: { material: 14, sterne: 8 }, text: 'Ein Knopf mit vier Löchern – ein prima Tisch für die Bäckerei.' },
  wollfaden: { name: 'Wollfaden', icon: '🧶', lohn: { material: 16 }, text: 'Ein langer Wollfaden. Daraus wird eine Hängebrücke über den Bach.' },
  spielzeugauto: { name: 'Spielzeugauto', icon: '🚗', lohn: { sterne: 30, material: 10 }, text: 'Ein kleines Auto! Die Ameisen sitzen darin und tun so, als ob sie fahren.' },
};

export const STOERER = {
  marienkaefer: { name: 'Marienkäfer', icon: '🐞', staerke: 3, text: 'nascht an den Blattläusen' },
  spinne: { name: 'Spinne', icon: '🕷️', staerke: 4, text: 'hat ein Netz über den Weg gespannt' },
  wespe: { name: 'Wespe', icon: '🐝', staerke: 4, text: 'brummt um das Futter herum' },
  vogel: { name: 'Spatz', icon: '🐦', staerke: 5, text: 'pickt nach den Samen' },
  ameisenloewe: { name: 'Ameisenlöwe', icon: '🦗', staerke: 4, text: 'lauert in einem Sandtrichter' },
};

// Welche Fächer welche Baupläne liefern (abgeleitet aus den Entwicklungslinien)
export const FACH_BAUPLAENE = Object.fromEntries(Object.entries(LINIEN_FACH).map(([f, ls]) => [f, ls.flatMap(l => LINIEN[l]?.stufen ?? [])]));

export const FAECHER = {
  deutsch: { name: 'Deutsch', ort: 'Wörterwald', icon: '📖', farbe: '#ff8a5c', farbe2: '#ffb36b' },
  mathe: { name: 'Mathematik', ort: 'Zahlenmine', icon: '🔢', farbe: '#4fa3ff', farbe2: '#7cc4ff' },
  sachunterricht: { name: 'Sachunterricht', ort: 'Forscherwiese', icon: '🔬', farbe: '#43c46b', farbe2: '#8be07a' },
  englisch: { name: 'Englisch', ort: 'Englisch-Insel', icon: '🇬🇧', farbe: '#ef5a7a', farbe2: '#ff8fa8' },
  musik_kunst: { name: 'Musik & Kunst', ort: 'Kreativ-Werkstatt', icon: '🎨', farbe: '#b16cff', farbe2: '#d09cff' },
  sport_werte: { name: 'Sport & Miteinander', ort: 'Arena der Freundschaft', icon: '🤝', farbe: '#ffb020', farbe2: '#ffd36b' },
};

// Simulation (Werte pro Sekunde Spielzeit)
export const SIM = {
  verbrauch: { arbeiterin: 0.012, drohne: 0.02, koenigin: 0.03, larve: 0.006 },
  sammeln: 0.055,        // Nahrung je Sammlerin
  eiIntervall: 10,       // Sekunden zwischen Eiern (Basis)
  brutDauer: { ei: 24, larve: 34, puppe: 28 },
  grundLager: 120,
  grundWohnraum: 14,
  grundBrut: 6,
  grundVersorgung: 12,   // jede Kolonie hat ein bisschen von allem
  tagDauer: 240,         // Sekunden pro Ameisentag
  fpGrund: 0.5,         // Forschungspunkte pro Minute ohne Gebäude (die Königin denkt nach)
  fpProRichtig: 2,       // Forschungspunkte je richtiger Quizantwort
};

// Revier-Karte (Draufsicht)
export const REVIER = { W: 64, H: 44, TILE: 48, startSicht: 4.5, expTempo: 1.05, expSicht: 2.4, maxLager: 6 };

export const QUIZ = {
  fragenProRunde: 6,
  sterne: { 1: 5, 2: 8, 3: 12 },
  gangProRichtig: 2,
};
