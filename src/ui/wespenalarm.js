// Wespenalarm: zweite Variante des Hochzeitsflugs. Die junge Königin fliegt seitlich
// über die Wiese zu ihrem neuen Nestplatz. Freche Wespen wollen sie anrempeln –
// sie wehrt sich mit Nektar, der ganz von allein spritzt. Getroffene Wespen werden
// pappsatt und fliegen friedlich davon (weiße Fahne, Herzchen, Zzz). Leuchtende
// Blüten schenken Power-ups. Alles prozedural auf <canvas> gezeichnet – keine Bilder.
//
//   openWespenalarm(game, { dauer, wespen, powerups, mut, wind, name, koloniename, uebung })
//     → Promise<{ erfolg, wespen, treffer, powerups, punkte }>
//
// Zusätzliche (optionale) Test-Optionen: boss (true/false, Standard: dauer ≥ 70),
// bossBei (Anteil der Strecke, Standard 0.8).
import { h, clamp, lerp, rand, pick, shuffle } from '../util.js';
import { openModal, konfetti, topModal } from './modal.js';
import { sfx } from '../audio.js';
import { drawGlow, cached } from '../render/sprites.js';
import { drawAnt } from '../render/antdraw.js';

const TAU = Math.PI * 2;
const FONT = '"Fredoka","Nunito","Segoe UI",system-ui,sans-serif';
const EMOJI = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
const SPEED = 26;          // Boden-Scrollgeschwindigkeit (Einheiten/s)
const Q_LEN = 12;          // Länge der Königin (Einheiten)
const Q_R = 3.3;           // Trefferradius der Königin
const PICK_R = 8.5;        // Aufsammel-Radius für Blüten
const HONIG_MAX = 12;      // satte Wespen bis zur nächsten Honigbombe
const HUEGEL_R = 4.6, HUEGEL_H = 2.4, NEST_S = 4.4;

const reduziert = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const easeOut = t => 1 - (1 - t) ** 3;
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const hs = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const ton = (name, ...a) => { try { sfx[name]?.(...a); } catch { /* egal */ } };

const LOB = ['Super!', 'Klasse!', 'Toll!', 'Spitze!', 'Prima!', 'Wow!', 'Juhu!'];
const AUTSCH = ['Autsch, frech!', 'He, nicht schubsen!', 'Hui, frech!', 'Na hör mal!', 'Hey, Vorsicht!'];
const SATT = ['Na gut, na gut …', 'Mmmh, Nektar!', 'Schon gut, schon gut!', 'Pappsatt!', 'Ich geb auf!', 'Okay, du gewinnst!',
  'Mjam! Danke!', 'Zeit für ein Nickerchen …', 'Friede!', 'Ich flieg ja schon …', 'So klebrig … so lecker!', 'Na schön …'];
const TSCHUESS = ['Tschüss!', 'Wir lassen dich in Ruhe!', 'Oh, entschuldige!', 'Gute Reise!'];

// ================================================================
//  Power-ups
// ================================================================
const PU = {
  doppel: { name: 'Doppel-Nektar', icon: '💧', rgb: '255,190,60', blatt: ['#ffe066', '#ffae1a'], art: 'stufe', max: 3, info: 'Mehr Nektarstrahlen!' },
  faecher: { name: 'Fächerschuss', icon: '🌼', rgb: '255,140,190', blatt: ['#ffb3d1', '#ff6fa5'], art: 'stufe', max: 3, info: 'Tropfen fliegen im Fächer!' },
  turbo: { name: 'Turbo-Tropfen', icon: '⚡', rgb: '255,240,90', blatt: ['#fff59a', '#ffd000'], art: 'zeit', dauer: 10, info: 'Doppelt so schnell spritzen!' },
  pollen: { name: 'Pollen-Sucher', icon: '🌻', rgb: '255,215,60', blatt: ['#ffd84d', '#e89b00'], art: 'stufe', max: 3, info: 'Pollenkugeln finden Wespen von allein!' },
  schild: { name: 'Honig-Schild', icon: '🛡️', rgb: '255,200,90', blatt: ['#ffe2a0', '#f0a830'], art: 'ladung', max: 3, info: 'Eine Honigblase schützt dich!' },
  bombe: { name: 'Blüten-Bombe', icon: '💥', rgb: '255,110,150', blatt: ['#ff8fb8', '#ff3f7f'], art: 'sofort', info: 'Alle Wespen werden auf einmal satt!' },
  riesen: { name: 'Riesen-Tropfen', icon: '🍯', rgb: '255,150,40', blatt: ['#ffbd66', '#ff7b00'], art: 'zeit', dauer: 12, info: 'Dicke Tropfen fliegen durch alles!' },
  seiten: { name: 'Seitenstrahler', icon: '↕️', rgb: '120,215,255', blatt: ['#a6e6ff', '#3fb5f0'], art: 'stufe', max: 2, info: 'Spritzt auch nach oben und unten!' },
  hummel: { name: 'Freundes-Hummel', icon: '🐝', rgb: '255,205,80', blatt: ['#fff0b0', '#ffc233'], art: 'helfer', max: 2, dauer: 22, info: 'Eine Freundin fliegt mit und hilft!' },
  mut: { name: 'Mut-Blume', icon: '💛', rgb: '255,120,130', blatt: ['#ffa0a8', '#ff5a6e'], art: 'sofort', info: 'Neuer Mut für die Königin!' },
  zeitlupe: { name: 'Zeitlupe', icon: '🐌', rgb: '150,170,255', blatt: ['#c4ceff', '#8a9cff'], art: 'zeit', dauer: 8, info: 'Die Wespen werden ganz langsam!' },
  magnet: { name: 'Blüten-Magnet', icon: '🧲', rgb: '200,120,255', blatt: ['#ddb6ff', '#a96cff'], art: 'zeit', dauer: 15, info: 'Blüten fliegen von selbst zu dir!' },
  stern: { name: 'Sternen-Blüte', icon: '⭐', rgb: '255,250,170', blatt: ['#ff8a8a', '#ffd166', '#8ef08a', '#7cc8ff', '#c49bff'], art: 'zeit', dauer: 7, info: 'Unbesiegbar! Wespen werden bei Berührung satt.' },
};
const PU_LISTE = Object.keys(PU);

// ================================================================
//  Wespen
// ================================================================
const WT = {
  flitzer: { name: 'Flitz-Wespe', gr: 9, r: 3.4, hp: 2, schaden: 10, koerper: ['#fff27a', '#ffc400', '#d99400'], streifen: '#2e2016', kopf: ['#fff38a', '#ffcc1c'], brust: '#3a2a1c' },
  sturz: { name: 'Sturzflug-Wespe', gr: 9, r: 3.4, hp: 2, schaden: 12, koerper: ['#ffcf85', '#ff9a1c', '#cc6400'], streifen: '#2e1a10', kopf: ['#ffd27a', '#ffa82e'], brust: '#3a2216', brille: true },
  kreisel: { name: 'Kreisel-Wespe', gr: 8.6, r: 3.3, hp: 3, schaden: 10, koerper: ['#f6ff96', '#d8e400', '#98a600'], streifen: '#2a2a14', kopf: ['#faff9e', '#dfe83a'], brust: '#33331a', schal: true },
  form: { name: 'Schwarm-Wespe', gr: 7.4, r: 3, hp: 1, schaden: 8, koerper: ['#fff6a8', '#ffd84a', '#ecaa00'], streifen: '#3a2a18', kopf: ['#fff8b0', '#ffd84a'], brust: '#46321e', muetze: true },
  brummer: { name: 'Brummer', gr: 15, r: 5.6, hp: 9, schaden: 15, koerper: ['#ffbf80', '#e0701a', '#93400a'], streifen: '#4a1c0c', kopf: ['#ffd29a', '#e8902e'], brust: '#4a2412', pelz: true },
  boss: { name: 'Königin Brummhilde', gr: 30, r: 10, hp: 200, schaden: 16, koerper: ['#fff27a', '#ffc400', '#d08a00'], streifen: '#2e2016', kopf: ['#fff38a', '#ffcc1c'], brust: '#3a2a1c', krone: true },
};

const FORM = {
  V: (i, n) => { const m = (n - 1) / 2; return [Math.abs(i - m) * 5.5, (i - m) * 5.5]; },
  linie: (i, n, t) => [i * 7.5, Math.sin(t * 2 + i * 0.6) * 5],
  welle: (i, n, t) => [i * 6.5, Math.sin(t * 2.2 - i * 0.75) * 13],
  kreis: (i, n, t) => { const a = i / n * TAU + t * 1.7; return [Math.cos(a) * 10 + 10, Math.sin(a) * 10]; },
};
const FORM_H = { V: 20, linie: 6, welle: 14, kreis: 11 };

// ================================================================
//  Sprites der Wiese (einmal gemalt, danach nur skaliert kopiert)
// ================================================================
const BLUMEN = [
  ['#ffffff', '#ffd23c'], ['#ff8fb8', '#ffe066'], ['#ffd93c', '#ff9f1c'], ['#9b8cff', '#fff3a0'], ['#ff5a5a', '#3a2016'], ['#6fc3ff', '#ffffff'],
];
function spriteBlume(v) {
  const [blatt, mitte] = BLUMEN[v % BLUMEN.length];
  return cached('wsp-blume' + v, 0.5, 0.66, x => {
    x.lineCap = 'round';
    x.strokeStyle = '#3f8f35'; x.lineWidth = 0.035;
    x.beginPath(); x.moveTo(0.25, 0.66); x.quadraticCurveTo(0.22, 0.4, 0.25, 0.2); x.stroke();
    x.fillStyle = '#4fa63f';
    x.beginPath(); x.ellipse(0.32, 0.48, 0.08, 0.03, -0.6, 0, TAU); x.fill();
    x.beginPath(); x.ellipse(0.17, 0.54, 0.07, 0.025, 0.6, 0, TAU); x.fill();
    const n = v === 4 ? 4 : 6, pr = v === 4 ? 0.1 : 0.075;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      x.fillStyle = blatt;
      x.beginPath(); x.ellipse(0.25 + Math.cos(a) * 0.09, 0.18 + Math.sin(a) * 0.09, pr, pr * 0.62, a, 0, TAU); x.fill();
    }
    x.fillStyle = 'rgba(0,0,0,.08)';
    x.beginPath(); x.arc(0.25, 0.2, 0.06, 0, TAU); x.fill();
    x.fillStyle = mitte;
    x.beginPath(); x.arc(0.25, 0.18, 0.055, 0, TAU); x.fill();
  }, 150);
}
function spriteGras(v, dunkel) {
  return cached('wsp-gras' + v + (dunkel ? 'd' : ''), 0.7, 0.5, x => {
    x.lineCap = 'round';
    const farben = dunkel ? ['#3d8a2c', '#4a9a36', '#2f7424', '#56a540'] : ['#4f9e3a', '#5cb045', '#3e8a2e', '#6cc052'];
    for (let i = 0; i < 9; i++) {
      const bx = 0.18 + i * 0.042 + Math.sin(i * 7 + v) * 0.02;
      const hgt = 0.25 + ((i * 37 + v * 11) % 10) / 40;
      const lean = Math.sin(i * 3.1 + v * 1.7) * 0.12;
      x.strokeStyle = farben[(i + v) % farben.length]; x.lineWidth = 0.035;
      x.beginPath(); x.moveTo(bx, 0.5); x.quadraticCurveTo(bx + lean * 0.3, 0.5 - hgt * 0.6, bx + lean, 0.5 - hgt); x.stroke();
    }
  }, 120);
}
function spriteStein(v) {
  return cached('wsp-stein' + v, 0.7, 0.36, x => {
    const g = x.createLinearGradient(0, 0.05, 0, 0.36);
    g.addColorStop(0, v ? '#d6d0c4' : '#c9c2b4'); g.addColorStop(1, '#8e8778');
    x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.ellipse(0.35, 0.33, 0.3, 0.04, 0, 0, TAU); x.fill();
    x.fillStyle = g; x.beginPath(); x.ellipse(0.35, 0.22, 0.27, 0.13, 0, Math.PI, 0); x.lineTo(0.62, 0.33); x.lineTo(0.08, 0.33); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(0.27, 0.15, 0.08, 0.03, -0.2, 0, TAU); x.fill();
    x.fillStyle = '#6fae4f'; x.beginPath(); x.ellipse(0.5, 0.31, 0.08, 0.03, 0, 0, TAU); x.fill();
  }, 120);
}
function spritePilz() {
  return cached('wsp-pilz', 0.5, 0.5, x => {
    x.fillStyle = '#fff4e2'; x.beginPath(); x.roundRect(0.2, 0.22, 0.1, 0.28, 0.04); x.fill();
    const g = x.createRadialGradient(0.2, 0.12, 0.02, 0.25, 0.22, 0.24);
    g.addColorStop(0, '#ff7a6a'); g.addColorStop(1, '#d42c2c');
    x.fillStyle = g; x.beginPath(); x.ellipse(0.25, 0.25, 0.22, 0.17, 0, Math.PI, 0); x.closePath(); x.fill();
    x.fillStyle = '#fff';
    for (const [a, b, r] of [[0.16, 0.16, 0.03], [0.28, 0.11, 0.035], [0.35, 0.19, 0.025], [0.22, 0.21, 0.02]]) { x.beginPath(); x.arc(a, b, r, 0, TAU); x.fill(); }
  }, 150);
}
function spriteBusch(v) {
  return cached('wsp-busch' + v, 2, 1.2, x => {
    x.fillStyle = 'rgba(0,0,0,.15)'; x.beginPath(); x.ellipse(1, 1.15, 0.85, 0.08, 0, 0, TAU); x.fill();
    const blobs = [[0.55, 0.8, 0.38], [1.0, 0.62, 0.48], [1.45, 0.82, 0.36], [0.8, 0.9, 0.32], [1.25, 0.95, 0.3]];
    for (const [bx, by, r] of blobs) {
      const g = x.createRadialGradient(bx - r * 0.3, by - r * 0.4, r * 0.1, bx, by, r);
      g.addColorStop(0, v ? '#8fd46a' : '#7cc95e'); g.addColorStop(1, v ? '#3f8f35' : '#367f2e');
      x.fillStyle = g; x.beginPath(); x.arc(bx, by, r, 0, TAU); x.fill();
    }
    if (v) for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? '#ff6b6b' : '#ffffff'; x.beginPath(); x.arc(0.5 + i * 0.18, 0.55 + Math.sin(i * 2) * 0.2, 0.045, 0, TAU); x.fill(); }
  }, 70);
}
function spriteBaum(v) {
  return cached('wsp-baum' + v, 5, 7, x => {
    x.fillStyle = 'rgba(0,0,0,.16)'; x.beginPath(); x.ellipse(2.5, 6.9, 1.8, 0.16, 0, 0, TAU); x.fill();
    const st = x.createLinearGradient(2.2, 0, 2.8, 0);
    st.addColorStop(0, '#7a5232'); st.addColorStop(1, '#5a3a20');
    x.fillStyle = st;
    x.beginPath(); x.moveTo(2.2, 6.95); x.lineTo(2.35, 3.5); x.lineTo(2.65, 3.5); x.lineTo(2.8, 6.95); x.closePath(); x.fill();
    const kronen = v === 1
      ? [[2.5, 1.6, 1.3], [1.6, 2.6, 1.1], [3.4, 2.6, 1.1], [2.5, 3.2, 1.2]]
      : v === 2
        ? [[2.5, 0.9, 0.8], [2.5, 2.0, 1.15], [2.5, 3.3, 1.45]]
        : [[2.5, 1.8, 1.5], [1.4, 2.9, 1.1], [3.6, 2.9, 1.1], [2.1, 3.6, 1.0], [3.0, 3.5, 1.0]];
    const hell = v === 2 ? '#7fcf7a' : '#9ad86a', dunkel = v === 2 ? '#2e7a43' : '#3d8a32';
    for (const [bx, by, r] of kronen) {
      const g = x.createRadialGradient(bx - r * 0.35, by - r * 0.45, r * 0.1, bx, by, r * 1.05);
      g.addColorStop(0, hell); g.addColorStop(1, dunkel);
      x.fillStyle = g; x.beginPath(); x.arc(bx, by, r, 0, TAU); x.fill();
    }
    if (v === 0) for (let i = 0; i < 7; i++) { x.fillStyle = '#ff5a5a'; x.beginPath(); x.arc(1.4 + (i * 0.47) % 2.4, 1.4 + ((i * 1.3) % 2.2), 0.13, 0, TAU); x.fill(); }
  }, 36);
}
function spriteHuegel() {
  const W = HUEGEL_R * 2 + 1, H = HUEGEL_H + 0.6;
  return cached('wsp-huegel', W, H, x => {
    const cx = W / 2, by = HUEGEL_H + 0.3;
    x.fillStyle = 'rgba(40,60,20,.25)'; x.beginPath(); x.ellipse(cx, by, HUEGEL_R + 0.3, 0.25, 0, 0, TAU); x.fill();
    const kuppel = () => {
      x.beginPath(); x.moveTo(cx - HUEGEL_R, by);
      x.bezierCurveTo(cx - HUEGEL_R * 0.7, by - HUEGEL_H * 0.75, cx - HUEGEL_R * 0.4, by - HUEGEL_H, cx, by - HUEGEL_H);
      x.bezierCurveTo(cx + HUEGEL_R * 0.4, by - HUEGEL_H, cx + HUEGEL_R * 0.7, by - HUEGEL_H * 0.75, cx + HUEGEL_R, by);
      x.closePath();
    };
    const g = x.createRadialGradient(cx - 1.2, by - HUEGEL_H * 0.9, 0.2, cx, by - 0.6, HUEGEL_R * 1.1);
    g.addColorStop(0, '#d39a5c'); g.addColorStop(0.55, '#a8703f'); g.addColorStop(1, '#6d4424');
    x.fillStyle = g; kuppel(); x.fill();
    x.save(); kuppel(); x.clip();
    let sd = 7;
    const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    x.lineCap = 'round';
    for (let i = 0; i < 520; i++) {
      const px = cx + (r() * 2 - 1) * HUEGEL_R, py = by - r() * HUEGEL_H;
      const a = r() * Math.PI, l = 0.12 + r() * 0.18;
      x.strokeStyle = ['#5a3519', '#c48a50', '#7d5129', '#e0b070', '#4a2c14'][(r() * 5) | 0];
      x.globalAlpha = 0.55; x.lineWidth = 0.03;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l * 0.5); x.stroke();
    }
    x.globalAlpha = 1;
    x.restore();
    for (const [ex, ey, er] of [[cx - 1.4, by - 0.55, 0.32], [cx + 1.8, by - 0.35, 0.24], [cx + 0.2, by - 1.6, 0.2]]) {
      x.fillStyle = 'rgba(255,220,160,.35)'; x.beginPath(); x.ellipse(ex, ey - 0.03, er * 1.25, er * 0.85, 0, 0, TAU); x.fill();
      x.fillStyle = '#2a170a'; x.beginPath(); x.ellipse(ex, ey, er, er * 0.65, 0, 0, TAU); x.fill();
    }
    x.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const px = cx - HUEGEL_R - 0.2 + (i / 45) * (HUEGEL_R * 2 + 0.4);
      const hh = 0.18 + r() * 0.25;
      x.strokeStyle = ['#4f9e3a', '#6cc052', '#3e8a2e'][i % 3]; x.lineWidth = 0.05;
      x.beginPath(); x.moveTo(px, by + 0.05); x.lineTo(px + (r() - 0.5) * 0.15, by - hh); x.stroke();
    }
    for (let i = 0; i < 9; i++) {
      const px = cx - HUEGEL_R + 0.3 + r() * (HUEGEL_R * 2 - 0.6);
      x.fillStyle = ['#fff', '#ffd93c', '#ff8fb8', '#9b8cff'][i % 4];
      for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; x.beginPath(); x.arc(px + Math.cos(a) * 0.07, by - 0.12 + Math.sin(a) * 0.07, 0.055, 0, TAU); x.fill(); }
      x.fillStyle = '#ffb020'; x.beginPath(); x.arc(px, by - 0.12, 0.045, 0, TAU); x.fill();
    }
  }, 64);
}
function wolkenSprite(v) {
  return cached('wsp-wolke' + v, 320, 140, x => {
    let sd = 11 + v * 31;
    const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const blobs = [];
    const n = 6 + v * 2;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const bx = 50 + t * 220 + (r() - 0.5) * 20;
      const rad = 26 + Math.sin(t * Math.PI) * 30 + r() * 12;
      blobs.push([bx, 112 - rad * 0.75, rad]);
    }
    x.fillStyle = 'rgba(160,190,225,.55)';
    for (const [bx, by, rad] of blobs) { x.beginPath(); x.arc(bx, by + 8, rad, 0, TAU); x.fill(); }
    for (const [bx, by, rad] of blobs) {
      const g = x.createRadialGradient(bx - rad * 0.3, by - rad * 0.5, rad * 0.1, bx, by, rad);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#eef4ff');
      x.fillStyle = g; x.beginPath(); x.arc(bx, by, rad, 0, TAU); x.fill();
    }
    x.fillStyle = 'rgba(255,255,255,.9)';
    x.beginPath(); x.roundRect(40, 96, 240, 22, 11); x.fill();
  }, 1);
}

// ---------- Power-up-Blüte ----------
function spritePowerup(typ) {
  const d = PU[typ];
  const K = 72;
  return cached('wsp-pu-' + typ, 2, 2, x => {
    const n = 8;
    for (let lage = 0; lage < 2; lage++) {
      for (let i = 0; i < n; i++) {
        const a = (i + lage * 0.5) / n * TAU;
        const c = d.blatt.length > 2 ? d.blatt[i % d.blatt.length] : d.blatt[lage];
        const g = x.createRadialGradient(1 + Math.cos(a) * 0.3, 1 + Math.sin(a) * 0.3, 0.02, 1 + Math.cos(a) * 0.55, 1 + Math.sin(a) * 0.55, 0.42);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, c); g.addColorStop(1, c);
        x.fillStyle = g;
        const L = lage ? 0.36 : 0.44;
        x.beginPath(); x.ellipse(1 + Math.cos(a) * L * 1.25, 1 + Math.sin(a) * L * 1.25, L, L * 0.5, a, 0, TAU); x.fill();
        x.strokeStyle = 'rgba(120,40,40,.18)'; x.lineWidth = 0.02; x.stroke();
      }
    }
    const g = x.createRadialGradient(0.9, 0.88, 0.05, 1, 1, 0.42);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#fff1cf');
    x.fillStyle = g; x.beginPath(); x.arc(1, 1, 0.4, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(200,140,40,.6)'; x.lineWidth = 0.04; x.stroke();
    x.save(); x.scale(1 / K, 1 / K);
    x.font = `${Math.round(0.5 * K)}px ${EMOJI}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(d.icon, K, K * 1.04);
    x.restore();
  }, K);
}

// ---------- Schüsse ----------
const TROPFEN_F = [
  ['#fffbe0', '#ffd23c', '#e88a00'],   // Nektar
  ['#fff0f6', '#ff8fbf', '#d9407a'],   // Helfer
  ['#fffdf0', '#ffd23c', '#f08c00'],   // Riesen
];
function spriteTropfen(v) {
  return cached('wsp-tropfen' + v, 1.2, 0.7, x => {
    const [a, b, c] = TROPFEN_F[v];
    x.beginPath();
    x.moveTo(1.15, 0.35);
    x.bezierCurveTo(0.85, 0.12, 0.55, 0.06, 0.35, 0.08);
    x.arc(0.35, 0.35, 0.27, -Math.PI / 2, Math.PI / 2, true);
    x.bezierCurveTo(0.55, 0.64, 0.85, 0.58, 1.15, 0.35);
    const g = x.createRadialGradient(0.3, 0.26, 0.02, 0.4, 0.35, 0.45);
    g.addColorStop(0, a); g.addColorStop(0.45, b); g.addColorStop(1, c);
    x.fillStyle = g; x.fill();
    x.strokeStyle = 'rgba(140,70,0,.35)'; x.lineWidth = 0.03; x.stroke();
    x.fillStyle = 'rgba(255,255,255,.85)';
    x.beginPath(); x.ellipse(0.3, 0.22, 0.09, 0.05, -0.3, 0, TAU); x.fill();
  }, 64);
}
function spritePollen() {
  return cached('wsp-pollen', 1, 1, x => {
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * TAU;
      x.fillStyle = '#f2b000';
      x.beginPath(); x.arc(0.5 + Math.cos(a) * 0.36, 0.5 + Math.sin(a) * 0.36, 0.06, 0, TAU); x.fill();
    }
    const g = x.createRadialGradient(0.4, 0.38, 0.03, 0.5, 0.5, 0.38);
    g.addColorStop(0, '#fffbd0'); g.addColorStop(0.5, '#ffe14d'); g.addColorStop(1, '#f0a800');
    x.fillStyle = g; x.beginPath(); x.arc(0.5, 0.5, 0.36, 0, TAU); x.fill();
    x.fillStyle = 'rgba(190,120,0,.45)';
    for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(0.5 + Math.cos(i * 2.4) * 0.2 * (i % 3) / 2, 0.5 + Math.sin(i * 2.4) * 0.2 * (i % 3) / 2, 0.035, 0, TAU); x.fill(); }
  }, 48);
}

// ---------- Wespen-Sprite (schaut nach rechts; Ursprung bei 0.72/0.66) ----------
const W_W = 1.5, W_H = 1.25, W_OX = 0.72, W_OY = 0.66;
function malWespe(x, d, satt) {
  x.translate(W_OX, W_OY);
  x.lineCap = 'round'; x.lineJoin = 'round';
  // Beine
  x.strokeStyle = d.streifen; x.lineWidth = 0.028;
  for (let i = 0; i < 3; i++) {
    const bx = 0.0 + i * 0.07;
    x.beginPath(); x.moveTo(bx, 0.04); x.lineTo(bx - 0.03, 0.15); x.lineTo(bx - 0.08 + i * 0.025, satt ? 0.24 : 0.21); x.stroke();
  }
  // Hinterleib
  x.save(); x.translate(-0.27, 0.07); x.rotate(satt ? 0.5 : 0.36);
  const ell = () => { x.beginPath(); x.ellipse(0, 0, 0.31, 0.205, 0, 0, TAU); };
  let g = x.createRadialGradient(-0.05, -0.09, 0.02, 0, 0, 0.34);
  g.addColorStop(0, d.koerper[0]); g.addColorStop(0.55, d.koerper[1]); g.addColorStop(1, d.koerper[2]);
  x.fillStyle = g; ell(); x.fill();
  x.save(); ell(); x.clip();
  x.fillStyle = d.streifen;
  for (const sx of [-0.2, -0.07, 0.06]) { x.beginPath(); x.ellipse(sx, 0, 0.042, 0.26, 0.12, 0, TAU); x.fill(); }
  x.beginPath(); x.ellipse(-0.33, 0, 0.08, 0.1, 0, 0, TAU); x.fill();
  x.fillStyle = 'rgba(255,255,255,.38)'; x.beginPath(); x.ellipse(-0.02, -0.12, 0.15, 0.045, -0.08, 0, TAU); x.fill();
  x.restore();
  x.strokeStyle = 'rgba(60,30,0,.4)'; x.lineWidth = 0.016; ell(); x.stroke();
  if (satt) {
    // klebriger Nektar
    const hg = x.createRadialGradient(-0.02, -0.16, 0.01, 0, -0.12, 0.2);
    hg.addColorStop(0, 'rgba(255,250,210,.95)'); hg.addColorStop(1, 'rgba(255,170,20,.9)');
    x.fillStyle = hg;
    x.beginPath();
    x.moveTo(-0.22, -0.13); x.quadraticCurveTo(-0.05, -0.27, 0.14, -0.14);
    x.quadraticCurveTo(0.12, -0.06, 0.06, -0.09); x.quadraticCurveTo(0.04, 0.02, 0.0, -0.08);
    x.quadraticCurveTo(-0.08, -0.04, -0.12, -0.1); x.quadraticCurveTo(-0.17, -0.06, -0.22, -0.13); x.fill();
    x.beginPath(); x.ellipse(0.02, 0.0, 0.025, 0.04, 0, 0, TAU); x.fill();
    x.fillStyle = 'rgba(255,255,255,.8)'; x.beginPath(); x.ellipse(-0.06, -0.19, 0.04, 0.015, -0.2, 0, TAU); x.fill();
  }
  x.restore();
  // Taille
  x.fillStyle = d.streifen; x.beginPath(); x.ellipse(-0.03, 0.0, 0.05, 0.04, 0, 0, TAU); x.fill();
  // Brust
  g = x.createRadialGradient(0.04, -0.07, 0.01, 0.07, -0.03, 0.15);
  g.addColorStop(0, '#6a5440'); g.addColorStop(1, d.brust);
  x.fillStyle = g; x.beginPath(); x.ellipse(0.07, -0.03, 0.13, 0.11, -0.1, 0, TAU); x.fill();
  x.fillStyle = d.koerper[1]; x.beginPath(); x.ellipse(0.09, -0.11, 0.05, 0.022, -0.1, 0, TAU); x.fill();
  if (d.pelz) {
    x.strokeStyle = 'rgba(255,220,160,.55)'; x.lineWidth = 0.018;
    for (let i = 0; i < 12; i++) { const a = -2.8 + i * 0.32; x.beginPath(); x.moveTo(0.07 + Math.cos(a) * 0.12, -0.03 + Math.sin(a) * 0.1); x.lineTo(0.07 + Math.cos(a) * 0.16, -0.03 + Math.sin(a) * 0.14); x.stroke(); }
  }
  // Schal (Kreisel-Wespe)
  if (d.schal) {
    x.fillStyle = '#e83a4a';
    x.beginPath(); x.ellipse(0.17, -0.02, 0.05, 0.1, 0.2, 0, TAU); x.fill();
    x.beginPath(); x.moveTo(0.15, 0.0); x.quadraticCurveTo(0.02, 0.1, -0.12, 0.08); x.lineTo(-0.1, 0.14); x.quadraticCurveTo(0.04, 0.16, 0.18, 0.04); x.closePath(); x.fill();
    x.strokeStyle = '#fff'; x.lineWidth = 0.02;
    for (const t of [-0.03, 0.03]) { x.beginPath(); x.moveTo(0.13, -0.05 + t * 2); x.lineTo(0.21, -0.03 + t * 2); x.stroke(); }
    x.beginPath(); x.moveTo(-0.02, 0.1); x.lineTo(0.0, 0.15); x.moveTo(-0.07, 0.1); x.lineTo(-0.05, 0.15); x.stroke();
  }
  // Kopf
  const kx = 0.3, ky = -0.07, kr = d.pelz ? 0.15 : 0.145;
  g = x.createRadialGradient(kx - 0.05, ky - 0.06, 0.01, kx, ky, kr * 1.1);
  g.addColorStop(0, d.kopf[0]); g.addColorStop(1, d.kopf[1]);
  x.fillStyle = g; x.beginPath(); x.arc(kx, ky, kr, 0, TAU); x.fill();
  x.strokeStyle = 'rgba(90,50,0,.35)'; x.lineWidth = 0.014; x.stroke();
  if (d.pelz) {
    x.strokeStyle = 'rgba(160,80,20,.45)'; x.lineWidth = 0.016;
    for (let i = 0; i < 9; i++) { const a = -2.6 + i * 0.3; x.beginPath(); x.moveTo(kx + Math.cos(a) * kr, ky + Math.sin(a) * kr); x.lineTo(kx + Math.cos(a) * (kr + 0.03), ky + Math.sin(a) * (kr + 0.03)); x.stroke(); }
  }
  // Fühler
  x.strokeStyle = d.streifen; x.lineWidth = 0.022;
  for (const o of [0, 0.05]) {
    x.beginPath(); x.moveTo(kx + 0.02 - o, ky - kr * 0.85);
    x.quadraticCurveTo(kx + 0.06 - o, ky - kr - 0.16, kx + 0.15 - o, ky - kr - 0.17);
    x.stroke();
    x.beginPath(); x.arc(kx + 0.165 - o, ky - kr - 0.15, 0.022, 0, TAU); x.fillStyle = d.streifen; x.fill();
  }
  // Gesicht
  const ex = kx + 0.055, ey = ky - 0.025;
  if (!satt) {
    x.fillStyle = '#fff'; x.beginPath(); x.ellipse(ex, ey, 0.058, 0.07, 0, 0, TAU); x.fill();
    x.fillStyle = '#20140c'; x.beginPath(); x.ellipse(ex + 0.016, ey + 0.012, 0.036, 0.045, 0, 0, TAU); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(ex + 0.026, ey - 0.006, 0.013, 0, TAU); x.fill();
    // grimmige (aber lustige) Augenbraue
    x.strokeStyle = '#2e2016'; x.lineWidth = d.pelz ? 0.04 : 0.032;
    x.beginPath(); x.moveTo(ex - 0.06, ey - 0.1); x.lineTo(ex + 0.065, ey - 0.06); x.stroke();
    // Schmollmund
    x.lineWidth = 0.018;
    x.beginPath(); x.moveTo(kx + 0.07, ky + 0.085); x.quadraticCurveTo(kx + 0.1, ky + 0.06, kx + 0.13, ky + 0.08); x.stroke();
  } else {
    x.strokeStyle = '#2e2016'; x.lineWidth = 0.022;
    x.beginPath(); x.arc(ex + 0.01, ey + 0.01, 0.035, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
    x.fillStyle = 'rgba(255,110,130,.6)'; x.beginPath(); x.ellipse(ex + 0.02, ey + 0.065, 0.035, 0.022, 0, 0, TAU); x.fill();
    x.lineWidth = 0.02;
    x.beginPath(); x.arc(kx + 0.095, ky + 0.045, 0.04, 0.2, Math.PI - 0.5); x.stroke();
  }
  // Extras
  if (d.brille) {
    x.strokeStyle = '#5a3a20'; x.lineWidth = 0.022;
    x.beginPath(); x.arc(kx, ky, kr * 0.98, -2.3, -0.75); x.stroke();
    x.fillStyle = '#7a5a3a'; x.beginPath(); x.arc(kx + 0.07, ky - 0.12, 0.05, 0, TAU); x.fill();
    const lg = x.createRadialGradient(kx + 0.055, ky - 0.135, 0.005, kx + 0.07, ky - 0.12, 0.04);
    lg.addColorStop(0, '#e8fbff'); lg.addColorStop(1, '#5fc4ff');
    x.fillStyle = lg; x.beginPath(); x.arc(kx + 0.07, ky - 0.12, 0.036, 0, TAU); x.fill();
  }
  if (d.muetze) {
    x.fillStyle = '#4fa3ff';
    x.beginPath(); x.arc(kx - 0.01, ky - 0.06, kr * 0.95, Math.PI * 1.08, Math.PI * 1.92); x.closePath(); x.fill();
    x.fillStyle = '#2f7fd8'; x.beginPath(); x.ellipse(kx + 0.11, ky - 0.075, 0.08, 0.022, 0.15, 0, TAU); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(kx - 0.01, ky - 0.2, 0.025, 0, TAU); x.fill();
  }
  if (d.krone) {
    x.save(); x.translate(kx - 0.03, ky - kr - 0.005); x.rotate(-0.15);
    const cg = x.createLinearGradient(0, -0.13, 0, 0.01);
    cg.addColorStop(0, '#fff6b0'); cg.addColorStop(1, '#e0a400');
    x.fillStyle = cg; x.strokeStyle = '#a06c00'; x.lineWidth = 0.012;
    x.beginPath(); x.moveTo(-0.09, 0.01); x.lineTo(-0.1, -0.09); x.lineTo(-0.05, -0.04); x.lineTo(0, -0.12);
    x.lineTo(0.05, -0.04); x.lineTo(0.1, -0.09); x.lineTo(0.09, 0.01); x.closePath(); x.fill(); x.stroke();
    for (const [gx, c] of [[-0.05, '#ff4f7a'], [0, '#4fc3ff'], [0.05, '#8ef08a']]) { x.fillStyle = c; x.beginPath(); x.arc(gx, -0.02, 0.016, 0, TAU); x.fill(); }
    x.restore();
    // Wimpern & Perlenkette
    x.strokeStyle = '#2e2016'; x.lineWidth = 0.012;
    for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(ex + 0.03 + i * 0.012, ey - 0.06 + i * 0.012); x.lineTo(ex + 0.06 + i * 0.016, ey - 0.085 + i * 0.016); x.stroke(); }
    x.fillStyle = '#fffaf0';
    for (let i = 0; i < 7; i++) { const a = 1.2 + i * 0.3; x.beginPath(); x.arc(kx - 0.02 + Math.cos(a) * 0.13, ky + 0.02 + Math.sin(a) * 0.1, 0.017, 0, TAU); x.fill(); }
  }
}
function spriteWespe(typ, satt) {
  const k = typ === 'boss' ? 230 : typ === 'brummer' ? 130 : 96;
  return cached(`wsp-w-${typ}-${satt ? 1 : 0}`, W_W, W_H, x => malWespe(x, WT[typ], satt), k);
}
function spriteWespeWeiss(typ) {
  const k = typ === 'boss' ? 230 : typ === 'brummer' ? 130 : 96;
  return cached(`wsp-w-${typ}-weiss`, W_W, W_H, x => {
    x.drawImage(spriteWespe(typ, false), 0, 0, W_W, W_H);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#fff'; x.fillRect(0, 0, W_W, W_H);
  }, k);
}

// ---------- Helfer ----------
function spriteHelfer(art) {
  return cached('wsp-helfer-' + art, 1.2, 1, x => {
    x.translate(0.6, 0.55);
    if (art === 'hummel') {
      const g = x.createRadialGradient(-0.08, -0.1, 0.02, 0, 0, 0.36);
      g.addColorStop(0, '#fff3a8'); g.addColorStop(0.6, '#ffc72c'); g.addColorStop(1, '#d99000');
      x.fillStyle = g; x.beginPath(); x.ellipse(-0.05, 0.02, 0.34, 0.28, 0, 0, TAU); x.fill();
      x.save(); x.beginPath(); x.ellipse(-0.05, 0.02, 0.34, 0.28, 0, 0, TAU); x.clip();
      x.fillStyle = '#2e2016';
      for (const sx of [-0.2, 0.0]) { x.beginPath(); x.ellipse(sx, 0.02, 0.06, 0.32, 0, 0, TAU); x.fill(); }
      x.fillStyle = '#fff8e8'; x.beginPath(); x.ellipse(-0.36, 0.02, 0.08, 0.2, 0, 0, TAU); x.fill();
      x.restore();
      x.strokeStyle = 'rgba(90,50,0,.35)'; x.lineWidth = 0.02; x.beginPath(); x.ellipse(-0.05, 0.02, 0.34, 0.28, 0, 0, TAU); x.stroke();
      x.fillStyle = '#3a2a1c'; x.beginPath(); x.arc(0.27, -0.02, 0.15, 0, TAU); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.ellipse(0.32, -0.05, 0.045, 0.055, 0, 0, TAU); x.fill();
      x.fillStyle = '#111'; x.beginPath(); x.arc(0.335, -0.045, 0.028, 0, TAU); x.fill();
      x.strokeStyle = '#fff'; x.lineWidth = 0.02; x.beginPath(); x.arc(0.32, 0.03, 0.04, 0.3, Math.PI - 0.3); x.stroke();
      x.fillStyle = 'rgba(255,120,150,.7)'; x.beginPath(); x.ellipse(0.24, 0.04, 0.03, 0.02, 0, 0, TAU); x.fill();
      x.strokeStyle = '#3a2a1c'; x.lineWidth = 0.022;
      x.beginPath(); x.moveTo(0.3, -0.15); x.quadraticCurveTo(0.34, -0.3, 0.42, -0.3); x.stroke();
    } else {
      const g = x.createRadialGradient(-0.1, -0.12, 0.02, 0, 0, 0.36);
      g.addColorStop(0, '#ff9a8a'); g.addColorStop(0.6, '#ee2b2b'); g.addColorStop(1, '#a30d0d');
      x.fillStyle = g; x.beginPath(); x.ellipse(-0.05, 0.02, 0.33, 0.27, 0, Math.PI, 0); x.lineTo(0.28, 0.06); x.quadraticCurveTo(-0.05, 0.16, -0.38, 0.06); x.closePath(); x.fill();
      x.strokeStyle = '#3a0a0a'; x.lineWidth = 0.018; x.beginPath(); x.moveTo(-0.05, -0.25); x.lineTo(-0.05, 0.1); x.stroke();
      x.fillStyle = '#1c1010';
      for (const [px, py, r] of [[-0.2, -0.1, 0.055], [0.1, -0.12, 0.05], [-0.25, 0.02, 0.04], [0.15, 0.0, 0.045], [-0.05, -0.18, 0.035]]) { x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); }
      x.fillStyle = '#1c1010'; x.beginPath(); x.arc(0.3, 0.0, 0.13, 0, TAU); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.ellipse(0.34, -0.03, 0.045, 0.05, 0, 0, TAU); x.fill();
      x.fillStyle = '#111'; x.beginPath(); x.arc(0.355, -0.025, 0.025, 0, TAU); x.fill();
      x.strokeStyle = '#fff'; x.lineWidth = 0.02; x.beginPath(); x.arc(0.34, 0.04, 0.035, 0.3, Math.PI - 0.3); x.stroke();
    }
  }, 90);
}

// ================================================================
//  Die Königin von der Seite (schaut nach rechts, Ursprung an der Brust)
// ================================================================
function fluegelForm(ctx, L, breite, alpha) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  const g = ctx.createLinearGradient(0, 0, L, 0);
  g.addColorStop(0, 'rgba(255,255,255,.85)');
  g.addColorStop(0.45, 'rgba(225,240,255,.6)');
  g.addColorStop(0.8, 'rgba(255,225,245,.5)');
  g.addColorStop(1, 'rgba(210,255,235,.4)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(L * 0.25, -breite * 1.15, L * 0.85, -breite * 1.05, L, -breite * 0.15);
  ctx.bezierCurveTo(L * 1.03, breite * 0.4, L * 0.7, breite * 0.85, L * 0.35, breite * 0.6);
  ctx.quadraticCurveTo(L * 0.12, breite * 0.4, 0, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,150,190,.75)';
  ctx.lineWidth = 0.008;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(110,80,50,.38)';
  ctx.lineWidth = 0.006;
  ctx.beginPath();
  ctx.moveTo(0.01, -0.005); ctx.quadraticCurveTo(L * 0.45, -breite * 0.75, L * 0.9, -breite * 0.35);
  ctx.moveTo(0.02, 0.005); ctx.quadraticCurveTo(L * 0.4, -breite * 0.05, L * 0.75, breite * 0.25);
  ctx.moveTo(L * 0.3, -breite * 0.5); ctx.lineTo(L * 0.42, breite * 0.25);
  ctx.stroke();
  ctx.fillStyle = 'rgba(120,70,30,.5)';
  ctx.beginPath(); ctx.ellipse(L * 0.55, -breite * 0.68, L * 0.06, breite * 0.12, 0.1, 0, TAU); ctx.fill();
  ctx.restore();
}

/** s = Pixel pro Körperlänge, o = {tilt, flap, amp, t, landen} */
function drawKoeniginSeite(ctx, x, y, s, o) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.tilt);
  ctx.scale(s, s);
  const amp = o.amp, t = o.t;
  const fluegelPaar = vorne => {
    const lagen = amp > 0.3 ? [[-0.6, 0.22], [-0.3, 0.42], [0, 1]] : [[0, 1]];
    for (const [ph, al] of lagen) {
      const sw = Math.sin(o.flap + ph * amp + (vorne ? 0.3 : 0));
      const ang = -2.2 + (vorne ? 0.1 : -0.25) + sw * 0.8 * amp - (1 - amp) * 0.8;
      ctx.save(); ctx.translate(vorne ? 0.03 : -0.02, -0.1); ctx.rotate(ang);
      const br = (vorne ? 0.12 : 0.09) * (0.7 + 0.3 * Math.abs(Math.cos(o.flap + ph)));
      fluegelForm(ctx, vorne ? 0.6 : 0.45, br, al * (vorne ? 0.92 : 0.8));
      ctx.restore();
    }
  };
  fluegelPaar(false);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // Beine
  ctx.strokeStyle = '#3d2117'; ctx.lineWidth = 0.024;
  for (let i = 0; i < 3; i++) {
    const bau = Math.sin(t * 3 + i * 1.7) * 0.015 * (o.landen ? 0 : 1);
    const ax = -0.04 + i * 0.065, ay = 0.05;
    const kx = ax + (o.landen ? -0.02 : -0.05), ky = 0.13 + bau;
    const fx = ax + (o.landen ? -0.05 + i * 0.03 : -0.12 + i * 0.02), fy = (o.landen ? 0.24 : 0.2 + i * 0.012) + bau * 2;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
  }
  // Hinterleib
  ctx.save(); ctx.translate(-0.36, 0.06); ctx.rotate(0.3);
  const hg = ctx.createRadialGradient(-0.06, -0.08, 0.01, 0, 0, 0.3);
  hg.addColorStop(0, '#9a6040'); hg.addColorStop(0.45, '#4a2a1a'); hg.addColorStop(1, '#1f100a');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.ellipse(0, 0, 0.28, 0.19, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,180,.18)'; ctx.lineWidth = 0.014;
  for (const k of [-0.12, -0.02, 0.08]) { ctx.beginPath(); ctx.ellipse(k, 0, 0.035, 0.17 * Math.sqrt(1 - (k / 0.28) ** 2), 0, -1.3, 1.3); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ctx.beginPath(); ctx.ellipse(0.0, -0.1, 0.12, 0.04, -0.1, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,120,.45)'; ctx.lineWidth = 0.012;
  ctx.beginPath(); ctx.ellipse(0, 0, 0.27, 0.18, 0, -2.6, -1.0); ctx.stroke();
  ctx.restore();
  // Stielchen
  ctx.fillStyle = '#6a2c14'; ctx.beginPath(); ctx.ellipse(-0.12, 0.02, 0.05, 0.04, 0, 0, TAU); ctx.fill();
  // Brust
  const bg = ctx.createRadialGradient(-0.02, -0.08, 0.01, 0.02, -0.02, 0.16);
  bg.addColorStop(0, '#e08a52'); bg.addColorStop(0.5, '#a8461f'); bg.addColorStop(1, '#5e2410');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0.02, -0.02, 0.15, 0.105, -0.12, 0, TAU); ctx.fill();
  // Kopf
  const kx = 0.25, ky = -0.08;
  const kg = ctx.createRadialGradient(kx - 0.04, ky - 0.05, 0.01, kx, ky, 0.13);
  kg.addColorStop(0, '#d4774a'); kg.addColorStop(0.5, '#8a3a1e'); kg.addColorStop(1, '#4e1f0f');
  // Fühler
  ctx.strokeStyle = '#6b2c15'; ctx.lineWidth = 0.02;
  for (const off of [0, 0.045]) {
    const w = Math.sin(t * 4 + off * 30) * 0.015;
    const ex = kx + 0.07 - off, ey = ky - 0.27 + w;
    ctx.beginPath(); ctx.moveTo(kx + 0.02 - off * 0.5, ky - 0.09); ctx.lineTo(ex, ey); ctx.lineTo(ex + 0.15, ey + 0.02 - w); ctx.stroke();
    ctx.fillStyle = '#6b2c15'; ctx.beginPath(); ctx.arc(ex + 0.15, ey + 0.02 - w, 0.018, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = kg; ctx.beginPath(); ctx.ellipse(kx, ky, 0.115, 0.105, 0, 0, TAU); ctx.fill();
  // Mundwerkzeuge
  ctx.strokeStyle = '#4e1f0f'; ctx.lineWidth = 0.02;
  ctx.beginPath(); ctx.moveTo(kx + 0.09, ky + 0.05); ctx.quadraticCurveTo(kx + 0.15, ky + 0.07, kx + 0.12, ky + 0.1); ctx.stroke();
  // Auge (groß & freundlich)
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(kx + 0.045, ky - 0.02, 0.045, 0.052, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#1a0d08'; ctx.beginPath(); ctx.ellipse(kx + 0.058, ky - 0.012, 0.027, 0.034, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(kx + 0.066, ky - 0.026, 0.011, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,130,150,.45)'; ctx.beginPath(); ctx.ellipse(kx + 0.03, ky + 0.05, 0.03, 0.018, 0, 0, TAU); ctx.fill();
  // Krone
  ctx.save();
  ctx.translate(kx - 0.03, ky - 0.095); ctx.rotate(-0.12);
  const cg = ctx.createLinearGradient(0, -0.08, 0, 0.01);
  cg.addColorStop(0, '#fff3a6'); cg.addColorStop(1, '#e0a400');
  ctx.fillStyle = cg; ctx.strokeStyle = '#a06c00'; ctx.lineWidth = 0.008;
  ctx.beginPath();
  ctx.moveTo(-0.06, 0.01); ctx.lineTo(-0.065, -0.05); ctx.lineTo(-0.032, -0.025); ctx.lineTo(0, -0.07);
  ctx.lineTo(0.032, -0.025); ctx.lineTo(0.065, -0.05); ctx.lineTo(0.06, 0.01); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff4f7a'; ctx.beginPath(); ctx.arc(0, -0.018, 0.012, 0, TAU); ctx.fill();
  ctx.restore();
  fluegelPaar(true);
  ctx.restore();
}

function herzPfad(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 1.1, y - s * 0.35, x - s * 0.45, y - s * 1.05, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s * 1.1, y - s * 0.35, x, y + s * 0.35);
  ctx.closePath();
}

// ================================================================
//  Hauptfunktion
// ================================================================
export function openWespenalarm(game, opts = {}) {
  const opt = {
    dauer: clamp(opts.dauer ?? 60, 15, 180),
    wespen: clamp(opts.wespen ?? 1.1, 0.3, 3),
    powerups: clamp(opts.powerups ?? 1.3, 0.3, 4),
    mut: clamp(opts.mut ?? 1.2, 0.05, 2),
    wind: !!opts.wind,
    name: opts.name ?? 'Sonnige Lichtung',
    koloniename: opts.koloniename,
    uebung: !!opts.uebung,
  };
  opt.boss = opts.boss ?? opt.dauer >= 70;
  opt.bossBei = clamp(opts.bossBei ?? 0.8, 0.05, 0.92);
  const MUT_MAX = Math.max(100, Math.round(80 * opt.mut));
  const MUT_START = clamp(Math.round(80 * opt.mut), 1, MUT_MAX);
  const rm = reduziert();

  return new Promise(resolve => {
    let fertig = false;
    let S = null;
    const ergebnis = () => ({ erfolg: !!S?.erfolg, wespen: S?.befriedet ?? 0, treffer: S?.treffer ?? 0, powerups: S?.powerups ?? 0, punkte: S?.punkte ?? 0 });
    const finish = () => { if (fertig) return; fertig = true; resolve(ergebnis()); };

    // ---------- DOM ----------
    const canvas = h('canvas.wsp-canvas');
    const ctx = canvas.getContext('2d');
    const el = {};
    const hud = h('div.wsp-hud',
      h('div.wsp-oben',
        h('div.wsp-links',
          el.mut = h('div.wsp-panel.wsp-mut',
            h('span.wsp-ic', '💛'),
            h('div.wsp-mut-txt', h('small', 'Mut'), h('div.wsp-track', el.mutFill = h('i')))),
          el.waffen = h('div.wsp-waffen')),
        h('div.wsp-mitte',
          el.zaehler = h('div.wsp-panel.wsp-zaehler', h('span.wsp-zaehler-em', '🐝'),
            h('div', el.zahl = h('b', '0'), h('small', 'Wespen friedlich verscheucht'))),
          el.boss = h('div.wsp-panel.wsp-boss', h('span.wsp-boss-name', '👑 Königin Brummhilde'), h('div.wsp-boss-track', el.bossFill = h('i')))),
        h('div.wsp-rechts',
          el.pauseBtn = h('button.wsp-pause', { 'aria-label': 'Pause', title: 'Pause (P)', onclick: () => pausieren(true) }, '⏸'),
          el.combo = h('div.wsp-panel.wsp-combo', '🔥 ', el.comboTxt = h('b', '')),
          el.wind = h('div.wsp-panel.wsp-wind', '🍃 ', el.windTxt = h('b', '')))),
      el.tipp = h('div.wsp-tipp'),
      el.bombe = h('button.wsp-bombe', { 'aria-label': 'Honigbombe', onclick: e => { e.stopPropagation(); honigbombe(); } },
        h('span.wsp-bombe-em', '🍯'),
        h('span.wsp-bombe-txt', h('b', 'Honigbombe'), el.bombeInfo = h('small', '')),
        h('span.wsp-bombe-meter', el.bombeFill = h('i')),
        h('span.mg-kbd', 'Leertaste')),
      h('div.wsp-weg',
        h('span.wsp-weg-em', { title: 'Dein Nest' }, '🏠'),
        h('div.wsp-weg-track', el.wegFill = h('i'), el.wegAnt = h('span.wsp-weg-ant', '👑')),
        h('span.wsp-weg-em', '🏁'),
        h('span.wsp-weg-name', opt.name)),
    );
    const banner = h('div.wsp-banner');
    const ebene = h('div.wsp-ebene');
    const buehne = h('div.wsp-buehne', canvas, hud, banner, ebene);

    const m = openModal({
      titel: opt.uebung ? 'Übungsflug: Wespenalarm' : 'Wespenalarm!',
      unter: `Die junge Königin fliegt nach ${opt.name}`, icon: '🐝', klasse: 'wespen-modal',
      farbe: ['#ffb703', '#fb8500'], inhalt: buehne, onClose: () => aufraeumen(),
    });
    game?.pause?.(true);
    let aufgeraeumt = false;
    function aufraeumen() {
      if (aufgeraeumt) return;
      aufgeraeumt = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVis);
      ro?.disconnect();
      if (window.__wespen === debug) delete window.__wespen;
      game?.pause?.(false);
      finish();
    }

    // ---------- Größe ----------
    let W = 800, H = 500, dpr = 1, U = 5, VW = 160, VH = 100, GY = 89;
    function resize() {
      const r = buehne.getBoundingClientRect();
      W = Math.max(200, r.width); H = Math.max(200, r.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      U = Math.min(H / 100, W / (W < H ? 82 : 95));
      VW = W / U; VH = H / U; GY = VH - 11;
      if (S) { S.q.x = clamp(S.q.x, 5, VW - 10); S.q.y = clamp(S.q.y, 7, GY - 5); }
    }
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resize()) : null;
    ro?.observe(buehne);
    resize();
    const yMin = () => 14, yMax = () => GY - 6;
    const randY = (rand_ = 0) => rand(16 + rand_, GY - 12 - rand_);

    // ---------- Szene ----------
    const wolken = Array.from({ length: 6 }, (_, i) => ({ x: Math.random(), y: rand(0.06, 0.5), sc: rand(0.4, 0.8), v: i % 3, speed: rand(4, 10), par: rand(0.3, 1) }));

    function bauSkript() {
      const T = opt.dauer, ev = [];
      const at = (t, typ, x = {}) => ev.push({ t, typ, ...x });
      at(0.3, 'tipp', { txt: '💧 Der Nektar spritzt ganz von allein – flieg einfach auf die Wespen zu!' });
      at(1.4, 'pu', { pu: 'doppel', y: 0.5 });
      at(5, 'tipp', { txt: '🌼 Flieg durch leuchtende Blüten – dann bekommst du Power-ups!' });
      at(6.5, 'pu', { pu: 'faecher', y: 0.35 });
      at(Math.max(11, T * 0.13), 'tipp', { txt: '💛 Wespen, die dich anrempeln, kosten Mut. Weich ihnen aus!' });
      at(Math.max(13, T * 0.17), 'formation', { art: 'V' });
      if (T >= 40) at(T * 0.27, 'regen');
      at(T * 0.35, 'formation', { art: 'welle' });
      at(T * 0.43, 'pu', { pu: 'schild', y: 0.45 });
      at(T * 0.44, 'tipp', { txt: '🛡️ Schnell, nimm den Honig-Schild – gleich wird es wild!' });
      at(T * 0.47, 'alarm');
      at(T * 0.47 + 1.2, 'formation', { art: 'kreis' });
      at(T * 0.47 + 3.6, 'formation', { art: 'V' });
      at(T * 0.47 + 6, 'formation', { art: 'linie' });
      at(T * 0.62, 'formation', { art: 'kreis' });
      at(T * 0.62 + 1.5, 'wespe', { wtyp: 'brummer' });
      if (T >= 55) at(T * 0.7, 'regen');
      if (opt.boss) at(T * opt.bossBei, 'boss');
      else { at(T * 0.8, 'formation', { art: 'welle' }); at(T * 0.83, 'formation', { art: 'V' }); }
      at(T - 5, 'tipp', { txt: '🏁 Gleich geschafft – das Ziel ist in Sicht!' });
      ev.sort((a, b) => a.t - b.t);
      return ev;
    }

    function neuerFlug(mitIntro) {
      S = {
        phase: mitIntro ? 'intro' : 'countdown', t: 0, pt: 0, dist: 0, scroll: 0, vScroll: 0, pause: false,
        q: { x: VW * 0.26, y: VH * 0.45, tx: VW * 0.26, ty: VH * 0.45, vx: 0, vy: 0, tilt: 0, flap: 0, amp: 1 },
        mut: MUT_START, lvl: { doppel: 0, faecher: 0, pollen: 0, seiten: 0 },
        zeit: { turbo: 0, riesen: 0, zeitlupe: 0, magnet: 0, stern: 0 }, schild: 0, helfer: [],
        schussT: 0, salve: 0, seitenT: 0, pollenT: 0, tonT: 0, sattTonT: 0,
        schuesse: [], wespen: [], blumen: [], teile: [], texte: [], blasen: [], wellen: [],
        befriedet: 0, treffer: 0, powerups: 0, punkte: 0, combo: 0, comboT: -9, besteCombo: 0, autsch: 0, gespawnt: 0,
        unverw: 0, honig: 0, bomben: 0, bombeHinweis: false,
        ev: bauSkript(), evI: 0, spawnT: 2.5, puT: 3.5 / opt.powerups + 8, alarm: 0, regen: 0, boss: null, bossFertig: false,
        wind: { cur: 0, ziel: 0, t: rand(6, 9), ph: 0, dir: 1 },
        deck: [], fid: 0, shake: 0, blitz: 0, erfolg: false, ansage: null, zaehler: 3,
        ruht: false, ruhT: 0, rast: null, arbeiter: [], tippT: 0, a0: null,
      };
      banner.className = 'wsp-banner';
      buehne.classList.remove('wsp-steuern', 'wsp-alarm-an');
      hudStand = {};
      el.wegAnt.textContent = '👑';
      tippZeigen('');
      if (mitIntro) zeigeIntro(); else starteCountdown();
    }

    // ---------- Eingabe ----------
    const zeiger = { x: 0, y: 0, aktiv: false, typ: 'mouse' };
    const tasten = new Set();
    function zeigerSetzen(e) {
      const r = canvas.getBoundingClientRect();
      zeiger.typ = e.pointerType || 'mouse';
      zeiger.x = e.clientX - r.left + (zeiger.typ === 'touch' ? Math.min(30, W * 0.03) : 0);
      zeiger.y = e.clientY - r.top - (zeiger.typ === 'touch' ? Math.min(80, H * 0.11) : 0);
      zeiger.aktiv = true;
    }
    canvas.addEventListener('pointermove', zeigerSetzen);
    canvas.addEventListener('pointerdown', e => {
      zeigerSetzen(e);
      try { canvas.setPointerCapture(e.pointerId); } catch { /* egal */ }
    });
    const STEUER = { arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0], arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1] };
    function onKeyDown(e) {
      if (topModal() !== m || e.target instanceof HTMLInputElement) return;
      const k = e.key.toLowerCase();
      if (STEUER[k]) { tasten.add(k); zeiger.aktiv = false; e.preventDefault(); return; }
      if (k === ' ' || k === 'enter' || k === 'p') {
        e.preventDefault();
        if (e.repeat) return;
        if (S.pause) { pausieren(false); return; }
        if (k === 'p') { pausieren(true); return; }
        if (S.phase === 'intro') starteCountdown();
        else if (S.phase === 'flug' && k === ' ') honigbombe();
        else if (S.phase === 'ergebnis') (ebene.querySelector('.btn.gruen'))?.click();
      }
    }
    function onKeyUp(e) { tasten.delete(e.key.toLowerCase()); }
    function onBlur() { tasten.clear(); pausieren(true); }
    function onVis() { if (document.hidden) pausieren(true); }
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVis);
    m._key = e => { const k = e.key.toLowerCase(); return !!STEUER[k] || k === ' ' || k === 'enter' || k === 'p'; };

    // ---------- Overlays ----------
    function karte(...kids) {
      const k = h('div.wsp-karte', ...kids);
      ebene.replaceChildren(k);
      ebene.classList.add('an');
      return k;
    }
    function ebeneWeg() { ebene.classList.remove('an'); ebene.replaceChildren(); }

    function zeigeIntro() {
      const tipps = [
        ['🖱️', 'Bewege die Maus oder deinen Finger – die Königin fliegt hinterher.'],
        ['⌨️', 'Oder steuere mit den Pfeiltasten bzw. W A S D.'],
        ['💧', 'Nektar spritzt von allein. Getroffene Wespen werden satt und fliegen friedlich weg.'],
        ['🌼', 'Leuchtende Blüten schenken dir Power-ups – sammle so viele du kannst!'],
        ['🍯', 'Viele satte Wespen füllen die Honigbombe (Leertaste oder Knopf).'],
      ];
      if (opt.wind) tipps.push(['🍃', 'Achtung, Wind! Böen schieben die Königin nach oben oder unten.']);
      const weit = opt.dauer >= 70 ? 'weit' : opt.dauer >= 55 ? 'mittel' : 'nah';
      const viele = opt.wespen >= 1.6 ? 'sehr viele' : opt.wespen >= 1.2 ? 'viele' : 'einige';
      karte(
        h('div.wsp-karte-em', '🐝'),
        h('h3', opt.uebung ? 'Übungsflug: Wespenalarm!' : `Wespenalarm auf dem Weg nach ${opt.name}!`),
        h('p', opt.koloniename
          ? `Eine junge Königin aus „${opt.koloniename}“ fliegt los. Freche Wespen wollen sie ärgern – aber mit Nektar macht sie alle satt und friedlich!`
          : 'Die junge Königin fliegt los. Freche Wespen wollen sie ärgern – aber mit Nektar macht sie alle satt und friedlich!'),
        h('div.wsp-chips', h('span', `🗺️ Strecke: ${weit}`), h('span', `🐝 ${viele} Wespen`), h('span', '🌼 jede Menge Power-ups'),
          opt.wind ? h('span', '🍃 windig') : h('span', '☀️ windstill'), opt.boss ? h('span.boss', '👑 Wespen-Königin!') : null),
        h('ul.wsp-tipps', tipps.map(([i, t]) => h(i === '⌨️' ? 'li.wsp-nur-tasten' : 'li', h('span', i), h('span', t)))),
        h('div.wsp-pu-titel', 'Diese Power-up-Blüten kannst du finden:'),
        h('div.wsp-pu-liste', PU_LISTE.map(k => h('span', { style: { '--c': PU[k].blatt[1] } }, h('i', PU[k].icon), PU[k].name))),
        h('button.btn.gruen.gross', { onclick: () => starteCountdown() }, 'Los geht\'s!', h('span.mg-kbd', 'Leertaste')),
      );
    }
    function starteCountdown() {
      if (S.phase !== 'intro' && S.phase !== 'countdown') return;
      ebeneWeg();
      S.phase = 'countdown'; S.pt = 0; S.zaehler = 3;
      buehne.classList.add('wsp-steuern');
      if (!zeiger.aktiv) { zeiger.x = S.q.x * U; zeiger.y = S.q.y * U; }
      ton('tick');
    }
    function pausieren(an) {
      if (!S || aufgeraeumt || an === S.pause) return;
      if (an && S.phase !== 'flug' && S.phase !== 'countdown') return;
      S.pause = an;
      tasten.clear();
      if (an) {
        buehne.classList.remove('wsp-steuern');
        karte(
          h('div.wsp-karte-em', '⏸️'),
          h('h3', 'Pause'),
          h('p', 'Die Königin wartet in der Luft auf dich. Die Wespen auch – ganz brav.'),
          h('div.wsp-knoepfe',
            h('button.btn.grau', { onclick: () => m.close('abbruch') }, 'Aufhören'),
            h('button.btn.gruen.gross', { onclick: () => pausieren(false) }, '▶ Weiter fliegen', h('span.mg-kbd', 'Leertaste'))),
        );
      } else {
        ebeneWeg();
        buehne.classList.add('wsp-steuern');
        last = performance.now();
      }
    }

    function sterneBerechnen() {
      let s = 1;
      if (S.autsch <= 3) s++;
      if (S.befriedet >= Math.max(1, S.gespawnt) * 0.6) s++;
      return s;
    }
    function zeigeErgebnis() {
      S.phase = 'ergebnis';
      buehne.classList.remove('wsp-steuern', 'wsp-alarm-an');
      banner.className = 'wsp-banner';
      tippZeigen('');
      if (S.erfolg) {
        const sterne = sterneBerechnen();
        karte(
          h('div.wsp-karte-em.huepf', '🎉'),
          h('h3', opt.uebung ? 'Übungsflug geschafft!' : 'Geschafft!'),
          h('p.gross', opt.uebung ? `Super geübt! Die Königin ist sicher in ${opt.name} gelandet.` : `Eine neue Kolonie entsteht in ${opt.name}!`),
          h('div.wsp-sterne', [1, 2, 3].map(i => h('span' + (i <= sterne ? '.an' : ''), { style: { animationDelay: 0.15 + i * 0.18 + 's' } }, '⭐'))),
          h('div.wsp-stats',
            h('div', h('b', `🐝 ${S.befriedet}`), h('small', 'Wespen friedlich verscheucht')),
            h('div', h('b', `🌼 ${S.powerups}`), h('small', 'Power-ups')),
            h('div', h('b', `🔥 ${S.besteCombo}`), h('small', 'beste Combo')),
            h('div', h('b', `${S.punkte}`), h('small', 'Punkte'))),
          S.autsch === 0 ? h('p.wsp-rat', '🏅 Kein einziger Rempler – meisterhaft geflogen!') : null,
          h('div.wsp-knoepfe', h('button.btn.gruen.gross', { onclick: () => m.close('fertig') }, 'Weiter', h('span.mg-kbd', 'Enter'))),
        );
      } else {
        const tipp = S.powerups < 4
          ? 'Tipp: Flieg durch möglichst viele leuchtende Blüten – mit Power-ups haben die Wespen keine Chance!'
          : S.honig + S.bomben * HONIG_MAX > 6 || S.bomben > 0
            ? 'Tipp: Wenn es eng wird, drück die Honigbombe 🍯 – dann werden alle Wespen auf einmal satt!'
            : 'Tipp: Bleib eher links und weiche nach oben oder unten aus. Mut-Blumen 💛 machen dich wieder stark!';
        karte(
          h('div.wsp-karte-em', '🌼'),
          h('h3', 'Puh, kurz ausruhen!'),
          h('p.gross', `Die Königin macht eine Pause auf einer Blume. Du hast schon ${S.befriedet} Wespen friedlich verscheucht – versuch es gleich nochmal!`),
          h('p.wsp-rat', tipp),
          h('div.wsp-knoepfe',
            h('button.btn.grau', { onclick: () => m.close('spaeter') }, 'Später'),
            h('button.btn.gruen.gross', { onclick: () => { ton('click'); neuerFlug(false); } }, '🔄 Nochmal fliegen', h('span.mg-kbd', 'Enter'))),
        );
      }
    }

    // ---------- Hinweise & Effekte ----------
    function tippZeigen(txt, dauer = 4.5) {
      if (txt) { el.tipp.textContent = txt; el.tipp.classList.add('an'); S && (S.tippT = dauer); }
      else el.tipp.classList.remove('an');
    }
    let bannerTimer = 0;
    function bannerZeigen(txt, unter, farbe, dauer = 1.7, gross = false) {
      // große Ansagen (Alarm, Boss …) nicht sofort von einem Power-up überschreiben
      if (!gross && S.grossBis > S.t) return;
      if (gross) S.grossBis = S.t + dauer * 0.8;
      banner.replaceChildren(h('b', txt), unter ? h('small', unter) : null);
      banner.style.setProperty('--bc', farbe ?? '#ffd166');
      banner.className = 'wsp-banner';
      void banner.offsetWidth;
      banner.className = 'wsp-banner an' + (gross ? ' gross' : '');
      clearTimeout(bannerTimer);
      bannerTimer = setTimeout(() => { if (!aufgeraeumt && S.phase !== 'gelandet' && !S.ruht) banner.className = 'wsp-banner'; }, dauer * 1000);
    }
    function ansage(txt, farbe, max = 1.8) { S.ansage = { txt, farbe, t: 0, max }; }
    function text(txt, x, y, farbe = '#fff', gross = 1, max = 1.2) { S.texte.push({ txt, x, y, t: 0, farbe, gross, max }); }
    function teil(p) { if (S.teile.length < 900) S.teile.push(p); }
    function funken(x, y, rad, n, farben, sp = 1) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rand(-0.15, 0.15);
        const v = rand(25, 70) * sp;
        teil({ k: i % 3 === 0 ? 'stern' : 'funke', x: x + Math.cos(a) * rad, y: y + Math.sin(a) * rad, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 0, max: rand(0.5, 0.9), g: rand(0.5, 1.1), rot: rand(0, TAU), c: pick(farben) });
      }
    }
    function klecks(x, y, n, c = ['#ffd23c', '#ffb020', '#fff2a0']) {
      for (let i = 0; i < n; i++) {
        const a = rand(0, TAU), v = rand(10, 35);
        teil({ k: 'klecks', x, y, vx: Math.cos(a) * v + 8, vy: Math.sin(a) * v - 8, l: 0, max: rand(0.35, 0.6), g: rand(0.45, 0.9), c: pick(c) });
      }
    }
    function flash(e, kl) { e.classList.remove(kl); void e.offsetWidth; e.classList.add(kl); }

    // ---------- Wespen ----------
    function neueWespe(typ, x, y, extra = {}) {
      const d = WT[typ];
      const w = {
        typ, x, y, y0: y, px: x, py: y, vxm: -20, vym: 0, hp: d.hp, max: d.hp, zustand: 'an', t: 0, st: 0,
        flap: rand(0, TAU), blick: -1, neig: 0, blitz: 0, alpha: 1, abprall: 0, sk: 1,
        v: rand(17, 23) + 6 * (S.dist / opt.dauer), amp: rand(4, 9), om: rand(2, 3.3), ph: rand(0, TAU),
        ...extra,
      };
      if (typ === 'brummer') { w.hp = w.max = Math.round(d.hp * (0.8 + 0.25 * opt.wespen)); }
      if (typ === 'sturz') { w.modus = 'rein'; w.hdx = rand(6, 16); w.y0 = S.q.y > GY * 0.5 ? rand(15, 20) : rand(GY - 13, GY - 9); w.y = w.y0; }
      if (typ === 'flitzer') w.frech = Math.random() < 0.3 + 0.35 * clamp(S.dist / opt.dauer, 0, 1) * Math.min(1.3, opt.wespen);
      if (typ === 'kreisel') { w.cx = x; w.cy = y; w.ang = rand(0, TAU); }
      S.wespen.push(w);
      if (typ !== 'boss') S.gespawnt++;
      return w;
    }
    function formation(art, n) {
      n = n ?? Math.round(5 + 1.4 * opt.wespen);
      const f = { id: ++S.fid, n, rest: n, verpasst: false, art };
      const ext = FORM_H[art] * (art === 'V' ? n / 7 : 1);
      const ay = rand(10 + ext, Math.max(11 + ext, GY - 10 - ext));
      for (let i = 0; i < n; i++) {
        neueWespe('form', VW + 12, ay, { f, fi: i, ax: VW + 12, ay, flap: i * 0.7 });
        const w = S.wespen[S.wespen.length - 1];
        const [ox, oy] = FORM[art](i, n, 0);
        w.x = w.ax + ox; w.y = ay + oy; w.px = w.x; w.py = w.y;
      }
    }
    function spawnZufall() {
      const p = S.dist / opt.dauer;
      let aktiv = 0;
      for (const w of S.wespen) if (w.zustand === 'an') aktiv++;
      const cap = Math.round(4 + 5 * opt.wespen + (S.alarm > 0 ? 6 : 0));
      if (aktiv >= cap) return;
      const tab = [['flitzer', 5], ['sturz', p > 0.12 ? 2.2 : 0], ['kreisel', p > 0.22 ? 2 : 0], ['brummer', p > 0.34 ? 0.6 + 0.6 * p : 0], ['mini', p > 0.26 ? 0.9 : 0]];
      let sum = 0; for (const [, g] of tab) sum += g;
      let r = Math.random() * sum, typ = 'flitzer';
      for (const [k, g] of tab) { r -= g; if (r <= 0) { typ = k; break; } }
      if (typ === 'mini') formation(pick(['V', 'linie', 'welle']), 3 + Math.round(opt.wespen));
      else neueWespe(typ, VW + (typ === 'brummer' ? 14 : 8), typ === 'brummer' ? randY(6) : randY());
    }

    function wespeUpdate(w, dt, dtw) {
      const d = WT[w.typ];
      w.px = w.x; w.py = w.y;
      w.blitz = Math.max(0, w.blitz - dt * 5);
      if (w.zustand !== 'an') {
        w.st += dt;
        const boss = w.typ === 'boss';
        w.vx = lerp(w.vx ?? 0, boss ? 6 : 12, 1 - Math.exp(-dt * 2));
        w.vy = lerp(w.vy ?? 0, boss ? -7 : -8, 1 - Math.exp(-dt * 2));
        w.x += w.vx * dt;
        w.y += (w.vy + Math.sin(w.st * 4 + w.ph) * 6) * dt;
        w.neig = Math.sin(w.st * 3 + w.ph) * 0.14;
        w.flap += dt * (boss ? 22 : 30);
        if (w.st > 0.35) w.blick = 1;
        const lebens = boss ? 7 : 4.2;
        w.alpha = clamp((lebens - w.st) / 0.8, 0, 1);
        // Herzchen / Zzz
        w.pT = (w.pT ?? 0) - dt;
        if (w.pT <= 0 && w.st < lebens - 0.8) {
          if (w.icon === 'herz') { w.pT = 0.3; teil({ k: 'herz', x: w.x + rand(-2, 2), y: w.y - d.gr * 0.35 * w.sk, vx: rand(-3, 3), vy: -12, l: 0, max: 1.3, g: rand(0.9, 1.5) * (boss ? 2 : 1), c: pick(['#ff5a8a', '#ff8fb8', '#ff4f6e']) }); }
          else if (w.icon === 'zzz') { w.pT = 0.5; teil({ k: 'z', x: w.x + d.gr * 0.25 * w.sk, y: w.y - d.gr * 0.4 * w.sk, vx: 4, vy: -9, l: 0, max: 1.6, g: rand(1.6, 2.4) * (boss ? 2 : 1), c: '#fff' }); }
          else w.pT = 9;
        }
        return w.st > lebens || w.y < -30 || w.x > VW + 40;
      }
      w.t += dtw;
      w.flap += dt * 55;
      w.neig = Math.sin(w.t * 9 + w.ph) * 0.06;
      if (w.abprall > 0) {
        w.abprall -= dt;
        w.x += 28 * dt; w.y += (w.y > S.q.y ? 12 : -12) * dt;
        return w.x > VW + 30;
      }
      switch (w.typ) {
        case 'flitzer': {
          w.x -= w.v * dtw;
          // freche Flitz-Wespen schwenken kurz vor der Königin auf ihre Höhe ein
          const nah = w.x - S.q.x;
          if (w.frech && nah > 0 && nah < 48) {
            const ziel = S.q.y + (w.seite ??= w.y0 < S.q.y ? -1 : 1) * Math.max(0, nah - 5) * 0.55;
            w.y0 = lerp(w.y0, ziel, 1 - Math.exp(-dtw * 3.5));
            w.amp = lerp(w.amp, 1.5, 1 - Math.exp(-dtw * 2));
          }
          w.y = w.y0 + Math.sin(w.t * w.om + w.ph) * w.amp;
          break;
        }
        case 'sturz':
          if (w.modus === 'rein') {
            // fliegt oben bzw. unten heran, bis sie über/unter der Königin ist
            const hx = S.q.x + w.hdx;
            w.x = Math.max(hx, w.x - 40 * dtw);
            w.y = lerp(w.y, w.y0, 1 - Math.exp(-dtw * 2.5));
            if (w.x - hx < 1.5) { w.modus = 'zielen'; w.mt = 0; ton('summ'); }
          } else if (w.modus === 'zielen') {
            w.mt += dtw;
            w.x = lerp(w.x, S.q.x + w.hdx, 1 - Math.exp(-dtw * 3));
            w.neig = Math.sin(w.t * 40) * 0.12;
            if (w.mt > 1.05) {
              const dx = S.q.x - w.x, dy = S.q.y - w.y, l = Math.hypot(dx, dy) || 1;
              w.dx = dx / l; w.dy = dy / l; w.modus = 'los';
            }
          } else {
            w.x += w.dx * 55 * dtw; w.y += w.dy * 55 * dtw;
            w.neig = clamp(w.dy * 0.6, -0.5, 0.5);
          }
          break;
        case 'kreisel':
          w.cx -= 12 * dtw;
          w.cy = lerp(w.cy, clamp(S.q.y, 18, GY - 18), 1 - Math.exp(-dtw * 0.6));
          w.ang += 2.8 * dtw;
          w.x = w.cx + Math.cos(w.ang) * 9; w.y = w.cy + Math.sin(w.ang) * 8;
          break;
        case 'form': {
          w.ax -= 18 * dtw;
          const [ox, oy] = FORM[w.f.art](w.fi, w.f.n, w.t);
          w.x = w.ax + ox; w.y = w.ay + oy;
          break;
        }
        case 'brummer': {
          const halt = VW * 0.66;
          if (w.t < 7.5) {
            w.x = w.x > halt ? w.x - 11 * dtw : w.x - 2.5 * dtw;
            w.y += clamp(S.q.y - w.y, -1, 1) * 7 * dtw + Math.sin(w.t * 2) * 4 * dtw;
          } else w.x -= 18 * dtw;
          w.y = clamp(w.y, 12, GY - 10);
          break;
        }
        case 'boss': bossUpdate(w, dt, dtw); break;
      }
      if (S.wind.cur && w.typ !== 'boss') w.y += S.wind.cur * 0.5 * dt;
      if (dt > 0) { w.vxm = (w.x - w.px) / dt; w.vym = (w.y - w.py) / dt; }
      const raus = w.x < -18 || w.y < -25 || w.y > VH + 20 || (w.x > VW + 60 && w.typ !== 'boss');
      if (raus && w.f) w.f.verpasst = true;
      return raus && w.typ !== 'boss';
    }

    // ---------- Boss ----------
    function bossStart() {
      const hp = Math.round(105 + 60 * opt.wespen + 90 * clamp(S.dist / opt.dauer, 0, 1));
      const b = neueWespe('boss', VW + 30, VH * 0.42, { hp, max: hp, modus: 'rein', eT: 3, aT: 6.5, drops: [0.8, 0.6, 0.4, 0.2], sk: 1 });
      S.boss = b;
      S.gespawnt++;
      bannerZeigen('👑 Königin Brummhilde kommt!', 'Mach sie mit ganz viel Nektar satt!', '#ffb703', 2.8, true);
      tippZeigen('👑 Brummhilde versperrt den Weg. Mach sie satt – dann geht es weiter!', 6);
      ton('summ'); setTimeout(() => !aufgeraeumt && ton('summ'), 250);
      if (!rm) S.shake = 0.6;
    }
    function bossUpdate(b, dt, dtw) {
      const home = VW - 26;
      switch (b.modus) {
        case 'rein':
          b.x = lerp(b.x, home, 1 - Math.exp(-dtw * 1.6));
          b.y = lerp(b.y, VH * 0.42, 1 - Math.exp(-dtw * 1.6));
          if (Math.abs(b.x - home) < 3) { b.modus = 'schweben'; b.mt = 0; }
          break;
        case 'schweben':
          b.x = lerp(b.x, home + Math.sin(b.t * 1.3) * 5, 1 - Math.exp(-dtw * 2));
          b.y = lerp(b.y, clamp(GY * 0.5 + Math.sin(b.t * 0.75) * GY * 0.3, 16, GY - 14), 1 - Math.exp(-dtw * 1.5));
          b.eT -= dtw;
          if (b.eT <= 0) {
            b.eT = rand(4.5, 6) / Math.sqrt(opt.wespen);
            const n = Math.random() < 0.5 ? 3 : 2;
            for (let i = 0; i < n; i++) {
              const w = neueWespe(i % 2 ? 'flitzer' : 'form', b.x - 6, clamp(b.y + (i - (n - 1) / 2) * 12, 12, GY - 12));
              if (w.typ === 'form') { w.f = { id: ++S.fid, n: 1, rest: 1, verpasst: true, art: 'linie' }; w.fi = 0; w.ax = w.x; w.ay = w.y; }
            }
            text('Los, Mädels!', b.x, b.y - 18, '#ffe9a8', 0.8);
          }
          b.aT -= dtw;
          if (b.aT <= 0) { b.modus = 'zielen'; b.mt = 0; text('Brumm-Ansturm!', b.x - 4, b.y - 18, '#ffd166', 1.05, 1.4); ton('summ'); }
          break;
        case 'zielen':
          b.mt += dtw;
          b.y = lerp(b.y, clamp(S.q.y, 14, GY - 12), 1 - Math.exp(-dtw * 2.2));
          b.x = home + 4 + Math.sin(b.t * 45) * 0.6;
          b.neig = Math.sin(b.t * 30) * 0.08;
          if (b.mt > 1.35) { b.modus = 'ansturm'; ton('whoosh'); }
          break;
        case 'ansturm':
          b.x -= 72 * dtw;
          if (b.x < -32) { b.x = VW + 34; b.y = randY(10); b.modus = 'rein'; b.aT = rand(6, 8); }
          break;
      }
    }
    function bossTreffer(b) {
      const q = b.hp / b.max;
      while (b.drops.length && q <= b.drops[0]) {
        b.drops.shift();
        const bl = spawnBlume(null, { x: b.x - 8, y: b.y, boden: false });
        bl.vx = -18; bl.vy = rand(-10, 10);
        text('Hoppla, eine Blüte!', b.x, b.y - 18, '#ffe9a8', 0.85);
      }
    }

    // ---------- befrieden ----------
    function befriede(w, grund) {
      if (w.zustand !== 'an') return;
      const d = WT[w.typ];
      w.zustand = 'satt'; w.st = 0;
      w.vx = w.typ === 'boss' ? 0 : 0; w.vy = 0;
      w.icon = w.typ === 'boss' || w.typ === 'brummer' ? 'fahne' : pick(['fahne', 'herz', 'zzz', 'herz', 'fahne']);
      S.befriedet++;
      if (S.t - S.comboT < 2.2) S.combo++; else S.combo = 1;
      S.comboT = S.t;
      S.besteCombo = Math.max(S.besteCombo, S.combo);
      const pts = (w.typ === 'boss' ? 300 : w.typ === 'brummer' ? 30 : 10) * Math.min(S.combo, 10);
      S.punkte += pts;
      text(`+${pts}`, w.x, w.y - 3, S.combo >= 3 ? '#ffe066' : '#ffffff', 0.62, 0.9);
      if (S.combo >= 3 && S.combo % 5 === 0) { text(`Combo ×${S.combo}! ${pick(LOB)}`, w.x - 4, w.y - 10, '#ffe066', 1.05); ton('coin'); }
      flash(el.zaehler, 'bump');
      // Honigbombe aufladen
      if (S.bomben < 2) {
        S.honig++;
        if (S.honig >= HONIG_MAX) {
          S.honig = 0; S.bomben++;
          bannerZeigen('🍯 Honigbombe bereit!', 'Leertaste oder Knopf unten rechts', '#ffcf5a', 1.8);
          if (!S.bombeHinweis) { S.bombeHinweis = true; tippZeigen('🍯 Deine Honigbombe ist voll! Drück die Leertaste oder tippe auf den Knopf.', 5); }
          flash(el.bombe, 'bump');
        }
      }
      // Effekte
      klecks(w.x, w.y, w.typ === 'boss' ? 30 : 8);
      funken(w.x, w.y, 1, w.typ === 'boss' ? 40 : 10, ['#ffd93c', '#fff6c0', '#ff9fc2', '#ffffff'], w.typ === 'boss' ? 2 : 1);
      teil({ k: 'ring', x: w.x, y: w.y, vx: 0, vy: 0, l: 0, max: 0.45, g: d.gr * 0.55 * w.sk, c: '255,240,170' });
      if (S.sattTonT <= 0) { ton('satt'); S.sattTonT = 0.09; }
      // Sprechblase
      const nBlasen = S.blasen.length;
      if (w.typ === 'boss') S.blasen.push({ w, txt: 'Na gut, na gut … ihr dürft vorbei!', t: 0, max: 3.6 });
      else if (grund !== 'leise' && (w.typ === 'brummer' || (nBlasen < 2 && Math.random() < 0.45))) S.blasen.push({ w, txt: pick(SATT), t: 0, max: 1.9 });
      // Formation komplett?
      if (w.f) {
        w.f.rest--;
        if (w.f.rest <= 0 && !w.f.verpasst && w.f.n >= 3) {
          S.punkte += 50;
          text('Ganze Formation! +50', w.x - 6, w.y - 10, '#b8ff9a', 1.0, 1.5);
          ton('richtig');
          spawnBlume(null, { x: Math.min(w.x, VW - 6), y: clamp(w.y, 14, GY - 14), boden: false });
        }
      }
      if (w.typ === 'brummer') spawnBlume(null, { x: Math.min(w.x, VW - 6), y: clamp(w.y, 14, GY - 14), boden: false });
      if (w.typ === 'boss') {
        S.bossFertig = true;
        S.punkte += 200;
        for (const o of S.wespen) if (o !== w && o.zustand === 'an') befriede(o, 'leise');
        bannerZeigen('🏳️ Brummhilde ist pappsatt!', 'Sie gibt friedlich auf – weiter geht\'s zum Nest!', '#8ef08a', 3, true);
        ton('richtig'); setTimeout(() => !aufgeraeumt && ton('fanfare'), 350);
        konfetti(24);
        for (let i = 0; i < 5; i++) { const bl = spawnBlume(null, { x: w.x - 10 + i * 3, y: clamp(w.y + (i - 2) * 9, 14, GY - 14), boden: false }); bl.vx = -16 - i * 2; }
        if (!rm) S.shake = 0.5;
      }
    }
    // Wespe fliegt ohne Punkte davon (Landung / Pause)
    function wegfliegen(w) {
      if (w.zustand !== 'an') return;
      w.zustand = 'satt'; w.st = 0; w.vx = 0; w.vy = 0; w.icon = pick(['herz', 'fahne']);
      if (S.blasen.length < 2 && Math.random() < 0.35) S.blasen.push({ w, txt: pick(TSCHUESS), t: 0, max: 1.8 });
    }

    // ---------- Blüten / Power-ups ----------
    function verfuegbar(k) {
      const d = PU[k];
      if (d.art === 'stufe') return S.lvl[k] < d.max;
      if (k === 'schild') return S.schild < 3;
      if (k === 'hummel') return S.helfer.length < 2 || S.helfer.some(hh => hh.t < 10);
      if (k === 'mut') return S.mut < MUT_MAX - 15;
      if (k === 'stern') return S.zeit.stern <= 0;
      return true;
    }
    function naechstesPowerup() {
      if (S.mut < MUT_MAX * 0.4 && Math.random() < 0.5) return 'mut';
      for (let i = 0; i < 30; i++) {
        if (!S.deck.length) S.deck = shuffle([...PU_LISTE, 'doppel', 'faecher', 'pollen', 'turbo']);
        const k = S.deck.pop();
        if (verfuegbar(k)) return k;
      }
      return pick(['turbo', 'riesen', 'zeitlupe', 'magnet', 'bombe']);
    }
    function spawnBlume(typ, o = {}) {
      typ = typ ?? naechstesPowerup();
      const boden = o.boden ?? (S.regen <= 0 && Math.random() < 0.25);
      const b = {
        typ, t: 0, boden, x: o.x ?? VW + 6, y: boden ? GY - 5.5 : (o.y ?? randY(2)), vx: o.vx ?? null, vy: o.vy ?? 0,
        ph: rand(0, TAU), weg: false,
      };
      b.y0 = b.y;
      S.blumen.push(b);
      return b;
    }
    function sammle(typ, silent = false, x = S.q.x, y = S.q.y) {
      const d = PU[typ];
      S.powerups++;
      S.punkte += 5;
      let titel = d.name;
      switch (d.art) {
        case 'stufe':
          S.lvl[typ] = Math.min(d.max, S.lvl[typ] + 1);
          if (S.lvl[typ] > 1) titel += ` Stufe ${S.lvl[typ]}`;
          break;
        case 'zeit': S.zeit[typ] = Math.max(S.zeit[typ], 0) + d.dauer * (S.zeit[typ] > 0 ? 0.6 : 1); break;
        case 'ladung': S.schild = Math.min(3, S.schild + 1); break;
        case 'helfer': {
          if (S.helfer.length < 2) {
            const art = S.helfer.some(hh => hh.art === 'hummel') ? 'kaefer' : 'hummel';
            S.helfer.push({ art, t: d.dauer, x: S.q.x - 10, y: S.q.y, schussT: 0.3, flap: 0, slot: S.helfer.length });
            if (art === 'kaefer') titel = 'Marienkäfer-Freundin';
          } else for (const hh of S.helfer) hh.t = d.dauer;
          break;
        }
        case 'sofort':
          if (typ === 'bombe') welle(S.q.x + 2, S.q.y, '255,140,190');
          else { S.mut = Math.min(MUT_MAX, S.mut + 35); flash(el.mut, 'plus'); text('+💛', S.q.x, S.q.y - 9, '#ffd0d8', 1); }
          break;
      }
      if (silent) return;
      ton('powerup');
      bannerZeigen(`${d.icon} ${titel}!`, d.info, d.blatt[d.blatt.length > 2 ? 1 : 0]);
      funken(x, y, 2, 22, [...d.blatt, '#ffffff', '#fff6c0'], 1.3);
      teil({ k: 'ring', x, y, vx: 0, vy: 0, l: 0, max: 0.55, g: 14, c: d.rgb });
      teil({ k: 'ring', x, y, vx: 0, vy: 0, l: -0.12, max: 0.5, g: 9, c: '255,255,255' });
      S.blitz = Math.max(S.blitz, 0.5);
    }

    // ---------- Waffen ----------
    function mund() { return [S.q.x + Q_LEN * 0.38, S.q.y - Q_LEN * 0.02]; }
    function schuss(x, y, ang, art = 'nektar', sp = 105, haupt = false) {
      const riesen = haupt && S.zeit.riesen > 0;
      S.schuesse.push({
        x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, t: 0, art: riesen ? 'riesen' : art,
        r: riesen ? 1.8 : art === 'helfer' ? 1.1 : 1.3, dmg: riesen ? 2 : 1, pierce: riesen ? 3 : 0, hits: riesen ? new Set() : null,
      });
    }
    function salve() {
      S.salve++;
      const [mx, my] = mund();
      const n = 1 + S.lvl.doppel, gap = S.zeit.riesen > 0 ? 3.6 : 2.2;
      for (let i = 0; i < n; i++) schuss(mx - Math.abs(i - (n - 1) / 2) * 1.2, my + (i - (n - 1) / 2) * gap, 0, 'nektar', 105, true);
      if (S.lvl.faecher && S.salve % 2 === 0) {
        for (let k = 1; k <= S.lvl.faecher; k++) { schuss(mx, my, -k * 0.2); schuss(mx, my, k * 0.2); }
      }
      if (S.tonT <= 0) { ton('nektar'); S.tonT = 0.13; }
    }
    function feuern(dt) {
      const rate = 5.2 * (S.zeit.turbo > 0 ? 2 : 1) * (S.zeit.stern > 0 ? 1.3 : 1);
      S.schussT -= dt;
      let n = 0;
      while (S.schussT <= 0 && n++ < 4) { S.schussT += 1 / rate; salve(); }
      if (S.schussT < 0) S.schussT = 0;
      if (S.lvl.seiten) {
        S.seitenT -= dt;
        if (S.seitenT <= 0) {
          S.seitenT = S.zeit.turbo > 0 ? 0.2 : 0.32;
          const x = S.q.x - 1, y = S.q.y;
          schuss(x, y, -Math.PI / 2, 'nektar', 90); schuss(x, y, Math.PI / 2, 'nektar', 90);
          if (S.lvl.seiten >= 2) { schuss(x, y, -Math.PI * 0.25, 'nektar', 95); schuss(x, y, Math.PI * 0.25, 'nektar', 95); schuss(x, y, -Math.PI * 0.8, 'nektar', 85); schuss(x, y, Math.PI * 0.8, 'nektar', 85); }
        }
      }
      if (S.lvl.pollen) {
        S.pollenT -= dt;
        if (S.pollenT <= 0) {
          S.pollenT = 0.95 / S.lvl.pollen;
          const [mx, my] = mund();
          S.schuesse.push({ x: mx - 4, y: my - 3, vx: 30, vy: rand(-40, -10) * (Math.random() < 0.5 ? 1 : -1), t: 0, art: 'pollen', r: 1.6, dmg: 2, pierce: 0, hits: null, ziel: null });
        }
      }
      for (const hh of S.helfer) {
        hh.schussT -= dt;
        if (hh.schussT <= 0 && hh.t > 0.8) {
          hh.schussT = S.zeit.turbo > 0 ? 0.28 : 0.45;
          let best = null, bd = 1e9;
          for (const w of S.wespen) {
            if (w.zustand !== 'an' || w.x < hh.x || w.x > VW + 2) continue;
            const dd = Math.hypot(w.x - hh.x, (w.y - hh.y) * 1.5);
            if (dd < bd) { bd = dd; best = w; }
          }
          const ang = best ? Math.atan2(best.y - hh.y, best.x - hh.x) : 0;
          schuss(hh.x + 3, hh.y, clamp(ang, -1.1, 1.1), 'helfer', 95);
        }
      }
    }
    function welle(x, y, rgb = '255,200,80') {
      S.wellen.push({ x, y, r: 0, v: 120, max: Math.hypot(VW, VH) + 10, hit: new Set(), rgb });
      ton('bombe');
      S.blitz = 1;
      if (!rm) S.shake = Math.max(S.shake, 0.55);
      ansage(rgb === '255,140,190' ? '🌸 Blüten-Bombe!' : '🍯 Honigbombe!', '#ffe066', 1.4);
    }
    function honigbombe() {
      if (!S || S.pause || S.phase !== 'flug' || S.bomben <= 0) return;
      S.bomben--;
      welle(S.q.x + 2, S.q.y, '255,200,80');
      tippZeigen('');
    }

    // ---------- Phasen ----------
    function ereignis(e) {
      switch (e.typ) {
        case 'tipp': tippZeigen(e.txt, 5); break;
        case 'pu': spawnBlume(e.pu, { y: clamp(GY * e.y, 14, GY - 14), boden: false }); break;
        case 'formation': formation(e.art); break;
        case 'wespe': neueWespe(e.wtyp, VW + 14, randY(6)); break;
        case 'regen':
          S.regen = 5.5;
          bannerZeigen('🌸 Blütenregen!', 'Schnell, sammle so viele Blüten wie du kannst!', '#ff9fc2', 2.4, true);
          ton('powerup');
          break;
        case 'alarm':
          S.alarm = 8.5;
          bannerZeigen('🐝 Wespen-Alarm!', 'Jetzt kommen ganz viele – du schaffst das!', '#ff7b3a', 2.6, true);
          buehne.classList.add('wsp-alarm-an');
          ton('summ'); setTimeout(() => !aufgeraeumt && ton('summ'), 300);
          if (!rm) S.shake = 0.5;
          break;
        case 'boss': if (!S.boss) bossStart(); break;
      }
    }
    function starteAnflug() {
      S.phase = 'anflug'; S.pt = 0; S.erfolg = true;
      S.a0 = [S.q.x, S.q.y];
      for (const w of S.wespen) wegfliegen(w);
      S.punkte += 100 + Math.round(Math.max(0, S.mut));
      buehne.classList.remove('wsp-alarm-an');
      tippZeigen('');
      ton('richtig');
    }
    function starteGleiten() {
      S.phase = 'gleiten'; S.pt = 0; S.mut = 0; S.ruht = false; S.ruhT = 0;
      S.regen = 0; S.alarm = 0; S.ansage = null;
      clearTimeout(bannerTimer); banner.className = 'wsp-banner';
      for (const w of S.wespen) wegfliegen(w);
      S.schuesse.length = 0;
      buehne.classList.remove('wsp-alarm-an');
      tippZeigen('');
      el.wegAnt.textContent = '💤';
      ton('sinken');
    }
    const nestX = () => VW * 0.8 + (opt.dauer - S.dist) * SPEED;
    const nestTop = () => GY + 1.5 - HUEGEL_H * NEST_S;

    // ================================================================
    //  Update
    // ================================================================
    function steuern(dt) {
      const q = S.q;
      if (S.phase === 'intro') {
        q.tx = VW * 0.26 + Math.sin(S.t * 0.7) * 3; q.ty = GY * 0.5 + Math.sin(S.t * 1.3) * 4;
      } else if (S.phase === 'countdown' || S.phase === 'flug') {
        if (debug.auto) autopilot();
        else if (tasten.size) {
          let kx = 0, ky = 0;
          for (const k of tasten) { kx += STEUER[k][0]; ky += STEUER[k][1]; }
          q.tx = clamp(q.tx + clamp(kx, -1, 1) * 70 * dt, 5, VW - 12);
          q.ty = clamp(q.ty + clamp(ky, -1, 1) * 62 * dt, yMin(), yMax());
        } else if (zeiger.aktiv) {
          q.tx = clamp(zeiger.x / U, 5, VW - 12);
          q.ty = clamp(zeiger.y / U, yMin(), yMax());
        }
      }
    }

    function update(dt) {
      S.t += dt; S.pt += dt;
      if (S.pause) return;
      steuern(dt);
      const q = S.q;
      const W_ = S.wind;
      switch (S.phase) {
        case 'intro': S.vScroll = SPEED * 0.35; break;
        case 'countdown': {
          S.vScroll = lerp(S.vScroll, SPEED * 0.5, 1 - Math.exp(-dt));
          const n = 3 - Math.floor(S.pt);
          if (n !== S.zaehler && n >= 1) { S.zaehler = n; ton('tick'); }
          if (S.pt >= 3) { S.phase = 'flug'; S.pt = 0; ton('whoosh'); ton('pop'); }
          break;
        }
        case 'flug': {
          S.vScroll = lerp(S.vScroll, SPEED, 1 - Math.exp(-dt * 2));
          const bossAktiv = S.boss && S.boss.zustand === 'an';
          if (!bossAktiv) S.dist = Math.min(opt.dauer, S.dist + dt);
          while (S.evI < S.ev.length && S.ev[S.evI].t <= S.dist) ereignis(S.ev[S.evI++]);
          if (S.alarm > 0) { S.alarm -= dt; if (S.alarm <= 0) buehne.classList.remove('wsp-alarm-an'); }
          if (S.regen > 0) S.regen -= dt;
          // Wespen
          const p = S.dist / opt.dauer;
          if (!bossAktiv && S.dist > 3 && S.dist < opt.dauer - 5) {
            S.spawnT -= dt;
            if (S.spawnT <= 0) {
              spawnZufall();
              S.spawnT = lerp(2.2, 0.95, p) / opt.wespen * (S.alarm > 0 ? 0.33 : 1) * (S.regen > 0 ? 2.4 : 1) * (opt.uebung ? 1.25 : 1);
            }
          }
          // Blüten
          S.puT -= dt;
          if (S.puT <= 0) {
            if (S.regen > 0) {
              S.puT = 0.55;
              const b = spawnBlume(null, { x: rand(VW * 0.35, VW + 4), y: -6, boden: false });
              b.vx = -SPEED * rand(0.25, 0.5); b.vy = rand(13, 19); b.faellt = true;
            } else {
              S.puT = rand(4.2, 6.2) / opt.powerups;
              if (S.dist < opt.dauer - 3) spawnBlume();
            }
          }
          if (S.regen > 0 && Math.random() < dt * 20) teil({ k: 'blatt', x: rand(0, VW), y: -3, vx: rand(-14, -4), vy: rand(8, 16), l: 0, max: 5, g: rand(0, 9), rot: rand(0, TAU), spin: rand(-4, 4), c: pick(['#ffb3d1', '#ff8fb8', '#fff', '#ffd6e6']), gr: rand(0.7, 1.2), sanft: true });
          feuern(dt);
          // Wind
          if (opt.wind) {
            W_.t -= dt;
            if (W_.ph === 0 && W_.t <= 0) {
              W_.ph = 1; W_.t = 0.9;
              W_.dir = q.y < GY * 0.35 ? 1 : q.y > GY * 0.7 ? -1 : (Math.random() < 0.5 ? -1 : 1);
            } else if (W_.ph === 1 && W_.t <= 0) {
              W_.ph = 2; W_.t = rand(1.8, 2.6); W_.ziel = W_.dir * 15;
              if (!rm) S.shake = Math.max(S.shake, 0.35);
              ton('whoosh');
            } else if (W_.ph === 2 && W_.t <= 0) { W_.ph = 0; W_.t = rand(6, 10); W_.ziel = 0; }
            if (W_.ph > 0 && Math.random() < (W_.ph === 2 ? 28 : 9) * dt) {
              const blatt = Math.random() < 0.5;
              teil({ k: blatt ? 'blatt' : 'streif', x: VW + 3, y: rand(0, GY), vx: -rand(90, 150), vy: W_.dir * rand(20, 45), l: 0, max: 2.4, g: blatt ? rand(0, 9) : rand(8, 18), rot: rand(0, TAU), spin: rand(-8, 8), c: pick(['#6cc052', '#9ad86a', '#e8b23a', '#d9822b', '#4f9e3a']), gr: rand(0.9, 1.6) });
            }
          }
          // Treffer an der Königin
          if (S.unverw > 0) S.unverw -= dt;
          for (const w of S.wespen) {
            if (w.zustand !== 'an' || w.abprall > 0) continue;
            const d = WT[w.typ];
            const rr = (w.typ === 'boss' ? d.r * 0.85 : d.r) + Q_R;
            const dx = w.x - (q.x - 1.2), dy = w.y - q.y;
            if (dx * dx + dy * dy > rr * rr) continue;
            if (S.zeit.stern > 0) {
              if (w.typ === 'boss') { if (S.unverw <= 0) { w.hp -= 12; w.blitz = 1; S.unverw = 0.6; bossTreffer(w); if (w.hp <= 0) befriede(w); } }
              else befriede(w, 'stern');
              continue;
            }
            if (S.unverw > 0) continue;
            if (S.schild > 0) {
              S.schild--; S.unverw = 0.8;
              text('Plopp! Schild!', q.x, q.y - 10, '#ffe9a8', 0.9);
              teil({ k: 'ring', x: q.x, y: q.y, vx: 0, vy: 0, l: 0, max: 0.5, g: 16, c: '255,215,110' });
              ton('schild');
              if (w.typ !== 'boss') befriede(w, 'schild'); else { w.hp -= 15; w.blitz = 1; bossTreffer(w); if (w.hp <= 0) befriede(w); }
              continue;
            }
            S.mut -= d.schaden;
            S.autsch++;
            S.unverw = 1.5;
            S.combo = 0;
            if (w.typ !== 'boss') { w.abprall = 0.7; }
            text(pick(AUTSCH), q.x, q.y - 10, '#ffd6c4', 0.95);
            funken(q.x, q.y, 1, 12, ['#ffffff', '#ffe9a8'], 1);
            ton('autsch');
            flash(el.mut, 'minus');
            if (!rm) S.shake = Math.max(S.shake, 0.45);
            if (S.mut <= 0) { starteGleiten(); break; }
          }
          if (S.phase === 'flug' && S.dist >= opt.dauer && !(S.boss && S.boss.zustand === 'an')) starteAnflug();
          break;
        }
        case 'anflug': {
          const T = 2.8, u = clamp(S.pt / T, 0, 1);
          S.vScroll = SPEED * (1 - easeOut(Math.min(1, S.pt / 1.6)));
          S.dist += S.vScroll / SPEED * dt;
          const ue = easeInOut(u);
          const zx = nestX() + 0.5, zy = nestTop() - 2.6;
          q.x = lerp(S.a0[0], zx, ue);
          q.y = lerp(S.a0[1], zy, ue) - Math.sin(u * Math.PI) * 9;
          q.amp = u > 0.75 ? lerp(1, 0.25, (u - 0.75) / 0.25) : 1;
          if (u >= 1) {
            S.phase = 'gelandet'; S.pt = 0;
            ton('fanfare'); konfetti(60);
            funken(q.x, q.y, 2, 40, ['#ffd93c', '#fff6c0', '#ff9fc2', '#8ef08a'], 1.6);
            if (!rm) S.shake = 0.5;
            banner.replaceChildren(h('b', `🎉 Gelandet in ${opt.name}!`));
            banner.style.setProperty('--bc', '#ffd166');
            banner.className = 'wsp-banner an';
            el.wegAnt.textContent = '🎉';
            for (let i = 0; i < 6; i++) S.arbeiter.push({ x: rand(-4, 4), ziel: (i % 2 ? 1 : -1) * rand(9, HUEGEL_R * NEST_S + 3), t: rand(0, 2), dl: i * 0.25 });
          }
          break;
        }
        case 'gelandet':
          S.vScroll = 0;
          q.amp = lerp(q.amp, 0, 1 - Math.exp(-dt * 2));
          q.x = nestX() + 0.5; q.y = nestTop() - 2.6;
          if (S.pt > 2.8) zeigeErgebnis();
          break;
        case 'gleiten': {
          S.vScroll = SPEED * 0.6 * Math.exp(-S.pt * 1.1);
          q.tx = lerp(q.tx, VW * 0.34, 1 - Math.exp(-dt));
          q.amp = lerp(q.amp, S.ruht ? 0 : 0.35, 1 - Math.exp(-dt * 2));
          if (!S.ruht) {
            if (!S.rast && S.pt > 0.3) S.rast = { x: VW * 0.34 + 14 };
            if (S.rast) S.rast.x = lerp(S.rast.x, VW * 0.34, 1 - Math.exp(-dt * 1.2));
            q.ty = GY - 10.5;
            if (S.rast && Math.abs(q.y - q.ty) < 0.8 && S.pt > 1.8) {
              S.ruht = true; S.ruhT = 0;
              banner.replaceChildren(h('b', 'Puh, kurz ausruhen!'), h('small', 'Die Königin macht eine Pause auf einer Blume.'));
              banner.style.setProperty('--bc', '#ffe9a8');
              banner.className = 'wsp-banner an';
            }
          }
          if (S.ruht) {
            S.ruhT += dt;
            if (S.rast) S.rast.x = lerp(S.rast.x, q.x, 1 - Math.exp(-dt * 4));
            if (Math.random() < dt * 1.4) teil({ k: 'z', x: q.x + 3, y: q.y - 6, vx: 3, vy: -7, l: 0, max: 2, g: rand(2, 2.8), c: '#fff' });
            if (S.ruhT > 2.4) zeigeErgebnis();
          }
          break;
        }
        case 'ergebnis': S.vScroll = 0; if (S.erfolg) q.amp = lerp(q.amp, 0, 1 - Math.exp(-dt * 2)); break;
      }
      W_.cur = lerp(W_.cur, W_.ziel, 1 - Math.exp(-dt * 3));
      if (S.phase !== 'flug' && W_.ph) { W_.ph = 0; W_.ziel = 0; }
      S.scroll += S.vScroll * dt;

      // Königin bewegen
      const px = q.x, py = q.y;
      if (S.phase === 'intro' || S.phase === 'countdown' || S.phase === 'flug' || S.phase === 'gleiten') {
        const k = 1 - Math.exp(-dt * (S.phase === 'gleiten' ? 1.6 : 9));
        q.x = clamp(q.x + (q.tx - q.x) * k, 4, VW - 8);
        q.y = clamp(q.y + (q.ty - q.y) * k + W_.cur * dt, S.phase === 'gleiten' ? 5 : yMin() - 2, S.phase === 'gleiten' ? GY : yMax() + 2);
        if (S.phase === 'gleiten' && S.ruht && S.rast) q.x = lerp(q.x, S.rast.x, 1 - Math.exp(-dt * 4));
      }
      if (dt > 0) {
        q.vx = lerp(q.vx, (q.x - px) / dt, 1 - Math.exp(-dt * 10));
        q.vy = lerp(q.vy, (q.y - py) / dt, 1 - Math.exp(-dt * 10));
      }
      const zielTilt = S.phase === 'gleiten' ? (S.ruht ? 0 : 0.18) : S.phase === 'gelandet' || S.phase === 'ergebnis' ? 0 : clamp(q.vy * 0.012 + q.vx * 0.002, -0.38, 0.38);
      q.tilt = lerp(q.tilt, zielTilt, 1 - Math.exp(-dt * 8));
      q.flap += dt * (S.phase === 'gleiten' ? 22 : 48) * (0.4 + 0.6 * q.amp);

      // Zeiten der Power-ups
      if (S.phase === 'flug') for (const k in S.zeit) if (S.zeit[k] > 0) S.zeit[k] = Math.max(0, S.zeit[k] - dt);
      const dtw = dt * (S.zeit.zeitlupe > 0 ? 0.42 : 1);

      // Wespen
      S.wespen = S.wespen.filter(w => !wespeUpdate(w, dt, dtw));
      if (S.boss && !S.wespen.includes(S.boss)) S.boss = S.boss.zustand === 'an' ? S.boss : null;

      // Schüsse
      for (const s of S.schuesse) {
        s.t += dt;
        if (s.art === 'pollen') {
          if (!s.ziel || s.ziel.zustand !== 'an' || !S.wespen.includes(s.ziel)) {
            let bd = 1e9; s.ziel = null;
            for (const w of S.wespen) { if (w.zustand !== 'an') continue; const dd = Math.hypot(w.x - s.x, w.y - s.y); if (dd < bd) { bd = dd; s.ziel = w; } }
          }
          if (s.ziel) {
            const dx = s.ziel.x - s.x, dy = s.ziel.y - s.y, l = Math.hypot(dx, dy) || 1;
            const k = 1 - Math.exp(-dt * 4.5);
            s.vx = lerp(s.vx, dx / l * 75, k); s.vy = lerp(s.vy, dy / l * 75, k);
          } else { s.vx = lerp(s.vx, 70, 1 - Math.exp(-dt * 2)); s.vy *= Math.exp(-dt * 2); }
          if (Math.random() < dt * 25) teil({ k: 'staub', x: s.x, y: s.y, vx: rand(-4, 4), vy: rand(-4, 4), l: 0, max: 0.4, g: rand(0.3, 0.6), c: pick(['#ffe680', '#fff6c0', '#ffc93c']) });
        }
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.x > VW + 6 || s.x < -6 || s.y < -6 || s.y > VH + 4 || s.t > 4) s.weg = true;
        if (s.weg) continue;
        for (const w of S.wespen) {
          if (w.zustand !== 'an') continue;
          const d = WT[w.typ];
          const rr = d.r * (w.sk ?? 1) + s.r;
          const dx = w.x - s.x, dy = w.y - s.y;
          if (dx * dx + dy * dy > rr * rr) continue;
          if (s.hits) { if (s.hits.has(w)) continue; s.hits.add(w); }
          w.hp -= s.dmg; w.blitz = 1;
          S.treffer++;
          klecks(s.x, s.y, s.art === 'riesen' ? 5 : 3, s.art === 'helfer' ? ['#ff8fbf', '#ffd0e4'] : undefined);
          if (w.typ === 'boss') bossTreffer(w);
          if (w.hp <= 0) befriede(w);
          if (s.pierce > 0) s.pierce--; else { s.weg = true; break; }
        }
      }
      S.schuesse = S.schuesse.filter(s => !s.weg);

      // Bomben-Wellen
      for (const wl of S.wellen) {
        wl.r += wl.v * dt;
        for (const w of S.wespen) {
          if (w.zustand !== 'an' || wl.hit.has(w)) continue;
          if (Math.hypot(w.x - wl.x, w.y - wl.y) < wl.r + WT[w.typ].r) {
            wl.hit.add(w);
            if (w.typ === 'boss') { w.hp -= 28; w.blitz = 1; bossTreffer(w); if (w.hp <= 0) befriede(w); }
            else befriede(w, 'bombe');
          }
        }
        if (Math.random() < dt * 40) {
          const a = rand(0, TAU);
          teil({ k: 'blatt', x: wl.x + Math.cos(a) * wl.r, y: wl.y + Math.sin(a) * wl.r, vx: Math.cos(a) * 20, vy: Math.sin(a) * 20, l: 0, max: 1.2, g: rand(0, 9), rot: rand(0, TAU), spin: rand(-6, 6), c: pick(['#ffb3d1', '#ff8fb8', '#ffe066', '#fff']), gr: rand(0.8, 1.3), sanft: true });
        }
      }
      S.wellen = S.wellen.filter(wl => wl.r < wl.max);

      // Blüten
      const magnet = S.zeit.magnet > 0;
      for (const b of S.blumen) {
        b.t += dt;
        if (b.weg) continue;
        if (b.boden) b.x -= S.vScroll * dt;
        else if (b.faellt) { b.x += b.vx * dt; b.y += b.vy * dt; if (b.y > GY - 6) { b.faellt = false; b.boden = true; b.y = GY - 5.5; } }
        else {
          const vx = b.vx ?? -(S.vScroll * 0.55 + 3);
          b.x += vx * dt;
          if (b.vx != null) { b.vx = lerp(b.vx, -(S.vScroll * 0.55 + 3), 1 - Math.exp(-dt)); }
          b.y0 += (b.vy ?? 0) * dt; if (b.vy) b.vy *= Math.exp(-dt * 2);
          b.y0 = clamp(b.y0, 10, GY - 10);
          b.y = b.y0 + Math.sin(b.t * 2 + b.ph) * 2.2;
        }
        const dx = S.q.x - b.x, dy = S.q.y - b.y, dd = Math.hypot(dx, dy);
        if (magnet && dd < 45 && S.phase === 'flug') {
          const k = (1 - dd / 45) * 90 * dt + 20 * dt;
          b.x += dx / (dd || 1) * k; b.y += dy / (dd || 1) * k; b.y0 = b.y; b.boden = false; b.faellt = false; b.vx = null;
        }
        if (S.phase === 'flug' && dd < PICK_R + (magnet ? 1.5 : 0)) { b.weg = true; sammle(b.typ, false, b.x, b.y); }
        if (b.x < -10) b.weg = true;
      }
      S.blumen = S.blumen.filter(b => !b.weg);

      // Helfer
      for (const hh of S.helfer) {
        hh.t -= S.phase === 'flug' ? dt : 0;
        hh.flap += dt * 50;
        if (hh.t > 0 && S.phase !== 'gleiten') {
          const ox = -7 - hh.slot * 2, oy = hh.slot ? 11 : -12;
          const k = 1 - Math.exp(-dt * 4);
          hh.x = lerp(hh.x, S.q.x + ox, k); hh.y = lerp(hh.y, clamp(S.q.y + oy + Math.sin(S.t * 3 + hh.slot) * 1.5, 6, GY - 4), k);
        } else {
          hh.x -= 6 * dt; hh.y -= 20 * dt;
          if (!hh.tschuess) { hh.tschuess = true; text('Tschüss!', hh.x, hh.y - 5, '#fff', 0.8); }
        }
      }
      S.helfer = S.helfer.filter(hh => hh.y > -15);

      // Effekte
      S.shake = Math.max(0, S.shake - dt * 1.6);
      S.blitz = Math.max(0, S.blitz - dt * 2.5);
      S.tonT -= dt; S.sattTonT -= dt;
      if (S.tippT > 0) { S.tippT -= dt; if (S.tippT <= 0) tippZeigen(''); }
      if (S.ansage) { S.ansage.t += dt; if (S.ansage.t > S.ansage.max) S.ansage = null; }
      if (S.zeit.stern > 0 && Math.random() < dt * 40) teil({ k: 'stern', x: S.q.x + rand(-6, 4), y: S.q.y + rand(-4, 4), vx: rand(-30, -10), vy: rand(-8, 8), l: 0, max: 0.6, g: rand(0.4, 0.8), rot: rand(0, TAU), c: pick(['#ff8a8a', '#ffd166', '#8ef08a', '#7cc8ff', '#c49bff']) });
      for (const p of S.teile) {
        p.l += dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.k === 'funke' || p.k === 'stern') { p.vx *= Math.exp(-dt * 3); p.vy = p.vy * Math.exp(-dt * 3) + 10 * dt; }
        else if (p.k === 'klecks') p.vy += 50 * dt;
        else if (p.k === 'blatt') { p.rot += p.spin * dt; if (!p.sanft) p.vy += Math.sin(S.t * 4 + p.g) * 20 * dt; else p.vx += Math.sin(S.t * 2 + p.g) * 6 * dt; }
      }
      S.teile = S.teile.filter(p => p.l < p.max && p.x > -20 && p.x < VW + 20 && p.y < VH + 10);
      for (const t of S.texte) t.t += dt;
      S.texte = S.texte.filter(t => t.t < t.max);
      for (const b of S.blasen) b.t += dt;
      S.blasen = S.blasen.filter(b => b.t < b.max && S.wespen.includes(b.w));
      for (const a of S.arbeiter) { a.t += dt; if (a.t > a.dl) a.x = lerp(a.x, a.ziel, 1 - Math.exp(-dt * 1.2)); }
    }

    // ---------- Autopilot (nur für Tests / Vorführung) ----------
    function autopilot() {
      const q = S.q;
      let blume = null, bd = 1e9;
      for (const b of S.blumen) {
        if (b.weg) continue;
        const dx = b.x - q.x;
        if (dx > -6 && dx < 80 && b.y > 6 && dx < bd) { bd = dx; blume = b; }
      }
      let bestY = q.y, best = -1e9;
      for (let y = yMin(); y <= yMax(); y += 2) {
        let sc = -Math.abs(y - q.y) * 0.04 - Math.abs(y - GY * 0.5) * 0.02;
        if (blume) sc += 14 - Math.abs(y - blume.y) * 0.5;
        for (const w of S.wespen) {
          if (w.zustand !== 'an' || w.abprall > 0) continue;
          const d = WT[w.typ];
          const lim = d.r * (w.typ === 'boss' ? 0.9 : 1) + Q_R + 4.5;
          for (const la of [0, 0.25, 0.5, 0.8]) {
            const px = w.x + w.vxm * la, py = w.y + w.vym * la;
            const dx = px - (q.x - 1.2), dy = py - y;
            const dd = Math.hypot(dx * 0.7, dy);
            if (dd < lim) sc -= (lim - dd) * (14 - la * 8);
          }
          if (w.typ === 'boss' && (w.modus === 'zielen' || w.modus === 'ansturm') && Math.abs(w.y - y) < d.r + 7) sc -= 60;
          if (w.typ === 'sturz' && w.modus === 'los') {
            for (let la = 0; la < 1; la += 0.1) { const px = w.x + w.dx * 55 * la, py = w.y + w.dy * 55 * la; if (Math.abs(px - q.x) < 6 && Math.abs(py - y) < 8) sc -= 20; }
          }
          const dx = w.x - q.x;
          if (dx > 14 && dx < 100 && Math.abs(w.y - y) < 2.5) sc += 3;
        }
        if (sc > best) { best = sc; bestY = y; }
      }
      q.ty = bestY;
      const sturz = S.wespen.find(w => w.typ === 'sturz' && w.zustand === 'an' && (w.modus === 'zielen' || w.modus === 'los') && Math.abs(w.x - q.x) < 30);
      if (sturz) { q.tx = clamp(sturz.ausweich ??= (q.x > VW * 0.25 ? q.x - 16 : q.x + 16), 8, VW * 0.6); return; }
      q.tx = blume && bd < 35 && !S.wespen.some(w => w.zustand === 'an' && Math.abs(w.y - blume.y) < 10 && w.x - q.x < 30 && w.x > q.x) ? clamp(blume.x, 10, VW * 0.5) : VW * 0.2;
      if (S.bomben > 0 && S.wespen.filter(w => w.zustand === 'an' && Math.hypot(w.x - q.x, w.y - q.y) < 30).length >= 3) honigbombe();
    }

    // ================================================================
    //  Zeichnen
    // ================================================================
    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sh = S.shake * (rm ? 1.5 : 7);
      ctx.save();
      if (sh > 0.2) ctx.translate(rand(-sh, sh), rand(-sh, sh));
      himmel();
      landschaft();
      boden();
      if (nestX() < VW + 40) nest();
      for (const b of S.blumen) if (b.boden) blumeMalen(b);
      schatten();
      if (S.rast) rastBlume();
      for (const w of S.wespen) if (w.zustand !== 'an') wespeMalen(w);
      for (const b of S.blumen) if (!b.boden) blumeMalen(b);
      for (const wl of S.wellen) welleMalen(wl);
      schuesseMalen();
      for (const w of S.wespen) if (w.zustand === 'an') wespeMalen(w);
      for (const hh of S.helfer) helferMalen(hh);
      koenigin();
      teilchen();
      vordergrund();
      ctx.restore();

      if (S.zeit.zeitlupe > 0) { ctx.fillStyle = `rgba(120,150,255,${0.1 * Math.min(1, S.zeit.zeitlupe)})`; ctx.fillRect(0, 0, W, H); }
      if (S.blitz > 0) { ctx.fillStyle = `rgba(255,250,220,${0.18 * S.blitz})`; ctx.fillRect(0, 0, W, H); }
      blasen();
      texte();
      for (const w of S.wespen) if (w.typ === 'sturz' && w.zustand === 'an' && w.modus === 'zielen') ausruf(w);
      fadenkreuz();
      if (S.ansage) grossText(S.ansage.txt, S.ansage.t / S.ansage.max, S.ansage.farbe, 0.09);
      if (S.phase === 'countdown') { const n = 3 - Math.floor(S.pt); if (n >= 1) grossText(String(n), S.pt % 1, '#ffe066', 0.17); }
      if (S.phase === 'flug' && S.pt < 0.8) grossText('Los!', S.pt / 0.8, '#8ef08a', 0.17);
    }

    function himmel() {
      const gy = GY * U;
      const g = ctx.createLinearGradient(0, 0, 0, gy);
      g.addColorStop(0, '#3d8fe8'); g.addColorStop(0.45, '#7cc0f5'); g.addColorStop(0.85, '#cfeafc'); g.addColorStop(1, '#fff3d6');
      ctx.fillStyle = g;
      ctx.fillRect(-20, -20, W + 40, gy + 22);
      const sx = W * 0.84, sy = H * 0.15;
      drawGlow(ctx, '255,236,170', sx, sy, H * 0.45, 0.55);
      ctx.save();
      ctx.translate(sx, sy); ctx.rotate(S.t * 0.05);
      ctx.fillStyle = 'rgba(255,250,215,.13)';
      for (let i = 0; i < 12; i++) {
        ctx.rotate(TAU / 12);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(H * 0.38, -H * 0.028); ctx.lineTo(H * 0.38, H * 0.028); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      drawGlow(ctx, '255,255,235', sx, sy, H * 0.12, 1);
      ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.arc(sx, sy, H * 0.042, 0, TAU); ctx.fill();
      const breit = W + 600;
      for (const w of wolken) {
        const sp = wolkenSprite(w.v);
        const sc = w.sc * H / 620;
        const x = (((w.x * breit - S.t * w.speed - S.scroll * U * 0.06 * w.par) % breit) + breit) % breit - 300;
        ctx.globalAlpha = 0.85;
        ctx.drawImage(sp, x, H * w.y * 0.75 - 140 * sc * 0.5, 320 * sc, 140 * sc);
      }
      ctx.globalAlpha = 1;
    }
    function kette(par, basis, hoehe, farbe, freq, seed, alpha, baeume) {
      const off = S.scroll * U * par;
      const yAt = x => basis - hoehe * (0.62 + 0.38 * Math.sin((x + off) * freq + seed) + 0.22 * Math.sin((x + off) * freq * 2.7 + seed * 2));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = farbe;
      ctx.beginPath(); ctx.moveTo(-10, basis + 4);
      for (let x = -10; x <= W + 20; x += 10) ctx.lineTo(x, yAt(x));
      ctx.lineTo(W + 20, basis + 4); ctx.closePath(); ctx.fill();
      if (baeume) {
        ctx.fillStyle = baeume;
        const step = Math.max(12, H * 0.028);
        const start = Math.floor((-20 + off) / step) * step - off;
        for (let x = start; x < W + 20; x += step) {
          const n = Math.sin((x + off) * 0.37) * 0.5 + 0.5;
          if (n < 0.45) continue;
          const r = step * (0.35 + n * 0.3);
          ctx.beginPath(); ctx.arc(x, yAt(x) + r * 0.4, r, 0, TAU); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      return yAt;
    }
    function landschaft() {
      const gy = GY * U;
      kette(0.03, gy - H * 0.06, H * 0.17, '#a7c9dc', 0.0035, 7, 0.6);
      kette(0.09, gy - H * 0.02, H * 0.1, '#8fbf86', 0.006, 3, 0.9, '#76ad6c');
      const yAt = kette(0.22, gy + 2, H * 0.06, '#7cbf5e', 0.009, 11, 1);
      // Bäume auf dem nahen Hügel
      const par = 0.22, step = 26;
      const off = S.scroll * par;
      const i0 = Math.floor((off - 20) / step), i1 = Math.ceil((off + VW + 20) / step);
      for (let i = i0; i <= i1; i++) {
        if (hs(i, 4) < 0.45) continue;
        const sx = (i * step + hs(i, 5) * 12 - off) * U;
        const v = (hs(i, 6) * 3) | 0, sc = (0.9 + hs(i, 7) * 0.6) * U * 2.3;
        ctx.drawImage(spriteBaum(v), sx - 2.5 * sc, yAt(sx) - 6.9 * sc + 6, 5 * sc, 7 * sc);
      }
    }
    function boden() {
      const gy = GY * U;
      const g = ctx.createLinearGradient(0, gy - U * 2, 0, H);
      g.addColorStop(0, '#8fd36a'); g.addColorStop(0.5, '#74c252'); g.addColorStop(1, '#5aa83f');
      ctx.fillStyle = g;
      ctx.fillRect(-20, gy - U * 1.5, W + 40, H - gy + U * 1.5 + 20);
      // sanfte Rasenstreifen
      ctx.fillStyle = 'rgba(255,255,255,.07)';
      const sOff = (S.scroll * U) % (U * 24);
      for (let x = -sOff - U * 24; x < W + U * 24; x += U * 24) {
        ctx.beginPath(); ctx.moveTo(x, gy - U * 1.5); ctx.lineTo(x + U * 12, gy - U * 1.5); ctx.lineTo(x + U * 6, H); ctx.lineTo(x - U * 6, H); ctx.closePath(); ctx.fill();
      }
      // Deko-Objekte
      const step = 4.2, off = S.scroll;
      const i0 = Math.floor((off - 12) / step), i1 = Math.ceil((off + VW + 12) / step);
      for (let i = i0; i <= i1; i++) {
        const r = hs(i, 1);
        const x = (i * step + hs(i, 2) * 3 - off) * U;
        const tiefe = hs(i, 3);
        const y = gy - U * 1.2 + tiefe * (H - gy) * 0.45;
        const sc = U * (8 + tiefe * 4);
        if (r < 0.34) { const sp = spriteBlume((hs(i, 8) * 6) | 0); ctx.drawImage(sp, x - 0.25 * sc, y - 0.66 * sc, 0.5 * sc, 0.66 * sc); }
        else if (r < 0.8) { const sp = spriteGras((hs(i, 8) * 4) | 0); ctx.drawImage(sp, x - 0.35 * sc, y - 0.5 * sc, 0.7 * sc, 0.5 * sc); }
        else if (r < 0.87) { const sp = spriteStein((hs(i, 8) * 2) | 0); ctx.drawImage(sp, x - 0.35 * sc, y - 0.36 * sc, 0.7 * sc, 0.36 * sc); }
        else if (r < 0.93) { const sp = spritePilz(); ctx.drawImage(sp, x - 0.25 * sc, y - 0.5 * sc, 0.5 * sc, 0.5 * sc); }
        else { const sp = spriteBusch((hs(i, 8) * 2) | 0); const s2 = sc * 0.7; ctx.drawImage(sp, x - s2, y - 1.15 * s2, 2 * s2, 1.2 * s2); }
      }
    }
    function vordergrund() {
      const step = 9, par = 1.3, off = S.scroll * par;
      const i0 = Math.floor((off - 15) / step), i1 = Math.ceil((off + VW + 15) / step);
      for (let i = i0; i <= i1; i++) {
        if (hs(i, 11) < 0.35) continue;
        const x = (i * step + hs(i, 12) * 5 - off) * U;
        const sc = U * (11 + hs(i, 13) * 6);
        ctx.drawImage(spriteGras((hs(i, 14) * 4) | 0, true), x - 0.35 * sc, H - 0.42 * sc, 0.7 * sc, 0.5 * sc);
      }
    }
    function nest() {
      const x = nestX() * U, base = (GY + 1.5) * U;
      const s = NEST_S * U;
      const top = nestTop() * U;
      const a = clamp((VW + 40 - nestX()) / 30, 0, 1);
      ctx.globalAlpha = a;
      // Leuchtsäule
      const gb = ctx.createLinearGradient(0, top - 50 * U, 0, top);
      gb.addColorStop(0, 'rgba(255,230,140,0)'); gb.addColorStop(1, 'rgba(255,230,140,.45)');
      ctx.fillStyle = gb; ctx.fillRect(x - 3 * U, top - 50 * U, 6 * U, 50 * U);
      drawGlow(ctx, '255,226,130', x, top, 16 * U, 0.7);
      const sp = spriteHuegel();
      ctx.drawImage(sp, x - (HUEGEL_R + 0.5) * s, base - (HUEGEL_H + 0.3) * s, (HUEGEL_R * 2 + 1) * s, (HUEGEL_H + 0.6) * s);
      // Fähnchen
      const fx = x + 3 * U, fy = top + 0.3 * U;
      ctx.strokeStyle = '#6b4424'; ctx.lineWidth = Math.max(1.5, 0.5 * U); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 9 * U); ctx.stroke();
      const wehen = Math.sin(S.t * 6) * 0.6 * U;
      ctx.fillStyle = '#ff6b9b';
      ctx.beginPath(); ctx.moveTo(fx, fy - 9 * U); ctx.quadraticCurveTo(fx + 3 * U, fy - 8.3 * U + wehen, fx + 6 * U, fy - 7.6 * U + wehen);
      ctx.quadraticCurveTo(fx + 3 * U, fy - 6.8 * U - wehen, fx, fy - 5.8 * U); ctx.closePath(); ctx.fill();
      // Schild mit Namen
      const tx = x - (HUEGEL_R + 2.5) * s, ty = base - 6 * U;
      const fs = Math.max(11, 2.6 * U);
      ctx.font = `600 ${fs}px ${FONT}`;
      const tw = ctx.measureText(opt.name).width + fs;
      ctx.fillStyle = '#7a5232';
      ctx.fillRect(tx - 0.4 * U, ty, 0.8 * U, 6 * U);
      ctx.fillStyle = '#e8c48c'; ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = Math.max(1, 0.35 * U);
      ctx.beginPath(); ctx.roundRect(tx - tw / 2, ty - fs * 1.5, tw, fs * 1.5, fs * 0.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4a2c14'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(opt.name, tx, ty - fs * 0.72);
      // jubelnde Arbeiterinnen
      for (const w of S.arbeiter) {
        if (w.t < w.dl) continue;
        const hops = Math.abs(Math.sin((w.t - w.dl) * 7 + w.dl * 3)) * 2.2 * U;
        drawAnt(ctx, { x: x + w.x * U, y: base - 1.2 * U - hops, L: 5 * U, dir: w.ziel > w.x ? 1 : -1, phase: w.t * 14, rolle: 'arbeiterin', walking: true, alpha: clamp((w.t - w.dl) * 3, 0, 1) });
      }
      ctx.globalAlpha = 1;
    }
    function rastBlume() {
      const sc = 22 * U;
      const x = S.rast.x * U, base = (GY + 3) * U;
      ctx.drawImage(spriteBlume(1), x - 0.25 * sc, base - 0.66 * sc, 0.5 * sc, 0.66 * sc);
    }
    function schatten() {
      if (S.phase === 'gelandet' || (S.phase === 'ergebnis' && S.erfolg)) return;
      const hoehe = clamp((GY - S.q.y) / GY, 0, 1);
      ctx.fillStyle = `rgba(20,60,10,${0.25 - hoehe * 0.15})`;
      ctx.beginPath(); ctx.ellipse((S.q.x - 1.5) * U, (GY + 1.5) * U, (5 - hoehe * 2) * U, 0.9 * U, 0, 0, TAU); ctx.fill();
    }
    function koenigin() {
      const q = S.q;
      const s = Q_LEN * U;
      const blinken = S.unverw > 0 && S.phase === 'flug' && Math.sin(S.t * 30) > 0;
      const bob = S.phase === 'gelandet' || S.ruht || (S.phase === 'ergebnis') ? 0 : Math.sin(S.t * 3.2) * 0.6 * U * q.amp;
      if (S.zeit.stern > 0) {
        const hue = (S.t * 300) % 360;
        ctx.save(); ctx.globalAlpha = 0.5 + 0.2 * Math.sin(S.t * 10);
        const gr = ctx.createRadialGradient(q.x * U, q.y * U, 0, q.x * U, q.y * U, 11 * U);
        gr.addColorStop(0, `hsla(${hue},100%,75%,.9)`); gr.addColorStop(0.6, `hsla(${(hue + 90) % 360},100%,70%,.35)`); gr.addColorStop(1, 'hsla(0,0%,100%,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(q.x * U, q.y * U, 11 * U, 0, TAU); ctx.fill();
        ctx.restore();
      }
      ctx.save();
      if (blinken) ctx.globalAlpha = 0.45;
      drawKoeniginSeite(ctx, q.x * U, q.y * U + bob, s, { tilt: q.tilt, flap: q.flap, amp: q.amp, t: S.t, landen: S.phase === 'gelandet' || S.ruht || S.phase === 'ergebnis' });
      ctx.restore();
      // Honig-Schild
      if (S.schild > 0 && (S.phase === 'flug' || S.phase === 'countdown' || S.phase === 'intro')) {
        const r = 9.5 * U * (1 + Math.sin(S.t * 4) * 0.03);
        const x = (q.x - 1) * U, y = q.y * U + bob;
        const g = ctx.createRadialGradient(x, y, r * 0.55, x, y, r);
        g.addColorStop(0, 'rgba(255,230,150,0)'); g.addColorStop(0.8, 'rgba(255,205,90,.22)'); g.addColorStop(1, 'rgba(255,190,60,.55)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,200,70,.85)'; ctx.lineWidth = Math.max(1.5, 0.35 * U);
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = Math.max(1.5, 0.45 * U);
        ctx.beginPath(); ctx.arc(x, y, r * 0.86, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke();
        for (let i = 0; i < S.schild; i++) {
          const a = -Math.PI / 2 + (i - (S.schild - 1) / 2) * 0.4;
          drawGlow(ctx, '255,220,120', x + Math.cos(a) * r, y + Math.sin(a) * r, 1.6 * U, 1);
          ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 0.7 * U, 0, TAU); ctx.fill();
        }
      }
    }
    function wespenFluegel(flap, vorne, alpha) {
      const a = -1.95 + Math.sin(flap) * 0.55 + (vorne ? 0.3 : -0.15);
      ctx.save(); ctx.translate(0.07, -0.13); ctx.rotate(a);
      ctx.fillStyle = `rgba(235,248,255,${0.6 * alpha})`; ctx.strokeStyle = `rgba(130,160,200,${0.8 * alpha})`; ctx.lineWidth = 0.014;
      ctx.beginPath(); ctx.ellipse(0.2, 0, 0.22, 0.08, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = `rgba(130,160,200,${0.45 * alpha})`;
      ctx.beginPath(); ctx.moveTo(0.02, 0); ctx.lineTo(0.38, 0); ctx.stroke();
      ctx.restore();
    }
    function wespeMalen(w) {
      const d = WT[w.typ];
      const L = d.gr * U * (w.sk ?? 1);
      ctx.save();
      ctx.translate(w.x * U, w.y * U);
      ctx.globalAlpha = w.alpha;
      // Ansturm-Spur
      if (w.typ === 'boss' && w.modus === 'ansturm' && w.zustand === 'an') {
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.ellipse(i * L * 0.25, (i % 2 - 0.5) * L * 0.15, L * 0.18, L * 0.025, 0, 0, TAU); ctx.fill(); }
      }
      ctx.scale(w.blick * L, L);
      ctx.rotate(w.neig);
      wespenFluegel(w.flap, false, 0.75);
      ctx.drawImage(spriteWespe(w.typ, w.zustand !== 'an'), -W_OX, -W_OY, W_W, W_H);
      if (w.blitz > 0 && w.zustand === 'an') { ctx.globalAlpha = w.alpha * w.blitz * 0.75; ctx.drawImage(spriteWespeWeiss(w.typ), -W_OX, -W_OY, W_W, W_H); ctx.globalAlpha = w.alpha; }
      wespenFluegel(w.flap + 0.5, true, 1);
      // Weiße Fahne
      if (w.zustand !== 'an' && w.icon === 'fahne') {
        ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 0.025; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0.22, 0.08); ctx.lineTo(0.3, -0.62); ctx.stroke();
        const wv = Math.sin(w.st * 9) * 0.04;
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(120,120,140,.6)'; ctx.lineWidth = 0.012;
        ctx.beginPath(); ctx.moveTo(0.3, -0.62);
        ctx.quadraticCurveTo(0.42, -0.66 + wv, 0.56, -0.6 - wv); ctx.lineTo(0.55, -0.38 - wv);
        ctx.quadraticCurveTo(0.42, -0.42 + wv, 0.29, -0.4); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
      // Lebensbalken für dicke Brummer
      if (w.zustand === 'an' && w.typ === 'brummer' && w.hp < w.max) {
        const bw = 10 * U, bx = w.x * U - bw / 2, by = (w.y - d.gr * 0.55) * U;
        ctx.fillStyle = 'rgba(40,20,0,.45)'; ctx.beginPath(); ctx.roundRect(bx - 1, by - 1, bw + 2, U * 1.3 + 2, 4); ctx.fill();
        ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.roundRect(bx, by, bw * (1 - w.hp / w.max), U * 1.3, 3); ctx.fill();
      }
    }
    function ausruf(w) {
      const x = w.x * U, y = (w.y - WT[w.typ].gr * 0.6) * U;
      const fs = Math.round(clamp(H * 0.05, 18, 36));
      ctx.font = `800 ${fs}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = fs * 0.18; ctx.strokeStyle = 'rgba(120,40,0,.8)'; ctx.lineJoin = 'round';
      const b = 1 + Math.sin(S.t * 20) * 0.08;
      ctx.save(); ctx.translate(x, y); ctx.scale(b, b);
      ctx.strokeText('!', 0, 0); ctx.fillStyle = '#ffd166'; ctx.fillText('!', 0, 0);
      ctx.restore();
    }
    function blumeMalen(b) {
      const d = PU[b.typ];
      const x = b.x * U, y = b.y * U;
      const sz = 8.5 * U;
      const puls = 0.5 + 0.5 * Math.sin(S.t * 5 + b.ph);
      if (b.boden) {
        // Stiel bis zum Boden
        ctx.strokeStyle = '#3f8f35'; ctx.lineWidth = Math.max(2, 0.7 * U); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, (GY + 2.5) * U); ctx.quadraticCurveTo(x - U, (GY - 1) * U, x, y); ctx.stroke();
        ctx.fillStyle = '#4fa63f';
        ctx.beginPath(); ctx.ellipse(x + 1.6 * U, (GY + 0.5) * U, 1.8 * U, 0.6 * U, -0.5, 0, TAU); ctx.fill();
        // Lichtsäule nach oben
        const gb = ctx.createLinearGradient(0, y - 30 * U, 0, y);
        gb.addColorStop(0, `rgba(${d.rgb},0)`); gb.addColorStop(1, `rgba(${d.rgb},${0.28 + 0.12 * puls})`);
        ctx.fillStyle = gb; ctx.fillRect(x - 2.2 * U, y - 30 * U, 4.4 * U, 30 * U);
      }
      drawGlow(ctx, d.rgb, x, y, sz * (1.05 + 0.15 * puls), 0.85);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(S.t * 1.5 + b.ph) * 0.25);
      const sc = 1 + 0.06 * puls;
      ctx.drawImage(spritePowerup(b.typ), -sz / 2 * sc, -sz / 2 * sc, sz * sc, sz * sc);
      ctx.restore();
      // Funkeln
      const fa = (S.t * 2 + b.ph) % 1;
      const fx = x + Math.cos(b.ph + S.t) * sz * 0.55, fy = y + Math.sin(b.ph * 2 + S.t * 1.3) * sz * 0.55;
      drawGlow(ctx, '255,255,255', fx, fy, U * 1.6 * (1 - fa), 0.9);
    }
    function schuesseMalen() {
      for (const s of S.schuesse) {
        const x = s.x * U, y = s.y * U;
        if (s.art === 'pollen') {
          drawGlow(ctx, '255,220,90', x, y, 3.6 * U, 0.7);
          const r = s.r * U * 1.2;
          ctx.save(); ctx.translate(x, y); ctx.rotate(s.t * 6);
          ctx.drawImage(spritePollen(), -r, -r, r * 2, r * 2);
          ctx.restore();
          continue;
        }
        const v = s.art === 'helfer' ? 1 : s.art === 'riesen' ? 2 : 0;
        const L = s.r * 3.2 * U, Hh = L * 0.58;
        if (s.art === 'riesen') drawGlow(ctx, '255,180,60', x, y, s.r * 2.4 * U, 0.6);
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(s.vy, s.vx));
        ctx.drawImage(spriteTropfen(v), -L * 0.6, -Hh / 2, L, Hh);
        ctx.restore();
      }
    }
    function welleMalen(wl) {
      const a = clamp(1 - wl.r / wl.max, 0, 1);
      const x = wl.x * U, y = wl.y * U, r = wl.r * U;
      ctx.strokeStyle = `rgba(${wl.rgb},${0.75 * a})`; ctx.lineWidth = Math.max(4, 3 * U * a + 2);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${0.6 * a})`; ctx.lineWidth = Math.max(2, U * a);
      ctx.beginPath(); ctx.arc(x, y, r * 0.93, 0, TAU); ctx.stroke();
      const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r);
      g.addColorStop(0, `rgba(${wl.rgb},0)`); g.addColorStop(1, `rgba(${wl.rgb},${0.18 * a})`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    function helferMalen(hh) {
      const L = 7.5 * U;
      ctx.save();
      ctx.translate(hh.x * U, hh.y * U);
      ctx.scale(L, L);
      if (hh.t < 2.5 && hh.t > 0) ctx.globalAlpha = 0.6 + 0.4 * Math.sin(S.t * 20);
      const flg = (vorne) => {
        const a = -1.9 + Math.sin(hh.flap + (vorne ? 0.5 : 0)) * 0.6 + (vorne ? 0.25 : -0.2);
        ctx.save(); ctx.translate(0, -0.18); ctx.rotate(a);
        ctx.fillStyle = 'rgba(235,248,255,.6)'; ctx.strokeStyle = 'rgba(130,160,200,.8)'; ctx.lineWidth = 0.015;
        ctx.beginPath(); ctx.ellipse(0.17, 0, 0.19, 0.08, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.restore();
      };
      flg(false);
      ctx.drawImage(spriteHelfer(hh.art), -0.6, -0.55, 1.2, 1);
      flg(true);
      ctx.restore();
    }
    function teilchen() {
      for (const p of S.teile) {
        if (p.l < 0) continue;
        const a = clamp(1 - p.l / p.max, 0, 1);
        const x = p.x * U, y = p.y * U;
        switch (p.k) {
          case 'funke':
            drawGlow(ctx, '255,226,120', x, y, p.g * 3.2 * U, a);
            ctx.fillStyle = `rgba(255,255,240,${a})`; ctx.beginPath(); ctx.arc(x, y, p.g * 0.45 * U, 0, TAU); ctx.fill();
            break;
          case 'stern': {
            ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot + p.l * 4);
            ctx.globalAlpha = a; ctx.fillStyle = p.c;
            const r = p.g * 1.6 * U;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.35 : r; const an = i / 8 * TAU; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
            ctx.closePath(); ctx.fill();
            ctx.restore();
            break;
          }
          case 'staub': case 'klecks':
            ctx.globalAlpha = a; ctx.fillStyle = p.c;
            ctx.beginPath(); ctx.arc(x, y, p.g * U * (p.k === 'staub' ? a : 0.6 + 0.4 * a), 0, TAU); ctx.fill();
            ctx.globalAlpha = 1;
            break;
          case 'blatt':
            ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot);
            ctx.globalAlpha = Math.min(1, a * 2); ctx.fillStyle = p.c;
            ctx.beginPath(); ctx.ellipse(0, 0, p.gr * U, p.gr * 0.45 * U, 0, 0, TAU); ctx.fill();
            if (!p.sanft) { ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-p.gr * U, 0); ctx.lineTo(p.gr * U, 0); ctx.stroke(); }
            ctx.restore();
            break;
          case 'streif':
            ctx.strokeStyle = `rgba(255,255,255,${0.45 * Math.min(1, a * 2)})`; ctx.lineWidth = 2; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - p.vx / Math.hypot(p.vx, p.vy) * p.g * U, y - p.vy / Math.hypot(p.vx, p.vy) * p.g * U); ctx.stroke();
            break;
          case 'herz':
            ctx.globalAlpha = Math.min(1, a * 1.6); ctx.fillStyle = p.c;
            herzPfad(ctx, x + Math.sin(p.l * 5) * U, y, p.g * U * (0.8 + 0.2 * Math.sin(p.l * 10))); ctx.fill();
            ctx.globalAlpha = 1;
            break;
          case 'z': {
            ctx.globalAlpha = Math.sin(a * Math.PI);
            const fs = Math.round(p.g * U * (1.6 - a * 0.6));
            ctx.font = `700 ${fs}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(60,90,140,.6)'; ctx.lineWidth = 3;
            ctx.strokeText('z', x + Math.sin(p.l * 4) * U, y); ctx.fillText('z', x + Math.sin(p.l * 4) * U, y);
            ctx.globalAlpha = 1;
            break;
          }
          case 'ring':
            ctx.strokeStyle = `rgba(${p.c},${a * 0.9})`; ctx.lineWidth = Math.max(2, 0.8 * U * a);
            ctx.beginPath(); ctx.arc(x, y, p.g * U * (0.3 + easeOut(p.l / p.max) * 0.9), 0, TAU); ctx.stroke();
            break;
        }
      }
      ctx.globalAlpha = 1;
    }
    function blasen() {
      const fs = Math.round(clamp(H * 0.026, 12, 20));
      ctx.font = `600 ${fs}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const b of S.blasen) {
        const w = b.w, d = WT[w.typ];
        const x = w.x * U, y = (w.y - d.gr * 0.5 * (w.sk ?? 1)) * U - fs * 0.6;
        const a = Math.min(1, b.t * 6, (b.max - b.t) * 3);
        const sc = b.t < 0.15 ? 0.6 + b.t / 0.15 * 0.4 : 1;
        const tw = ctx.measureText(b.txt).width;
        const pw = tw + fs * 1.2, ph = fs * 1.8;
        const bx = clamp(x - pw / 2, 6, W - pw - 6), by = y - ph;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y);
        ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = 'rgba(120,80,30,.35)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(bx, by, pw, ph, ph / 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(clamp(x, bx + ph / 2, bx + pw - ph / 2) - fs * 0.3, by + ph - 1); ctx.lineTo(x, y + fs * 0.45); ctx.lineTo(clamp(x, bx + ph / 2, bx + pw - ph / 2) + fs * 0.35, by + ph - 1); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#4a2c14'; ctx.fillText(b.txt, bx + pw / 2, by + ph / 2 + 1);
        ctx.restore();
      }
    }
    function texte() {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const t of S.texte) {
        const u = t.t / t.max;
        const sc = u < 0.15 ? 0.6 + (u / 0.15) * 0.55 : 1.15 - Math.min(0.15, (u - 0.15) * 0.6);
        ctx.globalAlpha = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1;
        const fs = Math.round(Math.max(16, H * 0.042) * t.gross * sc);
        ctx.font = `700 ${fs}px ${FONT}`;
        ctx.lineWidth = Math.max(3, fs * 0.16); ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(120,60,0,.75)';
        const hw = ctx.measureText(t.txt).width / 2 + 8;
        const x = clamp(t.x * U, hw, W - hw), y = t.y * U - u * 40;
        ctx.strokeText(t.txt, x, y); ctx.fillStyle = t.farbe; ctx.fillText(t.txt, x, y);
      }
      ctx.globalAlpha = 1;
    }
    function fadenkreuz() {
      if (!zeiger.aktiv || zeiger.typ !== 'mouse' || debug.auto || (S.phase !== 'flug' && S.phase !== 'countdown') || S.pause) return;
      const r = Math.max(10, H * 0.018);
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2;
      ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.arc(zeiger.x, zeiger.y, r, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(zeiger.x, zeiger.y, 2.5, 0, TAU); ctx.fill();
    }
    function grossText(txt, u, farbe, groesse) {
      const sc = u < 0.2 ? 0.4 + (u / 0.2) * 0.8 : 1.2 - (u - 0.2) * 0.2;
      ctx.globalAlpha = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1;
      let fs = Math.round(H * groesse * sc);
      ctx.font = `700 ${fs}px ${FONT}`;
      const tw = ctx.measureText(txt).width;
      if (tw > W * 0.9) { fs = Math.floor(fs * W * 0.9 / tw); ctx.font = `700 ${fs}px ${FONT}`; }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.12; ctx.strokeStyle = 'rgba(140,70,0,.85)';
      ctx.strokeText(txt, W / 2, H * 0.42); ctx.fillStyle = farbe; ctx.fillText(txt, W / 2, H * 0.42);
      ctx.globalAlpha = 1;
    }

    // ---------- HUD ----------
    let hudStand = {};
    function waffenListe() {
      const l = [];
      l.push({ k: 'basis', icon: '💧', name: 'Nektar', lvl: 1 + S.lvl.doppel, max: 4 });
      for (const k of ['faecher', 'pollen', 'seiten']) if (S.lvl[k]) l.push({ k, icon: PU[k].icon, name: PU[k].name, lvl: S.lvl[k], max: PU[k].max });
      for (const k of ['turbo', 'riesen', 'zeitlupe', 'magnet', 'stern']) if (S.zeit[k] > 0) l.push({ k, icon: PU[k].icon, name: PU[k].name, zeit: S.zeit[k] / PU[k].dauer });
      if (S.schild) l.push({ k: 'schild', icon: '🛡️', name: 'Schild', lvl: S.schild, max: 3 });
      for (const hh of S.helfer) if (hh.t > 0) l.push({ k: 'helfer-' + hh.art, icon: hh.art === 'hummel' ? '🐝' : '🐞', name: hh.art === 'hummel' ? 'Hummel' : 'Käfer', zeit: hh.t / PU.hummel.dauer });
      return l;
    }
    function hudUpdate() {
      const mu = Math.max(0, Math.round(S.mut));
      if (mu !== hudStand.mu) {
        hudStand.mu = mu;
        el.mutFill.style.width = (mu / MUT_MAX * 100) + '%';
        el.mut.classList.toggle('knapp', mu < MUT_MAX * 0.3);
      }
      if (S.befriedet !== hudStand.bf) { hudStand.bf = S.befriedet; el.zahl.textContent = String(S.befriedet); }
      const co = S.combo >= 2 && S.t - S.comboT < 2.2 ? `Combo ×${S.combo}` : '';
      if (co !== hudStand.co) { hudStand.co = co; el.comboTxt.textContent = co; el.combo.classList.toggle('an', !!co); if (co) flash(el.combo, 'bump'); }
      const wi = S.wind.ph > 0 ? (S.wind.dir > 0 ? 'Windböe ⬇' : 'Windböe ⬆') : '';
      if (wi !== hudStand.wi) { hudStand.wi = wi; el.windTxt.textContent = wi; el.wind.classList.toggle('an', !!wi); }
      // Waffen
      const wl = waffenListe();
      const key = wl.map(w => w.k + (w.lvl ?? '')).join('|');
      if (key !== hudStand.wk) {
        hudStand.wk = key;
        el.waffen.replaceChildren(...wl.map(w => {
          const chip = h('div.wsp-waffe' + (w.zeit != null ? '.zeit' : ''), { title: w.name, 'data-k': w.k },
            h('span.wsp-waffe-ic', w.icon),
            w.lvl != null ? h('span.wsp-pips', Array.from({ length: w.max }, (_, i) => h('i' + (i < w.lvl ? '.an' : '')))) : null);
          return chip;
        }));
      }
      for (const w of wl) {
        if (w.zeit == null) continue;
        const c = el.waffen.querySelector(`[data-k="${w.k}"]`);
        if (c) c.style.setProperty('--t', String(Math.round(clamp(w.zeit, 0, 1) * 100) / 100));
      }
      // Boss
      const bossSicht = !!(S.boss && S.boss.zustand === 'an');
      if (bossSicht !== hudStand.bs) { hudStand.bs = bossSicht; el.boss.classList.toggle('an', bossSicht); }
      if (bossSicht) {
        const bq = Math.round(clamp(S.boss.hp / S.boss.max, 0, 1) * 200);
        if (bq !== hudStand.bq) { hudStand.bq = bq; el.bossFill.style.width = (100 - bq / 2) + '%'; }
      }
      // Honigbombe
      const bo = `${S.bomben}|${S.honig}`;
      if (bo !== hudStand.bo) {
        hudStand.bo = bo;
        el.bombe.classList.toggle('bereit', S.bomben > 0);
        el.bombeInfo.textContent = S.bomben > 0 ? `× ${S.bomben} bereit!` : `${S.honig} / ${HONIG_MAX}`;
        el.bombeFill.style.width = (S.bomben >= 2 ? 100 : S.honig / HONIG_MAX * 100) + '%';
      }
      const prog = clamp(S.dist / opt.dauer, 0, 1);
      const pr = Math.round(prog * 1000);
      if (pr !== hudStand.pr) { hudStand.pr = pr; el.wegFill.style.width = prog * 100 + '%'; el.wegAnt.style.left = prog * 100 + '%'; }
      const sicht = S.phase !== 'intro' && S.phase !== 'ergebnis';
      if (sicht !== hudStand.sicht) { hudStand.sicht = sicht; hud.classList.toggle('an', sicht); }
      const kampf = S.phase === 'flug' || S.phase === 'countdown';
      if (kampf !== hudStand.kampf) { hudStand.kampf = kampf; hud.classList.toggle('kampf', kampf); }
    }

    // ---------- Schleife ----------
    let raf = 0, last = performance.now();
    function frame(now) {
      if (aufgeraeumt) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
      if (canvas.width !== Math.round(W * dpr) || !W) resize();
      const n = clamp(Math.round(debug.tempo || 1), 1, 8);
      for (let i = 0; i < n && !aufgeraeumt; i++) update(dt);
      if (aufgeraeumt) return;
      render();
      hudUpdate();
    }

    // ---------- Debug-/Test-Haken ----------
    const debug = {
      auto: false,
      tempo: 1,
      get state() { return S; },
      get opt() { return opt; },
      get canvas() { return canvas; },
      /** Zeiger (clientX/Y) setzen, als hätte man die Maus bewegt */
      zielen(cx, cy) { const r = canvas.getBoundingClientRect(); zeiger.typ = 'mouse'; zeiger.x = cx - r.left; zeiger.y = cy - r.top; zeiger.aktiv = true; },
      /** Zielpunkt in Spiel-Einheiten setzen (x: 0…VW, y: 0…VH) */
      steuern(x, y) { zeiger.typ = 'mouse'; zeiger.x = x * U; zeiger.y = y * U; zeiger.aktiv = true; },
      welt() { return { VW, VH, GY, U }; },
      start() { starteCountdown(); },
      los() { if (S.phase === 'intro') starteCountdown(); if (S.phase === 'countdown') S.pt = 3; },
      gib(typ, n = 1) { for (let i = 0; i < n; i++) if (PU[typ]) sammle(typ, i < n - 1); },
      alle() { for (const k of PU_LISTE) { if (k === 'bombe' || k === 'mut') continue; const d = PU[k]; const n = d.max ?? 1; for (let i = 0; i < n; i++) sammle(k, true); } bannerZeigen('🎉 Power-up-Party!', 'Alle Power-ups auf einmal!', '#ff9fc2', 2); },
      boss() { if (!S.boss) bossStart(); },
      alarm() { ereignis({ typ: 'alarm' }); formation('kreis'); formation('V'); },
      regen() { ereignis({ typ: 'regen' }); },
      formation(art = 'V') { formation(art); },
      wespe(typ = 'flitzer') { return neueWespe(typ, VW + 8, randY()); },
      sprung(p) { S.dist = clamp(p, 0, 1) * opt.dauer; },
      sieg() { if (S.boss && S.boss.zustand === 'an') befriede(S.boss); S.dist = opt.dauer; },
      mut(v) { S.mut = v; if (v <= 0 && S.phase === 'flug') starteGleiten(); },
      pause(an = true) { pausieren(an); },
      bombe() { S.bomben = Math.max(1, S.bomben); honigbombe(); },
    };
    window.__wespen = debug;

    neuerFlug(true);
    raf = requestAnimationFrame(frame);
  });
}
