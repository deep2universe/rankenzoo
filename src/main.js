// Ameisenreich – Einstieg & Spielsteuerung.
import { GEBAEUDE, GROUND, TILE as T, COLS, hillUpgradeCost } from './game/config.js';
import { newGame, load, save } from './game/state.js';
import { tick, derive, refreshConnectivity, hochzeitsflugBereit } from './game/sim.js';
import { digCell, placeBuilding, demolishAt, upgradeHill, hochzeitsflug, grantPlan } from './game/actions.js';
import { get, idx, hillTop } from './game/world.js';
import { pruefeMissionen } from './game/missions.js';
import { C } from './game/config.js';
import { Renderer } from './render/renderer.js';
import { RevierRenderer } from './render/revierRenderer.js';
import { sendeExpedition, setzeTrupp, handeln, revierBedarf } from './game/revier.js';
import { TECHS } from './game/forschung.js';
import { QUELLEN, STOERER, SIM } from './game/config.js';
import { verfuegbarePlaene } from './game/actions.js';
import { pick } from './util.js';
import { HUD } from './ui/hud.js';
import { openQuiz } from './ui/quiz.js';
import { openMinigames } from './ui/minigames.js';
import { openForschung } from './ui/forschungUI.js';
import { startScreen, missionenScreen, wissensbuch, einstellungen, roomInfo } from './ui/screens.js';
import { toast, konfetti, modalOffen, closeTop, topModal } from './ui/modal.js';
import { setupInput, cellLine } from './input.js';
import { loadBanks } from './quiz/engine.js';
import { sfx, startMusic, configureAudio } from './audio.js';
import { on } from './events.js';
import { h } from './util.js';

const canvas = document.getElementById('welt');
const renderer = new Renderer(canvas);
const revierR = new RevierRenderer(canvas);

const game = {
  state: null, d: null, renderer, revierR, hud: null, tool: null, buildTyp: null, pausen: 0,
  digging: null, lastDigCell: null, hinweisZeit: {},
  modus: 'nest', uebergang: null, lastInput: 0,

  /** Merkt sich Benutzer-Aktivität (für die Bildrate). */
  poke() { this.lastInput = performance.now(); },
  aktiverRenderer() { return this.modus === 'revier' ? revierR : renderer; },

  /** Shift: zwischen Nest (Bauen) und Revier (Befehlen) wechseln. */
  wechsleModus(ziel) {
    ziel ??= this.modus === 'nest' ? 'revier' : 'nest';
    if (ziel === this.modus || this.uebergang || !this.hud) return;
    if (this.modalOffen()) return;
    // Bild der alten Ansicht für die Überblendung festhalten
    const snap = document.createElement('canvas');
    snap.width = canvas.width; snap.height = canvas.height;
    snap.getContext('2d').drawImage(canvas, 0, 0);
    const vonNest = this.modus === 'nest';
    const [ax, ay] = vonNest ? renderer.worldToScreen((30.5) * T, hillTop(this.state.world) * T) : revierR.nestScreen();
    this.setTool(null, null, true);
    revierR.tool = null;
    this.modus = ziel;
    if (ziel === 'revier') {
      revierR.maxDpr = renderer.maxDpr;
      if (!revierR.state || revierR.state !== this.state) revierR.setState(this.state);
      revierR.focusNest();
      if (!this.state.revier.besucht) {
        this.state.revier.besucht = true;
        setTimeout(() => toast('Willkommen im Revier! Tippe auf eine Futterquelle und schicke Sammlerinnen hin. Mit 🔭 Erkunden lüftest du den Nebel. Shift ⇧ bringt dich zurück ins Nest.', { icon: '🗺️', art: 'gold', dauer: 8000 }), 900);
      }
      this.state.stats.revierBesuche++;
    } else renderer.focusHome();
    this.uebergang = { t: 0, dauer: 0.85, snap, ax, ay, ziel };
    document.body.classList.toggle('modus-revier', ziel === 'revier');
    document.body.classList.add('modus-wechsel');
    setTimeout(() => document.body.classList.remove('modus-wechsel'), 900);
    sfx.whoosh();
    this.hud.modusGewechselt?.();
    this.poke();
  },

  // ---------- Revier-Befehle ----------
  freieAmeisen() { return Math.max(0, this.d.jobs.sammler - 2); },
  trupp(qid, art, delta) {
    const frei = this.freieAmeisen();
    if (delta > 0 && frei <= 0) { toast('Keine freien Arbeiterinnen mehr! Lass dein Volk wachsen oder ziehe Ameisen woanders ab.', { icon: '🐜', art: 'warn' }); sfx.error(); return; }
    if (setzeTrupp(this.state.revier, qid, art, delta, delta > 0 ? frei : Infinity)) { sfx.click(); this.d = derive(this.state); this.hud.revier?.refresh(true); }
  },
  expedition(tx, ty, n) {
    if (this.freieAmeisen() < n) { toast(`Für die Expedition brauchst du ${n} freie Arbeiterinnen.`, { icon: '🔭', art: 'warn' }); sfx.error(); return false; }
    const r = sendeExpedition(this.state.revier, tx, ty, n, this.d.fx);
    if (!r.ok) { toast(r.grund, { icon: '🔭', art: 'warn' }); sfx.error(); return false; }
    sfx.place();
    this.d = derive(this.state);
    this.hud.revier?.refresh(true);
    return true;
  },
  handeln(i) {
    const r = handeln(this.state, i);
    if (!r.ok) { if (r.grund) toast(r.grund, { icon: '🤝', art: 'warn' }); sfx.error(); return; }
    this.state.stats.handel++;
    sfx.coin(); toast('Handel abgeschlossen!', { icon: '🤝', art: 'gut' });
    this.hud.revier?.refresh(true);
  },
  revierClick(sx, sy) {
    const q = revierR.quelleAt(sx, sy);
    if (revierR.tool === 'exp') {
      const [cx, cy] = revierR.cellAt(sx, sy);
      if (this.expedition(cx, cy, this.hud.revier?.expGroesse ?? 2)) { revierR.tool = null; this.hud.revier?.refresh(true); }
      return;
    }
    revierR.selected = q?.id ?? null;
    this.hud.revier?.waehle(q);
    if (q) sfx.click();
  },
  revierHover(sx, sy) {
    revierR.hover = revierR.quelleAt(sx, sy);
    revierR.hoverCell = revierR.cellAt(sx, sy);
  },

  pause(an) { this.pausen = Math.max(0, this.pausen + (an ? 1 : -1)); },
  modalOffen, closeModal: closeTop,
  modalKey(e) { const m = topModal(); return m?._key ? !!m._key(e) : false; },

  setTool(tool, typ = null, still = false) {
    if (this.modus === 'revier' && tool) this.wechsleModus('nest');
    this.tool = tool; this.buildTyp = tool === 'bauen' ? typ : null;
    renderer.overlay.tool = tool; renderer.overlay.typ = this.buildTyp;
    canvas.className = tool ? 'tool-' + tool : '';
    if (tool === 'gang') this.hud.zeigeHinweis(`⛏️ Ziehe mit dem Finger durch die Erde, um Gänge zu graben. (${this.state.res.gang} Gangstücke übrig)`, '', 4000);
    else if (tool === 'abriss') this.hud.zeigeHinweis('🧹 Tippe auf einen Gang oder eine Kammer zum Entfernen.', '', 3500);
    else if (tool === 'bauen') {
      const g = GEBAEUDE[typ];
      const wo = g.zone === 'oberflaeche' ? 'auf die Wiese neben den Hügel' : g.zone === 'huegel' ? 'in den Ameisenhügel' : `an einen Gang${g.minTiefe > 2 ? ` (mind. ${g.minTiefe} Reihen tief)` : ''}`;
      this.hud.zeigeHinweis(`${g.icon} ${g.name}: Setze die Kammer ${wo}. Kammern dürfen auch auf Gänge gebaut werden!`, '', 5000);
    } else this.hud.versteckeHinweis();
    this.hud.planSig = '';
    if (!still) sfx.click();
  },
  selectPlan(typ) {
    if (this.tool === 'bauen' && this.buildTyp === typ) return this.setTool(null);
    this.setTool('bauen', typ);
  },
  zoom(f) { const R = this.aktiverRenderer(); R.zoomAt(R.vw / 2, R.vh / 2, f); this.poke(); },
  focusHome() { if (this.modus === 'revier') revierR.focusNest(); else renderer.focusHome(); this.poke(); },
  toggleTempo() { this.state.einstellungen.tempo = this.state.einstellungen.tempo === 2 ? 1 : 2; sfx.click(); },

  startDig() { this.digging = new Set(); this.lastDigCell = null; this.digFehler = null; },
  digTo(cell) {
    if (!this.digging) return;
    const cells = this.lastDigCell ? cellLine(this.lastDigCell, cell).slice(1) : [cell];
    for (const [x, y] of cells) {
      this.lastDigCell = [x, y];
      const t = get(this.state.world, x, y);
      if (t === C.TUNNEL || t === C.ROOM) continue;
      const r = digCell(this.state, x, y, this.digging);
      if (r.ok) {
        this.digging.add(idx(x, y));
        renderer.overlay.drag = this.digging;
        renderer.spawnParticles((x + 0.5) * T, (y + 0.5) * T, 'staub', 6);
        sfx.dig();
      } else if (r.grund && r.grund !== this.digFehler) {
        this.digFehler = r.grund;
        this.hud.zeigeHinweis('❌ ' + r.grund, 'fehler', 2500);
        if (this.state.res.gang <= 0) break;
      }
    }
  },
  endDig() {
    if (this.digging?.size) this.hud.zeigeHinweis(`⛏️ ${this.digging.size} Gangstücke gegraben! Noch ${this.state.res.gang} übrig.`, 'ok', 2200);
    this.digging = null; renderer.overlay.drag = null; this.lastDigCell = null;
  },
  tryPlace(cell) {
    if (!this.buildTyp) return;
    const [ax, ay] = renderer.anchorFor(this.buildTyp, cell);
    const r = placeBuilding(this.state, this.buildTyp, ax, ay);
    if (!r.ok) { sfx.error(); this.hud.zeigeHinweis('❌ ' + r.grund, 'fehler', 3000); return; }
    const g = GEBAEUDE[this.buildTyp];
    sfx.place();
    renderer.spawnParticles((ax + g.w / 2) * T, (ay + g.h / 2) * T, 'staub', 22);
    this.hud.zeigeHinweis(`🏗️ Baustelle eröffnet! Deine Arbeiterinnen bauen ${g.name === 'Universität' ? 'die' : 'die Kammer'} ${g.name}.${r.room.ersetzt.length ? ` (+${r.room.ersetzt.length} Gangstücke zurück)` : ''}`, 'ok', 3500);
    if (!this.state.plaene[this.buildTyp]) this.setTool(null);
    this.hud.planSig = '';
    this.save();
  },
  tryDemolish(cell) {
    const [x, y] = cell;
    const t = get(this.state.world, x, y);
    if (t === C.ROOM) {
      const room = this.state.rooms.find(r => r.id === this.state.world.raum[idx(x, y)]);
      if (room) roomInfo(this, room);
      return;
    }
    const r = demolishAt(this.state, x, y);
    if (r.ok) { sfx.dig(); renderer.spawnParticles((x + 0.5) * T, (y + 0.5) * T, 'staub', 8); }
    else if (r.grund) this.hud.zeigeHinweis('❌ ' + r.grund, 'fehler');
  },
  demolishRoom(room) {
    const r = demolishAt(this.state, room.x, room.y);
    if (r.ok) { sfx.dig(); toast(`${GEBAEUDE[room.typ].name} abgerissen – Bauplan zurück in der Bauleiste.`, { icon: '🧹' }); this.save(); }
    else if (r.grund) toast(r.grund, { icon: '❌', art: 'warn' });
  },
  hover() {},
  clickWorld(cell) {
    const [x, y] = cell;
    const t = get(this.state.world, x, y);
    if (t === C.ROOM) {
      const id = this.state.world.raum[idx(x, y)];
      const room = this.state.rooms.find(r => r.id === id);
      if (room) { renderer.overlay.selected = id; roomInfo(this, room); return; }
    }
    renderer.overlay.selected = null;
    const [wx, wy] = renderer.screenToWorld(...renderer.worldToScreen((x + 0.5) * T, (y + 0.5) * T));
    const ant = renderer.agents.hit(wx, wy);
    if (ant) {
      const jobs = { sammler: 'Sammlerin – holt Futter von draußen', bau: 'Bauarbeiterin – baut neue Kammern', amme: 'Amme – pflegt Eier, Larven und Puppen', drohne: 'Drohne – männliche Ameise mit Flügeln, wartet auf den Hochzeitsflug' };
      const room = ant.roomId && this.state.rooms.find(r => r.id === ant.roomId);
      const txt = ant.job === 'personal' && room ? `${GEBAEUDE[room.typ].beruf?.name} in: ${GEBAEUDE[room.typ].name}` : jobs[ant.job];
      toast(txt, { icon: ant.rolle === 'drohne' ? '🪽' : '🐜' });
    }
  },
  upgradeHill() {
    const r = upgradeHill(this.state, this.d.pop);
    if (!r.ok) { sfx.error(); toast(r.grund, { icon: '⛰️', art: 'warn' }); return; }
    this.hud.panelSig = '';
  },
  hochzeitsflug() {
    const b = hochzeitsflugBereit(this.state, this.d);
    if (!b.ok) return;
    hochzeitsflug(this.state);
  },
  derive() { return derive(this.state); },
  openForschung() { if (!modalOffen()) openForschung(this); },
  openArchiv() { if (!modalOffen()) import('./ui/archiv.js').then(m => m.openFragenArchiv(this)).catch(() => toast('Das Fragen-Archiv ist noch nicht da.', { icon: '🗂️' })); },
  openQuiz() { if (!modalOffen()) openQuiz(this); },
  openMinigames() { if (!modalOffen()) openMinigames(this); },
  openMissions() { missionenScreen(this); },
  openWissen() { wissensbuch(this); },
  openSettings() { einstellungen(this); },
  save() { if (this.state && !this.noSave) save(this.state); },
  stopAutosave() { this.noSave = true; },
};

// ---------- Ereignisse ----------
function throttleToast(key, sek, text, opts) {
  const now = performance.now();
  if (now - (game.hinweisZeit[key] ?? -1e9) < sek * 1000) return;
  game.hinweisZeit[key] = now;
  toast(text, opts);
}
on('gebaut', r => {
  const g = GEBAEUDE[r.typ];
  sfx.built();
  renderer.spawnParticles((r.x + g.w / 2) * T, (r.y + g.h / 2) * T, 'stern', 18);
  toast(`${g.name} ist fertig!`, { icon: g.icon, art: 'gut' });
  game.save();
});
on('ausgewandert', grund => throttleToast('aus', 20, grund === 'hunger' ? 'Hunger! Eine Ameise ist ausgewandert. Sorge für Nahrung (Denksport bringt Futter)!' : 'Dein Volk ist unglücklich – eine Ameise ist ausgewandert.', { icon: '😢', art: 'warn', dauer: 4500 }));
on('hinweis', x => throttleToast(x.id, 90, x.text, { icon: '💡', dauer: 4500 }));
on('neuerTag', x => { toast(`Ein neuer Ameisentag beginnt: Tag ${x.tag}${x.joker ? ` · +${x.joker} Joker aus der Buchhandlung` : ''}`, { icon: '🌅' }); game.save(); });
on('huegel', lvl => { sfx.fanfare(); konfetti(30); toast(`Der Ameisenhügel ist gewachsen: Stufe ${lvl}!`, { icon: '⛰️', art: 'gold' }); game.save(); });
on('hochzeitsflug', x => {
  sfx.fanfare(); konfetti(60);
  const top = hillTop(game.state.world);
  renderer.agents.startFlight(30.5 * T, top * T, 28);
  renderer.centerOn(30.5 * T, (top - 3) * T);
  toast(`Hochzeitsflug! Eine neue Kolonie wurde gegründet. +${x.sterne} ⭐ und ein Bauplan: ${GEBAEUDE[x.plan].name}. Kronenstufe ${x.stufe}!`, { icon: '🪽', art: 'gold', dauer: 6000 });
  game.save();
});
on('geschluepft', k => {
  const q = game.state.rooms.find(r => r.typ === 'koenigin');
  if (q && Math.random() < 0.6) renderer.floatText((q.x + 2) * T, q.y * T, k === 'd' ? '+1 Drohne 🪽' : '+1 Ameise 🐜', '#ffe680');
});
on('platziert', ({ ersetzt }) => { if (ersetzt) toast(`Gang durch Kammer ersetzt: +${ersetzt} Gangstücke zurück!`, { icon: '🔁' }); });
on('modal', n => { if (!n) game.hud?.update(game.d); });
on('antwort', ({ richtig }) => { if (richtig && game.state) game.state.res.fp = (game.state.res.fp ?? 0) + SIM.fpProRichtig; });
on('minispielEnde', () => { if (game.state) game.state.res.fp = (game.state.res.fp ?? 0) + 1; });
on('forschungFertig', id => {
  const t = TECHS[id];
  game.state.stats.forschungen++;
  sfx.fanfare(); konfetti(25);
  toast(`Forschung abgeschlossen: ${t.name}! ${t.text}`, { icon: t.icon, art: 'gold', dauer: 5500 });
  game.hud.planSig = ''; game.hud.panelSig = '';
  game.save();
});
on('quelleEntdeckt', q => {
  const Q = QUELLEN[q.typ];
  if (q.typ === 'schatz') throttleToast('schatzSicht', 4, 'Etwas glitzert im Gras … ein geheimnisvoller Fund! Schicke eine Expedition genau dorthin.', { icon: '🎁', art: 'gold' });
  else if (q.typ === 'nachbar') { sfx.fanfare(); toast(`Entdeckt: ${Q.name}! Mit Diplomatie oder Handelsposten könnt ihr tauschen.`, { icon: Q.icon, art: 'gold', dauer: 5500 }); }
  else throttleToast('q' + q.typ, 3, `Neue Quelle entdeckt: ${Q.name} ${Q.icon}`, { icon: '🔭', art: 'gut' });
});
on('expHeim', e => {
  if (e.fund?.plan) {
    const p = pick(verfuegbarePlaene(game.state));
    if (p) { grantPlan(game.state, p); e.fund.planTyp = p; }
  }
  const f = e.fund;
  if (!f) toast('Die Expedition ist zurück – diesmal ohne Fund, aber mit neuen Eindrücken.', { icon: '🚩' });
  else if (f.klein) toast(`Expedition zurück! Fundstücke: +${f.sterne} ⭐${f.material ? ` +${f.material} 🪵` : ''}`, { icon: '🚩', art: 'gut' });
  else { sfx.fanfare(); konfetti(40); toast(`Schatz gefunden! +${f.sterne} ⭐ +${f.material} 🪵${f.planTyp ? ` und ein Bauplan: ${GEBAEUDE[f.planTyp].name} ${GEBAEUDE[f.planTyp].icon}` : ''}${f.joker ? ' und ein Joker 🃏' : ''}`, { icon: '🎁', art: 'gold', dauer: 6000 }); }
  game.hud.planSig = '';
  game.save();
});
on('stoerer', q => throttleToast('st' + q.id, 10, `Ein ${STOERER[q.stoerer.typ].name} ${STOERER[q.stoerer.typ].icon} ${STOERER[q.stoerer.typ].text} (${QUELLEN[q.typ].name}). Schicke Wächterinnen 🛡️ im Revier!`, { icon: '⚠️', art: 'warn', dauer: 5500 }));
on('vertrieben', ({ typ }) => { sfx.richtig(); toast(`Der ${STOERER[typ].name} wurde freundlich verscheucht! +8 ⭐`, { icon: '🛡️', art: 'gut' }); });
on('wetter', w => toast(w === 'regen' ? 'Regenschauer! Draußen wird langsamer gesammelt – aber die Quellen wachsen schneller nach.' : 'Die Sonne ist zurück! ☀️', { icon: w === 'regen' ? '🌧️' : '🌤️' }));
on('quelleLeer', q => throttleToast('leer' + q.id, 30, `${QUELLEN[q.typ].name} ist leer gesammelt. ${QUELLEN[q.typ].regen ? 'Sie wächst langsam nach.' : 'Suche neue Quellen!'}`, { icon: QUELLEN[q.typ].icon, art: 'warn' }));

// ---------- Start ----------
async function boot() {
  document.getElementById('start').replaceChildren(h('div.lade', h('div.em', '🐜'), h('div', 'Die Ameisen krabbeln herbei …')));
  await loadBanks();
  // Hintergrund-Szene hinter dem Startbildschirm
  const vorschau = newGame('Vorschau', 'Vorschau');
  game.state = vorschau;
  renderer.setState(vorschau);
  game.d = derive(vorschau);
  loop.start();
  startScreen((name, kol) => begin(newGame(name, kol), true), () => begin(load() ?? newGame(), false));
}

function begin(state, neu) {
  game.state = state;
  game.noSave = false;
  refreshConnectivity(state);
  state.einstellungen.grafik ??= 'ausgewogen';
  wendeGrafikAn(state.einstellungen.grafik);
  renderer.setState(state);
  revierR.setState(state);
  game.d = derive(state);
  configureAudio(state.einstellungen);
  document.getElementById('hud').hidden = false;
  game.hud = new HUD(game);
  setupInputOnce();
  startMusic();
  game.hud.update(game.d);
  if (neu) {
    setTimeout(() => toast(`Willkommen, ${state.spieler.name === 'Königin' ? 'Königin' : 'Königin ' + state.spieler.name}! Dein Volk „${state.spieler.koloniename}" wartet auf dich.`, { icon: '👑', art: 'gold', dauer: 5000 }), 400);
  }
  game.save();
  clearInterval(game._auto);
  game._auto = setInterval(() => game.save(), 15000);
  window.addEventListener('beforeunload', () => game.save());
  document.addEventListener('visibilitychange', () => { if (document.hidden) game.save(); });
}

let inputCtl = null;
function setupInputOnce() { if (!inputCtl) inputCtl = setupInput(game); }

// ---------- Hauptschleife mit sparsamer Bildrate ----------
// Die Simulation läuft unabhängig von der Bildrate. Gezeichnet wird nur so oft wie nötig:
// flüssig, während jemand scrollt oder zieht – gemächlicher, wenn das Bild ruht oder ein Fenster offen ist.
const GRAFIK = {
  hoch: { dpr: 2, aktiv: 60, ruhe: 60, fenster: 20 },
  ausgewogen: { dpr: 1.5, aktiv: 60, ruhe: 30, fenster: 5 },
  sparsam: { dpr: 1, aktiv: 30, ruhe: 20, fenster: 3 },
};
function wendeGrafikAn(stufe) {
  const g = GRAFIK[stufe] ?? GRAFIK.ausgewogen;
  loop.grafik = g;
  renderer.setMaxDpr(g.dpr);
  revierR.maxDpr = g.dpr;
}
game.wendeGrafikAn = wendeGrafikAn;

const loop = {
  last: 0, acc: 0, hudT: 0, missT: 0, lastDraw: 0, grafik: GRAFIK.ausgewogen, langsam: 0,
  start() { this.last = performance.now(); requestAnimationFrame(t => this.frame(t)); },
  zielFps(now) {
    const g = this.grafik;
    if (game.uebergang) return 60;
    if (game.modalOffen()) return g.fenster;
    if (!game.hud) return 30; // Startbildschirm
    if (now - game.lastInput < 1500 || game.digging) return g.aktiv;
    return g.ruhe;
  },
  frame(now) {
    requestAnimationFrame(t => this.frame(t));
    const ziel = this.zielFps(now);
    if (now - this.lastDraw < 1000 / ziel - 3) return;
    this.lastDraw = now;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const st = game.state;
    if (!st) return;
    const aktiv = game.hud && !game.pausen;
    if (aktiv) {
      this.acc += dt * st.einstellungen.tempo;
      let n = 0;
      while (this.acc >= 0.1 && n++ < 10) { game.d = tick(st, 0.1); this.acc -= 0.1; }
    } else if (!game.hud) {
      // Startbildschirm: Zeit langsam laufen lassen
      st.zeit += dt * 3;
      game.d = derive(st);
    }
    inputCtl?.update(dt);
    const t0 = performance.now();
    const fdt = game.pausen ? dt * 0.3 : dt;
    if (game.modus === 'revier') revierR.frame(fdt, game.d); else renderer.frame(fdt, game.d);
    if (game.uebergang) zeichneUebergang(dt);
    // Automatisch sparsamer werden, wenn das Zeichnen dauerhaft zu lange braucht
    const ms = performance.now() - t0;
    this.langsam = ms > 22 ? this.langsam + 1 : Math.max(0, this.langsam - 1);
    if (this.langsam > 90 && renderer.maxDpr > 1) {
      this.langsam = 0;
      renderer.setMaxDpr(Math.max(1, renderer.maxDpr - 0.25));
      revierR.maxDpr = renderer.maxDpr;
    }
    if (game.hud) {
      // Pausen-Erinnerung (Bildschirmzeit gesund halten)
      game.spielzeit = (game.spielzeit ?? 0) + dt;
      if (game.spielzeit > 25 * 60) {
        game.spielzeit = 0;
        toast('Du spielst schon 25 Minuten – Zeit für eine kleine Bewegungspause! Dein Ameisenstaat wartet auf dich. 🤸', { icon: '⏰', art: 'gold', dauer: 9000 });
      }
      this.hudT -= dt; this.missT -= dt;
      if (this.hudT <= 0) { this.hudT = 0.25; game.hud.update(game.d); }
      if (this.missT <= 0) {
        this.missT = 0.6;
        for (const m of pruefeMissionen(st, game.d)) belohneMission(m);
      }
    }
  },
};

/** Überblendung zwischen Nest und Revier: Iris öffnet sich vom Ameisenhügel aus. */
function zeichneUebergang(dt) {
  const u = game.uebergang;
  u.t += dt;
  const p = Math.min(1, u.t / u.dauer);
  const e = p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
  const ctx = canvas.getContext('2d');
  const k = canvas.width / (canvas.clientWidth || window.innerWidth);
  const W = canvas.width, H = canvas.height;
  const [nx, ny] = (u.ziel === 'revier' ? revierR.nestScreen() : renderer.worldToScreen(30.5 * T, hillTop(game.state.world) * T)).map(v => v * k);
  const maxR = Math.hypot(Math.max(nx, W - nx), Math.max(ny, H - ny));
  const r = e * maxR * 1.05;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // altes Bild außerhalb der Iris, leicht kippend (Nest → Draufsicht) bzw. hineinzoomend
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(nx, ny, r, 0, Math.PI * 2, true); ctx.clip('evenodd');
  const s = 1 + e * 0.35;
  const ax = u.ax * k, ay = u.ay * k;
  ctx.translate(ax, ay);
  if (u.ziel === 'revier') ctx.transform(s, 0, 0, s * (1 - e * 0.45), 0, 0); else ctx.scale(s, s);
  ctx.translate(-ax, -ay);
  ctx.globalAlpha = 1 - e * 0.35;
  ctx.drawImage(u.snap, 0, 0);
  ctx.restore();
  // leuchtender Honigring an der Iriskante
  if (r > 2) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = `rgba(255,214,90,${0.85 * (1 - p)})`; ctx.lineWidth = 14 * k * (1 - p) + 2;
    ctx.beginPath(); ctx.arc(nx, ny, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - p)})`; ctx.lineWidth = 3 * k;
    ctx.beginPath(); ctx.arc(nx, ny, r * 0.985, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  if (p >= 1) game.uebergang = null;
}

function belohneMission(m) {
  const s = game.state;
  if (m.lohn.sterne) s.res.sterne += m.lohn.sterne;
  if (m.lohn.gang) s.res.gang += m.lohn.gang;
  if (m.lohn.joker) s.res.joker = Math.min(9, s.res.joker + m.lohn.joker);
  if (m.lohn.material) s.res.material = (s.res.material ?? 0) + m.lohn.material;
  if (m.lohn.fp) s.res.fp = (s.res.fp ?? 0) + m.lohn.fp;
  if (m.lohn.plan) grantPlan(s, m.lohn.plan);
  sfx.fanfare();
  konfetti(35);
  toast(`Aufgabe geschafft: ${m.titel}!`, { icon: m.icon, art: 'gold', dauer: 4500 });
  game.hud.missionSig = '';
  game.save();
}

window.addEventListener('resize', () => { renderer.resize(); revierR.cache = null; revierR.clampCam(); game.poke(); });
window.__ameisenreich = game; // für Tests & Neugierige
boot();
