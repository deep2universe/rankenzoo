// Aufgaben (Missionen): führen durchs Spiel und belohnen Fortschritt.
import { FAECHER, GEBAEUDE, QUELLEN } from './config.js';
import { kolonieIds, kolonieDaten } from './kolonien.js';
import { krabbelschow, hotelVon } from './zivilisation.js';

// zählt Gebäude dieser Art – auch ausgebaute (eine Universität zählt z. B. auch als Kindergarten)
const anz = (s, typ) => s.rooms.filter(r => r.bau >= 1 && GEBAEUDE[r.typ]?.linie === GEBAEUDE[typ].linie && GEBAEUDE[r.typ].lstufe >= GEBAEUDE[typ].lstufe).length;
const pop = s => s.volk.arbeiterinnen + s.volk.drohnen + 1;
const truppSumme = s => Object.values(s.revier?.trupps ?? {}).reduce((a, t) => a + (t.s ?? 0), 0);
const NEUE_BAUTEN = ['sporthalle', 'eisladen', 'schuhladen', 'friseur', 'kita', 'theater', 'musikschule', 'bank', 'schwimmbad', 'spielplatz', 'rathaus'];
const alleRooms = s => kolonieIds(s).flatMap(id => kolonieDaten(s, id)?.rooms ?? []);
const anzUeberall = (s, linie) => alleRooms(s).filter(r => r.bau >= 1 && GEBAEUDE[r.typ]?.linie === linie).length;
const pollenTrupp = s => Object.entries(s.revier?.trupps ?? {}).some(([id, t]) => t.s > 0 && QUELLEN[s.revier.quellen.find(q => q.id === +id)?.typ]?.pollen);

export const MISSIONEN = [
  { id: 'quiz1', icon: '🎒', titel: 'Willkommen, Königin!', text: 'Tippe auf den Schul-Knopf 🎒. Dein Stundenplan zeigt, welches Fach dran ist – wähle ein Thema und schreibe deinen ersten Test!',
    ziel: s => [s.stats.quizRunden, 1], lohn: { sterne: 20 }, hinweis: '.aktion-gross.quiz' },
  { id: 'gang5', icon: '⛏️', titel: 'Die ersten Gänge', text: 'Wähle das Gang-Werkzeug und ziehe mit dem Finger 5 neue Gangstücke in die Erde.',
    ziel: s => [s.stats.gegraben, 5], lohn: { gang: 8 }, hinweis: '[data-tool="gang"]' },
  { id: 'brut', icon: '🥚', titel: 'Eine Kinderstube', text: 'Baue eine Kinderstube an einen Gang. Dort wachsen Eier zu Larven, Puppen und Ameisen heran.',
    ziel: s => [anz(s, 'brut'), 1], lohn: { sterne: 25 }, hinweis: '[data-plan="brut"]' },
  { id: 'wohnen', icon: '🛏️', titel: 'Betten für alle', text: 'Baue eine Schlafkammer, damit dein Volk wachsen kann.',
    ziel: s => [anz(s, 'wohnen'), 1], lohn: { sterne: 20, gang: 5 }, hinweis: '[data-plan="wohnen"]' },
  { id: 'denk1', icon: '🧠', titel: 'Kopf-Training', text: 'Spiele ein Denksport-Spiel. Das trainiert Konzentration und bringt Nahrung!',
    ziel: s => [s.stats.minispiele, 1], lohn: { sterne: 20 }, hinweis: '.aktion-gross.denk' },
  { id: 'revier1', icon: '🗺️', titel: 'Das Revier', text: 'Drücke die Shift-Taste ⇧ (oder tippe oben auf „🗺️ Revier"). Dann siehst du die Wiese rund um deinen Hügel von oben!',
    ziel: s => [s.stats.revierBesuche ?? 0, 1], lohn: { sterne: 15 }, hinweis: '.ms-revier' },
  { id: 'trupp1', icon: '🧺', titel: 'Der erste Sammel-Trupp', text: 'Tippe im Revier auf eine Futterquelle (z. B. den Beerenstrauch) und schicke mit „+" mindestens 4 Sammlerinnen hin.',
    ziel: s => [truppSumme(s), 4], lohn: { sterne: 20, material: 10 } },
  { id: 'vorrat', icon: '🫙', titel: 'Vorsorgen', text: 'Baue eine Vorratskammer für mehr Nahrung.',
    ziel: s => [anz(s, 'vorrat'), 1], lohn: { sterne: 20 } },
  { id: 'pop20', icon: '🐜', titel: 'Ein wachsendes Volk', text: 'Erreiche 20 Ameisen. Tipp: Genug Nahrung und Wohnraum helfen der Königin.',
    ziel: s => [pop(s), 20], lohn: { sterne: 30, plan: 'pilz' } },
  { id: 'pilz', icon: '🍄', titel: 'Pilzgärtnerinnen', text: 'Baue einen Pilzgarten tief in der Erde (mindestens 6 Reihen unter der Wiese).',
    ziel: s => [anz(s, 'pilz'), 1], lohn: { sterne: 30 } },
  { id: 'perfekt1', icon: '🏆', titel: 'Ein perfekter Test', text: 'Beantworte in einem Test ALLE Fragen beim ersten Versuch richtig. Liegt ein Bauplan darauf, gehört er dir!',
    ziel: s => [s.stats.testsPerfekt ?? 0, 1], lohn: { sterne: 30, joker: 1 }, hinweis: '.aktion-gross.quiz' },
  { id: 'beobachten', icon: '🔍', titel: 'Wer bist du denn?', text: 'Tippe unten rechts auf die Lupe 🔍 und dann auf eine Ameise. Lerne sie kennen – mit Namen, Freundinnen und Träumen!',
    ziel: s => [s.stats.beobachtet ?? 0, 1], lohn: { sterne: 20 }, hinweis: '.lupe-btn' },
  { id: 'startplatz', icon: '🪽', titel: 'Der Traum vom Fliegen', text: 'Den Bauplan hast du schon: Baue einen Hochzeitsflug-Startplatz am Rand des Ameisenhügels. Stelle im Volk-Fenster den Drohnen-Anteil etwas höher!',
    ziel: s => [anzUeberall(s, 'hochzeit'), 1], lohn: { sterne: 30 }, hinweis: '[data-plan="hochzeit"]' },
  { id: 'flug1', icon: '🌍', titel: 'Eine neue Kolonie', text: 'Wähle auf der Weltkarte 🌍 ein Ziel und fliege durch die Ringe – oder wehre im Wespenalarm die Wespen ab. Am Ziel entsteht eine Tochterkolonie!',
    ziel: s => [kolonieIds(s).length - 1, 1], lohn: { sterne: 60, material: 20 }, hinweis: '.ms-welt' },
  { id: 'besuch1', icon: '🏠', titel: 'Hausbesuch', text: 'Tippe auf der Weltkarte auf deine neue Kolonie und dann auf „Kolonie besuchen & bauen" – oder oben auf 🏘️.',
    ziel: s => [(s.aktiveKolonie ?? 'heim') !== 'heim' || (s.stats.kolonieBesuche ?? 0) > 0 ? 1 : 0, 1], lohn: { sterne: 25 }, hinweis: '.kolonie-wechsel' },
  { id: 'erkunden1', icon: '🔭', titel: 'Ins Unbekannte', text: 'Wähle im Revier „🔭 Erkunden" und tippe in den Nebel. Deine Erkunderinnen entdecken neue Quellen!',
    ziel: s => [s.revier?.expeditionen ?? 0, 1], lohn: { sterne: 25 } },
  { id: 'forschung1', icon: '🔬', titel: 'Kluge Köpfe', text: 'Öffne die Forschung (🔬) und erforsche deine erste Technik. Forschungspunkte gibt es für richtige Quizantworten!',
    ziel: s => [s.forschung?.fertig.length ?? 0, 1], lohn: { sterne: 30, material: 10 } },
  { id: 'ausbau1', icon: '⬆️', titel: 'Größer und schöner', text: 'Gewinne einen Ausbau-Bauplan (z. B. Wohnhöhle) und tippe im Nest auf das Gebäude: „Ausbauen".',
    ziel: s => [s.stats.ausgebaut ?? 0, 1], lohn: { sterne: 40, material: 15 } },
  { id: 'pollen', icon: '🌸', titel: 'Blütenstaub für die Brut', text: 'Schicke im Revier Sammlerinnen zu einer Blumenwiese 🌸, zu Kleeblüten ☘️ oder zum Löwenzahn 🌼. Pollen lässt die Brut schneller wachsen!',
    ziel: s => [pollenTrupp(s) ? 1 : 0, 1], lohn: { sterne: 25, material: 10 } },
  { id: 'ersetzen', icon: '🔁', titel: 'Umbau-Profi', text: 'Baue eine Kammer direkt auf einen bestehenden Gang. Die Gangstücke bekommst du zurück!',
    ziel: s => [s.stats.ersetzt > 0 ? 1 : 0, 1], lohn: { sterne: 25 } },
  { id: 'richtig30', icon: '🎯', titel: 'Kluges Köpfchen', text: 'Beantworte insgesamt 30 Fragen richtig.',
    ziel: s => [s.lernen.richtig, 30], lohn: { sterne: 40, joker: 2 } },
  { id: 'huegel2', icon: '⛰️', titel: 'Der Hügel wächst', text: 'Baue den Ameisenhügel auf Stufe 2 aus (im Volk-Fenster links).',
    ziel: s => [s.world.hill, 2], lohn: { sterne: 30 }, hinweis: '[data-act="huegel"]' },
  { id: 'faecher', icon: '🌈', titel: 'Entdeckerin', text: 'Schreibe in mindestens 4 verschiedenen Fächern Tests (je mindestens 4 Fragen).',
    ziel: s => [Object.keys(FAECHER).filter(f => (s.lernen.proFach[f]?.n ?? 0) >= 4).length, 4], lohn: { sterne: 40, gang: 10 } },
  { id: 'pop40', icon: '🏡', titel: 'Ameisendorf', text: 'Erreiche 40 Ameisen.',
    ziel: s => [pop(s), 40], lohn: { sterne: 50 } },
  { id: 'freizeit', icon: '🎉', titel: 'Freizeitspaß', text: 'Baue ein Kino, ein Restaurant oder einen Fußballplatz.',
    ziel: s => [anz(s, 'kino') + anz(s, 'restaurant') + anz(s, 'fussball'), 1], lohn: { sterne: 40 } },
  { id: 'stoerer1', icon: '🛡️', titel: 'Beschützerinnen', text: 'Taucht ein Störenfried im Revier auf, schicke Wächterinnen 🛡️ hin und verscheuche ihn freundlich.',
    ziel: s => [s.revier?.vertrieben ?? 0, 1], lohn: { sterne: 30, material: 20 } },
  { id: 'karte25', icon: '🧭', titel: 'Kartografin', text: 'Erkunde ein Viertel des Reviers (25 %).',
    ziel: s => [Math.round((s.revier?.sicht.reduce((a, b) => a + b, 0) ?? 0) / (s.revier?.sicht.length ?? 1) * 100), 25], lohn: { sterne: 50, joker: 1 } },
  { id: 'woche1', icon: '📅', titel: 'Eine ganze Schulwoche', text: 'Besuche alle 20 Stunden einer Schulwoche (Montag bis Freitag).',
    ziel: s => [s.schule?.stunden ?? 0, 20], lohn: { sterne: 80, joker: 2 } },
  { id: 'serie5', icon: '🔥', titel: 'Heiße Serie', text: 'Beantworte 5 Fragen hintereinander richtig.',
    ziel: s => [s.lernen.besteSerie, 5], lohn: { sterne: 35, joker: 1 } },
  { id: 'uni', icon: '🎓', titel: 'Ameisen-Universität', text: 'Baue deinen Kindergarten Schritt für Schritt aus: Schule → Berufsschule → Gymnasium → Universität!',
    ziel: s => [anz(s, 'universitaet'), 1], lohn: { sterne: 60 } },
  { id: 'strasse1', icon: '🛣️', titel: 'Ameisenstraße', text: 'Verbinde zwei Kolonien mit einer Ameisenstraße (Weltkarte → Kolonie antippen → Verbinden). Dann wird Nahrung getauscht!',
    ziel: s => [(s.welt?.strassen ?? []).filter(r => r.bau >= 1).length, 1], lohn: { sterne: 40, material: 15 } },
  { id: 'hotel1', icon: '🏨', titel: 'Willkommen, Gäste!', text: 'Baue ein Duft-Gästehaus. Dann können Ameisen aus anderen Kolonien zu Besuch kommen – zum Lernen, Tauschen und Feiern.',
    ziel: s => [kolonieIds(s).filter(id => hotelVon(s, id).stufe > 0).length, 1], lohn: { sterne: 40, fp: 10 } },
  { id: 'boten1', icon: '📨', titel: 'Duftpost', text: 'Baue eine Botenlinie zwischen zwei Kolonien. Botinnen tragen Wissen hin und her – das gibt mehr 🔬.',
    ziel: s => [(s.welt?.boten ?? []).filter(r => r.bau >= 1).length, 1], lohn: { sterne: 30, fp: 10 } },
  { id: 'krabbel2', icon: '🛰️', titel: 'Ameisen-Nachbarschaft', text: 'Erreiche Typ 2 auf der Krabbelschow-Skala (Holo-HUD 🛰️ auf der Weltkarte): 3 Kolonien und eine Straße.',
    ziel: s => [Math.min(2, krabbelschow(s).typ), 2], lohn: { sterne: 80, joker: 2 } },
  { id: 'zelt1', icon: '⛺', titel: 'Zeltlager', text: 'Stelle mit dem Bauplan „Expeditions-Zelt" ein Zelt im Revier auf. Expeditionen starten dann von dort!',
    ziel: s => [(s.revier?.lager ?? []).filter(l => l.bau >= 1).length, 1], lohn: { sterne: 40, material: 20 } },
  { id: 'funde3', icon: '🧺', titel: 'Sammlerin von Schätzen', text: 'Bringe 3 Fundstücke ✨ aus dem Nebel nach Hause.',
    ziel: s => [(s.revier?.sammlung ?? []).length, 3], lohn: { sterne: 50, joker: 1 } },
  { id: 'welt1', icon: '🌍', titel: 'Die große Welt', text: 'Drücke zweimal Shift ⇧ (oder tippe oben auf „🌍 Welt") und schau dir die Weltkarte an.',
    ziel: s => [s.welt?.besucht ? 1 : 0, 1], lohn: { sterne: 20 }, hinweis: '.ms-welt' },
  { id: 'schatz1', icon: '🎁', titel: 'Schatzsucherin', text: 'Im Nebel liegen geheimnisvolle Funde. Schicke eine Expedition genau zu einem 🎁 und bring den Schatz heim!',
    ziel: s => [s.revier?.gefunden ?? 0, 1], lohn: { sterne: 40 } },
  { id: 'stadtleben', icon: '🏙️', titel: 'Stadtleben', text: 'Baue 3 Einrichtungen des Stadtlebens: z. B. Sporthalle, Eisladen, Schuhladen, Fühler-Salon, Kindergarten, Theater oder Spielplatz.',
    ziel: s => [NEUE_BAUTEN.reduce((a, t) => a + anz(s, t), 0), 3], lohn: { sterne: 60 } },
  { id: 'denk5', icon: '🏅', titel: 'Denksport-Champion', text: 'Spiele 6 Denksport-Spiele.',
    ziel: s => [s.stats.minispiele, 6], lohn: { sterne: 50 } },
  { id: 'pop80', icon: '🏘️', titel: 'Ameisenstadt', text: 'Erreiche 80 Ameisen bei mindestens 70 % Zufriedenheit.',
    ziel: (s, d) => [d && d.zufriedenheit >= 70 ? Math.min(pop(s), 80) : Math.min(pop(s), 79), 80], lohn: { sterne: 80 } },
  { id: 'nachbar', icon: '🤝', titel: 'Gute Nachbarn', text: 'Finde das Nachbarvolk im Nebel, erforsche „Diplomatie" (oder baue einen Handelsposten) und handle einmal.',
    ziel: s => [s.stats.handel ?? 0, 1], lohn: { sterne: 60, material: 30 } },
  { id: 'forschung5', icon: '🧪', titel: 'Forschungszentrum', text: 'Schließe 5 Forschungen ab.',
    ziel: s => [s.forschung?.fertig.length ?? 0, 5], lohn: { sterne: 80, plan: 'labor' } },
  { id: 'richtig150', icon: '📖', titel: 'Wissens-Königin', text: 'Beantworte insgesamt 150 Fragen richtig.',
    ziel: s => [s.lernen.richtig, 150], lohn: { sterne: 100, joker: 3 } },
  { id: 'allefaecher', icon: '🏆', titel: 'Alleskönnerin', text: 'Beantworte in jedem der 6 Fächer mindestens 10 Fragen richtig.',
    ziel: s => [Object.keys(FAECHER).filter(f => (s.lernen.proFach[f]?.r ?? 0) >= 10).length, 6], lohn: { sterne: 120 } },
  { id: 'kolonien6', icon: '📨', titel: 'Duftnetz-Zivilisation', text: 'Gründe 6 Ameisenstaaten, verbinde sie mit Botenlinien und baue Hotels – das ist Krabbelschow-Typ 3!',
    ziel: s => [Math.min(3, krabbelschow(s).typ), 3], lohn: { sterne: 150, joker: 2 } },
  { id: 'reich', icon: '👑', titel: 'Ein echtes Ameisenreich', text: 'Erreiche 200 Ameisen und Hügelstufe 5.',
    ziel: s => [Math.min(pop(s), 200) / 200 + Math.min(s.world.hill, 5) / 5, 2], lohn: { sterne: 300 } },
];

export function aktuelleMission(state) {
  return MISSIONEN.find(m => !state.missionen.erledigt.includes(m.id)) ?? null;
}

/** Prüft die aktuelle (und folgende) Mission(en); gibt erledigte zurück. */
export function pruefeMissionen(state, d) {
  const neu = [];
  for (let i = 0; i < 3; i++) {
    const m = aktuelleMission(state);
    if (!m) break;
    const [ist, soll] = m.ziel(state, d);
    if (ist >= soll) { state.missionen.erledigt.push(m.id); neu.push(m); } else break;
  }
  return neu;
}

export function fortschritt(state, m, d) {
  const [ist, soll] = m.ziel(state, d);
  return { ist: Math.min(ist, soll), soll, p: Math.min(1, ist / soll) };
}
