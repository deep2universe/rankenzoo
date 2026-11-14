// Ameisen-Beobachtung: Steckbrief-Karte einer einzelnen Ameise (Name, Wohlbefinden, Vorhaben,
// Freundschaften, Wohnung, Schule, Erlebnisse). Die Karte bleibt offen, während das Spiel weiterläuft.
import { h, fill } from '../util.js';
import { steckbrief } from '../game/buerger.js';
import { drawAnt } from '../render/antdraw.js';

export class AmeisenKarte {
  constructor(game, root) {
    this.game = game;
    this.bid = null;
    this.folgen = false;
    this.el = h('aside.ameisen-karte', { hidden: true, 'aria-live': 'polite' });
    this.portrait = h('canvas.ak-portrait', { width: 180, height: 140 });
    root.append(this.el);
    this.el.addEventListener('pointerdown', () => { this.druck = true; });
    window.addEventListener('pointerup', () => setTimeout(() => { this.druck = false; }, 60));
    this.t = 0;
  }

  get offen() { return this.bid != null; }

  zeige(bid) {
    this.bid = bid;
    this.el.hidden = false;
    this.sig = '';
    this.game.renderer.agents.beobachtet = bid;
    const st = this.game.state.stats;
    st.beobachtet = (st.beobachtet ?? 0) + 1;
    this.render(true);
    this.malePortrait();
  }

  schliesse() {
    this.bid = null;
    this.folgen = false;
    this.el.hidden = true;
    this.game.renderer.agents.beobachtet = null;
    this.game.renderer.agents.name = null;
  }

  ant() { return this.game.renderer.agents.byBid(this.bid); }

  /** Portrait: die Ameise mit ihrem Accessoire, sanft animiert. */
  malePortrait() {
    const cv = this.portrait, c = cv.getContext('2d');
    const loop = now => {
      if (!this.offen || !cv.isConnected) return;
      const a = this.ant();
      const t = now / 1000;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, cv.width, cv.height);
      const g = c.createRadialGradient(90, 80, 10, 90, 80, 90);
      g.addColorStop(0, '#fff6d8'); g.addColorStop(1, '#f2d9a6');
      c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height);
      c.fillStyle = 'rgba(120,80,30,.18)'; c.beginPath(); c.ellipse(88, 118, 46, 7, 0, 0, 7); c.fill();
      const drohne = a?.rolle === 'drohne';
      drawAnt(c, { x: 94, y: 112 + Math.sin(t * 2) * 1.2, L: 92, dir: 1, tilt: Math.sin(t * 1.3) * 0.03, phase: t * 2, rolle: drohne ? 'drohne' : 'arbeiterin',
        acc: a?.job === 'bau' ? 'muetze' : a?.acc, wings: drohne, walking: false, last: a?.last ?? null });
      setTimeout(() => requestAnimationFrame(loop), 60);
    };
    requestAnimationFrame(loop);
  }

  update() {
    if (!this.offen) return;
    const a = this.ant();
    // Folgen: Kamera gleitet mit
    if (this.folgen && a && a.hidden <= 0) {
      const R = this.game.renderer;
      const [sx, sy] = R.worldToScreen(a.x, a.y);
      R.pan((R.vw * 0.42 - sx) * 0.12, (R.vh / 2 - sy) * 0.12);
      this.game.poke();
    }
    this.render();
  }

  render(force = false) {
    const g = this.game, s = g.state;
    const a = this.ant();
    const sb = steckbrief(s, g.d, this.bid, a);
    if (!sb) { this.schliesse(); return; }
    g.renderer.agents.name = sb.name.split(' ')[0];
    const sig = JSON.stringify([sb.tut, sb.wohl, sb.ereignisse.length, sb.freundin?.id, sb.freund?.id, sb.schule, sb.wohnText, !!a, a?.hidden > 0, this.folgen]);
    if (!force && (sig === this.sig || this.druck)) return;
    this.sig = sig;
    const wechsel = id => { const ant = g.renderer.agents.byBid(id); this.zeige(id); if (ant) g.renderer.centerOn(ant.x, ant.y); };
    const person = (p, icon, leer) => p
      ? h('button.ak-freund', { onclick: () => wechsel(p.id), title: 'Steckbrief ansehen' }, icon, ' ', h('b', p.name))
      : h('span.ak-freund.leer', icon, ' ', leer);
    fill(this.el,
      h('div.ak-kopf',
        h('div.ak-bild', this.portrait),
        h('div.ak-titel',
          h('div.ak-name', sb.name),
          h('div.ak-rolle', `${sb.m ? '🪽' : '🐜'} ${sb.beruf} · ${sb.alter === 0 ? 'heute geschlüpft' : `${sb.alter} Ameisentag${sb.alter === 1 ? '' : 'e'} jung`}`),
          h('div.ak-wohl', h('span.em', sb.stimmung.em), h('div.ak-track', h('i', { style: { width: sb.wohl + '%' } })), h('small', `${sb.stimmung.txt}`))),
        h('button.ak-zu', { 'aria-label': 'Schließen', onclick: () => this.schliesse() }, '✕')),
      h('blockquote.ak-zitat', `„${sb.satz}“`),
      h('div.ak-zeile', h('span.ak-lbl', '👀 Gerade'), h('span', `${sb.name.split(' ')[0]} ${a ? (a.hidden > 0 && a.job === 'sammler' ? sb.tut : sb.tut) : 'ist gerade woanders im Nest unterwegs'}.`)),
      h('div.ak-zeile', h('span.ak-lbl', '🗓️ Vorhaben'), h('span', sb.vorhaben)),
      h('div.ak-zeile', h('span.ak-lbl', '🏠 Zuhause'), h('span', `${sb.m ? 'Er' : 'Sie'} ${sb.wohnText}.`)),
      h('div.ak-zeile', h('span.ak-lbl', '🎓 Lernen'), h('span', `${sb.m ? 'Er' : 'Sie'} ${sb.schule}.`)),
      h('div.ak-freunde',
        h('div', h('small', '💛 Beste Freundin'), person(sb.freundin, '🐜', 'noch auf der Suche – bald!')),
        h('div', h('small', '💙 Bester Freund'), person(sb.freund, '🪽', 'sobald Drohnen schlüpfen!'))),
      h('div.ak-zeile.klein', h('span.ak-lbl', '😋 Lieblingsessen'), h('span', sb.essen)),
      h('div.ak-traum', '🌟 ', sb.traum),
      h('div.ak-ereignisse', h('small', '📖 Erlebnisse'), h('ul', sb.ereignisse.slice(0, 5).map(e => h('li', h('b', `Tag ${e.tag}: `), `${sb.name.split(' ')[0]} ${e.text}`)))),
      h('div.ak-knoepfe',
        h('button.btn.klein' + (this.folgen ? '.gruen' : '.grau'), { disabled: !a, onclick: () => { this.folgen = !this.folgen; this.render(true); } }, this.folgen ? '📍 Folge ich …' : '📍 Folgen'),
        h('button.btn.klein.grau', { onclick: () => { const ant = this.ant(); if (ant) { g.renderer.centerOn(ant.x, ant.y); g.poke(); } } }, '🎯 Zeigen')),
    );
  }
}
