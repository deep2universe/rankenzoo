// Schwebende Info-Karte (Tooltip) mit eigenem Schließen-Knopf.
// Maus drüber → Karte erscheint (mit kurzer Gnadenfrist, damit man in die Karte hineinfahren kann).
// Klick / Tippen → Karte wird festgepinnt 📌 und bleibt, bis ✕, Esc oder ein anderer Eintrag gepinnt wird.
// Es gibt immer höchstens EINE Karte. Sie bleibt im Fenster (Kippen/Verschieben) und zeigt mit einem Pfeil auf ihren Eintrag.
import { h } from '../util.js';

const RAND = 10;          // Mindestabstand zum Fensterrand
const ABSTAND = 13;       // Abstand Karte ↔ Eintrag (Platz für den Pfeil)
const ZEIGEN_MS = 110;    // kurze Verzögerung beim Drüberfahren (kein Flackern beim Durchwischen)
const VERSTECKEN_MS = 240; // Gnadenfrist beim Verlassen
const MIN_HOEHE = 170;

let akt = null; // { anker, el, pop, inhalt, pinned, raf, key }
let showT = 0, hideT = 0, uid = 0;
let leiseFokus = false; // Fokus zurück auf den Eintrag, ohne dass die Karte gleich wieder aufgeht

function fokusZurueck(anker) {
  if (!anker?.isConnected) return;
  leiseFokus = true;
  try { anker.focus({ preventScroll: true }); } finally { leiseFokus = false; }
}

const istMaus = e => e.pointerType === 'mouse' || e.pointerType === 'pen';

if (typeof window !== 'undefined') {
  // Esc schließt zuerst die Karte (und nicht gleich das ganze Fenster dahinter).
  window.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !akt) return;
    const anker = akt.anker;
    const warFokusDrin = akt.el.contains(document.activeElement);
    schliesseTooltip();
    if (warFokusDrin) fokusZurueck(anker);
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
  }, true);
}

/**
 * Verbindet ein Element mit einer Info-Karte.
 * @param {HTMLElement} anker  Eintrag (am besten ein <button>, damit er per Tastatur erreichbar ist)
 * @param {() => Node} inhaltFn  baut den Karteninhalt (wird erst beim Zeigen aufgerufen)
 * @param {{ farbe?: [string, string], label?: string, breite?: number }} opts
 * @returns {() => void} löst die Verbindung wieder
 */
export function attachTooltip(anker, inhaltFn, opts = {}) {
  const enter = e => {
    if (!istMaus(e)) return;
    clearTimeout(hideT);
    if (akt?.anker === anker || akt?.pinned) return; // gepinnte Karte bleibt, bis man sie schließt
    clearTimeout(showT);
    showT = setTimeout(() => zeige(anker, inhaltFn, opts, false), akt ? 30 : ZEIGEN_MS);
  };
  const leave = e => {
    if (!istMaus(e)) return;
    clearTimeout(showT);
    if (akt?.anker === anker && !akt.pinned) planeVerstecken();
  };
  const focus = () => {
    if (leiseFokus || akt?.pinned || akt?.anker === anker) return;
    if (!anker.matches(':focus-visible')) return; // nur Tastatur-Fokus, nicht Mausklick
    clearTimeout(showT);
    zeige(anker, inhaltFn, opts, false);
  };
  const blur = e => {
    if (akt?.anker !== anker || akt.pinned) return;
    if (e.relatedTarget && akt.el.contains(e.relatedTarget)) return;
    planeVerstecken(60);
  };
  const click = e => {
    e.preventDefault();
    clearTimeout(showT); clearTimeout(hideT);
    zeige(anker, inhaltFn, opts, true);
  };
  anker.addEventListener('pointerenter', enter);
  anker.addEventListener('pointerleave', leave);
  anker.addEventListener('focus', focus);
  anker.addEventListener('blur', blur);
  anker.addEventListener('click', click);
  anker.setAttribute('aria-haspopup', 'dialog');
  anker.setAttribute('aria-expanded', 'false');
  return () => {
    if (akt?.anker === anker) schliesseTooltip();
    anker.removeEventListener('pointerenter', enter);
    anker.removeEventListener('pointerleave', leave);
    anker.removeEventListener('focus', focus);
    anker.removeEventListener('blur', blur);
    anker.removeEventListener('click', click);
  };
}

/** Schließt die aktuelle Karte (falls offen). */
export function schliesseTooltip() {
  clearTimeout(showT); clearTimeout(hideT);
  if (!akt) return;
  const { el, anker, raf } = akt;
  akt = null;
  cancelAnimationFrame(raf);
  anker.removeAttribute('aria-describedby');
  anker.setAttribute('aria-expanded', 'false');
  anker.classList.remove('tt-aktiv', 'tt-gepinnt');
  el.classList.add('weg');
  el.style.pointerEvents = 'none';
  setTimeout(() => el.remove(), 170);
}
export const closeTooltip = schliesseTooltip;
export const tooltipOffen = () => !!akt;

function planeVerstecken(ms = VERSTECKEN_MS) {
  clearTimeout(hideT);
  hideT = setTimeout(() => { if (akt && !akt.pinned) schliesseTooltip(); }, ms);
}

function setzePin(pinned) {
  const { el, anker } = akt;
  const neu = pinned && !akt.pinned;
  akt.pinned = pinned;
  el.classList.toggle('angepinnt', pinned);
  el.setAttribute('role', pinned ? 'dialog' : 'tooltip');
  if (pinned) el.setAttribute('aria-modal', 'false'); else el.removeAttribute('aria-modal');
  anker.classList.toggle('tt-gepinnt', pinned);
  anker.setAttribute('aria-expanded', String(pinned));
  if (neu) {
    el.classList.remove('pin-neu');
    void el.offsetWidth; // Animation neu starten
    el.classList.add('pin-neu');
  }
}

function zeige(anker, inhaltFn, opts, pinned) {
  if (!anker.isConnected) return;
  if (akt?.anker === anker) {
    if (pinned) setzePin(true);
    return;
  }
  schliesseTooltip();
  const id = 'tt-' + (++uid);
  const kopfId = id + '-t';
  const zu = h('button.tt-zu', { type: 'button', 'aria-label': 'Karte schließen', title: 'Schließen (Esc)', onclick: e => {
    e.stopPropagation();
    const a = akt?.anker;
    schliesseTooltip();
    fokusZurueck(a);
  } }, h('span', { 'aria-hidden': 'true' }, '✕'));
  const inhalt = h('div.tt-inhalt', { id: kopfId }, inhaltFn());
  const pop = h('div.tt-pop',
    h('span.tt-pfeil', { 'aria-hidden': 'true' }),
    inhalt,
    h('div.tt-hinweis', { 'aria-hidden': 'true' },
      h('span.tt-hinweis-hover', '👆 Klicken zum Festpinnen'),
      h('span.tt-hinweis-pin', '📌 Festgepinnt – ✕ oder Esc schließt')),
    h('span.tt-pin', { 'aria-hidden': 'true', title: 'Festgepinnt' }, '📌'),
    zu,
  );
  const el = h('div.atip', { id, role: 'tooltip', 'aria-label': opts.label ?? null },
    pop);
  if (opts.farbe) { el.style.setProperty('--f1', opts.farbe[0]); el.style.setProperty('--f2', opts.farbe[1] ?? opts.farbe[0]); }
  if (opts.breite) el.style.width = `min(${opts.breite}px, calc(100vw - ${RAND * 2}px))`;
  el.addEventListener('pointerenter', e => { if (istMaus(e)) clearTimeout(hideT); });
  el.addEventListener('pointerleave', e => { if (istMaus(e) && akt?.el === el && !akt.pinned) planeVerstecken(); });
  el.addEventListener('focusout', e => {
    if (akt?.el !== el || akt.pinned) return;
    if (e.relatedTarget && (el.contains(e.relatedTarget) || e.relatedTarget === anker)) return;
    planeVerstecken(60);
  });
  // Klicks in der Karte sollen nichts dahinter auslösen
  el.addEventListener('pointerdown', e => e.stopPropagation());
  document.body.append(el);
  anker.setAttribute('aria-describedby', id);
  anker.classList.add('tt-aktiv');
  akt = { anker, el, pop, inhalt, pinned: false, raf: 0, key: '' };
  setzePin(pinned);
  positioniere();
  const tick = () => {
    if (!akt || akt.el !== el) return;
    positioniere();
    if (akt?.el === el) akt.raf = requestAnimationFrame(tick);
  };
  akt.raf = requestAnimationFrame(tick);
}

/** Sichtbarer Bereich des Ankers: Fenster bzw. Inhalt des Modals unterhalb seines (klebenden) Kopfes. */
function sichtbereich(anker) {
  const vw = document.documentElement.clientWidth || innerWidth, vh = innerHeight;
  const b = { top: 0, left: 0, right: vw, bottom: vh };
  const modal = anker.closest('.modal');
  if (modal) {
    const r = modal.getBoundingClientRect();
    const kopf = modal.querySelector(':scope > .modal-kopf');
    b.top = Math.max(b.top, kopf ? kopf.getBoundingClientRect().bottom : r.top);
    b.bottom = Math.min(b.bottom, r.bottom);
    b.left = Math.max(b.left, r.left); b.right = Math.min(b.right, r.right);
  }
  return b;
}

function positioniere() {
  const { anker, el, pop, inhalt } = akt;
  if (!anker.isConnected) { schliesseTooltip(); return; }
  const r = anker.getBoundingClientRect();
  const vw = document.documentElement.clientWidth || innerWidth, vh = innerHeight;
  const clip = sichtbereich(anker);
  const sichtbar = r.bottom > clip.top + 6 && r.top < clip.bottom - 6 && r.right > clip.left && r.left < clip.right && r.width > 0;
  el.classList.toggle('versteckt', !sichtbar);
  if (!sichtbar) {
    if (!akt.pinned) schliesseTooltip();
    akt && (akt.key = '');
    return;
  }
  const key = [r.left, r.top, r.width, r.height, vw, vh].map(Math.round).join(',');
  if (key === akt.key) return;
  akt.key = key;

  inhalt.style.maxHeight = '';
  const w = el.offsetWidth;
  let hh = el.offsetHeight;
  const platzOben = r.top - ABSTAND - RAND;
  const platzUnten = vh - r.bottom - ABSTAND - RAND;
  // Lieber oberhalb; passt es dort nicht, unten; passt es nirgends ganz, auf die größere Seite und kürzen.
  let seite = hh <= platzOben ? 'oben' : hh <= platzUnten ? 'unten' : platzOben > platzUnten ? 'oben' : 'unten';
  const platz = seite === 'oben' ? platzOben : platzUnten;
  if (hh > platz) {
    const extra = hh - inhalt.offsetHeight; // Hinweiszeile usw.
    const max = Math.max(MIN_HOEHE, platz) - extra;
    inhalt.style.maxHeight = max + 'px';
    hh = el.offsetHeight;
  }
  const mitte = r.left + r.width / 2;
  const x = Math.round(Math.max(RAND, Math.min(vw - w - RAND, mitte - w / 2)));
  let y = seite === 'oben' ? r.top - ABSTAND - hh : r.bottom + ABSTAND;
  y = Math.round(Math.max(RAND, Math.min(vh - hh - RAND, y)));
  const px = Math.round(Math.max(24, Math.min(w - 24, mitte - x)));
  el.dataset.seite = seite;
  el.style.setProperty('--pfeil-x', px + 'px');
  el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  pop.style.transformOrigin = `${px}px ${seite === 'oben' ? '100%' : '0'}`;
}
