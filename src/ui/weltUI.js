// Oberfläche der Welt-Ansicht: Panel (Hochzeitsflug, Übungsflüge, alle 20 Ameisenstaaten & Orte, Netz)
// und eine Karte zum gewählten Ort – frei (Hochzeitsflug: Ringflug oder Wespenalarm) oder besiedelt
// (Kennzahlen, „Kolonie besuchen & bauen", Verbindungen mit Ausbau, neue Straßen & Botenlinien).
import { h, fill } from '../util.js';
import { ORTE, ALLE_ORTE, ortById, flugParameter, wespenParameter, biom as biomVon } from '../game/welt.js';
import { kolonieIds, aktiveId } from '../game/kolonien.js';
import { kolonieListe, routeMoeglich, routeAusbauInfo, ROUTEN, BESUCHE } from '../game/zivilisation.js';

const DIST = ['', 'Nah', 'Mittel', 'Weit', 'Sehr weit'];
const FLAGGEN = ['#4fa3ff', '#ff9f1c', '#a77bff', '#ff6b9b', '#2ec4b6', '#ffd34d', '#5fd068', '#f45b69', '#9b5de5'];
const RES_ICON = { sterne: '⭐', material: '🪵', fp: '🔬' };

/** Freundliches Symbol zu einem fehlenden Grund */
function grundIcon(t) {
  const s = (t ?? '').toLowerCase();
  if (s.includes('startplatz') || s.includes('flugfeld')) return '🛫';
  if (s.includes('drohn')) return '🪽';
  if (s.includes('arbeiter')) return '🐜';
  if (s.includes('zufrieden')) return '😊';
  if (s.includes('königin') || s.includes('prinzess')) return '👑';
  if (s.includes('nahrung') || s.includes('honig')) return '🍯';
  if (s.includes('nacht')) return '🌙';
  if (s.includes('regen') || s.includes('wetter')) return '🌧️';
  if (s.includes('⭐') || s.includes('stern')) return '⭐';
  if (s.includes('🪵')) return '🪵';
  if (s.includes('🔬')) return '🔬';
  return '🔸';
}
const kostenText = k => Object.entries(k ?? {}).filter(([, v]) => v).map(([r, v]) => `${v}${RES_ICON[r] ?? ''}`).join(' ');
const punkte = e => h('span.wd-punkte', { 'data-e': e }, [1, 2, 3, 4].map(k => h('i' + (k <= e ? '.an' : ''))));
const balken = (anteil, cls = '') => h('span.wk-balken' + cls, h('i', { style: { width: `${Math.round(Math.max(0, Math.min(1, anteil)) * 100)}%` } }));
const fertig = r => (r.bau ?? 1) >= 1;

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
    this.karte.addEventListener('pointerleave', () => this.vorschau(null));
    window.addEventListener('pointerup', () => setTimeout(() => { this.druck = false; }, 60));
  }

  get R() { return this.game.weltR; }
  vorschau(v) { if (this.R) this.R.vorschauRoute = v; }

  waehle(ort) {
    this.auswahl = ort?.id ?? null;
    if (this.R) this.R.selected = this.auswahl;
    this.vorschau(null);
    this.refresh(true);
  }

  status() {
    try { return this.game.hochzeitsflugStatus() ?? { ok: false, gruende: [] }; }
    catch { return { ok: false, gruende: [] }; }
  }

  /** Kennzahlen aller Kolonien (Heimatnest + Tochterkolonien) */
  liste() {
    const s = this.game.state, d = this.game.d;
    try { return kolonieListe(s, d && d.pop != null ? d : null); }
    catch { return kolonieIds(s).map(id => ({ id, name: id, ort: ortById(id), biom: ortById(id)?.biom ?? 'heim', pop: 0, zufriedenheit: 0, fuellung: 0, gebaeude: 0, baustellen: 0, hotel: { stufe: 0 }, aktiv: id === aktiveId(s) })); }
  }

  refresh(force = false) {
    if (!document.body.classList.contains('modus-welt')) return;
    const s = this.game.state;
    if (!s) return;
    const st = this.status();
    const liste = this.liste();
    const gegruendet = new Set(liste.map(k => k.id));
    this.hinweis.textContent = this.auswahl ? '' : st.ok ? '🪽 Die junge Königin ist bereit! Tippe auf einen freien Ort auf der Karte.' : '🗺️ Tippe auf einen Ort oder eine Kolonie, um mehr zu erfahren.';
    this.hinweis.hidden = !!this.auswahl;
    if (this.druck && !force) return;
    const W = s.welt ?? {};
    const netz = {
      strassen: (W.strassen ?? []).filter(fertig).length, strBau: (W.strassen ?? []).filter(r => !fertig(r)).length,
      boten: (W.boten ?? []).filter(fertig).length, botBau: (W.boten ?? []).filter(r => !fertig(r)).length, gaeste: (W.besuche ?? []).length,
    };
    const sig = JSON.stringify([st.ok, st.gruende, st.drohnen, liste.map(k => [k.id, k.name, k.pop, Math.round(k.zufriedenheit ?? 0), Math.round((k.fuellung ?? 0) * 20), k.aktiv]), netz, W.fluege, this.auswahl]);
    if (force || sig !== this.sig) { this.sig = sig; this.renderPanel(st, liste, netz); }
    const km = this.kartenModell(st, liste, gegruendet);
    const ksig = JSON.stringify(km);
    if (force || ksig !== this.ksig) { this.ksig = ksig; this.renderKarte(km, st); }
  }

  zeige(o) {
    const R = this.R;
    if (R && o) {
      // Ort mittig in den freien Bereich zwischen Panel (links) und Ortskarte (rechts) rücken
      const links = this.panel.getBoundingClientRect().right || 0, rechts = R.vw - (R.vw > 820 ? 400 : 0);
      R.selected = o.id;
      R.centerOn(o.x + (R.vw / 2 - (Math.max(0, links) + rechts) / 2) / R.cam.z, o.y);
    }
    this.waehle(o);
  }

  // ------------------------------------------------------------ Panel
  renderPanel(st, liste, netz) {
    const g = this.game, s = g.state, w = s.welt ?? { kolonien: [], fluege: 0 };
    const gegruendet = new Set(liste.map(k => k.id));
    const frei = ORTE.filter(o => !gegruendet.has(o.id));
    const flagge = id => { const i = (w.kolonien ?? []).findIndex(k => k.ort === id); return id === 'heim' ? '#e8323c' : FLAGGEN[(i < 0 ? 0 : i) % FLAGGEN.length]; };
    fill(this.panel,
      h('div.wp-kopf', h('span.em', '🌍'), h('div', h('div.tt', 'Die Welt'),
        h('div.unter', `${liste.length} von ${ALLE_ORTE.length} Ameisenstaaten · ${w.fluege ?? 0} ${(w.fluege ?? 0) === 1 ? 'Flug' : 'Flüge'}`))),
      st.ok
        ? h('div.wp-status.ok', h('span.em', '✅'), h('div', h('b', 'Bereit für den Hochzeitsflug!'), h('small', 'Wähle einen freien Ort auf der Karte.')))
        : h('div.wp-status', h('div.wp-status-kopf', h('span.em', '🪽'), h('b', 'Hochzeitsflug – es fehlt noch:')),
          h('ul', (st.gruende.length ? st.gruende : ['Noch nicht bereit']).map(x => h('li', h('span', grundIcon(x)), h('span', x))))),
      h('div.wp-ueben',
        h('div.wp-ueben-kopf', h('b', '🎈 Üben – ganz ohne Voraussetzungen'), h('small', 'Es entsteht keine Kolonie, aber es macht Spaß!')),
        h('div.wp-ueben-knoepfe',
          h('button.btn.klein.blau', { onclick: () => g.uebungsflug?.('ringe'), title: 'Durch goldene Ringe fliegen – nur zum Üben' }, '🎯 Übungs-Ringflug'),
          h('button.btn.klein.pink', { onclick: () => g.uebungsflug?.('wespen'), title: 'Wespen ausweichen und Power-ups sammeln – nur zum Üben' }, '🐝 Übungs-Wespenalarm'))),
      h('div.wp-netz',
        h('span', { title: 'Ameisenstraßen: Waren & Gäste' }, `🛣️ ${netz.strassen}`, netz.strBau ? h('small', ` +${netz.strBau} im Bau`) : null),
        h('span', { title: 'Botenlinien: Wissen' }, `📨 ${netz.boten}`, netz.botBau ? h('small', ` +${netz.botBau} im Bau`) : null),
        h('span', { title: 'Gäste unterwegs' }, `🧳 ${netz.gaeste}`, h('small', ' unterwegs'))),
      h('h4', `🚩 Unsere Ameisenstaaten (${liste.length})`),
      h('div.wp-liste', liste.map(k => {
        const o = k.id === 'heim' ? ALLE_ORTE[0] : ortById(k.id);
        if (!o) return null;
        const B = biomVon(k.biom);
        return h('button.wk-zeile' + (this.auswahl === k.id ? '.an' : '') + (k.aktiv ? '.aktiv' : ''), { onclick: () => this.zeige(o), style: { '--fahne': flagge(k.id) } },
          h('span.fahne'),
          h('span.nm', k.name, k.aktiv ? h('em.hier', '📍 hier') : null),
          h('span.ort', `${B.icon} ${k.id === 'heim' ? B.name : o.name}`),
          h('span.mini', h('span', { title: 'Ameisen' }, `🐜 ${k.pop ?? 0}`), h('span', { title: 'Zufriedenheit' }, `😊 ${Math.round(k.zufriedenheit ?? 0)} %`),
            h('span.futter', { title: `Vorrat ${Math.round((k.fuellung ?? 0) * 100)} %` }, '🍯', balken(k.fuellung ?? 0, (k.fuellung ?? 0) < 0.2 ? '.leer' : ''))));
      })),
      h('h4', `📍 Freie Orte (${frei.length})`),
      frei.length ? h('div.wp-liste', frei.map(o => h('button.wo-zeile' + (this.auswahl === o.id ? '.an' : ''), { onclick: () => this.zeige(o) },
        h('span.em', o.icon), h('span.nm', o.name),
        h('span.dist', punkte(o.entfernung), h('small', DIST[o.entfernung])),
        h('span.bonus', `🎁 ${o.bonusText}`))))
        : h('p.wp-leer', h('span.em', '🌌'), 'Alle Orte sind besiedelt – ein ganzes Ameisenreich!'),
    );
  }

  // ------------------------------------------------------------ Karte rechts
  kartenModell(st, liste, gegruendet) {
    const s = this.game.state, id = this.auswahl;
    const o = ALLE_ORTE.find(x => x.id === id);
    if (!o) return null;
    if (!gegruendet.has(id)) {
      let fp = null, wp = null;
      try { fp = flugParameter(s, o); wp = wespenParameter(s, o); } catch { /* ältere Spielstände */ }
      return { art: 'frei', id, ok: st.ok, gruende: st.gruende.slice(0, 3), ringe: fp?.ringe ?? 10 + o.entfernung * 4, dauer: wp?.dauer ?? 40 + o.entfernung * 12, wind: o.entfernung >= 3 };
    }
    const k = liste.find(x => x.id === id);
    const W = s.welt ?? {};
    const routen = [...(W.strassen ?? []), ...(W.boten ?? [])].filter(r => r.a === id || r.b === id).map(r => {
      const andere = r.a === id ? r.b : r.a;
      const a = r.art === 'strasse' ? routeAusbauInfo(s, r) : null;
      return { id: r.id, art: r.art, andere, name: liste.find(x => x.id === andere)?.name ?? ortById(andere)?.name ?? andere, stufe: r.stufe ?? 1, bau: fertig(r) ? 1 : Math.floor((r.bau ?? 0) * 100) / 100, ausbau: a ? { ok: a.ok, grund: a.grund, kosten: kostenText(a.kosten), ziel: a.ziel } : null };
    });
    const verbinden = liste.filter(x => x.id !== id).map(x => {
      const zeile = { id: x.id, name: x.name };
      for (const art of ['strasse', 'boten']) {
        const m = routeMoeglich(s, art, id, x.id);
        const vorhanden = [...(art === 'boten' ? W.boten ?? [] : W.strassen ?? [])].some(r => (r.a === id && r.b === x.id) || (r.b === id && r.a === x.id));
        zeile[art] = { ok: m.ok, grund: m.grund ?? null, kosten: kostenText(m.kosten), vorhanden };
      }
      return zeile;
    });
    return {
      art: 'kolonie', id, name: k?.name ?? o.name, biom: k?.biom ?? o.biom, aktiv: !!k?.aktiv,
      pop: k?.pop ?? 0, zuf: Math.round(k?.zufriedenheit ?? 0), fuell: Math.round((k?.fuellung ?? 0) * 100),
      gebaeude: k?.gebaeude ?? 0, baustellen: k?.baustellen ?? 0, hotel: k?.hotel?.stufe ?? 0, plaetze: k?.hotel?.plaetze ?? 0,
      bildung: k?.bildungName ?? null, routen, verbinden,
      gaeste: (W.besuche ?? []).filter(b => b.nach === id).map(b => b.art),
    };
  }

  kopf(o, untertitel, cls = '') {
    const g = this.game;
    return h('div.wk-kopf' + cls, { 'data-e': o.entfernung }, h('span.em', o.icon),
      h('div', h('div.tt', untertitel[0]), h('div.unter', untertitel[1])),
      h('button.zu', { 'aria-label': 'Schließen', onclick: () => { if (g.weltR) g.weltR.selected = null; this.waehle(null); } }, '✕'));
  }

  renderKarte(m, st) {
    this.vorschau(null);
    if (!m) { this.karte.hidden = true; return; }
    this.karte.hidden = false;
    const g = this.game, o = ALLE_ORTE.find(x => x.id === m.id);
    if (m.art === 'frei') {
      const knopf = (modus, icon, name, sub, cls) => h('button.btn.wk-flug-btn' + (m.ok ? cls : '.grau'), {
        disabled: !m.ok, title: m.ok ? `${name} starten` : (m.gruende[0] ?? 'Noch nicht bereit'), onclick: () => g.starteHochzeitsflug(o.id, modus),
      }, h('span.em', icon), h('span.t', name), h('small', sub));
      fill(this.karte,
        this.kopf(o, [o.name, [punkte(o.entfernung), ` ${DIST[o.entfernung]} vom Heimatnest`]]),
        h('p', o.text),
        h('div.wk-fakten',
          h('div', h('span', '💫'), h('b', m.ringe), h('small', 'goldene Ringe')),
          h('div', h('span', '⏱️'), h('b', `${m.dauer} s`), h('small', 'Wespenalarm')),
          h('div', h('span', m.wind ? '🌬️' : '🍃'), h('b', m.wind ? 'Wind' : 'Ruhig'), h('small', m.wind ? 'Windböen!' : 'kaum Wind'))),
        h('div.wk-bonus', h('span.em', '🎁'), h('div', h('small', 'Bonus für alle Ameisenstaaten'), h('b', o.bonusText))),
        h('div.wk-flug-titel', '🪽 Hochzeitsflug hierher – wähle dein Spiel:'),
        h('div.wk-flug',
          knopf('ringe', '🎯', 'Ringflug', 'durch goldene Ringe fliegen', '.lila'),
          knopf('wespen', '🐝', 'Wespenalarm', 'Wespen ausweichen, Power-ups sammeln', '.pink')),
        h('div.wk-modi',
          h('div', h('b', '🎯 Ringflug: '), 'Steuere die junge Königin durch möglichst viele goldene Ringe – dann klappt die Landung.'),
          h('div', h('b', '🐝 Wespenalarm: '), 'Weiche den Wespen aus und sammle viele Power-ups, bis du am Ziel bist.')),
        m.ok ? h('div.wk-tipp', 'Beide Spiele gründen hier eine neue Kolonie!')
          : h('div.wk-grund', h('b', 'Noch nicht bereit:'), h('ul', (m.gruende.length ? m.gruende : ['Noch nicht bereit für den Hochzeitsflug.']).map(x => h('li', `${grundIcon(x)} ${x}`))),
            h('small', 'Üben kannst du jederzeit links mit den Übungsflügen!')));
      return;
    }
    // ---------- besiedelter Ort / Heimatnest
    const B = biomVon(m.biom);
    const heim = m.id === 'heim';
    const rows = m.routen.map(r => {
      const R = ROUTEN[r.art], nm = r.name;
      const stufe = r.art === 'strasse' ? R.stufen[Math.max(0, r.stufe - 1)] : R.stufen[0];
      return h('div.wk-route' + (r.art === 'boten' ? '.boten' : ''), {
        onmouseenter: () => this.vorschau({ art: r.art, a: m.id, b: r.andere, vorhanden: true }), onmouseleave: () => this.vorschau(null),
      },
      h('span.em', r.art === 'boten' ? '📨' : ['', '🟫', '🛣️', '✨'][r.stufe] ?? '🛣️'),
      h('div.info', h('b', nm), h('small', r.bau < 1 ? `${r.art === 'boten' ? 'Botenlinie' : stufe} – wird gebaut …` : `${stufe}${r.art === 'strasse' ? ` · Stufe ${r.stufe}/3` : ''}`),
        r.bau < 1 ? balken(r.bau, '.bau') : null),
      r.ausbau && r.bau >= 1 ? h('button.btn.klein' + (r.ausbau.ok ? '.gruen' : '.grau'), {
        disabled: !r.ausbau.ok, title: r.ausbau.ok ? `Ausbauen zur ${r.ausbau.ziel}` : r.ausbau.grund,
        onclick: () => { g.routeAusbauen?.(r.id); this.refresh(true); },
      }, h('span', `⬆️ ${r.ausbau.ziel}`), h('small', r.ausbau.kosten)) : null,
      r.ausbau && r.bau >= 1 && !r.ausbau.ok && r.ausbau.grund ? h('small.grund', r.ausbau.grund) : null,
      !r.ausbau && r.art === 'strasse' && r.bau >= 1 ? h('span.max', '🌟 höchste Stufe') : null);
    });
    const verb = m.verbinden.map(v => {
      const knopf = (art, icon, name) => {
        const x = v[art];
        if (x.vorhanden) return h('span.wk-da', { onmouseenter: () => this.vorschau({ art, a: m.id, b: v.id, vorhanden: true }), onmouseleave: () => this.vorschau(null) }, `✓ ${name}`);
        return h('button.btn.klein' + (x.ok ? (art === 'boten' ? '.lila' : '.gruen') : '.grau'), {
          disabled: !x.ok, title: x.ok ? `${ROUTEN[art].name} bauen: ${x.kosten}` : x.grund,
          onmouseenter: () => this.vorschau({ art, a: m.id, b: v.id }), onmouseleave: () => this.vorschau(null),
          onfocus: () => this.vorschau({ art, a: m.id, b: v.id }), onblur: () => this.vorschau(null),
          onclick: () => { g.baueRoute?.(art, m.id, v.id); this.vorschau(null); this.refresh(true); },
        }, h('span', `${icon} ${name}`), h('small', x.kosten));
      };
      const grund = [v.strasse, v.boten].find(x => !x.ok && !x.vorhanden && x.grund)?.grund;
      const vo = v.id === 'heim' ? ALLE_ORTE[0] : ortById(v.id);
      return h('div.wk-verb',
        h('div.wer', h('span.em', vo?.icon ?? '🐜'), h('b', v.name)),
        h('div.knoepfe', knopf('strasse', '🛣️', 'Straße'), knopf('boten', '📨', 'Botenlinie')),
        grund ? h('small.grund', `${grundIcon(grund)} ${grund}`) : null);
    });
    fill(this.karte,
      this.kopf({ ...o, icon: B.icon }, [m.name, [heim ? `🏡 Heimatnest · ${B.name}` : o.name === B.name ? `${o.icon} ${o.name}` : `${o.icon} ${o.name} · ${B.name}`]], '.kolonie'),
      m.aktiv ? h('div.wk-hier', '📍 Du bist hier – diese Kolonie siehst du gerade im Nest.') : null,
      h('div.wk-stats',
        h('div', h('span', '🐜'), h('b', m.pop), h('small', 'Ameisen')),
        h('div', h('span', '😊'), h('b', `${m.zuf} %`), h('small', 'Zufriedenheit')),
        h('div', h('span', '🍯'), h('b', `${m.fuell} %`), balken(m.fuell / 100, m.fuell < 20 ? '.leer' : ''), h('small', 'Vorrat')),
        h('div', h('span', '🏠'), h('b', m.gebaeude), h('small', m.baustellen ? `Gebäude · ${m.baustellen} im Bau` : 'Gebäude')),
        h('div', h('span', '🏨'), h('b', m.hotel ? `Stufe ${m.hotel}` : '—'), h('small', m.hotel ? `Hotel · ${m.plaetze} Plätze` : 'kein Hotel')),
        h('div', h('span', '🎓'), h('b.klein', m.bildung ?? '—'), h('small', 'Bildung'))),
      h('button.btn.gross.gruen.wk-besuchen', { onclick: () => g.besucheKolonie?.(m.id) }, m.aktiv ? '🏠 Zum Nest & weiterbauen' : '🏠 Kolonie besuchen & bauen'),
      m.gaeste.length ? h('div.wk-gaeste', '🧳 Gäste unterwegs hierher: ', m.gaeste.map(a => h('span', { title: BESUCHE[a]?.name }, BESUCHE[a]?.icon ?? '🐜'))) : null,
      !heim ? h('div.wk-bonus', h('span.em', '🎁'), h('div', h('small', 'Bonus für alle Ameisenstaaten (aktiv)'), h('b', o.bonusText))) : null,
      h('h5', `🛤️ Verbindungen (${m.routen.length})`),
      rows.length ? h('div.wk-routen', rows) : h('div.wk-leer', 'Noch keine Verbindung. Baue unten eine Ameisenstraße oder Botenlinie!'),
      h('h5', '🔗 Verbinden'),
      h('div.wk-erkl', h('span', '🛣️ Straße: Waren & Gäste'), h('span', '📨 Botenlinie: Wissen')),
      verb.length ? h('div.wk-verbinden', verb) : h('div.wk-leer', '🥚 Gründe eine weitere Kolonie mit einem Hochzeitsflug – dann kannst du sie verbinden.'));
  }
}
