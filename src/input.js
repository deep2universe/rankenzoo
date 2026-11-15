// Maus-, Touch- und Tastatursteuerung für die Spielwelt.
import { GEBAEUDE, C, COLS } from './game/config.js';
import { get, idx } from './game/world.js';

export function setupInput(game) {
  const cv = game.renderer.canvas;
  // Der aktive Renderer hängt vom Modus ab (Nest = Seitenansicht, Revier = Draufsicht)
  const R = new Proxy({}, { get: (_, k) => { const r = game.aktiverRenderer(); const v = r[k]; return typeof v === 'function' ? v.bind(r) : v; } });
  const NR = game.renderer;
  const revier = () => game.modus !== 'nest';   // Revier & Welt: Draufsicht-Karten
  const welt = () => game.modus === 'welt';
  const ptrs = new Map();
  let drag = null; // {mode, x, y, moved, lastCell}
  let pinch = null;

  const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => {
    game.poke();
    cv.setPointerCapture(e.pointerId);
    const [x, y] = pos(e);
    ptrs.set(e.pointerId, { x, y });
    if (ptrs.size === 2) {
      // Zwei Finger: Zoomen/Verschieben
      if (drag?.mode === 'graben') game.endDig();
      const [a, b] = [...ptrs.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      drag = null;
      return;
    }
    const cell = R.cellAt(x, y);
    const panMode = e.button === 1 || e.button === 2 || !game.tool || revier();
    drag = { mode: panMode ? 'pan' : game.tool, x, y, sx: x, sy: y, moved: 0, lastCell: cell, touch: e.pointerType === 'touch' };
    if (drag.mode === 'gang') { drag.mode = 'graben'; game.startDig(); game.digTo(cell); }
    if (drag.mode === 'bauen') NR.overlay.hover = cell;
  });

  cv.addEventListener('pointermove', e => {
    const [x, y] = pos(e);
    const p = ptrs.get(e.pointerId);
    if (p) { p.x = x; p.y = y; }
    if (pinch && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      R.pan(cx - pinch.cx, cy - pinch.cy);
      if (pinch.d > 10) R.zoomAt(cx, cy, d / pinch.d);
      pinch = { d, cx, cy };
      return;
    }
    if (ptrs.size || drag) game.poke();
    if (revier()) {
      if (!drag) { if (welt()) game.weltHover(x, y); else game.revierHover(x, y); return; }
    }
    const cell = R.cellAt(x, y);
    if (!drag) { NR.overlay.hover = cell; game.hover(cell, x, y); return; }
    drag.moved += Math.hypot(x - drag.x, y - drag.y);
    if (drag.mode === 'pan') {
      R.pan(x - drag.x, y - drag.y);
      if (drag.moved > 6) cv.classList.add('dragging');
    } else if (drag.mode === 'graben') {
      game.digTo(cell);
      NR.overlay.hover = cell;
    } else if (drag.mode === 'bauen' || drag.mode === 'abriss') {
      NR.overlay.hover = cell;
    }
    drag.x = x; drag.y = y;
  });

  const up = e => {
    const [x, y] = pos(e);
    ptrs.delete(e.pointerId);
    if (pinch) { if (ptrs.size < 2) pinch = null; drag = null; return; }
    if (!drag) return;
    const d = drag; drag = null;
    cv.classList.remove('dragging');
    const cell = R.cellAt(x, y);
    if (d.mode === 'graben') { game.endDig(); return; }
    if (d.mode === 'pan') {
      if (d.moved < 8) { if (welt()) game.weltClick(x, y); else if (revier()) game.revierClick(x, y); else game.clickWorld(cell, x, y); }
      return;
    }
    if (d.mode === 'bauen') { game.tryPlace(cell); if (d.touch) NR.overlay.hover = cell; return; }
    if (d.mode === 'abriss' && d.moved < 20) game.tryDemolish(cell);
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); pinch = null; if (drag?.mode === 'graben') game.endDig(); drag = null; });
  cv.addEventListener('pointerleave', () => { if (!drag) { NR.overlay.hover = null; game.revierR.hover = null; game.revierR.hoverCell = null; if (game.weltR) game.weltR.hover = null; } });

  cv.addEventListener('wheel', e => {
    e.preventDefault();
    game.poke();
    const [x, y] = pos(e);
    if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) R.zoomAt(x, y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
    else R.pan(-e.deltaX, 0);
  }, { passive: false });

  // Tastatur
  const held = new Set();
  // Shift allein (drücken & loslassen ohne andere Taste) wechselt zwischen Nest und Revier
  let shiftAllein = false;
  window.addEventListener('keyup', e => {
    if (e.key === 'Shift' && shiftAllein && !game.modalOffen() && !(e.target instanceof HTMLInputElement)) game.wechsleModus();
    if (e.key === 'Shift') shiftAllein = false;
  });
  window.addEventListener('keydown', e => {
    if (e.target instanceof HTMLInputElement) return;
    game.poke();
    shiftAllein = e.key === 'Shift' && !e.repeat ? true : e.key === 'Shift' ? shiftAllein : false;
    if (e.key === 'Shift') return;
    if (game.modalKey(e)) { e.preventDefault(); return; }
    if (game.modalOffen()) { if (e.key === 'Escape') game.closeModal(); return; }
    const k = e.key.toLowerCase();
    if (welt() && game.weltHolo?.onKey?.(e)) { e.preventDefault(); return; }
    if (revier()) {
      if (k === 'escape') { game.revierR.tool = null; game.revierR.selected = null; game.hud.revier?.waehle(null); game.hud.revier?.waehleLager(null); if (game.weltR) game.weltR.selected = null; game.hud.welt?.waehle(null); }
      else if (k === 'e' && !welt()) game.hud.revier?.expWerkzeug();
      else if (k === 'z' && !welt()) game.hud.revier?.zeltWerkzeug();
      else if (k === 'b') game.toggleBeobachtung();
      else if (k === 'f') game.openForschung?.();
      else if (k === 'q') game.openQuiz();
      else if (k === 'm') game.openMinigames();
      else if (k === '+' || k === '=') game.zoom(1.2);
      else if (k === '-') game.zoom(1 / 1.2);
      else if (k === 'h') game.focusHome();
      else if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(k)) { held.add(k); e.preventDefault(); }
      return;
    }
    if (k === 'escape') { if (game.ameisenKarte?.offen) game.ameisenKarte.schliesse(); else if (game.beobachtung) game.toggleBeobachtung(false); else game.setTool(null); }
    else if (k === 'b') game.toggleBeobachtung();
    else if (k === 'g') game.setTool(game.tool === 'gang' ? null : 'gang');
    else if (k === 'x') game.setTool(game.tool === 'abriss' ? null : 'abriss');
    else if (k === 'q') game.openQuiz();
    else if (k === 'm') game.openMinigames();
    else if (k === '+' || k === '=') game.zoom(1.2);
    else if (k === '-') game.zoom(1 / 1.2);
    else if (k === 'f') game.openForschung?.();
    else if (k === 'h') game.focusHome();
    else if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(k)) { held.add(k); e.preventDefault(); }
  });
  window.addEventListener('keyup', e => held.delete(e.key.toLowerCase()));
  return {
    update(dt) {
      if (!held.size) return;
      game.poke();
      const v = 700 * dt;
      let dx = 0, dy = 0;
      if (held.has('arrowleft') || held.has('a')) dx += v;
      if (held.has('arrowright') || held.has('d')) dx -= v;
      if (held.has('arrowup') || held.has('w')) dy += v;
      if (held.has('arrowdown') || held.has('s')) dy -= v;
      R.pan(dx, dy);
    },
  };
}

/** 4-zusammenhängende Linie zwischen zwei Zellen */
export function cellLine([x0, y0], [x1, y1]) {
  const out = [];
  let x = x0, y = y0;
  out.push([x, y]);
  let guard = 0;
  while ((x !== x1 || y !== y1) && guard++ < 200) {
    const dx = x1 - x, dy = y1 - y;
    if (Math.abs(dx) >= Math.abs(dy)) x += Math.sign(dx); else y += Math.sign(dy);
    out.push([x, y]);
  }
  return out;
}

export { GEBAEUDE, C, COLS, get, idx };
