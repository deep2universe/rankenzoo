// Oberfläche der Welt-Ansicht: Panel (Hochzeitsflug-Status, Kolonien, Orte) und Ortskarte.
import { h, fill } from '../util.js';
import { ORTE, kolonieAn, kolonieGroesse, flugParameter } from '../game/welt.js';

const DIST = ['', 'Nah', 'Mittel', 'Weit', 'Sehr weit'];
const FLAGGEN = ['#4fa3ff', '#ff9f1c', '#a77bff', '#ff6b9b', '#2ec4b6', '#ffd34d', '#5fd068', '#f45b69', '#9b5de5'];

/** Freundliches Symbol zu einem fehlenden Grund */
function grundIcon(t) {
  const s = t.toLowerCase();
  if (s.includes('startplatz') || s.includes('flugfeld')) return '🛫';
  if (s.includes('drohn')) return '🪽';
  if (s.includes('arbeiter')) return '🐜';
  if (s.includes('zufrieden')) return '😊';
  if (s.includes('königin') || s.includes('prinzess')) return '👑';
  if (s.includes('nahrung') || s.includes('honig')) return '🍯';
  if (s.includes('nacht')) return '🌙';
  if (s.includes('regen') || s.includes('wetter')) return '🌧️';
  if (s.includes('stern')) return '⭐';
  return '🔸';
}
const punkte = e => h('span.wd-punkte', { 'data-e': e }, [1, 2, 3, 4].map(k => h('i' + (k <= e ? '.an' : ''))));
const ameisen = n => h('span.wk-groesse', { title: `Größe ${n} von 5` }, [1, 2, 3, 4, 5].map(k => h('i' + (k <= n ? '.an' : ''), '🐜')));

export class WeltHUD {
  constructor(game, root) {
    this.game = game;
    this.sig = '';
    this.ksig = '';
    this.auswahl = null;
    this.panel = h('aside.welt-panel');
    this.karte = h('aside.welt-karte', { hidden: true });
    this.hinweis = h('div.welt-hinweis');
    root.append(this.panel, this.karte, this.hinweis);
    // Während ein Knopf gedrückt wird, nichts neu aufbauen (sonst gehen Klicks verloren)
    for (const el of [this.panel, this.karte]) {
      el.addEventListener('pointerdown', () => { this.druck = true; });
      el.addEventListener('pointerleave', () => { this.druck = false; });
    }
    window.addEventListener('pointerup', () => setTimeout(() => { this.druck = false; }, 60));
  }

  waehle(ort) {
    this.auswahl = ort?.id ?? null;
    if (this.game.weltR) this.game.weltR.selected = this.auswahl;
    this.refresh(true);
  }

  status() {
    try { return this.game.hochzeitsflugStatus() ?? { ok: false, gruende: [] }; }
    catch { return { ok: false, gruende: [] }; }
  }

  refresh(force = false) {
    if (!document.body.classList.contains('modus-welt')) return;
    const s = this.game.state;
    if (!s) return;
    const st = this.status();
    const kol = s.welt?.kolonien ?? [];
    this.hinweis.textContent = this.auswahl ? '' : st.ok ? '🪽 Die junge Königin ist bereit! Tippe auf einen Ort auf der Karte.' : '🗺️ Tippe auf einen Ort, um mehr über ihn zu erfahren.';
    this.hinweis.hidden = !!this.auswahl;
    if (this.druck && !force) return;
    const sig = JSON.stringify([st.ok, st.gruende, kol.map(k => [k.ort, k.name, kolonieGroesse(s, k)]), s.welt?.fluege, s.welt?.versuche, this.auswahl]);
    if (force || sig !== this.sig) { this.sig = sig; this.renderPanel(st); }
    const ksig = JSON.stringify([this.auswahl, st.ok, st.gruende[0], kol.map(k => [k.ort, kolonieGroesse(s, k)])]);
    if (force || ksig !== this.ksig) { this.ksig = ksig; this.renderKarte(st); }
  }

  zeige(o) {
    const R = this.game.weltR;
    if (R) {
      // Ort mittig in den freien Bereich zwischen Panel (links) und Ortskarte (rechts) rücken
      const links = this.panel.getBoundingClientRect().right || 0, rechts = R.vw - (R.vw > 820 ? 390 : 0);
      R.selected = o.id;
      R.centerOn(o.x + (R.vw / 2 - (Math.max(0, links) + rechts) / 2) / R.cam.z, o.y);
    }
    this.waehle(o);
  }

  renderPanel(st) {
    const s = this.game.state, w = s.welt ?? { kolonien: [], fluege: 0, versuche: 0 };
    const kol = w.kolonien ?? [];
    fill(this.panel,
      h('div.wp-kopf', h('span.em', '🌍'), h('div', h('div.tt', 'Die Welt'),
        h('div.unter', `${kol.length} ${kol.length === 1 ? 'Tochterkolonie' : 'Tochterkolonien'} · ${w.fluege ?? 0} ${(w.fluege ?? 0) === 1 ? 'Flug' : 'Flüge'}`))),
      st.ok
        ? h('div.wp-status.ok', h('span.em', '✅'), h('div', h('b', 'Bereit für den Hochzeitsflug!'), h('small', 'Wähle einen Ort auf der Karte.')))
        : h('div.wp-status', h('div.wp-status-kopf', h('span.em', '🪽'), h('b', 'Hochzeitsflug – es fehlt noch:')),
          h('ul', (st.gruende.length ? st.gruende : ['Noch nicht bereit']).map(g => h('li', h('span', grundIcon(g)), h('span', g))))),
      h('div.wp-schritte',
        h('div', h('span', '🗺️'), h('small', 'Ort wählen')), h('i', '➜'),
        h('div', h('span', '💫'), h('small', 'durch goldene Ringe fliegen')), h('i', '➜'),
        h('div', h('span', '🎁'), h('small', 'Bonus fürs Heimatvolk'))),
      h('p.wp-info', 'Suche einen Ort auf der Karte aus. Dann fliegt deine junge Königin durch goldene Ringe dorthin und gründet eine neue Kolonie. Jede Tochterkolonie schenkt deinem Heimatvolk einen Bonus!'),
      h('h4', `🚩 Unsere Kolonien (${kol.length})`),
      kol.length ? h('div.wp-liste', kol.map((k, i) => {
        const o = ORTE.find(x => x.id === k.ort);
        if (!o) return null;
        return h('button.wk-zeile' + (this.auswahl === o.id ? '.an' : ''), { onclick: () => this.zeige(o), style: { '--fahne': FLAGGEN[i % FLAGGEN.length] } },
          h('span.fahne'), h('span.nm', k.name), ameisen(kolonieGroesse(s, k)),
          h('span.ort', `${o.icon} ${o.name}`), h('span.bonus', `🎁 ${o.bonusText}`));
      })) : h('p.wp-leer', h('span.em', '🥚'), 'Noch keine Tochterkolonie. Eure erste junge Königin wartet schon auf ihren großen Flug!'),
      h('h4', `📍 Orte (${kol.length}/${ORTE.length} besiedelt)`),
      h('div.wp-liste', ORTE.map(o => {
        const k = kolonieAn(s, o.id);
        return h('button.wo-zeile' + (this.auswahl === o.id ? '.an' : '') + (k ? '.besiedelt' : ''), { onclick: () => this.zeige(o) },
          h('span.em', o.icon), h('span.nm', o.name),
          h('span.dist', punkte(o.entfernung), h('small', DIST[o.entfernung])),
          h('span.bonus', k ? `🚩 ${k.name}` : `🎁 ${o.bonusText}`));
      })),
    );
  }

  renderKarte(st) {
    const g = this.game, s = g.state;
    const o = ORTE.find(x => x.id === this.auswahl);
    if (!o) { this.karte.hidden = true; return; }
    this.karte.hidden = false;
    const k = kolonieAn(s, o.id);
    let fp = null;
    try { fp = flugParameter(s, o); } catch { fp = null; }
    const ringe = fp?.ringe ?? 10 + o.entfernung * 5;
    const kopf = h('div.wk-kopf', { 'data-e': o.entfernung }, h('span.em', o.icon),
      h('div', h('div.tt', o.name), h('div.unter', punkte(o.entfernung), ` ${DIST[o.entfernung]} vom Heimatnest`)),
      h('button.zu', { 'aria-label': 'Schließen', onclick: () => { if (g.weltR) g.weltR.selected = null; this.waehle(null); } }, '✕'));
    const fakten = h('div.wk-fakten',
      h('div', h('span', '💫'), h('b', ringe), h('small', 'goldene Ringe')),
      h('div', h('span', o.entfernung >= 3 ? '🌬️' : '🍃'), h('b', o.entfernung >= 3 ? 'Wind' : 'Ruhig'), h('small', o.entfernung >= 3 ? 'Windböen!' : 'kaum Wind')),
      h('div', h('span', '📏'), h('b', `${o.entfernung}/4`), h('small', 'Entfernung')));
    const bonus = h('div.wk-bonus', h('span.em', '🎁'), h('div', h('small', 'Bonus für dein Heimatvolk'), h('b', o.bonusText)));
    if (k) {
      const n = kolonieGroesse(s, k);
      const idx = (s.welt?.kolonien ?? []).indexOf(k);
      fill(this.karte, kopf, h('p', o.text),
        h('div.wk-kolonie', { style: { '--fahne': FLAGGEN[idx % FLAGGEN.length] } },
          h('div.wk-kol-kopf', h('span.fahne'), h('div', h('small', 'Hier wohnt schon'), h('b', k.name))),
          h('div.wk-kol-groesse', h('small', 'Größe'), ameisen(n)),
          h('div.wk-kol-text', n >= 5 ? '🌟 Eine prächtige, große Kolonie! Deine Tochter-Königin ist sehr stolz.'
            : `🌱 Die Kolonie wächst jeden zweiten Ameisentag. Schon ${n} von 5!`)),
        bonus,
        h('div.wk-aktiv', '✅ Dieser Bonus ist schon aktiv.'));
      return;
    }
    fill(this.karte, kopf, h('p', o.text), fakten, bonus,
      h('button.btn.wk-start' + (st.ok ? '.lila' : '.grau'), { disabled: !st.ok, onclick: () => g.starteHochzeitsflug(o.id) }, '🪽 Hochzeitsflug hierher starten'),
      st.ok ? h('div.wk-tipp', 'Fliege durch möglichst viele Ringe – dann klappt die Landung!')
        : h('div.wk-grund', `${grundIcon(st.gruende[0] ?? '')} ${st.gruende[0] ?? 'Noch nicht bereit für den Hochzeitsflug.'}`));
  }
}
