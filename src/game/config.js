// Zentrale Spielkonstanten & Gebäudedefinitionen für „Ameisenreich".

export const TILE = 32;            // Weltpixel pro Zelle
export const COLS = 60;            // Breite der Welt in Zellen
export const GROUND = 16;          // erste Erd-Zeile (darüber: Himmel/Hügel)
export const DEPTH = 34;           // Erd-Zeilen unter der Oberfläche
export const ROWS = GROUND + DEPTH;
export const HILL_X = 30;          // Mittelpunkt des Ameisenhügels
export const WATER_ROWS = 2;       // Grundwasser ganz unten

export const SAVE_KEY = 'ameisenreich.save.v1';

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
  return { sterne: 50 + level * 45, gang: 6 + level * 4, pop: [0, 0, 18, 40, 75, 120, 180][level] ?? 999 };
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
  kosten   Sterne
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
    effekte: { joker: 1 }, farbe: '#c9b8ff',
    text: 'Ameisen lesen gern! Bringt jeden Ameisentag einen Quiz-Joker.',
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
    name: 'Universität', icon: '🎓', w: 5, h: 3, zone: 'erde', minTiefe: 2, stufe: 2, kosten: 80, bauzeit: 28,
    personal: 4, beruf: { name: 'Professorin', acc: 'doktorhut' }, liefert: { bildung: 90 },
    effekte: { quizBonus: 0.2, ausbildung: 0.1 }, farbe: '#d4c2ff',
    text: '+20 % Sterne im Quiz und alle Berufe arbeiten 10 % besser.',
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
};

// Welche Fächer bevorzugt welche Baupläne liefern
export const FACH_BAUPLAENE = {
  deutsch: ['buchhandlung', 'kita', 'wohnen', 'universitaet'],
  mathe: ['vorrat', 'einkauf', 'tankstelle', 'brut'],
  sachunterricht: ['pilz', 'blattlaus', 'apotheke', 'brunnen', 'sonne', 'muell'],
  englisch: ['restaurant', 'kino', 'baeckerei', 'wohnen'],
  musik_kunst: ['kino', 'moebel', 'baeckerei', 'kita'],
  sport_werte: ['fussball', 'hochzeit', 'apotheke', 'muell'],
};

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
};

export const QUIZ = {
  fragenProRunde: 6,
  sterne: { 1: 5, 2: 8, 3: 12 },
  gangProRichtig: 2,
};
