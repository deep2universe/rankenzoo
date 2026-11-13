// Denksport-Halle: sechs Minispiele für Reaktion, Konzentration und Gedächtnis.
import { h, shuffle, randInt, pick, clamp, fill } from '../util.js';
import { openModal, konfetti } from './modal.js';
import { sfx } from '../audio.js';
import { drawAnt } from '../render/antdraw.js';
import { emit } from '../events.js';

const BLATTLAUS_SVG = `<svg viewBox="0 0 60 50" width="58" height="48"><ellipse cx="30" cy="30" rx="20" ry="15" fill="#8fe05a" stroke="#4a9a2a" stroke-width="2"/><ellipse cx="24" cy="24" rx="7" ry="4" fill="#c9f5a8" opacity=".7"/><circle cx="46" cy="24" r="9" fill="#9be866" stroke="#4a9a2a" stroke-width="2"/><circle cx="49" cy="22" r="2.6" fill="#222"/><circle cx="50" cy="21" r=".9" fill="#fff"/><path d="M50 16 Q54 6 58 8 M47 16 Q47 5 51 4" stroke="#4a9a2a" stroke-width="1.6" fill="none"/><path d="M18 42 l-4 6 M28 44 l-1 6 M38 43 l3 6" stroke="#4a9a2a" stroke-width="2"/></svg>`;

export const SPIELE = [
  { id: 'kaefer', name: 'Marienkäfer-Alarm', icon: '🐞', f1: '#ff6b6b', f2: '#ff9f6b', trainiert: '⚡ Reaktion & Impulskontrolle',
    text: 'Marienkäfer wollen die Blattläuse fressen! Tippe schnell jeden Marienkäfer an. Aber Achtung: Tippe NIE auf eine grüne Blattlaus – die beschützen wir!',
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
];

export function openMinigames(game) {
  const s = game.state;
  const m = openModal({ titel: 'Denksport-Halle', unter: 'Übe Konzentration, Reaktion und Gedächtnis – und sammle Nahrung für dein Volk!', icon: '🧠', klasse: 'breit', farbe: ['#7b4dff', '#b18cff'] });
  game.pause(true);
  const oc = m.close; m.close = r => { m._stop?.(); oc(r); game.pause(false); };

  function hub() {
    m._stop = null; m._key = null;
    m.setTitel('Denksport-Halle', 'Übe Konzentration, Reaktion und Gedächtnis – und sammle Nahrung für dein Volk!'); m.setIcon('🧠'); m.setFarbe('#7b4dff', '#b18cff');
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

// ---------- 1. Marienkäfer-Alarm (Go/No-Go) ----------
function kaeferSpiel(feld, done) {
  const DAUER = 40;
  let punkte = 0, treffer = 0, fehler = 0, verpasst = 0, rts = [], t0, timer, spawnT, laeuft = true;
  const pv = h('b', '0'), tv = h('b', DAUER + ' s');
  const bar = h('div.zeitbalken', h('i', { style: { width: '100%' } }));
  const loecher = Array.from({ length: 9 }, () => h('div.loch'));
  const belegt = new Array(9).fill(null);
  let stopCd = countdown(feld, () => {
    fill(feld, hud(['Punkte', pv], ['Zeit', tv]), bar, h('div.loecher', loecher));
    t0 = performance.now();
    timer = setInterval(tick, 100);
    spawn();
  });
  function tick() {
    const el = (performance.now() - t0) / 1000;
    tv.textContent = Math.max(0, Math.ceil(DAUER - el)) + ' s';
    bar.firstChild.style.width = Math.max(0, 100 - (el / DAUER) * 100) + '%';
    if (el >= DAUER) ende();
  }
  function spawn() {
    if (!laeuft) return;
    const el = (performance.now() - t0) / 1000;
    const tempo = clamp(1 - el / DAUER, 0, 1);
    const frei = belegt.map((b, i) => (b ? -1 : i)).filter(i => i >= 0);
    if (frei.length) {
      const i = pick(frei);
      const kaefer = Math.random() < 0.68;
      const tier = h('div.tier', { html: kaefer ? '🐞' : BLATTLAUS_SVG });
      const da = performance.now();
      const sicht = 700 + tempo * 600;
      const weg = () => { if (belegt[i] !== tier) return; tier.classList.remove('oben'); belegt[i] = null; setTimeout(() => tier.remove(), 150); };
      tier.addEventListener('pointerdown', e => {
        e.preventDefault();
        if (belegt[i] !== tier || !laeuft) return;
        if (kaefer) { punkte += 10; treffer++; rts.push(performance.now() - da); sfx.pop(); tier.classList.add('getroffen'); }
        else { punkte = Math.max(0, punkte - 15); fehler++; sfx.error(); tier.style.filter = 'hue-rotate(-90deg)'; }
        pv.textContent = punkte;
        weg();
      });
      belegt[i] = tier;
      loecher[i].append(tier);
      requestAnimationFrame(() => requestAnimationFrame(() => tier.classList.add('oben')));
      setTimeout(() => { if (belegt[i] === tier && kaefer) verpasst++; weg(); }, sicht);
    }
    spawnT = setTimeout(spawn, 450 + tempo * 500);
  }
  function ende() {
    if (!laeuft) return;
    laeuft = false; clearInterval(timer); clearTimeout(spawnT);
    const rt = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0;
    const quote = treffer / Math.max(1, treffer + verpasst);
    done({ wert: punkte, hoeherBesser: true, text: `${punkte} Punkte`, leistung: punkte / 380 * (fehler > 4 ? 0.8 : 1),
      detail: `🐞 ${treffer} gefangen (${Math.round(quote * 100)} %) · 🌿 ${fehler}× Blattlaus erwischt · ⏱️ Reaktionszeit ⌀ ${rt} ms` });
  }
  return () => { laeuft = false; stopCd(); clearInterval(timer); clearTimeout(spawnT); };
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
