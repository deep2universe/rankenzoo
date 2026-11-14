// Bauplan-Buch: alle Entwicklungslinien auf einen Blick – was ist freigeschaltet,
// was kann ich gerade im Quiz gewinnen, und wie entwickeln sich die Gebäude?
import { h, fill } from '../util.js';
import { GEBAEUDE, LINIEN, LINIEN_FACH, FAECHER } from '../game/config.js';
import { istFrei, planVerfuegbar, planSperre, rangVonState, neuBaubar, anzahlLinie } from '../game/bauplaene.js';
import { gebaeudeBild } from '../render/vorschau.js';
import { openModal } from './modal.js';

/** Kleine Bauplan-Karte mit Gebäudebild und Entwicklungs-Pfad (für Quiz-Vorschau, Ergebnis, Ausbau). */
export function planKarte(typ, { zoom = 0.75, lebendig = false, extra = null } = {}) {
  const G = GEBAEUDE[typ];
  const stufen = LINIEN[G.linie]?.stufen ?? [typ];
  return h('div.plan-vorschau',
    h('div.pv-bild', gebaeudeBild(typ, { zoom, lebendig })),
    h('div.pv-text',
      h('div.pv-name', G.icon, ' ', G.name),
      stufen.length > 1 ? h('div.pv-linie', stufen.map((k, i) => [i ? h('span.pv-pfeil', '›') : null,
        h('span.pv-stufe' + (k === typ ? '.ich' : ''), { title: GEBAEUDE[k].name }, GEBAEUDE[k].icon)])) : null,
      extra));
}

const ZONE = { erde: '⬇ unter der Erde', huegel: '⛰️ im Hügel', oberflaeche: '🌼 auf der Wiese', revier: '🗺️ im Revier' };

export function openBauplanBuch(game, { fach = null } = {}) {
  const s = game.state;
  const rang = rangVonState(s);
  const m = openModal({ titel: 'Bauplan-Buch', unter: 'So entwickeln sich deine Gebäude – Stufe für Stufe', icon: '📐', klasse: 'breit', farbe: ['#5b8def', '#8fb8ff'] });
  let aktiv = fach;
  const inhalt = h('div.bb-inhalt');
  const chips = h('div.bb-chips');
  const alle = Object.values(LINIEN).flatMap(l => l.stufen);
  const frei = alle.filter(t => istFrei(s, t)).length;

  function karte(typ) {
    const G = GEBAEUDE[typ];
    const ok = istFrei(s, typ);
    const gewinnbar = !ok && planVerfuegbar(s, typ, rang);
    const sperre = !ok && !gewinnbar ? planSperre(s, typ, rang) : null;
    const anz = s.rooms.filter(r => r.typ === typ).length;
    return h('div.bb-karte' + (ok ? '.frei' : gewinnbar ? '.gewinnbar' : '.zu'), { title: G.text },
      h('div.bb-bild', gebaeudeBild(typ, { zoom: 0.55 })),
      h('div.bb-name', G.icon, ' ', G.name),
      h('div.bb-status', ok ? (anz ? `✅ gebaut ×${anz}` : neuBaubar(typ) ? '✅ freigeschaltet' : '✅ zum Ausbauen bereit')
        : gewinnbar ? `🎯 im Quiz zu gewinnen` : `🔒 ${sperre ?? 'noch gesperrt'}`),
      h('div.bb-meta', `⭐ ${G.kosten}${G.material ? ` · 🪵 ${G.material}` : ''} · ${ZONE[G.zone] ?? ''}`));
  }

  function zeichne() {
    fill(chips,
      h('button.bb-chip' + (!aktiv ? '.an' : ''), { onclick: () => { aktiv = null; zeichne(); } }, '📚 Alle'),
      Object.entries(FAECHER).map(([k, f]) => h('button.bb-chip' + (aktiv === k ? '.an' : ''), { style: { '--f': f.farbe }, onclick: () => { aktiv = k; zeichne(); } }, `${f.icon} ${f.name}`)));
    const faecher = aktiv ? [aktiv] : Object.keys(LINIEN_FACH);
    fill(inhalt, faecher.map(fk => {
      const F = FAECHER[fk];
      return h('section.bb-fach',
        h('h3', { style: { color: F.farbe } }, `${F.icon} ${F.name}`, h('small', ' – diese Gebäude gewinnst du vor allem in diesem Fach')),
        (LINIEN_FACH[fk] ?? []).map(lk => {
          const L = LINIEN[lk];
          return h('div.bb-linie',
            h('div.bb-linie-kopf', h('b', `${L.icon} ${L.name}`), h('small', `${L.stufen.filter(t => istFrei(s, t)).length} von ${L.stufen.length} Stufen · ${anzahlLinie(s, lk)} gebaut`)),
            h('div.bb-stufen', L.stufen.map((t, i) => [i ? h('span.bb-pfeil', '➜') : null, karte(t)])));
        }));
    }));
  }
  m.render(
    h('p.bb-einleitung', `📐 ${frei} von ${alle.length} Bauplänen freigeschaltet. Baupläne gibt es für perfekte Tests im Quiz (alle Fragen richtig). Stufe 1 baust du neu, höhere Stufen entstehen durch `, h('b', 'Ausbau'), ' – tippe dazu im Nest auf ein Gebäude.'),
    chips, inhalt);
  zeichne();
  return m;
}
