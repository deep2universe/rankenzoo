// Oberfläche des Revier-Modus: Kommando-Panel, Quellen-Karte und Befehlsleiste.
import { h, fill, fmt } from '../util.js';
import { QUELLEN, STOERER, REVIER, FUNDE, GEBAEUDE } from '../game/config.js';
import { distNest, distBasis, erkundetAnteil, expSlots, handelMoeglich, NEST, lagerKosten, lagerAusbauInfo, lagerTyp } from '../game/revier.js';
import { gebaeudeBild } from '../render/vorschau.js';
import { TECHS } from '../game/forschung.js';

const proMin = v => (v * 60 >= 10 ? Math.round(v * 60) : (v * 60).toFixed(1).replace('.', ','));
const ROH = { nahrung: '🍯', material: '🪵', sterne: '⭐', tau: '🧼', fp: '🔬', gang: '🧱' };
const preis = o => Object.entries(o).map(([k, v]) => `${v} ${ROH[k]}`).join(' + ');

export class RevierHUD {
  constructor(game, root) {
    this.game = game;
    this.expGroesse = 2;
    this.sig = '';
    this.panel = h('aside.revier-panel');
    this.karte = h('aside.quelle-karte', { hidden: true });
    this.groesse = h('div.exp-groesse', [1, 2, 3, 5].map(n => h('button', { 'data-n': n, onclick: () => { this.expGroesse = n; this.refresh(true); }, title: `${n} Erkunderinnen` }, '🐜'.repeat(Math.min(n, 3)) + (n > 3 ? '+' : ''), h('small', n))));
    this.expBtn = h('button.befehl', { onclick: () => this.expWerkzeug(), title: 'Expedition in den Nebel schicken (E)' }, h('span.em', '🔭'), h('span', 'Erkunden'));
    this.zeltBtn = h('button.befehl', { onclick: () => this.zeltWerkzeug(), title: 'Zelt aufstellen (Z): Expeditionen starten dort, Wege werden kürzer' }, h('span.em', '⛺'), h('span', 'Zelt'));
    this.leiste = h('div.befehlsleiste',
      this.expBtn,
      h('div.exp-wahl', h('small', 'Gruppe'), this.groesse),
      this.zeltBtn,
      h('div.trenner'),
      h('button.befehl', { onclick: () => game.openForschung(), title: 'Forschung & Entwicklung (F)' }, h('span.em', '🔬'), h('span', 'Forschung')),
      h('button.befehl', { onclick: () => game.focusHome(), title: 'Zum Hügel (H)' }, h('span.em', '⛰️'), h('span', 'Hügel')),
    );
    this.hinweis = h('div.revier-hinweis', { hidden: true });
    root.append(this.panel, this.karte, this.leiste, this.hinweis);
    // Während ein Knopf gedrückt wird, nichts neu aufbauen (sonst gehen Klicks verloren)
    for (const el of [this.panel, this.karte]) {
      el.addEventListener('pointerdown', () => { this.druck = true; });
      el.addEventListener('pointerleave', () => { this.druck = false; });
    }
    window.addEventListener('pointerup', () => setTimeout(() => { this.druck = false; }, 60));
  }

  expWerkzeug() {
    const R = this.game.revierR;
    R.tool = R.tool === 'exp' ? null : 'exp';
    this.refresh(true);
  }

  zeltWerkzeug() {
    const g = this.game, R = g.revierR;
    if (!g.state.bauplaene?.zelt) {
      g.hinweisToast?.('Für Zelte brauchst du den Bauplan „Expeditions-Zelt" – gewinne ihn mit einem perfekten Test (Sachunterricht)!', '⛺');
      return;
    }
    R.tool = R.tool === 'zelt' ? null : 'zelt';
    this.refresh(true);
  }

  waehleLager(l) {
    this.lagerAuswahl = l?.id ?? null;
    this.game.revierR.lagerSel = this.lagerAuswahl;
    if (l) { this.auswahl = null; this.game.revierR.selected = null; }
    this.refresh(true);
  }

  waehle(q) {
    this.auswahl = q?.id ?? null;
    if (q) { this.lagerAuswahl = null; this.game.revierR.lagerSel = null; }
    this.refresh(true);
  }

  refresh(force = false) {
    const g = this.game, s = g.state, d = g.d, r = s.revier;
    if (!d || !document.body.classList.contains('modus-revier')) return;
    const R = g.revierR;
    // Hinweis für das Expeditions-Werkzeug
    this.hinweis.hidden = R.tool !== 'exp' && R.tool !== 'zelt';
    if (R.tool === 'exp') this.hinweis.textContent = `🔭 Tippe auf ein Ziel – ${this.expGroesse} Erkunderinnen laufen los (vom nächsten Lager aus) und lüften den Nebel. (Esc = abbrechen)`;
    if (R.tool === 'zelt') { const k = lagerKosten(r); this.hinweis.textContent = `⛺ Tippe auf einen freien, erkundeten Platz – Zelt für ${k.sterne} ⭐ + ${k.material} 🪵. Grün = passt. (Esc = abbrechen)`; }
    this.expBtn.classList.toggle('aktiv', R.tool === 'exp');
    this.zeltBtn.classList.toggle('aktiv', R.tool === 'zelt');
    this.zeltBtn.classList.toggle('gesperrt', !s.bauplaene?.zelt);
    for (const b of this.groesse.children) b.classList.toggle('an', +b.dataset.n === this.expGroesse);

    if (this.druck && !force) return;
    const sig = JSON.stringify([d.jobs.sammler, d.jobs.revier, Math.round(d.revierFaktor * 10), r.exp.map(e => [e.id, e.phase, Math.round(e.t / 4)]),
      Object.entries(r.trupps), r.quellen.map(q => [q.entdeckt ? 1 : 0, q.stoerer ? 1 : 0]), r.wetter.typ, d.istNacht, r.handel.angebote.map(a => a.genutzt),
      Math.round(d.revier.nahrung * 60), Math.round(d.revier.material * 60), this.auswahl, s.forschung.aktiv?.id, Math.floor((s.forschung.aktiv?.t ?? 0) / 10),
      Math.floor(s.res.fp / 5), r.gefunden, (r.lager ?? []).map(l => [l.id, l.stufe, Math.round(l.bau * 10)]), (r.sammlung ?? []).length, Math.round((d.revier.pollen ?? 0) * 600)]);
    const q = r.quellen.find(x => x.id === this.auswahl);
    const ksig = q ? JSON.stringify([q.id, r.trupps[q.id], q.stoerer ? Math.round(q.stoerer.kraft / q.stoerer.max * 10) : -1, Math.round(q.menge / q.max * 20),
      Math.round((d.revier.pro.get(q.id) ?? 0) * 600), d.jobs.sammler, q.entdeckt]) : '';
    if (force || sig !== this.sig) { this.sig = sig; this.renderPanel(d); }
    const l = (r.lager ?? []).find(x => x.id === this.lagerAuswahl);
    const lsig = l ? JSON.stringify([l.id, l.stufe, Math.round(l.bau * 20), Math.floor(s.res.sterne / 10), Math.floor((s.res.material ?? 0) / 5)]) : '';
    if (l) { if (force || lsig !== this.lsig) { this.lsig = lsig; this.renderLagerKarte(l); } return; }
    this.lsig = '';
    if (force || ksig !== this.ksig) { this.ksig = ksig; this.renderKarte(d); }
  }

  renderPanel(d) {
    const g = this.game, s = g.state, r = s.revier;
    const frei = g.freieAmeisen();
    const b = d.bedarf;
    const trupps = Object.entries(r.trupps).map(([qid, t]) => [r.quellen.find(q => q.id === +qid), t]).filter(([q]) => q);
    const handel = handelMoeglich(s, d.fx);
    const fa = s.forschung.aktiv;
    fill(this.panel,
      h('div.rp-kopf', h('span.em', '🗺️'), h('div', h('div.tt', 'Revier-Kommando'), h('div.unter', `${r.wetter.typ === 'regen' ? '🌧️ Regen' : d.istNacht ? '🌙 Nacht' : '☀️ Sonnig'} · ${Math.round(erkundetAnteil(r) * 100)} % erkundet`))),
      h('div.rp-ameisen',
        h('div.gross', h('b', frei), h('small', 'freie Arbeiterinnen')),
        h('div.chips', h('span', { title: 'Sammlerinnen im Revier' }, `🧺 ${b.s}`), h('span', { title: 'Wächterinnen' }, `🛡️ ${b.w}`), h('span', { title: 'Auf Expedition' }, `🔭 ${b.e}`)),
      ),
      d.revierFaktor < 0.999 ? h('div.rp-warn', `⚠️ Zu wenige freie Ameisen: Trupps arbeiten nur mit ${Math.round(d.revierFaktor * 100)} %.`) : null,
      h('h4', '📦 Erträge aus dem Revier'),
      h('div.rp-ertrag',
        h('span', { title: 'Nahrung pro Minute' }, `🍯 +${proMin(d.revier.nahrung)}`),
        h('span', { title: 'Baumaterial pro Minute' }, `🪵 +${proMin(d.revier.material)}`),
        d.revier.pollen ? h('span', { title: 'Davon Pollen – eiweißreich, die Brut wächst schneller' }, `🌸 Pollen +${proMin(d.revier.pollen)} · Brut +${Math.round(Math.min(0.3, (d.fx.pollen ?? 0) / 30) * 100)} %`) : null,
        d.revier.sterne ? h('span', { title: 'Sterne pro Minute' }, `⭐ +${proMin(d.revier.sterne)}`) : null,
        d.revier.tau ? h('span', { title: 'Sauberkeit für so viele Ameisen' }, `🧼 ${Math.round(d.revier.tau)}`) : null,
        h('span.dim', { title: 'Freie Sammlerinnen rund ums Nest' }, `🐜 Nest-Sammlerinnen: +${proMin(d.sammelRate)} 🍯`),
      ),
      h('h4', `🧺 Trupps (${trupps.length})`),
      trupps.length ? h('div.rp-liste', trupps.map(([q, t]) => {
        const Q = QUELLEN[q.typ];
        const rate = d.revier.pro.get(q.id) ?? 0;
        return h('button.rp-zeile' + (this.auswahl === q.id ? '.an' : '') + (q.stoerer ? '.alarm' : ''), { onclick: () => { g.revierR.selected = q.id; g.revierR.centerOn((q.x + 0.5) * REVIER.TILE, (q.y + 0.5) * REVIER.TILE); this.waehle(q); } },
          h('span.em', q.stoerer ? STOERER[q.stoerer.typ].icon : Q.icon),
          h('span.nm', Q.name), h('span.zahl', `🧺${t.s}${t.w ? ' 🛡️' + t.w : ''}`),
          h('span.rate', Q.gibt === 'tau' ? `🧼${Math.round(rate)}` : `+${proMin(rate)} ${ROH[Q.gibt]}`));
      })) : h('p.rp-leer', 'Noch keine Trupps. Tippe auf eine Futterquelle auf der Karte und schicke Sammlerinnen hin!'),
      h('h4', `🔭 Expeditionen (${r.exp.length}/${expSlots(d.fx)})`),
      r.exp.length ? h('div.rp-liste', r.exp.map(e => {
        const ges = Math.hypot(e.tx - NEST.x, e.ty - NEST.y) || 1;
        const p = e.phase === 'hin' ? 0.5 * (1 - Math.hypot(e.tx - e.x, e.ty - e.y) / ges) : e.phase === 'suche' ? 0.5 : 0.5 + 0.5 * (1 - Math.hypot(e.x - NEST.x, e.y - NEST.y) / ges);
        return h('div.rp-exp', h('span', e.phase === 'suche' ? '🔍' : e.phase === 'heim' ? '🏠' : '🚩'), h('span', `${e.n} Erkunderinnen · ${e.phase === 'hin' ? 'unterwegs' : e.phase === 'suche' ? 'suchen …' : 'auf dem Heimweg'}`),
          h('div.mini-track', h('i', { style: { width: Math.round(p * 100) + '%' } })));
      })) : h('p.rp-leer', `Wähle „🔭 Erkunden" unten und tippe in den Nebel. Dort warten neue Quellen, Schätze (${r.gefunden}/5 gefunden) und ein Nachbarvolk!`),
      fa ? h('button.rp-forschung', { onclick: () => g.openForschung() }, h('span', TECHS[fa.id].icon), h('div', h('small', 'Forschung läuft'), h('b', TECHS[fa.id].name), h('div.mini-track', h('i', { style: { width: Math.round(fa.t / TECHS[fa.id].dauer * 100) + '%' } }))))
        : h('button.rp-forschung.leer', { onclick: () => g.openForschung() }, h('span', '🔬'), h('div', h('small', `${Math.floor(s.res.fp)} Forschungspunkte`), h('b', 'Neues Projekt starten →'))),
      h('h4', `⛺ Lager (${(r.lager ?? []).length}/${REVIER.maxLager})`),
      (r.lager ?? []).length ? h('div.rp-liste', r.lager.map(l => h('button.rp-zeile' + (this.lagerAuswahl === l.id ? '.an' : ''), { onclick: () => { g.revierR.centerOn((l.x + 0.5) * REVIER.TILE, (l.y + 0.5) * REVIER.TILE); this.waehleLager(l); } },
        h('span.em', GEBAEUDE[lagerTyp(l)].icon), h('span.nm', GEBAEUDE[lagerTyp(l)].name), h('span.zahl', l.bau < 1 ? `🏗️ ${Math.round(l.bau * 100)} %` : '✓'))))
        : h('p.rp-leer', s.bauplaene?.zelt ? 'Stelle mit „⛺ Zelt" unten ein Lager im erkundeten Gebiet auf – Expeditionen starten dann dort und Sammel-Wege werden kürzer.' : '🔒 Zelte gibt es mit dem Bauplan „Expeditions-Zelt" (perfekter Test, vor allem in Sachunterricht).'),
      h('h4', `🧺 Fundstücke (${(r.sammlung ?? []).length}/${Object.keys(FUNDE).length})`),
      h('div.rp-funde', Object.entries(FUNDE).map(([k, F]) => (r.sammlung ?? []).includes(k)
        ? h('span.fund.da', { title: `${F.name}: ${F.text}` }, F.icon)
        : h('span.fund', { title: 'Noch nicht gefunden – irgendwo im Nebel …' }, '❔'))),
      h('h4', '🤝 Handel'),
      handel.ok ? h('div.rp-handel', r.handel.angebote.map((a, i) => h('button.angebot', { disabled: a.genutzt, onclick: () => g.handeln(i) },
        h('span', preis(a.gib)), h('span.pfeil', '➜'), h('b', preis(a.bekomm)))), h('small.dim', `Neue Angebote in ${Math.ceil(r.handel.timer)} s`))
        : h('p.rp-leer', handel.grund),
    );
  }

  renderLagerKarte(l) {
    const g = this.game, s = g.state;
    const typ = lagerTyp(l), G = GEBAEUDE[typ];
    const info = lagerAusbauInfo(s, l);
    this.karte.hidden = false;
    fill(this.karte,
      h('div.qk-kopf', h('span.em', G.icon), h('div', h('div.tt', G.name), h('div.unter', l.bau < 1 ? `🏗️ Wird aufgebaut: ${Math.round(l.bau * 100)} %` : `Stufe ${l.stufe} von 3 · Sicht ${G.sicht} Felder`)),
        h('button.zu', { 'aria-label': 'Schließen', onclick: () => this.waehleLager(null) }, '✕')),
      h('p', G.text),
      h('div.qk-info', '🔭 Expeditionen in der Nähe starten hier. 🧺 Sammel-Trupps zu nahen Quellen haben kürzere Wege.'),
      info ? h('div.ausbau-box' + (info.frei ? '' : '.zu'),
        h('h4', info.frei ? `⬆️ Ausbauen zu ${GEBAEUDE[info.ziel].name}` : `🔒 Nächste Stufe: ${GEBAEUDE[info.ziel].name}`),
        h('div.lager-vorschau', gebaeudeBild(info.ziel, { zoom: 0.6 }), h('small', GEBAEUDE[info.ziel].text)),
        info.frei ? h('button.btn.gruen.klein', { disabled: !info.ok, onclick: () => g.lagerAusbauen(l) }, `⬆️ Ausbauen (⭐ ${info.kosten.sterne} · 🪵 ${info.kosten.material})`) : null,
        info.ok ? null : h('div.req', info.grund)) : h('div.qk-info', '🌟 Höchste Stufe erreicht!'),
    );
  }

  renderKarte(d) {
    const g = this.game, s = g.state, r = s.revier;
    const q = r.quellen.find(x => x.id === this.auswahl);
    if (!q) { this.karte.hidden = true; return; }
    this.karte.hidden = false;
    const Q = QUELLEN[q.typ];
    const t = r.trupps[q.id] ?? { s: 0, w: 0 };
    const dist = distBasis(r, q);
    const rate = d.revier.pro.get(q.id) ?? 0;
    const zahlReihe = (art, icon, label, tipp) => h('div.zr', { title: tipp },
      h('span.lb', icon, ' ', label),
      h('button.pm', { onclick: e => g.trupp(q.id, art, e.shiftKey ? -5 : -1), 'aria-label': label + ' weniger' }, '−'),
      h('b', t[art] ?? 0),
      h('button.pm', { onclick: e => g.trupp(q.id, art, e.shiftKey ? 5 : 1), 'aria-label': label + ' mehr' }, '+'),
      h('button.pm.fuenf', { onclick: () => g.trupp(q.id, art, 5), title: '5 mehr' }, '+5'));
    const kopf = h('div.qk-kopf', h('span.em', Q.icon), h('div', h('div.tt', Q.name), h('div.unter', `📏 ${dist.toFixed(1).replace('.', ',')} Felder ${dist < distNest(q) - 0.01 ? 'vom nächsten Lager ⛺' : 'vom Hügel'}`)),
      h('button.zu', { 'aria-label': 'Schließen', onclick: () => { g.revierR.selected = null; this.waehle(null); } }, '✕'));
    if (q.typ === 'fund') {
      const F = FUNDE[q.fund];
      fill(this.karte, h('div.qk-kopf', h('span.em', F?.icon ?? '✨'), h('div', h('div.tt', F?.name ?? 'Fundstück'), h('div.unter', `📏 ${distBasis(r, q).toFixed(1).replace('.', ',')} Felder vom nächsten Stützpunkt`)),
        h('button.zu', { 'aria-label': 'Schließen', onclick: () => { g.revierR.selected = null; this.waehle(null); } }, '✕')),
        h('p', 'Da glitzert etwas im Gras! Schicke eine Expedition hin, um es nach Hause zu bringen.'),
        h('button.btn.gruen.klein', { onclick: () => g.expedition(q.x, q.y, this.expGroesse) }, `🔭 ${this.expGroesse} Erkunderinnen hinschicken`));
      return;
    }
    if (!Q.gibt) {
      fill(this.karte, kopf, h('p', Q.text),
        q.typ === 'schatz' ? h('button.btn.gruen.klein', { onclick: () => g.expedition(q.x, q.y, this.expGroesse) }, `🔭 ${this.expGroesse} Erkunderinnen hinschicken`) : null,
        q.typ === 'nachbar' ? h('div.qk-info', handelMoeglich(s, d.fx).ok ? '🤝 Handel ist möglich – siehe links im Kommando-Panel.' : '🔒 ' + handelMoeglich(s, d.fx).grund) : null);
      return;
    }
    const p = q.menge / q.max;
    fill(this.karte, kopf,
      h('p', Q.text),
      Q.gibt !== 'tau' ? h('div.qk-vorrat', h('span', 'Vorrat'), h('div.mini-track', h('i', { style: { width: Math.round(p * 100) + '%', background: p > 0.5 ? '#5fd068' : p > 0.2 ? '#ffc93c' : '#ff6b6b' } })),
        h('small', Q.regen ? `wächst nach` : 'wächst nicht nach')) : null,
      q.stoerer ? h('div.qk-alarm', h('span.em', STOERER[q.stoerer.typ].icon), h('div', h('b', `${STOERER[q.stoerer.typ].name} ${STOERER[q.stoerer.typ].text}!`),
        h('div', t.w ? `Deine ${t.w} Wächterinnen verscheuchen ihn …` : 'Der Ertrag sinkt stark. Schicke Wächterinnen 🛡️, um ihn freundlich zu verscheuchen.'),
        h('div.mini-track.rot', h('i', { style: { width: Math.round(q.stoerer.kraft / q.stoerer.max * 100) + '%' } })))) : null,
      zahlReihe('s', '🧺', 'Sammlerinnen', 'Holen Rohstoffe. Mehr Sammlerinnen = mehr Ertrag (aber mit abnehmendem Zuwachs).'),
      zahlReihe('w', '🛡️', 'Wächterinnen', 'Beschützen die Quelle und verscheuchen Störenfriede.'),
      h('div.qk-ertrag', Q.gibt === 'tau' ? `🧼 Sauberkeit für ${Math.round(rate)} Ameisen` : `Ertrag: +${proMin(rate)} ${ROH[Q.gibt]} pro Minute`,
        h('small', `Freie Arbeiterinnen: ${g.freieAmeisen()} · Shift+Klick = 5 auf einmal`)),
    );
  }
}
