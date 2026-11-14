// Spieloberfläche: Ressourcen, Volk-Fenster, Mission, Bauleiste, Aktionsknöpfe.
import { h, fmt, fill } from '../util.js';
import { GEBAEUDE, BEDUERFNISSE, RAENGE, hillUpgradeCost, HILL_MAX } from '../game/config.js';
import { aktuelleMission, fortschritt } from '../game/missions.js';
import { hochzeitsflugBereit } from '../game/sim.js';
import { RevierHUD } from './revierUI.js';
import { TECHS } from '../game/forschung.js';

const TIPPS = {
  nahrung: 'Mehr Sammlerinnen, Pilzgarten, Blattlaus-Weide oder Bäckerei – oder Denksport spielen!',
  wohnen: 'Baue Schlafkammern (und ein Möbelgeschäft).',
  freizeit: 'Kino, Restaurant, Fußballplatz oder Einkaufscenter bauen.',
  bildung: 'Buchhandlung, Kindergarten oder Universität bauen.',
  hygiene: 'Abfallkammer, Apotheke oder Brunnen bauen.',
  waerme: 'Hügel ausbauen oder eine Sonnenterrasse bauen.',
};
const gesicht = z => (z >= 85 ? '🤩' : z >= 70 ? '😊' : z >= 50 ? '🙂' : z >= 35 ? '😐' : z >= 20 ? '😟' : '😢');

export class HUD {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('hud');
    this.planSig = '';
    this.build();
  }

  build() {
    const g = this.game;
    this.res = {};
    const pill = (key, icon, titel) => {
      const el = h('div.pill', { 'data-res': key, title: titel }, h('span.ic', icon), h('span.v', '0'), h('small'), h('div.bar', h('i')));
      this.res[key] = el;
      return el;
    };
    this.kolonie = h('div.kolonie-card', { onclick: () => this.togglePanel(), title: 'Volk anzeigen' },
      h('div.krone', '👑'), h('div', h('div.name', ''), h('div.rang', '')));
    const top = h('div.topbar',
      this.kolonie,
      h('div.res-leiste',
        pill('sterne', '⭐', 'Sterne – verdienst du im Quiz. Damit baust du Kammern.'),
        pill('gang', '🧱', 'Gangstücke – zum Graben neuer Gänge.'),
        pill('nahrung', '🍯', 'Nahrung – Ameisen brauchen Futter!'),
        pill('material', '🪵', 'Baumaterial – holen deine Trupps im Revier (Shift). Für Hügel, Forschung und große Gebäude.'),
        pill('fp', '🔬', 'Forschungspunkte – für richtige Quizantworten und von Bildungsgebäuden. Damit erforschst du neue Techniken.'),
        pill('volk', '🐜', 'Ameisen in deinem Volk'),
        pill('zufrieden', '😊', 'Zufriedenheit des Volkes'),
      ),
      h('div.top-tools',
        h('button.icon-btn', { title: 'Aufgaben', onclick: () => g.openMissions() }, '📜'),
        h('button.icon-btn', { title: 'Wissensbuch – dein Lernfortschritt', onclick: () => g.openWissen() }, '📊'),
        h('button.icon-btn', { title: 'Fragen-Archiv – welche Fragen gab es, was ist richtig?', onclick: () => g.openArchiv() }, '🗂️'),
        this.forschBtn = h('button.icon-btn.forsch-btn', { title: 'Forschung & Entwicklung (F)', onclick: () => g.openForschung() }, '🔬', h('i.forsch-ring')),
        this.tempoBtn = h('button.icon-btn', { title: 'Spielgeschwindigkeit', onclick: () => g.toggleTempo() }, '▶️'),
        h('button.icon-btn', { title: 'Einstellungen', onclick: () => g.openSettings() }, '⚙️'),
      ),
    );
    this.panel = h('aside.volk-panel');
    this.mission = h('div.mission-card', { onclick: () => g.openMissions() });
    this.werkzeuge = h('div.werkzeuge',
      h('button.icon-btn', { 'data-tool': 'gang', title: 'Gänge graben (G)', onclick: () => g.setTool(g.tool === 'gang' ? null : 'gang') }, '⛏️'),
      h('button.icon-btn', { 'data-tool': 'abriss', title: 'Abreißen / Zuschütten (X)', onclick: () => g.setTool(g.tool === 'abriss' ? null : 'abriss') }, '🧹'),
    );
    this.karten = h('div.karten');
    this.buildbar = h('div.buildbar', this.werkzeuge, this.karten);
    const aktionen = h('div.aktionen',
      this.denkBtn = h('button.aktion-gross.denk', { onclick: () => g.openMinigames() }, h('span.em', '🧠'), 'Denksport'),
      this.quizBtn = h('button.aktion-gross.quiz', { onclick: () => g.openQuiz() }, h('span.em', '📚'), 'Quiz'),
    );
    const zoom = h('div.zoom-tools',
      h('button.icon-btn', { title: 'Hineinzoomen', onclick: () => g.zoom(1.25) }, '➕'),
      h('button.icon-btn', { title: 'Herauszoomen', onclick: () => g.zoom(0.8) }, '➖'),
      h('button.icon-btn', { title: 'Zur Königin / zum Hügel (H)', onclick: () => g.focusHome() }, '🏠'),
    );
    this.hinweis = h('div.hinweis-zeile', { hidden: true });
    // Modus-Schalter: Nest (bauen) ⇄ Revier (befehlen)
    this.schalter = h('div.modus-schalter', { role: 'group', 'aria-label': 'Ansicht wechseln' },
      h('button.ms-nest', { onclick: () => g.wechsleModus('nest'), title: 'Nest: graben & bauen (Shift)' }, h('span.em', '🏠'), h('span.t', 'Nest')),
      h('button.ms-revier', { onclick: () => g.wechsleModus('revier'), title: 'Revier: Ameisen Befehle geben (Shift)' }, h('span.em', '🗺️'), h('span.t', 'Revier')),
      h('i.ms-kugel'),
      h('kbd', '⇧ Shift'));
    fill(this.root, top, this.schalter, h('div.links', this.panel, this.mission), this.buildbar, aktionen, zoom, this.hinweis);
    this.revier = new RevierHUD(g, this.root);
    this.panel.after(this.revier.panel);
    this.panelOffen = window.innerWidth > 900;
    this.panel.classList.toggle('zu', !this.panelOffen);
  }

  befehl(k, v) {
    const b = this.game.state.befehle;
    if (k === 'bauMax') b.bauMax = Math.max(1, Math.min(6, b.bauMax + v)); else b[k] = v;
    this.panelSig = '';
    this.game.d = this.game.derive?.() ?? this.game.d;
    this.updatePanel(this.game.d);
  }

  modusGewechselt() {
    this.panelSig = ''; this.planSig = ''; this.missionSig = '';
    this.revier.sig = '';
    this.update(this.game.d);
  }

  togglePanel() {
    this.panelOffen = !this.panelOffen;
    this.panel.classList.toggle('zu', !this.panelOffen);
    this.panelSig = '';
  }

  zeigeHinweis(text, art = '', dauer = 2600) {
    this.hinweis.hidden = false;
    this.hinweis.className = 'hinweis-zeile' + (art ? ' ' + art : '');
    this.hinweis.textContent = text;
    clearTimeout(this._ht);
    if (dauer) this._ht = setTimeout(() => (this.hinweis.hidden = true), dauer);
  }
  versteckeHinweis() { this.hinweis.hidden = true; }

  bump(key) {
    const el = this.res[key];
    if (!el) return;
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  }

  update(d) {
    const s = this.game.state;
    const set = (k, v, sub, bar) => {
      const el = this.res[k];
      el.querySelector('.v').textContent = v;
      el.querySelector('small').textContent = sub ?? '';
      el.querySelector('.bar').style.display = bar == null ? 'none' : '';
      if (bar != null) el.querySelector('.bar i').style.width = Math.round(bar * 100) + '%';
    };
    set('sterne', fmt(s.res.sterne));
    set('gang', fmt(s.res.gang));
    set('nahrung', fmt(s.res.nahrung), `/ ${fmt(d.lager)}`, s.res.nahrung / d.lager);
    set('material', fmt(s.res.material ?? 0));
    set('fp', fmt(s.res.fp ?? 0));
    const fa = s.forschung?.aktiv;
    this.forschBtn.classList.toggle('laeuft', !!fa);
    this.forschBtn.style.setProperty('--p', fa ? Math.round(fa.t / TECHS[fa.id].dauer * 100) + '%' : '0%');
    if (fa) this.forschBtn.title = `Forschung: ${TECHS[fa.id].name} (${Math.round(fa.t / TECHS[fa.id].dauer * 100)} %)`;
    this.res.nahrung.classList.toggle('warn', s.res.nahrung < 8);
    set('volk', fmt(d.pop), `+${s.brut.length} 🥚`);
    set('zufrieden', Math.round(d.zufriedenheit) + ' %', null, d.zufriedenheit / 100);
    this.res.zufrieden.querySelector('.ic').textContent = gesicht(d.zufriedenheit);
    const rang = RAENGE[d.rang];
    this.kolonie.querySelector('.name').textContent = s.spieler.koloniename;
    this.kolonie.querySelector('.rang').textContent = `${rang.icon} ${rang.name} · Tag ${d.tag}`;
    this.tempoBtn.textContent = s.einstellungen.tempo === 2 ? '⏩' : '▶️';
    this.updateMission(d);
    if (this.game.modus === 'revier') { this.revier.refresh(); return; }
    this.updateBuildbar(d);
    if (this.panelOffen) this.updatePanel(d);
  }

  updateBuildbar() {
    const s = this.game.state, g = this.game;
    const sig = JSON.stringify(s.plaene) + g.tool + g.buildTyp + Math.floor(s.res.sterne / 5);
    for (const b of this.werkzeuge.children) b.classList.toggle('aktiv', g.tool === b.dataset.tool);
    if (sig === this.planSig) return;
    this.planSig = sig;
    const eintraege = Object.entries(s.plaene).filter(([, n]) => n > 0);
    if (!eintraege.length) {
      fill(this.karten, h('div.leer-hinweis', '📚 Keine Baupläne – spiele ein Quiz, um neue zu gewinnen!'));
      return;
    }
    fill(this.karten, ...eintraege.map(([typ, n]) => {
      const G = GEBAEUDE[typ];
      return h('button.bkarte' + (g.buildTyp === typ && g.tool === 'bauen' ? '.aktiv' : '') + (s.res.sterne < G.kosten ? '.zu-teuer' : ''),
        { 'data-plan': typ, title: `${G.name}: ${G.text}`, onclick: () => g.selectPlan(typ) },
        h('span.em', G.icon), h('span.nm', G.name), h('span.kosten', `⭐ ${G.kosten}`), h('span.anz', '×' + n));
    }));
  }

  updateMission(d) {
    const m = aktuelleMission(this.game.state);
    if (!m) { this.mission.hidden = true; return; }
    this.mission.hidden = false;
    const f = fortschritt(this.game.state, m, d);
    const lohn = [m.lohn.sterne && `⭐ ${m.lohn.sterne}`, m.lohn.gang && `🧱 ${m.lohn.gang}`, m.lohn.joker && `🃏 ${m.lohn.joker}`, m.lohn.material && `🪵 ${m.lohn.material}`, m.lohn.plan && `${GEBAEUDE[m.lohn.plan].icon} Bauplan`].filter(Boolean).join('  ');
    const sig = m.id + ':' + f.ist;
    if (sig !== this.missionSig) {
      this.missionSig = sig;
      fill(this.mission, 
        h('div.kopf', '📜 Aufgabe'),
        h('div.titel', `${m.icon} ${m.titel}`),
        h('div.txt', m.text),
        h('div.prog', h('i', { style: { width: f.p * 100 + '%' } })),
        h('div.lohn', `Belohnung: ${lohn}`),
      );
    }
    // Hinweis-Puls auf Ziel-Element
    document.querySelectorAll('.pulse-hinweis').forEach(e => { if (!m.hinweis || !e.matches(m.hinweis)) e.classList.remove('pulse-hinweis'); });
    if (m.hinweis && this.game.state.missionen.erledigt.length < 6) document.querySelector(m.hinweis)?.classList.add('pulse-hinweis');
  }

  updatePanel(d) {
    const s = this.game.state, g = this.game;
    const sig = JSON.stringify([Math.round(d.zufriedenheit), Object.values(d.quote).map(q => Math.round(q * 20)), d.jobs, s.volk, s.brut.length,
      d.wohnraum, d.brutPlatz, s.world.hill, Math.floor(s.res.sterne / 10), s.kronenStufe, s.res.gang, s.befehle, Math.floor((s.res.material ?? 0) / 5)]);
    if (sig === this.panelSig) return;
    this.panelSig = sig;
    const brut = { ei: 0, larve: 0, puppe: 0 };
    s.brut.forEach(b => brut[b.s]++);
    const needs = Object.entries(BEDUERFNISSE).map(([k, n]) => {
      const q = d.quote[k];
      return [h('div.need', { title: TIPPS[k] }, h('span', n.icon), h('div', h('div', { style: { fontSize: '.8rem', marginBottom: '2px' } }, n.name),
        h('div.track', h('i', { style: { width: q * 100 + '%', background: q < 0.5 ? '#ff6b6b' : n.farbe } }))), h('span.num', Math.round(q * 100) + '%')),
      q < 0.6 ? h('div.need-tipp', '💡 ' + TIPPS[k]) : null];
    });
    const lvl = s.world.hill;
    const kosten = hillUpgradeCost(lvl);
    const hz = hochzeitsflugBereit(s, d);
    fill(this.panel, ...[
      h('h3', '😊 Zufriedenheit'),
      h('div.zufrieden', h('span.gesicht', gesicht(d.zufriedenheit)), h('div', h('span.wert', Math.round(d.zufriedenheit) + ' %'),
        h('small', d.zufriedenheit >= 60 ? 'Dein Volk ist glücklich und wächst!' : d.zufriedenheit >= 35 ? 'Es geht so – erfülle die Wünsche!' : 'Dein Volk ist unglücklich!'))),
      needs,
      h('h3', '🐜 Dein Volk'),
      h('div.stat-grid',
        h('div.stat', 'Arbeiterinnen', h('b', fmt(s.volk.arbeiterinnen))),
        h('div.stat', 'Drohnen', h('b', fmt(s.volk.drohnen))),
        h('div.stat', '🧺 Sammlerinnen', h('b', d.jobs.sammler)),
        h('div.stat', '👷 Bauarbeiterinnen', h('b', d.jobs.bau)),
        h('div.stat', '🍼 Ammen', h('b', d.jobs.ammen)),
        h('div.stat', '🎓 Fachkräfte', h('b', d.jobs.personal)),
        h('div.stat', '🥚 Brut', h('b', `${brut.ei} · ${brut.larve} · ${brut.puppe}`), h('span', { style: { fontSize: '.7rem' } }, 'Ei · Larve · Puppe')),
        h('div.stat', 'Plätze', h('b', `🛏️ ${d.wohnraum} · 🥚 ${d.brutPlatz}`)),
      ),
      h('div.stat', { style: { marginTop: '6px' } }, '🍯 Nahrung pro Minute', h('b', `+${(d.nahrungProSek * 60).toFixed(0)} / −${(d.verbrauch * 60).toFixed(0)}`)),
      h('h3', '📋 Arbeitsverteilung'),
      h('div.befehl-zeile', h('span', '👷 Bauarbeiterinnen je Baustelle'),
        h('div.stepper', h('button', { onclick: () => this.befehl('bauMax', -1) }, '−'), h('b', s.befehle.bauMax), h('button', { onclick: () => this.befehl('bauMax', 1) }, '+'))),
      h('div.befehl-zeile', h('span', '🍼 Ammen für die Brut'),
        h('div.seg.mini', ['wenig', 'normal', 'viel'].map(k => h('button' + (s.befehle.ammen === k ? '.an' : ''), { onclick: () => this.befehl('ammen', k) }, k)))),
      h('div.befehl-zeile', h('span', `🗺️ Im Revier: ${d.jobs.revier} Ameisen`), h('button.btn.klein.blau', { onclick: () => g.wechsleModus('revier') }, 'Befehle ⇧')),
      h('h3', `👑 Königin · Kronenstufe ${s.kronenStufe}`),
      h('div.slider-row', h('div', `Drohnen-Anteil bei neuen Eiern: `, h('b', Math.round(s.volk.drohnenAnteil * 100) + ' %')),
        h('input', { type: 'range', min: 0, max: 40, value: Math.round(s.volk.drohnenAnteil * 100), oninput: e => { s.volk.drohnenAnteil = e.target.value / 100; e.target.previousSibling.querySelector('b').textContent = e.target.value + ' %'; } }),
        h('div.req', 'Drohnen arbeiten nicht, brauchen aber Futter. Du brauchst sie für den Hochzeitsflug.')),
      h('div.panel-actions',
        lvl < HILL_MAX
          ? [h('button.btn.klein', { 'data-act': 'huegel', onclick: () => g.upgradeHill() }, `⛰️ Hügel ausbauen (Stufe ${lvl + 1})`),
            h('div.req', `Kosten: ⭐ ${kosten.sterne} · 🧱 ${kosten.gang}${kosten.material ? ` · 🪵 ${kosten.material}` : ''}${kosten.pop ? ` · ab ${kosten.pop} Ameisen` : ''} — mehr Platz & Wärme`)]
          : h('div.req', '⛰️ Dein Hügel hat die volle Größe!'),
        h('button.btn.klein.lila', { disabled: !hz.ok, onclick: () => g.hochzeitsflug() }, '🪽 Hochzeitsflug starten'),
        hz.ok ? h('div.req', 'Bereit! Drohnen und junge Königinnen gründen neue Kolonien.') : h('div.req', { style: { whiteSpace: 'pre-line' } }, hz.gruende.map(x => '• ' + x).join('\n')),
      ),
    ].flat(Infinity).filter(Boolean));
  }
}
