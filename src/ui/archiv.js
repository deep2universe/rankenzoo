// Fragen-Archiv: alle schon gestellten Fragen mit Lösung – Antwort erscheint als schwebende Karte.
import { h, fill } from '../util.js';
import { FAECHER } from '../game/config.js';
import { bank, frageById, themaStand, fachStand, richtigeAntwortText } from '../quiz/engine.js';
import { openModal } from './modal.js';
import { attachTooltip, schliesseTooltip } from './tooltip.js';

export { schliesseTooltip as closeTooltip };

const sterne = n => '★'.repeat(n ?? 1) + '☆'.repeat(3 - (n ?? 1));
const kannHover = () => typeof matchMedia === 'function' && matchMedia('(hover: hover)').matches;

/** Einheitlicher Archiv-Eintrag aus einer kuratierten Frage (roh oder für die Anzeige vorbereitet). */
function ausFrage(q0, extra = {}) {
  const q = (q0.id && frageById(q0.id)) || q0;
  return {
    key: q.id ?? q.frage,
    fach: q.fach, thema: q.thema, stufe: q.stufe ?? 1, typ: q.typ,
    frage: q.frage, text: q.text, bild: q.bild, sprache: q.sprache,
    optionen: q.typ === 'choice' ? q.optionen.map(String) : null,
    loesung: q.loesung, teile: q.typ === 'order' ? q.teile : null,
    antwort: richtigeAntwortText(q), erklaerung: q.erklaerung ?? '',
    generiert: !!q.generiert,
    ...extra,
  };
}

/** Alle bisher gestellten Fragen eines Spielstands sammeln (kuratierte + gemerkte Zufallsaufgaben). */
export function sammleArchiv(state) {
  const L = state.lernen;
  const verlauf = L.verlauf ?? [];
  const out = [];
  for (const [id, st] of Object.entries(L.fragen ?? {})) {
    const q = frageById(id);
    if (!q || !FAECHER[q.fach]) continue;
    const vi = verlauf.indexOf(id);
    out.push(ausFrage(q, {
      status: (st.r ?? 0) > 0 ? 'geloest' : 'ueben',
      n: st.n ?? 0, r: st.r ?? 0,
      zeit: st.z ?? (vi >= 0 ? vi + 1 : 0), // alte Spielstände: Reihenfolge aus dem Verlauf
    }));
  }
  (L.genArchiv ?? []).forEach((g, i) => {
    if (!FAECHER[g.fach]) return;
    out.push({
      key: 'gen-' + i + '-' + g.zeit, fach: g.fach, thema: g.thema, stufe: g.stufe ?? 1, typ: 'gen',
      frage: g.frage, sprache: g.sprache, antwort: g.antwort, erklaerung: g.erklaerung ?? '',
      generiert: true, status: g.richtig ? 'geloest' : 'ueben', n: 1, r: g.richtig ? 1 : 0, zeit: g.zeit ?? 0,
    });
  });
  return out;
}

// ---------------------------------------------------------------- Antwort-Karte

function antwortBlock(e) {
  const gross = h('div.tt-antwort',
    h('span.tt-haken', { 'aria-hidden': 'true' }, '✓'),
    h('div',
      h('div.tt-label', 'Richtige Antwort'),
      e.typ === 'order'
        ? h('div.tt-kacheln', e.teile.map(t => h('span', t)))
        : h('div.tt-wert', { lang: e.sprache === 'en' ? 'en' : null }, e.antwort)));
  if (e.typ === 'choice' && e.optionen?.length > 1) {
    const andere = e.optionen.filter((_, i) => i !== e.loesung);
    return [gross, h('div.tt-andere', h('span.tt-label', 'Nicht richtig:'), andere.map(o => h('s', o)))];
  }
  return gross;
}

/** Inhalt der schwebenden Antwort-Karte für einen Archiv-Eintrag. */
export function antwortKarte(e) {
  const f = FAECHER[e.fach] ?? { name: '', icon: '❓' };
  const th = bank()[e.fach]?.themen?.[e.thema];
  const status = e.status === 'geloest'
    ? h('span.tt-status.gut', e.generiert ? '✅ Richtig beantwortet' : '✅ Gelöst')
    : e.status === 'zweite' ? h('span.tt-status.gut', '✅ Im 2. Versuch geschafft')
    : h('span.tt-status.ueben', e.generiert || e.runde ? '🔁 Das üben wir noch' : '🔁 Noch üben – kommt wieder dran');
  return h('div.tt-karte',
    h('div.tt-kopf',
      h('span.tt-fach-em', { 'aria-hidden': 'true' }, f.icon),
      h('div.tt-kopf-txt', h('b', f.name), h('small', [th?.icon, th?.name].filter(Boolean).join(' ') || (e.generiert ? '🎲 Zufallsaufgabe' : ''))),
      h('span.tt-sterne', { title: 'Schwierigkeit', 'aria-label': `Schwierigkeit ${e.stufe} von 3` }, sterne(e.stufe)),
      h('span.tt-deko', { 'aria-hidden': 'true' }, f.icon)),
    h('div.tt-koerper',
      e.text ? h('details.tt-lesetext', h('summary', '📖 Lesetext anzeigen'), h('div', e.text)) : null,
      h('div.tt-frage', { lang: e.sprache === 'en' ? 'en' : null }, e.bild ? h('span.tt-bild', e.bild) : null, e.frage),
      antwortBlock(e),
      e.erklaerung ? h('div.tt-erk', h('span', { 'aria-hidden': 'true' }, '💡'), h('div', e.erklaerung)) : null,
      h('div.tt-fuss', status,
        e.generiert ? h('span.tt-meta', '🎲 Zufallsaufgabe') : null,
        !e.generiert && e.n ? h('span.tt-meta', `${e.n}× gefragt`) : null)),
  );
}

/** Ein Eintrag (Knopf) in einer Fragenliste – Antwort per Hover/Fokus, Klick pinnt fest. */
export function archivEintrag(e) {
  const f = FAECHER[e.fach] ?? { farbe: '#ffc93c', farbe2: '#ff9f1c' };
  const ok = e.status === 'geloest' || e.status === 'zweite';
  const el = h('button.archiv-eintrag.' + (ok ? 'geloest' : 'ueben'), { type: 'button', style: { '--f1': f.farbe, '--f2': f.farbe2 } },
    h('span.st', { 'aria-hidden': 'true' }, ok ? '✅' : '🔁'),
    h('span.txt', { lang: e.sprache === 'en' ? 'en' : null }, e.frage),
    h('span.meta',
      h('span.sr', ok ? 'Gelöst. ' : 'Noch üben. '),
      h('span', { 'aria-hidden': 'true' }, sterne(e.stufe)),
      e.generiert ? h('span', '🎲 Zufall') : e.n > 1 ? h('span', `${e.n}× gefragt`) : null,
      h('span.auf', { 'aria-hidden': 'true' }, '👁️ Antwort')),
  );
  attachTooltip(el, () => antwortKarte(e), { farbe: [f.farbe, f.farbe2], label: 'Antwort zu: ' + e.frage.slice(0, 80) });
  return el;
}

/** Liste der Fragen einer Quiz-Runde (für den Ergebnis-Bildschirm). items: [{ q, status: 'geloest'|'zweite'|'ueben' }] */
export function rundenListe(items) {
  if (!items?.length) return null;
  return h('div.archiv.runden-archiv',
    h('h3.archiv-titel', '🗂️ Deine Fragen dieser Runde'),
    h('p.archiv-hinweis', kannHover() ? '🖱️ Fahre über eine Frage, um Antwort und Erklärung zu sehen. Klick = festpinnen 📌' : '👆 Tippe auf eine Frage, um Antwort und Erklärung zu sehen.'),
    h('div.archiv-eintraege', items.map(({ q, status }) => archivEintrag(ausFrage(q, { status, runde: true, n: 0 })))));
}

// ---------------------------------------------------------------- Archiv-Ansicht

/**
 * Das komplette Archiv als Element (für eigenes Fenster oder den Wissensbuch-Tab).
 * @param {object} game  Spielobjekt (oder direkt der Spielstand)
 * @param {{ fach?: string, status?: 'alle'|'geloest'|'ueben', onQuiz?: () => void }} opts
 */
export function archivAnsicht(game, opts = {}) {
  const state = game.state ?? game;
  const alle = sammleArchiv(state);
  const filter = { status: opts.status ?? 'alle', fach: opts.fach && FAECHER[opts.fach] ? opts.fach : null, suche: '' };
  const liste = h('div.archiv-liste');
  const statusChips = h('div.archiv-chips', { role: 'group', 'aria-label': 'Nach Status filtern' });
  const fachChips = h('div.archiv-chips.faecher-chips', { role: 'group', 'aria-label': 'Nach Fach filtern' });
  const suche = h('input.archiv-suche', { type: 'search', placeholder: 'Frage oder Antwort suchen …', 'aria-label': 'Fragen durchsuchen', autocomplete: 'off', spellcheck: 'false' });
  suche.addEventListener('input', () => { filter.suche = suche.value.trim().toLowerCase(); zeichne(); });
  suche.addEventListener('keydown', e => { if (e.key === 'Escape' && suche.value) { suche.value = ''; filter.suche = ''; zeichne(); e.stopPropagation(); } });

  const nGeloest = alle.filter(e => e.status === 'geloest' && !e.generiert).length;
  const nUeben = alle.filter(e => e.status === 'ueben' && !e.generiert).length;
  const nGen = alle.filter(e => e.generiert).length;
  const gesamt = Object.keys(FAECHER).reduce((n, k) => n + fachStand(state, k).gesamt, 0);

  const passt = e => (filter.status === 'alle' || e.status === filter.status)
    && (!filter.fach || e.fach === filter.fach)
    && (!filter.suche || (e.frage + ' ' + e.antwort + ' ' + (e.optionen ?? []).join(' ')).toLowerCase().includes(filter.suche));

  function chip(aktiv, inhalt, onclick, farbe) {
    return h('button.archiv-chip' + (aktiv ? '.an' : ''), { type: 'button', 'aria-pressed': String(aktiv), onclick, style: farbe ? { '--f1': farbe[0], '--f2': farbe[1] } : null }, inhalt);
  }
  function zeichneChips() {
    const imFach = alle.filter(e => !filter.fach || e.fach === filter.fach);
    const zahl = st => imFach.filter(e => st === 'alle' || e.status === st).length;
    fill(statusChips,
      chip(filter.status === 'alle', ['🗂️ Alle ', h('b', String(zahl('alle')))], () => { filter.status = 'alle'; zeichne(); }),
      chip(filter.status === 'geloest', ['✅ Gelöst ', h('b', String(zahl('geloest')))], () => { filter.status = 'geloest'; zeichne(); }),
      chip(filter.status === 'ueben', ['🔁 Noch üben ', h('b', String(zahl('ueben')))], () => { filter.status = 'ueben'; zeichne(); }));
    fill(fachChips,
      chip(!filter.fach, '🌈 Alle Fächer', () => { filter.fach = null; zeichne(); }),
      Object.entries(FAECHER).map(([k, f]) => {
        const n = alle.filter(e => e.fach === k).length;
        const b = chip(filter.fach === k, [f.icon + ' ', h('span.nm', f.name), ' ', h('b', String(n))], () => { filter.fach = filter.fach === k ? null : k; zeichne(); }, [f.farbe, f.farbe2]);
        b.classList.add('fach');
        if (!n) b.disabled = true;
        return b;
      }));
  }

  function zeichne() {
    schliesseTooltip();
    zeichneChips();
    const treffer = alle.filter(passt);
    if (!alle.length) {
      fill(liste, h('div.archiv-leer', h('span.em', '🐜'),
        h('b', 'Dein Archiv ist noch leer.'),
        h('p', 'Sobald du in der Wissens-Expedition Fragen beantwortest, landen sie hier – mit der richtigen Lösung zum Nachschauen.'),
        opts.onQuiz ? h('button.btn.gruen', { onclick: opts.onQuiz }, '📚 Zur Wissens-Expedition') : null));
      return;
    }
    if (!treffer.length) {
      fill(liste, h('div.archiv-leer', h('span.em', filter.status === 'ueben' ? '🏆' : '🔍'),
        h('b', filter.status === 'ueben' && !filter.suche ? 'Super – hier gibt es nichts mehr zu üben!' : 'Keine passenden Fragen gefunden.'),
        h('p', filter.suche ? 'Probiere ein anderes Suchwort.' : 'Wähle einen anderen Filter.')));
      return;
    }
    const B = bank();
    fill(liste, Object.entries(FAECHER).map(([fk, f]) => {
      const imFach = treffer.filter(e => e.fach === fk);
      if (!imFach.length) return null;
      const fs = fachStand(state, fk);
      const themenReihe = Object.keys(B[fk]?.themen ?? {});
      const gruppen = new Map();
      for (const e of imFach) {
        if (!gruppen.has(e.thema)) gruppen.set(e.thema, []);
        gruppen.get(e.thema).push(e);
      }
      const keys = [...gruppen.keys()].sort((a, b) => themenReihe.indexOf(a) - themenReihe.indexOf(b));
      return h('section.archiv-fach', { style: { '--f1': f.farbe, '--f2': f.farbe2 } },
        h('div.archiv-fach-kopf',
          h('span.em', f.icon),
          h('div', h('div.nm', f.name), h('div.ort', f.ort)),
          h('div.archiv-fach-stand',
            h('span', fs.gemeistert ? '🏆 Alles gelöst!' : `📚 Gelöst: ${fs.geloest} / ${fs.gesamt}`),
            h('div.track', h('i', { style: { width: (fs.gesamt ? fs.geloest / fs.gesamt * 100 : 0) + '%' } })))),
        keys.map(tk => {
          const t = B[fk]?.themen?.[tk] ?? { name: tk, icon: '❓' };
          const st = themaStand(state, fk, tk);
          const eintraege = gruppen.get(tk).sort((a, b) =>
            (a.status === 'ueben' ? 0 : 1) - (b.status === 'ueben' ? 0 : 1) || (b.zeit - a.zeit));
          return h('div.archiv-thema' + (st.gemeistert ? '.gemeistert' : ''),
            h('h4',
              h('span.em', t.icon), h('span.nm', t.name),
              st.generator
                ? h('span.zahl', '🎲 Zufallsaufgaben (die letzten)')
                : st.gemeistert
                  ? h('span.zahl.pokal', `🏆 Gemeistert – alle ${st.gesamt} Fragen gelöst`)
                  : h('span.zahl', `${st.geloest} von ${st.gesamt} gelöst`)),
            h('div.archiv-eintraege', eintraege.map(archivEintrag)));
        }));
    }));
  }

  const root = h('div.archiv',
    h('div.archiv-zusammenfassung',
      h('div.archiv-stat.gut', h('span.em', '✅'), h('div', h('b', String(nGeloest)), h('small', `von ${gesamt} Fragen gelöst`))),
      h('div.archiv-stat.ueben', h('span.em', '🔁'), h('div', h('b', String(nUeben)), h('small', 'noch üben'))),
      h('div.archiv-stat.gen', h('span.em', '🎲'), h('div', h('b', String(nGen)), h('small', 'Zufallsaufgaben'))),
    ),
    h('p.archiv-hinweis', kannHover()
      ? ['🖱️ Fahre mit der Maus über eine Frage – dann siehst du die ', h('b', 'richtige Antwort'), '. Klicke, um die Karte festzupinnen 📌.']
      : ['👆 Tippe auf eine Frage – dann siehst du die ', h('b', 'richtige Antwort'), '. Mit ✕ machst du die Karte wieder zu.']),
    h('div.archiv-filter', statusChips, h('label.archiv-suche-box', h('span', { 'aria-hidden': 'true' }, '🔍'), suche), fachChips),
    liste);
  zeichne();
  return root;
}

/**
 * Öffnet das Fragen-Archiv als eigenes Fenster.
 * @param {object} game  Spielobjekt (game.state = Spielstand)
 * @param {{ fach?: string, status?: 'alle'|'geloest'|'ueben' }} opts  optional: Vorfilter
 * @returns das Modal-Objekt aus openModal
 */
export function openFragenArchiv(game, opts = {}) {
  const m = openModal({
    titel: 'Fragen-Archiv', unter: 'Alle Fragen, die du schon beantwortet hast – mit Lösung!', icon: '🗂️', klasse: 'breit',
    farbe: ['#d9822b', '#ffc93c'], onClose: () => schliesseTooltip(),
  });
  const zumQuiz = typeof game.openQuiz === 'function' && !opts.ausQuiz
    ? () => { m.close(); setTimeout(() => game.openQuiz(), 0); } : null;
  m.render(archivAnsicht(game, { ...opts, onQuiz: zumQuiz }));
  return m;
}
