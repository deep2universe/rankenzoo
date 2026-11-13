// Ameisenreich – Einstieg & Spielsteuerung.
import { GEBAEUDE, GROUND, TILE as T, COLS, hillUpgradeCost } from './game/config.js';
import { newGame, load, save } from './game/state.js';
import { tick, derive, refreshConnectivity, hochzeitsflugBereit } from './game/sim.js';
import { digCell, placeBuilding, demolishAt, upgradeHill, hochzeitsflug, grantPlan } from './game/actions.js';
import { get, idx, hillTop } from './game/world.js';
import { pruefeMissionen } from './game/missions.js';
import { C } from './game/config.js';
import { Renderer } from './render/renderer.js';
import { HUD } from './ui/hud.js';
import { openQuiz } from './ui/quiz.js';
import { openMinigames } from './ui/minigames.js';
import { startScreen, missionenScreen, wissensbuch, einstellungen, roomInfo } from './ui/screens.js';
import { toast, konfetti, modalOffen, closeTop, topModal } from './ui/modal.js';
import { setupInput, cellLine } from './input.js';
import { loadBanks } from './quiz/engine.js';
import { sfx, startMusic, configureAudio } from './audio.js';
import { on } from './events.js';
import { h } from './util.js';

const canvas = document.getElementById('welt');
const renderer = new Renderer(canvas);

const game = {
  state: null, d: null, renderer, hud: null, tool: null, buildTyp: null, pausen: 0,
  digging: null, lastDigCell: null, hinweisZeit: {},

  pause(an) { this.pausen = Math.max(0, this.pausen + (an ? 1 : -1)); },
  modalOffen, closeModal: closeTop,
  modalKey(e) { const m = topModal(); return m?._key ? !!m._key(e) : false; },

  setTool(tool, typ = null) {
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
    sfx.click();
  },
  selectPlan(typ) {
    if (this.tool === 'bauen' && this.buildTyp === typ) return this.setTool(null);
    this.setTool('bauen', typ);
  },
  zoom(f) { renderer.zoomAt(renderer.vw / 2, renderer.vh / 2, f); },
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
  renderer.setState(state);
  game.d = derive(state);
  configureAudio(state.einstellungen);
  document.getElementById('hud').hidden = false;
  game.hud = new HUD(game);
  setupInputOnce();
  startMusic();
  game.hud.update(game.d);
  if (neu) {
    setTimeout(() => toast(`Willkommen, Königin ${state.spieler.name}! Dein Volk „${state.spieler.koloniename}" wartet auf dich.`, { icon: '👑', art: 'gold', dauer: 5000 }), 400);
  }
  game.save();
  clearInterval(game._auto);
  game._auto = setInterval(() => game.save(), 15000);
  window.addEventListener('beforeunload', () => game.save());
  document.addEventListener('visibilitychange', () => { if (document.hidden) game.save(); });
}

let inputCtl = null;
function setupInputOnce() { if (!inputCtl) inputCtl = setupInput(game); }

const loop = {
  last: 0, acc: 0, hudT: 0, missT: 0,
  start() { this.last = performance.now(); requestAnimationFrame(t => this.frame(t)); },
  frame(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const st = game.state;
    if (st) {
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
      renderer.frame(game.pausen ? dt * 0.3 : dt, game.d);
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
    }
    requestAnimationFrame(t => this.frame(t));
  },
};

function belohneMission(m) {
  const s = game.state;
  if (m.lohn.sterne) s.res.sterne += m.lohn.sterne;
  if (m.lohn.gang) s.res.gang += m.lohn.gang;
  if (m.lohn.joker) s.res.joker = Math.min(9, s.res.joker + m.lohn.joker);
  if (m.lohn.plan) grantPlan(s, m.lohn.plan);
  sfx.fanfare();
  konfetti(35);
  toast(`Aufgabe geschafft: ${m.titel}!`, { icon: m.icon, art: 'gold', dauer: 4500 });
  game.hud.missionSig = '';
  game.save();
}

window.addEventListener('resize', () => renderer.resize());
window.__ameisenreich = game; // für Tests & Neugierige
boot();
