// Holo-HUD der Welt-Ansicht: ein holografisches Head-Up-Display über der Weltkarte.
// Eigenes Overlay-Canvas (Säulen, Bögen, Duftwolken, Scan-Strahl …) plus ein gläsernes
// Bedienpult rechts mit fünf Ansichten: Zivilisationen · Netzwerk & Handel · Krabbelschow-Skala ·
// Duftstoffe · Entwicklung. Die Daten kommen aus src/game/zivilisation.js, die Kamera aus game.weltR.
import { h, fill, clamp, lerp } from '../util.js';
import { sfx } from '../audio.js';
import { drawEmoji, drawGlow } from '../render/sprites.js';
import { ortById, ORT_ANZAHL, BIOME } from '../game/welt.js';
import {
  kolonieListe, krabbelschow, bewusstsein, duftKarte, bedarf, fluesse, netzGruppen,
  ROUTEN, BESUCHE, DUEFTE, routeMoeglich, distanz,
} from '../game/zivilisation.js';

const TAU = Math.PI * 2;
const FONT = 'Fredoka, Nunito, sans-serif';
const ER = 0.42; // Ellipsen-Verhältnis für den 3D-Eindruck (Blick schräg von oben)
const SPEICHER = 'ameisenreich.holo';
const ROEM = ['0', 'I', 'II', 'III', 'IV', 'V'];

export const HOLO_VIEWS = [
  { id: 'zivilisationen', icon: '🏛️', name: 'Zivilisationen', kurz: 'Kolonien', farbe: '#6fe0ff' },
  { id: 'netzwerk', icon: '🕸️', name: 'Netzwerk & Handel', kurz: 'Netzwerk', farbe: '#ffc56b' },
  { id: 'skala', icon: '📈', name: 'Krabbelschow-Skala', kurz: 'Skala', farbe: '#d6a8ff' },
  { id: 'duft', icon: '👃', name: 'Duftstoffe', kurz: 'Düfte', farbe: '#8dffb4' },
  { id: 'entwicklung', icon: '🏗️', name: 'Entwicklung', kurz: 'Bauen', farbe: '#ffa36b' },
];
const VIEW_ALIAS = { zivil: 'zivilisationen', kolonien: 'zivilisationen', netz: 'netzwerk', handel: 'netzwerk', duefte: 'duft', bau: 'entwicklung', bedarf: 'entwicklung' };

const TYP0 = { nr: 0, name: 'Einzelnes Nest', icon: '🐜', farbe: '#9fc4ff', text: 'Ein Ameisenvolk lebt in seinem ersten Nest und lernt sein Revier kennen.' };
const TEILE = {
  kolonien: ['🏛️', 'Kolonien', '#6fe0ff'], strassen: ['🛣️', 'Straßen', '#ffb347'], boten: ['📨', 'Botinnen', '#4f9dff'],
  hotels: ['🏨', 'Hotels', '#ff8fb1'], bauten: ['🏗️', 'Bauten', '#ff9f43'], wissen: ['📐', 'Baupläne', '#b18cff'], begegnungen: ['🤝', 'Begegnungen', '#5fffb0'],
};
const PRIO = [
  { farbe: '#5fffb0', name: 'Alles gut' }, { farbe: '#ffe066', name: 'Tipp' },
  { farbe: '#ffa94d', name: 'Wichtig' }, { farbe: '#ff4d6d', name: 'Dringend' },
];
const GRUPPEN_FARBEN = ['#6fe0ff', '#ff8fb1', '#ffd36b', '#8dffb4', '#d6a8ff', '#ff9f43'];
const KOSTEN_ICON = { sterne: '⭐', material: '🪵', fp: '🔬' };

// ---------------------------------------------------------------- kleine Helfer
const ease = t => 1 - (1 - clamp(t, 0, 1)) ** 3;
const easeBack = t => { t = clamp(t, 0, 1); return 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2; };
const prozent = x => `${Math.round(clamp(x, 0, 1) * 100)} %`;
const komma = (x, n = 1) => x.toFixed(n).replace('.', ',');
const rgbHex = hex => { const v = parseInt(hex.slice(1), 16); return `${(v >> 16) & 255},${(v >> 8) & 255},${v & 255}`; };
function hslRgb(hh, s, l) {
  const k = n => (n + hh / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return `${f(0)},${f(8)},${f(4)}`;
}
/** Zufriedenheit 0–100 → Farbe von Rot über Gelb nach Türkis. */
const zufriedenRgb = z => hslRgb((lerp(-4, 168, clamp((z - 25) / 70, 0, 1)) + 360) % 360, 1, 0.6);
const kostenText = k => Object.entries(k ?? {}).filter(([, v]) => v).map(([key, v]) => `${KOSTEN_ICON[key] ?? key} ${v}`).join(' · ');
const biomName = id => BIOME[id]?.name ?? 'Heimatwiese';
const biomIcon = id => BIOME[id]?.icon ?? '🏡';

/** Quadratischer Bogen zwischen zwei Bildschirmpunkten, „angehoben" wie ein Lichtbogen über der Karte. */
function bogen(ax, ay, bx, by, lift) {
  const d = Math.hypot(bx - ax, by - ay);
  return { ax, ay, bx, by, cx: (ax + bx) / 2, cy: (ay + by) / 2 - d * lift, d };
}
function bp(b, t) { const u = 1 - t; return [u * u * b.ax + 2 * u * t * b.cx + t * t * b.bx, u * u * b.ay + 2 * u * t * b.cy + t * t * b.by]; }
function bogenPfad(c, b, t0 = 0, t1 = 1) {
  c.beginPath();
  if (t0 === 0 && t1 === 1) { c.moveTo(b.ax, b.ay); c.quadraticCurveTo(b.cx, b.cy, b.bx, b.by); return; }
  const n = 18;
  for (let i = 0; i <= n; i++) { const [x, y] = bp(b, t0 + (t1 - t0) * (i / n)); if (i) c.lineTo(x, y); else c.moveTo(x, y); }
}

function schrift(c, s, x, y, size, farbe = '#eaffff', weight = 600, align = 'center') {
  c.font = `${weight} ${Math.round(size)}px ${FONT}`;
  c.textAlign = align; c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
  c.strokeStyle = 'rgba(2,10,30,.88)'; c.lineWidth = Math.max(3, size * 0.3);
  c.strokeText(s, x, y);
  c.fillStyle = farbe; c.fillText(s, x, y);
}
/** Holo-Kapsel mit Text (und optionalem Emoji) – gut lesbar auf jeder Kartenstelle. */
function kapsel(c, x, y, text, size, rgb, alpha = 1, emoji = null) {
  c.font = `700 ${Math.round(size)}px ${FONT}`;
  const tw = c.measureText(text).width, ew = emoji ? size * 1.25 : 0;
  const w = tw + ew + size * 1.1, hh = size * 1.65;
  const x0 = x - w / 2, y0 = y - hh / 2;
  c.globalAlpha = alpha;
  c.fillStyle = 'rgba(4,16,40,.82)';
  c.strokeStyle = `rgba(${rgb},.95)`; c.lineWidth = 1.5;
  c.beginPath(); c.roundRect(x0, y0, w, hh, hh / 2); c.fill(); c.stroke();
  if (emoji) drawEmoji(c, emoji, x0 + size * 0.55 + ew / 2, y + size * 0.36, size * 0.95, 1);
  c.fillStyle = `rgb(${rgb})`; c.textAlign = 'left'; c.textBaseline = 'middle';
  c.fillStyle = '#f2feff';
  c.fillText(text, x0 + size * 0.55 + ew, y + 1);
  c.textBaseline = 'alphabetic';
  c.globalAlpha = 1;
  return w;
}
function ellipseRing(c, x, y, r, rgb, a, lw = 2, dash = null, rot = 0) {
  if (!(r > 0.5) || a <= 0.005) return;
  c.strokeStyle = `rgba(${rgb},${a})`; c.lineWidth = lw;
  if (dash) { c.setLineDash(dash); c.lineDashOffset = rot; }
  c.beginPath(); c.ellipse(x, y, r, r * ER, 0, 0, TAU); c.stroke();
  if (dash) c.setLineDash([]);
}
/** Leuchtende Holo-Säule (Zylinder mit wandernden Ringen). */
function saeule(c, x, y, hgt, r, rgb, a, t) {
  if (hgt < 1 || a <= 0.01) return;
  const ry = r * ER, top = y - hgt;
  drawGlow(c, rgb, x, y, r * 3.4, 0.55 * a);
  const g = c.createLinearGradient(0, y, 0, top);
  g.addColorStop(0, `rgba(${rgb},${0.6 * a})`); g.addColorStop(1, `rgba(${rgb},${0.14 * a})`);
  c.fillStyle = g;
  c.beginPath(); c.moveTo(x - r, top); c.lineTo(x - r, y); c.ellipse(x, y, r, ry, 0, Math.PI, 0, true);
  c.lineTo(x + r, top); c.ellipse(x, top, r, ry, 0, 0, Math.PI, true); c.closePath(); c.fill();
  // Kanten und Deckel
  c.strokeStyle = `rgba(${rgb},${0.9 * a})`; c.lineWidth = 1.3;
  c.beginPath(); c.moveTo(x - r, y); c.lineTo(x - r, top); c.moveTo(x + r, y); c.lineTo(x + r, top); c.stroke();
  c.fillStyle = `rgba(${rgb},${0.45 * a})`;
  c.beginPath(); c.ellipse(x, top, r, ry, 0, 0, TAU); c.fill();
  c.strokeStyle = `rgba(255,255,255,${0.75 * a})`; c.stroke();
  // Lichtkante (Glanz)
  c.strokeStyle = `rgba(255,255,255,${0.35 * a})`; c.lineWidth = 1;
  c.beginPath(); c.moveTo(x - r * 0.45, y + ry * 0.6); c.lineTo(x - r * 0.45, top + ry * 0.4); c.stroke();
  // wandernde Ringe
  for (let k = 0; k < 3; k++) {
    const f = (t * 0.35 + k / 3) % 1;
    ellipseRing(c, x, y - f * hgt, r * 1.02, rgb, (1 - f) * 0.7 * a, 1.2);
  }
  drawGlow(c, rgb, x, top, r * 2.2, 0.5 * a);
}

function speichern(o) { try { localStorage.setItem(SPEICHER, JSON.stringify(o)); } catch { /* egal */ } }
function laden() { try { return JSON.parse(localStorage.getItem(SPEICHER) ?? 'null') ?? {}; } catch { return {}; } }

// ================================================================= Holo-HUD
export class WeltHolo {
  constructor(game, root) {
    this.game = game;
    this.root = root;
    // Stylesheet selbst nachladen, falls index.html es (noch) nicht einbindet
    if (!document.querySelector('link[href$="holo.css"]')) {
      document.head.append(h('link', { rel: 'stylesheet', href: new URL('../../styles/holo.css', import.meta.url).href }));
    }
    const s = laden();
    this.an = false;
    this.view = HOLO_VIEWS.some(v => v.id === s.view) ? s.view : 'zivilisationen';
    this.altView = null;
    this.viewMix = 1;
    this.duftFilter = new Set(Array.isArray(s.filter) ? s.filter.filter(f => DUEFTE[f]) : Object.keys(DUEFTE));
    if (!this.duftFilter.size) for (const k of Object.keys(DUEFTE)) this.duftFilter.add(k);
    this.t = 0;
    this.anim = 99;           // Sekunden seit dem letzten Ein-/Ausschalten
    this.warWelt = false;
    this.gezeichnet = false;
    this.D = null; this.datenZeit = -1;
    this.sig = '';
    this.druck = false;
    this.kamFlug = null;
    this.frei = { l: 0, r: window.innerWidth };
    this.reduziert = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', e => { this.reduziert = e.matches; });

    // --- Overlay-Canvas (unter allen HUD-Elementen, über der Karte)
    this.canvas = h('canvas.holo-canvas', { 'aria-hidden': 'true' });
    this.ctx = this.canvas.getContext('2d');
    this.scan = h('div.holo-scanlines', { 'aria-hidden': 'true' });
    // --- Schalter
    this.schalter = h('button.holo-schalter', { title: 'Holo-HUD ein/aus (U)', 'aria-pressed': 'false', onclick: () => this.toggle() },
      h('span.em', '🛰️'), h('span.t', 'Holo-HUD'), h('kbd', 'U'));
    // --- Bedienpult
    this.tabs = HOLO_VIEWS.map((v, i) => h('button.hk-tab', {
      'data-view': v.id, style: { '--tab': v.farbe }, title: `${v.name} (${i + 1})`, onclick: () => this.setView(v.id),
    }, h('span.em', v.icon), h('span.t', v.kurz), h('kbd', String(i + 1))));
    this.typChip = h('span.hk-typ', '');
    this.titel = h('div.hk-titel', '');
    this.inhalt = h('div.hk-inhalt');
    this.meldung = h('div.hk-meldung', { hidden: true });
    this.konsole = h('aside.holo-konsole', { 'aria-label': 'Holo-HUD' },
      h('i.hk-ecke.lo'), h('i.hk-ecke.ro'), h('i.hk-ecke.lu'), h('i.hk-ecke.ru'),
      h('div.hk-kopf',
        h('span.hk-logo', '🛰️'),
        h('div.hk-kopf-txt', h('b', 'HOLO-HUD'), this.titel),
        this.typChip,
        h('button.hk-klein', { title: 'Einklappen', 'aria-label': 'Einklappen', onclick: () => this.konsole.classList.toggle('klein') }, '▾'),
        h('button.hk-zu', { title: 'Holo-HUD ausschalten (U)', 'aria-label': 'Holo-HUD ausschalten', onclick: () => this.toggle(false) }, '✕')),
      h('nav.hk-tabs', this.tabs),
      this.inhalt, this.meldung);
    for (const el of [this.konsole]) {
      el.addEventListener('pointerdown', () => { this.druck = true; });
      el.addEventListener('pointerleave', () => { this.druck = false; });
    }
    window.addEventListener('pointerup', () => setTimeout(() => { this.druck = false; }, 80));
    this._einhaengen();
    this._markiereTabs();
    if (s.an) this.toggle(true, true);
  }

  _einhaengen() {
    if (!this.root) return;
    if (!this.canvas.isConnected) this.root.prepend(this.scan), this.root.prepend(this.canvas);
    if (!this.schalter.isConnected) this.root.append(this.schalter);
    if (!this.konsole.isConnected) this.root.append(this.konsole);
  }

  get dauerEin() { return this.reduziert ? 0.4 : 2.4; }
  get dauerAus() { return this.reduziert ? 0.3 : 0.85; }

  // ---------------------------------------------------------------- Ein/Aus & Ansicht
  toggle(wert = !this.an, leise = false) {
    wert = !!wert;
    if (wert === this.an) return this.an;
    this.an = wert;
    this.anim = 0;
    document.body.classList.toggle('holo-an', wert);
    this.konsole.classList.toggle('an', wert);
    this.schalter.classList.toggle('an', wert);
    this.schalter.setAttribute('aria-pressed', String(wert));
    if (wert && !leise) this._rahmen();
    if (wert) {
      this.konsole.classList.remove('glitch'); void this.konsole.offsetWidth; this.konsole.classList.add('glitch');
      this.refresh(true);
    }
    if (!leise) (wert ? sfx.holoAn ?? sfx.whoosh : sfx.holoAus ?? sfx.whoosh)?.();
    speichern({ an: wert, view: this.view, filter: [...this.duftFilter] });
    return wert;
  }

  setView(name) {
    let id = typeof name === 'number' ? HOLO_VIEWS[name - 1]?.id : VIEW_ALIAS[name] ?? name;
    if (!HOLO_VIEWS.some(v => v.id === id)) return;
    if (!this.an) this.toggle(true);
    if (id === this.view) return;
    this.altView = this.view; this.view = id; this.viewMix = 0;
    this._markiereTabs();
    this.inhalt.scrollTop = 0;
    this._wechselAnim();
    (sfx.holoTab ?? sfx.click)?.();
    speichern({ an: this.an, view: this.view, filter: [...this.duftFilter] });
    this.refresh(true);
  }

  /** Inhalte beim Ansichtswechsel einfliegen lassen (nur einmal – nicht bei jedem Neuaufbau). */
  _wechselAnim() {
    this.inhalt.classList.remove('wechsel'); void this.inhalt.offsetWidth; this.inhalt.classList.add('wechsel');
    clearTimeout(this._wechselT);
    this._wechselT = setTimeout(() => this.inhalt.classList.remove('wechsel'), 800);
  }

  _markiereTabs() {
    const v = HOLO_VIEWS.find(x => x.id === this.view);
    for (const t of this.tabs) t.classList.toggle('an', t.dataset.view === this.view);
    this.konsole.style.setProperty('--akzent', v.farbe);
    this.titel.textContent = `${v.icon} ${v.name}`;
  }

  /** Tastatur (nur in der Welt-Ansicht): U = an/aus, 1–5 = Ansicht. Gibt true zurück, wenn verarbeitet. */
  onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    const tg = e.target;
    if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return false;
    if (e.key === 'u' || e.key === 'U') { this.toggle(); return true; }
    if (this.an && /^[1-5]$/.test(e.key)) { this.setView(Number(e.key)); return true; }
    return false;
  }

  // ---------------------------------------------------------------- Daten
  holeDaten() {
    const g = this.game, s = g.state;
    if (!s?.welt) return null;
    try {
      const d = g.d;
      const liste = kolonieListe(s, d);
      const byId = Object.fromEntries(liste.map(k => [k.id, k]));
      const ks = krabbelschow(s);
      const bw = bewusstsein(s);
      const gruppen = netzGruppen(s);
      const gruppeVon = {};
      gruppen.forEach((gr, i) => gr.forEach(id => { gruppeVon[id] = i; }));
      const D = {
        liste, byId, ks, bw, gruppen, gruppeVon,
        duft: duftKarte(s, d), bedarf: bedarf(s, d), fluesse: fluesse(s, d),
      };
      D.vorschlaege = this.vorschlaege(D);
      this.D = D;
      this.datenZeit = this.t;
      return D;
    } catch (err) {
      if (!this._fehlerGemeldet) { this._fehlerGemeldet = true; console.warn('Holo-HUD: Daten nicht lesbar', err); }
      return this.D;
    }
  }

  /** Sinnvolle neue Verbindungen: Kolonien ohne Straße/Botenlinie und getrennte Netzteile. */
  vorschlaege(D) {
    const s = this.game.state, W = s.welt;
    const ids = D.liste.map(k => k.id);
    if (ids.length < 2) return [];
    const hat = (art, id) => (art === 'boten' ? W.boten : W.strassen).some(r => r.a === id || r.b === id);
    const zwischen = (art, a, b) => (art === 'boten' ? W.boten : W.strassen).some(r => (r.a === a && r.b === b) || (r.a === b && r.b === a));
    const out = [], seen = new Set();
    const add = (art, a, b, grund) => {
      const key = [art, ...[a, b].sort()].join('|');
      if (seen.has(key) || zwischen(art, a, b)) return;
      seen.add(key);
      const m = routeMoeglich(s, art, a, b);
      out.push({ art, a, b, grund, d: distanz(a, b), ok: m.ok, kosten: m.kosten, fehlt: m.ok ? null : m.grund });
    };
    const naechste = (id, art, nur = null) => ids.filter(x => x !== id && (!nur || nur.includes(x)) && !zwischen(art, id, x)).sort((x, y) => distanz(id, x) - distanz(id, y))[0];
    // getrennte Teile zuerst verbinden
    if (D.gruppen.length > 1) {
      const haupt = D.gruppen.slice().sort((a, b) => b.length - a.length)[0];
      for (const gr of D.gruppen) {
        if (gr === haupt) continue;
        let best = null;
        for (const a of gr) for (const b of haupt) { const dd = distanz(a, b); if (!best || dd < best.dd) best = { a, b, dd }; }
        if (best) add('strasse', best.a, best.b, 'verbindet getrennte Teile');
      }
    }
    for (const id of ids) {
      if (!hat('strasse', id)) { const b = naechste(id, 'strasse'); if (b) add('strasse', id, b, 'Waren & Gäste'); }
      if (!hat('boten', id)) { const b = naechste(id, 'boten'); if (b) add('boten', id, b, 'Wissen'); }
    }
    return out.sort((x, y) => (y.grund.startsWith('verbindet') - x.grund.startsWith('verbindet')) || x.d - y.d).slice(0, 6);
  }

  // ---------------------------------------------------------------- DOM-Panels
  refresh(force = false) {
    this._einhaengen();
    if (!this.an) return;
    const D = this.holeDaten();
    if (!D) return;
    this._freiBereich();
    this.typChip.textContent = `Typ ${komma(D.ks.wert)}`;
    this.typChip.style.setProperty('--typ', (D.ks.stufen[D.ks.typ - 1] ?? TYP0).farbe);
    this._fortschritt(); // laufende Besuche ohne Neuaufbau
    if (this.druck && !force) return;
    const sig = this.view + '|' + JSON.stringify(this._signatur(D));
    if (!force && sig === this.sig) return;
    this.sig = sig;
    const scroll = this.inhalt.scrollTop;
    const bau = { zivilisationen: this.panelZivil, netzwerk: this.panelNetz, skala: this.panelSkala, duft: this.panelDuft, entwicklung: this.panelBau }[this.view];
    fill(this.inhalt, bau.call(this, D));
    this.inhalt.scrollTop = scroll;
    this._fortschritt();
  }

  _signatur(D) {
    const kl = D.liste.map(k => [k.id, k.name, Math.round(k.pop), Math.round(k.zufriedenheit / 2), Math.round(k.fuellung * 20), k.gebaeude, k.baustellen, k.hotel.stufe, k.bildungStufe, k.strassen, k.boten, k.aktiv]);
    const W = this.game.state.welt;
    switch (this.view) {
      case 'zivilisationen': return [kl, this.game.weltR?.selected];
      case 'netzwerk': return [kl, Math.round(D.bw.wert / 5), D.fluesse.map(f => [f.id, f.ware?.von]), (W.besuche ?? []).map(b => b.id), [...W.strassen, ...W.boten].map(r => [r.id, Math.round(r.bau * 10), r.stufe]), D.vorschlaege.map(v => [v.art, v.a, v.b, v.ok]), W.besuchZaehler];
      case 'skala': return [komma(D.ks.wert, 2), D.ks.beitraege.map(b => [b.id, b.punkte]), Math.round(D.bw.wert)];
      case 'duft': return [D.duft.kolonien.map(k => [k.id, k.duefte.map(x => Math.round(x.staerke * 20))]), [...this.duftFilter]];
      case 'entwicklung': return [D.bedarf.proKolonie.map(k => [k.id, k.items.map(i => i.text)]), D.bedarf.global.map(g => g.text), D.vorschlaege.map(v => [v.art, v.a, v.b, v.ok])];
    }
    return [];
  }

  _freiBereich() {
    const lp = document.querySelector('body.modus-welt .welt-panel:not(.zu)');
    const l = lp ? Math.max(0, lp.getBoundingClientRect().right) : 0;
    const kr = this.konsole.getBoundingClientRect();
    const breit = window.innerWidth > 820;
    this.frei = { l, r: breit && kr.width ? Math.min(kr.left, this.konsole.offsetLeft || kr.left) : window.innerWidth };
  }

  /** Fortschrittsbalken laufender Besuche direkt aktualisieren (kein Neuaufbau nötig). */
  _fortschritt() {
    const W = this.game.state?.welt;
    if (!W) return;
    for (const el of this.inhalt.querySelectorAll('[data-besuch]')) {
      const b = W.besuche?.find(x => String(x.id) === el.dataset.besuch);
      el.style.setProperty('--w', `${Math.round(clamp(b?.p ?? 1, 0, 1) * 100)}%`);
    }
  }

  _melde(text, art = 'warn') {
    this.meldung.textContent = text;
    this.meldung.className = 'hk-meldung ' + art;
    this.meldung.hidden = false;
    clearTimeout(this._meldT);
    this._meldT = setTimeout(() => { this.meldung.hidden = true; }, 3200);
  }

  /** Kolonie auf der Karte zeigen: auswählen und sanft hinfliegen (in den freien Bereich der Karte). */
  zeige(id) {
    const g = this.game, R = g.weltR, o = ortById(id);
    if (!R || !o) return;
    (sfx.holoTab ?? sfx.click)?.();
    this._freiBereich();
    const von = { ...R.cam };
    const z = Math.max(R.cam.z, Math.min(0.75, R.cam.z * 1.6));
    R.cam.z = z;
    const mitte = (this.frei.l + this.frei.r) / 2;
    R.centerOn(o.x + (R.vw / 2 - mitte) / R.cam.z, o.y);
    const ziel = { ...R.cam };
    Object.assign(R.cam, von);
    this.kamFlug = { von, ziel, t: 0, dauer: this.reduziert ? 0.01 : 0.7 };
    R.selected = id;
    try { g.hud?.welt?.waehle(o); } catch { /* Panel optional */ }
    this.refresh(true);
  }

  /** Beim Einschalten: Kamera so fliegen, dass alle Kolonien im freien Kartenbereich zu sehen sind. */
  _rahmen() {
    const R = this.game.weltR, D = this.holeDaten();
    if (!R || !D || this.game.modus !== 'welt' || !D.liste.length) return;
    this._freiBereich();
    const l = this.frei.l + 40, r = this.frei.r - 40, top = 180, bot = window.innerHeight - 80;
    if (r - l < 200) return;
    const drin = D.liste.every(k => { const [x, y] = R.worldToScreen(k.x, k.y); return x > l && x < r && y > top && y < bot; });
    if (drin) return;
    const xs = D.liste.map(k => k.x), ys = D.liste.map(k => k.y), m = 110;
    const x0 = Math.min(...xs) - m, x1 = Math.max(...xs) + m, y0 = Math.min(...ys) - m, y1 = Math.max(...ys) + m;
    const z = Math.min(0.9, (r - l) / (x1 - x0), (bot - top) / (y1 - y0));
    const von = { ...R.cam };
    R.cam.z = z;
    R.cam.x = (x0 + x1) / 2 - ((l + r) / 2) / z; R.cam.y = (y0 + y1) / 2 - ((top + bot) / 2) / z;
    R.clampCam?.();
    const ziel = { ...R.cam };
    Object.assign(R.cam, von);
    this.kamFlug = { von, ziel, t: 0, dauer: this.reduziert ? 0.01 : 1.3 };
  }

  besuche(id) { (sfx.holoTab ?? sfx.click)?.(); this.game.besucheKolonie?.(id); }

  baue(v) {
    const r = this.game.baueRoute?.(v.art, v.a, v.b);
    if (r && r.ok === false) this._melde(r.grund ?? 'Das geht gerade nicht.');
    else { this._melde(`${ROUTEN[v.art].icon} ${ROUTEN[v.art].name} wird gebaut!`, 'ok'); this.holeDaten(); }
    this.refresh(true);
  }

  // --- gemeinsame Bausteine
  _balken(wert, farbe, klasse = '') { return h('div.hb' + klasse, { style: { '--w': `${Math.round(clamp(wert, 0, 1) * 100)}%`, '--c': farbe } }, h('i')); }
  _kachel(icon, wert, label, farbe = null) { return h('div.hk-kachel', { style: farbe ? { '--c': farbe } : null }, h('span.em', icon), h('b', wert), h('small', label)); }
  _name(id) { return this.D?.byId[id]?.name ?? ortById(id)?.name ?? id; }
  _knoepfe(k) {
    return h('div.hk-knoepfe',
      h('button.hk-btn', { onclick: () => this.zeige(k.id), title: 'Auf der Karte zeigen' }, '📍 Zeigen'),
      h('button.hk-btn.voll', { onclick: () => this.besuche(k.id), title: 'Ins Nest dieser Kolonie wechseln' }, k.aktiv ? '🏠 Ins Nest' : '🚀 Besuchen'));
  }
  _vorschlag(v) {
    const R = ROUTEN[v.art];
    return h('div.hk-vorschlag' + (v.art === 'boten' ? '.boten' : ''),
      h('span.em', R.icon),
      h('div', h('b', `${R.name}: ${this._name(v.a)} ⇄ ${this._name(v.b)}`), h('small', `${v.grund} · ${kostenText(v.kosten)}`)),
      h('button.hk-btn' + (v.ok ? '.voll' : '.aus'), { onclick: () => this.baue(v), title: v.fehlt ?? 'Jetzt bauen' }, v.ok ? 'Bauen' : '🔒'));
  }

  // --- 1. Zivilisationen
  panelZivil(D) {
    const L = D.liste;
    const pop = L.reduce((s, k) => s + k.pop, 0);
    const zuf = L.reduce((s, k) => s + k.zufriedenheit, 0) / Math.max(1, L.length);
    const geb = L.reduce((s, k) => s + k.gebaeude, 0);
    const sel = this.game.weltR?.selected;
    return [
      h('p.hk-intro', 'Alle deine Ameisenstaaten auf einen Blick. Die Lichtsäulen auf der Karte zeigen, wie groß (Höhe) und wie glücklich (Farbe) jede Kolonie ist.'),
      h('div.hk-kacheln',
        this._kachel('🏛️', `${L.length}/${ORT_ANZAHL}`, 'Kolonien'),
        this._kachel('🐜', pop.toLocaleString('de-DE'), 'Ameisen'),
        this._kachel('😊', `${Math.round(zuf)} %`, 'Ø Zufriedenheit', `rgb(${zufriedenRgb(zuf)})`),
        this._kachel('🏠', geb, 'Gebäude')),
      h('div.hk-legende',
        h('span', h('i.verlauf'), 'unglücklich → glücklich'),
        h('span', '▮ Höhe = Ameisen')),
      L.map(k => {
        const farbe = `rgb(${zufriedenRgb(k.zufriedenheit)})`;
        return h('article.hk-karte' + (k.aktiv ? '.aktiv' : '') + (sel === k.id ? '.gewaehlt' : ''), { style: { '--c': farbe } },
          h('div.hk-karte-kopf',
            h('span.em', k.ort?.icon ?? biomIcon(k.biom)),
            h('div', h('b', k.name), h('small', `${biomIcon(k.biom)} ${biomName(k.biom)}${k.aktiv ? ' · du bist hier' : ''}`)),
            h('span.hk-pop', '🐜 ', h('b', Math.round(k.pop)))),
          h('div.hk-werte',
            h('span', '😊'), this._balken(k.zufriedenheit / 100, farbe), h('small', `${Math.round(k.zufriedenheit)} %`),
            h('span', '🍯'), this._balken(k.fuellung, '#ffcf40'), h('small', prozent(k.fuellung))),
          h('div.hk-chips',
            h('span.chip', `🏠 ${k.gebaeude} Gebäude${k.baustellen ? ` · 🚧 ${k.baustellen}` : ''}`),
            h('span.chip' + (k.hotel.stufe ? '.gut' : L.length > 1 ? '.fehlt' : ''), k.hotel.stufe ? `🏨 Hotel ${'★'.repeat(k.hotel.stufe)}` : '🏨 kein Hotel'),
            h('span.chip' + (k.bildungStufe ? '.gut' : ''), k.bildungStufe ? `🎓 ${k.bildungName}` : '🎓 keine Schule'),
            h('span.chip', `🔗 ${k.strassen} 🛣️ · ${k.boten} 📨`)),
          this._knoepfe(k));
      }),
    ];
  }

  // --- 2. Netzwerk & Handel
  panelNetz(D) {
    const s = this.game.state, W = s.welt;
    const bw = D.bw, ziel = bw.wert < 800 ? 800 : 2000;
    const teile = Object.entries(bw.teile).filter(([, v]) => v > 0);
    const summe = Math.max(ziel, bw.wert);
    const strFertig = W.strassen.filter(r => r.bau >= 1).length, botFertig = W.boten.filter(r => r.bau >= 1).length;
    const imBau = [...W.strassen, ...W.boten].filter(r => r.bau < 1);
    const hotels = D.liste.filter(k => k.hotel.stufe > 0).length;
    const ohneHotel = D.liste.filter(k => !k.hotel.stufe);
    const besuche = W.besuche ?? [];
    return [
      h('section.hk-bewusst',
        h('div.hk-bw-kopf', h('span.em', '🧠'), h('div', h('b', 'Kollektives Ameisen-Bewusstsein'), h('small', 'Wenn Kolonien sich austauschen, denken alle Ameisen ein bisschen gemeinsam – wie ein riesiges Gehirn.'))),
        h('div.hk-bw-wert', h('b', Math.round(bw.wert).toLocaleString('de-DE')), h('small', ` / ${ziel.toLocaleString('de-DE')} für Typ ${ziel === 800 ? 'IV' : 'V'}`)),
        h('div.hk-bw-balken', teile.map(([k, v]) => h('i', { title: `${TEILE[k][1]}: ${Math.round(v)}`, style: { width: `${(v / summe) * 100}%`, background: TEILE[k][2] } }))),
        h('div.hk-bw-legende', teile.map(([k, v]) => h('span', { style: { '--c': TEILE[k][2] } }, h('i'), `${TEILE[k][0]} ${TEILE[k][1]} ${Math.round(v)}`)))),
      h('div.hk-kacheln',
        this._kachel('🛣️', strFertig, 'Straßen', '#ffb347'),
        this._kachel('📨', botFertig, 'Botenlinien', '#6fe0ff'),
        this._kachel('🏨', `${hotels}/${D.liste.length}`, 'mit Hotel', '#ff8fb1'),
        this._kachel('🧩', D.gruppen.length, D.gruppen.length === 1 ? 'Netz' : 'Netz-Teile', D.gruppen.length > 1 ? '#ff6b6b' : '#5fffb0')),
      h('div.hk-legende',
        h('span', h('i.linie.handel'), 'Handel (Straße)'), h('span', h('i.linie.wissen'), 'Wissen (Boten)'), h('span', h('i.linie.bau'), 'im Bau')),
      h('h4', '🔄 Was fließt gerade?'),
      D.fluesse.length ? h('ul.hk-liste', D.fluesse.map(f => f.wissen
        ? h('li', h('span.em', '📨'), h('span', h('b', 'Wissen'), ` ${this._name(f.a)} ⇄ ${this._name(f.b)}`), h('small.cyan', '+🔬'))
        : h('li', h('span.em', f.ware ? '🍯' : '🛣️'), h('span', f.ware ? [h('b', 'Futter'), ` ${this._name(f.ware.von)} → ${this._name(f.ware.nach)}`] : [h('b', 'Handel'), ` ${this._name(f.a)} ⇄ ${this._name(f.b)}`]),
          h('small.gold', `${ROUTEN.strasse.stufen[(f.stufe ?? 1) - 1]}`))))
        : h('p.hk-leer', 'Noch keine fertigen Verbindungen. Baue eine Ameisenstraße oder Botenlinie!'),
      imBau.length ? h('ul.hk-liste.bau', imBau.map(r => h('li', h('span.em', '🚧'), h('span', `${ROUTEN[r.art].name} ${this._name(r.a)} ⇄ ${this._name(r.b)}`), this._balken(r.bau, r.art === 'boten' ? '#6fe0ff' : '#ffb347', '.mini')))) : null,
      h('h4', `🧳 Unterwegs (${besuche.length})`),
      besuche.length ? h('ul.hk-liste.reise', besuche.map(b => {
        const B = BESUCHE[b.art];
        return h('li', { style: { '--c': B.farbe } }, h('span.em', B.icon),
          h('span', h('b', B.name), h('small', ` ${this._name(b.von)} → ${this._name(b.nach)}`)),
          h('div.hb.mini', { 'data-besuch': b.id, style: { '--c': B.farbe } }, h('i')));
      })) : h('p.hk-leer', 'Gerade reist niemand. Gäste reisen über Ameisenstraßen – aber nur zu Kolonien mit Hotel!'),
      W.besuchZaehler && Object.keys(W.besuchZaehler).length ? h('div.hk-chips.zaehler', Object.entries(W.besuchZaehler).map(([art, n]) => h('span.chip', `${BESUCHE[art]?.icon ?? '•'} ${n}× ${BESUCHE[art]?.name ?? art}`))) : null,
      h('h4', '🏨 Hotels'),
      D.liste.length < 2 ? h('p.hk-leer', 'Sobald du mehrere Kolonien hast, brauchen Gäste Hotels.')
        : h('div.hk-chips', D.liste.map(k => h('button.chip' + (k.hotel.stufe ? '.gut' : '.fehlt'), { onclick: () => this.zeige(k.id) }, k.hotel.stufe ? `🏨 ${'★'.repeat(k.hotel.stufe)} ${k.name}` : `⚠️ ${k.name}: fehlt`))),
      ohneHotel.length && D.liste.length > 1 ? h('p.hk-tipp', `Baue in ${ohneHotel.length === 1 ? ohneHotel[0].name : `${ohneHotel.length} Kolonien`} ein Duft-Gästehaus (Bauplan „Gästehaus"), damit Gäste dort übernachten können.`) : null,
      h('h4', '🧩 Diese Verbindungen fehlen noch'),
      D.vorschlaege.length ? h('div.hk-vorschlaege', D.vorschlaege.map(v => this._vorschlag(v)))
        : h('p.hk-leer', D.liste.length < 2 ? 'Gründe mit einem Hochzeitsflug eine zweite Kolonie – dann kannst du sie verbinden.' : '✅ Jede Kolonie ist verbunden. Super!'),
    ];
  }

  // --- 3. Krabbelschow-Skala
  panelSkala(D) {
    const ks = D.ks;
    const stufen = [TYP0, ...ks.stufen];
    const akt = stufen[ks.typ];
    const n = ks.naechste;
    const beitr = ks.beitraege.slice().sort((a, b) => b.anteil - a.anteil);
    const maxA = Math.max(...beitr.map(b => b.anteil), 0.01);
    return [
      h('section.sk-held', { style: { '--c': akt.farbe } },
        h('div.sk-ring', h('span.em', akt.icon)),
        h('div', h('small', 'Dein Ameisenreich ist'), h('div.sk-wert', 'Typ ', h('b', komma(ks.wert))), h('div.sk-name', `${akt.icon} ${akt.name}`))),
      h('p.hk-intro', 'Wie die Kardaschow-Skala für Sternenvölker – nur für Ameisen! Forscher messen damit, wie weit eine Zivilisation ist. Bei Ameisen zählt: Wie viele Kolonien gibt es, wie gut sind sie verbunden, wie klug und gastfreundlich sind sie? Typ I heißt: bereit für den ersten Hochzeitsflug.'),
      h('div.sk-leiter',
        h('div.sk-spur', h('i', { style: { width: `${(ks.wert / 5) * 100}%` } }),
          h('span.sk-du', { style: { left: `${(ks.wert / 5) * 100}%` } }, 'DU')),
        h('div.sk-knoten', stufen.map(st => h('span' + (st.nr <= ks.typ ? '.an' : ''), { style: { left: `${(st.nr / 5) * 100}%`, '--c': st.farbe } }, h('i', st.icon), h('b', ROEM[st.nr]))))),
      n ? h('section.sk-ziel', { style: { '--c': n.farbe } },
        h('div.sk-ziel-kopf', h('span.em', n.icon), h('div', h('small', 'Als Nächstes'), h('b', `Typ ${ROEM[n.nr]} – ${n.name}`))),
        h('p', n.text),
        h('ul.sk-check', n.bedingungen.map(b => h('li' + (b.ok ? '.ok' : ''),
          h('span.em', b.ok ? '✅' : '⬜'), h('span', b.text), h('small', `${Math.floor(b.ist)}/${b.soll}`), this._balken(b.ist / b.soll, b.ok ? '#5fffb0' : n.farbe, '.mini')))))
        : h('section.sk-ziel.fertig', h('b', '🌌 Höchste Stufe erreicht! Alle Ameisenstaaten denken gemeinsam.')),
      h('h4', '🪜 Alle Stufen'),
      h('ol.sk-stufen', stufen.slice().reverse().map(st => {
        const status = st.nr <= ks.typ ? 'erreicht' : st === n ? 'naechste' : 'zu';
        return h('li.' + status, { style: { '--c': st.farbe } },
          h('span.em', st.icon),
          h('div', h('b', `Typ ${ROEM[st.nr]} · ${st.name}`), h('small', st.text)),
          h('span.sk-status', status === 'erreicht' ? '✅' : status === 'naechste' ? '▶' : '🔒'));
      })),
      h('h4', '✨ Wer trägt wie viel bei?'),
      h('ul.hk-liste.beitrag', beitr.map(b => h('li', h('span', this._name(b.id)), this._balken(b.anteil / maxA, '#d6a8ff', '.mini'), h('small', `${Math.round(b.anteil * 100)} %`)))),
    ];
  }

  // --- 4. Duftstoffe
  panelDuft(D) {
    const arten = Object.keys(DUEFTE);
    const radar = k => {
      const R = 46, c = 56;
      const pt = (i, r) => [c + Math.sin((i / 6) * TAU) * r, c - Math.cos((i / 6) * TAU) * r];
      const ring = f => arten.map((_, i) => pt(i, R * f).map(v => v.toFixed(1)).join(',')).join(' ');
      const poly = k.duefte.map((x, i) => pt(i, R * (0.08 + 0.92 * (this.duftFilter.has(x.art) ? x.staerke : 0))).map(v => v.toFixed(1)).join(',')).join(' ');
      const achsen = arten.map((_, i) => { const [x, y] = pt(i, R); return `<line x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('');
      const punkte = k.duefte.map((x, i) => { const [px, py] = pt(i, R * (0.08 + 0.92 * x.staerke)); return this.duftFilter.has(x.art) ? `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4" fill="${x.farbe}"/>` : ''; }).join('');
      const icons = arten.map((a, i) => { const [x, y] = pt(i, R + 9); return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}">${DUEFTE[a].icon}</text>`; }).join('');
      return h('div.df-radar', { html: `<svg viewBox="-6 -6 124 124" role="img" aria-label="Duft-Radar ${k.name}">
        <g class="netz"><polygon points="${ring(1)}"/><polygon points="${ring(0.66)}"/><polygon points="${ring(0.33)}"/>${achsen}</g>
        <polygon class="flaeche" points="${poly}"/>${punkte}<g class="ic">${icons}</g></svg>` });
    };
    return [
      h('p.hk-intro', 'Ameisen „reden" mit Duftstoffen! Hier riechst du, was in deinen Kolonien los ist. Tippe auf einen Duft, um ihn ein- oder auszublenden.'),
      h('div.df-filter', arten.map(a => {
        const Df = DUEFTE[a];
        return h('button.df-chip' + (this.duftFilter.has(a) ? '.an' : ''), { style: { '--c': Df.farbe }, 'aria-pressed': String(this.duftFilter.has(a)), onclick: () => this._filter(a) }, h('span.em', Df.icon), Df.name);
      }), h('button.df-chip.alle', { onclick: () => this._filter(null) }, this.duftFilter.size === arten.length ? 'Nur einer' : 'Alle')),
      h('div.df-kolonien', D.duft.kolonien.map(k => {
        const sichtbar = k.duefte.filter(x => this.duftFilter.has(x.art));
        const stark = sichtbar.slice().sort((a, b) => b.staerke - a.staerke)[0];
        return h('article.df-karte', { style: { '--c': stark?.farbe ?? '#6fe0ff' } },
          h('div.df-karte-kopf', h('b', k.name), h('button.hk-btn.klein', { onclick: () => this.zeige(k.id), title: 'Auf der Karte zeigen' }, '📍')),
          radar(k),
          stark ? h('div.df-stark', h('span.em', stark.icon), h('small', stark.text)) : null);
      })),
      h('h4', '📖 Duft-Lexikon'),
      h('ul.df-lexikon', arten.map(a => {
        const Df = DUEFTE[a];
        return h('li', { style: { '--c': Df.farbe } }, h('span.em', Df.icon),
          h('div', h('b', Df.name), h('small', Df.text), h('p', h('span.fakt', '🐜 Wusstest du? '), Df.fakt)));
      })),
    ];
  }

  _filter(art) {
    const alle = Object.keys(DUEFTE);
    if (art === null) {
      if (this.duftFilter.size === alle.length) { this.duftFilter = new Set([alle[0]]); }
      else this.duftFilter = new Set(alle);
    } else if (this.duftFilter.has(art)) { if (this.duftFilter.size > 1) this.duftFilter.delete(art); }
    else this.duftFilter.add(art);
    (sfx.holoTab ?? sfx.click)?.();
    speichern({ an: this.an, view: this.view, filter: [...this.duftFilter] });
    this.refresh(true);
  }

  // --- 5. Entwicklung
  panelBau(D) {
    const L = D.bedarf.proKolonie.map(k => ({ ...k, kol: D.byId[k.id], prio: k.items[0]?.prio ?? 0 })).sort((a, b) => b.prio - a.prio || b.items.length - a.items.length);
    const zaehl = [3, 2, 1].map(p => L.filter(k => k.prio === p).length);
    return [
      h('p.hk-intro', 'Was braucht welche Kolonie als Nächstes? Die Abzeichen auf der Karte zeigen es: Rot ist dringend, Orange wichtig, Gelb ein Tipp.'),
      h('div.hk-kacheln.drei',
        this._kachel('🚨', zaehl[0], 'dringend', PRIO[3].farbe), this._kachel('⚠️', zaehl[1], 'wichtig', PRIO[2].farbe), this._kachel('💡', zaehl[2], 'Tipps', PRIO[1].farbe)),
      D.bedarf.global.length ? [h('h4', '🌍 Ziele für das ganze Reich'),
        h('ul.hk-liste.ziele', D.bedarf.global.map(g => h('li', { style: { '--c': PRIO[g.prio]?.farbe } }, h('span.em', g.icon), h('span', g.text))))] : null,
      D.vorschlaege.length ? [h('h4', '🛣️ Verbindungen bauen'), h('div.hk-vorschlaege', D.vorschlaege.slice(0, 3).map(v => this._vorschlag(v)))] : null,
      h('h4', '🏘️ Kolonien'),
      L.map(k => h('article.hk-karte.bau', { style: { '--c': PRIO[k.prio].farbe } },
        h('div.hk-karte-kopf',
          h('span.em', k.kol?.ort?.icon ?? '🏡'),
          h('div', h('b', k.name), h('small', k.kol?.aktiv ? 'du bist hier' : biomName(k.kol?.biom))),
          h('span.hk-prio', PRIO[k.prio].name)),
        h('ul.hk-bedarf', k.items.slice(0, 4).map(i => h('li', { style: { '--c': PRIO[i.prio].farbe } }, h('span.em', i.icon), h('span', i.text)))),
        k.items.length > 4 ? h('small.hk-mehr', `… und ${k.items.length - 4} weitere Hinweise`) : null,
        this._knoepfe(k.kol ?? { id: k.id }))),
    ];
  }

  // ================================================================= Overlay zeichnen
  /** Aktivierungsgrad 0..1 (für Ein- und Ausblenden). */
  _ein() {
    if (this.an) return ease(this.anim / (this.reduziert ? 0.4 : 0.6));
    if (this.reduziert) return 1 - ease(this.anim / this.dauerAus);
    return 1 - clamp((this.anim - this.dauerAus * 0.42) / (this.dauerAus * 0.12), 0, 1); // erst zusammenquetschen, dann aus
  }

  frame(dt) {
    this._einhaengen();
    const welt = this.game.modus === 'welt' && !!this.game.weltR && !!this.game.state;
    if (!welt) { this.warWelt = false; this._leeren(); return; }
    if (!this.warWelt) { this.warWelt = true; if (this.an) this.anim = 0; } // beim Betreten der Welt erneut „hochfahren"
    dt = clamp(Number.isFinite(dt) ? dt : 0.016, 0, 0.1);
    this.t += dt; this.anim += dt;
    this.viewMix = Math.min(1, this.viewMix + dt / (this.reduziert ? 0.15 : 0.5));
    if (this.kamFlug) this._kamera(dt);
    if (!this.an && this.anim > this.dauerAus) { this._leeren(); return; }
    if (!this.D || this.t - this.datenZeit > 0.3) this.holeDaten();
    if (!this.D) return;
    this._groesse();
    const c = this.ctx, dpr = this.dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, this.vw, this.vh);
    this.canvas.style.display = '';
    this.gezeichnet = true;
    try { this._zeichne(c); } catch (err) {
      if (!this._zeichenFehler) { this._zeichenFehler = true; console.warn('Holo-HUD: Zeichenfehler', err); }
    }
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  }

  _leeren() {
    if (!this.gezeichnet) return;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.style.display = 'none';
    this.gezeichnet = false;
  }

  _groesse() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (vw !== this.vw || vh !== this.vh || dpr !== this.dpr) {
      this.vw = vw; this.vh = vh; this.dpr = dpr;
      this.canvas.width = Math.round(vw * dpr); this.canvas.height = Math.round(vh * dpr);
      this._freiBereich();
    }
  }

  _kamera(dt) {
    const R = this.game.weltR, f = this.kamFlug;
    f.t += dt / f.dauer;
    const k = ease(f.t);
    // Zoom logarithmisch, Position linear – fühlt sich wie ein Flug an
    R.cam.z = f.von.z * Math.pow(f.ziel.z / f.von.z, k);
    R.cam.x = lerp(f.von.x, f.ziel.x, k); R.cam.y = lerp(f.von.y, f.ziel.y, k);
    if (f.t >= 1) { Object.assign(R.cam, f.ziel); this.kamFlug = null; }
    R.clampCam?.();
  }

  _zeichne(c) {
    const R = this.game.weltR, D = this.D, t = this.t, vw = this.vw, vh = this.vh;
    const an = this.an, red = this.reduziert;
    const ein = this._ein();
    const z = R.cam.z;
    const u = clamp(0.78 + z * 0.45, 0.85, 1.3);
    this.u = u;
    // Bildschirmpositionen
    const [hx, hy] = R.worldToScreen(D.byId.heim?.x ?? 1800, D.byId.heim?.y ?? 1230);
    const maxR = Math.max(Math.hypot(hx, hy), Math.hypot(vw - hx, hy), Math.hypot(hx, vh - hy), Math.hypot(vw - hx, vh - hy)) + 80;
    const hoch = an && this.anim < this.dauerEin && !red;
    const scanR = hoch ? ease((this.anim - 0.2) / 1.5) * maxR : 1e9;
    const P = {};
    for (const k of D.liste) {
      const [x, y] = R.worldToScreen(k.x, k.y);
      const d = Math.hypot(x - hx, y - hy);
      let a = an ? (red ? ein : clamp((scanR - d) / 160, 0, 1)) : ein;
      P[k.id] = { x, y, d, a, pass: hoch ? this._passiert(d, maxR) : 9, sicht: x > -160 && x < vw + 160 && y > -200 && y < vh + 200 };
    }
    for (const id in P) { // Abstand zum nächsten Nachbarn → wie viel Text passt hin?
      let m = 1e9;
      for (const j in P) if (j !== id) m = Math.min(m, Math.hypot(P[id].x - P[j].x, P[id].y - P[j].y));
      P[id].eng = m;
    }
    this.P = P;

    // Ausschalten wie ein alter Fernseher: alles quetscht sich zu einer leuchtenden Linie zusammen
    if (!an && !red) {
      const sy = Math.max(0.006, 1 - ease(this.anim / (this.dauerAus * 0.48)) ** 1.6);
      c.setTransform(this.dpr, 0, 0, this.dpr * sy, 0, this.dpr * (vh / 2) * (1 - sy));
    }
    // --- 1) Abdunkeln & Vignette (macht die Hologramme sichtbar)
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = `rgba(4,18,46,${0.46 * ein})`;
    c.fillRect(0, 0, vw, vh);
    const vg = c.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.35, vw / 2, vh / 2, Math.hypot(vw, vh) * 0.6);
    vg.addColorStop(0, 'rgba(0,20,60,0)'); vg.addColorStop(1, `rgba(0,30,80,${0.45 * ein})`);
    c.fillStyle = vg; c.fillRect(0, 0, vw, vh);

    // --- 2) Holo-Gitter (faltet sich beim Einschalten in Perspektive auf)
    let theta = 0;
    if (!red) {
      if (an && this.anim < 1.5) theta = (1 - ease((this.anim - 0.05) / 1.4)) * 1.22;
    }
    this._gitter(c, R, hx, theta, ein, scanR, hy);

    // --- 3) Radar-Puls vom Heimatnest
    c.globalCompositeOperation = 'lighter';
    if (!red && an) {
      const per = 5.5, f = ((t % per) / per);
      const r = f * Math.min(maxR, 900);
      ellipseRing(c, hx, hy, r, '111,224,255', 0.35 * (1 - f) * ein, 2);
    }

    // --- 4) Scan-Strahl beim Hochfahren
    if (hoch && scanR < maxR) {
      const a = 1 - clamp((this.anim - 1.45) / 0.35, 0, 1);
      const g = c.createRadialGradient(hx, hy, Math.max(0, scanR - 140), hx, hy, scanR);
      g.addColorStop(0, 'rgba(60,200,255,0)'); g.addColorStop(0.85, `rgba(80,220,255,${0.22 * a})`); g.addColorStop(1, `rgba(200,250,255,${0.75 * a})`);
      c.fillStyle = g;
      c.beginPath(); c.arc(hx, hy, scanR, 0, TAU); c.fill();
      c.strokeStyle = `rgba(220,255,255,${0.9 * a})`; c.lineWidth = 3;
      c.beginPath(); c.arc(hx, hy, scanR, 0, TAU); c.stroke();
      // Radar-Wischer
      const ang = this.anim * 5.2;
      const wg = c.createConicGradient ? c.createConicGradient(ang - 0.9, hx, hy) : null;
      if (wg) {
        wg.addColorStop(0, 'rgba(111,224,255,0)'); wg.addColorStop(0.14, `rgba(111,224,255,${0.28 * a})`); wg.addColorStop(0.145, 'rgba(111,224,255,0)'); wg.addColorStop(1, 'rgba(111,224,255,0)');
        c.fillStyle = wg; c.beginPath(); c.arc(hx, hy, scanR, 0, TAU); c.fill();
      }
    }

    // --- 5) Lichtsäulen schießen beim Hochfahren in den Himmel
    if (hoch) for (const k of D.liste) {
      const p = P[k.id];
      if (p.pass < 0 || p.pass > 1.1 || !p.sicht) continue;
      const f = Math.min(1, p.pass), a = (1 - f) ** 1.5;
      const top = p.y - ease(f / 0.3) * (p.y + 60);
      const w = 16 * u * (1 - f * 0.7);
      const g = c.createLinearGradient(0, p.y, 0, top);
      g.addColorStop(0, `rgba(210,252,255,${a})`); g.addColorStop(0.6, `rgba(111,224,255,${0.5 * a})`); g.addColorStop(1, 'rgba(111,224,255,0)');
      c.fillStyle = g; c.fillRect(p.x - w / 2, top, w, p.y - top);
      c.fillStyle = `rgba(255,255,255,${0.9 * a})`; c.fillRect(p.x - 1.5, top, 3, p.y - top);
      drawGlow(c, '150,240,255', p.x, p.y, 90 * u * (1 - f * 0.4), a);
      ellipseRing(c, p.x, p.y, 18 * u + ease(f) * 120 * u, '200,250,255', a, 3);
      ellipseRing(c, p.x, p.y, 10 * u + ease(f) * 70 * u, '111,224,255', a * 0.7, 2);
    }

    // --- 6) Ansichts-Ebenen (mit Überblendung)
    const mix = ease(this.viewMix);
    if (this.altView && mix < 1) this._ebene(c, this.altView, (1 - mix) * ein);
    this._ebene(c, this.view, (this.altView ? mix : 1) * (an ? 1 : ein));

    // --- 7) Auswahl-Ringe
    const sel = R.selected && P[R.selected];
    if (sel && sel.sicht) {
      c.globalCompositeOperation = 'lighter';
      const rr = 34 * u;
      ellipseRing(c, sel.x, sel.y, rr, '255,255,255', 0.7 * ein * sel.a, 2, [10, 8], -t * 40);
      ellipseRing(c, sel.x, sel.y, rr * 1.35, '111,224,255', 0.55 * ein * sel.a, 2, [3, 12], t * 30);
      ellipseRing(c, sel.x, sel.y, rr * 1.7, '111,224,255', 0.25 * ein * sel.a, 1);
    }

    // --- 8) Titel der Ansicht
    this._titel(c, ein);

    // --- 9) Effekte beim Ein-/Ausschalten
    c.globalCompositeOperation = 'source-over';
    if (an && !red && this.anim < 0.6) this._glitch(c, this.anim / 0.6);
    if (!an && !red) { c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); this._crtAus(c, this.anim / this.dauerAus); }
  }

  /** Sekunden, seit der Scan-Ring eine Kolonie im Abstand d überstrichen hat (Umkehrung von scanR). */
  _passiert(d, maxR) {
    const k = clamp(d / maxR, 0, 0.9999);
    return this.anim - (0.2 + (1 - Math.cbrt(1 - k)) * 1.5);
  }

  _gitter(c, R, hx, theta, ein, scanR, hy) {
    const vw = this.vw, vh = this.vh;
    const [wx0, wy0] = R.screenToWorld(0, 0), [wx1, wy1] = R.screenToWorld(vw, vh);
    let step = 150;
    while ((step * R.cam.z) < 46) step *= 2;
    const breit = theta > 0.01;
    const ex = breit ? (wx1 - wx0) * 1.6 : 0, ey = breit ? (wy1 - wy0) * 0.6 : 0;
    const F = 1100, cos = Math.cos(theta), sin = Math.sin(theta), py = vh + 40;
    const proj = (sx, sy) => {
      if (!breit) return [sx, sy];
      const dy = sy - py, zz = -dy * sin, k = F / (F + zz);
      return [hx + (sx - hx) * k, py + dy * cos * k];
    };
    c.globalCompositeOperation = 'lighter';
    c.lineWidth = breit ? 1.5 : 1;
    const boost = 1 + 4 * (theta / 1.22);
    const linie = (ax, ay, bx, by, haupt) => {
      const [x0, y0] = proj(ax, ay), [x1, y1] = proj(bx, by);
      c.strokeStyle = haupt ? `rgba(111,224,255,${Math.min(0.9, 0.2 * boost) * ein})` : `rgba(111,224,255,${Math.min(0.6, 0.085 * boost) * ein})`;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    };
    const sy0 = breit ? -vh * 0.6 : 0, sy1 = vh + 40;
    for (let wx = Math.floor((wx0 - ex) / step) * step; wx <= wx1 + ex; wx += step) {
      const [sx] = R.worldToScreen(wx, 0);
      linie(sx, breit ? sy0 : 0, sx, breit ? sy1 : vh, Math.round(wx / step) % 4 === 0);
    }
    for (let wy = Math.floor((wy0 - ey) / step) * step; wy <= wy1; wy += step) {
      const [, sy] = R.worldToScreen(0, wy);
      if (breit && sy > sy1) continue;
      linie(breit ? -vw * 1.2 : 0, sy, breit ? vw * 2.2 : vw, sy, Math.round(wy / step) % 4 === 0);
    }
    // Horizont-Leuchten während des Aufklappens
    if (breit) {
      const [, hy0] = proj(0, sy0);
      const g = c.createLinearGradient(0, hy0 - 60, 0, hy0 + 60);
      g.addColorStop(0, 'rgba(111,224,255,0)'); g.addColorStop(0.5, `rgba(150,235,255,${0.35 * (theta / 1.22) * ein})`); g.addColorStop(1, 'rgba(111,224,255,0)');
      c.fillStyle = g; c.fillRect(0, hy0 - 60, vw, 120);
    }
    // Gitterpunkte hell aufleuchten lassen, wo der Scan-Ring gerade ist
    if (scanR < 5000 && !breit) {
      c.fillStyle = 'rgba(200,250,255,.8)';
      for (let wx = Math.floor(wx0 / step) * step; wx <= wx1; wx += step) for (let wy = Math.floor(wy0 / step) * step; wy <= wy1; wy += step) {
        const [sx, sy] = R.worldToScreen(wx, wy);
        const dd = Math.abs(Math.hypot(sx - hx, sy - hy) - scanR);
        if (dd < 60) { c.globalAlpha = 1 - dd / 60; c.fillRect(sx - 1.5, sy - 1.5, 3, 3); }
      }
      c.globalAlpha = 1;
    }
  }

  _glitch(c, f) {
    const vw = this.vw, vh = this.vh;
    if (f < 0.25) { c.fillStyle = `rgba(150,240,255,${0.28 * (1 - f / 0.25)})`; c.fillRect(0, 0, vw, vh); }
    const n = Math.round(8 * (1 - f));
    for (let i = 0; i < n; i++) {
      const y = Math.random() * vh, hh = 2 + Math.random() * 14, x = Math.random() * vw * 0.6;
      c.fillStyle = Math.random() < 0.5 ? 'rgba(255,60,200,.18)' : 'rgba(60,240,255,.22)';
      c.fillRect(x, y, vw * (0.2 + Math.random() * 0.6), hh);
    }
  }

  _crtAus(c, f) {
    if (f < 0.4 || f > 1) return;
    const k = (f - 0.4) / 0.6, vw = this.vw, vh = this.vh;
    const w = vw * (1 - ease(k)) + 6, y = vh / 2;
    c.globalCompositeOperation = 'lighter';
    const g = c.createLinearGradient(0, y - 30, 0, y + 30);
    g.addColorStop(0, 'rgba(111,224,255,0)'); g.addColorStop(0.5, `rgba(220,255,255,${0.9 * (1 - k * 0.6)})`); g.addColorStop(1, 'rgba(111,224,255,0)');
    c.fillStyle = g; c.fillRect(vw / 2 - w / 2, y - 30 * (1 - k), w, 60 * (1 - k) + 2);
    drawGlow(c, '200,250,255', vw / 2, y, 40 + 60 * (1 - k), 1 - k);
  }

  _titel(c, ein) {
    const v = HOLO_VIEWS.find(x => x.id === this.view);
    const mix = this.viewMix, vw = this.vw;
    const l = this.frei.l, r = Math.min(this.frei.r, vw);
    if (r - l < 260 || vw < 820) return; // auf kleinen Bildschirmen steht der Titel nur im Pult
    const x = (l + r) / 2, y = vw < 820 ? 156 : 152;
    const flack = !this.reduziert && mix < 0.5 && Math.random() < 0.35 ? 0.3 : 1;
    const a = ein * ease(mix * 1.5) * flack;
    if (a <= 0.01) return;
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = a;
    const fs = vw < 820 ? 17 : 21;
    const txt = v.name.toUpperCase();
    c.font = `700 ${fs}px ${FONT}`;
    c.letterSpacing = '3px';
    const w = c.measureText(txt).width + 70;
    // Klammern ◢ ◣
    c.strokeStyle = 'rgba(111,224,255,.75)'; c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x - w / 2 + 14, y - fs * 1.1); c.lineTo(x - w / 2, y - fs * 1.1); c.lineTo(x - w / 2, y + fs * 0.5); c.lineTo(x - w / 2 + 14, y + fs * 0.5);
    c.moveTo(x + w / 2 - 14, y - fs * 1.1); c.lineTo(x + w / 2, y - fs * 1.1); c.lineTo(x + w / 2, y + fs * 0.5); c.lineTo(x + w / 2 - 14, y + fs * 0.5);
    c.stroke();
    c.fillStyle = 'rgba(4,18,44,.55)'; c.fillRect(x - w / 2 + 3, y - fs * 1.1 + 3, w - 6, fs * 1.6 - 6);
    // leichte chromatische Verschiebung
    c.textAlign = 'center';
    c.fillStyle = 'rgba(255,60,160,.55)'; c.fillText(txt, x - 1.5, y);
    c.fillStyle = 'rgba(60,255,255,.6)'; c.fillText(txt, x + 1.5, y);
    c.fillStyle = '#effdff'; c.fillText(txt, x, y);
    c.letterSpacing = '0px';
    drawEmoji(c, v.icon, x - w / 2 - 22, y + 2, fs * 1.2, 1);
    c.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- Ebenen je Ansicht
  _ebene(c, view, alpha) {
    if (alpha <= 0.01) return;
    const f = { zivilisationen: this._ebeneZivil, netzwerk: this._ebeneNetz, skala: this._ebeneSkala, duft: this._ebeneDuft, entwicklung: this._ebeneBau }[view];
    f?.call(this, c, alpha);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  }

  /** Name unter einer Kolonie (kürzer, wenn es eng ist) – auf dunklem Glas, damit er über jeder Kartenstelle lesbar bleibt. */
  _name2(c, k, p, y, a, extra = null) {
    const u = this.u;
    const kurz = p.eng < 110 * u && !k.aktiv && this.game.weltR.selected !== k.id;
    const fs = (kurz ? 12 : 14) * u, fs2 = fs * 0.82;
    let nm = k.name;
    if (kurz && nm.length > 14) nm = nm.slice(0, 13) + '…';
    const zweite = extra && !kurz;
    c.font = `700 ${Math.round(fs)}px ${FONT}`;
    let w = c.measureText(nm).width;
    if (zweite) { c.font = `600 ${Math.round(fs2)}px ${FONT}`; w = Math.max(w, c.measureText(extra).width); }
    const bw = w + fs * 1.1, bh = fs * 1.5 + (zweite ? fs2 * 1.2 : 0);
    c.globalAlpha = a;
    c.fillStyle = 'rgba(3,14,36,.74)'; c.strokeStyle = k.aktiv ? 'rgba(255,230,140,.6)' : 'rgba(111,224,255,.35)'; c.lineWidth = 1;
    c.beginPath(); c.roundRect(p.x - bw / 2, y - fs * 1.1, bw, bh, fs * 0.55); c.fill(); c.stroke();
    schrift(c, nm, p.x, y, fs, k.aktiv ? '#fff3b0' : '#eaffff', 700);
    if (zweite) schrift(c, extra, p.x, y + fs2 * 1.2, fs2, '#9fe9ff', 600);
    c.globalAlpha = 1;
    return kurz;
  }

  _ebeneZivil(c, alpha) {
    const D = this.D, P = this.P, t = this.t, u = this.u;
    const sortiert = D.liste.slice().sort((a, b) => P[a.id].y - P[b.id].y);
    for (const k of sortiert) {
      const p = P[k.id];
      if (!p.sicht || p.a <= 0) continue;
      const a = alpha * p.a;
      const rgb = zufriedenRgb(k.zufriedenheit);
      const hgt = (18 + Math.min(150, Math.sqrt(Math.max(1, k.pop)) * 8.5)) * u * easeBack(p.a);
      const r = 11 * u;
      c.globalCompositeOperation = 'lighter';
      // Holo-Plattform mit Nahrungs-Anzeige
      const br = 24 * u;
      this._plattform(c, p.x, p.y, br, rgb, a, t);
      ellipseRing(c, p.x, p.y, br, rgb, 0.35 * a, 5);
      c.strokeStyle = `rgba(255,207,64,${0.95 * a})`; c.lineWidth = 4;
      c.beginPath(); c.ellipse(p.x, p.y, br, br * ER, 0, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(k.fuellung, 0.001, 1)); c.stroke();
      saeule(c, p.x, p.y, hgt, r, rgb, a, t + p.d * 0.003);
      c.globalCompositeOperation = 'source-over';
      // Wert oben
      kapsel(c, p.x, p.y - hgt - 18 * u, String(Math.round(k.pop)), 12.5 * u, rgb, a, '🐜');
      // Name + Symbole
      const kurz = this._name2(c, k, p, p.y + 22 * u, a);
      if (!kurz) {
        const ic = [['🍯', prozent(k.fuellung)], [k.hotel.stufe ? '🏨' : null, k.hotel.stufe ? '★'.repeat(k.hotel.stufe) : ''], [k.bildungStufe ? '🎓' : null, k.bildungStufe ? String(k.bildungStufe) : '']].filter(x => x[0]);
        const fs = 11.5 * u, gap = 6 * u;
        c.font = `700 ${Math.round(fs)}px ${FONT}`;
        const ws = ic.map(([, txt]) => fs * 1.25 + c.measureText(txt).width);
        const ges = ws.reduce((s, w) => s + w, 0) + gap * (ws.length - 1);
        let x = p.x - ges / 2;
        const y = p.y + 38 * u;
        c.globalAlpha = a;
        c.fillStyle = 'rgba(4,16,40,.78)'; c.strokeStyle = `rgba(${rgb},.6)`; c.lineWidth = 1;
        c.beginPath(); c.roundRect(x - 6 * u, y - fs * 0.62, ges + 12 * u, fs * 1.75, fs * 0.6); c.fill(); c.stroke();
        ic.forEach(([e, txt], i) => {
          drawEmoji(c, e, x + fs * 0.55, y + fs * 0.4, fs * 1.05, 1);
          schrift(c, txt, x + fs * 1.2, y + fs * 0.38, fs, e === '🏨' ? '#ffd36b' : e === '🎓' ? '#d6a8ff' : '#ffe08a', 700, 'left');
          x += ws[i] + gap;
        });
        c.globalAlpha = 1;
      }
    }
  }

  /** Leuchtende Bodenplatte (Scheibe + drehender Strichkranz) unter einer Kolonie. */
  _plattform(c, x, y, r, rgb, a, t) {
    const g = c.createRadialGradient(x, y, 0, x, y, r * 1.5);
    g.addColorStop(0, `rgba(${rgb},${0.35 * a})`); g.addColorStop(0.7, `rgba(${rgb},${0.12 * a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g;
    c.beginPath(); c.ellipse(x, y, r * 1.5, r * 1.5 * ER, 0, 0, TAU); c.fill();
    ellipseRing(c, x, y, r * 1.45, rgb, 0.55 * a, 1.5, [2, 7], this.reduziert ? 0 : -t * 14);
  }

  _routen() {
    const W = this.game.state.welt;
    return [...(W.strassen ?? []), ...(W.boten ?? [])];
  }
  _bogenFuer(r, P) {
    const A = P[r.a], B = P[r.b];
    if (!A || !B) return null;
    const lift = r.art === 'boten' ? 0.3 : 0.16;
    return bogen(A.x, A.y, B.x, B.y, lift);
  }

  _ebeneNetz(c, alpha) {
    const D = this.D, P = this.P, t = this.t, u = this.u, W = this.game.state.welt;
    const speed = this.reduziert ? 0.3 : 1;
    c.globalCompositeOperation = 'lighter';
    // Netz-Teile (nur wenn getrennt)
    if (D.gruppen.length > 1) {
      D.gruppen.forEach((gr, i) => {
        const rgb = rgbHex(GRUPPEN_FARBEN[i % GRUPPEN_FARBEN.length]);
        for (const id of gr) { const p = P[id]; if (p?.sicht) ellipseRing(c, p.x, p.y, 46 * u, rgb, 0.45 * alpha * p.a, 2, [6, 6], t * 12); }
      });
    }
    // Routen
    for (const r of this._routen()) {
      const b = this._bogenFuer(r, P);
      if (!b) continue;
      const a = alpha * Math.min(P[r.a].a, P[r.b].a);
      if (a <= 0.01) continue;
      const rgb = r.art === 'boten' ? '111,224,255' : '255,184,77';
      if (r.bau < 1) {
        c.setLineDash([6, 8]); c.lineDashOffset = -t * 20;
        c.strokeStyle = `rgba(${rgb},${0.35 * a})`; c.lineWidth = 2; bogenPfad(c, b); c.stroke();
        c.setLineDash([]);
        c.strokeStyle = `rgba(${rgb},${0.9 * a})`; c.lineWidth = 3; bogenPfad(c, b, 0, r.bau); c.stroke();
        const [mx, my] = bp(b, 0.5);
        c.globalCompositeOperation = 'source-over';
        kapsel(c, mx, my, `${Math.round(r.bau * 100)} %`, 11 * u, rgb, a, '🚧');
        c.globalCompositeOperation = 'lighter';
        continue;
      }
      const dicke = r.art === 'strasse' ? 1 + (r.stufe ?? 1) : 2;
      c.strokeStyle = `rgba(${rgb},${0.13 * a})`; c.lineWidth = 10 + dicke * 2; bogenPfad(c, b); c.stroke();
      c.strokeStyle = `rgba(${rgb},${0.75 * a})`; c.lineWidth = dicke; bogenPfad(c, b); c.stroke();
      // fließende Teilchen
      const fl = D.fluesse.find(f => f.id === r.id && f.art === r.art);
      const n = Math.max(3, Math.round(b.d / 55));
      const richtung = fl?.ware ? (fl.ware.von === r.a ? 1 : -1) : 1;
      for (let i = 0; i < n; i++) {
        let f = ((i / n) + t * speed * (r.art === 'boten' ? 0.22 : 0.12) * (220 / Math.max(120, b.d))) % 1;
        if (richtung < 0) f = 1 - f;
        const [x, y] = bp(b, f);
        drawGlow(c, rgb, x, y, (r.art === 'boten' ? 7 : 6) * u, 0.9 * a);
      }
      // Wissens-Pulse: hell leuchtende Pakete, die in die Kolonien „einschlagen"
      if (r.art === 'boten') {
        for (const [von, zu, off] of [[0, 1, 0], [1, 0, 0.5]]) {
          const ph = (t * speed * 0.33 + off + r.id * 0.17) % 1;
          const [x, y] = bp(b, lerp(von, zu, ph));
          drawGlow(c, '200,250,255', x, y, 14 * u, a);
          if (ph > 0.85) {
            const k = (ph - 0.85) / 0.15, ziel = P[zu ? r.b : r.a];
            ellipseRing(c, ziel.x, ziel.y, (14 + k * 40) * u, '160,240,255', (1 - k) * 0.9 * a, 2.5);
          }
        }
      }
      if (fl?.ware) {
        const ph = (t * speed * 0.1 + r.id * 0.31) % 1;
        const [x, y] = bp(b, richtung > 0 ? ph : 1 - ph);
        c.globalCompositeOperation = 'source-over';
        drawEmoji(c, '🍯', x, y + 6 * u, 15 * u, a);
        c.globalCompositeOperation = 'lighter';
      }
    }
    // Besuche unterwegs
    for (const v of W.besuche ?? []) {
      const r = W.strassen.find(x => x.id === v.route) ?? { a: v.von, b: v.nach, art: 'strasse' };
      const b = this._bogenFuer({ ...r, art: 'strasse' }, P);
      if (!b) continue;
      const a = alpha * Math.min(P[r.a].a, P[r.b].a);
      const pp = r.a === v.von ? v.p : 1 - v.p;
      const B = BESUCHE[v.art], rgb = rgbHex(B?.farbe ?? '#ffffff');
      for (let j = 1; j <= 5; j++) { // Schweif
        const q = clamp(pp + (r.a === v.von ? -1 : 1) * j * 0.012, 0, 1);
        const [x, y] = bp(b, q);
        drawGlow(c, rgb, x, y, (9 - j) * u, 0.5 * a * (1 - j / 6));
      }
      const [x, y] = bp(b, pp);
      drawGlow(c, rgb, x, y, 22 * u, a);
      drawGlow(c, '255,255,255', x, y, 6 * u, a);
      c.globalCompositeOperation = 'source-over';
      drawEmoji(c, B?.icon ?? '🐜', x, y - 10 * u, 20 * u, a);
      c.globalCompositeOperation = 'lighter';
    }
    // Kolonien: Knoten, Hotels / Warnfeuer
    for (const k of D.liste) {
      const p = P[k.id];
      if (!p.sicht || p.a <= 0) continue;
      const a = alpha * p.a;
      c.globalCompositeOperation = 'lighter';
      drawGlow(c, '111,224,255', p.x, p.y, 26 * u, 0.6 * a);
      ellipseRing(c, p.x, p.y, 16 * u, '111,224,255', 0.8 * a, 2);
      c.globalCompositeOperation = 'source-over';
      if (k.hotel.stufe) {
        kapsel(c, p.x, p.y - 28 * u, '★'.repeat(k.hotel.stufe), 11 * u, '95,255,176', a, '🏨');
      } else if (D.liste.length > 1) {
        c.globalCompositeOperation = 'lighter';
        const puls = 0.5 + 0.5 * Math.sin(t * 5 + p.d * 0.01);
        const g = c.createLinearGradient(0, p.y, 0, p.y - 70 * u);
        g.addColorStop(0, `rgba(255,70,90,${0.55 * a * (0.5 + puls * 0.5)})`); g.addColorStop(1, 'rgba(255,70,90,0)');
        c.fillStyle = g; c.fillRect(p.x - 4 * u, p.y - 70 * u, 8 * u, 70 * u);
        ellipseRing(c, p.x, p.y, (20 + puls * 10) * u, '255,80,100', 0.8 * a, 2, [5, 5], -t * 25);
        c.globalCompositeOperation = 'source-over';
        kapsel(c, p.x, p.y - 80 * u, 'fehlt', 11 * u, '255,90,110', a, '🏨');
      }
      this._name2(c, k, p, p.y + 26 * u, a, `${k.strassen} 🛣️  ${k.boten} 📨`);
    }
  }

  _ebeneSkala(c, alpha) {
    const D = this.D, P = this.P, t = this.t, u = this.u, ks = D.ks;
    const H = P.heim;
    const akt = [TYP0, ...ks.stufen][ks.typ];
    const rgbT = rgbHex(akt.farbe);
    const speed = this.reduziert ? 0.3 : 1;
    c.globalCompositeOperation = 'lighter';
    // Energieströme zum Kern
    for (const b of ks.beitraege) {
      const p = P[b.id];
      if (!p || b.id === 'heim' || !H) continue;
      const a = alpha * Math.min(p.a, H.a);
      const bg = bogen(p.x, p.y, H.x, H.y, 0.12);
      c.strokeStyle = `rgba(214,168,255,${0.25 * a})`; c.lineWidth = 1 + b.anteil * 14; bogenPfad(c, bg); c.stroke();
      const n = 2 + Math.round(b.anteil * 16);
      for (let i = 0; i < n; i++) {
        const f = ((i / n) + t * speed * 0.18) % 1;
        const [x, y] = bp(bg, f);
        drawGlow(c, '230,200,255', x, y, 5 * u, 0.8 * a);
      }
    }
    // Ringe & Säulen je Kolonie
    for (const b of ks.beitraege) {
      const p = P[b.id];
      if (!p?.sicht || p.a <= 0) continue;
      const a = alpha * p.a;
      const rr = (16 + Math.sqrt(b.anteil) * 70) * u;
      ellipseRing(c, p.x, p.y, rr, '214,168,255', 0.85 * a, 3);
      ellipseRing(c, p.x, p.y, rr * 0.75, '214,168,255', 0.35 * a, 1.5, [4, 6], t * 20);
      drawGlow(c, '214,168,255', p.x, p.y, rr * 1.2, 0.25 * a);
      saeule(c, p.x, p.y, (10 + b.anteil * 260) * u * easeBack(p.a), 7 * u, '214,168,255', a * 0.9, t);
    }
    // Kern über dem Heimatnest
    if (H?.sicht !== false && H) {
      const a = alpha * H.a;
      const cy = H.y - 60 * u;
      for (let i = 0; i < 3; i++) {
        const r = (46 + i * 18) * u;
        c.save(); c.translate(H.x, cy); c.scale(1, ER + i * 0.08);
        c.rotate(t * (i % 2 ? -0.6 : 0.8) * speed);
        c.strokeStyle = `rgba(${rgbT},${(0.85 - i * 0.2) * a})`; c.lineWidth = 2.5;
        c.setLineDash([r * 0.9, r * 0.35]);
        c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
        c.restore();
      }
      c.setLineDash([]);
      drawGlow(c, rgbT, H.x, cy, 60 * u, 0.7 * a);
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = a;
      drawEmoji(c, akt.icon, H.x, cy + 10 * u, 30 * u, 1);
      schrift(c, `TYP ${komma(ks.wert)}`, H.x, cy - 46 * u, 24 * u, '#ffffff', 700);
      schrift(c, akt.name, H.x, cy - 26 * u, 13 * u, akt.farbe, 700);
      c.globalAlpha = 1;
    }
    c.globalCompositeOperation = 'source-over';
    for (const b of ks.beitraege) {
      const p = P[b.id], k = D.byId[b.id];
      if (!p?.sicht || p.a <= 0 || !k) continue;
      const a = alpha * p.a;
      if (b.id !== 'heim') kapsel(c, p.x, p.y - (24 + b.anteil * 260) * u * easeBack(p.a), `${Math.round(b.anteil * 100)} %`, 11.5 * u, '214,168,255', a);
      this._name2(c, k, p, p.y + (b.id === 'heim' ? 34 : 24) * u + (16 + Math.sqrt(b.anteil) * 70) * u * ER, a);
    }
  }

  _ebeneDuft(c, alpha) {
    const D = this.D, P = this.P, t = this.t, u = this.u, flt = this.duftFilter;
    const speed = this.reduziert ? 0.25 : 1;
    const arten = Object.keys(DUEFTE);
    c.globalCompositeOperation = 'lighter';
    // Duftspuren entlang der Routen (Wegduft = Straßen, Wissensduft = Botenlinien)
    for (const sp of D.duft.spuren) {
      const art = sp.art === 'boten' ? 'lern' : 'weg';
      if (!flt.has(art)) continue;
      const b = this._bogenFuer(sp, P);
      if (!b) continue;
      const a = alpha * Math.min(P[sp.a].a, P[sp.b].a) * clamp(sp.staerke, 0.15, 1);
      const rgb = rgbHex(DUEFTE[art].farbe);
      const n = Math.max(6, Math.round(b.d / 18));
      const nx = -(b.by - b.ay) / (b.d || 1), ny = (b.bx - b.ax) / (b.d || 1);
      for (let i = 0; i < n; i++) {
        const f = ((i / n) + t * speed * 0.03) % 1;
        const [x, y] = bp(b, f);
        const w = Math.sin(f * 18 + t * speed * 2 + i) * 6 * u;
        drawGlow(c, rgb, x + nx * w, y + ny * w, (8 + 4 * Math.sin(i)) * u, 0.45 * a);
      }
    }
    // Duftwolken
    for (const k of D.duft.kolonien) {
      const p = P[k.id];
      if (!p?.sicht || p.a <= 0) continue;
      const a = alpha * p.a;
      k.duefte.forEach((x, i) => {
        if (!flt.has(x.art) || x.staerke < 0.04) return;
        const rgb = rgbHex(x.farbe), s = x.staerke;
        for (let j = 0; j < 3; j++) {
          const ang = (i / 6) * TAU + t * speed * (0.12 + j * 0.05) + j * 2.1;
          const off = (20 + 20 * s + j * 8) * u;
          const cx = p.x + Math.cos(ang) * off, cy = p.y + Math.sin(ang) * off * 0.55 - (8 + j * 9) * u;
          const R = (24 + 64 * s - j * 6) * u * (1 + 0.1 * Math.sin(t * speed * 1.3 + i + j));
          drawGlow(c, rgb, cx, cy, R, (0.32 - j * 0.07) * (0.3 + 0.7 * s) * a * 1.25);
        }
        // aufsteigende Duftteilchen
        for (let j = 0; j < 3; j++) {
          const f = (t * speed * 0.25 + j / 3 + i * 0.13) % 1;
          const ang = (i / 6) * TAU + j;
          const x0 = p.x + Math.cos(ang) * 20 * u * s + Math.sin(f * 6 + i) * 6 * u;
          drawGlow(c, rgb, x0, p.y - 10 * u - f * 70 * u * (0.5 + s), 4 * u, (1 - f) * s * a);
        }
      });
    }
    // Beschriftung: stärkster sichtbarer Duft
    c.globalCompositeOperation = 'source-over';
    for (const k of D.duft.kolonien) {
      const p = P[k.id], kol = D.byId[k.id];
      if (!p?.sicht || p.a <= 0 || !kol) continue;
      const a = alpha * p.a;
      const sichtbar = k.duefte.filter(x => flt.has(x.art)).sort((x, y) => y.staerke - x.staerke);
      const st = sichtbar[0];
      if (st && st.staerke >= 0.05) kapsel(c, p.x, p.y - (52 + 30 * st.staerke) * u, `${prozent(st.staerke)}`, 11.5 * u, rgbHex(st.farbe), a, st.icon);
      this._name2(c, kol, p, p.y + 30 * u, a);
    }
    void arten;
  }

  _ebeneBau(c, alpha) {
    const D = this.D, P = this.P, t = this.t, u = this.u, s = this.game.state;
    c.globalCompositeOperation = 'lighter';
    // vorgeschlagene Verbindungen als Geister-Bögen
    for (const v of D.vorschlaege) {
      const A = P[v.a], B = P[v.b];
      if (!A || !B) continue;
      const a = alpha * Math.min(A.a, B.a);
      const b = bogen(A.x, A.y, B.x, B.y, v.art === 'boten' ? 0.3 : 0.16);
      c.setLineDash([3, 9]); c.lineDashOffset = -t * 16;
      c.strokeStyle = `rgba(255,255,255,${0.55 * a})`; c.lineWidth = 2; bogenPfad(c, b); c.stroke();
      c.setLineDash([]);
      const [mx, my] = bp(b, 0.5);
      c.globalCompositeOperation = 'source-over';
      kapsel(c, mx, my, 'fehlt', 10.5 * u, v.art === 'boten' ? '111,224,255' : '255,184,77', a, ROUTEN[v.art].icon);
      c.globalCompositeOperation = 'lighter';
    }
    void s;
    // Abzeichen je Kolonie
    for (const k of D.bedarf.proKolonie) {
      const p = P[k.id], kol = D.byId[k.id];
      if (!p?.sicht || p.a <= 0 || !kol) continue;
      const a = alpha * p.a;
      const top = k.items[0];
      const prio = top?.prio ?? 0;
      const rgb = rgbHex(PRIO[prio].farbe);
      const puls = prio >= 3 && !this.reduziert ? 0.5 + 0.5 * Math.sin(t * 6) : 0.6;
      const bx = p.x, by = p.y - 40 * u * easeBack(p.a), r = 17 * u;
      c.globalCompositeOperation = 'lighter';
      ellipseRing(c, p.x, p.y, 18 * u, rgb, 0.7 * a, 2);
      if (prio >= 2) ellipseRing(c, p.x, p.y, (22 + puls * 14) * u, rgb, (1 - puls) * 0.8 * a, 2);
      c.strokeStyle = `rgba(${rgb},${0.6 * a})`; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(bx, by + r); c.stroke();
      drawGlow(c, rgb, bx, by, r * 2.4, (0.35 + 0.3 * puls) * a);
      c.globalCompositeOperation = 'source-over';
      // Sechseck
      c.globalAlpha = a;
      c.beginPath();
      for (let i = 0; i < 6; i++) { const w = (i / 6) * TAU + Math.PI / 6; c.lineTo(bx + Math.cos(w) * r, by + Math.sin(w) * r); }
      c.closePath();
      c.fillStyle = 'rgba(4,16,40,.88)'; c.fill();
      c.strokeStyle = `rgb(${rgb})`; c.lineWidth = 2.5; c.stroke();
      drawEmoji(c, top?.icon ?? '🌟', bx, by + 6.5 * u, 17 * u, 1);
      const n = k.items.filter(i => i.prio > 0).length;
      if (n > 1) {
        c.fillStyle = `rgb(${rgb})`;
        c.beginPath(); c.arc(bx + r * 0.85, by - r * 0.75, 8 * u, 0, TAU); c.fill();
        c.fillStyle = '#071833'; c.font = `700 ${Math.round(10.5 * u)}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(String(n), bx + r * 0.85, by - r * 0.75 + 0.5);
        c.textBaseline = 'alphabetic';
      }
      c.globalAlpha = 1;
      this._name2(c, kol, p, p.y + 24 * u, a, prio ? PRIO[prio].name : null);
    }
  }
}
