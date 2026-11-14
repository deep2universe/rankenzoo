// Die Welt: die große Übersichtskarte rund um das Revier.
// Hier liegen mögliche Orte für neue Ameisenstaaten. Ein Hochzeitsflug (Minispiel) gründet
// an einem gewählten Ort eine Tochterkolonie, die dem Mutter-Volk kleine Vorteile schenkt.
import { GEBAEUDE } from './config.js';

/** Weltkarte in Welt-Einheiten (Pixel bei Zoom 1). Das Heimatnest liegt in der Mitte. */
export const WELT = { W: 2400, H: 1600, HEIM: { x: 1200, y: 820 }, REVIER_R: 170 };

/*
 Orte für neue Kolonien. entfernung: 1 nah · 2 mittel · 3 weit · 4 sehr weit (bestimmt Länge & Schwierigkeit des Flugs).
 bonus: Effekte, die eine dort gegründete Tochterkolonie dem Heimatvolk schenkt (werden in derive() addiert).
 biom: wie der Ort auf der Karte gemalt wird.
*/
export const ORTE = [
  { id: 'lichtung', name: 'Sonnige Lichtung', icon: '☀️', biom: 'lichtung', x: 1520, y: 640, entfernung: 1,
    bonus: { waermeMult: 0.1 }, bonusText: '+10 % Wärme',
    text: 'Eine warme, helle Lichtung mitten im Gras. Perfekt für eine junge Königin!' },
  { id: 'blumenwiese', name: 'Bunte Blumenwiese', icon: '🌸', biom: 'blumen', x: 860, y: 560, entfernung: 1,
    bonus: { quelleNahrung: 0.1 }, bonusText: '+10 % Nahrung aus Revier-Quellen',
    text: 'Tausende Blüten voller Pollen und Nektar – hier wird niemand hungrig.' },
  { id: 'bachufer', name: 'Am Bachufer', icon: '💧', biom: 'bach', x: 760, y: 1110, entfernung: 2,
    bonus: { hygieneMult: 0.1 }, bonusText: '+10 % Sauberkeit',
    text: 'Feuchter Sand und frisches Wasser am plätschernden Bach.' },
  { id: 'waldrand', name: 'Am Waldrand', icon: '🌲', biom: 'wald', x: 1680, y: 1080, entfernung: 2,
    bonus: { revierBonus: 0.08 }, bonusText: '+8 % für alle Revier-Trupps',
    text: 'Unter hohen Tannen gibt es Nadeln und Harz im Überfluss.' },
  { id: 'baumstumpf', name: 'Alter Baumstumpf', icon: '🪵', biom: 'stumpf', x: 1840, y: 470, entfernung: 3,
    bonus: { bauTempo: 0.1 }, bonusText: '+10 % schnellere Baustellen',
    text: 'Weiches, altes Holz voller Gänge – ein Paradies für Baumeisterinnen.' },
  { id: 'gemuesegarten', name: 'Im Gemüsegarten', icon: '🥕', biom: 'garten', x: 520, y: 380, entfernung: 3,
    bonus: { sterneProMin: 1 }, bonusText: '+1 ⭐ pro Minute',
    text: 'Zwischen Karotten und Kürbissen liegen viele Leckereien.' },
  { id: 'sandhuegel', name: 'Der Sandhügel', icon: '🏜️', biom: 'sand', x: 1980, y: 1300, entfernung: 3,
    bonus: { expTempo: 0.15 }, bonusText: 'Erkunderinnen 15 % schneller',
    text: 'Warmer Sand, weite Sicht – hier lernen Ameisen, schnell zu laufen.' },
  { id: 'spielplatz', name: 'Am Spielplatz der Menschen', icon: '🛝', biom: 'spielplatz', x: 360, y: 1260, entfernung: 4,
    bonus: { zufriedenBonus: 2 }, bonusText: '+2 % Zufriedenheit',
    text: 'Unter der Rutsche ist es schattig – und manchmal fällt ein Kekskrümel herunter!' },
  { id: 'blumentopf', name: 'Blumentopf am Fenster', icon: '🪴', biom: 'topf', x: 2180, y: 260, entfernung: 4,
    bonus: { fp: 1.5 }, bonusText: '+1,5 🔬 pro Minute',
    text: 'Ganz weit weg, hoch oben am Fensterbrett. Von dort sieht man die ganze Welt.' },
];
export const ortById = id => ORTE.find(o => o.id === id) ?? null;

export const KOLONIE_NAMEN = ['Neu-', 'Klein-', 'Ober-', 'Unter-', 'Sonnen-', 'Krümel-', 'Wiesen-', 'Honig-', 'Tau-'];

export function createWelt() {
  return { kolonien: [], fluege: 0, versuche: 0, gewaehlt: null };
}

/** Kolonie an einem Ort (oder null). */
export function kolonieAn(state, ortId) {
  return state.welt?.kolonien.find(k => k.ort === ortId) ?? null;
}

/** Wie groß ist eine Tochterkolonie inzwischen? (1–5, wächst mit den Ameisentagen) */
export function kolonieGroesse(state, k) {
  const tag = Math.floor((state.zeit ?? 0) / 240) + 1;
  return Math.min(5, 1 + Math.floor(Math.max(0, tag - k.tag) / 2));
}

/** Summe der Boni aller Tochterkolonien. */
export function weltEffekte(state) {
  const out = {};
  for (const k of state.welt?.kolonien ?? []) {
    const o = ortById(k.ort);
    if (!o) continue;
    for (const [key, v] of Object.entries(o.bonus)) out[key] = (out[key] ?? 0) + v;
  }
  return out;
}

/** Stufe des Hochzeitsflug-Startplatzes (0 = keiner, 1–3). */
export function startplatzStufe(state) {
  let best = 0;
  for (const r of state.rooms) {
    const G = GEBAEUDE[r.typ];
    if (G?.linie === 'hochzeit' && r.bau >= 1 && r.verbunden !== false) best = Math.max(best, G.lstufe);
  }
  return best;
}

/** Wie viele Drohnen braucht der nächste Flug? (Flugfeld & Flughafen sparen Drohnen) */
export function drohnenNoetig(state) {
  return Math.max(4, 10 - 2 * Math.max(0, startplatzStufe(state) - 1));
}

/**
 * Parameter für das Flug-Minispiel. Je weiter der Ort, desto mehr Ringe und desto kleiner sind sie.
 * Ein besserer Startplatz macht die Ringe größer und schenkt Flugkraft.
 */
export function flugParameter(state, ort) {
  const e = ort.entfernung;
  const sp = startplatzStufe(state);
  return {
    ringe: 10 + e * 5,                                  // 15 … 30 Ringe
    ringRadius: Math.max(0.55, 1.05 - e * 0.1) + (sp - 1) * 0.08, // relative Größe (1 = groß)
    tempo: 1 + e * 0.08,                                // Fluggeschwindigkeit (relativ)
    energie: 1 + (sp - 1) * 0.25,                       // Start-Flugkraft (relativ)
    wind: e >= 3,                                       // ab „weit" gibt es Windböen
    name: ort.name,
  };
}

/** Name für eine neue Tochterkolonie. */
export function neuerKolonieName(state, ort) {
  const basis = state.spieler?.koloniename ?? 'Krümelhausen';
  const n = state.welt?.kolonien.length ?? 0;
  const vor = KOLONIE_NAMEN[n % KOLONIE_NAMEN.length];
  return `${vor}${basis.replace(/^(Neu|Klein|Ober|Unter|Sonnen|Krümel|Wiesen|Honig|Tau)-/, '')}`;
}

/** Tochterkolonie gründen (nach erfolgreichem Flug). */
export function gruendeKolonie(state, ortId) {
  const ort = ortById(ortId);
  if (!ort || kolonieAn(state, ortId)) return null;
  state.welt ??= createWelt();
  const k = { ort: ortId, name: neuerKolonieName(state, ort), tag: Math.floor((state.zeit ?? 0) / 240) + 1 };
  state.welt.kolonien.push(k);
  return k;
}
