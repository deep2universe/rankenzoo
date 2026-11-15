// Die Welt: die große Übersichtskarte rund um das Revier.
// Hier liegen mögliche Orte für neue Ameisenstaaten. Ein Hochzeitsflug (Minispiel) gründet
// an einem gewählten Ort eine Tochterkolonie, die dem Mutter-Volk kleine Vorteile schenkt.
import { GEBAEUDE } from './config.js';
export { BIOME, biom } from './biome.js';

/** Weltkarte in Welt-Einheiten (Pixel bei Zoom 1). Das Heimatnest liegt in der Mitte. */
export const WELT = { W: 3600, H: 2400, HEIM: { x: 1800, y: 1230 }, REVIER_R: 200 };

/*
 Orte für neue Kolonien (19 Ausflugsziele + das Heimatnest = 20 Ameisenstaaten).
 entfernung: 1 nah · 2 mittel · 3 weit · 4 sehr weit (bestimmt Länge & Schwierigkeit des Flugs).
 bonus: Effekte, die eine dort gegründete Kolonie ALLEN Kolonien schenkt (werden in derive() addiert).
 biom: Gegend (siehe biome.js) – bestimmt Boden, Hügel, Pflanzen und Hintergrund im Nest.
*/
export const ORTE = [
  { id: 'lichtung', name: 'Sonnige Lichtung', icon: '☀️', biom: 'lichtung', x: 2280, y: 960, entfernung: 1,
    bonus: { waermeMult: 0.1 }, bonusText: '+10 % Wärme',
    text: 'Eine warme, helle Lichtung mitten im Gras. Perfekt für eine junge Königin!' },
  { id: 'blumenwiese', name: 'Bunte Blumenwiese', icon: '🌸', biom: 'blumen', x: 1290, y: 840, entfernung: 1,
    bonus: { quelleNahrung: 0.1 }, bonusText: '+10 % Nahrung aus Revier-Quellen',
    text: 'Tausende Blüten voller Pollen und Nektar – hier wird niemand hungrig.' },
  { id: 'steingarten', name: 'Im Steingarten', icon: '🪨', biom: 'steingarten', x: 1420, y: 1560, entfernung: 1,
    bonus: { waermeMult: 0.06, wohnBonus: 0.05 }, bonusText: '+6 % Wärme, +5 % Wohnraum',
    text: 'Unter warmen, flachen Steinen bauen viele Ameisen am liebsten ihr Nest.' },
  { id: 'bachufer', name: 'Am Bachufer', icon: '💧', biom: 'bach', x: 1140, y: 1665, entfernung: 2,
    bonus: { hygieneMult: 0.1 }, bonusText: '+10 % Sauberkeit',
    text: 'Feuchter Sand und frisches Wasser am plätschernden Bach.' },
  { id: 'waldrand', name: 'Am Waldrand', icon: '🌲', biom: 'wald', x: 2520, y: 1620, entfernung: 2,
    bonus: { revierBonus: 0.08 }, bonusText: '+8 % für alle Revier-Trupps',
    text: 'Unter hohen Tannen gibt es Nadeln und Harz im Überfluss.' },
  { id: 'baumstumpf', name: 'Alter Baumstumpf', icon: '🪵', biom: 'stumpf', x: 2760, y: 705, entfernung: 3,
    bonus: { bauTempo: 0.1 }, bonusText: '+10 % schnellere Baustellen',
    text: 'Weiches, altes Holz voller Gänge – ein Paradies für Baumeisterinnen.' },
  { id: 'gemuesegarten', name: 'Im Gemüsegarten', icon: '🥕', biom: 'garten', x: 780, y: 570, entfernung: 3,
    bonus: { sterneProMin: 1 }, bonusText: '+1 ⭐ pro Minute',
    text: 'Zwischen Karotten und Kürbissen liegen viele Leckereien.' },
  { id: 'sandhuegel', name: 'Der Sandhügel', icon: '🏜️', biom: 'sand', x: 2970, y: 1950, entfernung: 3,
    bonus: { expTempo: 0.15 }, bonusText: 'Erkunderinnen 15 % schneller',
    text: 'Warmer Sand, weite Sicht – hier lernen Ameisen, schnell zu laufen.' },
  { id: 'obstwiese', name: 'Auf der Obstwiese', icon: '🍎', biom: 'obstwiese', x: 1500, y: 300, entfernung: 3,
    bonus: { verbrauch: -0.05 }, bonusText: '−5 % Futterverbrauch',
    text: 'Unter Apfel- und Kirschbäumen gibt es süßes Fallobst für alle.' },
  { id: 'kompost', name: 'Am Komposthaufen', icon: '♻️', biom: 'kompost', x: 2350, y: 400, entfernung: 3,
    bonus: { pilzBonus: 0.08, weideBonus: 0.08 }, bonusText: 'Pilzgärten & Weiden +8 %',
    text: 'Warm, dunkel und nahrhaft: Aus Resten wird hier neue Erde.' },
  { id: 'teich', name: 'Am Seerosenteich', icon: '🪷', biom: 'teich', x: 1800, y: 2150, entfernung: 3,
    bonus: { hygieneMult: 0.06, freizeitMult: 0.06 }, bonusText: '+6 % Sauberkeit & Freizeit',
    text: 'Seerosen, Libellen und quakende Frösche – ein Ort zum Träumen.' },
  { id: 'baumhaus', name: 'Unter dem Baumhaus', icon: '🛖', biom: 'baumhaus', x: 900, y: 2200, entfernung: 3,
    bonus: { freizeitMult: 0.1 }, bonusText: '+10 % Freizeit',
    text: 'Über euch spielen Kinder im Baumhaus – unten bauen die Ameisen.' },
  { id: 'spielplatz', name: 'Am Spielplatz der Menschen', icon: '🛝', biom: 'spielplatz', x: 540, y: 1890, entfernung: 4,
    bonus: { zufriedenBonus: 2 }, bonusText: '+2 % Zufriedenheit',
    text: 'Unter der Rutsche ist es schattig – und manchmal fällt ein Kekskrümel herunter!' },
  { id: 'blumentopf', name: 'Blumentopf am Fenster', icon: '🪴', biom: 'topf', x: 3270, y: 390, entfernung: 4,
    bonus: { fp: 1.5 }, bonusText: '+1,5 🔬 pro Minute',
    text: 'Ganz weit weg, hoch oben am Fensterbrett. Von dort sieht man die ganze Welt.' },
  { id: 'kornfeld', name: 'Am Kornfeld', icon: '🌾', biom: 'kornfeld', x: 360, y: 1050, entfernung: 4,
    bonus: { lagerBonus: 0.1 }, bonusText: '+10 % Lagerplatz',
    text: 'Goldene Ähren voller Körner – Ernteameisen lieben es hier.' },
  { id: 'pilzwald', name: 'Im Pilzwald', icon: '🍄', biom: 'pilzwald', x: 3350, y: 1350, entfernung: 4,
    bonus: { pilzBonus: 0.15 }, bonusText: 'Pilzgärten +15 %',
    text: 'Ein geheimnisvoller Wald voller Pilze – manche leuchten sogar!' },
  { id: 'gewaechshaus', name: 'Im Gewächshaus', icon: '🌱', biom: 'gewaechshaus', x: 300, y: 300, entfernung: 4,
    bonus: { brutTempo: 0.08 }, bonusText: 'Brut 8 % schneller',
    text: 'Warm und feucht wie im Regenwald – hier wächst alles ganz schnell.' },
  { id: 'heide', name: 'In der Heide', icon: '💜', biom: 'heide', x: 300, y: 2250, entfernung: 4,
    bonus: { fpMult: 0.08 }, bonusText: '+8 % Forschungspunkte',
    text: 'Lila Heidekraut, so weit das Auge reicht.' },
  { id: 'felsen', name: 'An der Felswand', icon: '⛰️', biom: 'felsen', x: 3350, y: 2200, entfernung: 4,
    bonus: { sicht: 0.5, wacheStaerke: 0.3 }, bonusText: 'Weitere Sicht, stärkere Wächterinnen',
    text: 'Hoch und felsig – nur die mutigsten Ameisen bauen hier.' },
];
/** Das Heimatnest als „Ort" (Kolonie-ID 'heim'). */
export const HEIM_ORT = { id: 'heim', name: 'Heimatnest', icon: '🏡', biom: 'heim', x: WELT.HEIM.x, y: WELT.HEIM.y, entfernung: 0, bonus: {}, bonusText: '', text: 'Hier hat alles angefangen.' };
export const ALLE_ORTE = [HEIM_ORT, ...ORTE];
export const ORT_ANZAHL = ALLE_ORTE.length; // 20 Ameisenstaaten

export const ortById = id => ALLE_ORTE.find(o => o.id === id) ?? null;

export const KOLONIE_NAMEN = ['Neu-', 'Klein-', 'Ober-', 'Unter-', 'Sonnen-', 'Krümel-', 'Wiesen-', 'Honig-', 'Tau-'];

export function createWelt() {
  return { kolonien: [], strassen: [], boten: [], besuche: [], nextRoute: 1, bewusstsein: 0, fluege: 0, versuche: 0, gewaehlt: null, besuchTimer: 20, handelTimer: 10 };
}

/** Kolonie an einem Ort (oder null). */
export function kolonieAn(state, ortId) {
  return state.welt?.kolonien.find(k => k.ort === ortId) ?? null;
}

/** Wie groß ist eine Tochterkolonie inzwischen? (1–5, nach Bevölkerung) */
export function kolonieGroesse(state, k) {
  const pop = state.kolonienDaten?.[k.ort]?.info?.pop ?? (state.aktiveKolonie === k.ort ? state.volk.arbeiterinnen + state.volk.drohnen + 1 : 8);
  return Math.max(1, Math.min(5, 1 + Math.floor(pop / 25)));
}

/** Summe der Boni aller Tochterkolonien (gilt für alle Kolonien der Zivilisation). */
export function weltEffekte(state) {
  const out = {};
  for (const k of state.welt?.kolonien ?? []) {
    const o = ortById(k.ort);
    if (!o) continue;
    for (const [key, v] of Object.entries(o.bonus)) out[key] = (out[key] ?? 0) + v;
  }
  return out;
}

/** Höchste Stufe eines Hochzeitsflug-Startplatzes in irgendeiner Kolonie (0 = keiner, 1–3). */
export function startplatzStufe(state) {
  let best = 0;
  const pruefe = rooms => { for (const r of rooms ?? []) { const G = GEBAEUDE[r.typ]; if (G?.linie === 'hochzeit' && r.bau >= 1 && r.verbunden !== false) best = Math.max(best, G.lstufe); } };
  pruefe(state.rooms);
  for (const k of Object.values(state.kolonienDaten ?? {})) pruefe(k.rooms);
  return best;
}

/** Wie viele Drohnen braucht der nächste Flug? Wenige – der Hochzeitsflug soll leicht erreichbar sein. */
export function drohnenNoetig(state) {
  const n = state.welt?.kolonien.length ?? 0;
  const sp = Math.max(1, startplatzStufe(state));
  return Math.max(2, Math.min(8, 3 + Math.floor(n / 4) - (sp - 1)));
}

/**
 * Parameter für den Ringflug. Je weiter der Ort, desto mehr Ringe – die Ringe bleiben aber groß,
 * damit Kinder gut hindurchfliegen. Wind gibt es ab „weit". Ein besserer Startplatz hilft zusätzlich.
 */
export function flugParameter(state, ort) {
  const e = Math.max(1, ort.entfernung);
  const sp = Math.max(1, startplatzStufe(state));
  return {
    ringe: 10 + e * 4,                                   // 14 … 26 Ringe
    ringRadius: 1.2 - e * 0.02 + (sp - 1) * 0.1,         // groß, auch bei weiten Zielen (1,12 … 1,38)
    tempo: 1 + e * 0.05,
    energie: 1.15 + (sp - 1) * 0.25,
    wind: e >= 3,                                        // Windböen bleiben – sie machen es spannend
    name: ort.name,
  };
}

/** Parameter für „Wespenalarm": länger und mit mehr Wespen bei weiten Zielen – und sehr vielen Power-ups. */
export function wespenParameter(state, ort) {
  const e = Math.max(1, ort.entfernung);
  const sp = Math.max(1, startplatzStufe(state));
  return {
    dauer: 40 + e * 12,          // Sekunden bis zum Ziel
    wespen: 0.7 + e * 0.25,      // relative Wespen-Dichte
    powerups: 1.3,               // relative Power-up-Häufigkeit (> 1 = viele)
    mut: 1 + (sp - 1) * 0.25,    // Start-„Mut" (Lebensenergie, relativ)
    wind: e >= 3,
    name: ort.name,
  };
}

/** Name für eine neue Tochterkolonie. */
export function neuerKolonieName(state, ort) {
  const basis = (state.spieler?.koloniename ?? 'Krümelhausen').replace(/^(Neu|Klein|Ober|Unter|Sonnen|Krümel|Wiesen|Honig|Tau)-/, '');
  const n = state.welt?.kolonien.length ?? 0;
  return `${KOLONIE_NAMEN[n % KOLONIE_NAMEN.length]}${basis}${n >= KOLONIE_NAMEN.length ? ' ' + (Math.floor(n / KOLONIE_NAMEN.length) + 1) : ''}`;
}

/** Tochterkolonie auf der Weltkarte eintragen (nach erfolgreichem Flug). Die Spieldaten legt kolonien.js an. */
export function gruendeKolonie(state, ortId) {
  const ort = ortById(ortId);
  if (!ort || ortId === 'heim' || kolonieAn(state, ortId)) return null;
  state.welt ??= createWelt();
  const k = { ort: ortId, name: neuerKolonieName(state, ort), tag: Math.floor((state.zeit ?? 0) / 240) + 1 };
  state.welt.kolonien.push(k);
  return k;
}
