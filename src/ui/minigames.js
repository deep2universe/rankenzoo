// Denksport-Halle: zehn Minispiele für Reaktion, Konzentration, Gedächtnis, Rechnen und Planen.
import { h, shuffle, randInt, pick, clamp, fill, lerp, rand } from '../util.js';
import { openModal, konfetti } from './modal.js';
import { sfx } from '../audio.js';
import { drawAnt } from '../render/antdraw.js';
import { emit } from '../events.js';

const BLATTLAUS_SVG = `<svg viewBox="0 0 60 50" width="58" height="48"><ellipse cx="30" cy="30" rx="20" ry="15" fill="#8fe05a" stroke="#4a9a2a" stroke-width="2"/><ellipse cx="24" cy="24" rx="7" ry="4" fill="#c9f5a8" opacity=".7"/><circle cx="46" cy="24" r="9" fill="#9be866" stroke="#4a9a2a" stroke-width="2"/><circle cx="49" cy="22" r="2.6" fill="#222"/><circle cx="50" cy="21" r=".9" fill="#fff"/><path d="M50 16 Q54 6 58 8 M47 16 Q47 5 51 4" stroke="#4a9a2a" stroke-width="1.6" fill="none"/><path d="M18 42 l-4 6 M28 44 l-1 6 M38 43 l3 6" stroke="#4a9a2a" stroke-width="2"/></svg>`;

export const SPIELE = [
  { id: 'kaefer', name: 'Marienkäfer-Alarm', icon: '🐞', f1: '#ff6b6b', f2: '#ff9f6b', trainiert: '⚡ Reaktion & Impulskontrolle',
    text: 'Marienkäfer wollen unsere Blattläuse fressen! Fang sie mit den Zahlentasten 1 bis 9 oder tippe sie an. Jedes Loch hat seine eigene Zahl. Aber Achtung: Erwische NIE eine grüne Blattlaus – die beschützen wir!',
    fn: kaeferSpiel },
  { id: 'duftspur', name: 'Duftspur', icon: '👃', f1: '#7b4dff', f2: '#b18cff', trainiert: '🧠 Arbeitsgedächtnis',
    text: 'Die Späherin legt eine Duftspur durch die Kammern. Merke dir die Reihenfolge und tippe sie danach genau so nach. Die Spur wird immer länger!',
    fn: duftspurSpiel },
  { id: 'memory', name: 'Krabbel-Memory', icon: '🃏', f1: '#43c46b', f2: '#8be07a', trainiert: '🧠 Merkfähigkeit',
    text: 'Decke immer zwei Karten auf und finde die Paare. Je weniger Züge du brauchst, desto besser!',
    fn: memorySpiel },
  { id: 'farben', name: 'Farben-Wirrwarr', icon: '🎨', f1: '#4fa3ff', f2: '#7cc4ff', trainiert: '🎯 Aufmerksamkeit & Flexibilität',
    text: 'Ein Farbwort erscheint – aber in einer anderen Farbe! Tippe auf die FARBE, in der das Wort geschrieben ist, nicht auf das, was da steht.',
    fn: farbenSpiel },
  { id: 'zahlenjagd', name: 'Zahlenjagd', icon: '🔢', f1: '#ffb020', f2: '#ffd36b', trainiert: '👀 Blicksteuerung & Konzentration',
    text: 'Tippe die Zahlen von 1 bis 25 der Reihe nach an – so schnell du kannst! Deine Augen lernen dabei, schnell zu suchen.',
    fn: zahlenjagdSpiel },
  { id: 'blitzblick', name: 'Blitzblick', icon: '⚡', f1: '#ef5a7a', f2: '#ff8fa8', trainiert: '👁️ Schnelles Erfassen von Mengen',
    text: 'Für einen kurzen Moment krabbeln Ameisen über das Feld. Wie viele waren es? Versuche, Gruppen zu sehen, statt einzeln zu zählen!',
    fn: blitzblickSpiel },
  { id: 'waage', name: 'Futter-Waage', icon: '⚖️', f1: '#14a38b', f2: '#5fd6b8', trainiert: '➕ Kopfrechnen & Zahlengefühl',
    text: 'Auf der Waage liegen zwei Krümel-Haufen mit Rechenaufgaben. Rechne blitzschnell im Kopf: Welche Seite ist schwerer – oder sind beide gleich schwer? Mit den Pfeiltasten ← ↓ → geht es auch.',
    fn: waageSpiel },
  { id: 'pfad', name: 'Pfadfinderin', icon: '🧭', f1: '#5f8f1f', f2: '#a9cf4a', trainiert: '🗺️ Planen & räumliches Denken',
    text: 'Plane den Weg der Ameise zur Erdbeere. Lege mit Pfeilen alle Schritte vorher fest und schicke sie dann mit „Los!“ auf die Reise. Steine, Pilze und Pfützen versperren den Weg – erst denken, dann losgehen!',
    fn: pfadSpiel },
  { id: 'inventur', name: 'Kammer-Inventur', icon: '🔍', f1: '#b5651d', f2: '#e6a15a', trainiert: '🧠 Visuelles Gedächtnis',
    text: 'Schau dir die Vorratskammer ganz genau an. Dann wird sie kurz zugedeckt – danach fehlt etwas, oder etwas Neues liegt darin. Findest du heraus, was sich verändert hat?',
    fn: inventurSpiel },
  { id: 'sortier', name: 'Sortier-Ameise', icon: '🔀', f1: '#d24fb5', f2: '#f59ad8', trainiert: '🔄 Umschalten & Flexibilität',
    text: 'Sortiere das Futter in die richtige Kammer. Mal zählt die FARBE, mal die FORM – und die Regel wechselt immer wieder! Pfeiltasten ← → oder tippen.',
    fn: sortierSpiel },
];

export function openMinigames(game) {
  const s = game.state;
  const m = openModal({ titel: 'Denksport-Halle', unter: 'Übe Konzentration, Reaktion, Gedächtnis, Rechnen und Planen – und sammle Nahrung für dein Volk!', icon: '🧠', klasse: 'breit', farbe: ['#7b4dff', '#b18cff'] });
  game.pause(true);
  const oc = m.close; m.close = r => { m._stop?.(); oc(r); game.pause(false); };

  function hub() {
    m._stop = null; m._key = null;
    m.setTitel('Denksport-Halle', 'Übe Konzentration, Reaktion, Gedächtnis, Rechnen und Planen – und sammle Nahrung für dein Volk!'); m.setIcon('🧠'); m.setFarbe('#7b4dff', '#b18cff');
    m.render(h('div.spiele-grid', SPIELE.map(sp => {
      const r = s.minispiele[sp.id];
      return h('button.spiel-karte', { style: { '--f1': sp.f1, '--f2': sp.f2 }, onclick: () => intro(sp) },
        h('span.em', sp.icon), h('span.nm', sp.name), h('span.bs', sp.text.split('.')[0] + '.'),
        h('span.rekord', r ? `🏅 Rekord: ${r.bestText} · ${r.gespielt}× gespielt` : '✨ Neu'),
        h('span.trainiert', sp.trainiert));
    })), h('p', { style: { textAlign: 'center', color: '#8a6a4a', fontSize: '.88rem', marginTop: '14px' } },
      '💡 Kurze, regelmäßige Runden sind am besten – und zwischendurch: aufstehen, strecken, aus dem Fenster schauen!'));
  }

  function intro(sp) {
    m.setTitel(sp.name, sp.trainiert); m.setIcon(sp.icon); m.setFarbe(sp.f1, sp.f2);
    m.render(h('div.spiel-intro', h('div.em', sp.icon), h('p', sp.text),
      h('div', { style: { display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '12px' } },
        h('button.btn.grau', { onclick: hub }, '← Zurück'),
        h('button.btn.gruen.gross', { onclick: () => start(sp) }, 'Los geht\'s!'))));
  }

  function start(sp) {
    const feld = h('div.spielfeld');
    m.render(feld);
    m._stop = sp.fn(feld, (ergebnis) => ende(sp, ergebnis), m);
  }

  function ende(sp, e) {
    m._stop = null; m._key = null;
    const rec = (s.minispiele[sp.id] ??= { best: null, bestText: '', gespielt: 0 });
    rec.gespielt++;
    const neuerRekord = rec.best == null || (e.hoeherBesser ? e.wert > rec.best : e.wert < rec.best);
    if (neuerRekord) { rec.best = e.wert; rec.bestText = e.text; }
    const leistung = clamp(e.leistung, 0, 1);
    const nahrung = Math.round(25 + 75 * leistung);
    const sterne = Math.round(4 + 14 * leistung);
    const gang = leistung > 0.6 ? 3 : leistung > 0.3 ? 1 : 0;
    s.res.nahrung += nahrung; // Lager-Limit greift in der Simulation
    s.res.sterne += sterne;
    s.res.gang += gang;
    s.stats.minispiele++;
    if (neuerRekord && rec.gespielt > 1) { konfetti(30); sfx.fanfare(); } else sfx.coin();
    emit('minispielEnde', { id: sp.id, leistung });
    m.render(h('div.ergebnis',
      h('div', { style: { fontSize: '64px' } }, leistung > 0.75 ? '🏆' : leistung > 0.45 ? '🥈' : '💪'),
      h('div.gross', e.text),
      neuerRekord && rec.gespielt > 1 ? h('p', { style: { color: '#e0466f', fontWeight: 700, fontSize: '1.2rem' } }, '🎉 Neuer Rekord!') : h('p', `Dein Rekord: ${rec.bestText}`),
      e.detail ? h('p', { style: { color: '#6a5038' } }, e.detail) : null,
      h('div.zeile', h('div.stat', 'Nahrung', h('b', `+${nahrung} 🍯`)), h('div.stat', 'Sterne', h('b', `+${sterne} ⭐`)), gang ? h('div.stat', 'Gangstücke', h('b', `+${gang} 🧱`)) : null),
      h('div', { style: { display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' } },
        h('button.btn.blau', { onclick: () => start(sp) }, '🔁 Nochmal'),
        h('button.btn', { onclick: hub }, '🧠 Andere Spiele'),
        h('button.btn.gruen', { onclick: () => m.close() }, '🐜 Zurück zum Volk')),
    ));
  }
  hub();
  return m;
}

function hud(...stats) {
  return h('div.spiel-hud', stats.map(([label, el]) => h('div.stat', label, el)));
}
function countdown(feld, fertig) {
  const z = h('div', { style: { fontSize: '96px', fontWeight: 700, color: '#ff9f1c', textAlign: 'center', minHeight: '200px', display: 'grid', placeItems: 'center' } }, '3');
  fill(feld, z);
  let n = 3;
  sfx.tick();
  const iv = setInterval(() => {
    n--;
    if (n > 0) { z.textContent = n; sfx.tick(); } else { clearInterval(iv); sfx.pop(); fertig(); }
  }, 650);
  return () => clearInterval(iv);
}

// ---------- Gemeinsame Helfer für die neueren Spiele ----------
/** Sammelt alle Timer/Schleifen eines Spiels, damit beim Beenden nichts weiterläuft. */
function uhrwerk() {
  const tos = new Set(), ivs = new Set(), loops = new Set();
  let aktiv = true;
  return {
    get aktiv() { return aktiv; },
    nach(ms, fn) {
      const id = setTimeout(() => { tos.delete(id); if (aktiv) fn(); }, ms);
      tos.add(id);
      return id;
    },
    weg(id) { clearTimeout(id); tos.delete(id); },
    alle(ms, fn) {
      const id = setInterval(fn, ms);
      ivs.add(id);
      return () => { clearInterval(id); ivs.delete(id); };
    },
    /** requestAnimationFrame-Schleife, gedrosselt auf fps. Gibt eine Stopp-Funktion zurück. */
    schleife(fn, fps = 30) {
      let id = 0, last = 0, an = true;
      const step = t => {
        if (!an || !aktiv) return;
        if (t - last >= 1000 / fps - 1) { last = t; fn(t); }
        id = requestAnimationFrame(step);
      };
      id = requestAnimationFrame(step);
      const halt = () => { an = false; cancelAnimationFrame(id); loops.delete(halt); };
      loops.add(halt);
      return halt;
    },
    stop() {
      aktiv = false;
      tos.forEach(clearTimeout); ivs.forEach(clearInterval); [...loops].forEach(f => f());
      tos.clear(); ivs.clear();
    },
  };
}
/** Zeitbalken, der per transform schrumpft (flüssiger als width). */
function zeitbalken() {
  return h('div.zeitbalken.mg-zeit', h('i'));
}
/** Spielzeit-Uhr mit Anzeige; ruft fertig() einmal auf, wenn die Zeit um ist. */
function spielUhr(uw, dauer, tv, bar, fertig) {
  let t0 = 0, halt = null;
  const tick = () => {
    const el = (performance.now() - t0) / 1000;
    tv.textContent = Math.max(0, Math.ceil(dauer - el)) + ' s';
    bar.firstChild.style.transform = `scaleX(${clamp(1 - el / dauer, 0, 1)})`;
    bar.classList.toggle('knapp', dauer - el < 6);
    if (el >= dauer) { halt?.(); halt = null; fertig(); }
  };
  return {
    start() { t0 = performance.now(); halt = uw.alle(100, tick); tick(); },
    get sek() { return t0 ? (performance.now() - t0) / 1000 : 0; },
  };
}
/** Startet eine CSS-Animation (Klasse) neu, auch wenn sie gerade läuft. */
function blitz(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}
/** Kleine fliegende Punktzahl (+10, −2 …) über einem Element. */
function punkteFlug(el, text, art = 'gut') {
  const f = h('span.mg-flug.' + art, text);
  f.addEventListener('animationend', () => f.remove());
  el.append(f);
  setTimeout(() => f.remove(), 1200);
}
/** Tasten-Hinweis (nur auf Geräten mit Tastatur sichtbar, per CSS). */
const kbd = t => h('kbd.mg-kbd', t);
/** Ziffer 1–9 aus einem Tastendruck (Zahlenreihe oder Ziffernblock). */
function zifferAus(e) {
  if (/^[1-9]$/.test(e.key)) return +e.key;
  const m = /^Numpad([1-9])$/.exec(e.code || '');
  return m ? +m[1] : 0;
}

// ---------- 1. Marienkäfer-Alarm (Go/No-Go, per Zahlentasten) ----------
function kaeferSpiel(feld, done, modal) {
  const DAUER = 40;
  const SICHT = [1800, 1100]; // ms sichtbar: am Anfang → am Ende
  const TAKT = [1050, 680]; // ms zwischen zwei Tieren: am Anfang → am Ende
  const uw = uhrwerk();
  let punkte = 0, treffer = 0, fehler = 0, verpasst = 0, daneben = 0, kaeferGesamt = 0, rts = [], laeuft = false;
  const pv = h('b', '0'), tv = h('b', DAUER + ' s');
  const bar = zeitbalken();
  const slots = Array.from({ length: 9 }, (_, i) => {
    const loch = h('div.loch');
    const wrap = h('div.mg-loch', { onpointerdown: e => { e.preventDefault(); hau(i); } },
      loch, h('span.mg-loch-nr', String(i + 1)));
    return { wrap, loch, tier: null };
  });
  const uhr = spielUhr(uw, DAUER, tv, bar, ende);
  const stopCd = countdown(feld, () => {
    fill(feld, hud(['Punkte', pv], ['Zeit', tv]), bar,
      h('div.mg-loecher', slots.map(s => s.wrap)),
      h('p.mg-hinweis', '⌨️ Drücke die Zahl des Lochs (1–9) – oder tippe drauf'));
    laeuft = true;
    uhr.start();
    spawn();
  });
  modal._key = e => {
    const z = zifferAus(e);
    if (!z) return false;
    if (!e.repeat) hau(z - 1);
    return true;
  };
  function spawn() {
    if (!laeuft) return;
    const p = clamp(uhr.sek / DAUER, 0, 1);
    const frei = slots.filter(s => !s.tier);
    if (frei.length) {
      const slot = pick(frei);
      const kaefer = Math.random() < 0.68;
      if (kaefer) kaeferGesamt++;
      const el = h('div.tier', { html: kaefer ? '🐞' : BLATTLAUS_SVG });
      const t = { el, kaefer, da: performance.now() };
      slot.tier = t;
      slot.loch.append(el);
      void el.offsetWidth; // damit die Einblend-Transition startet
      el.classList.add('oben');
      uw.nach(lerp(SICHT[0], SICHT[1], p), () => {
        if (slot.tier !== t) return;
        if (kaefer) verpasst++;
        weg(slot);
      });
    }
    uw.nach(lerp(TAKT[0], TAKT[1], p) * rand(0.8, 1.2), spawn);
  }
  function weg(slot) {
    const t = slot.tier;
    if (!t) return;
    slot.tier = null;
    t.el.classList.remove('oben');
    setTimeout(() => t.el.remove(), 200);
  }
  function hau(i) {
    if (!laeuft) return;
    const slot = slots[i];
    slot.wrap.classList.remove('treffer', 'falsch', 'leer');
    blitz(slot.wrap, 'gedrueckt');
    const t = slot.tier;
    if (!t) {
      // Ins leere Loch: nur ein kleiner, sanfter Abzug.
      daneben++;
      punkte = Math.max(0, punkte - 2);
      pv.textContent = punkte;
      sfx.tick();
      blitz(slot.wrap, 'leer');
      punkteFlug(slot.wrap, 'daneben', 'mini');
      return;
    }
    if (t.kaefer) {
      punkte += 10; treffer++; rts.push(performance.now() - t.da);
      sfx.pop();
      t.el.classList.add('getroffen');
      blitz(slot.wrap, 'treffer');
      punkteFlug(slot.wrap, '+10', 'gut');
    } else {
      punkte = Math.max(0, punkte - 15); fehler++;
      sfx.error();
      t.el.classList.add('aua');
      blitz(slot.wrap, 'falsch');
      punkteFlug(slot.wrap, '−15 Laus!', 'schlecht');
    }
    pv.textContent = punkte;
    weg(slot);
  }
  function ende() {
    if (!laeuft) return;
    laeuft = false;
    uw.stop();
    const rt = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0;
    // Leistung relativ zur Zahl der erschienenen Käfer: 85 % fehlerfrei gefangen = volle Punktzahl.
    const leistung = punkte / (Math.max(20, kaeferGesamt) * 10 * 0.85);
    done({ wert: punkte, hoeherBesser: true, text: `${punkte} Punkte`, leistung,
      detail: `🐞 ${treffer} von ${kaeferGesamt} gefangen · 🌿 ${fehler}× Blattlaus erwischt · 💨 ${daneben}× daneben · ⏱️ Reaktionszeit ⌀ ${rt} ms` });
  }
  return () => { laeuft = false; stopCd(); uw.stop(); };
}

// ---------- 2. Duftspur (Corsi/Simon) ----------
function duftspurSpiel(feld, done) {
  const icons = ['👑', '🥚', '🍄', '🫙', '🛏️', '🎬', '📚', '🥐', '⚽'];
  let laenge = 2, leben = 2, seq = [], eingabe = [], zeigt = false, laeuft = true, timeouts = [];
  const lv = h('b', '2'), hv = h('b', '❤️❤️');
  const info = h('div', { style: { fontSize: '1.15rem', fontWeight: 600, minHeight: '1.5em' } }, '');
  const felder = icons.map((ic, i) => h('button.feld', { style: { width: '96px', height: '96px' }, onclick: () => tipp(i) }, ic));
  const grid = h('div.felder', { style: { gridTemplateColumns: 'repeat(3, 96px)' } }, felder);
  const later = (fn, ms) => timeouts.push(setTimeout(fn, ms));
  const stopCd = countdown(feld, () => { fill(feld, hud(['Spurlänge', lv], ['Leben', hv]), info, grid); neueRunde(); });
  function neueRunde() {
    if (!laeuft) return;
    seq = []; eingabe = [];
    while (seq.length < laenge) { const n = randInt(0, 8); if (seq[seq.length - 1] !== n) seq.push(n); }
    lv.textContent = laenge; zeigt = true; info.textContent = '👀 Gut aufpassen …';
    seq.forEach((n, k) => {
      later(() => { felder[n].classList.add('leuchtet'); sfx.tick(); }, 700 + k * 750);
      later(() => felder[n].classList.remove('leuchtet'), 700 + k * 750 + 500);
    });
    later(() => { zeigt = false; info.textContent = '👉 Jetzt du! Tippe die Spur nach.'; }, 700 + seq.length * 750);
  }
  function tipp(i) {
    if (zeigt || !laeuft) return;
    const k = eingabe.length;
    if (seq[k] === i) {
      eingabe.push(i);
      felder[i].classList.add('gefunden'); sfx.pop();
      setTimeout(() => felder[i].classList.remove('gefunden'), 250);
      if (eingabe.length === seq.length) { zeigt = true; info.textContent = '✅ Richtig!'; sfx.richtig(); laenge++; later(neueRunde, 900); }
    } else {
      felder[i].classList.add('falsch'); sfx.falsch(); leben--; zeigt = true;
      setTimeout(() => felder[i].classList.remove('falsch'), 400);
      hv.textContent = '❤️'.repeat(Math.max(0, leben)) || '💔';
      if (leben <= 0) { laeuft = false; const best = laenge - 1; later(() => done({ wert: best, hoeherBesser: true, text: `Spurlänge ${best}`, leistung: (best - 1) / 7, detail: 'Erwachsene schaffen meist 5 bis 7 Schritte. Übung macht es leichter!' }), 700); }
      else { info.textContent = '❌ Ups! Gleiche Länge, neue Spur.'; later(neueRunde, 1100); }
    }
  }
  return () => { laeuft = false; stopCd(); timeouts.forEach(clearTimeout); };
}

// ---------- 3. Memory ----------
function memorySpiel(feld, done) {
  const motive = ['🐜', '🍄', '🐞', '🌻', '🍯', '🥚', '🐛', '🌰'];
  const karten = shuffle([...motive, ...motive]);
  let offen = [], gefunden = 0, zuege = 0, sperre = false, t0 = performance.now(), laeuft = true;
  const zv = h('b', '0'), pv = h('b', '0 / 8');
  const els = karten.map((mo, i) => {
    const k = h('button.memory-karte', { onclick: () => klick(i) }, h('div.innen', h('div.vorne', '🐾'), h('div.hinten', mo)));
    return k;
  });
  fill(feld, hud(['Züge', zv], ['Paare', pv]), h('div.felder', { style: { gridTemplateColumns: 'repeat(4, 82px)' } }, els));
  function klick(i) {
    if (sperre || !laeuft || offen.includes(i) || els[i].classList.contains('gefunden')) return;
    els[i].classList.add('offen'); sfx.tick();
    offen.push(i);
    if (offen.length === 2) {
      zuege++; zv.textContent = zuege;
      const [a, b] = offen;
      if (karten[a] === karten[b]) {
        gefunden++; pv.textContent = `${gefunden} / 8`; sfx.richtig();
        els[a].classList.add('gefunden'); els[b].classList.add('gefunden'); offen = [];
        if (gefunden === 8) {
          laeuft = false;
          const sek = Math.round((performance.now() - t0) / 1000);
          setTimeout(() => done({ wert: zuege, hoeherBesser: false, text: `${zuege} Züge`, leistung: clamp((26 - zuege) / 14, 0, 1), detail: `⏱️ ${sek} Sekunden · Das Minimum sind 8 Züge.` }), 700);
        }
      } else {
        sperre = true;
        setTimeout(() => { els[a].classList.remove('offen'); els[b].classList.remove('offen'); offen = []; sperre = false; }, 850);
      }
    }
  }
  return () => { laeuft = false; };
}

// ---------- 4. Farben-Wirrwarr (Stroop) ----------
function farbenSpiel(feld, done, modal) {
  const F = [['ROT', '#e8323c'], ['BLAU', '#2f6fe0'], ['GRÜN', '#22a447'], ['GELB', '#e6b800']];
  const DAUER = 35;
  let richtig = 0, falsch = 0, aktuell, t0, timer, laeuft = true, rts = [], tz;
  const pv = h('b', '0'), tv = h('b', DAUER + ' s');
  const bar = h('div.zeitbalken', h('i', { style: { width: '100%' } }));
  const wort = h('div.stroop-wort', '');
  const knoepfe = h('div.farb-knoepfe', F.map(([n, c], i) => h('button', { style: { background: c }, onclick: () => antwort(i) }, n)));
  const stopCd = countdown(feld, () => {
    fill(feld, hud(['Richtig', pv], ['Zeit', tv]), bar, wort, knoepfe,
      h('p', { style: { color: '#8a6a4a', margin: 0 } }, 'Tippe die Schriftfarbe! (Tasten 1–4 gehen auch)'));
    t0 = performance.now(); timer = setInterval(tick, 100); neu();
  });
  function neu() {
    let w = randInt(0, 3), c = randInt(0, 3);
    if (Math.random() < 0.75) while (c === w) c = randInt(0, 3);
    aktuell = { w, c, t: performance.now() };
    wort.textContent = F[w][0]; wort.style.color = F[c][1];
  }
  function antwort(i) {
    if (!laeuft || !aktuell) return;
    if (i === aktuell.c) { richtig++; rts.push(performance.now() - aktuell.t); sfx.pop(); }
    else { falsch++; sfx.error(); wort.animate([{ transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'none' }], 250); }
    pv.textContent = richtig;
    aktuell = null; clearTimeout(tz); tz = setTimeout(neu, 120);
  }
  modal._key = e => { if (/^[1-4]$/.test(e.key)) { antwort(+e.key - 1); return true; } return false; };
  function tick() {
    const el = (performance.now() - t0) / 1000;
    tv.textContent = Math.max(0, Math.ceil(DAUER - el)) + ' s';
    bar.firstChild.style.width = Math.max(0, 100 - (el / DAUER) * 100) + '%';
    if (el >= DAUER && laeuft) {
      laeuft = false; clearInterval(timer);
      const wert = Math.max(0, richtig - falsch);
      const rt = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0;
      done({ wert, hoeherBesser: true, text: `${wert} Punkte`, leistung: wert / 30, detail: `✅ ${richtig} richtig · ❌ ${falsch} falsch · ⏱️ ⌀ ${rt} ms pro Wort` });
    }
  }
  return () => { laeuft = false; stopCd(); clearInterval(timer); clearTimeout(tz); };
}

// ---------- 5. Zahlenjagd (Schulte-Tabelle) ----------
function zahlenjagdSpiel(feld, done) {
  const zahlen = shuffle(Array.from({ length: 25 }, (_, i) => i + 1));
  let naechste = 1, t0, timer, fehler = 0, laeuft = true;
  const nv = h('b', '1'), tv = h('b', '0,0 s');
  const btns = zahlen.map(z => h('button', { onclick: e => klick(z, e.currentTarget) }, z));
  const stopCd = countdown(feld, () => {
    fill(feld, hud(['Suche', nv], ['Zeit', tv]), h('div.schulte', btns));
    t0 = performance.now();
    timer = setInterval(() => (tv.textContent = ((performance.now() - t0) / 1000).toFixed(1).replace('.', ',') + ' s'), 100);
  });
  function klick(z, el) {
    if (!laeuft || !t0) return;
    if (z === naechste) {
      el.classList.add('erledigt'); sfx.tick(); naechste++; nv.textContent = Math.min(25, naechste);
      if (naechste > 25) {
        laeuft = false; clearInterval(timer);
        const sek = (performance.now() - t0) / 1000 + fehler;
        const txt = sek.toFixed(1).replace('.', ',') + ' s';
        done({ wert: Math.round(sek * 10) / 10, hoeherBesser: false, text: txt, leistung: clamp((75 - sek) / 50, 0, 1), detail: `${fehler ? `❌ ${fehler} Fehlklicks (je +1 s) · ` : ''}Profis schaffen es in unter 25 Sekunden!` });
      }
    } else if (!el.classList.contains('erledigt')) {
      fehler++; sfx.error(); el.classList.add('falsch'); setTimeout(() => el.classList.remove('falsch'), 300);
    }
  }
  return () => { laeuft = false; stopCd(); clearInterval(timer); };
}

// ---------- 6. Blitzblick (Mengen schnell erfassen) ----------
function blitzblickSpiel(feld, done) {
  const RUNDEN = 10;
  let runde = 0, richtig = 0, laeuft = true, timeouts = [];
  const rv = h('b', `1 / ${RUNDEN}`), pv = h('b', '0');
  const cv = h('canvas', { width: 1040, height: 520 });
  const box = h('div.blitz-feld', cv);
  const knoepfe = h('div.zahl-knoepfe');
  const info = h('div', { style: { fontWeight: 600, minHeight: '1.4em' } }, '');
  const ctx = cv.getContext('2d');
  const later = (fn, ms) => timeouts.push(setTimeout(fn, ms));
  const stopCd = countdown(feld, () => { fill(feld, hud(['Runde', rv], ['Richtig', pv]), box, info, knoepfe); naechste(); });
  function zeichne(n) {
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, 520, 260);
    const pos = [];
    let guard = 0;
    while (pos.length < n && guard++ < 2000) {
      const x = 40 + Math.random() * 440, y = 40 + Math.random() * 180;
      if (pos.every(([a, b]) => Math.hypot(a - x, b - y) > 48)) pos.push([x, y]);
    }
    for (const [x, y] of pos) drawAnt(ctx, { x, y, L: 38, dir: Math.random() < 0.5 ? 1 : -1, tilt: (Math.random() - 0.5) * 0.6, phase: Math.random() * 6 });
  }
  function naechste() {
    if (!laeuft) return;
    if (runde >= RUNDEN) {
      laeuft = false;
      return done({ wert: richtig, hoeherBesser: true, text: `${richtig} von ${RUNDEN}`, leistung: richtig / RUNDEN, detail: 'Kleine Mengen (bis etwa 4) sieht man auf einen Blick – größere am besten in Gruppen!' });
    }
    runde++; rv.textContent = `${runde} / ${RUNDEN}`;
    const max = runde < 4 ? 7 : runde < 7 ? 10 : 13;
    const n = randInt(3, max);
    const zeit = runde < 4 ? 1100 : runde < 7 ? 900 : 750;
    fill(knoepfe); info.textContent = '👀 Schau genau!';
    zeichne(n);
    later(() => {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      info.textContent = 'Wie viele Ameisen waren es?';
      const opts = new Set([n]);
      while (opts.size < 4) { const k = n + randInt(-3, 3); if (k >= 1) opts.add(k); }
      fill(knoepfe, ...[...opts].sort((a, b) => a - b).map(k => h('button', { onclick: e => {
        if ([...knoepfe.children].some(b => b.disabled)) return;
        [...knoepfe.children].forEach(b => (b.disabled = true));
        if (k === n) { richtig++; pv.textContent = richtig; sfx.richtig(); e.currentTarget.style.background = '#dbffd9'; info.textContent = `✅ Richtig, es waren ${n}!`; }
        else { sfx.falsch(); e.currentTarget.style.background = '#ffd5cc'; info.textContent = `Es waren ${n} Ameisen.`; zeichne(n); }
        later(naechste, k === n ? 700 : 1500);
      } }, k)));
    }, zeit);
  }
  return () => { laeuft = false; stopCd(); timeouts.forEach(clearTimeout); };
}

// ---------- 7. Futter-Waage (Kopfrechnen & Vergleichen) ----------
/** Ein Rechenausdruck mit dem Wert v, passend zur Stufe (0 leicht … 3 schwer). */
function waageTerm(v, stufe) {
  const ops = shuffle(stufe === 0 ? ['+'] : stufe === 1 ? ['+', '−'] : stufe === 2 ? ['+', '−', '×', '×'] : ['+', '−', '×', ':']);
  for (const op of ops) {
    if (op === '×') {
      const f = [];
      for (let a = 2; a <= 10; a++) if (v % a === 0 && v / a >= 2 && v / a <= 10) f.push(a);
      if (f.length) { const a = pick(f); return `${a} · ${v / a}`; }
    } else if (op === ':') {
      if (v >= 2 && v <= 10) { const b = randInt(2, 9); return `${v * b} : ${b}`; }
    } else if (op === '−') {
      const b = randInt(2, stufe < 2 ? 9 : 25);
      if (v + b <= 100) return `${v + b} − ${b}`;
    } else if (v >= 4) {
      const a = randInt(2, v - 2);
      return `${a} + ${v - a}`;
    }
  }
  return String(v);
}
function waageAufgabe(stufe) {
  let v1;
  if (stufe === 3 && Math.random() < 0.3) v1 = randInt(3, 10); // macht Geteilt-Aufgaben möglich
  else if (stufe >= 2 && Math.random() < 0.5) v1 = randInt(2, stufe === 2 ? 6 : 9) * randInt(2, 10);
  else v1 = randInt(...[[6, 18], [10, 40], [12, 60], [12, 90]][stufe]);
  v1 = Math.max(4, v1);
  const maxD = stufe < 2 ? 3 : 5;
  const d = Math.random() < 0.22 ? 0 : (Math.random() < 0.5 ? -1 : 1) * randInt(1, maxD);
  const v2 = Math.max(4, v1 + d);
  const t1 = waageTerm(v1, stufe);
  let t2 = waageTerm(v2, stufe), guard = 0;
  while ((t2 === t1 || t2 === String(v2)) && guard++ < 10) t2 = waageTerm(v2, stufe);
  return Math.random() < 0.5 ? { t: [t1, t2], v: [v1, v2] } : { t: [t2, t1], v: [v2, v1] };
}

const FAEDEN_SVG = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M50 2 L3 100 M50 2 L97 100" stroke="#7a5a3a" stroke-width="2" fill="none" vector-effect="non-scaling-stroke"/><circle cx="50" cy="3" r="3" fill="#a8683a"/></svg>';
function waageSpiel(feld, done, modal) {
  const DAUER = 45;
  const uw = uhrwerk();
  let punkte = 0, richtig = 0, falsch = 0, serie = 0, maxSerie = 0, aufgabe = null, bereit = false, laeuft = false, rts = [];
  const pv = h('b', '0'), tv = h('b', DAUER + ' s'), sv = h('b', '–');
  const bar = zeitbalken();
  const term = [h('div.mg-term'), h('div.mg-term')];
  const ergebnis = [h('div.mg-term-wert'), h('div.mg-term-wert')];
  const arm = s => h('div.mg-arm' + (s ? '.seite-r' : '.seite-l'),
    h('div.mg-schale', h('div.mg-faeden', { html: FAEDEN_SVG }), h('div.mg-haufen', h('span.mg-kruemel', s ? '🌰🍪' : '🍪🌰'), term[s], ergebnis[s]), h('div.mg-teller')));
  const waage = h('div.mg-waage', { style: { '--neig': '0deg' } },
    h('div.mg-saeule'), h('div.mg-sockel'), h('div.mg-balken', arm(0), arm(1), h('i.mg-gelenk')));
  const knopf = (wahl, inhalt) => h('button.mg-wk', { onclick: () => antwort(wahl) }, inhalt);
  const kn = [
    knopf(-1, [h('span.pf', '⬅️'), h('span', 'Links schwerer'), kbd('←')]),
    knopf(0, [h('span.pf', '⚖️'), h('span', 'Gleich schwer'), kbd('↓')]),
    knopf(1, [h('span.pf', '➡️'), h('span', 'Rechts schwerer'), kbd('→')]),
  ];
  const uhr = spielUhr(uw, DAUER, tv, bar, ende);
  const stopCd = countdown(feld, () => {
    fill(feld, hud(['Punkte', pv], ['Serie', sv], ['Zeit', tv]), bar, h('div.mg-waage-buehne', waage), h('div.mg-waage-knoepfe', kn));
    laeuft = true;
    uhr.start();
    neu();
  });
  modal._key = e => {
    const wahl = { ArrowLeft: -1, ArrowRight: 1, ArrowDown: 0, ArrowUp: 0, ' ': 0, '=': 0 }[e.key];
    if (wahl === undefined) return false;
    if (!e.repeat) antwort(wahl);
    return true;
  };
  function neu() {
    if (!laeuft) return;
    aufgabe = waageAufgabe(Math.min(3, Math.floor(richtig / 4)));
    waage.style.setProperty('--neig', '0deg');
    waage.classList.remove('gut', 'schlecht');
    kn.forEach(k => k.classList.remove('richtig', 'falsch'));
    for (const s of [0, 1]) {
      term[s].textContent = aufgabe.t[s];
      ergebnis[s].textContent = '';
      ergebnis[s].classList.remove('da');
      blitz(term[s], 'neu');
    }
    aufgabe.da = performance.now();
    bereit = true;
  }
  function antwort(wahl) {
    if (!bereit || !laeuft) return;
    bereit = false;
    const korrekt = Math.sign(aufgabe.v[1] - aufgabe.v[0]);
    waage.style.setProperty('--neig', korrekt * 12 + 'deg');
    for (const s of [0, 1]) { ergebnis[s].textContent = '= ' + aufgabe.v[s]; ergebnis[s].classList.add('da'); }
    const knopfEl = kn[wahl + 1];
    if (wahl === korrekt) {
      richtig++; serie++; maxSerie = Math.max(maxSerie, serie);
      rts.push(performance.now() - aufgabe.da);
      const bonus = serie >= 3 ? 5 : 0;
      punkte += 10 + bonus;
      sfx.pop(); if (serie % 5 === 0) sfx.coin();
      waage.classList.add('gut');
      blitz(knopfEl, 'richtig');
      punkteFlug(waage, bonus ? `+${10 + bonus} 🔥` : '+10', 'gut');
    } else {
      falsch++; serie = 0;
      punkte = Math.max(0, punkte - 5);
      sfx.error();
      waage.classList.add('schlecht');
      blitz(knopfEl, 'falsch');
      kn[korrekt + 1].classList.add('richtig');
      punkteFlug(waage, '−5', 'schlecht');
    }
    pv.textContent = punkte;
    sv.textContent = serie ? serie + (serie >= 3 ? ' 🔥' : '') : '–';
    uw.nach(wahl === korrekt ? 800 : 1700, neu);
  }
  function ende() {
    if (!laeuft) return;
    laeuft = false; bereit = false;
    uw.stop();
    const rt = rts.length ? (rts.reduce((a, b) => a + b, 0) / rts.length / 1000).toFixed(1).replace('.', ',') : '–';
    done({ wert: punkte, hoeherBesser: true, text: `${punkte} Punkte`, leistung: punkte / 220,
      detail: `✅ ${richtig} richtig · ❌ ${falsch} falsch · 🔥 längste Serie: ${maxSerie} · ⏱️ ⌀ ${rt} s pro Waage` });
  }
  return () => { laeuft = false; stopCd(); uw.stop(); };
}

// ---------- 8. Pfadfinderin (Planen: Weg vorher programmieren) ----------
const RICHTUNG = { hoch: [0, -1], runter: [0, 1], links: [-1, 0], rechts: [1, 0] };
const PFAD_LEVEL = [
  { n: 5, hind: 4, min: 3, max: 5 },
  { n: 5, hind: 6, min: 4, max: 6 },
  { n: 6, hind: 8, min: 5, max: 7 },
  { n: 6, hind: 10, min: 6, max: 9 },
  { n: 6, hind: 12, min: 7, max: 10 },
];
function pfadBfs(n, block, [sx, sy], [zx, zy]) {
  const key = (x, y) => y * n + x;
  const vor = new Map([[key(sx, sy), null]]);
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    if (x === zx && y === zy) {
      const weg = [];
      for (let k = key(x, y); k != null; k = vor.get(k)) weg.unshift([k % n, Math.floor(k / n)]);
      return weg;
    }
    for (const [dx, dy] of Object.values(RICHTUNG)) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= n || ny >= n || block.has(k) || vor.has(k)) continue;
      vor.set(k, key(x, y));
      q.push([nx, ny]);
    }
  }
  return null;
}
function pfadLevel(L) {
  const n = L.n;
  for (let v = 0; v < 800; v++) {
    const start = [randInt(0, n - 1), randInt(0, n - 1)], ziel = [randInt(0, n - 1), randInt(0, n - 1)];
    const manhattan = Math.abs(start[0] - ziel[0]) + Math.abs(start[1] - ziel[1]);
    if (manhattan < L.min - 1) continue;
    const block = new Map();
    while (block.size < L.hind) {
      const x = randInt(0, n - 1), y = randInt(0, n - 1);
      if ((x === start[0] && y === start[1]) || (x === ziel[0] && y === ziel[1])) continue;
      block.set(y * n + x, pick(['🪨', '🪨', '🍄', '💧']));
    }
    const weg = pfadBfs(n, block, start, ziel);
    if (!weg) continue;
    const len = weg.length - 1;
    if (len < L.min || len > L.max) continue;
    if (L.n >= 6 && len === manhattan && v < 600) continue; // ab Level 3: Umweg nötig
    return { n, block, start, ziel, weg, kuerzest: len };
  }
  const start = [0, 0], ziel = [n - 1, n - 1], block = new Map();
  return { n, block, start, ziel, weg: pfadBfs(n, block, start, ziel), kuerzest: 2 * (n - 1) };
}

function pfadSpiel(feld, done, modal) {
  const MAX_PROG = 16, VERSUCHE = 3;
  const uw = uhrwerk();
  let li = -1, lvl = null, programm = [], laufend = false, versuch = 0, punkte = 0, geschafft = 0, kurz = 0, aktiv = false;
  let pos = [0, 0], blick = 'rechts', stopLauf = null, phase = 0;
  const lv = h('b', `1 / ${PFAD_LEVEL.length}`), pv = h('b', '0'), vv = h('b', '1 / 3');
  const cv = h('canvas', { width: 120, height: 120 });
  const ctx = cv.getContext('2d');
  const ameise = h('div.mg-pf-ameise', cv);
  const brett = h('div.mg-brett');
  const leiste = h('div.mg-programm');
  const zaehler = h('span.mg-prog-zahl', '0 Schritte');
  const meldung = h('div.mg-pf-meldung', '');
  const pfeil = r => h('button.mg-pfeil.r-' + r, { 'aria-label': r, onclick: () => schritt(r) }, h('i', '➜'));
  const losBtn = h('button.btn.gruen.mg-los', { onclick: los }, '▶ Los!', kbd('Enter'));
  const steuer = h('div.mg-steuer',
    h('div.mg-kreuz', h('span'), pfeil('hoch'), h('span'), pfeil('links'), pfeil('runter'), pfeil('rechts')),
    h('div.mg-steuer-reihe',
      h('button.btn.grau.klein', { onclick: zurueck }, '⌫ Zurück'),
      h('button.btn.grau.klein', { onclick: leeren }, '🗑️ Alles')),
    losBtn);
  const stopCd = countdown(feld, () => {
    fill(feld, hud(['Weg', lv], ['Versuch', vv], ['Punkte', pv]), meldung,
      h('div.mg-pfad', h('div.mg-brett-rahmen', brett), h('div.mg-pfad-rechts',
        h('div.mg-prog-kopf', h('span', '📜 Dein Plan'), zaehler), leiste, steuer)),
      h('p.mg-hinweis', '⌨️ Pfeiltasten = Schritt · ⌫ = zurück · Enter = Los!'));
    aktiv = true;
    naechstesLevel();
  });
  modal._key = e => {
    const r = { ArrowUp: 'hoch', ArrowDown: 'runter', ArrowLeft: 'links', ArrowRight: 'rechts' }[e.key];
    if (r) { schritt(r); return true; }
    if (e.key === 'Backspace') { zurueck(); return true; }
    if (e.key === 'Delete') { leeren(); return true; }
    if (e.key === 'Enter' || e.key === ' ') { if (!e.repeat) los(); return true; }
    return false;
  };
  function zeichne() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, 120, 120);
    const L = 74;
    const tilt = { rechts: 0, links: 0, hoch: -Math.PI / 2, runter: Math.PI / 2 }[blick];
    const dir = blick === 'links' ? -1 : 1;
    // Mittelpunkt etwas verschieben, weil der Hinterleib länger ist als der Kopf
    const off = 0.08 * L;
    const ox = blick === 'rechts' ? off : blick === 'links' ? -off : 0, oy = blick === 'runter' ? off : blick === 'hoch' ? -off : 0;
    drawAnt(ctx, { x: 60 + ox, y: 62 + oy, L, dir, tilt, phase, walking: laufend });
  }
  function setzeAmeise([x, y], sofort = false) {
    ameise.classList.toggle('sofort', sofort);
    ameise.style.setProperty('--x', x);
    ameise.style.setProperty('--y', y);
  }
  function naechstesLevel() {
    li++;
    if (li >= PFAD_LEVEL.length) return ende();
    lvl = pfadLevel(PFAD_LEVEL[li]);
    versuch = 0; programm = [];
    lv.textContent = `${li + 1} / ${PFAD_LEVEL.length}`;
    vv.textContent = `1 / ${VERSUCHE}`;
    const { n, block, start, ziel } = lvl;
    brett.style.setProperty('--n', n);
    const zellen = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const k = y * n + x;
      const ist = (p) => p[0] === x && p[1] === y;
      zellen.push(h('div.mg-zelle' + ((x + y) % 2 ? '.b' : '') + (block.has(k) ? '.hindernis' : '') + (ist(start) ? '.nest' : '') + (ist(ziel) ? '.ziel' : ''),
        { style: { '--i': k } },
        block.has(k) ? h('span.mg-hd', block.get(k)) : ist(ziel) ? h('span.mg-beere', '🍓') : null));
    }
    fill(brett, zellen, ameise);
    pos = [...start];
    blick = ziel[0] < start[0] ? 'links' : 'rechts';
    setzeAmeise(pos, true);
    zeichne();
    meldung.className = 'mg-pf-meldung';
    meldung.textContent = li === 0 ? '🧭 Plane mit den Pfeilen den Weg zur 🍓 – dann drücke „Los!“' : `🧭 Weg ${li + 1}: Der kürzeste Weg hat ${lvl.kuerzest} Schritte. Schaffst du das?`;
    laufend = false;
    zeigeProgramm();
  }
  function zeigeProgramm(aktivIdx = -1, fehlerIdx = -1) {
    fill(leiste, programm.length ? programm.map((r, i) => h('span.mg-chip.r-' + r + (i === aktivIdx ? '.aktiv' : '') + (i === fehlerIdx ? '.fehler' : ''), h('i', '➜')))
      : h('span.mg-prog-leer', 'Noch leer – tippe auf die Pfeile!'));
    zaehler.textContent = `${programm.length} ${programm.length === 1 ? 'Schritt' : 'Schritte'}`;
    losBtn.disabled = !programm.length || laufend;
  }
  function schritt(r) {
    if (!aktiv || laufend) return;
    if (programm.length >= MAX_PROG) { sfx.error(); blitz(leiste, 'voll'); return; }
    programm.push(r);
    sfx.click();
    zeigeProgramm();
    leiste.lastChild?.classList.add('neu');
  }
  function zurueck() { if (!aktiv || laufend || !programm.length) return; programm.pop(); sfx.tick(); zeigeProgramm(); }
  function leeren() { if (!aktiv || laufend || !programm.length) return; programm = []; sfx.dig(); zeigeProgramm(); }
  function los() {
    if (!aktiv || laufend || !programm.length) return;
    laufend = true;
    zeigeProgramm();
    brett.querySelectorAll('.spur').forEach(z => z.classList.remove('spur'));
    pos = [...lvl.start];
    setzeAmeise(pos, true);
    meldung.className = 'mg-pf-meldung';
    meldung.textContent = '🐜 Los geht\'s …';
    stopLauf = uw.schleife(t => { phase = t / 70; zeichne(); }, 30);
    let k = 0;
    const geh = () => {
      if (k >= programm.length) return fehlversuch('🤔 Der Plan ist zu Ende – aber die Ameise ist noch nicht bei der Erdbeere.', -1);
      const r = programm[k];
      const [dx, dy] = RICHTUNG[r];
      const nx = pos[0] + dx, ny = pos[1] + dy;
      blick = r;
      zeigeProgramm(k);
      if (nx < 0 || ny < 0 || nx >= lvl.n || ny >= lvl.n || lvl.block.has(ny * lvl.n + nx)) {
        setzeAmeise([pos[0] + dx * 0.3, pos[1] + dy * 0.3]);
        uw.nach(180, () => setzeAmeise(pos));
        const was = nx < 0 || ny < 0 || nx >= lvl.n || ny >= lvl.n ? 'Da ist der Rand!' : { '🪨': 'Da liegt ein Stein!', '🍄': 'Da steht ein Pilz!', '💧': 'Da ist eine Pfütze!' }[lvl.block.get(ny * lvl.n + nx)];
        return fehlversuch(`💥 Autsch! ${was} (Schritt ${k + 1})`, k);
      }
      pos = [nx, ny];
      setzeAmeise(pos);
      brett.children[ny * lvl.n + nx].classList.add('spur');
      sfx.tick();
      k++;
      if (nx === lvl.ziel[0] && ny === lvl.ziel[1]) return uw.nach(320, erfolg);
      uw.nach(340, geh);
    };
    uw.nach(250, geh);
  }
  function halt() { stopLauf?.(); stopLauf = null; phase = 0; }
  function fehlversuch(text, fehlerIdx) {
    halt();
    laufend = false;
    zeichne();
    versuch++;
    sfx.falsch();
    zeigeProgramm(-1, fehlerIdx);
    meldung.className = 'mg-pf-meldung schlecht';
    if (versuch >= VERSUCHE) {
      laufend = true;
      losBtn.disabled = true;
      meldung.textContent = `${text} So wäre es gegangen:`;
      lvl.weg.slice(1).forEach(([x, y], i) => uw.nach(200 + i * 140, () => brett.children[y * lvl.n + x].classList.add('loesung')));
      uw.nach(900 + lvl.weg.length * 140, naechstesLevel);
      return;
    }
    meldung.textContent = `${text} Ändere deinen Plan und versuche es nochmal!`;
    vv.textContent = `${versuch + 1} / ${VERSUCHE}`;
    uw.nach(700, () => { if (!laufend) { pos = [...lvl.start]; setzeAmeise(pos, false); } });
  }
  function erfolg() {
    halt();
    const optimal = programm.length === lvl.kuerzest;
    const p = VERSUCHE - versuch + (optimal ? 1 : 0);
    punkte += p; geschafft++; if (optimal) kurz++;
    pv.textContent = punkte;
    zeichne();
    sfx.richtig();
    blitz(brett.children[lvl.ziel[1] * lvl.n + lvl.ziel[0]], 'gefressen');
    punkteFlug(ameise, `+${p}`, 'gut');
    meldung.className = 'mg-pf-meldung gut';
    meldung.textContent = optimal ? '🎯 Lecker! Und das war sogar der kürzeste Weg!' : versuch === 0 ? '🍓 Lecker! Beim ersten Versuch geschafft!' : '🍓 Lecker! Geschafft!';
    uw.nach(1500, naechstesLevel);
  }
  function ende() {
    aktiv = false;
    uw.stop();
    const max = PFAD_LEVEL.length * (VERSUCHE + 1);
    done({ wert: punkte, hoeherBesser: true, text: `${punkte} Punkte`, leistung: punkte / (max - 2),
      detail: `🍓 ${geschafft} von ${PFAD_LEVEL.length} Wegen gefunden · 🎯 ${kurz}× den kürzesten Weg geplant · Je weniger Versuche, desto mehr Punkte (höchstens ${max}).` });
  }
  return () => { aktiv = false; stopCd(); uw.stop(); };
}

// ---------- 9. Kammer-Inventur (visuelles Gedächtnis / Veränderungen erkennen) ----------
const INVENTUR_DINGE = ['🍓', '🌰', '🍄', '🥚', '🍯', '🌻', '🍃', '🐛', '🍎', '🌾', '🐞', '🍒', '🥜', '🍀', '🌸', '🐌', '🍇', '🍋', '🌽', '🦋', '🍐', '🥕'];
function inventurSpiel(feld, done, modal) {
  const RUNDEN = 8, SLOTS = 12, ANZ = [4, 5, 5, 6, 6, 7, 7, 8];
  const arten = ['fehlt', 'neu', ...shuffle(['fehlt', 'fehlt', 'fehlt', 'neu', 'neu', 'neu'])];
  const uw = uhrwerk();
  let runde = 0, richtig = 0, phase = 'start', r = null;
  const rv = h('b', `1 / ${RUNDEN}`), pv = h('b', '0');
  const mulden = Array.from({ length: SLOTS }, (_, i) => h('div.mg-mulde', { onpointerdown: () => muldeTipp(i) }));
  const deckel = h('div.mg-deckel', h('span', '🍂 Zugedeckt …'));
  const kammer = h('div.mg-vorrat', h('div.mg-mulden', mulden), deckel);
  const merk = h('div.mg-merkbalken', h('i'));
  const frage = h('div.mg-frage', '');
  const unten = h('div.mg-unten');
  const stopCd = countdown(feld, () => {
    fill(feld, hud(['Runde', rv], ['Richtig', pv]), frage, kammer, merk, unten);
    naechste();
  });
  modal._key = e => {
    if (phase === 'zeigen' && (e.key === 'Enter' || e.key === ' ')) { zudecken(); return true; }
    const z = zifferAus(e);
    if (phase === 'frage' && z >= 1 && z <= 4) { antwort(r.optionen[z - 1]); return true; }
    return false;
  };
  function setze(i, em, cls = '', k = 0) {
    mulden[i].classList.remove('markiert');
    fill(mulden[i], em ? h('span.mg-ding' + (cls ? '.' + cls : ''), { style: { '--d': k * 60 + 'ms' } }, em) : null);
  }
  function naechste() {
    if (runde >= RUNDEN) {
      phase = 'ende';
      uw.stop();
      return done({ wert: richtig, hoeherBesser: true, text: `${richtig} von ${RUNDEN}`, leistung: richtig / RUNDEN,
        detail: richtig >= 6 ? '🦉 Super Gedächtnis! Tipp für noch mehr: Sage dir die Dinge im Kopf leise vor.' : '💡 Tipp: Bilde Gruppen im Kopf – z. B. „drei Früchte, zwei Tiere und ein Ei“.' });
    }
    runde++;
    rv.textContent = `${runde} / ${RUNDEN}`;
    const n = ANZ[runde - 1];
    const dinge = shuffle(INVENTUR_DINGE).slice(0, n);
    const plaetze = shuffle([...Array(SLOTS).keys()]).slice(0, n);
    r = { art: arten[runde - 1], dinge, belegung: new Map(), slot: -1, loesung: '', optionen: [], timer: 0 };
    mulden.forEach((_, i) => setze(i, null));
    plaetze.forEach((p, k) => { r.belegung.set(p, dinge[k]); setze(p, dinge[k], 'auf', k); });
    frage.className = 'mg-frage';
    frage.textContent = `👀 Merke dir alle ${n} Dinge in der Kammer!`;
    const zeit = 1600 + n * 380;
    const i = merk.firstChild;
    i.style.transition = 'none'; i.style.transform = 'scaleX(1)';
    void i.offsetWidth;
    i.style.transition = `transform ${zeit}ms linear`; i.style.transform = 'scaleX(0)';
    fill(unten, h('button.btn.blau', { onclick: zudecken }, '✓ Gemerkt!', kbd('Enter')));
    phase = 'zeigen';
    r.timer = uw.nach(zeit, zudecken);
  }
  function zudecken() {
    if (phase !== 'zeigen') return;
    phase = 'zu';
    uw.weg(r.timer);
    const i = merk.firstChild;
    i.style.transition = 'none'; i.style.transform = 'scaleX(0)';
    deckel.classList.add('zu');
    sfx.whoosh();
    fill(unten);
    frage.textContent = '🍂 Die Kammer wird kurz zugedeckt …';
    uw.nach(500, veraendern);
    uw.nach(1300, aufdecken);
  }
  function veraendern() {
    const belegt = [...r.belegung.keys()];
    const p = pick(belegt);
    const fremde = shuffle(INVENTUR_DINGE.filter(x => !r.dinge.includes(x)));
    r.slot = p;
    if (r.art === 'fehlt') {
      r.loesung = r.belegung.get(p);
      r.belegung.delete(p);
      setze(p, null);
      r.optionen = shuffle([r.loesung, ...fremde.slice(0, 3)]);
    } else {
      const alt = r.belegung.get(p);
      r.loesung = fremde[0];
      r.belegung.set(p, r.loesung);
      setze(p, r.loesung);
      r.optionen = shuffle([r.loesung, ...shuffle(r.dinge.filter(x => x !== alt)).slice(0, 3)]);
    }
  }
  function aufdecken() {
    deckel.classList.remove('zu');
    phase = 'frage';
    frage.className = 'mg-frage frage';
    frage.textContent = r.art === 'fehlt' ? '🤔 Was FEHLT jetzt in der Kammer?' : '🔎 Was ist NEU in der Kammer?';
    fill(unten, h('div.mg-optionen', r.optionen.map((em, k) => h('button.mg-option', { onclick: () => antwort(em) }, h('span.em', em), kbd(String(k + 1))))));
  }
  function muldeTipp(i) {
    if (phase === 'frage' && r.art === 'neu' && r.belegung.has(i)) antwort(r.belegung.get(i));
  }
  function antwort(em) {
    if (phase !== 'frage') return;
    phase = 'feedback';
    const ok = em === r.loesung;
    const btns = [...unten.querySelectorAll('.mg-option')];
    btns.forEach((b, k) => {
      b.disabled = true;
      if (r.optionen[k] === r.loesung) b.classList.add('richtig');
      else if (r.optionen[k] === em) b.classList.add('falsch');
    });
    if (r.art === 'fehlt') setze(r.slot, r.loesung, 'geist');
    mulden[r.slot].classList.add('markiert');
    if (ok) { richtig++; pv.textContent = richtig; sfx.richtig(); }
    else sfx.falsch();
    frage.className = 'mg-frage ' + (ok ? 'gut' : 'schlecht');
    frage.textContent = ok ? (r.art === 'fehlt' ? `✅ Richtig! ${r.loesung} hat gefehlt.` : `✅ Richtig! ${r.loesung} ist neu.`)
      : (r.art === 'fehlt' ? `❌ Schade – ${r.loesung} hat gefehlt.` : `❌ Schade – ${r.loesung} war neu.`);
    uw.nach(ok ? 1300 : 2200, naechste);
  }
  return () => { phase = 'ende'; stopCd(); uw.stop(); };
}

// ---------- 10. Sortier-Ameise (Aufgabenwechsel / kognitive Flexibilität) ----------
let futterId = 0;
function futterSVG(farbe, form) {
  const id = 'mgf' + (++futterId);
  const [c1, c2, c3] = farbe === 0 ? ['#ffc2b8', '#f2463c', '#9e1d17'] : ['#bcd4ff', '#3a78f0', '#163c99'];
  const koerper = form === 0
    ? `<circle cx="50" cy="52" r="39" fill="url(#${id})" stroke="${c3}" stroke-width="3"/>`
    : `<rect x="12" y="14" width="76" height="76" rx="13" fill="url(#${id})" stroke="${c3}" stroke-width="3"/>`;
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="${id}" cx="36%" cy="30%" r="80%"><stop offset="0" stop-color="${c1}"/><stop offset=".5" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></radialGradient></defs>${koerper}`
    + `<ellipse cx="35" cy="31" rx="13" ry="7" fill="#fff" opacity=".55" transform="rotate(-28 35 31)"/>`
    + `<circle cx="39" cy="53" r="6" fill="#fff"/><circle cx="61" cy="53" r="6" fill="#fff"/><circle cx="40" cy="54.5" r="3.2" fill="#2a1a10"/><circle cx="62" cy="54.5" r="3.2" fill="#2a1a10"/>`
    + `<circle cx="30" cy="64" r="4.5" fill="#fff" opacity=".3"/><circle cx="70" cy="64" r="4.5" fill="#fff" opacity=".3"/>`
    + `<path d="M42 66 Q50 74 58 66" stroke="#2a1a10" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
}
function sortierSpiel(feld, done, modal) {
  const DAUER = 45;
  const uw = uhrwerk();
  let regel = pick(['farbe', 'form']), bis = randInt(3, 5), item = null, richtig = 0, falsch = 0, wechsel = 0, nachWechsel = false, laeuft = false;
  const rtWechsel = [], rtGleich = [];
  const pv = h('b', '0'), tv = h('b', DAUER + ' s');
  const bar = zeitbalken();
  const regelEl = h('div.mg-regel');
  const mitte = h('div.mg-sort-mitte');
  const zahl = [h('b', '0'), h('b', '0')];
  const kammern = [0, 1].map(s => h('button.mg-sk' + (s ? '.seite-r' : '.seite-l'), { onclick: () => antwort(s), 'aria-label': s ? 'Rechte Kammer' : 'Linke Kammer' },
    h('div.mg-sk-dach', s ? 'Rechts ➡' : '⬅ Links'),
    h('div.mg-sk-zeile.farbe', h('i.mg-punkt' + (s ? '.blau' : '.rot')), s ? 'blau' : 'rot'),
    h('div.mg-sk-zeile.form', h('i.mg-symbol' + (s ? '.eckig' : '.rund')), s ? 'eckig' : 'rund'),
    h('div.mg-sk-zahl', '📦 ', zahl[s]), kbd(s ? '→' : '←')));
  const brett = h('div.mg-sort', kammern[0], mitte, kammern[1]);
  const uhr = spielUhr(uw, DAUER, tv, bar, ende);
  const stopCd = countdown(feld, () => {
    fill(feld, hud(['Richtig', pv], ['Zeit', tv]), bar, regelEl, brett,
      h('p.mg-hinweis', '⌨️ Pfeiltaste ← oder → – oder tippe auf die Kammer'));
    zeigeRegel(false);
    laeuft = true;
    uhr.start();
    neu();
  });
  modal._key = e => {
    const s = { ArrowLeft: 0, ArrowRight: 1, a: 0, d: 1, 1: 0, 2: 1 }[e.key];
    if (s === undefined) return false;
    if (!e.repeat) antwort(s);
    return true;
  };
  function zeigeRegel(animiert) {
    brett.classList.toggle('regel-farbe', regel === 'farbe');
    brett.classList.toggle('regel-form', regel === 'form');
    regelEl.className = 'mg-regel ' + regel;
    fill(regelEl, h('span.em', regel === 'farbe' ? '🎨' : '🔷'), h('span', 'Sortiere nach ', h('b', regel === 'farbe' ? 'FARBE' : 'FORM')));
    if (animiert) blitz(regelEl, 'wechsel');
  }
  function neu() {
    if (!laeuft) return;
    const farbe = randInt(0, 1), form = randInt(0, 1);
    const el = h('div.mg-futter', { html: futterSVG(farbe, form) });
    fill(mitte, el);
    item = { farbe, form, el, t: performance.now() };
  }
  function antwort(s) {
    if (!laeuft || !item) return;
    const it = item; item = null;
    const soll = regel === 'farbe' ? it.farbe : it.form;
    const rt = performance.now() - it.t;
    const dx = s ? '160%' : '-160%';
    kammern[s].classList.remove('gut', 'falsch');
    if (s === soll) {
      richtig++;
      (nachWechsel ? rtWechsel : rtGleich).push(rt);
      zahl[s].textContent = +zahl[s].textContent + 1;
      sfx.pop();
      blitz(kammern[s], 'gut');
      it.el.animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${dx}) scale(.3)`, opacity: 0 }], { duration: 220, easing: 'ease-in', fill: 'forwards' });
    } else {
      falsch++;
      sfx.error();
      blitz(kammern[s], 'falsch');
      blitz(regelEl, 'erinnern');
      it.el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-12px) rotate(-6deg)' }, { transform: 'translateX(12px) rotate(6deg)' }, { transform: 'translateX(0)', opacity: 0.2 }], { duration: 420, fill: 'forwards' });
    }
    pv.textContent = richtig;
    nachWechsel = false;
    let pause = s === soll ? 200 : 650;
    if (--bis <= 0) {
      regel = regel === 'farbe' ? 'form' : 'farbe';
      bis = randInt(2, 5);
      wechsel++;
      nachWechsel = true;
      pause += 300;
      uw.nach(pause - 280, () => { zeigeRegel(true); sfx.whoosh(); });
    }
    uw.nach(pause, neu);
  }
  function ende() {
    if (!laeuft) return;
    laeuft = false;
    uw.stop();
    const wert = Math.max(0, richtig - falsch);
    const mw = a => a.reduce((x, y) => x + y, 0) / a.length;
    let tipp = '';
    if (rtWechsel.length >= 2 && rtGleich.length >= 2) {
      const diff = Math.round(mw(rtWechsel) - mw(rtGleich));
      tipp = diff > 60 ? ` · 🔄 Nach einem Regelwechsel brauchst du ⌀ ${diff} ms länger – ganz normal, dein Gehirn muss umschalten!` : ' · 🔄 Du schaltest blitzschnell zwischen den Regeln um!';
    }
    done({ wert, hoeherBesser: true, text: `${wert} Punkte`, leistung: wert / 28,
      detail: `✅ ${richtig} richtig · ❌ ${falsch} falsch · ${wechsel} Regelwechsel${tipp}` });
  }
  return () => { laeuft = false; stopCd(); uw.stop(); };
}
