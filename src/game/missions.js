// Aufgaben (Missionen): führen durchs Spiel und belohnen Fortschritt.
import { FAECHER } from './config.js';

const anz = (s, typ) => s.rooms.filter(r => r.typ === typ && r.bau >= 1).length;
const pop = s => s.volk.arbeiterinnen + s.volk.drohnen + 1;

export const MISSIONEN = [
  { id: 'quiz1', icon: '📚', titel: 'Willkommen, Königin!', text: 'Tippe auf den goldenen Quiz-Knopf und spiele deine erste Wissensrunde. So verdienst du Baupläne!',
    ziel: s => [s.stats.quizRunden, 1], lohn: { sterne: 20 }, hinweis: '.aktion-gross.quiz' },
  { id: 'gang5', icon: '⛏️', titel: 'Die ersten Gänge', text: 'Wähle das Gang-Werkzeug und ziehe mit dem Finger 5 neue Gangstücke in die Erde.',
    ziel: s => [s.stats.gegraben, 5], lohn: { gang: 8 }, hinweis: '[data-tool="gang"]' },
  { id: 'brut', icon: '🥚', titel: 'Eine Kinderstube', text: 'Baue eine Kinderstube an einen Gang. Dort wachsen Eier zu Larven, Puppen und Ameisen heran.',
    ziel: s => [anz(s, 'brut'), 1], lohn: { sterne: 25 }, hinweis: '[data-plan="brut"]' },
  { id: 'wohnen', icon: '🛏️', titel: 'Betten für alle', text: 'Baue eine Schlafkammer, damit dein Volk wachsen kann.',
    ziel: s => [anz(s, 'wohnen'), 1], lohn: { sterne: 20, gang: 5 }, hinweis: '[data-plan="wohnen"]' },
  { id: 'denk1', icon: '🧠', titel: 'Kopf-Training', text: 'Spiele ein Denksport-Spiel. Das trainiert Konzentration und bringt Nahrung!',
    ziel: s => [s.stats.minispiele, 1], lohn: { sterne: 20 }, hinweis: '.aktion-gross.denk' },
  { id: 'vorrat', icon: '🫙', titel: 'Vorsorgen', text: 'Baue eine Vorratskammer für mehr Nahrung.',
    ziel: s => [anz(s, 'vorrat'), 1], lohn: { sterne: 20 } },
  { id: 'pop20', icon: '🐜', titel: 'Ein wachsendes Volk', text: 'Erreiche 20 Ameisen. Tipp: Genug Nahrung und Wohnraum helfen der Königin.',
    ziel: s => [pop(s), 20], lohn: { sterne: 30, plan: 'pilz' } },
  { id: 'pilz', icon: '🍄', titel: 'Pilzgärtnerinnen', text: 'Baue einen Pilzgarten tief in der Erde (mindestens 6 Reihen unter der Wiese).',
    ziel: s => [anz(s, 'pilz'), 1], lohn: { sterne: 30 } },
  { id: 'ersetzen', icon: '🔁', titel: 'Umbau-Profi', text: 'Baue eine Kammer direkt auf einen bestehenden Gang. Die Gangstücke bekommst du zurück!',
    ziel: s => [s.stats.ersetzt > 0 ? 1 : 0, 1], lohn: { sterne: 25 } },
  { id: 'richtig30', icon: '🎯', titel: 'Kluges Köpfchen', text: 'Beantworte insgesamt 30 Fragen richtig.',
    ziel: s => [s.lernen.richtig, 30], lohn: { sterne: 40, joker: 2 } },
  { id: 'huegel2', icon: '⛰️', titel: 'Der Hügel wächst', text: 'Baue den Ameisenhügel auf Stufe 2 aus (im Volk-Fenster links).',
    ziel: s => [s.world.hill, 2], lohn: { sterne: 30 }, hinweis: '[data-act="huegel"]' },
  { id: 'faecher', icon: '🌈', titel: 'Entdeckerin', text: 'Spiele in mindestens 4 verschiedenen Fächern eine Quizrunde.',
    ziel: s => [Object.keys(FAECHER).filter(f => (s.lernen.proFach[f]?.n ?? 0) >= 4).length, 4], lohn: { sterne: 40, gang: 10 } },
  { id: 'pop40', icon: '🏡', titel: 'Ameisendorf', text: 'Erreiche 40 Ameisen.',
    ziel: s => [pop(s), 40], lohn: { sterne: 50 } },
  { id: 'freizeit', icon: '🎉', titel: 'Freizeitspaß', text: 'Baue ein Kino, ein Restaurant oder einen Fußballplatz.',
    ziel: s => [anz(s, 'kino') + anz(s, 'restaurant') + anz(s, 'fussball'), 1], lohn: { sterne: 40 } },
  { id: 'serie5', icon: '🔥', titel: 'Heiße Serie', text: 'Beantworte 5 Fragen hintereinander richtig.',
    ziel: s => [s.lernen.besteSerie, 5], lohn: { sterne: 35, joker: 1 } },
  { id: 'uni', icon: '🎓', titel: 'Ameisen-Universität', text: 'Baue eine Universität. Dann gibt es mehr Sterne im Quiz!',
    ziel: s => [anz(s, 'universitaet'), 1], lohn: { sterne: 60 } },
  { id: 'denk5', icon: '🏅', titel: 'Denksport-Champion', text: 'Spiele 6 Denksport-Spiele.',
    ziel: s => [s.stats.minispiele, 6], lohn: { sterne: 50 } },
  { id: 'pop80', icon: '🏘️', titel: 'Ameisenstadt', text: 'Erreiche 80 Ameisen bei mindestens 70 % Zufriedenheit.',
    ziel: (s, d) => [d && d.zufriedenheit >= 70 ? Math.min(pop(s), 80) : Math.min(pop(s), 79), 80], lohn: { sterne: 80 } },
  { id: 'richtig150', icon: '📖', titel: 'Wissens-Königin', text: 'Beantworte insgesamt 150 Fragen richtig.',
    ziel: s => [s.lernen.richtig, 150], lohn: { sterne: 100, joker: 3 } },
  { id: 'allefaecher', icon: '🏆', titel: 'Alleskönnerin', text: 'Beantworte in jedem der 6 Fächer mindestens 10 Fragen richtig.',
    ziel: s => [Object.keys(FAECHER).filter(f => (s.lernen.proFach[f]?.r ?? 0) >= 10).length, 6], lohn: { sterne: 120 } },
  { id: 'hochzeit', icon: '🪽', titel: 'Der Hochzeitsflug', text: 'Baue einen Startplatz, ziehe 10 Drohnen groß und starte einen Hochzeitsflug.',
    ziel: s => [s.stats.hochzeitsfluege, 1], lohn: { sterne: 150 } },
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
